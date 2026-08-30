package services

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptrace"
	"net/http/httputil"
	"net/textproto"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
	"PostPigeon/internal/scripting"
	"PostPigeon/internal/transportcapture"

	"github.com/glebarez/sqlite"
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
	DisabledGlobalParams string                     `json:"disabledGlobalParams"`
	Operations           []models.Operation         `json:"operations"`
	OperationOverrides   []models.OperationOverride `json:"operationOverrides"`
	InheritOperations    *bool                      `json:"inheritOperations"`
	// RequestID 由前端生成的本次请求标识，用于中途取消（CancelRequest）。空则不可取消。
	RequestID string `json:"requestId"`
	// PreRequestScript 前置脚本，请求发送前执行
	PreRequestScript string `json:"preRequestScript"`
	// PreSendScript 在变量替换完成后、构建 HTTP 请求前执行。
	PreSendScript string `json:"preSendScript"`
	// PostResponseScript 后置脚本，响应返回后执行
	PostResponseScript string `json:"postResponseScript"`
}

// ScriptResults 前置/后置脚本的执行结果，随响应返回给前端展示
type ScriptResults struct {
	PreRequest       *scripting.Result          `json:"preRequest,omitempty"`
	PostResponse     *scripting.Result          `json:"postResponse,omitempty"`
	OperationResults []OperationExecutionResult `json:"operationResults,omitempty"`
}

// OperationExecutionResult 是一条组合操作自己的执行结果，供编辑器就地展示。
type OperationExecutionResult struct {
	OperationID string                 `json:"operationId"`
	Passed      bool                   `json:"passed"`
	Duration    int64                  `json:"duration"`
	Error       string                 `json:"error,omitempty"`
	Logs        []scripting.LogEntry   `json:"logs"`
	Tests       []scripting.TestResult `json:"tests"`
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
	// RequestRun 是本次点击发送产生的完整网络执行链。ActualRequest 仅为旧客户端兼容视图。
	RequestRun *models.RequestRun `json:"requestRun,omitempty"`
	// Error 表示已经进入传输层后的失败。此时仍返回响应包络，避免丢失可诊断的 attempt。
	Error string `json:"error,omitempty"`
	// Scripts 前置/后置脚本执行结果（无脚本时为 nil）
	Scripts *ScriptResults `json:"scripts,omitempty"`
	// Skipped 为 true 表示请求被前置脚本 pm.execution.skipRequest() 跳过，未真正发出
	Skipped bool `json:"skipped"`
	// Streaming 为 true 表示响应是持续记录流，正通过 http:stream 事件持续推送；首个响应中
	// Body 为空，前端由这些记录实时重组普通响应体视图。
	Streaming bool `json:"streaming"`
	// StreamID 流的连接标识，前端据此订阅并展示实时事件、可发起停止
	StreamID string `json:"streamId"`
	// StreamFormat 为 sse / ndjson / json-seq，前端据此说明记录如何被解码。
	StreamFormat string `json:"streamFormat"`
}

// streamFormat 判断可按记录实时展示的 HTTP 流格式。普通 chunked 响应仍走缓冲路径，
// 避免把下载误判为流；“Raw”是这些格式的记录原文视图，而非传输层 read chunk。
func streamFormat(contentType string) string {
	contentType = strings.ToLower(contentType)
	switch {
	case strings.Contains(contentType, "text/event-stream"):
		return "sse"
	case strings.Contains(contentType, "application/x-ndjson"), strings.Contains(contentType, "application/ndjson"):
		return "ndjson"
	case strings.Contains(contentType, "application/json-seq"):
		return "json-seq"
	default:
		return ""
	}
}

// ListScriptLibraries 返回脚本运行时的内置库清单（名称/版本/用法等），供前端展示。
func (s *HTTPService) ListScriptLibraries() ([]scripting.LibraryInfo, error) {
	return scripting.Libraries()
}

