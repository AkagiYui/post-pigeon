package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// TestResponseSizeLimit 验证响应体超过限额时被截断，并在响应上标记出来。
func TestResponseSizeLimit(t *testing.T) {
	db := newTestDB(t)
	payload := strings.Repeat("x", 5000)
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(payload))
	}))

	if err := NewSettingsService(db).SaveRequestSettings(models.RequestSettings{
		MaxResponseBytes:   1000,
		MaxStoredBodyBytes: 500,
	}); err != nil {
		t.Fatalf("保存限额设置失败: %v", err)
	}

	hs := newTestHTTPService(t, db)
	resp, err := hs.SendRequest(SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/"})
	if err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}
	if !resp.Truncated {
		t.Errorf("超限响应应标记为已截断")
	}
	if got := len(resp.Body); got != 1000 {
		t.Errorf("响应体应被截断到 1000 字节，实际 %d", got)
	}
	if resp.TruncatedLimit != 1000 {
		t.Errorf("应回传触发截断的上限，实际 %d", resp.TruncatedLimit)
	}
}

// TestResponseNotTruncatedUnderLimit 验证未超限时不误标截断。
func TestResponseNotTruncatedUnderLimit(t *testing.T) {
	db := newTestDB(t)
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("hello"))
	}))
	if err := NewSettingsService(db).SaveRequestSettings(models.RequestSettings{MaxResponseBytes: 1000}); err != nil {
		t.Fatalf("保存限额设置失败: %v", err)
	}

	hs := newTestHTTPService(t, db)
	resp, err := hs.SendRequest(SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/"})
	if err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}
	if resp.Truncated {
		t.Errorf("未超限的响应不应标记截断")
	}
	if resp.Body != "hello" {
		t.Errorf("响应体=%q", resp.Body)
	}
	if resp.RawBody == "" || resp.RawBodyOmitted {
		t.Errorf("小响应应回传 base64 原始字节")
	}
}

// TestTruncateForStorage 验证入库截断不会劈开多字节字符。
func TestTruncateForStorage(t *testing.T) {
	// "中" 占 3 字节，限额 4 字节时应退回到 3 字节边界
	got := truncateForStorage("中中中", 4)
	if !strings.HasPrefix(got, "中") {
		t.Fatalf("截断结果=%q", got)
	}
	if strings.ContainsRune(got, '�') {
		t.Errorf("截断不应产生非法 UTF-8：%q", got)
	}
	if unchanged := truncateForStorage("abc", 0); unchanged != "abc" {
		t.Errorf("limit=0 应不限制，实际=%q", unchanged)
	}
}

// TestCancelRequest 验证进行中的请求可以被主动取消，并返回可识别的错误码。
func TestCancelRequest(t *testing.T) {
	db := newTestDB(t)
	release := make(chan struct{})
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-release:
		case <-r.Context().Done():
		}
		_, _ = w.Write([]byte("done"))
	}))
	defer close(release)

	hs := newTestHTTPService(t, db)
	const reqID = "req-1"
	errCh := make(chan error, 1)
	go func() {
		_, err := hs.SendRequest(SendRequestData{
			Method: "GET", BaseURL: srv.URL, Path: "/", RequestID: reqID, Timeout: 30000,
		})
		errCh <- err
	}()

	if !waitFor(func() bool { return hs.IsRequestInFlight(reqID) }) {
		t.Fatalf("请求应被登记为进行中")
	}
	if !hs.CancelRequest(reqID) {
		t.Fatalf("取消进行中的请求应返回 true")
	}

	select {
	case err := <-errCh:
		if err == nil {
			t.Fatalf("被取消的请求应返回错误")
		}
		if code := apperr.Code(err); code != apperr.CodeRequestCanceled {
			t.Errorf("错误码应为 %s，实际 %s（err=%v）", apperr.CodeRequestCanceled, code, err)
		}
	case <-time.After(10 * time.Second):
		t.Fatalf("取消后请求未及时返回")
	}

	if hs.CancelRequest("not-exist") {
		t.Errorf("取消不存在的请求应返回 false")
	}
}

