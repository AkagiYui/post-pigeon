package services

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptrace"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
	"PostPigeon/internal/scripting"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v3/pkg/application"
	"gorm.io/gorm"

	"PostPigeon/internal/safego"

	"os"
	"path/filepath"
)

// HTTPStreamEventName 是前端监听的 HTTP 流式响应事件名。
// SSE 不是独立的请求类型，而是「响应体为 text/event-stream 的流式 HTTP 响应」；
// 因此所有流式响应（含 SSE 帧解析）都经由统一的、带代理的 HTTP 客户端处理并通过此事件推送。
const HTTPStreamEventName = "http:stream"

// 异步落库的队列容量与 worker 数。
// 用有界队列而不是「每次请求 go 一个 goroutine」：请求风暴时前者会丢弃最旧的记录并
// 留下日志，后者会无上限地堆 goroutine 并把 SQLite 的写锁挤爆。
const (
	persistQueueSize = 256
	persistWorkers   = 2
)

// maxRawBodyBytes 是随响应回传给前端的 base64 原始字节上限。
// RawBody 只服务于「按 GBK 等字符集重新解码」这一个场景，而 base64 会把体积放大 4/3，
// 超过该阈值就不再回传，前端回退使用已按 UTF-8 解码的 Body。
const maxRawBodyBytes = 4 << 20

// persistJob 是一条待写入数据库的响应快照 / 请求历史。
type persistJob struct {
	data SendRequestData
	resp *HTTPResponseData
}

// inflight 记录一个进行中的请求，供前端主动取消。
type inflight struct {
	cancel   context.CancelFunc
	canceled atomic.Bool
}

// HTTPService HTTP 请求服务
type HTTPService struct {
	db      *gorm.DB
	engine  *scripting.Engine
	cookies *CookieService

	mu sync.Mutex
	// streams 记录活跃的流式响应连接（streamID -> cancel），供前端主动停止。
	streams map[string]context.CancelFunc
	// requests 记录进行中的普通请求（requestID -> inflight），供前端主动取消。
	requests map[string]*inflight
	// shuttingDown 为 true 后不再接受新的落库任务，且 persistCh 已关闭。
	shuttingDown bool

	persistCh   chan persistJob
	persistOnce sync.Once
	persistWG   sync.WaitGroup
}

// NewHTTPService 创建 HTTP 服务实例
func NewHTTPService(db *gorm.DB) *HTTPService {
	return &HTTPService{
		db:        db,
		engine:    scripting.New(),
		cookies:   NewCookieService(db),
		streams:   map[string]context.CancelFunc{},
		requests:  map[string]*inflight{},
		persistCh: make(chan persistJob, persistQueueSize),
	}
}

// ServiceStartup 在应用启动时按保留策略清理历史，避免旧数据无限堆积。
func (s *HTTPService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	safego.Go("history.retentionOnStartup", func() {
		if err := NewRequestHistoryService(s.db).ApplyRetentionPolicy(); err != nil {
			slog.Warn("启动时清理请求历史失败", "error", err)
		}
	})
	return nil
}

// ServiceShutdown 在应用退出时取消所有进行中的请求与流、落盘剩余历史并释放连接池。
func (s *HTTPService) ServiceShutdown() error {
	s.mu.Lock()
	if s.shuttingDown {
		s.mu.Unlock()
		return nil
	}
	s.shuttingDown = true
	cancels := make([]context.CancelFunc, 0, len(s.streams)+len(s.requests))
	for id, cancel := range s.streams {
		cancels = append(cancels, cancel)
		delete(s.streams, id)
	}
	for id, req := range s.requests {
		cancels = append(cancels, req.cancel)
		delete(s.requests, id)
	}
	close(s.persistCh)
	s.mu.Unlock()

	for _, cancel := range cancels {
		cancel()
	}
	// 等待队列里的历史写完，避免退出时丢记录
	s.persistWG.Wait()
	closeAllTransports()
	return nil
}

// startPersistWorkers 启动固定数量的落库 worker（首次入队时懒启动）。
func (s *HTTPService) startPersistWorkers() {
	for range persistWorkers {
		s.persistWG.Go(func() {
			// runPersist 里层有 recover，这里再兜一道：循环本身出问题不该掀掉进程
			defer safego.Recover("http.persistWorker")
			for job := range s.persistCh {
				s.runPersist(job)
			}
		})
	}
}

// enqueuePersist 把落库任务放入有界队列；队列满时丢弃并告警，绝不阻塞请求返回。
func (s *HTTPService) enqueuePersist(job persistJob) {
	s.persistOnce.Do(s.startPersistWorkers)

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.shuttingDown {
		return
	}
	select {
	case s.persistCh <- job:
	default:
		slog.Warn("请求历史写入队列已满，本次记录被丢弃", "queueSize", persistQueueSize)
	}
}

// runPersist 执行一条落库任务，并兜住 panic 以免打挂 worker。
func (s *HTTPService) runPersist(job persistJob) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("写入响应快照/请求历史时发生 panic", "panic", r)
		}
	}()
	s.saveResponseAndHistory(job.data, job.resp)
}

// SendRequestData 发送请求的参数
type SendRequestData struct {
	EndpointID    string                     `json:"endpointId"`
	ModuleID      string                     `json:"moduleId"`
	EnvironmentID string                     `json:"environmentId"`
	Method        string                     `json:"method"`
	BaseURL       string                     `json:"baseUrl"`
	Path          string                     `json:"path"`
	Headers       []models.EndpointHeader    `json:"headers"`
	Params        []models.EndpointParam     `json:"params"`
	BodyType      string                     `json:"bodyType"`
	BodyContent   string                     `json:"bodyContent"`
	ContentType   string                     `json:"contentType"`
	BodyFields    []models.EndpointBodyField `json:"bodyFields"`
	Auth          *models.EndpointAuth       `json:"auth"`
	Timeout       int                        `json:"timeout"`
	// TimeoutMode: inherit / unlimited / value。空值兼容旧调用方：Timeout>0 视为显式值。
	TimeoutMode string `json:"timeoutMode"`
	// FollowRedirects / SendNoCacheHeaders nil 表示继承父级，显式 true/false 才覆盖。
	FollowRedirects    *bool `json:"followRedirects"`
	SendNoCacheHeaders *bool `json:"sendNoCacheHeaders"`
	// ProxyConfig 接口级代理选择（EndpointProxy 的 JSON）。空表示逐层继承。
	ProxyConfig string `json:"proxyConfig"`
	// TLSConfig 接口级 TLS 选择（EndpointTLS 的 JSON）。空表示逐层继承。
	TLSConfig string `json:"tlsConfig"`
	// URLEncoding 接口级 URL 自动编码档位。空表示逐层继承。
	URLEncoding string `json:"urlEncoding"`
	// DisabledGlobalParams / Operations / InheritOperations 携带当前编辑态。
	// 已保存端点未保存就直接发送时，应以界面当前值为准，而不是回读数据库旧值。
	DisabledGlobalParams string             `json:"disabledGlobalParams"`
	Operations           []models.Operation `json:"operations"`
	InheritOperations    *bool              `json:"inheritOperations"`
	// RequestID 由前端生成的本次请求标识，用于中途取消（CancelRequest）。空则不可取消。
	RequestID string `json:"requestId"`
	// PreRequestScript 前置脚本，请求发送前执行
	PreRequestScript string `json:"preRequestScript"`
	// PostResponseScript 后置脚本，响应返回后执行
	PostResponseScript string `json:"postResponseScript"`
}

