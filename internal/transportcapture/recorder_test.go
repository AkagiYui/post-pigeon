package transportcapture

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"mime/multipart"
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

func TestCaptureBodyMarksStructuredSecretFields(t *testing.T) {
	jsonBody := CaptureBody(strings.NewReader(`{"username":"alice","password":"p"}`), "application/json", "", 1024)
	if !jsonBody.Sensitive {
		t.Fatal("JSON password 字段应标记请求体敏感")
	}
	formBody := CaptureBody(strings.NewReader("name=alice&access_token=t"), "application/x-www-form-urlencoded", "", 1024)
	if !formBody.Sensitive {
		t.Fatal("表单 access_token 字段应标记请求体敏感")
	}
	publicBody := CaptureBody(strings.NewReader(`{"message":"public"}`), "application/json", "", 1024)
	if publicBody.Sensitive {
		t.Fatal("普通 JSON 不应误标敏感")
	}
}

func TestSnapshotRequestMarksSensitiveQueryFields(t *testing.T) {
	req, err := http.NewRequest(http.MethodGet, "https://example.test/items?access_token=live&q=public", nil)
	if err != nil {
		t.Fatal(err)
	}
	snapshot := SnapshotRequest(req, 1024)
	if !snapshot.URLSensitive {
		t.Fatal("敏感 query 参数名应标记 URL")
	}
}

func TestSnapshotRequestStructuresFormAndMultipartBodies(t *testing.T) {
	formReq, err := http.NewRequest(http.MethodPost, "https://example.test/form", strings.NewReader("name=alice&password=p"))
	if err != nil {
		t.Fatal(err)
	}
	formReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	form := SnapshotRequest(formReq, 1024).Body
	if len(form.Parts) != 2 || !form.Sensitive {
		t.Fatalf("URL encoded body 未结构化: %+v", form)
	}

	var payload bytes.Buffer
	writer := multipart.NewWriter(&payload)
	_ = writer.WriteField("token", "live")
	file, err := writer.CreateFormFile("avatar", "avatar.txt")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = file.Write([]byte("file-content"))
	_ = writer.Close()
	multipartReq, err := http.NewRequest(http.MethodPost, "https://example.test/upload", bytes.NewReader(payload.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	multipartReq.Header.Set("Content-Type", writer.FormDataContentType())
	multipartBody := SnapshotRequest(multipartReq, 4096).Body
	if len(multipartBody.Parts) != 2 || !multipartBody.Sensitive {
		t.Fatalf("multipart body 未结构化: %+v", multipartBody)
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
