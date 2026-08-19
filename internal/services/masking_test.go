package services

import (
	"net/http"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

func TestMaskHeaders(t *testing.T) {
	masked := maskHeaders(map[string]string{
		"Authorization": "Bearer secret-token",
		"Cookie":        "sid=abc",
		"X-Api-Key":     "key-1",
		"Content-Type":  "application/json",
	})
	for _, name := range []string{"Authorization", "Cookie", "X-Api-Key"} {
		if masked[name] != maskedPlaceholder {
			t.Errorf("%s 应被脱敏，实际 %q", name, masked[name])
		}
	}
	if masked["Content-Type"] != "application/json" {
		t.Errorf("普通请求头不应被改动，实际 %q", masked["Content-Type"])
	}
}

func TestMaskMultiHeadersDoesNotMutateInput(t *testing.T) {
	original := map[string][]string{
		"Set-Cookie":   {"sid=abc", "theme=dark"},
		"Content-Type": {"text/plain"},
	}
	masked := maskMultiHeaders(original)

	if len(masked["Set-Cookie"]) != 1 || masked["Set-Cookie"][0] != maskedPlaceholder {
		t.Errorf("Set-Cookie 应被脱敏：%v", masked["Set-Cookie"])
	}
	if len(original["Set-Cookie"]) != 2 {
		t.Errorf("不应修改传入的 map：%v", original["Set-Cookie"])
	}
}

func TestMaskSecretValues(t *testing.T) {
	body := `{"token":"super-secret-value","note":"ok"}`
	masked := maskSecretValues(body, []string{"super-secret-value"})
	if strings.Contains(masked, "super-secret-value") {
		t.Errorf("秘密值应被替换：%s", masked)
	}
	if !strings.Contains(masked, `"note":"ok"`) {
		t.Errorf("非秘密内容应保留：%s", masked)
	}

	// 太短的值不参与替换，否则会在正文里到处误伤
	if got := maskSecretValues("a1 b2", []string{"a1"}); got != "a1 b2" {
		t.Errorf("过短的秘密值不应替换，实际 %q", got)
	}
	if got := maskSecretValues("", []string{"whatever"}); got != "" {
		t.Errorf("空文本应原样返回")
	}
}

// TestHistoryMasksCredentials 端到端验证：请求历史里不应留下明文凭据。
func TestHistoryMasksCredentials(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "mask")
	module := defaultModule(t, db, project.ID)
	env := firstEnvironment(t, db, project.ID)

	if err := NewEnvironmentService(db).SaveEnvironmentVariables(env.ID, []models.EnvironmentVariable{
		{Key: "apiToken", Value: "super-secret-token", Enabled: true, IsSecret: true},
	}); err != nil {
		t.Fatalf("保存环境变量失败: %v", err)
	}

	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Set-Cookie", "sid=abc")
		_, _ = w.Write([]byte(`{"echo":"super-secret-token"}`))
	}))

	hs := newTestHTTPService(t, db)
	if _, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/api",
		ModuleID: module.ID, EnvironmentID: env.ID,
		Headers:     []models.EndpointHeader{{Name: "Authorization", Value: "Bearer {{apiToken}}", Enabled: true}},
		BodyType:    string(models.BodyTypeJSON),
		BodyContent: `{"token":"{{apiToken}}"}`,
	}); err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}

	historySvc := NewRequestHistoryService(db)
	var history []models.RequestHistory
	if !waitFor(func() bool {
		list, err := historySvc.ListHistoryByModule(module.ID, 10, 0)
		if err != nil || len(list) == 0 {
			return false
		}
		history = list
		return true
	}) {
		t.Fatalf("请求历史未写入")
	}

	record := history[0]
	if strings.Contains(record.RequestHeaders, "Bearer") {
		t.Errorf("请求头中的凭据应被脱敏：%s", record.RequestHeaders)
	}
	if strings.Contains(record.ResponseHeaders, "sid=abc") {
		t.Errorf("Set-Cookie 应被脱敏：%s", record.ResponseHeaders)
	}
	if strings.Contains(record.ResponseBody, "super-secret-token") {
		t.Errorf("响应体中的秘密变量值应被脱敏：%s", record.ResponseBody)
	}
}

// TestHistoryMaskingCanBeDisabled 验证关掉开关后按原样存储。
func TestHistoryMaskingCanBeDisabled(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "nomask")
	module := defaultModule(t, db, project.ID)

	if err := NewSettingsService(db).SaveHistorySettings(models.HistorySettings{
		RetentionDays: 30, MaxRowsPerModule: 100, MaskSensitive: false,
	}); err != nil {
		t.Fatalf("保存历史策略失败: %v", err)
	}

	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))

	hs := newTestHTTPService(t, db)
	if _, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/api", ModuleID: module.ID,
		Headers: []models.EndpointHeader{{Name: "Authorization", Value: "Bearer plain", Enabled: true}},
	}); err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}

	historySvc := NewRequestHistoryService(db)
	var record models.RequestHistory
	if !waitFor(func() bool {
		list, err := historySvc.ListHistoryByModule(module.ID, 10, 0)
		if err != nil || len(list) == 0 {
			return false
		}
		record = list[0]
		return true
	}) {
		t.Fatalf("请求历史未写入")
	}
	if !strings.Contains(record.RequestHeaders, "Bearer plain") {
		t.Errorf("关闭脱敏后应原样存储：%s", record.RequestHeaders)
	}
}