// ScriptResults 前置/后置脚本的执行结果，随响应返回给前端展示
type ScriptResults struct {
	PreRequest   *scripting.Result `json:"preRequest,omitempty"`
	PostResponse *scripting.Result `json:"postResponse,omitempty"`
}

// HTTPResponseData HTTP 响应数据
type HTTPResponseData struct {
	StatusCode int                 `json:"statusCode"`
	Headers    map[string][]string `json:"headers"`
	Body       string              `json:"body"`
	// RawBody 原始响应字节的 base64 编码，供前端按任意字符集解码（GBK 等）。
	// 超过 maxRawBodyBytes 时为空（见 RawBodyOmitted），前端回退使用 Body。
	RawBody string `json:"rawBody"`
	// RawBodyOmitted 为 true 表示响应过大、未回传原始字节，前端应禁用字符集切换。
	RawBodyOmitted bool `json:"rawBodyOmitted"`
	// Truncated 为 true 表示响应体超过限额、只读取了前 Size 字节。
	Truncated bool `json:"truncated"`
	// TruncatedLimit 触发截断时的字节上限，供前端提示「已截断，上限 xx MB」。
	TruncatedLimit int64                    `json:"truncatedLimit"`
	ContentType    string                   `json:"contentType"`
	Cookies        []models.CookieInfo      `json:"cookies"`
	Timing         models.TimingInfo        `json:"timing"`
	Size           int64                    `json:"size"`
	ActualRequest  models.ActualRequestInfo `json:"actualRequest"`
	// Scripts 前置/后置脚本执行结果（无脚本时为 nil）
	Scripts *ScriptResults `json:"scripts,omitempty"`
	// Skipped 为 true 表示请求被前置脚本 pm.execution.skipRequest() 跳过，未真正发出
	Skipped bool `json:"skipped"`
	// Streaming 为 true 表示响应是 SSE 流，正通过 sse:event 事件持续推送（Body 为空）
	Streaming bool `json:"streaming"`
	// StreamID 流的连接标识，前端据此订阅并展示实时事件、可发起停止
	StreamID string `json:"streamId"`
}

// isEventStream 判断响应 Content-Type 是否为 SSE 事件流。
func isEventStream(contentType string) bool {
	return strings.Contains(strings.ToLower(contentType), "text/event-stream")
}

// ListScriptLibraries 返回脚本运行时的内置库清单（名称/版本/用法等），供前端展示。
func (s *HTTPService) ListScriptLibraries() ([]scripting.LibraryInfo, error) {
	return scripting.Libraries()
}

