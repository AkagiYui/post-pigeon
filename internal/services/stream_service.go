package services

import (
	"context"
	"encoding/base64"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
	"PostPigeon/internal/scripting"
	"PostPigeon/internal/transportcapture"

	"github.com/coder/websocket"
	"github.com/wailsapp/wails/v3/pkg/application"
	"gorm.io/gorm"

	"PostPigeon/internal/safego"
)

// StreamEvent 是推送给前端的流式事件（WebSocket / SSE 通用）。
// 连接存活于 Go 侧，前端切换标签页不会中断连接。
type StreamEvent struct {
	ConnID string `json:"connId"`
	Kind   string `json:"kind"` // open, message, sent, close, error
	Data   string `json:"data"` // 消息内容；Binary 为 true 时是 base64
	// Binary 为 true 表示这是一帧二进制消息，Data 为其 base64 编码。
	// 二进制帧不能直接 string() 转换——非法 UTF-8 字节会被替换成 U+FFFD，数据就毁了。
	Binary    bool  `json:"binary,omitempty"`
	Timestamp int64 `json:"timestamp"` // 毫秒时间戳
	// 以下字段仅用于 SSE。保留协议字段而非把它们拼进 Data，前端可同时展示事件类型、
	// last-event-id 与服务器建议的重连等待时间；Has* 使空值也能表达「本事件明确设置了该字段」。
	Event      string `json:"event,omitempty"`
	EventID    string `json:"eventId,omitempty"`
	HasEventID bool   `json:"hasEventId,omitempty"`
	Retry      int    `json:"retry,omitempty"`
	HasRetry   bool   `json:"hasRetry,omitempty"`
	Comment    string `json:"comment,omitempty"`
	HasComment bool   `json:"hasComment,omitempty"`
	// Raw 是事件/记录的协议原文，供 Raw 视图与导出使用。
	Raw string `json:"raw,omitempty"`
	// CloseCode 与 CloseReason 用于 WebSocket close frame。HasCloseCode 区分未收到
	// close frame 与服务端明确使用 1000 等关闭码的情况。
	CloseCode    int    `json:"closeCode,omitempty"`
	HasCloseCode bool   `json:"hasCloseCode,omitempty"`
	CloseReason  string `json:"closeReason,omitempty"`
}

// emitStream 通过 Wails 事件把流式事件推给前端（无运行中的 App 时静默跳过，便于测试）。
func emitStream(eventName string, ev StreamEvent) {
	app := application.Get()
	if app == nil || app.Event == nil {
		return
	}
	app.Event.Emit(eventName, ev)
}

func nowMillis() int64 { return time.Now().UnixMilli() }

// ---- WebSocket ----

// wsPingInterval 是 WebSocket 保活心跳间隔。
// 没有心跳时，中间的负载均衡/NAT 会在空闲若干分钟后静默掐断连接，
// 前端看到的现象是「连接还显示着，但再也收不到消息」。
const wsPingInterval = 30 * time.Second

// WebSocketService 管理多个持久 WebSocket 连接。
type WebSocketService struct {
	db    *gorm.DB
	http  *HTTPService
	mu    sync.Mutex
	conns map[string]*wsConn
}

type wsConn struct {
	conn   *websocket.Conn
	cancel context.CancelFunc
}

// NewWebSocketService 创建 WebSocket 服务实例。
// HTTPService 用来共享请求编辑态解析、脚本引擎与持久 Cookie jar。
func NewWebSocketService(db *gorm.DB, httpService *HTTPService) *WebSocketService {
	return &WebSocketService{db: db, http: httpService, conns: map[string]*wsConn{}}
}

// WSEventName 是前端监听的 WebSocket 事件名
const WSEventName = "ws:event"