// SendRequest 发送 HTTP 请求
func (s *HTTPService) SendRequest(data SendRequestData) (*HTTPResponseData, error) {
	lifecycle := newRequestLifecycleTiming()
	configuredSnapshot := configuredRequestSnapshot(data)
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
			Phase:        scripting.PhasePreRequest,
			Request:      reqCtx,
			Stores:       stores,
			DatabaseExec: s.executeDatabaseOperation,
		})
		scriptResults.OperationResults = append(scriptResults.OperationResults, extractOperationResults(scriptResults.PreRequest)...)
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
			out := skippedRequestResponse(data, reqCtx, scriptResults, &configuredSnapshot)
			s.enqueuePersist(persistJob{data: data, resp: out})
			return out, nil
		}
	}

	// 用（可能被脚本更新过的）变量存储解析占位符
	vars := stores.Environment.ToMap()

	// 变量替换是前置操作列表中的显式分界线。先把此刻的请求快照替换完成，
	// 再执行分界线后的操作；后续构建请求时 resolveVars 再跑一次是幂等的。
	reqCtx.URL = resolveVars(reqCtx.URL, vars)
	reqCtx.Body = resolveVars(reqCtx.Body, vars)
	for i := range reqCtx.Headers {
		reqCtx.Headers[i].Value = resolveVars(reqCtx.Headers[i].Value, vars)
	}
	for i := range data.Params {
		data.Params[i].Value = resolveVars(data.Params[i].Value, vars)
	}
	for i := range data.BodyFields {
		if bodyFieldDataType(data.BodyFields[i]) != "file" {
			data.BodyFields[i].Value = resolveVars(data.BodyFields[i].Value, vars)
		}
	}
	data.BodyContent = reqCtx.Body
	data.Headers = headersToModel(reqCtx.Headers)

	if strings.TrimSpace(data.PreSendScript) != "" {
		result := s.engine.Run(data.PreSendScript, scripting.Options{
			Phase: scripting.PhasePreRequest, Request: reqCtx, Stores: stores, DatabaseExec: s.executeDatabaseOperation,
		})
		scriptResults.OperationResults = append(scriptResults.OperationResults, extractOperationResults(result)...)
		scriptResults.PreRequest = mergeScriptResult(scriptResults.PreRequest, result)
		data.Method = reqCtx.Method
		data.BodyContent = reqCtx.Body
		data.Headers = headersToModel(reqCtx.Headers)
		if result.SkipRequest {
			if data.EnvironmentID != "" {
				up, rm := stores.Environment.Changes()
				_ = envService.ApplyVariableChanges(data.EnvironmentID, up, rm)
			}
			s.persistModuleVarChanges(data.ModuleID, stores.Collection)
			out := skippedRequestResponse(data, reqCtx, scriptResults, &configuredSnapshot)
			s.enqueuePersist(persistJob{data: data, resp: out})
			return out, nil
		}
	}

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
	// Cookie Jar 按「环境覆盖 → 模块默认」解析：同一会话内的登录态自动带到后续请求，
	// 模块之间只有显式绑定同一个 Jar 才会共享。
	client := &http.Client{Jar: s.cookies.jarForRequest(data.ModuleID, data.EnvironmentID)}

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

	preparedSnapshot := transportcapture.SnapshotRequest(req, transportcapture.DefaultBodyPreviewBytes)
	preparedSnapshot.CaptureLevel = "prepared"
	recorder := transportcapture.NewRecorder("", data.ModuleID, nilOrNilString(data.EndpointID), &preparedSnapshot)
	recorder.SetConfiguredRequest(&configuredSnapshot)
	recorder.SetBodyPreviewBytes(requestCaptureLimit(limits.MaxStoredBodyBytes))
	client.Transport = recorder.Transport(transport)

	// 处理重定向：每次后续网络请求都显式标记 cause 与父 attempt。
	if resolveFollowRedirects(requestPath, data.FollowRedirects, limits.FollowRedirects) {
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
	start = lifecycle.startNetwork()
	initialCtx := transportcapture.WithAttempt(ctx, models.RequestAttemptCauseInitial, nil)
	resp, err := client.Do(req.WithContext(trace.attach(initialCtx)))
	if err != nil {
		classified := s.classifyRequestError(err, tracked, &timedOut)
		outcome := models.RequestRunOutcomeFailed
		if timedOut.Load() {
			outcome = models.RequestRunOutcomeTimedOut
		} else if errors.Is(err, context.Canceled) {
			outcome = models.RequestRunOutcomeCancelled
		}
		recorder.SetOutcome(outcome, requestAttemptError("send", classified))
		run := s.capturedRequestRun(recorder, data)
		out := &HTTPResponseData{
			Headers: map[string][]string{}, ActualRequest: actualRequestFromRun(&run),
			RequestRun: &run, Error: classified.Error(),
		}
		s.enqueuePersist(persistJob{data: data, resp: out})
		return out, nil
	}

	// Digest 认证：第一次请求必然拿到 401 挑战，据此算出响应值后重发一次。
	// 这是协议本身要求的往返，不是重试。
	if needsDigest && resp.StatusCode == http.StatusUnauthorized {
		retried, retryErr := s.retryWithDigest(ctx, client, req, resp, effectiveAuth, vars, requestBodyPreview(preparedSnapshot.Body), recorder.LastAttemptID())
		if retryErr != nil {
			resp.Body.Close()
			recorder.SetOutcome(models.RequestRunOutcomeFailed, requestAttemptError("digest", retryErr))
			run := s.capturedRequestRun(recorder, data)
			out := &HTTPResponseData{
				StatusCode: resp.StatusCode, Headers: resp.Header,
				ActualRequest: actualRequestFromRun(&run), RequestRun: &run, Error: retryErr.Error(),
			}
			s.enqueuePersist(persistJob{data: data, resp: out})
			return out, nil
		}
		if retried != nil {
			resp.Body.Close()
			resp = retried
			start = time.Now()
		}
	}

	// SSE、NDJSON 和 JSON Text Sequence 都以逐记录方式呈现；其余响应仍正常缓冲，
	// 避免把二进制下载当成“raw chunk”读进事件面板。
	format := streamFormat(resp.Header.Get("Content-Type"))
	if format != "" {
		responseFinishedAt := time.Now()
		lifecycle.finishResponse(responseFinishedAt)
		recorder.SetOutcome(models.RequestRunOutcomeStreaming, nil)
		run := s.capturedRequestRun(recorder, data)
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
		streamLimits := sseReadLimitsFromSettings(limits)
		reconnect := sseReconnectOptions{Enabled: limits.AutoReconnectSSE, MaxAttempts: limits.MaxSSEReconnects}
		safego.Go("http.streamResponse", func() {
			s.streamResponse(resp, streamID, ctx, cancel, streamLimits, format, client, req, reconnect, recorder, data)
		})

		out := &HTTPResponseData{
			StatusCode:  resp.StatusCode,
			Headers:     resp.Header,
			ContentType: resp.Header.Get("Content-Type"),
			Timing: lifecycle.complete(models.TimingInfo{
				Total: durMs(responseFinishedAt.Sub(start)), Reused: reused,
			}, time.Now()),
			ActualRequest: actualRequestFromRun(&run),
			RequestRun:    &run,
			Streaming:     true,
			StreamID:      streamID,
			StreamFormat:  format,
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
		classified := s.classifyRequestError(err, tracked, &timedOut)
		outcome := models.RequestRunOutcomeFailed
		if timedOut.Load() {
			outcome = models.RequestRunOutcomeTimedOut
		} else if errors.Is(err, context.Canceled) {
			outcome = models.RequestRunOutcomeCancelled
		}
		recorder.SetOutcome(outcome, requestAttemptError("read_response", classified))
		run := s.capturedRequestRun(recorder, data)
		out := &HTTPResponseData{
			StatusCode: resp.StatusCode, Headers: resp.Header, ContentType: resp.Header.Get("Content-Type"),
			ActualRequest: actualRequestFromRun(&run), RequestRun: &run, Error: classified.Error(),
		}
		s.enqueuePersist(persistJob{data: data, resp: out})
		return out, nil
	}
	end := time.Now()
	lifecycle.finishResponse(end)

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
	recorder.SetOutcome(models.RequestRunOutcomeCompleted, nil)
	run := s.capturedRequestRun(recorder, data)
	responseData := &HTTPResponseData{
		StatusCode:    resp.StatusCode,
		Headers:       resp.Header,
		Body:          string(bodyBytes),
		ContentType:   resp.Header.Get("Content-Type"),
		Cookies:       cookies,
		Timing:        timing,
		Size:          int64(len(bodyBytes)),
		ActualRequest: actualRequestFromRun(&run),
		RequestRun:    &run,
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
			Phase:        scripting.PhasePostResponse,
			Request:      reqCtx,
			Response:     respCtx,
			Stores:       stores,
			DatabaseExec: s.executeDatabaseOperation,
		})
		scriptResults.OperationResults = append(scriptResults.OperationResults, extractOperationResults(scriptResults.PostResponse)...)
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
	responseData.Timing = lifecycle.complete(responseData.Timing, time.Now())

	// 异步保存响应和请求历史（有界队列，队列满时丢弃而非堆积 goroutine）
	s.enqueuePersist(persistJob{data: data, resp: responseData})

	return responseData, nil
}