// SendRequest 发送 HTTP 请求
func (s *HTTPService) SendRequest(data SendRequestData) (*HTTPResponseData, error) {
	prepared := s.prepareRequestData(&data)
	envService := prepared.environmentService
	stores := prepared.stores
	loadedEndpoint := prepared.loadedEndpoint

	scriptResults := &ScriptResults{}

	// 构建可被前置脚本修改的请求上下文
	reqCtx := &scripting.RequestData{
		Method:  data.Method,
		URL:     combineURL(data.BaseURL, data.Path),
		BaseURL: data.BaseURL,
		Headers: enabledHeaders(data.Headers),
		Body:    data.BodyContent,
	}

	// 执行前置脚本（可修改 method/url/headers/body 及环境变量）
	if strings.TrimSpace(data.PreRequestScript) != "" {
		scriptResults.PreRequest = s.engine.Run(data.PreRequestScript, scripting.Options{
			Phase:   scripting.PhasePreRequest,
			Request: reqCtx,
			Stores:  stores,
		})
		// 将脚本对请求的修改应用回 data
		data.Method = reqCtx.Method
		data.BodyContent = reqCtx.Body
		data.Headers = headersToModel(reqCtx.Headers)

		// 前置脚本调用 pm.execution.skipRequest()：跳过发送，直接返回脚本结果
		if scriptResults.PreRequest.SkipRequest {
			if data.EnvironmentID != "" {
				up, rm := stores.Environment.Changes()
				_ = envService.ApplyVariableChanges(data.EnvironmentID, up, rm)
			}
			s.persistModuleVarChanges(data.ModuleID, stores.Collection)
			// 文案交给前端 i18n 渲染，后端只给出「被跳过」这一事实
			return &HTTPResponseData{
				StatusCode: 0,
				Headers:    map[string][]string{},
				Skipped:    true,
				Scripts:    scriptResults,
			}, nil
		}
	}

	// 用（可能被脚本更新过的）变量存储解析占位符
	vars := stores.Environment.ToMap()

	// 组合 URL（前置脚本可能已改写整条 URL）
	fullURL := resolveVars(reqCtx.URL, vars)
	// 路径参数：替换 URL 中的 {name} 占位符
	fullURL = applyPathParams(fullURL, data.Params, vars)

	// 解析 URL 中的查询参数
	parsedURL, err := url.Parse(fullURL)
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeInvalidURL, apperr.P("url", fullURL))
	}

	// 添加查询参数
	query := parsedURL.Query()
	for _, param := range data.Params {
		if param.Enabled && param.Type == "query" {
			query.Add(param.Name, resolveVars(param.Value, vars))
		}
	}
	// 前置脚本通过 pm.request.url.query.add(...) 追加的查询参数
	for _, q := range reqCtx.Query {
		query.Add(q.Key, resolveVars(q.Value, vars))
	}

	requestPath := prepared.path

	// URL 自动编码：档位沿「接口 → 文件夹链 → 模块 → 项目 → 全局」解析。
	// 自定义转义会把最终路径挂到 Opaque 上，那之后 parsedURL.String() 就拿不到主机了，
	// 所以先留一份标准形态的 URL 交给 http.NewRequest 做解析与校验。
	urlEncoding := resolveURLEncodingFromPath(s.db, requestPath, endpointURLEncoding(data, loadedEndpoint))
	applyURLEncoding(parsedURL, query, urlEncoding)
	standardURL := *parsedURL
	standardURL.Opaque = ""

	// 全局请求设置既是继承链终点，也提供响应体等安全上限。
	limits := getRequestSettings(s.db)

	// 创建请求。
	// 超时用「取消 + 计时器」实现，而非 context.WithTimeout：普通请求受超时约束整个收发；
	// 一旦判定为流式响应（text/event-stream），停止计时器，让连接长存（超时仅约束到响应头）。
	// 超时沿五级链解析；unlimited 最终得到 0，此时不起计时器。
	timeout := resolveRequestTimeout(requestPath, data.TimeoutMode, data.Timeout, limits)
	ctx, cancel := context.WithCancel(context.Background())
	// timedOut 用于把「超时取消」与「用户取消」区分开，好让前端拿到不同的错误码
	var timedOut atomic.Bool
	var timeoutTimer *time.Timer
	if timeout > 0 {
		timeoutTimer = time.AfterFunc(timeout, func() {
			timedOut.Store(true)
			cancel()
		})
	}
	// 登记为进行中的请求，前端可据 RequestID 主动取消
	tracked := s.registerRequest(data.RequestID, cancel)
	streaming := false
	defer func() {
		if timeoutTimer != nil {
			timeoutTimer.Stop()
		}
		s.unregisterRequest(data.RequestID)
		// 流式响应交由后台 goroutine 持有 ctx，此处不取消；其余路径正常释放。
		if !streaming {
			cancel()
		}
	}()

	req, err := http.NewRequestWithContext(ctx, strings.ToUpper(data.Method), standardURL.String(), nil)
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeBuildRequest)
	}
	// NewRequest 重新解析了一遍 URL，这里换回我们自己转义好的那份（可能带 Opaque）
	req.URL = parsedURL

	// 设置请求头
	for _, header := range data.Headers {
		if header.Enabled {
			req.Header.Set(header.Name, resolveVars(header.Value, vars))
		}
	}

	// 五级「发送无缓存头」：请求自己没写 Cache-Control 时才补，避免盖掉用户的显式设置。
	if resolveSendNoCacheHeaders(requestPath, data.SendNoCacheHeaders, limits.SendNoCacheHeaders) && req.Header.Get("Cache-Control") == "" {
		req.Header.Set("Cache-Control", "no-cache")
	}

	// 全局默认 User-Agent：仅在请求自身没有这个头时才补。
	// 这里判断的是「键是否存在」而不是取值是否为空：接口上显式把 User-Agent 留空，
	// 表示要抑制该请求头（Go 的 transport 见到空值就不发），这份意图不应被全局默认值盖掉。
	if _, ok := req.Header[http.CanonicalHeaderKey("User-Agent")]; !ok {
		req.Header.Set("User-Agent", requestUserAgent(limits))
	}

	// Cookie 参数：并入 Cookie 请求头
	for _, param := range data.Params {
		if param.Enabled && param.Type == "cookie" {
			req.AddCookie(&http.Cookie{Name: param.Name, Value: resolveVars(param.Value, vars)})
		}
	}

	// 设置请求体
	if err := s.setRequestBody(req, data, vars, limits); err != nil {
		return nil, err
	}

	// 解析端点认证的继承（inherit / 空 -> 文件夹链 -> 模块）。
	// 这里只解析不应用：OAuth2 需要用同一个（带代理与 TLS 的）客户端去换 token，
	// 而客户端要等代理/TLS 解析完才建得出来。
	effectiveAuth := data.Auth
	if loadedEndpoint != nil {
		effectiveAuth = resolveEffectiveAuth(s.db, loadedEndpoint, data.Auth)
	}

	// 解析接口级代理选择：优先取本次请求携带的选择，其次取已保存端点上的选择。
	// 空则沿文件夹、模块、项目与全局继承，据此构建最终代理函数。
	epProxyJSON := data.ProxyConfig
	if strings.TrimSpace(epProxyJSON) == "" && loadedEndpoint != nil {
		epProxyJSON = loadedEndpoint.ProxyConfig
	}
	var epProxy models.EndpointProxy
	if strings.TrimSpace(epProxyJSON) != "" {
		_ = models.FromJSON(epProxyJSON, &epProxy)
	}
	effectiveProxy := resolveProxy(resolveEffectiveProxyFromPath(s.db, requestPath, epProxy), vars)

	// 解析接口级 TLS 选择（inherit / strict / insecure），同样沿五级链。
	epTLSJSON := data.TLSConfig
	if strings.TrimSpace(epTLSJSON) == "" && loadedEndpoint != nil {
		epTLSJSON = loadedEndpoint.TLSConfig
	}
	var epTLS models.EndpointTLS
	if strings.TrimSpace(epTLSJSON) != "" {
		_ = models.FromJSON(epTLSJSON, &epTLS)
	}
	effectiveTLS := resolveEffectiveTLSFromPath(s.db, requestPath, epTLS)

	// 取「代理 + TLS」对应的共享 Transport：相同配置的请求复用同一个连接池，
	// 连接得以复用（timing.Reused 才有意义），且开启了 HTTP/2 协商。
	transport, err := sharedTransport(effectiveProxy, effectiveTLS)
	if err != nil {
		return nil, err
	}

	// 创建 HTTP 客户端。
	// cookie jar 按项目持久化：登录接口拿到的会话 cookie 会自动带到后续请求上，
	// 不再需要手工把 Set-Cookie 抄进请求头。
	client := &http.Client{
		Jar:       s.cookies.JarFor(projectIDFromModule(s.db, data.ModuleID)),
		Transport: transport,
	}

	// 处理重定向：沿接口、文件夹链、模块、项目、全局解析。
	if !resolveFollowRedirects(requestPath, data.FollowRedirects, limits.FollowRedirects) {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	}

	// 应用认证。digest 需要先收到 401 挑战，故此处跳过，等首个响应回来再补一次。
	needsDigest := false
	if effectiveAuth != nil && effectiveAuth.Type != string(models.AuthTypeNone) &&
		effectiveAuth.Type != string(models.AuthTypeInherit) {
		if effectiveAuth.Type == string(models.AuthTypeDigest) {
			needsDigest = true
		} else if err := s.applyAuth(ctx, client, req, effectiveAuth, vars, urlEncoding); err != nil {
			return nil, err
		}
	}

	// 记录实际请求信息
	actualReq := models.ActualRequestInfo{
		Method:  req.Method,
		URL:     urlWithHost(req.URL),
		Headers: flattenHeaders(req.Header),
	}
	if req.GetBody != nil {
		bodyReader, _ := req.GetBody()
		if bodyReader != nil {
			bodyBytes, _ := io.ReadAll(bodyReader)
			actualReq.Body = string(bodyBytes)
		}
	}

	// 计时
	var dnsStart, dnsEnd, tlsStart, tlsEnd, connectStart, connectEnd, gotConn, wroteRequest, gotFirstByte time.Time
	var reused bool
	var start time.Time

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

	// 发送请求
	start = time.Now()
	resp, err := client.Do(req.WithContext(trace.attach(ctx)))
	if err != nil {
		return nil, s.classifyRequestError(err, tracked, &timedOut)
	}

	// Digest 认证：第一次请求必然拿到 401 挑战，据此算出响应值后重发一次。
	// 这是协议本身要求的往返，不是重试。
	if needsDigest && resp.StatusCode == http.StatusUnauthorized {
		retried, retryErr := s.retryWithDigest(ctx, client, req, resp, effectiveAuth, vars, actualReq.Body)
		if retryErr != nil {
			resp.Body.Close()
			return nil, retryErr
		}
		if retried != nil {
			resp.Body.Close()
			resp = retried
			start = time.Now()
			actualReq.Headers = flattenHeaders(retried.Request.Header)
		}
	}

	// 流式响应：响应体为 text/event-stream 时，不缓冲整体响应，而是保持连接、持续读取并
	// 按 SSE 帧解析后经 http:stream 事件实时推送（前端展示为事件流）。此路径与普通请求走
	// 同一个（已注入代理的）客户端——SSE 只是流式响应的一种文本规范，并非独立的请求类型。
	if isEventStream(resp.Header.Get("Content-Type")) {
		streaming = true // 通知外层 defer：ctx 交由后台 goroutine 持有，勿在此处取消
		if timeoutTimer != nil {
			timeoutTimer.Stop()
		}
		// 流 ID 必须全局唯一：同一个端点可以同时开多个标签页，若沿用端点 ID
		// 后开的流会覆盖先开的 cancel，导致第一条流再也停不掉、连接与 goroutine 泄漏。
		streamID := "stream-" + uuid.NewString()
		s.registerStream(streamID, cancel)
		// 持久化前置脚本对环境变量 / 模块变量的改动
		if data.EnvironmentID != "" {
			up, rm := stores.Environment.Changes()
			_ = envService.ApplyVariableChanges(data.EnvironmentID, up, rm)
		}
		s.persistModuleVarChanges(data.ModuleID, stores.Collection)
		// 后台读取事件流并推送，读到 EOF/停止后清理连接
		safego.Go("http.streamResponse", func() { s.streamResponse(resp, streamID, cancel) })

		out := &HTTPResponseData{
			StatusCode:    resp.StatusCode,
			Headers:       resp.Header,
			ContentType:   resp.Header.Get("Content-Type"),
			Timing:        models.TimingInfo{Total: durMs(time.Since(start))},
			ActualRequest: actualReq,
			Streaming:     true,
			StreamID:      streamID,
		}
		if scriptResults.PreRequest != nil {
			out.Scripts = scriptResults
		}
		return out, nil
	}
	defer resp.Body.Close()

	// 读取响应体：受限额约束。
	// 不设上限时，一个下载类接口就能把整个文件读进内存，再连同 base64 副本一起塞进
	// IPC 和 SQLite（约 3 倍体积）。这里最多多读 1 字节以判定是否发生截断。
	bodyBytes, truncated, err := readBodyWithLimit(resp.Body, limits.MaxResponseBytes)
	if err != nil {
		return nil, s.classifyRequestError(err, tracked, &timedOut)
	}
	end := time.Now()

	// 计算计时信息（含各阶段分解，单位毫秒，保留亚毫秒精度）
	timing := models.TimingInfo{
		Total:  durMs(end.Sub(start)),
		Reused: reused,
	}
	if !dnsStart.IsZero() && !dnsEnd.IsZero() {
		timing.DNSLookup = durMs(dnsEnd.Sub(dnsStart))
	}
	if !connectStart.IsZero() && !connectEnd.IsZero() {
		timing.TCPConnect = durMs(connectEnd.Sub(connectStart))
	}
	if !tlsStart.IsZero() && !tlsEnd.IsZero() {
		timing.TLSHandshake = durMs(tlsEnd.Sub(tlsStart))
	}
	if !gotFirstByte.IsZero() {
		timing.TTFB = durMs(gotFirstByte.Sub(start))
		// 下载内容：首字节 → 读取完成
		timing.Download = durMs(end.Sub(gotFirstByte))
		// 等待：请求写完 → 首字节（服务端处理）；缺请求写完时间点则回退到连接完成/开始
		switch {
		case !wroteRequest.IsZero():
			timing.Wait = durMs(gotFirstByte.Sub(wroteRequest))
		case !connectEnd.IsZero():
			timing.Wait = durMs(gotFirstByte.Sub(connectEnd))
		default:
			timing.Wait = timing.TTFB
		}
	}
	// 准备/阻塞：请求开始 → 开始建立连接（连接复用时接近 0）
	switch {
	case !dnsStart.IsZero():
		timing.Stalled = durMs(dnsStart.Sub(start))
	case !connectStart.IsZero():
		timing.Stalled = durMs(connectStart.Sub(start))
	case !gotConn.IsZero():
		timing.Stalled = durMs(gotConn.Sub(start))
	}
	// 钳位，避免因时钟抖动出现的极小负值
	if timing.Stalled < 0 {
		timing.Stalled = 0
	}
	if timing.Wait < 0 {
		timing.Wait = 0
	}
	if timing.Download < 0 {
		timing.Download = 0
	}

	// 解析 Cookie
	cookies := parseCookies(resp.Cookies())

	// 构建响应数据
	responseData := &HTTPResponseData{
		StatusCode:    resp.StatusCode,
		Headers:       resp.Header,
		Body:          string(bodyBytes),
		ContentType:   resp.Header.Get("Content-Type"),
		Cookies:       cookies,
		Timing:        timing,
		Size:          int64(len(bodyBytes)),
		ActualRequest: actualReq,
	}
	if truncated {
		responseData.Truncated = true
		responseData.TruncatedLimit = limits.MaxResponseBytes
	}
	setRawBody(responseData, bodyBytes)

	// 执行后置脚本（可读取响应、修改响应体/响应头、运行断言、读写变量）
	if strings.TrimSpace(data.PostResponseScript) != "" {
		respCtx := &scripting.ResponseData{
			Code:         resp.StatusCode,
			Status:       http.StatusText(resp.StatusCode),
			Headers:      flattenToHeaders(resp.Header),
			Body:         string(bodyBytes),
			ResponseTime: int64(timing.Total),
			ResponseSize: int64(len(bodyBytes)),
		}
		scriptResults.PostResponse = s.engine.Run(data.PostResponseScript, scripting.Options{
			Phase:    scripting.PhasePostResponse,
			Request:  reqCtx,
			Response: respCtx,
			Stores:   stores,
		})
		// 应用后置脚本对响应的修改（setBody / headers）
		if respCtx.Body != string(bodyBytes) {
			responseData.Body = respCtx.Body
			responseData.Size = int64(len(respCtx.Body))
			setRawBody(responseData, []byte(respCtx.Body))
		}
		mutatedHeaders := headersToHTTPHeader(respCtx.Headers)
		responseData.Headers = mutatedHeaders
		if ct := mutatedHeaders.Get("Content-Type"); ct != "" {
			responseData.ContentType = ct
		}
	}

	// 将脚本对环境变量 / 模块变量的增量持久化回数据库
	if data.EnvironmentID != "" {
		upserts, removed := stores.Environment.Changes()
		if err := envService.ApplyVariableChanges(data.EnvironmentID, upserts, removed); err != nil {
			slog.Error("持久化脚本变量失败", "error", err)
		}
	}
	s.persistModuleVarChanges(data.ModuleID, stores.Collection)

	// 附加脚本执行结果（无脚本时保持 nil）
	if scriptResults.PreRequest != nil || scriptResults.PostResponse != nil {
		responseData.Scripts = scriptResults
	}

	// 异步保存响应和请求历史（有界队列，队列满时丢弃而非堆积 goroutine）
	s.enqueuePersist(persistJob{data: data, resp: responseData})

	return responseData, nil
}

