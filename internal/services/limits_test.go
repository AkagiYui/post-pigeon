package services

import (
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
	for i := 0; i < 6; i++ {
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
