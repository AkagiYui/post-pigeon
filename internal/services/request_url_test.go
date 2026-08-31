package services

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"

	"github.com/coder/websocket"
)

func TestRequestURLVariableResolution(t *testing.T) {
	var wrongTargetHits atomic.Int32
	wrong := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		wrongTargetHits.Add(1)
		_, _ = w.Write([]byte("wrong target"))
	}))
	defer wrong.Close()
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(r.URL.RequestURI()))
	}))
	defer target.Close()

	for _, tc := range []struct {
		name, base, path, host, before, after, want string
	}{
		{name: "absolute variable ignores base", base: wrong.URL, path: "{{HOST}}/users", host: target.URL, want: "/users"},
		{name: "relative variable keeps base", base: target.URL, path: "{{HOST}}/users", host: "/v1", want: "/v1/users"},
		{name: "nested variable", base: wrong.URL, path: "{{NESTED}}/users", host: target.URL, want: "/users"},
		{name: "base variable", base: "{{HOST}}/v1", path: "/users", host: target.URL, want: "/v1/users"},
		{name: "absolute path ignores undefined base", base: "{{MISSING}}", path: "{{HOST}}/users", host: target.URL, want: "/users"},
		{name: "script changes relative to absolute", base: wrong.URL, path: "{{HOST}}/users", host: "/v1", before: fmt.Sprintf(`pm.environment.set('HOST', %q);`, target.URL), want: "/users"},
		{name: "script changes absolute to relative", base: target.URL, path: "{{HOST}}/users", host: wrong.URL, before: `pm.environment.set('HOST', '/v2');`, want: "/v2/users"},
		{name: "script overrides URL", base: wrong.URL, path: "/ignored", host: target.URL, before: `pm.request.url = '{{HOST}}/override';`, want: "/override"},
		{name: "post-divider supplies missing variable", base: wrong.URL, path: "{{LATE}}/users", after: fmt.Sprintf(`pm.environment.set('LATE', %q);`, target.URL), want: "/users"},
		{name: "post-divider relative override", base: target.URL + "/v1", path: "/ignored", after: `pm.request.url = '/override';`, want: "/v1/override"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db := newTestDB(t)
			project := mustCreateProject(t, db, "URL variables")
			environment := firstEnvironment(t, db, project.ID)
			if err := NewEnvironmentService(db).SaveEnvironmentVariables(environment.ID, []models.EnvironmentVariable{
				{Key: "HOST", Value: tc.host, Enabled: true},
				{Key: "NESTED", Value: "{{HOST}}", Enabled: true},
			}); err != nil {
				t.Fatal(err)
			}
			data := SendRequestData{
				EnvironmentID: environment.ID, Method: "GET", BaseURL: tc.base, Path: tc.path,
				PreRequestScript: tc.before, PreSendScript: tc.after,
			}
			// cURL 导出不执行前置脚本，但应与无脚本请求使用完全相同的 URL 解析。
			if tc.before == "" && tc.after == "" {
				command, err := NewCurlService(db).ToCurl(data)
				if err != nil || !strings.Contains(command, "'"+target.URL+tc.want+"'") {
					t.Fatalf("curl URL mismatch: %s, err=%v", command, err)
				}
				data.PreSendScript = fmt.Sprintf(`if (pm.request.url.toString() !== %q) throw new Error('unresolved URL at divider');`, target.URL+tc.want)
			}
			resp, err := newTestHTTPService(t, db).SendRequest(data)
			if err != nil {
				t.Fatal(err)
			}
			if resp.Body != tc.want || resp.ActualRequest.URL != target.URL+tc.want {
				t.Fatalf("unexpected request: body=%q actual=%+v", resp.Body, resp.ActualRequest)
			}
			if resp.Scripts != nil && resp.Scripts.PreRequest != nil && resp.Scripts.PreRequest.Error != "" {
				t.Fatal(resp.Scripts.PreRequest.Error)
			}
		})
	}
	if wrongTargetHits.Load() != 0 {
		t.Fatalf("sent %d requests to ignored base URL", wrongTargetHits.Load())
	}
}

func TestUnresolvedURLDoesNotSendOrExport(t *testing.T) {
	var hits atomic.Int32
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { hits.Add(1) }))
	defer target.Close()
	db := newTestDB(t)
	hs := newTestHTTPService(t, db)
	ws := NewWebSocketService(db, hs)
	t.Cleanup(func() { _ = ws.ServiceShutdown() })
	for _, path := range []string{"{{HOST}}/users", "/{{id}}"} {
		data := SendRequestData{
			Method: "GET", BaseURL: target.URL, Path: path,
			Params: []models.EndpointParam{{Name: "id", Type: "path", Value: "123", Enabled: true}},
		}
		_, httpErr := hs.SendRequest(data)
		_, wsErr := ws.Connect("unresolved", data, true)
		_, curlErr := NewCurlService(db).ToCurl(data)
		for name, err := range map[string]error{"http": httpErr, "ws": wsErr, "curl": curlErr} {
			if apperr.Code(err) != apperr.CodeUnresolvedURLVariable {
				t.Errorf("%s: expected unresolved variable error, got %v", name, err)
			}
		}
	}
	if hits.Load() != 0 {
		t.Fatalf("unresolved URLs reached the server %d times", hits.Load())
	}
}

func TestWebSocketURLVariableResolution(t *testing.T) {
	paths := make(chan string, 4)
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		paths <- r.URL.Path
		_, _, _ = conn.Read(r.Context())
		_ = conn.Close(websocket.StatusNormalClosure, "done")
	}))
	defer target.Close()
	for _, absolute := range []bool{false, true} {
		t.Run(fmt.Sprint(absolute), func(t *testing.T) {
			db := newTestDB(t)
			hs := newTestHTTPService(t, db)
			ws := NewWebSocketService(db, hs)
			t.Cleanup(func() { _ = ws.ServiceShutdown() })
			base, host, want := target.URL, "/v1", "/v1/socket"
			if absolute {
				base, host, want = "http://127.0.0.1:1", target.URL, "/socket"
			}
			resp, err := ws.Connect("resolved", SendRequestData{
				Method: "GET", BaseURL: base, Path: "{{HOST}}/socket",
				PreRequestScript: fmt.Sprintf(`pm.environment.set('HOST', %q);`, host),
				PreSendScript:    fmt.Sprintf(`if (pm.request.url.toString() !== %q) throw new Error('unresolved URL at divider');`, target.URL+want),
			}, true)
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != http.StatusSwitchingProtocols {
				t.Fatalf("status: %d", resp.StatusCode)
			}
			if resp.Scripts.PreRequest.Error != "" {
				t.Fatal(resp.Scripts.PreRequest.Error)
			}
			if got := <-paths; got != want {
				t.Fatalf("path=%q want=%q", got, want)
			}
			_ = ws.Close("resolved")
		})
	}
}