// readBodyWithLimit 读取响应体，最多 limit 字节；limit<=0 表示不限制。
// 第二个返回值表示是否发生了截断（响应实际长度超过 limit）。
func readBodyWithLimit(r io.Reader, limit int64) ([]byte, bool, error) {
	if limit <= 0 {
		body, err := io.ReadAll(r)
		return body, false, err
	}
	// 多读 1 字节用于判定截断
	body, err := io.ReadAll(io.LimitReader(r, limit+1))
	if err != nil {
		return nil, false, err
	}
	if int64(len(body)) > limit {
		return body[:limit], true, nil
	}
	return body, false, nil
}

// setRawBody 按体积决定是否回传 base64 原始字节。
// RawBody 只用于前端按 GBK 等字符集重新解码，base64 会放大 4/3 体积，
// 大响应下不值得为这一个功能把内存与 IPC 翻倍。
func setRawBody(resp *HTTPResponseData, body []byte) {
	if int64(len(body)) > maxRawBodyBytes {
		resp.RawBody = ""
		resp.RawBodyOmitted = true
		return
	}
	resp.RawBody = base64.StdEncoding.EncodeToString(body)
	resp.RawBodyOmitted = false
}

// classifyRequestError 把传输层错误映射为带错误码的应用错误，
// 以便前端区分「超时」「用户取消」「网络失败」并给出不同提示。
func (s *HTTPService) classifyRequestError(err error, tracked *inflight, timedOut *atomic.Bool) error {
	switch {
	case timedOut != nil && timedOut.Load():
		return apperr.Wrap(err, apperr.CodeRequestTimeout)
	case tracked != nil && tracked.canceled.Load():
		return apperr.Wrap(err, apperr.CodeRequestCanceled)
	default:
		return apperr.Wrap(err, apperr.CodeSendRequest)
	}
}

// registerRequest 登记一个进行中的请求，返回其记录（requestID 为空时返回 nil）。
func (s *HTTPService) registerRequest(requestID string, cancel context.CancelFunc) *inflight {
	if requestID == "" {
		return nil
	}
	rec := &inflight{cancel: cancel}
	s.mu.Lock()
	s.requests[requestID] = rec
	s.mu.Unlock()
	return rec
}

