package services

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// uploadEchoServer 把收到的请求体原样回显，便于断言附件内容真的发出去了。
func uploadEchoServer(t *testing.T) (*httptest.Server, *string) {
	t.Helper()
	var received string
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		received = string(body)
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte("ok"))
	}))
	return srv, &received
}

// writeTempFile 造一个临时文件并返回路径。
func writeTempFile(t *testing.T, name, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("写临时文件失败: %v", err)
	}
	return path
}

// TestFormDataFileSendsFromPath 文件字段存的是路径，发送时才读盘。
func TestFormDataFileSendsFromPath(t *testing.T) {
	db := newTestDB(t)
	srv, received := uploadEchoServer(t)
	hs := newTestHTTPService(t, db)

	path := writeTempFile(t, "报告.txt", "文件里的内容")

	_, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/upload",
		BodyType: string(models.BodyTypeFormData),
		BodyFields: []models.EndpointBodyField{
			{Name: "attachment", FieldType: "file", Value: fileFieldJSON(path), Enabled: true},
			{Name: "note", FieldType: "text", Value: "hi", Enabled: true},
		},
	})
	if err != nil {
		t.Fatalf("发送失败: %v", err)
	}
	if !strings.Contains(*received, "文件里的内容") {
		t.Fatalf("附件内容没发出去: %s", *received)
	}
	if !strings.Contains(*received, `filename="报告.txt"`) {
		t.Fatalf("文件名没带上: %s", *received)
	}
	if !strings.Contains(*received, "hi") {
		t.Fatalf("普通字段丢了: %s", *received)
	}
}

// TestFormDataFileMissingReportsError 文件被移走时要给一个能看懂的错误，
// 而不是发出去一个空文件。
func TestFormDataFileMissingReportsError(t *testing.T) {
	db := newTestDB(t)
	srv, _ := uploadEchoServer(t)
	hs := newTestHTTPService(t, db)

	missing := filepath.Join(t.TempDir(), "已经不在了.png")

	_, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/upload",
		BodyType: string(models.BodyTypeFormData),
		BodyFields: []models.EndpointBodyField{
			{Name: "attachment", FieldType: "file", Value: fileFieldJSON(missing), Enabled: true},
		},
	})
	if err == nil {
		t.Fatal("文件不存在时应当报错")
	}
	if !strings.Contains(err.Error(), apperr.CodeRequestFileMissing) {
		t.Fatalf("错误码不对: %v", err)
	}
	if !strings.Contains(err.Error(), "已经不在了.png") {
		t.Fatalf("错误里应指出是哪个文件: %v", err)
	}
}

// TestFormDataFileLegacyBase64 历史数据里内联的 base64 仍然能发出去。
func TestFormDataFileLegacyBase64(t *testing.T) {
	db := newTestDB(t)
	srv, received := uploadEchoServer(t)
	hs := newTestHTTPService(t, db)

	legacy, _ := json.Marshal(map[string]string{
		"fileName": "老附件.txt",
		"content":  base64.StdEncoding.EncodeToString([]byte("历史内容")),
	})

	_, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/upload",
		BodyType: string(models.BodyTypeFormData),
		BodyFields: []models.EndpointBodyField{
			{Name: "attachment", FieldType: "file", Value: string(legacy), Enabled: true},
		},
	})
	if err != nil {
		t.Fatalf("历史数据应当仍能发送: %v", err)
	}
	if !strings.Contains(*received, "历史内容") {
		t.Fatalf("历史附件内容没发出去: %s", *received)
	}
}

// TestBinaryBodyFromPath Binary 请求体同样改成存路径。
func TestBinaryBodyFromPath(t *testing.T) {
	db := newTestDB(t)
	srv, received := uploadEchoServer(t)
	hs := newTestHTTPService(t, db)

	path := writeTempFile(t, "payload.bin", "二进制内容")

	_, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/raw",
		BodyType:    string(models.BodyTypeBinary),
		BodyContent: fileFieldJSON(path),
		ContentType: "application/octet-stream",
	})
	if err != nil {
		t.Fatalf("发送失败: %v", err)
	}
	if *received != "二进制内容" {
		t.Fatalf("请求体 = %q", *received)
	}
}

// TestCurlExportUsesPath 导出的 cURL 直接引用真实路径，命令拷出去就能跑。
func TestCurlExportUsesPath(t *testing.T) {
	db := newTestDB(t)
	path := writeTempFile(t, "上传.txt", "x")

	cmd, err := NewCurlService(db).ToCurl(SendRequestData{
		Method: "POST", BaseURL: "https://example.com", Path: "/upload",
		BodyType: string(models.BodyTypeFormData),
		BodyFields: []models.EndpointBodyField{
			{Name: "attachment", FieldType: "file", Value: fileFieldJSON(path), Enabled: true},
		},
	})
	if err != nil {
		t.Fatalf("生成 cURL 失败: %v", err)
	}
	if !strings.Contains(cmd, "@"+path) {
		t.Fatalf("cURL 里应引用真实路径: %s", cmd)
	}
}

