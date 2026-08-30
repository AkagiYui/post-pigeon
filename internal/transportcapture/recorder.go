// Package transportcapture records the semantic HTTP requests that actually enter a RoundTripper.
// It deliberately models attempts rather than a single "actual request", because redirects,
// authentication challenges and stream reconnects can all emit multiple network requests.
package transportcapture

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/base64"
	"encoding/hex"
	"io"
	"mime"
	"net/http"
	"net/http/httptrace"
	"net/textproto"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"PostPigeon/internal/models"
)

const DefaultBodyPreviewBytes int64 = 1 << 20

type attemptContextKey struct{}

type attemptContext struct {
	cause    string
	parentID *string
}

// WithAttempt annotates a request context with why the next network request exists.
func WithAttempt(ctx context.Context, cause string, parentID *string) context.Context {
	return context.WithValue(ctx, attemptContextKey{}, attemptContext{cause: cause, parentID: parentID})
}

// Recorder owns one request run. It is safe for transports that execute attempts concurrently.
type Recorder struct {
	mu               sync.Mutex
	run              models.RequestRun
	bodyPreviewBytes int64
}

func NewRecorder(runID, moduleID string, endpointID *string, prepared *models.HTTPRequestSnapshot) *Recorder {
	if runID == "" {
		runID = uuid.NewString()
	}
	return &Recorder{
		run: models.RequestRun{
			ID:              runID,
			ModuleID:        moduleID,
			EndpointID:      endpointID,
			Outcome:         models.RequestRunOutcomeRunning,
			PreparedRequest: prepared,
			StartedAt:       time.Now(),
		},
		bodyPreviewBytes: DefaultBodyPreviewBytes,
	}
}

func (r *Recorder) SetBodyPreviewBytes(limit int64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if limit < 0 {
		limit = 0
	}
	r.bodyPreviewBytes = limit
}

func (r *Recorder) RunID() string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.run.ID
}

func (r *Recorder) LastAttemptID() *string {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.run.Attempts) == 0 {
		return nil
	}
	id := r.run.Attempts[len(r.run.Attempts)-1].ID
	return &id
}

func (r *Recorder) SetOutcome(outcome string, errInfo *models.RequestAttemptError) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.run.Outcome = outcome
	r.run.ErrorInfo = errInfo
	if outcome == models.RequestRunOutcomeRunning || outcome == models.RequestRunOutcomeStreaming {
		r.run.CompletedAt = nil
		return
	}
	now := time.Now()
	r.run.CompletedAt = &now
}

func (r *Recorder) SetPreparedRequest(prepared *models.HTTPRequestSnapshot) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.run.PreparedRequest = prepared
}

// Run returns a detached snapshot suitable for IPC or persistence.
func (r *Recorder) Run() models.RequestRun {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := r.run
	out.Attempts = append([]models.RequestAttempt(nil), r.run.Attempts...)
	for i := range out.Attempts {
		out.Attempts[i].Request.Headers = append([]models.HTTPHeaderSnapshot(nil), out.Attempts[i].Request.Headers...)
		out.Attempts[i].Request.TransferEncoding = append([]string(nil), out.Attempts[i].Request.TransferEncoding...)
		out.Attempts[i].Request.Body.Parts = append([]models.HTTPBodyPart(nil), out.Attempts[i].Request.Body.Parts...)
		if out.Attempts[i].Response != nil {
			response := *out.Attempts[i].Response
			response.Headers = append([]models.HTTPHeaderSnapshot(nil), response.Headers...)
			out.Attempts[i].Response = &response
		}
	}
	return out
}

// Transport wraps base and appends one attempt for every RoundTrip call.
func (r *Recorder) Transport(base http.RoundTripper) http.RoundTripper {
	if base == nil {
		base = http.DefaultTransport
	}
	return &observingRoundTripper{base: base, recorder: r}
}

type observingRoundTripper struct {
	base     http.RoundTripper
	recorder *Recorder
}

type connectionObservation struct {
	localAddress  string
	remoteAddress string
	reused        bool
	wasIdle       bool
}