// unregisterRequest 移除进行中请求的登记。
func (s *HTTPService) unregisterRequest(requestID string) {
	if requestID == "" {
		return
	}
	s.mu.Lock()
	delete(s.requests, requestID)
	s.mu.Unlock()
}

// CancelRequest 取消一个进行中的请求（前端「取消」按钮调用）。
// 返回是否找到了对应的请求。
func (s *HTTPService) CancelRequest(requestID string) bool {
	s.mu.Lock()
	rec := s.requests[requestID]
	delete(s.requests, requestID)
	s.mu.Unlock()
	if rec == nil {
		return false
	}
	rec.canceled.Store(true)
	rec.cancel()
	return true
}

// IsRequestInFlight 返回指定请求是否仍在进行中。
func (s *HTTPService) IsRequestInFlight(requestID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.requests[requestID]
	return ok
}

// registerStream 登记一个活跃的流式连接。
func (s *HTTPService) registerStream(connID string, cancel context.CancelFunc) {
	s.mu.Lock()
	s.streams[connID] = cancel
	s.mu.Unlock()
}

// unregisterStream 移除一个流式连接登记。
func (s *HTTPService) unregisterStream(connID string) {
	s.mu.Lock()
	delete(s.streams, connID)
	s.mu.Unlock()
}

// StopStream 主动停止指定的流式响应连接（前端「停止」按钮调用）。
func (s *HTTPService) StopStream(connID string) error {
	s.mu.Lock()
	cancel := s.streams[connID]
	delete(s.streams, connID)
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	return nil
}

// IsStreaming 返回指定连接是否仍在流式传输。
func (s *HTTPService) IsStreaming(connID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.streams[connID]
	return ok
}

// streamResponse 持续读取 text/event-stream 响应体，按 SSE 帧解析后经 http:stream 事件推送。
// 读到 EOF 或被取消（StopStream）后清理连接。cancel 用于结束时释放请求上下文。
func (s *HTTPService) streamResponse(resp *http.Response, connID string, cancel context.CancelFunc) {
	defer resp.Body.Close()
	defer cancel()
	defer s.unregisterStream(connID)

	emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "open", Data: fmt.Sprintf("%d", resp.StatusCode), Timestamp: nowMillis()})

	reader := bufio.NewReader(resp.Body)
	var dataLines []string
	flush := func() {
		if len(dataLines) == 0 {
			return
		}
		emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "message", Data: strings.Join(dataLines, "\n"), Timestamp: nowMillis()})
		dataLines = dataLines[:0]
	}
	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			trimmed := strings.TrimRight(line, "\r\n")
			switch {
			case trimmed == "":
				flush() // 空行表示一个事件结束
			case strings.HasPrefix(trimmed, ":"):
				// 注释行，忽略
			case strings.HasPrefix(trimmed, "data:"):
				dataLines = append(dataLines, strings.TrimSpace(strings.TrimPrefix(trimmed, "data:")))
			default:
				// 其它字段（event:/id:/retry:）原样透传
				dataLines = append(dataLines, trimmed)
			}
		}
		if err != nil {
			flush()
			emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "close", Data: err.Error(), Timestamp: nowMillis()})
			return
		}
	}
}

// setRequestBody 设置请求体
func (s *HTTPService) setRequestBody(req *http.Request, data SendRequestData, vars map[string]string, limits models.RequestSettings) error {
	switch data.BodyType {
	case string(models.BodyTypeNone):
		// 无请求体
		return nil

	case string(models.BodyTypeJSON), string(models.BodyTypeText), string(models.BodyTypeXML):
		// JSON / 纯文本 / XML
		resolvedContent := resolveVars(data.BodyContent, vars)
		// JSONC 兼容只对 JSON 生效，且必须在变量解析之后：先把 {{var}} 换成实际值，
		// 拿到的才是一段能判断合不合法的 JSON
		if data.BodyType == string(models.BodyTypeJSON) {
			resolvedContent = normalizeJSONCIf(limits.AllowJSONComments, resolvedContent)
		}
		req.Body = io.NopCloser(strings.NewReader(resolvedContent))
		req.GetBody = func() (io.ReadCloser, error) {
			return io.NopCloser(strings.NewReader(resolvedContent)), nil
		}
		req.ContentLength = int64(len(resolvedContent))
		if data.ContentType != "" {
			req.Header.Set("Content-Type", data.ContentType)
		} else if data.BodyType == string(models.BodyTypeJSON) {
			req.Header.Set("Content-Type", "application/json")
		} else if data.BodyType == string(models.BodyTypeXML) {
			req.Header.Set("Content-Type", "application/xml")
		} else {
			req.Header.Set("Content-Type", "text/plain")
		}

	case string(models.BodyTypeGraphQL):
		// GraphQL over HTTP：把「查询 + 变量」组装成标准的 JSON 请求体。
		// 变量在界面上是一段 JSON 文本，这里解析后作为对象嵌入；
		// 解析失败时按「无变量」发送，避免整条请求因为一处笔误发不出去。
		payload, err := buildGraphQLBody(resolveVars(data.BodyContent, vars), limits.AllowJSONComments)
		if err != nil {
			return apperr.Wrap(err, apperr.CodeBuildBody, apperr.P("field", "graphql"))
		}
		req.Body = io.NopCloser(bytes.NewReader(payload))
		req.GetBody = func() (io.ReadCloser, error) {
			return io.NopCloser(bytes.NewReader(payload)), nil
		}
		req.ContentLength = int64(len(payload))
		req.Header.Set("Content-Type", defaultStr(data.ContentType, "application/json"))

	case string(models.BodyTypeBinary):
		// 原始二进制：BodyContent 约定为 {"fileName":..,"path":..}，文件流式发出，不进内存
		var segment bodySegment
		if file, ok := parseFileField(data.BodyContent); ok {
			seg, err := file.segment()
			if err != nil {
				return err
			}
			segment = seg
		} else {
			// 兼容：直接把 BodyContent 当作原始文本发送
			segment = byteSegment([]byte(data.BodyContent))
		}
		newBodyStream(segment).apply(req)
		if data.ContentType != "" {
			req.Header.Set("Content-Type", data.ContentType)
		} else {
			req.Header.Set("Content-Type", "application/octet-stream")
		}

	case string(models.BodyTypeFormData):
		// multipart/form-data：分隔符与各段的头仍交给标准库的 multipart.Writer 生成
		// （边界、文件名转义这些细节不值得自己重写一遍），但它只能往 Writer 里写，
		// 附件内容一旦交给它就整个进了内存。
		//
		// 所以这里只让 writer 写「框架」：文本字段照常写进缓冲区；遇到文件字段，
		// 在 CreateFormFile 写完该段的头之后把缓冲区切一刀作为一段，紧跟着插入文件段，
		// 内容并不流经 writer。writer 不关心每段内容有多长，从中间切开不会破坏分隔符。
		var head bytes.Buffer
		writer := multipart.NewWriter(&head)
		var segments []bodySegment
		// flushHead 把目前攒下的框架字节切成独立的一段
		flushHead := func() {
			if head.Len() == 0 {
				return
			}
			segments = append(segments, byteSegment(bytes.Clone(head.Bytes())))
			head.Reset()
		}

		for _, field := range data.BodyFields {
			if !field.Enabled {
				continue
			}
			if field.FieldType == "file" {
				// 文件字段：value 约定为 {"fileName":..,"path":..}，发送时才读盘
				fileName := field.Value
				segment := byteSegment(nil)
				if file, ok := parseFileField(field.Value); ok {
					fileName = file.displayName()
					seg, err := file.segment()
					if err != nil {
						return err
					}
					segment = seg
				}
				if _, err := writer.CreateFormFile(field.Name, fileName); err != nil {
					return apperr.Wrap(err, apperr.CodeBuildBody, apperr.P("field", field.Name))
				}
				flushHead()
				segments = append(segments, segment)
			} else {
				if err := writer.WriteField(field.Name, resolveVars(field.Value, vars)); err != nil {
					return apperr.Wrap(err, apperr.CodeBuildBody, apperr.P("field", field.Name))
				}
			}
		}
		if err := writer.Close(); err != nil {
			return apperr.Wrap(err, apperr.CodeBuildBody)
		}
		flushHead()

		newBodyStream(segments...).apply(req)
		req.Header.Set("Content-Type", writer.FormDataContentType())

	case string(models.BodyTypeURLEncoded):
		// application/x-www-form-urlencoded
		values := url.Values{}
		for _, field := range data.BodyFields {
			if !field.Enabled {
				continue
			}
			values.Set(field.Name, resolveVars(field.Value, vars))
		}
		body := values.Encode()
		req.Body = io.NopCloser(strings.NewReader(body))
		req.GetBody = func() (io.ReadCloser, error) {
			return io.NopCloser(strings.NewReader(body)), nil
		}
		req.ContentLength = int64(len(body))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}

	return nil
}