// TestStatFile 界面据此提示「这个附件已经不在了」。
func TestStatFile(t *testing.T) {
	svc := NewFileService()
	path := writeTempFile(t, "在的.txt", "hello")

	ref := svc.StatFile(path)
	if !ref.Exists || ref.Size != int64(len("hello")) || ref.Name != "在的.txt" {
		t.Fatalf("已存在的文件读取有误: %+v", ref)
	}

	gone := svc.StatFile(filepath.Join(t.TempDir(), "没了.txt"))
	if gone.Exists || gone.Size != 0 {
		t.Fatalf("不存在的文件应标记为 Exists=false: %+v", gone)
	}
	if gone.Name != "没了.txt" {
		t.Fatalf("即使文件不在也该给出文件名: %+v", gone)
	}
	if empty := svc.StatFile(""); empty.Exists {
		t.Fatalf("空路径不该判定为存在: %+v", empty)
	}
}

// TestFormDataStreamsWithExactLength 流式发送时 multipart 仍然完整合法，
// 且 Content-Length 与实际字节数一致——长度算错的话服务端会直接读挂。
func TestFormDataStreamsWithExactLength(t *testing.T) {
	db := newTestDB(t)
	hs := newTestHTTPService(t, db)

	type received struct {
		declaredLength int64
		bodyLength     int64
		fileContent    string
		fileName       string
		textField      string
	}
	var got received

	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got.declaredLength = r.ContentLength
		counting := &countingReader{inner: r.Body}
		r.Body = io.NopCloser(counting)
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		got.bodyLength = counting.n
		got.textField = r.FormValue("note")
		if fh, header, err := r.FormFile("attachment"); err == nil {
			content, _ := io.ReadAll(fh)
			fh.Close()
			got.fileContent = string(content)
			got.fileName = header.Filename
		}
		_, _ = w.Write([]byte("ok"))
	}))

	content := strings.Repeat("流式内容", 5000) // 约 60 KB，跨多次 Read
	path := writeTempFile(t, "大附件.txt", content)

	if _, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/upload",
		BodyType: string(models.BodyTypeFormData),
		BodyFields: []models.EndpointBodyField{
			{Name: "note", FieldType: "text", Value: "hello", Enabled: true},
			{Name: "attachment", FieldType: "file", Value: fileFieldJSON(path), Enabled: true},
		},
	}); err != nil {
		t.Fatalf("发送失败: %v", err)
	}

	if got.fileContent != content {
		t.Fatalf("附件内容不完整：收到 %d 字节，期望 %d", len(got.fileContent), len(content))
	}
	if got.fileName != "大附件.txt" {
		t.Fatalf("文件名 = %q", got.fileName)
	}
	if got.textField != "hello" {
		t.Fatalf("文本字段 = %q", got.textField)
	}
	if got.declaredLength <= 0 {
		t.Fatal("应当带上 Content-Length（流式发送也要能算准长度）")
	}
	if got.declaredLength != got.bodyLength {
		t.Fatalf("Content-Length = %d，实际读到 %d 字节", got.declaredLength, got.bodyLength)
	}
}

// TestFormDataReplaysOnRedirect 307 会带着请求体重发一次，
// 附件必须能从头再读一遍——这正是 GetBody 的用处。
func TestFormDataReplaysOnRedirect(t *testing.T) {
	db := newTestDB(t)
	hs := newTestHTTPService(t, db)

	var hits int
	var lastFile string
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		if r.URL.Path == "/upload" {
			http.Redirect(w, r, "/final", http.StatusTemporaryRedirect)
			return
		}
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if fh, _, err := r.FormFile("attachment"); err == nil {
			content, _ := io.ReadAll(fh)
			fh.Close()
			lastFile = string(content)
		}
		_, _ = w.Write([]byte("ok"))
	}))

	path := writeTempFile(t, "重定向.txt", "重发之后仍然完整")

	if _, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/upload",
		BodyType: string(models.BodyTypeFormData),
		BodyFields: []models.EndpointBodyField{
			{Name: "attachment", FieldType: "file", Value: fileFieldJSON(path), Enabled: true},
		},
	}); err != nil {
		t.Fatalf("发送失败: %v", err)
	}

	if hits < 2 {
		t.Fatalf("应当发生了重定向重发，实际命中 %d 次", hits)
	}
	if lastFile != "重发之后仍然完整" {
		t.Fatalf("重发后的附件内容 = %q", lastFile)
	}
}

// countingReader 统计实际读到的字节数。
type countingReader struct {
	inner io.Reader
	n     int64
}

func (c *countingReader) Read(p []byte) (int, error) {
	n, err := c.inner.Read(p)
	c.n += int64(n)
	return n, err
}