func mergeScriptResult(first, second *scripting.Result) *scripting.Result {
	if first == nil {
		return second
	}
	if second == nil {
		return first
	}
	first.Executed = first.Executed || second.Executed
	first.Logs = append(first.Logs, second.Logs...)
	first.Tests = append(first.Tests, second.Tests...)
	if second.Error != "" {
		if first.Error != "" {
			first.Error += "\n"
		}
		first.Error += second.Error
	}
	first.Duration += second.Duration
	first.SkipRequest = first.SkipRequest || second.SkipRequest
	if second.NextRequest != nil {
		first.NextRequest = second.NextRequest
	}
	return first
}

func (s *HTTPService) executeDatabaseOperation(driver, dsn, query string) (any, error) {
	if driver == "" {
		driver = "sqlite"
	}
	if driver != "sqlite" {
		return nil, fmt.Errorf("unsupported database driver %q (currently only sqlite is available)", driver)
	}
	connection, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}
	sqlDB, err := connection.DB()
	if err == nil {
		defer sqlDB.Close()
	}
	trimmed := strings.ToUpper(strings.TrimSpace(query))
	if strings.HasPrefix(trimmed, "SELECT") || strings.HasPrefix(trimmed, "PRAGMA") || strings.HasPrefix(trimmed, "WITH") {
		var rows []map[string]any
		if err := connection.Raw(query).Scan(&rows).Error; err != nil {
			return nil, fmt.Errorf("execute database query: %w", err)
		}
		return rows, nil
	}
	result := connection.Exec(query)
	if result.Error != nil {
		return nil, fmt.Errorf("execute database statement: %w", result.Error)
	}
	return map[string]any{"rowsAffected": result.RowsAffected}, nil
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

// sseEvent 是一条已按 SSE 规范拆分的事件。保留空 id/retry 的“已设置”状态，便于后续重连。
type sseEvent struct {
	Data       string
	Event      string
	EventID    string
	HasEventID bool
	Retry      int
	HasRetry   bool
	Comment    string
	HasComment bool
	Raw        string
}

type sseReadLimits struct {
	MaxEventBytes int64
	MaxTotalBytes int64
	MaxEvents     int
}

// sseReconnectOptions 是 SSE 重连策略。其作用域是单次“发送请求”产生的流，
// 不影响 NDJSON / JSON Sequence 等一次性记录流。
type sseReconnectOptions struct {
	Enabled     bool
	MaxAttempts int
}

func sseReadLimitsFromSettings(settings models.RequestSettings) sseReadLimits {
	return sseReadLimits{
		MaxEventBytes: settings.MaxStreamEventBytes,
		MaxTotalBytes: settings.MaxStreamBytes,
		MaxEvents:     settings.MaxStreamEvents,
	}
}

// parseSSE 从 reader 读取 event-stream。它遵循 SSE 的 field/value 规则：仅移除冒号后的一个空格，
// 多个 data 行用换行连接；event/id/retry 与注释不会被混入正文。
func parseSSE(reader io.Reader, limits sseReadLimits, emit func(sseEvent)) error {
	scanner := bufio.NewScanner(reader)
	maxLineBytes := int(^uint(0) >> 1)
	if limits.MaxEventBytes > 0 && limits.MaxEventBytes < int64(maxLineBytes) {
		// 给换行与字段名留出余量；总事件大小仍在下面精确检查。
		maxLineBytes = int(limits.MaxEventBytes) + 1
	}
	scanner.Buffer(make([]byte, 64<<10), maxLineBytes)
	var dataLines []string
	var eventName, eventID string
	var hasEventID bool
	var retry int
	var hasRetry bool
	firstLine := true
	var eventBytes, totalBytes int64
	eventCount := 0
	var rawLines []string

	emitItem := func(item sseEvent) error {
		if limits.MaxEvents > 0 && eventCount >= limits.MaxEvents {
			return fmt.Errorf("SSE event limit reached (%d events)", limits.MaxEvents)
		}
		eventCount++
		emit(item)
		return nil
	}

	flush := func() error {
		if len(dataLines) == 0 {
			// id/retry 没有 data 时仍会更新浏览器的 SSE 重连状态，不能静默丢弃。
			if hasEventID || hasRetry {
				if err := emitItem(sseEvent{EventID: eventID, HasEventID: hasEventID, Retry: retry, HasRetry: hasRetry, Raw: strings.Join(rawLines, "\n")}); err != nil {
					return err
				}
			}
			eventName, eventID, hasEventID, retry, hasRetry = "", "", false, 0, false
			eventBytes = 0
			rawLines = nil
			return nil
		}
		if eventName == "" {
			eventName = "message"
		}
		err := emitItem(sseEvent{
			Data: strings.Join(dataLines, "\n"), Event: eventName,
			EventID: eventID, HasEventID: hasEventID, Retry: retry, HasRetry: hasRetry,
			Raw: strings.Join(rawLines, "\n"),
		})
		dataLines = nil
		rawLines = nil
		eventName, eventID, hasEventID, retry, hasRetry = "", "", false, 0, false
		eventBytes = 0
		return err
	}

	for scanner.Scan() {
		line := scanner.Text()
		totalBytes += int64(len(scanner.Bytes())) + 1
		if limits.MaxTotalBytes > 0 && totalBytes > limits.MaxTotalBytes {
			return fmt.Errorf("SSE stream byte limit reached (%d bytes)", limits.MaxTotalBytes)
		}
		eventBytes += int64(len(scanner.Bytes())) + 1
		if limits.MaxEventBytes > 0 && eventBytes > limits.MaxEventBytes {
			return fmt.Errorf("SSE event byte limit reached (%d bytes)", limits.MaxEventBytes)
		}
		if firstLine {
			line = strings.TrimPrefix(line, "\ufeff")
			firstLine = false
		}
		if line == "" {
			if err := flush(); err != nil {
				return err
			}
		} else if strings.HasPrefix(line, ":") {
			comment := strings.TrimPrefix(line, ":")
			if strings.HasPrefix(comment, " ") {
				comment = strings.TrimPrefix(comment, " ")
			}
			if err := emitItem(sseEvent{Comment: comment, HasComment: true, Raw: line}); err != nil {
				return err
			}
			eventBytes = 0
		} else {
			rawLines = append(rawLines, line)
			field, value, found := strings.Cut(line, ":")
			if !found {
				value = ""
			}
			if strings.HasPrefix(value, " ") {
				value = strings.TrimPrefix(value, " ")
			}
			switch field {
			case "data":
				dataLines = append(dataLines, value)
			case "event":
				eventName = value
			case "id":
				// 含 NUL 的 id 必须忽略，避免污染 Last-Event-ID。
				if !strings.ContainsRune(value, '\x00') {
					eventID, hasEventID = value, true
				}
			case "retry":
				if milliseconds, parseErr := strconv.Atoi(value); parseErr == nil && milliseconds >= 0 {
					retry, hasRetry = milliseconds, true
				}
			}
		}
	}
	if err := scanner.Err(); err != nil {
		if limits.MaxEventBytes > 0 {
			// Scanner 在超长单行时会先于字段解析报错；把它归类为用户可理解的事件上限。
			return fmt.Errorf("SSE event byte limit reached (%d bytes): %w", limits.MaxEventBytes, err)
		}
		return fmt.Errorf("read SSE stream: %w", err)
	}
	return flush()
}