// applyAuth 把认证信息写入请求。
// oauth2 需要先向 token 端点换取令牌，因此要拿到已建好的客户端（含代理与 TLS 设置）。
func (s *HTTPService) applyAuth(ctx context.Context, client *http.Client, req *http.Request,
	auth *models.EndpointAuth, vars map[string]string, urlEncoding models.URLEncodingMode,
) error {
	if auth.Type == string(models.AuthTypeOAuth2) {
		var data models.OAuth2AuthData
		if err := models.FromJSON(auth.Data, &data); err != nil {
			return apperr.Wrap(err, apperr.CodeAuthConfigInvalid, apperr.P("type", "oauth2"))
		}
		value, err := fetchOAuth2Token(ctx, client, data, vars)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", value)
		return nil
	}
	return s.setAuthHeader(req, auth, vars, urlEncoding)
}

// retryWithDigest 依据 401 响应里的 Digest 挑战重发请求。
// 返回 nil 表示挑战无法处理（如不是 Digest 方案），调用方应保留原响应。
func (s *HTTPService) retryWithDigest(
	ctx context.Context, client *http.Client, req *http.Request, resp *http.Response,
	auth *models.EndpointAuth, vars map[string]string, body string,
) (*http.Response, error) {
	challenge, ok := parseDigestChallenge(resp.Header.Get("WWW-Authenticate"))
	if !ok {
		return nil, nil
	}

	var data models.DigestAuthData
	if err := models.FromJSON(auth.Data, &data); err != nil {
		return nil, apperr.Wrap(err, apperr.CodeAuthConfigInvalid, apperr.P("type", "digest"))
	}

	uri := req.URL.RequestURI()
	value, err := buildDigestAuthorization(challenge,
		resolveVars(data.Username, vars), resolveVars(data.Password, vars),
		req.Method, uri, body)
	if err != nil {
		return nil, err
	}

	retry := req.Clone(ctx)
	retry.Header.Set("Authorization", value)
	// Clone 不会复制请求体，需从 GetBody 重新取一份
	if req.GetBody != nil {
		reader, getErr := req.GetBody()
		if getErr != nil {
			return nil, apperr.Wrap(getErr, apperr.CodeBuildRequest)
		}
		retry.Body = reader
	}

	retried, err := client.Do(retry)
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeSendRequest)
	}
	return retried, nil
}

// setAuthHeader 设置认证请求头
func (s *HTTPService) setAuthHeader(req *http.Request, auth *models.EndpointAuth, vars map[string]string,
	urlEncoding models.URLEncodingMode,
) error {
	switch auth.Type {
	case string(models.AuthTypeBasic):
		var data models.BasicAuthData
		if err := models.FromJSON(auth.Data, &data); err != nil {
			return apperr.Wrap(err, apperr.CodeAuthConfigInvalid, apperr.P("type", "basic"))
		}
		req.SetBasicAuth(resolveVars(data.Username, vars), resolveVars(data.Password, vars))

	case string(models.AuthTypeBearer):
		var data models.BearerAuthData
		if err := models.FromJSON(auth.Data, &data); err != nil {
			return apperr.Wrap(err, apperr.CodeAuthConfigInvalid, apperr.P("type", "bearer"))
		}
		req.Header.Set("Authorization", "Bearer "+resolveVars(data.Token, vars))

	case string(models.AuthTypeAPIKey):
		var data models.APIKeyAuthData
		if err := models.FromJSON(auth.Data, &data); err != nil {
			return apperr.Wrap(err, apperr.CodeAuthConfigInvalid, apperr.P("type", "apikey"))
		}
		applyAPIKeyAuth(req, data, vars, urlEncoding)
	}
	return nil
}

// loadGlobalVars 加载模块所属项目的全局变量（启用的）。
func (s *HTTPService) loadGlobalVars(moduleID string) map[string]string {
	out := map[string]string{}
	if moduleID == "" {
		return out
	}
	var module models.Module
	if err := s.db.Select("project_id").Where("id = ?", moduleID).First(&module).Error; err != nil {
		return out
	}
	var vars []models.GlobalVariable
	s.db.Where("project_id = ? AND enabled = ?", module.ProjectID, true).Find(&vars)
	for _, v := range vars {
		out[v.Key] = v.Value
	}
	return out
}

// loadModuleVars 加载模块级变量（启用的）。作用域介于全局变量与环境变量之间。
func (s *HTTPService) loadModuleVars(moduleID string) map[string]string {
	out := map[string]string{}
	if moduleID == "" {
		return out
	}
	var vars []models.ModuleVariable
	s.db.Where("module_id = ? AND enabled = ?", moduleID, true).Order("sort_order ASC").Find(&vars)
	for _, v := range vars {
		out[v.Key] = v.Value
	}
	return out
}

// persistModuleVarChanges 把脚本（pm.moduleVariables）对模块变量的增量写回数据库。
func (s *HTTPService) persistModuleVarChanges(moduleID string, store *scripting.VarStore) {
	if moduleID == "" || store == nil {
		return
	}
	upserts, removed := store.Changes()
	if len(upserts) == 0 && len(removed) == 0 {
		return
	}
	if err := NewScopeSettingsService(s.db).ApplyModuleVariableChanges(moduleID, upserts, removed); err != nil {
		slog.Error("持久化脚本模块变量失败", "error", err)
	}
}

// loadModuleParams 加载模块级自动参数：query/cookie 返回为 EndpointParam，header 返回为 EndpointHeader。
func (s *HTTPService) loadModuleParams(moduleID string) ([]models.EndpointParam, []models.EndpointHeader) {
	var params []models.EndpointParam
	var headers []models.EndpointHeader
	if moduleID == "" {
		return params, headers
	}
	var mps []models.ModuleParam
	s.db.Where("module_id = ? AND enabled = ?", moduleID, true).Order("sort_order ASC").Find(&mps)
	for _, mp := range mps {
		switch mp.Type {
		case "header":
			headers = append(headers, models.EndpointHeader{Name: mp.Name, Value: mp.Value, Enabled: true})
		default: // query, cookie
			params = append(params, models.EndpointParam{Type: mp.Type, Name: mp.Name, Value: mp.Value, Enabled: true})
		}
	}
	return params, headers
}