// TestRequestTimeoutErrorCode 验证超时与取消能被区分开。
func TestRequestTimeoutErrorCode(t *testing.T) {
	db := newTestDB(t)
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-r.Context().Done()
	}))

	hs := newTestHTTPService(t, db)
	_, err := hs.SendRequest(SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/", Timeout: 200})
	if err == nil {
		t.Fatalf("超时请求应返回错误")
	}
	if code := apperr.Code(err); code != apperr.CodeRequestTimeout {
		t.Errorf("错误码应为 %s，实际 %s（err=%v）", apperr.CodeRequestTimeout, code, err)
	}
}

// TestHistoryRetentionPolicy 验证按条数上限淘汰最旧的历史记录。
func TestHistoryRetentionPolicy(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "retention")
	module := defaultModule(t, db, project.ID)

	settings := NewSettingsService(db)
	if err := settings.SaveHistorySettings(models.HistorySettings{MaxRowsPerModule: 3}); err != nil {
		t.Fatalf("保存历史策略失败: %v", err)
	}

	hs := NewRequestHistoryService(db)
	base := time.Now().Add(-time.Hour)
	for i := range 6 {
		record := &models.RequestHistory{
			ModuleID:  module.ID,
			Method:    "GET",
			URL:       fmt.Sprintf("http://x/%d", i),
			CreatedAt: base.Add(time.Duration(i) * time.Minute),
		}
		if err := db.Create(record).Error; err != nil {
			t.Fatalf("写入历史失败: %v", err)
		}
	}

	if err := hs.ApplyRetentionPolicy(); err != nil {
		t.Fatalf("ApplyRetentionPolicy err=%v", err)
	}

	list, err := hs.ListHistoryByModule(module.ID, 100, 0)
	if err != nil {
		t.Fatalf("ListHistoryByModule err=%v", err)
	}
	if len(list) != 3 {
		t.Fatalf("应只保留 3 条，实际 %d 条", len(list))
	}
	// 保留的应是最新的三条
	for _, item := range list {
		if strings.HasSuffix(item.URL, "/0") || strings.HasSuffix(item.URL, "/1") || strings.HasSuffix(item.URL, "/2") {
			t.Errorf("最旧的记录应被淘汰，却保留了 %s", item.URL)
		}
	}
}

// TestHistoryRetentionByDays 验证按保留天数清理。
func TestHistoryRetentionByDays(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "retention-days")
	module := defaultModule(t, db, project.ID)

	if err := NewSettingsService(db).SaveHistorySettings(models.HistorySettings{RetentionDays: 7}); err != nil {
		t.Fatalf("保存历史策略失败: %v", err)
	}

	old := &models.RequestHistory{ModuleID: module.ID, Method: "GET", URL: "http://x/old", CreatedAt: time.Now().AddDate(0, 0, -30)}
	fresh := &models.RequestHistory{ModuleID: module.ID, Method: "GET", URL: "http://x/fresh", CreatedAt: time.Now()}
	for _, r := range []*models.RequestHistory{old, fresh} {
		if err := db.Create(r).Error; err != nil {
			t.Fatalf("写入历史失败: %v", err)
		}
	}

	hs := NewRequestHistoryService(db)
	if err := hs.ApplyRetentionPolicy(); err != nil {
		t.Fatalf("ApplyRetentionPolicy err=%v", err)
	}

	list, err := hs.ListHistoryByModule(module.ID, 100, 0)
	if err != nil {
		t.Fatalf("ListHistoryByModule err=%v", err)
	}
	if len(list) != 1 || !strings.HasSuffix(list[0].URL, "/fresh") {
		t.Fatalf("应只保留 7 天内的记录，实际 %+v", list)
	}
}