// parseRecordStream 解析 NDJSON 或 RFC 7464 JSON Text Sequence 的逐行记录。数据保持原文，
// 由前端决定是否格式化 JSON；它和 SSE 共用同一套资源限额。
func parseRecordStream(reader io.Reader, limits sseReadLimits, jsonSequence bool, emit func(sseEvent)) error {
	scanner := bufio.NewScanner(reader)
	maxLineBytes := int(^uint(0) >> 1)
	if limits.MaxEventBytes > 0 && limits.MaxEventBytes < int64(maxLineBytes) {
		maxLineBytes = int(limits.MaxEventBytes) + 1
	}
	scanner.Buffer(make([]byte, 64<<10), maxLineBytes)
	var totalBytes int64
	count := 0
	for scanner.Scan() {
		raw := scanner.Text()
		totalBytes += int64(len(scanner.Bytes())) + 1
		if limits.MaxTotalBytes > 0 && totalBytes > limits.MaxTotalBytes {
			return fmt.Errorf("stream byte limit reached (%d bytes)", limits.MaxTotalBytes)
		}
		if limits.MaxEventBytes > 0 && int64(len(scanner.Bytes())) > limits.MaxEventBytes {
			return fmt.Errorf("stream record byte limit reached (%d bytes)", limits.MaxEventBytes)
		}
		data := raw
		if jsonSequence {
			data = strings.TrimPrefix(data, "\x1e")
		}
		if data == "" {
			continue
		}
		if limits.MaxEvents > 0 && count >= limits.MaxEvents {
			return fmt.Errorf("stream event limit reached (%d events)", limits.MaxEvents)
		}
		count++
		emit(sseEvent{Data: data, Event: "record", Raw: raw})
	}
	if err := scanner.Err(); err != nil {
		if limits.MaxEventBytes > 0 {
			return fmt.Errorf("stream record byte limit reached (%d bytes): %w", limits.MaxEventBytes, err)
		}
		return fmt.Errorf("read stream: %w", err)
	}
	return nil
}

// streamBodyTee 保留传输层的原始字节，同时交给记录解析器。Apifox 的普通响应体页签读取的也是
// 独立保留的 response.stream，而不是把 Timeline 中已解析的事件重新拼出来；这样 CRLF、注释、
// 空行和 UTF-8 跨 chunk 字符都能原样保留。
type streamBodyTee struct {
	reader io.Reader
	emit   func([]byte)
}

func (r *streamBodyTee) Read(p []byte) (int, error) {
	n, err := r.reader.Read(p)
	if n > 0 && r.emit != nil {
		r.emit(p[:n])
	}
	return n, err
}

// streamResponse 持续读取已识别的记录流，按格式解析后经 http:stream 事件推送。
// SSE 可选择在正常 EOF 后重连；停止、读取错误和达到尝试上限都会发出 close 事件。
func (s *HTTPService) streamResponse(
	resp *http.Response, connID string, ctx context.Context, cancel context.CancelFunc,
	limits sseReadLimits, format string, client *http.Client, requestTemplate *http.Request,
	reconnect sseReconnectOptions, recorder *transportcapture.Recorder, data SendRequestData,
) {
	defer cancel()
	defer s.unregisterStream(connID)
	runOutcome := models.RequestRunOutcomeCompleted
	var runError *models.RequestAttemptError
	defer func() {
		if ctx.Err() != nil && runError == nil {
			runOutcome = models.RequestRunOutcomeCancelled
			runError = requestAttemptError("stream", ctx.Err())
		}
		recorder.SetOutcome(runOutcome, runError)
		run := s.capturedRequestRun(recorder, data)
		// 流在真正结束后再落库，保证重连 attempt 和最终 outcome 都进入同一执行链。
		last := actualRequestFromRun(&run)
		s.saveResponseAndHistory(data, &HTTPResponseData{
			StatusCode: resp.StatusCode, Headers: resp.Header,
			ContentType: resp.Header.Get("Content-Type"), ActualRequest: last, RequestRun: &run,
			Streaming: true, StreamID: connID, StreamFormat: format,
		})
	}()

	emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "open", Data: fmt.Sprintf("%d", resp.StatusCode), Timestamp: nowMillis()})
	lastEventID, hasLastEventID := "", false
	retryDelay := time.Second
	attempts := 0
	for {
		body := &streamBodyTee{reader: resp.Body, emit: func(chunk []byte) {
			emitStream(HTTPStreamEventName, StreamEvent{
				ConnID: connID, Kind: "body", Binary: true,
				Data: base64.StdEncoding.EncodeToString(chunk), Timestamp: nowMillis(),
			})
		}}
		emitItem := func(item sseEvent) {
			if item.HasEventID {
				lastEventID, hasLastEventID = item.EventID, true
			}
			if item.HasRetry {
				retryDelay = time.Duration(item.Retry) * time.Millisecond
			}
			kind := "message"
			if item.HasComment {
				kind = "comment"
			}
			emitStream(HTTPStreamEventName, StreamEvent{
				ConnID: connID, Kind: kind, Data: item.Data, Timestamp: nowMillis(),
				Event: item.Event, EventID: item.EventID, HasEventID: item.HasEventID,
				Retry: item.Retry, HasRetry: item.HasRetry, Comment: item.Comment, HasComment: item.HasComment,
				Raw: item.Raw,
			})
		}
		var err error
		if format == "sse" {
			err = parseSSE(body, limits, emitItem)
		} else {
			err = parseRecordStream(body, limits, format == "json-seq", emitItem)
		}
		_ = resp.Body.Close()
		if err != nil {
			runOutcome = models.RequestRunOutcomeFailed
			runError = requestAttemptError("read_stream", err)
			emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "close", Data: err.Error(), Timestamp: nowMillis()})
			return
		}
		if format != "sse" || !reconnect.Enabled || reconnect.MaxAttempts <= attempts {
			emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "close", Data: "stream ended", Timestamp: nowMillis()})
			return
		}
		attempts++
		emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "reconnecting", Data: fmt.Sprintf("reconnecting (%d/%d)", attempts, reconnect.MaxAttempts), Timestamp: nowMillis()})
		if !waitForSSEReconnect(ctx, retryDelay) {
			emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "close", Data: "stream stopped", Timestamp: nowMillis()})
			return
		}
		nextRequest, cloneErr := cloneSSEReconnectRequest(requestTemplate, ctx, lastEventID, hasLastEventID)
		if cloneErr != nil {
			runOutcome = models.RequestRunOutcomeFailed
			runError = requestAttemptError("sse_reconnect", cloneErr)
			emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "close", Data: cloneErr.Error(), Timestamp: nowMillis()})
			return
		}
		nextRequest = nextRequest.WithContext(transportcapture.WithAttempt(
			nextRequest.Context(), models.RequestAttemptCauseSSEReconnect, recorder.LastAttemptID()))
		nextResp, requestErr := client.Do(nextRequest)
		if requestErr != nil {
			runOutcome = models.RequestRunOutcomeFailed
			runError = requestAttemptError("sse_reconnect", requestErr)
			emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "close", Data: requestErr.Error(), Timestamp: nowMillis()})
			return
		}
		if streamFormat(nextResp.Header.Get("Content-Type")) != "sse" {
			_ = nextResp.Body.Close()
			runOutcome = models.RequestRunOutcomeFailed
			runError = &models.RequestAttemptError{Phase: "sse_reconnect", Message: "SSE reconnect returned a non-SSE response"}
			emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "close", Data: "SSE reconnect returned a non-SSE response", Timestamp: nowMillis()})
			return
		}
		resp = nextResp
		emitStream(HTTPStreamEventName, StreamEvent{ConnID: connID, Kind: "reconnected", Data: fmt.Sprintf("%d", resp.StatusCode), Timestamp: nowMillis()})
	}
}