func (t *observingRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	started := time.Now()
	meta, _ := req.Context().Value(attemptContextKey{}).(attemptContext)
	if meta.cause == "" {
		meta.cause = models.RequestAttemptCauseInitial
	}

	t.recorder.mu.Lock()
	previewLimit := t.recorder.bodyPreviewBytes
	sequence := len(t.recorder.run.Attempts)
	t.recorder.mu.Unlock()

	attempt := models.RequestAttempt{
		ID:              uuid.NewString(),
		RunID:           t.recorder.RunID(),
		Sequence:        sequence,
		Cause:           meta.cause,
		ParentAttemptID: meta.parentID,
		Request:         SnapshotRequest(req, previewLimit),
		StartedAt:       started,
	}
	// 先预留序号再进入网络层，保证并发 attempt 的 sequence 唯一且按开始顺序稳定。
	t.recorder.mu.Lock()
	attempt.Sequence = len(t.recorder.run.Attempts)
	t.recorder.run.Attempts = append(t.recorder.run.Attempts, attempt)
	t.recorder.run.SelectedAttemptID = &attempt.ID
	t.recorder.mu.Unlock()

	var connection connectionObservation
	trace := &httptrace.ClientTrace{
		GotConn: func(info httptrace.GotConnInfo) {
			connection.reused = info.Reused
			connection.wasIdle = info.WasIdle
			if info.Conn != nil {
				if addr := info.Conn.LocalAddr(); addr != nil {
					connection.localAddress = addr.String()
				}
				if addr := info.Conn.RemoteAddr(); addr != nil {
					connection.remoteAddress = addr.String()
				}
			}
		},
	}
	observedReq := req.Clone(httptrace.WithClientTrace(req.Context(), trace))
	resp, err := t.base.RoundTrip(observedReq)
	completed := time.Now()
	attempt.CompletedAt = &completed
	attempt.Transport = models.HTTPTransportInfo{
		LocalAddress:  connection.localAddress,
		RemoteAddress: connection.remoteAddress,
		Reused:        connection.reused,
		WasIdle:       connection.wasIdle,
	}

	if err != nil {
		attempt.ErrorInfo = &models.RequestAttemptError{Phase: "round_trip", Message: err.Error()}
	} else if resp != nil {
		attempt.Response = &models.HTTPResponseSummary{
			StatusCode: resp.StatusCode,
			Status:     resp.Status,
			Protocol:   resp.Proto,
			Headers:    SnapshotHeaders(resp.Header, "response"),
		}
		attempt.Request.Protocol = resp.Proto
		attempt.Transport.Protocol = resp.Proto
		if resp.Uncompressed && !hasHeader(attempt.Request.Headers, "Accept-Encoding") {
			attempt.Request.Headers = append(attempt.Request.Headers, models.HTTPHeaderSnapshot{
				Name: "Accept-Encoding", Value: "gzip", Source: "transport",
			})
			sortHeaders(attempt.Request.Headers)
		}
		if resp.TLS != nil {
			attempt.Transport.TLSVersion = tls.VersionName(resp.TLS.Version)
			attempt.Transport.TLSCipher = tls.CipherSuiteName(resp.TLS.CipherSuite)
			attempt.Transport.ServerName = resp.TLS.ServerName
		}
	}

	t.recorder.mu.Lock()
	for i := range t.recorder.run.Attempts {
		if t.recorder.run.Attempts[i].ID == attempt.ID {
			t.recorder.run.Attempts[i] = attempt
			break
		}
	}
	t.recorder.mu.Unlock()
	return resp, err
}

// SnapshotRequest captures a semantic request without consuming its live Body.
func SnapshotRequest(req *http.Request, previewLimit int64) models.HTTPRequestSnapshot {
	protocol := req.Proto
	if protocol == "" {
		protocol = "auto"
	}
	authority := req.Host
	if authority == "" && req.URL != nil {
		authority = req.URL.Host
	}
	requestURL, requestTarget := "", ""
	if req.URL != nil {
		requestURL = req.URL.String()
		requestTarget = req.URL.RequestURI()
	}

	headers := SnapshotHeaders(req.Header, "request")
	if req.ContentLength >= 0 && req.Body != nil && !hasHeader(headers, "Content-Length") {
		headers = append(headers, models.HTTPHeaderSnapshot{
			Name: "Content-Length", Value: formatInt(req.ContentLength), Source: "transport",
		})
		sortHeaders(headers)
	}

	return models.HTTPRequestSnapshot{
		Method:           req.Method,
		URL:              requestURL,
		RequestTarget:    requestTarget,
		Authority:        authority,
		Protocol:         protocol,
		Headers:          headers,
		Body:             snapshotRequestBody(req, previewLimit),
		ContentLength:    req.ContentLength,
		TransferEncoding: append([]string(nil), req.TransferEncoding...),
		CaptureLevel:     "transport_boundary",
	}
}

func SnapshotHeaders(headers http.Header, source string) []models.HTTPHeaderSnapshot {
	result := make([]models.HTTPHeaderSnapshot, 0, len(headers))
	for name, values := range headers {
		if len(values) == 0 {
			values = []string{""}
		}
		for _, value := range values {
			result = append(result, models.HTTPHeaderSnapshot{
				Name:      textproto.CanonicalMIMEHeaderKey(name),
				Value:     value,
				Source:    headerSource(name, source),
				Sensitive: isSensitiveHeader(name),
			})
		}
	}
	sortHeaders(result)
	return result
}