// applyPathParams 将 URL 中的 {name} 占位符替换为对应路径参数的值。
func applyPathParams(u string, params []models.EndpointParam, vars map[string]string) string {
	for _, p := range params {
		if p.Type == "path" && p.Enabled && p.Name != "" {
			u = strings.ReplaceAll(u, "{"+p.Name+"}", resolveVars(p.Value, vars))
		}
	}
	return u
}

// saveResponseAndHistory 保存响应和请求历史。
// 入库的响应体受 MaxStoredBodyBytes 约束：数据库里存的是「便于回看的快照」，
// 不需要、也不应该原样保留几十兆的响应。
func (s *HTTPService) saveResponseAndHistory(data SendRequestData, resp *HTTPResponseData) {
	limits := getRequestSettings(s.db)
	storedBody := truncateForStorage(resp.Body, limits.MaxStoredBodyBytes)
	storedReqBody := truncateForStorage(data.BodyContent, limits.MaxStoredBodyBytes)

	// 脱敏：历史里存的 Authorization / Cookie 往往是长期有效的凭据
	policy := getHistorySettings(s.db)
	storedRespHeaders := resp.Headers
	storedActualRequest := resp.ActualRequest
	if policy.MaskSensitive {
		secrets := collectSecretValues(s.db, data.EnvironmentID, data.ModuleID)
		storedBody = maskSecretValues(storedBody, secrets)
		storedReqBody = maskSecretValues(storedReqBody, secrets)
		storedRespHeaders = maskMultiHeaders(resp.Headers)
		storedActualRequest.Headers = maskHeaders(resp.ActualRequest.Headers)
		storedActualRequest.Body = maskSecretValues(
			truncateForStorage(resp.ActualRequest.Body, limits.MaxStoredBodyBytes), secrets)
	}

	// 保存响应
	if data.EndpointID != "" {
		response := &models.Response{
			EndpointID:    data.EndpointID,
			StatusCode:    resp.StatusCode,
			Headers:       models.ToJSON(storedRespHeaders),
			Body:          storedBody,
			ContentType:   resp.ContentType,
			Cookies:       models.ToJSON(resp.Cookies),
			Timing:        models.ToJSON(resp.Timing),
			Size:          resp.Size,
			ActualRequest: models.ToJSON(storedActualRequest),
		}
		endpointService := NewEndpointService(s.db)
		if err := endpointService.SaveResponse(data.EndpointID, response); err != nil {
			slog.Error("保存响应失败", "error", err)
		}
	}

	// 保存请求历史
	if data.ModuleID != "" {
		// 构建请求头
		reqHeaders := make(map[string]string)
		for _, h := range data.Headers {
			if h.Enabled {
				reqHeaders[h.Name] = h.Value
			}
		}
		if policy.MaskSensitive {
			reqHeaders = maskHeaders(reqHeaders)
		}

		history := &models.RequestHistory{
			ModuleID:        data.ModuleID,
			EndpointID:      nilOrNilString(data.EndpointID),
			Method:          data.Method,
			URL:             combineURL(data.BaseURL, data.Path),
			StatusCode:      resp.StatusCode,
			Timing:          models.ToJSON(resp.Timing),
			Size:            resp.Size,
			RequestHeaders:  models.ToJSON(reqHeaders),
			RequestBody:     storedReqBody,
			ResponseHeaders: models.ToJSON(storedRespHeaders),
			ResponseBody:    storedBody,
			ContentType:     resp.ContentType,
		}
		if err := s.db.Create(history).Error; err != nil {
			slog.Error("保存请求历史失败", "error", err)
			return
		}
		// 写入后立即按条数上限淘汰最旧记录，历史表才不会无限增长
		if err := NewRequestHistoryService(s.db).enforceRowLimit(data.ModuleID); err != nil {
			slog.Warn("裁剪请求历史失败", "moduleId", data.ModuleID, "error", err)
		}
	}
}

// truncateForStorage 按字节上限截断入库文本；limit<=0 表示不限制。
// 截断处附加标记，避免回看时把「被截断」误认为「服务端只返回了这些」。
func truncateForStorage(body string, limit int64) string {
	if limit <= 0 || int64(len(body)) <= limit {
		return body
	}
	// 回退到最近的 UTF-8 字符边界，避免把一个多字节字符劈成半个
	cut := int(limit)
	for cut > 0 && !utf8.RuneStart(body[cut]) {
		cut--
	}
	return body[:cut] + "\n…（响应体过大，已截断存储）"
}

// buildGraphQLBody 把存储形态的 GraphQL 请求体转成实际发送的 JSON。
// allowJSONComments 为真时，变量文本按 JSONC 处理（注释与尾随逗号会被去掉）。
func buildGraphQLBody(stored string, allowJSONComments bool) ([]byte, error) {
	var body models.GraphQLBody
	if strings.TrimSpace(stored) != "" {
		if err := models.FromJSON(stored, &body); err != nil {
			return nil, err
		}
	}

	payload := map[string]any{"query": body.Query}
	if body.OperationName != "" {
		payload["operationName"] = body.OperationName
	}
	if trimmed := strings.TrimSpace(body.Variables); trimmed != "" {
		trimmed = normalizeJSONCIf(allowJSONComments, trimmed)
		var variables any
		if err := json.Unmarshal([]byte(trimmed), &variables); err == nil {
			payload["variables"] = variables
		}
		// 变量不是合法 JSON 时按「无变量」发送：查询本身通常仍然有效，
		// 报错拦下整条请求反而让人摸不着头脑
	}
	return json.Marshal(payload)
}

// fileFieldValue 是文件字段与 Binary 请求体的 value 约定。
//
// 库里只存引用（path），发送时才去读盘——这也是 Yaak / Insomnia / Bruno 这些桌面
// 客户端的做法。此前存的是整个文件的 base64，一个 10 MB 附件在库里约 13 MB，
// 备份、导出、同步全被放大，而且跟着接口永久存在。
//
// 代价是不再自包含：文件被移走或换台机器，路径就失效了，发送时会明确报错。
type fileFieldValue struct {
	FileName string `json:"fileName"`
	// Path 本机上的文件路径，新数据一律用它
	Path string `json:"path,omitempty"`
	// Content 历史数据里内联的 base64。仍然认，但不再产生新的
	Content string `json:"content,omitempty"`
}

// parseFileField 解析文件字段的 value。
func parseFileField(value string) (fileFieldValue, bool) {
	var payload fileFieldValue
	if err := json.Unmarshal([]byte(value), &payload); err != nil {
		return fileFieldValue{}, false
	}
	if payload.Path == "" && payload.Content == "" && payload.FileName == "" {
		return fileFieldValue{}, false
	}
	return payload, true
}

// displayName 返回上传时用的文件名：优先用记下来的名字，否则退回路径的最后一段。
func (f fileFieldValue) displayName() string {
	if f.FileName != "" {
		return f.FileName
	}
	if f.Path != "" {
		return filepath.Base(f.Path)
	}
	return "file"
}