func waitForSSEReconnect(ctx context.Context, delay time.Duration) bool {
	if delay < 0 {
		delay = 0
	}
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func cloneSSEReconnectRequest(template *http.Request, ctx context.Context, lastEventID string, hasLastEventID bool) (*http.Request, error) {
	next := template.Clone(ctx)
	if template.GetBody != nil {
		body, err := template.GetBody()
		if err != nil {
			return nil, fmt.Errorf("restore SSE request body: %w", err)
		}
		next.Body = body
	}
	if hasLastEventID {
		next.Header.Set("Last-Event-ID", lastEventID)
	} else {
		next.Header.Del("Last-Event-ID")
	}
	return next, nil
}

func createMultipartPart(writer *multipart.Writer, name, fileName, contentType string) (io.Writer, error) {
	if contentType == "" {
		if fileName != "" {
			return writer.CreateFormFile(name, fileName)
		}
		return writer.CreateFormField(name)
	}
	params := map[string]string{"name": name}
	if fileName != "" {
		params["filename"] = fileName
	}
	header := textproto.MIMEHeader{}
	header.Set("Content-Disposition", mime.FormatMediaType("form-data", params))
	header.Set("Content-Type", contentType)
	return writer.CreatePart(header)
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
			if bodyFieldDataType(field) == "file" {
				// 文件字段可以是单个引用对象，也可以是引用数组；每个文件生成一个同名 part。
				files, ok := parseFileFields(field.Value)
				if !ok {
					files = []fileFieldValue{{FileName: field.Value}}
				}
				for _, file := range files {
					segment, err := file.segment()
					if err != nil {
						return err
					}
					if _, err := createMultipartPart(writer, field.Name, file.displayName(), resolveVars(field.ContentType, vars)); err != nil {
						return apperr.Wrap(err, apperr.CodeBuildBody, apperr.P("field", field.Name))
					}
					flushHead()
					segments = append(segments, segment)
				}
			} else {
				for _, serialized := range serializeFormBodyField(field, vars) {
					part, err := createMultipartPart(writer, serialized.Name, "", resolveVars(field.ContentType, vars))
					if err != nil {
						return apperr.Wrap(err, apperr.CodeBuildBody, apperr.P("field", field.Name))
					}
					if _, err := part.Write([]byte(serialized.Value)); err != nil {
						return apperr.Wrap(err, apperr.CodeBuildBody, apperr.P("field", field.Name))
					}
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
			// 兼容旧文件行并保留同名字段和 array explode 产生的重复值。
			for _, serialized := range serializeURLEncodedBodyField(field, vars) {
				values.Add(serialized.Name, serialized.Value)
			}
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
	auth *models.EndpointAuth, vars map[string]string, body string, parentAttemptID *string,
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

	retryCtx := transportcapture.WithAttempt(ctx, models.RequestAttemptCauseDigest, parentAttemptID)
	retry := req.Clone(retryCtx)
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
	storedReqBody := truncateForStorage(resp.ActualRequest.Body, limits.MaxStoredBodyBytes)
	if resp.ActualRequest.Method == "" {
		storedReqBody = truncateForStorage(data.BodyContent, limits.MaxStoredBodyBytes)
	}
	storedActualRequest := resp.ActualRequest
	storedActualRequest.Body = truncateForStorage(storedActualRequest.Body, limits.MaxStoredBodyBytes)

	// 脱敏：历史里存的 Authorization / Cookie 往往是长期有效的凭据
	policy := getHistorySettings(s.db)
	storedRespHeaders := resp.Headers
	var storedRun *models.RequestRun
	if resp.RequestRun != nil {
		storedRun = sanitizeRequestRun(resp.RequestRun, limits.MaxStoredBodyBytes, policy.MaskSensitive,
			collectSecretValues(s.db, data.EnvironmentID, data.ModuleID))
	}
	if policy.MaskSensitive {
		secrets := collectSecretValues(s.db, data.EnvironmentID, data.ModuleID)
		storedBody = maskSecretValues(storedBody, secrets)
		storedReqBody = maskSecretValues(storedReqBody, secrets)
		storedRespHeaders = maskMultiHeaders(resp.Headers)
		storedActualRequest.Headers = maskHeaders(resp.ActualRequest.Headers)
		storedActualRequest.Body = maskSecretValues(storedActualRequest.Body, secrets)
		storedActualRequest.URL = redactSensitiveRequestURL(storedActualRequest.URL, secrets, false)
	}

	// run、最近响应和历史必须原子写入，避免历史指向不存在或只写了一半的 attempt 链。
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var runID *string
		if storedRun != nil && storedRun.ModuleID != "" {
			if err := tx.Create(storedRun).Error; err != nil {
				return err
			}
			runID = &storedRun.ID
		}
		if data.EndpointID != "" && !resp.Skipped {
			response := &models.Response{
				EndpointID: data.EndpointID, RequestRunID: runID, StatusCode: resp.StatusCode,
				Headers: models.ToJSON(storedRespHeaders), Body: storedBody, ContentType: resp.ContentType,
				Cookies: models.ToJSON(resp.Cookies), Timing: models.ToJSON(resp.Timing), Size: resp.Size,
				ActualRequest: models.ToJSON(storedActualRequest),
			}
			if err := NewEndpointService(tx).SaveResponse(data.EndpointID, response); err != nil {
				return err
			}
		}
		if data.ModuleID != "" {
			method, requestURL := storedActualRequest.Method, storedActualRequest.URL
			if method == "" {
				method = data.Method
			}
			if requestURL == "" {
				requestURL = combineURL(data.BaseURL, data.Path)
			}
			reqHeaders := storedActualRequest.Headers
			if reqHeaders == nil {
				reqHeaders = map[string]string{}
				for _, header := range data.Headers {
					if header.Enabled {
						reqHeaders[header.Name] = header.Value
					}
				}
				if policy.MaskSensitive {
					reqHeaders = maskHeaders(reqHeaders)
				}
			}
			history := &models.RequestHistory{
				ModuleID: data.ModuleID, EndpointID: nilOrNilString(data.EndpointID), RequestRunID: runID,
				Method: method, URL: requestURL, StatusCode: resp.StatusCode,
				Timing: models.ToJSON(resp.Timing), Size: resp.Size,
				RequestHeaders: models.ToJSON(reqHeaders), RequestBody: storedReqBody,
				ResponseHeaders: models.ToJSON(storedRespHeaders), ResponseBody: storedBody,
				ContentType: resp.ContentType,
			}
			if err := tx.Create(history).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		slog.Error("保存请求执行链/响应/历史失败", "error", err)
		return
	}
	if data.ModuleID != "" {
		if err := NewRequestHistoryService(s.db).enforceRowLimit(data.ModuleID); err != nil {
			slog.Warn("裁剪请求历史失败", "moduleId", data.ModuleID, "error", err)
		}
	}
}

func requestCaptureLimit(storedLimit int64) int64 {
	if storedLimit > 0 && storedLimit < transportcapture.DefaultBodyPreviewBytes {
		return storedLimit
	}
	return transportcapture.DefaultBodyPreviewBytes
}

func (s *HTTPService) capturedRequestRun(recorder *transportcapture.Recorder, data SendRequestData) models.RequestRun {
	run := recorder.Run()
	markRequestRunSensitive(&run, collectSecretValues(s.db, data.EnvironmentID, data.ModuleID))
	return run
}

func markRequestRunSensitive(run *models.RequestRun, secrets []string) {
	if run == nil || len(secrets) == 0 {
		return
	}
	markSnapshot := func(snapshot *models.HTTPRequestSnapshot) {
		if snapshot == nil {
			return
		}
		for i := range snapshot.Headers {
			if containsSecretValue(snapshot.Headers[i].Value, secrets) {
				snapshot.Headers[i].Sensitive = true
			}
		}
		if snapshot.Body.PreviewCodec == "utf8" && containsSecretValue(snapshot.Body.Preview, secrets) {
			snapshot.Body.Sensitive = true
		}
		if containsSecretValue(snapshot.URL, secrets) {
			snapshot.URLSensitive = true
		}
	}
	markSnapshot(run.ConfiguredRequest)
	markSnapshot(run.PreparedRequest)
	for i := range run.Attempts {
		markSnapshot(&run.Attempts[i].Request)
		if run.Attempts[i].Response != nil {
			for j := range run.Attempts[i].Response.Headers {
				if containsSecretValue(run.Attempts[i].Response.Headers[j].Value, secrets) {
					run.Attempts[i].Response.Headers[j].Sensitive = true
				}
			}
		}
	}
}

func containsSecretValue(value string, secrets []string) bool {
	for _, secret := range secrets {
		if secret != "" && strings.Contains(value, secret) {
			return true
		}
	}
	return false
}

func skippedRequestResponse(
	data SendRequestData, request *scripting.RequestData, scripts *ScriptResults,
	configured *models.HTTPRequestSnapshot,
) *HTTPResponseData {
	method, requestURL, body := data.Method, combineURL(data.BaseURL, data.Path), data.BodyContent
	headers := enabledHeaders(data.Headers)
	if request != nil {
		method, requestURL, body, headers = request.Method, request.URL, request.Body, request.Headers
	}
	if method == "" {
		method = http.MethodGet
	}
	prepared := models.HTTPRequestSnapshot{
		Method: method, URL: requestURL, Protocol: "not_sent", CaptureLevel: "prepared_not_sent",
		Headers: make([]models.HTTPHeaderSnapshot, 0, len(headers)),
	}
	for _, header := range headers {
		prepared.Headers = append(prepared.Headers, models.HTTPHeaderSnapshot{
			Name: header.Key, Value: header.Value, Source: "configured",
		})
	}
	if req, err := http.NewRequest(method, requestURL, strings.NewReader(body)); err == nil {
		for _, header := range prepared.Headers {
			req.Header.Add(header.Name, header.Value)
		}
		prepared = transportcapture.SnapshotRequest(req, transportcapture.DefaultBodyPreviewBytes)
		prepared.CaptureLevel = "prepared_not_sent"
	}
	recorder := transportcapture.NewRecorder("", data.ModuleID, nilOrNilString(data.EndpointID), &prepared)
	recorder.SetConfiguredRequest(configured)
	recorder.SetOutcome(models.RequestRunOutcomeSkipped, nil)
	run := recorder.Run()
	return &HTTPResponseData{
		Headers: map[string][]string{}, RequestRun: &run, Skipped: true, Scripts: scripts,
	}
}

func configuredRequestSnapshot(data SendRequestData) models.HTTPRequestSnapshot {
	method := strings.ToUpper(strings.TrimSpace(data.Method))
	if method == "" {
		method = http.MethodGet
	}
	requestURL := combineURL(data.BaseURL, data.Path)
	headers := enabledHeaders(data.Headers)
	contentType := data.ContentType
	if contentType == "" {
		contentType = defaultContentType(data)
	}
	var bodyReader io.Reader
	if data.BodyContent != "" {
		bodyReader = strings.NewReader(data.BodyContent)
	}
	if req, err := http.NewRequest(method, requestURL, bodyReader); err == nil {
		for _, header := range headers {
			req.Header.Add(header.Key, header.Value)
		}
		if data.BodyContent != "" && req.Header.Get("Content-Type") == "" {
			req.Header.Set("Content-Type", contentType)
		}
		snapshot := transportcapture.SnapshotRequest(req, transportcapture.DefaultBodyPreviewBytes)
		snapshot.CaptureLevel = "configured"
		applyConfiguredBodyFields(&snapshot, data)
		return snapshot
	}
	snapshot := models.HTTPRequestSnapshot{
		Method: method, URL: requestURL, Protocol: "not_prepared", CaptureLevel: "configured",
	}
	httpHeaders := make(http.Header, len(headers))
	for _, header := range headers {
		httpHeaders.Add(header.Key, header.Value)
	}
	snapshot.Headers = transportcapture.SnapshotHeaders(httpHeaders, "configured")
	if data.BodyContent != "" {
		snapshot.Body = transportcapture.CaptureBody(strings.NewReader(data.BodyContent), contentType, "", transportcapture.DefaultBodyPreviewBytes)
		snapshot.ContentLength = int64(len(data.BodyContent))
	}
	applyConfiguredBodyFields(&snapshot, data)
	return snapshot
}

func applyConfiguredBodyFields(snapshot *models.HTTPRequestSnapshot, data SendRequestData) {
	switch data.BodyType {
	case string(models.BodyTypeURLEncoded):
		values := url.Values{}
		for _, field := range data.BodyFields {
			if field.Enabled {
				for _, serialized := range serializeURLEncodedBodyField(field, nil) {
					values.Add(serialized.Name, serialized.Value)
				}
			}
		}
		encoded := values.Encode()
		snapshot.Body = transportcapture.CaptureBody(
			strings.NewReader(encoded), "application/x-www-form-urlencoded", "", transportcapture.DefaultBodyPreviewBytes)
		snapshot.ContentLength = int64(len(encoded))
	case string(models.BodyTypeFormData):
		body := models.HTTPBodySnapshot{Kind: "multipart", MediaType: "multipart/form-data", Captured: true}
		for _, field := range data.BodyFields {
			if !field.Enabled {
				continue
			}
			part := models.HTTPBodyPart{Name: field.Name, ContentType: field.ContentType, Sensitive: requestFieldNameSensitive(field.Name)}
			if bodyFieldDataType(field) == "file" {
				if files, ok := parseFileFields(field.Value); ok {
					for _, file := range files {
						filePart := part
						filePart.FileName = file.displayName()
						body.Parts = append(body.Parts, filePart)
					}
					body.Sensitive = body.Sensitive || part.Sensitive
					continue
				}
				part.FileName = field.Value
			} else {
				for _, serialized := range serializeFormBodyField(field, nil) {
					valuePart := part
					valuePart.Name = serialized.Name
					valuePart.Sensitive = requestFieldNameSensitive(serialized.Name)
					valuePart.Preview = serialized.Value
					valuePart.PreviewCodec = "utf8"
					valuePart.Size = int64(len(serialized.Value))
					body.Size += valuePart.Size
					body.Sensitive = body.Sensitive || valuePart.Sensitive
					body.Parts = append(body.Parts, valuePart)
				}
				continue
			}
			body.Sensitive = body.Sensitive || part.Sensitive
			body.Parts = append(body.Parts, part)
		}
		snapshot.Body = body
		snapshot.ContentLength = -1
	}
}

func requestAttemptError(phase string, err error) *models.RequestAttemptError {
	if err == nil {
		return nil
	}
	return &models.RequestAttemptError{Phase: phase, Code: apperr.Code(err), Message: err.Error()}
}

func requestBodyPreview(body models.HTTPBodySnapshot) string {
	if body.PreviewCodec == "base64" {
		decoded, err := base64.StdEncoding.DecodeString(body.Preview)
		if err == nil {
			return string(decoded)
		}
	}
	return body.Preview
}

// actualRequestFromRun 为仍依赖旧单对象字段的客户端提供兼容视图。权威数据始终是 RequestRun。
func actualRequestFromRun(run *models.RequestRun) models.ActualRequestInfo {
	if run == nil || len(run.Attempts) == 0 {
		return models.ActualRequestInfo{Headers: map[string]string{}}
	}
	selected := &run.Attempts[len(run.Attempts)-1]
	if run.SelectedAttemptID != nil {
		for i := range run.Attempts {
			if run.Attempts[i].ID == *run.SelectedAttemptID {
				selected = &run.Attempts[i]
				break
			}
		}
	}
	headers := make(map[string]string, len(selected.Request.Headers))
	for _, header := range selected.Request.Headers {
		if previous, ok := headers[header.Name]; ok {
			headers[header.Name] = previous + ", " + header.Value
		} else {
			headers[header.Name] = header.Value
		}
	}
	return models.ActualRequestInfo{
		Method: selected.Request.Method, URL: selected.Request.URL,
		Headers: headers, Body: requestBodyPreview(selected.Request.Body),
	}
}

func sanitizeRequestRun(run *models.RequestRun, bodyLimit int64, maskSensitive bool, secrets []string) *models.RequestRun {
	if run == nil {
		return nil
	}
	var out models.RequestRun
	if err := models.FromJSON(models.ToJSON(run), &out); err != nil {
		return nil
	}
	if out.PreparedRequest != nil {
		sanitizeRequestSnapshot(out.PreparedRequest, bodyLimit, maskSensitive, secrets)
	}
	if out.ConfiguredRequest != nil {
		sanitizeRequestSnapshot(out.ConfiguredRequest, bodyLimit, maskSensitive, secrets)
	}
	for i := range out.Attempts {
		sanitizeRequestSnapshot(&out.Attempts[i].Request, bodyLimit, maskSensitive, secrets)
		if out.Attempts[i].Response != nil {
			out.Attempts[i].Response.Headers = sanitizeHeaderSnapshots(
				out.Attempts[i].Response.Headers, maskSensitive, secrets)
		}
	}
	return &out
}

func sanitizeRequestSnapshot(snapshot *models.HTTPRequestSnapshot, bodyLimit int64, maskSensitive bool, secrets []string) {
	snapshot.Headers = sanitizeHeaderSnapshots(snapshot.Headers, maskSensitive, secrets)
	if maskSensitive {
		snapshot.URL = redactSensitiveRequestURL(snapshot.URL, secrets, snapshot.URLSensitive)
		snapshot.RequestTarget = redactSensitiveRequestURL(snapshot.RequestTarget, secrets, snapshot.URLSensitive)
	}
	snapshot.Body = truncateBodySnapshot(snapshot.Body, bodyLimit)
	for i := range snapshot.Body.Parts {
		partBody := models.HTTPBodySnapshot{
			Preview: snapshot.Body.Parts[i].Preview, PreviewCodec: snapshot.Body.Parts[i].PreviewCodec,
			Truncated: snapshot.Body.Parts[i].Truncated,
		}
		partBody = truncateBodySnapshot(partBody, bodyLimit)
		snapshot.Body.Parts[i].Preview = partBody.Preview
		snapshot.Body.Parts[i].Truncated = partBody.Truncated
		if maskSensitive {
			if snapshot.Body.Parts[i].Sensitive {
				snapshot.Body.Parts[i].Preview = "••••••"
				snapshot.Body.Parts[i].PreviewCodec = "utf8"
			} else if snapshot.Body.Parts[i].PreviewCodec == "utf8" {
				snapshot.Body.Parts[i].Preview = maskSecretValues(snapshot.Body.Parts[i].Preview, secrets)
			}
		}
	}
	if maskSensitive && snapshot.Body.PreviewCodec == "utf8" {
		masked := maskSecretValues(snapshot.Body.Preview, secrets)
		if snapshot.Body.Sensitive && masked == snapshot.Body.Preview {
			masked = redactStructuredRequestBody(snapshot.Body.MediaType, snapshot.Body.Preview)
		}
		if masked != snapshot.Body.Preview {
			snapshot.Body.Sensitive = true
		}
		snapshot.Body.Preview = masked
	}
}

func redactSensitiveRequestURL(raw string, secrets []string, redactAllQueryValues bool) string {
	masked := maskSecretValues(raw, secrets)
	parsed, err := url.Parse(masked)
	if err != nil || parsed.RawQuery == "" {
		return masked
	}
	query := parsed.Query()
	if parsed.User != nil {
		if _, hasPassword := parsed.User.Password(); hasPassword {
			parsed.User = url.UserPassword(parsed.User.Username(), "••••••")
		}
	}
	for key, values := range query {
		redact := redactAllQueryValues || requestFieldNameSensitive(key)
		if !redact {
			for _, value := range values {
				if containsSecretValue(value, secrets) {
					redact = true
					break
				}
			}
		}
		if redact {
			query[key] = []string{"••••••"}
		}
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func redactStructuredRequestBody(mediaType, preview string) string {
	lowerMediaType := strings.ToLower(mediaType)
	if strings.Contains(lowerMediaType, "json") || strings.Contains(lowerMediaType, "graphql") {
		var value any
		if json.Unmarshal([]byte(preview), &value) == nil {
			redactJSONSensitiveFields(value)
			if encoded, err := json.MarshalIndent(value, "", "  "); err == nil {
				return string(encoded)
			}
		}
	}
	if lowerMediaType == "application/x-www-form-urlencoded" {
		if values, err := url.ParseQuery(preview); err == nil {
			for key := range values {
				if requestFieldNameSensitive(key) {
					values[key] = []string{"••••••"}
				}
			}
			return values.Encode()
		}
	}
	// 无法可靠定位字段边界时宁可遮蔽整个敏感预览，避免凭据写入历史库。
	return "••••••"
}

func redactJSONSensitiveFields(value any) {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			if requestFieldNameSensitive(key) {
				typed[key] = "••••••"
			} else {
				redactJSONSensitiveFields(child)
			}
		}
	case []any:
		for _, child := range typed {
			redactJSONSensitiveFields(child)
		}
	}
}

func requestFieldNameSensitive(name string) bool {
	normalized := strings.NewReplacer("-", "", "_", "", ".", "").Replace(strings.ToLower(name))
	return normalized == "password" || normalized == "passwd" || normalized == "secret" ||
		normalized == "token" || normalized == "accesstoken" || normalized == "refreshtoken" ||
		normalized == "apikey" || normalized == "accesskey" || normalized == "clientsecret"
}

func sanitizeHeaderSnapshots(headers []models.HTTPHeaderSnapshot, maskSensitive bool, secrets []string) []models.HTTPHeaderSnapshot {
	out := append([]models.HTTPHeaderSnapshot(nil), headers...)
	if !maskSensitive {
		return out
	}
	for i := range out {
		if out[i].Sensitive {
			out[i].Value = "••••••"
			out[i].Redacted = true
			continue
		}
		masked := maskSecretValues(out[i].Value, secrets)
		if masked != out[i].Value {
			out[i].Sensitive = true
			out[i].Redacted = true
		}
		out[i].Value = masked
	}
	return out
}

func truncateBodySnapshot(body models.HTTPBodySnapshot, limit int64) models.HTTPBodySnapshot {
	if limit <= 0 || body.Preview == "" {
		return body
	}
	preview := []byte(body.Preview)
	if body.PreviewCodec == "base64" {
		decoded, err := base64.StdEncoding.DecodeString(body.Preview)
		if err != nil {
			return body
		}
		preview = decoded
	}
	if int64(len(preview)) <= limit {
		return body
	}
	preview = preview[:limit]
	if body.PreviewCodec == "utf8" {
		for len(preview) > 0 && !utf8.Valid(preview) {
			preview = preview[:len(preview)-1]
		}
		body.Preview = string(preview)
	} else {
		body.Preview = base64.StdEncoding.EncodeToString(preview)
	}
	body.Truncated = true
	return body
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
	files, ok := parseFileFields(value)
	if !ok || len(files) == 0 {
		return fileFieldValue{}, false
	}
	return files[0], true
}

// parseFileFields 同时兼容旧版单文件对象与新版多文件数组。
func parseFileFields(value string) ([]fileFieldValue, bool) {
	if strings.HasPrefix(strings.TrimSpace(value), "[") {
		var payload []fileFieldValue
		if err := json.Unmarshal([]byte(value), &payload); err != nil || len(payload) == 0 {
			return nil, false
		}
		for _, file := range payload {
			if file.Path == "" && file.Content == "" && file.FileName == "" {
				return nil, false
			}
		}
		return payload, true
	}
	var payload fileFieldValue
	if err := json.Unmarshal([]byte(value), &payload); err != nil {
		return nil, false
	}
	if payload.Path == "" && payload.Content == "" && payload.FileName == "" {
		return nil, false
	}
	return []fileFieldValue{payload}, true
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