// TestGlobalRequestTimeoutFallback 验证接口未设置超时时用全局设置兜底。
func TestGlobalRequestTimeoutFallback(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	timeoutMs := 120
	if err := NewSettingsService(db).SaveRequestSettings(models.RequestSettings{
		TimeoutMs:       &timeoutMs,
		FollowRedirects: true,
	}); err != nil {
		t.Fatalf("保存请求设置失败: %v", err)
	}

	hs := newTestHTTPService(t, db)
	start := time.Now()
	_, err := hs.SendRequest(SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/slow"})
	if code := apperr.Code(err); code != apperr.CodeRequestTimeout {
		t.Fatalf("错误码应为 %s，实际 %s（err=%v）", apperr.CodeRequestTimeout, code, err)
	}
	// 兜底值生效的证据：远早于旧的 30s 兜底
	if elapsed := time.Since(start); elapsed > 5*time.Second {
		t.Errorf("应按全局 120ms 超时，实际耗时 %v", elapsed)
	}
}

// TestFollowRedirectsInheritance 验证接口级跟随重定向的三态：
// nil 继承全局设置，显式 true/false 覆盖全局。
func TestFollowRedirectsInheritance(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	settings := NewSettingsService(db)
	hs := newTestHTTPService(t, db)

	statusOf := func(t *testing.T, global bool, endpoint *bool) int {
		t.Helper()
		if err := settings.SaveRequestSettings(models.RequestSettings{FollowRedirects: global}); err != nil {
			t.Fatalf("保存请求设置失败: %v", err)
		}
		resp, err := hs.SendRequest(SendRequestData{
			Method: "GET", BaseURL: srv.URL, Path: "/redirect", FollowRedirects: endpoint, Timeout: 5000,
		})
		if err != nil {
			t.Fatalf("SendRequest err=%v", err)
		}
		return resp.StatusCode
	}

	cases := []struct {
		name     string
		global   bool
		endpoint *bool
		want     int
	}{
		{"继承-全局开启", true, nil, 200},
		{"继承-全局关闭", false, nil, 302},
		{"显式开启压过全局关闭", false, new(true), 200},
		{"显式关闭压过全局开启", true, new(false), 302},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := statusOf(t, c.global, c.endpoint); got != c.want {
				t.Errorf("状态码 = %d，期望 %d", got, c.want)
			}
		})
	}
}

// TestSendNoCacheHeaders 验证「发送无缓存头」开关，以及不覆盖请求自带的 Cache-Control。
func TestSendNoCacheHeaders(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	settings := NewSettingsService(db)
	hs := newTestHTTPService(t, db)

	cacheControl := func(t *testing.T, data SendRequestData) string {
		t.Helper()
		resp, err := hs.SendRequest(data)
		if err != nil {
			t.Fatalf("SendRequest err=%v", err)
		}
		var echo struct {
			Headers map[string]string `json:"headers"`
		}
		if err := json.Unmarshal([]byte(resp.Body), &echo); err != nil {
			t.Fatalf("解析回显失败: %v", err)
		}
		return echo.Headers["Cache-Control"]
	}

	base := SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/echo", FollowRedirects: new(true), Timeout: 5000}

	// 默认关闭：不带 Cache-Control
	if err := settings.SaveRequestSettings(models.RequestSettings{FollowRedirects: true}); err != nil {
		t.Fatalf("保存请求设置失败: %v", err)
	}
	if got := cacheControl(t, base); got != "" {
		t.Errorf("开关关闭时不应发送 Cache-Control，实际 %q", got)
	}

	// 打开：补上 no-cache
	if err := settings.SaveRequestSettings(models.RequestSettings{FollowRedirects: true, SendNoCacheHeaders: true}); err != nil {
		t.Fatalf("保存请求设置失败: %v", err)
	}
	if got := cacheControl(t, base); got != "no-cache" {
		t.Errorf("开关打开时应发送 no-cache，实际 %q", got)
	}

	// 请求自带 Cache-Control 时不覆盖
	withHeader := base
	withHeader.Headers = []models.EndpointHeader{{Name: "Cache-Control", Value: "max-age=60", Enabled: true}}
	if got := cacheControl(t, withHeader); got != "max-age=60" {
		t.Errorf("不应覆盖请求自带的 Cache-Control，实际 %q", got)
	}
}