// ServiceShutdown 应用退出时关闭全部 WebSocket 连接，避免连接与 goroutine 悬挂。
func (s *WebSocketService) ServiceShutdown() error {
	s.mu.Lock()
	conns := make([]*wsConn, 0, len(s.conns))
	for id, c := range s.conns {
		conns = append(conns, c)
		delete(s.conns, id)
	}
	s.mu.Unlock()

	for _, c := range conns {
		c.cancel()
		_ = c.conn.Close(websocket.StatusGoingAway, "application shutting down")
	}
	return nil
}

// Connect 建立一个 WebSocket 连接。握手复用普通 HTTP 请求的编辑态数据与解析语义：
// 变量、路径/query/cookie/header、模块自动参数、继承认证、前置操作、代理/TLS、
// URL 编码、超时、重定向、无缓存头、User-Agent 与模块绑定的 Cookie Jar 都会生效。
// 请求体不属于 WebSocket 握手；消息收发仍由 Send/SendBinary 与事件流处理。
// 返回值沿用普通 HTTP 响应模型，供前端展示握手状态、响应头/Cookie、实际请求与脚本输出。
func (s *WebSocketService) Connect(connID string, data SendRequestData, autoConvertWSProtocol bool) (out *HTTPResponseData, retErr error) {
	lifecycle := newRequestLifecycleTiming()
	configuredSnapshot := configuredRequestSnapshot(data)
	s.close(connID, false) // 若已存在同 ID 连接，先关闭；新一轮连接自行发送后续状态
	defer func() {
		if retErr != nil {
			emitStream(WSEventName, StreamEvent{
				ConnID: connID, Kind: "error", Data: retErr.Error(), Timestamp: nowMillis(),
			})
		}
	}()
	prepared := s.http.prepareRequestData(&data)
	stores := prepared.stores
	loadedEndpoint := prepared.loadedEndpoint
	scriptResults := &ScriptResults{}

	reqCtx := &scripting.RequestData{
		Method:  http.MethodGet,
		URL:     combineURL(data.BaseURL, data.Path),
		BaseURL: data.BaseURL,
		Headers: enabledHeaders(data.Headers),
	}
	if strings.TrimSpace(data.PreRequestScript) != "" {
		scriptResults.PreRequest = s.http.engine.Run(data.PreRequestScript, scripting.Options{
			Phase:   scripting.PhasePreRequest,
			Request: reqCtx,
			Stores:  stores,
		})
		data.Headers = headersToModel(reqCtx.Headers)
		if scriptResults.PreRequest.SkipRequest {
			s.persistVariableChanges(data, prepared)
			emitStream(WSEventName, StreamEvent{
				ConnID: connID, Kind: "close", Data: "request skipped by pre-request script", Timestamp: nowMillis(),
			})
			out := skippedRequestResponse(data, reqCtx, scriptResults, &configuredSnapshot)
			s.http.enqueuePersist(persistJob{data: data, resp: out})
			return out, nil
		}
	}

	vars := stores.Environment.ToMap()
	reqCtx.URL = resolveScriptRequestURL(data, reqCtx, vars)
	for i := range reqCtx.Headers {
		reqCtx.Headers[i].Value = resolveVars(reqCtx.Headers[i].Value, vars)
	}
	data.Headers = headersToModel(reqCtx.Headers)
	if strings.TrimSpace(data.PreSendScript) != "" {
		result := s.http.engine.Run(data.PreSendScript, scripting.Options{
			Phase: scripting.PhasePreRequest, Request: reqCtx, Stores: stores,
			DatabaseExec: s.http.executeDatabaseOperation,
		})
		scriptResults.OperationResults = append(scriptResults.OperationResults, extractOperationResults(result)...)
		scriptResults.PreRequest = mergeScriptResult(scriptResults.PreRequest, result)
		data.Headers = headersToModel(reqCtx.Headers)
		if result.SkipRequest {
			s.persistVariableChanges(data, prepared)
			emitStream(WSEventName, StreamEvent{
				ConnID: connID, Kind: "close", Data: "request skipped by pre-request script", Timestamp: nowMillis(),
			})
			out := skippedRequestResponse(data, reqCtx, scriptResults, &configuredSnapshot)
			s.http.enqueuePersist(persistJob{data: data, resp: out})
			return out, nil
		}
	}
	urlStr := resolveRequestURL(reqCtx.BaseURL, reqCtx.URL, stores.Environment.ToMap())
	if err := validateResolvedRequestURL(urlStr); err != nil {
		return nil, err
	}
	urlStr = applyPathParams(urlStr, data.Params, vars)
	if err := validateResolvedRequestURL(urlStr); err != nil {
		return nil, err
	}
	urlStr = convertHTTPToWSProtocol(urlStr, autoConvertWSProtocol)
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeInvalidURL, apperr.P("url", urlStr))
	}
	query := parsedURL.Query()
	for _, param := range data.Params {
		if param.Enabled && param.Type == "query" {
			query.Add(param.Name, resolveVars(param.Value, vars))
		}
	}
	for _, item := range reqCtx.Query {
		query.Add(item.Key, resolveVars(item.Value, vars))
	}

	urlEncoding := resolveURLEncodingFromPath(s.db, prepared.path, endpointURLEncoding(data, loadedEndpoint))
	applyURLEncoding(parsedURL, query, urlEncoding)
	standardURL := *parsedURL
	standardURL.Opaque = ""
	req, err := http.NewRequest(http.MethodGet, standardURL.String(), nil)
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeBuildRequest)
	}
	req.URL = parsedURL
	for _, header := range data.Headers {
		if header.Enabled {
			req.Header.Set(header.Name, resolveVars(header.Value, vars))
		}
	}

	limits := getRequestSettings(s.db)
	if resolveSendNoCacheHeaders(prepared.path, data.SendNoCacheHeaders, limits.SendNoCacheHeaders) &&
		req.Header.Get("Cache-Control") == "" {
		req.Header.Set("Cache-Control", "no-cache")
	}
	if _, ok := req.Header[http.CanonicalHeaderKey("User-Agent")]; !ok {
		req.Header.Set("User-Agent", requestUserAgent(limits))
	}
	for _, param := range data.Params {
		if param.Enabled && param.Type == "cookie" {
			req.AddCookie(&http.Cookie{Name: param.Name, Value: resolveVars(param.Value, vars)})
		}
	}

	epProxyJSON := data.ProxyConfig
	if strings.TrimSpace(epProxyJSON) == "" && loadedEndpoint != nil {
		epProxyJSON = loadedEndpoint.ProxyConfig
	}
	effectiveProxy := resolveProxy(
		resolveEffectiveProxyFromPath(s.db, prepared.path, parseEndpointProxy(epProxyJSON)), vars)
	epTLSJSON := data.TLSConfig
	if strings.TrimSpace(epTLSJSON) == "" && loadedEndpoint != nil {
		epTLSJSON = loadedEndpoint.TLSConfig
	}
	transport, err := sharedTransport(effectiveProxy,
		resolveEffectiveTLSFromPath(s.db, prepared.path, parseEndpointTLS(epTLSJSON)))
	if err != nil {
		return nil, err
	}
	client := &http.Client{
		Jar: s.http.cookies.jarForRequest(data.ModuleID, data.EnvironmentID),
	}
	connectionCtx, cancel := context.WithCancel(context.Background())
	dialCtx := connectionCtx
	dialCancel := func() {}
	if timeout := resolveRequestTimeout(prepared.path, data.TimeoutMode, data.Timeout, limits); timeout > 0 {
		dialCtx, dialCancel = context.WithTimeout(connectionCtx, timeout)
	}
	defer dialCancel()

	effectiveAuth := data.Auth
	if loadedEndpoint != nil {
		effectiveAuth = resolveEffectiveAuth(s.db, loadedEndpoint, data.Auth)
	}
	needsDigest := effectiveAuth != nil && effectiveAuth.Type == string(models.AuthTypeDigest)
	if effectiveAuth != nil && effectiveAuth.Type != string(models.AuthTypeNone) &&
		effectiveAuth.Type != string(models.AuthTypeInherit) && !needsDigest {
		if err := s.http.applyAuth(dialCtx, client, req, effectiveAuth, vars, urlEncoding); err != nil {
			cancel()
			return nil, err
		}
	}
	preparedSnapshot := transportcapture.SnapshotRequest(req, transportcapture.DefaultBodyPreviewBytes)
	preparedSnapshot.CaptureLevel = "prepared"
	recorder := transportcapture.NewRecorder("", data.ModuleID, nilOrNilString(data.EndpointID), &preparedSnapshot)
	recorder.SetConfiguredRequest(&configuredSnapshot)
	recorder.SetBodyPreviewBytes(requestCaptureLimit(limits.MaxStoredBodyBytes))
	client.Transport = recorder.Transport(transport)
	if resolveFollowRedirects(prepared.path, data.FollowRedirects, limits.FollowRedirects) {
		client.CheckRedirect = func(next *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return errors.New("stopped after 10 redirects")
			}
			*next = *next.WithContext(transportcapture.WithAttempt(
				next.Context(), models.RequestAttemptCauseRedirect, recorder.LastAttemptID()))
			return nil
		}
	} else {
		client.CheckRedirect = func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }
	}

	opts := &websocket.DialOptions{HTTPClient: client, HTTPHeader: req.Header.Clone()}
	if host := opts.HTTPHeader.Get("Host"); host != "" {
		opts.Host = host
		opts.HTTPHeader.Del("Host")
	}

	// WebSocket 握手本质上是一条 HTTP Upgrade 请求；沿用普通响应面板所需的计时维度。
	var dnsStart, dnsEnd, tlsStart, tlsEnd, connectStart, connectEnd, gotConn, wroteRequest, gotFirstByte time.Time
	var reused bool
	trace := &httptraceCollector{
		dnsStart:     &dnsStart,
		dnsEnd:       &dnsEnd,
		tlsStart:     &tlsStart,
		tlsEnd:       &tlsEnd,
		connectStart: &connectStart,
		connectEnd:   &connectEnd,
		gotConn:      &gotConn,
		wroteRequest: &wroteRequest,
		gotFirstByte: &gotFirstByte,
		reused:       &reused,
	}
	urlStr = req.URL.String()
	start := lifecycle.startNetwork()
	initialCtx := transportcapture.WithAttempt(dialCtx, models.RequestAttemptCauseWebSocketHandshake, nil)
	conn, response, err := websocket.Dial(trace.attach(initialCtx), urlStr, opts)
	if needsDigest && response != nil && response.StatusCode == http.StatusUnauthorized {
		var authData models.DigestAuthData
		if parseErr := models.FromJSON(effectiveAuth.Data, &authData); parseErr != nil {
			cancel()
			return nil, apperr.Wrap(parseErr, apperr.CodeAuthConfigInvalid, apperr.P("type", "digest"))
		}
		if challenge, ok := parseDigestChallenge(response.Header.Get("WWW-Authenticate")); ok {
			value, digestErr := buildDigestAuthorization(challenge,
				resolveVars(authData.Username, vars), resolveVars(authData.Password, vars),
				http.MethodGet, req.URL.RequestURI(), "")
			if digestErr != nil {
				cancel()
				return nil, digestErr
			}
			opts.HTTPHeader.Set("Authorization", value)
			_ = response.Body.Close()
			digestCtx := transportcapture.WithAttempt(dialCtx, models.RequestAttemptCauseDigest, recorder.LastAttemptID())
			conn, response, err = websocket.Dial(trace.attach(digestCtx), urlStr, opts)
		}
	}
	end := time.Now()
	lifecycle.finishResponse(end)
	timing := networkTimingFromTrace(trace, start, end)

	if err != nil {
		recorder.SetOutcome(models.RequestRunOutcomeFailed, requestAttemptError("websocket_handshake", err))
	} else {
		recorder.SetOutcome(models.RequestRunOutcomeCompleted, nil)
	}
	run := s.http.capturedRequestRun(recorder, data)
	responseData := &HTTPResponseData{
		Headers:       map[string][]string{},
		Timing:        timing,
		ActualRequest: actualRequestFromRun(&run),
		RequestRun:    &run,
	}
	if response != nil {
		responseData.StatusCode = response.StatusCode
		responseData.Headers = response.Header
		responseData.ContentType = response.Header.Get("Content-Type")
		responseData.Cookies = parseCookies(response.Cookies())
	}

	// 即使握手被服务器以 4xx/5xx 拒绝，只要拿到了 HTTP 响应，后置脚本仍与普通请求一样执行。
	if response != nil && strings.TrimSpace(data.PostResponseScript) != "" {
		respCtx := &scripting.ResponseData{
			Code:         response.StatusCode,
			Status:       http.StatusText(response.StatusCode),
			Headers:      flattenToHeaders(response.Header),
			ResponseTime: int64(timing.Total),
			ResponseSize: 0,
		}
		scriptResults.PostResponse = s.http.engine.Run(data.PostResponseScript, scripting.Options{
			Phase:    scripting.PhasePostResponse,
			Request:  reqCtx,
			Response: respCtx,
			Stores:   stores,
		})
		mutatedHeaders := headersToHTTPHeader(respCtx.Headers)
		responseData.Headers = mutatedHeaders
		if contentType := mutatedHeaders.Get("Content-Type"); contentType != "" {
			responseData.ContentType = contentType
		}
	}
	if scriptResults.PreRequest != nil || scriptResults.PostResponse != nil {
		responseData.Scripts = scriptResults
	}
	s.persistVariableChanges(data, prepared)
	responseData.Timing = lifecycle.complete(responseData.Timing, time.Now())
	s.http.enqueuePersist(persistJob{data: data, resp: responseData})

	if err != nil {
		cancel()
		if response != nil && response.Body != nil {
			_ = response.Body.Close()
		}
		wrapped := apperr.Wrap(err, apperr.CodeWSConnect, apperr.P("url", urlStr))
		emitStream(WSEventName, StreamEvent{
			ConnID: connID, Kind: "error", Data: wrapped.Error(), Timestamp: nowMillis(),
		})
		// Dial 失败后仍返回已捕获的握手请求/响应；错误已进入 WS 消息流，
		// 前端因此既能重连，也能检查 400 响应头、Cookie 与实际请求。
		responseData.Error = wrapped.Error()
		return responseData, nil
	}
	// 单帧上限：-1 表示不限制，会让一个超大帧直接把内存打满
	if limits.MaxWebSocketMessageBytes > 0 {
		conn.SetReadLimit(limits.MaxWebSocketMessageBytes)
	} else {
		conn.SetReadLimit(-1)
	}

	s.mu.Lock()
	s.conns[connID] = &wsConn{conn: conn, cancel: cancel}
	s.mu.Unlock()

	emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "open", Timestamp: nowMillis()})

	safego.Go("ws.readLoop", func() { s.readLoop(connectionCtx, connID, conn) })
	safego.Go("ws.keepAlive", func() { s.keepAlive(connectionCtx, conn) })
	return responseData, nil
}