// segment 把文件字段变成请求体的一段。
//
// 有路径就只记下路径与大小，内容留在磁盘上等发送时边读边发；只有历史数据里内联的
// base64 才会落回内存——那本来就已经在内存里了。
func (f fileFieldValue) segment() (bodySegment, error) {
	if f.Path != "" {
		stat, err := os.Stat(f.Path)
		if err != nil {
			// 文件被移走 / 删掉 / 换了台机器——这是存路径必然要面对的失败，
			// 给一个能看懂的错误，而不是发出去一个空文件
			return bodySegment{}, apperr.Wrap(err, apperr.CodeRequestFileMissing, apperr.P("name", f.displayName()))
		}
		if stat.IsDir() {
			return bodySegment{}, apperr.New(apperr.CodeRequestFileMissing, apperr.P("name", f.displayName()))
		}
		return fileSegment(f.Path, stat.Size()), nil
	}
	if f.Content != "" {
		decoded, err := base64.StdEncoding.DecodeString(f.Content)
		if err != nil {
			return bodySegment{}, apperr.Wrap(err, apperr.CodeBuildBody, apperr.P("name", f.displayName()))
		}
		return byteSegment(decoded), nil
	}
	return bodySegment{}, apperr.New(apperr.CodeRequestFileMissing, apperr.P("name", f.displayName()))
}

// parseNameSet 将 JSON 字符串数组解析为名称集合（用于禁用全局参数名匹配）。
// 非法或空字符串返回空 map。
func parseNameSet(jsonArr string) map[string]bool {
	if strings.TrimSpace(jsonArr) == "" {
		return nil
	}
	var names []string
	if err := json.Unmarshal([]byte(jsonArr), &names); err != nil {
		return nil
	}
	set := make(map[string]bool, len(names))
	for _, n := range names {
		set[n] = true
	}
	return set
}

// resolveVars 替换字符串中的 {{key}} 占位符；多趟替换以支持一层嵌套。
func resolveVars(input string, vars map[string]string) string {
	result := input
	for i := 0; i < 5 && strings.Contains(result, "{{"); i++ {
		prev := result
		for k, v := range vars {
			result = strings.ReplaceAll(result, "{{"+k+"}}", v)
		}
		if result == prev {
			break
		}
	}
	return result
}

// enabledHeaders 将启用的端点请求头转换为脚本 Header 列表。
func enabledHeaders(headers []models.EndpointHeader) []scripting.Header {
	out := make([]scripting.Header, 0, len(headers))
	for _, h := range headers {
		if h.Enabled {
			out = append(out, scripting.Header{Key: h.Name, Value: h.Value})
		}
	}
	return out
}

// headersToModel 将脚本 Header 列表转换回端点请求头（均标记为启用）。
func headersToModel(headers []scripting.Header) []models.EndpointHeader {
	out := make([]models.EndpointHeader, 0, len(headers))
	for _, h := range headers {
		out = append(out, models.EndpointHeader{Name: h.Key, Value: h.Value, Enabled: true})
	}
	return out
}

// flattenToHeaders 将 http.Header 转换为脚本 Header 列表（多值以逗号连接）。
func flattenToHeaders(h http.Header) []scripting.Header {
	out := make([]scripting.Header, 0, len(h))
	for k, v := range h {
		out = append(out, scripting.Header{Key: k, Value: strings.Join(v, ", ")})
	}
	return out
}

// headersToHTTPHeader 将脚本 Header 列表转换回 http.Header。
func headersToHTTPHeader(headers []scripting.Header) http.Header {
	out := http.Header{}
	for _, h := range headers {
		out.Set(h.Key, h.Value)
	}
	return out
}

// combineURL 组合基础 URL 和路径
func combineURL(baseURL, path string) string {
	// 接口路径本身带协议头（http://、https://、ws://、wss:// 等）时视为绝对地址，
	// 不再附加模块/环境的前置 URL。
	if baseURL == "" || hasURLScheme(path) {
		return path
	}
	baseURL = strings.TrimRight(baseURL, "/")
	path = strings.TrimLeft(path, "/")
	return baseURL + "/" + path
}

// hasURLScheme 判断字符串是否以协议头开头（如 http://、wss://、ftp://）。
func hasURLScheme(s string) bool {
	s = strings.TrimSpace(s)
	i := strings.Index(s, "://")
	if i <= 0 {
		return false
	}
	// 协议名只能包含字母、数字、+、-、.，且首字符须为字母
	for idx, r := range s[:i] {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z':
		case (r >= '0' && r <= '9' || r == '+' || r == '-' || r == '.') && idx > 0:
		default:
			return false
		}
	}
	return true
}

// flattenHeaders 将 http.Header 转换为 map[string]string
func flattenHeaders(h http.Header) map[string]string {
	result := make(map[string]string)
	for k, v := range h {
		result[k] = strings.Join(v, ", ")
	}
	return result
}

// SameSite 字符串表示
func sameSiteString(s http.SameSite) string {
	switch s {
	case http.SameSiteLaxMode:
		return "Lax"
	case http.SameSiteStrictMode:
		return "Strict"
	case http.SameSiteDefaultMode:
		return "Default"
	default:
		return "None"
	}
}

// parseCookies 解析 Cookie 列表
func parseCookies(cookies []*http.Cookie) []models.CookieInfo {
	result := make([]models.CookieInfo, 0, len(cookies))
	for _, c := range cookies {
		result = append(result, models.CookieInfo{
			Name:     c.Name,
			Value:    c.Value,
			Domain:   c.Domain,
			Path:     c.Path,
			Expires:  c.Expires.Format(time.RFC1123),
			HTTPOnly: c.HttpOnly,
			Secure:   c.Secure,
			SameSite: sameSiteString(c.SameSite),
		})
	}
	return result
}

// nilOrNilString 将空字符串转为 nil
func nilOrNilString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// durMs 将时间间隔转换为毫秒（float64，保留亚毫秒精度）。
func durMs(d time.Duration) float64 {
	return float64(d.Microseconds()) / 1000.0
}

// httptraceCollector 收集 HTTP 请求各阶段时间点
type httptraceCollector struct {
	dnsStart, dnsEnd         *time.Time
	tlsStart, tlsEnd         *time.Time
	connectStart, connectEnd *time.Time
	gotConn                  *time.Time
	wroteRequest             *time.Time
	gotFirstByte             *time.Time
	reused                   *bool
}

func (t *httptraceCollector) attach(ctx context.Context) context.Context {
	// 安装 httptrace 钩子，记录各阶段时间点，用于计算 准备/DNS/TCP/TLS/等待/下载 分解
	trace := &httptrace.ClientTrace{
		DNSStart: func(httptrace.DNSStartInfo) { *t.dnsStart = time.Now() },
		DNSDone:  func(httptrace.DNSDoneInfo) { *t.dnsEnd = time.Now() },
		ConnectStart: func(_, _ string) {
			// 可能多次回调（IPv4/IPv6），仅记录第一次
			if t.connectStart.IsZero() {
				*t.connectStart = time.Now()
			}
		},
		ConnectDone:       func(_, _ string, _ error) { *t.connectEnd = time.Now() },
		TLSHandshakeStart: func() { *t.tlsStart = time.Now() },
		TLSHandshakeDone:  func(tls.ConnectionState, error) { *t.tlsEnd = time.Now() },
		GotConn: func(info httptrace.GotConnInfo) {
			*t.gotConn = time.Now()
			*t.reused = info.Reused
		},
		WroteRequest:         func(httptrace.WroteRequestInfo) { *t.wroteRequest = time.Now() },
		GotFirstResponseByte: func() { *t.gotFirstByte = time.Now() },
	}
	return httptrace.WithClientTrace(ctx, trace)
}

// DumpRequest 导出请求信息（用于调试）
func DumpRequest(req *http.Request) (string, error) {
	dump, err := httputil.DumpRequestOut(req, true)
	if err != nil {
		return "", err
	}
	return string(dump), nil
}

// fileFieldJSON 把一个本地文件路径打包成文件字段的 value。
func fileFieldJSON(path string) string {
	payload := fileFieldValue{FileName: filepath.Base(path), Path: path}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return path
	}
	return string(encoded)
}