// TestDefaultUserAgent 验证全局默认 UA：留空用内置默认值，填了用填的，
// 接口自带 User-Agent（包括显式留空以抑制该头）时不覆盖。
func TestDefaultUserAgent(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	settings := NewSettingsService(db)
	hs := newTestHTTPService(t, db)

	userAgent := func(t *testing.T, data SendRequestData) string {
		t.Helper()
		resp, err := hs.SendRequest(data)
		if err != nil {
			t.Fatalf("SendRequest err=%v", err)
		}
		var echo struct {
			Headers map[string]string `json:"headers"`
		}
		if err := json.Unmarshal([]byte(resp.Body), &echo); err != nil {
			t.Fatalf("解析回显失败: %v", err)
		}
		return echo.Headers["User-Agent"]
	}

	base := SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/echo", FollowRedirects: new(true), Timeout: 5000}

	// 未配置：走内置默认值
	if got := userAgent(t, base); got != models.DefaultUserAgent {
		t.Errorf("未配置时应发送默认 UA %q，实际 %q", models.DefaultUserAgent, got)
	}

	// 只填空白同样按留空处理
	if err := settings.SaveRequestSettings(models.RequestSettings{FollowRedirects: true, UserAgent: "   "}); err != nil {
		t.Fatalf("保存请求设置失败: %v", err)
	}
	if got := userAgent(t, base); got != models.DefaultUserAgent {
		t.Errorf("留空时应发送默认 UA %q，实际 %q", models.DefaultUserAgent, got)
	}

	// 填了就发填的
	if err := settings.SaveRequestSettings(models.RequestSettings{FollowRedirects: true, UserAgent: "MyAgent/2.0"}); err != nil {
		t.Fatalf("保存请求设置失败: %v", err)
	}
	if got := userAgent(t, base); got != "MyAgent/2.0" {
		t.Errorf("应发送用户填写的 UA，实际 %q", got)
	}

	// 接口自带 User-Agent 时不覆盖
	withHeader := base
	withHeader.Headers = []models.EndpointHeader{{Name: "User-Agent", Value: "Endpoint/1.0", Enabled: true}}
	if got := userAgent(t, withHeader); got != "Endpoint/1.0" {
		t.Errorf("不应覆盖接口自带的 User-Agent，实际 %q", got)
	}

	// 接口把 User-Agent 显式留空：抑制该请求头，不回落到全局默认值
	emptyHeader := base
	emptyHeader.Headers = []models.EndpointHeader{{Name: "User-Agent", Value: "", Enabled: true}}
	if got := userAgent(t, emptyHeader); got != "" {
		t.Errorf("接口显式留空 User-Agent 时不应发送，实际 %q", got)
	}
}

// TestRequestTimeoutSemantics 验证超时设置的三态：
// 未设置（不入库）= 默认 300000ms，显式 0 = 不限制超时，负数按未设置处理。
func TestRequestTimeoutSemantics(t *testing.T) {
	db := newTestDB(t)
	settings := NewSettingsService(db)
	wantDefault := models.DefaultRequestTimeoutMs * time.Millisecond

	// 从未配置过
	if got := getRequestSettings(db).TimeoutMs; got != nil {
		t.Errorf("未配置时应为 nil，实际 %d", *got)
	}
	if d := requestTimeout(getRequestSettings(db)); d != wantDefault {
		t.Errorf("未配置时超时应为 %v，实际 %v", wantDefault, d)
	}

	// 界面清空：不写入这一项，JSON 里也不该出现该字段
	if err := settings.SaveRequestSettings(models.RequestSettings{FollowRedirects: true}); err != nil {
		t.Fatalf("保存请求设置失败: %v", err)
	}
	if raw := settings.GetSetting(models.SettingsKeyRequest); strings.Contains(raw, "timeoutMs") {
		t.Errorf("清空后不应写入 timeoutMs，实际 %s", raw)
	}
	if got := getRequestSettings(db).TimeoutMs; got != nil {
		t.Errorf("清空后应为 nil，实际 %d", *got)
	}

	// 显式填 0：原样保留，表示不限制超时
	zero := 0
	if err := settings.SaveRequestSettings(models.RequestSettings{TimeoutMs: &zero}); err != nil {
		t.Fatalf("保存请求设置失败: %v", err)
	}
	stored := getRequestSettings(db)
	if stored.TimeoutMs == nil || *stored.TimeoutMs != 0 {
		t.Fatalf("填 0 应原样保留，实际 %v", stored.TimeoutMs)
	}
	if d := requestTimeout(stored); d != 0 {
		t.Errorf("0 应表示不限制超时，实际 %v", d)
	}

	// 负数是非法输入：按未设置处理，而不是「永不超时」
	negative := -1
	if err := settings.SaveRequestSettings(models.RequestSettings{TimeoutMs: &negative}); err != nil {
		t.Fatalf("保存请求设置失败: %v", err)
	}
	stored = getRequestSettings(db)
	if stored.TimeoutMs != nil {
		t.Errorf("负数应回落到未设置，实际 %d", *stored.TimeoutMs)
	}
	if d := requestTimeout(stored); d != wantDefault {
		t.Errorf("超时时长 = %v，期望 %v", d, wantDefault)
	}
}