func snapshotRequestBody(req *http.Request, previewLimit int64) models.HTTPBodySnapshot {
	mediaType, params, _ := mime.ParseMediaType(req.Header.Get("Content-Type"))
	body := models.HTTPBodySnapshot{
		Kind:      bodyKind(mediaType),
		MediaType: mediaType,
		Charset:   params["charset"],
		Size:      max(req.ContentLength, 0),
		Captured:  req.Body == nil,
	}
	if req.Body == nil {
		body.Kind = "empty"
		return body
	}
	if req.GetBody == nil {
		return body
	}
	reader, err := req.GetBody()
	if err != nil || reader == nil {
		return body
	}
	defer reader.Close()
	return CaptureBody(reader, mediaType, params["charset"], previewLimit)
}

// CaptureBody streams the full body through a hash while retaining only a bounded preview.
func CaptureBody(reader io.Reader, mediaType, charset string, previewLimit int64) models.HTTPBodySnapshot {
	if previewLimit < 0 {
		previewLimit = 0
	}
	hash := sha256.New()
	var preview bytes.Buffer
	written, _ := io.Copy(io.MultiWriter(hash, &limitedWriter{writer: &preview, remaining: previewLimit}), reader)
	previewBytes := preview.Bytes()
	codec, encoded := encodePreview(previewBytes)
	return models.HTTPBodySnapshot{
		Kind:         bodyKind(mediaType),
		MediaType:    mediaType,
		Charset:      charset,
		Size:         written,
		SHA256:       hex.EncodeToString(hash.Sum(nil)),
		Preview:      encoded,
		PreviewCodec: codec,
		Truncated:    written > int64(len(previewBytes)),
		Captured:     true,
	}
}

type limitedWriter struct {
	writer    io.Writer
	remaining int64
}

func (w *limitedWriter) Write(p []byte) (int, error) {
	originalLen := len(p)
	if w.remaining <= 0 {
		return originalLen, nil
	}
	if int64(len(p)) > w.remaining {
		p = p[:w.remaining]
	}
	written, err := w.writer.Write(p)
	w.remaining -= int64(written)
	if err != nil {
		return written, err
	}
	return originalLen, nil
}

func encodePreview(value []byte) (string, string) {
	if utf8.Valid(value) && !bytes.ContainsRune(value, 0) {
		return "utf8", string(value)
	}
	return "base64", base64.StdEncoding.EncodeToString(value)
}

func bodyKind(mediaType string) string {
	mediaType = strings.ToLower(mediaType)
	switch {
	case mediaType == "":
		return "binary"
	case strings.Contains(mediaType, "graphql"):
		return "graphql"
	case mediaType == "application/x-www-form-urlencoded":
		return "form"
	case strings.HasPrefix(mediaType, "multipart/"):
		return "multipart"
	case strings.Contains(mediaType, "json"):
		return "json"
	case strings.Contains(mediaType, "xml"):
		return "xml"
	case strings.HasPrefix(mediaType, "text/"):
		return "text"
	default:
		return "binary"
	}
}

func headerSource(name, fallback string) string {
	switch strings.ToLower(name) {
	case "authorization", "proxy-authorization":
		return "auth"
	case "cookie":
		return "cookie"
	case "content-length", "accept-encoding":
		return "transport"
	default:
		return fallback
	}
}

func isSensitiveHeader(name string) bool {
	name = strings.ToLower(name)
	return name == "authorization" || name == "proxy-authorization" || name == "cookie" ||
		name == "set-cookie" || name == "x-api-key" || name == "api-key" || name == "apikey" ||
		strings.Contains(name, "token")
}

func hasHeader(headers []models.HTTPHeaderSnapshot, name string) bool {
	for _, header := range headers {
		if strings.EqualFold(header.Name, name) {
			return true
		}
	}
	return false
}

func sortHeaders(headers []models.HTTPHeaderSnapshot) {
	sort.SliceStable(headers, func(i, j int) bool {
		left, right := strings.ToLower(headers[i].Name), strings.ToLower(headers[j].Name)
		if left == right {
			return headers[i].Value < headers[j].Value
		}
		return left < right
	})
}

func formatInt(value int64) string {
	if value == 0 {
		return "0"
	}
	negative := value < 0
	if negative {
		value = -value
	}
	var buf [20]byte
	i := len(buf)
	for value > 0 {
		i--
		buf[i] = byte('0' + value%10)
		value /= 10
	}
	if negative {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