// persistVariableChanges 与普通请求一样，把前置操作对变量存储的改动落回对应作用域。
func (s *WebSocketService) persistVariableChanges(data SendRequestData, prepared preparedRequestData) {
	if data.EnvironmentID != "" {
		upserts, removed := prepared.stores.Environment.Changes()
		_ = prepared.environmentService.ApplyVariableChanges(data.EnvironmentID, upserts, removed)
	}
	s.http.persistModuleVarChanges(data.ModuleID, prepared.stores.Collection)
}

// keepAlive 定期发送 ping，维持空闲连接不被中间设备掐断。
func (s *WebSocketService) keepAlive(ctx context.Context, conn *websocket.Conn) {
	ticker := time.NewTicker(wsPingInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			err := conn.Ping(pingCtx)
			cancel()
			if err != nil {
				// ping 失败说明连接已不可用，交给 readLoop 走正常的关闭流程
				return
			}
		}
	}
}

func (s *WebSocketService) readLoop(ctx context.Context, connID string, conn *websocket.Conn) {
	for {
		msgType, data, err := conn.Read(ctx)
		if err != nil {
			if s.cleanup(connID, conn) {
				ev := StreamEvent{ConnID: connID, Kind: "close", Data: err.Error(), Timestamp: nowMillis()}
				var closeErr websocket.CloseError
				if errors.As(err, &closeErr) {
					ev.CloseCode = int(closeErr.Code)
					ev.HasCloseCode = true
					ev.CloseReason = closeErr.Reason
				}
				emitStream(WSEventName, ev)
			}
			return
		}
		ev := StreamEvent{ConnID: connID, Kind: "message", Timestamp: nowMillis()}
		if msgType == websocket.MessageBinary {
			ev.Binary = true
			ev.Data = base64.StdEncoding.EncodeToString(data)
		} else {
			ev.Data = string(data)
		}
		emitStream(WSEventName, ev)
	}
}

