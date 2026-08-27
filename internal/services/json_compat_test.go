package services

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

func TestNormalizeJSONCComments(t *testing.T) {
	in := "{\n" +
		"  // 用户 ID\n" +
		"  \"id\": \"1\", // 行尾注释\n" +
		"  /* 块注释\n" +
		"     跨多行 */\n" +
		"  \"ok\": true\n" +
		"}"
	got := normalizeJSONC(in)
	if !json.Valid([]byte(got)) {
		t.Fatalf("改写结果不是合法 JSON：%q", got)
	}
	if strings.Contains(got, "//") || strings.Contains(got, "/*") {
		t.Errorf("注释没去干净：%q", got)
	}
	// 整行注释连同换行一起删掉，不留空行
	for _, line := range strings.Split(got, "\n") {
		if strings.TrimSpace(line) == "" {
			t.Errorf("留下了空行：%q", got)
		}
	}
	var decoded map[string]any
	if err := json.Unmarshal([]byte(got), &decoded); err != nil || decoded["id"] != "1" || decoded["ok"] != true {
		t.Errorf("内容被改坏了：%q", got)
	}
}

func TestNormalizeJSONCTrailingCommas(t *testing.T) {
	cases := []string{
		`["a","b",]`,
		`{"a":1,"b":2,}`,
		`{"a":[1,2,],"b":{"c":3,},}`,
		"{\n  \"a\": 1,\n}",
	}
	for _, in := range cases {
		got := normalizeJSONC(in)
		if !json.Valid([]byte(got)) {
			t.Errorf("尾随逗号未处理：%q -> %q", in, got)
		}
	}
}

func TestNormalizeJSONCKeepsBytes(t *testing.T) {
	// 超出 float64 精度的整数、字符串里的 //、键的顺序都必须原样保留：
	// 这正是「文本删除」而非「解析后重新序列化」的意义
	in := "{\n  \"amount\": 9007199254740993, // 注意精度\n  \"url\": \"https://x.dev//v2\",\n  \"z\": 1,\n  \"a\": 2\n}"
	got := normalizeJSONC(in)
	if !strings.Contains(got, "9007199254740993") {
		t.Errorf("大整数被改写：%q", got)
	}
	if !strings.Contains(got, `"https://x.dev//v2"`) {
		t.Errorf("字符串里的 // 被当成注释删掉了：%q", got)
	}
	if strings.Index(got, `"z"`) > strings.Index(got, `"a"`) {
		t.Errorf("键的顺序被重排：%q", got)
	}
}

func TestNormalizeJSONCFallsBack(t *testing.T) {
	cases := map[string]string{
		"合法 JSON 原样返回": `{"a":1}`,
		"空串":           "",
		"只有空白":         "  \n ",
		"未解析的变量占位符":    `{"token": {{token}} }`,
		"非 JSON 文本":    "hello // world",
		"JSON5 单引号":    `{'a':1}`,
		"JSON5 无引号键":   `{a:1}`,
		"连续逗号":         `[1,2,,]`,
		"只有逗号":         `[,]`,
		"缺右括号":         `{"a":1`,
	}
	for name, in := range cases {
		if got := normalizeJSONC(in); got != in {
			t.Errorf("%s：应原样返回，得到 %q", name, got)
		}
	}
}

func TestNormalizeJSONCPreservesUserBlankLines(t *testing.T) {
	in := "{\n  \"a\": 1,\n\n  \"b\": 2\n}"
	if got := normalizeJSONC(in); got != in {
		t.Errorf("合法 JSON 不该被动：%q", got)
	}
	// 夹着注释时，用户自己的空行仍在，注释行消失
	in2 := "{\n  \"a\": 1,\n\n  // 说明\n  \"b\": 2\n}"
	got := normalizeJSONC(in2)
	if want := "{\n  \"a\": 1,\n\n  \"b\": 2\n}"; got != want {
		t.Errorf("got=%q want=%q", got, want)
	}
}

func TestNormalizeJSONCIfDisabled(t *testing.T) {
	in := "{\n  // 注释\n  \"a\": 1\n}"
	if got := normalizeJSONCIf(false, in); got != in {
		t.Errorf("开关关闭时不应改写：%q", got)
	}
	if got := normalizeJSONCIf(true, in); got == in {
		t.Errorf("开关打开时应改写：%q", got)
	}
}

// TestSendJSONBodyWithComments 端到端：带注释的 JSON 请求体，服务端收到的必须是严格 JSON。
func TestSendJSONBodyWithComments(t *testing.T) {
	db := newTestDB(t)

	var received string
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		received = string(b)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))

	hs := newTestHTTPService(t, db)
	resp, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/echo",
		BodyType:    string(models.BodyTypeJSON),
		BodyContent: "{\n  // 说明\n  \"a\": 1,\n  \"b\": [1,2,],\n}",
	})
	if err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}

	if !json.Valid([]byte(received)) {
		t.Fatalf("服务端收到的不是合法 JSON：%q", received)
	}
	var decoded map[string]any
	_ = json.Unmarshal([]byte(received), &decoded)
	if decoded["a"] != float64(1) {
		t.Errorf("字段丢失：%q", received)
	}
	// 「实际请求」面板展示的就是真正发出去的字节
	if resp.ActualRequest.Body != received {
		t.Errorf("实际请求与发送内容不一致：%q vs %q", resp.ActualRequest.Body, received)
	}
}

// TestToCurlStripsJSONComments 导出的 cURL 命令要能直接跑，注释同样得去掉。
func TestToCurlStripsJSONComments(t *testing.T) {
	cs := NewCurlService(nil)
	cmd, err := cs.ToCurl(SendRequestData{
		Method: "POST", BaseURL: "https://api.dev", Path: "/x",
		BodyType:    string(models.BodyTypeJSON),
		BodyContent: "{\n  // 说明\n  \"a\": 1,\n}",
	})
	if err != nil {
		t.Fatalf("ToCurl err=%v", err)
	}
	if strings.Contains(cmd, "// 说明") {
		t.Errorf("导出的命令里还带着注释：%s", cmd)
	}
	if !strings.Contains(cmd, `"a": 1`) {
		t.Errorf("请求体丢了：%s", cmd)
	}
}
