package transportcapture

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

func TestRecorderCapturesRedirectCookieAndDuplicateHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/start" {
			http.Redirect(w, r, "/final", http.StatusFound)
			return
		}
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte("ok"))
	}))
	defer server.Close()

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	recorder := NewRecorder("run-1", "module-1", nil, nil)
	client := &http.Client{Jar: jar, Transport: recorder.Transport(http.DefaultTransport)}
	startURL, _ := http.NewRequest(http.MethodPost, server.URL+"/start", strings.NewReader("hello"))
	startURL.Header["X-Trace"] = []string{"one", "two"}
	startURL.Header.Set("Content-Type", "text/plain; charset=utf-8")
	jar.SetCookies(startURL.URL, []*http.Cookie{{Name: "session", Value: "secret"}})
	startURL = startURL.WithContext(WithAttempt(context.Background(), models.RequestAttemptCauseInitial, nil))

	client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		parent := recorder.LastAttemptID()
		*req = *req.WithContext(WithAttempt(req.Context(), models.RequestAttemptCauseRedirect, parent))
		return nil
	}
	resp, err := client.Do(startURL)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()

	run := recorder.Run()
	if len(run.Attempts) != 2 {
		t.Fatalf("attempts = %d, want 2", len(run.Attempts))
	}
	first, second := run.Attempts[0], run.Attempts[1]
	if first.Response == nil || first.Response.StatusCode != http.StatusFound {
		t.Fatalf("first response = %+v", first.Response)
	}
	if second.Cause != models.RequestAttemptCauseRedirect || second.ParentAttemptID == nil || *second.ParentAttemptID != first.ID {
		t.Fatalf("redirect relation = cause %q parent %v", second.Cause, second.ParentAttemptID)
	}
	if !headerEquals(first.Request.Headers, "Cookie", "session=secret") {
		t.Fatalf("Cookie Jar header not captured: %+v", first.Request.Headers)
	}
	if countHeader(first.Request.Headers, "X-Trace") != 2 {
		t.Fatalf("duplicate headers lost: %+v", first.Request.Headers)
	}
	if first.Request.Body.Preview != "hello" || first.Request.Body.Kind != "text" {
		t.Fatalf("body snapshot = %+v", first.Request.Body)
	}
	if second.Request.Method != http.MethodGet || second.Request.URL != server.URL+"/final" {
		t.Fatalf("redirect request = %s %s", second.Request.Method, second.Request.URL)
	}
}

func TestCaptureBodyKeepsBoundedPreviewAndFullDigest(t *testing.T) {
	content := strings.Repeat("ab", 1024)
	got := CaptureBody(strings.NewReader(content), "application/json", "utf-8", 16)
	wantHash := sha256.Sum256([]byte(content))
	if got.Size != int64(len(content)) || got.Preview != content[:16] || !got.Truncated || !got.Captured {
		t.Fatalf("snapshot = %+v", got)
	}
	if got.SHA256 != hex.EncodeToString(wantHash[:]) {
		t.Fatalf("sha256 = %q", got.SHA256)
	}
}

func headerEquals(headers []models.HTTPHeaderSnapshot, name, value string) bool {
	for _, header := range headers {
		if strings.EqualFold(header.Name, name) && header.Value == value {
			return true
		}
	}
	return false
}

func countHeader(headers []models.HTTPHeaderSnapshot, name string) int {
	count := 0
	for _, header := range headers {
		if strings.EqualFold(header.Name, name) {
			count++
		}
	}
	return count
}