// Send 向指定连接发送一条文本消息。
func (s *WebSocketService) Send(connID, message string) error {
	return s.write(connID, websocket.MessageText, []byte(message), message, false)
}

// SendBinary 向指定连接发送一帧二进制消息，payload 为 base64 编码。
func (s *WebSocketService) SendBinary(connID, payloadBase64 string) error {
	raw, err := base64.StdEncoding.DecodeString(payloadBase64)
	if err != nil {
		return apperr.Wrap(err, apperr.CodeInvalidInput, apperr.P("field", "payload"))
	}
	return s.write(connID, websocket.MessageBinary, raw, payloadBase64, true)
}

// write 是 Send / SendBinary 的公共实现。
func (s *WebSocketService) write(connID string, msgType websocket.MessageType, payload []byte, echo string, binary bool) error {
	s.mu.Lock()
	c := s.conns[connID]
	s.mu.Unlock()
	if c == nil {
		return apperr.New(apperr.CodeWSNotConnected, apperr.P("connId", connID))
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := c.conn.Write(ctx, msgType, payload); err != nil {
		return apperr.Wrap(err, apperr.CodeWSSend)
	}
	emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "sent", Data: echo, Binary: binary, Timestamp: nowMillis()})
	return nil
}

// Close 关闭并移除指定连接。
func (s *WebSocketService) Close(connID string) error {
	s.close(connID, true)
	return nil
}

func (s *WebSocketService) close(connID string, emit bool) {
	s.mu.Lock()
	c := s.conns[connID]
	delete(s.conns, connID)
	s.mu.Unlock()
	if c != nil {
		c.cancel()
		_ = c.conn.Close(websocket.StatusNormalClosure, "client closed")
		if emit {
			emitStream(WSEventName, StreamEvent{
				ConnID: connID, Kind: "close", Data: "client closed", Timestamp: nowMillis(),
				CloseCode: int(websocket.StatusNormalClosure), HasCloseCode: true, CloseReason: "client closed",
			})
		}
	}
}

func (s *WebSocketService) cleanup(connID string, conn *websocket.Conn) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.conns[connID]
	if c != nil && c.conn == conn {
		delete(s.conns, connID)
		c.cancel()
		return true
	}
	return false
}

// IsConnected 返回指定连接是否处于活动状态。
func (s *WebSocketService) IsConnected(connID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.conns[connID]
	return ok
}
