package scripting

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func fullStores() Stores {
	return Stores{
		Environment: NewVarStore(nil),
		Globals:     NewVarStore(nil),
		Collection:  NewVarStore(nil),
		Data:        NewVarStore(map[string]string{"dataKey": "dataVal"}),
		Local:       NewVarStore(nil),
		EnvName:     "dev",
	}
}

func mustNoError(t *testing.T, res *Result) {
	t.Helper()
	if res.Error != "" {
		t.Fatalf("脚本错误: %s", res.Error)
	}
}

// chai-postman 响应断言
func TestChaiPostmanAssertions(t *testing.T) {
	e := New()
	resp := &ResponseData{
		Code:    200,
		Status:  "OK",
		Headers: []Header{{Key: "Content-Type", Value: "application/json"}},
		Body:    `{"user":{"id":42},"ok":true}`,
	}
	res := e.Run(`
		pm.test("status number", () => pm.expect(pm.response).to.have.status(200));
		pm.test("status reason", () => pm.expect(pm.response).to.have.status("OK"));
		pm.test("success class", () => pm.expect(pm.response).to.be.success);
		pm.test("is ok 200", () => pm.expect(pm.response).to.be.ok);
		pm.test("is json", () => pm.expect(pm.response).to.be.json);
		pm.test("has header", () => pm.expect(pm.response).to.have.header("Content-Type"));
		pm.test("header value", () => pm.expect(pm.response).to.have.header("Content-Type", "application/json"));
		pm.test("jsonBody path", () => pm.expect(pm.response).to.have.jsonBody("user.id", 42));
		pm.test("response.to shorthand", () => pm.response.to.have.status(200));
		pm.test("not clientError", () => pm.expect(pm.response).to.not.be.clientError);
		pm.test("chai core still works", () => pm.expect(2 + 2).to.equal(4));
		pm.test("chai core ok still works", () => pm.expect("x").to.be.ok);
	`, Options{Phase: PhasePostResponse, Response: resp, Stores: fullStores()})
	mustNoError(t, res)
	for _, tr := range res.Tests {
		if !tr.Passed {
			t.Errorf("断言应通过但失败: %s -> %s", tr.Name, tr.Error)
		}
	}
	if len(res.Tests) != 12 {
		t.Fatalf("应有 12 个测试，实际 %d", len(res.Tests))
	}
}

func TestChaiPostmanFailingAssertion(t *testing.T) {
	e := New()
	resp := &ResponseData{Code: 404, Status: "Not Found", Body: "nope"}
	res := e.Run(`
		pm.test("expect 200 (should fail)", () => pm.expect(pm.response).to.have.status(200));
		pm.test("is notFound (should pass)", () => pm.expect(pm.response).to.be.notFound);
	`, Options{Phase: PhasePostResponse, Response: resp, Stores: fullStores()})
	mustNoError(t, res)
	if res.Tests[0].Passed {
		t.Error("期望 200 应失败")
	}
	if !res.Tests[1].Passed {
		t.Error("notFound 应通过")
	}
}

func TestAsyncTestWithDone(t *testing.T) {
	e := New()
	res := e.Run(`
		pm.test("async ok", function (done) {
			setTimeout(function () {
				pm.expect(1).to.equal(1);
				done();
			}, 20);
		});
		pm.test("async fail", function (done) {
			setTimeout(function () { done(new Error("boom")); }, 20);
		});
	`, Options{Phase: PhasePreRequest, Stores: fullStores()})
	mustNoError(t, res)
	if len(res.Tests) != 2 {
		t.Fatalf("应有 2 个异步测试，实际 %d", len(res.Tests))
	}
	if !res.Tests[0].Passed {
		t.Error("async ok 应通过")
	}
	if res.Tests[1].Passed {
		t.Error("async fail 应失败")
	}
}

func TestSendRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		body := make([]byte, r.ContentLength)
		if r.ContentLength > 0 {
			r.Body.Read(body)
		}
		w.WriteHeader(200)
		w.Write([]byte(`{"method":"` + r.Method + `","echo":"` + string(body) + `","x":"` + r.Header.Get("X-Test") + `"}`))
	}))
	defer server.Close()

	e := New()
	stores := fullStores()
	res := e.Run(`
		pm.sendRequest({
			url: "`+server.URL+`",
			method: "POST",
			header: { "X-Test": "hi", "Content-Type": "text/plain" },
			body: { mode: "raw", raw: "payload" }
		}, function (err, resp) {
			if (err) { pm.environment.set("err", String(err)); return; }
			pm.test("sendRequest 200", () => pm.expect(resp).to.have.status(200));
			var j = resp.json();
			pm.environment.set("method", j.method);
			pm.environment.set("echo", j.echo);
			pm.environment.set("xhdr", j.x);
		});
	`, Options{Phase: PhasePreRequest, Stores: stores})
	mustNoError(t, res)
	if v, _ := stores.Environment.Get("method"); v != "POST" {
		t.Errorf("method=%q err=%v", v, mustGet(stores, "err"))
	}
	if v, _ := stores.Environment.Get("echo"); v != "payload" {
		t.Errorf("echo=%q", v)
	}
	if v, _ := stores.Environment.Get("xhdr"); v != "hi" {
		t.Errorf("xhdr=%q", v)
	}
	if len(res.Tests) != 1 || !res.Tests[0].Passed {
		t.Errorf("sendRequest 内的断言应通过: %+v", res.Tests)
	}
}

func mustGet(s Stores, k string) string { v, _ := s.Environment.Get(k); return v }

func TestLegacyAliases(t *testing.T) {
	e := New()
	stores := fullStores()
	resp := &ResponseData{Code: 201, Status: "Created", Body: `{"a":1}`}
	res := e.Run(`
		postman.setEnvironmentVariable("le", "yes");
		postman.setGlobalVariable("lg", "g");
		tests["legacy test pass"] = (responseCode.code === 201);
		tests["body present"] = (responseBody.length > 0);
	`, Options{Phase: PhasePostResponse, Response: resp, Stores: stores})
	mustNoError(t, res)
	if v, _ := stores.Environment.Get("le"); v != "yes" {
		t.Errorf("postman.setEnvironmentVariable 失效: %q", v)
	}
	if v, _ := stores.Globals.Get("lg"); v != "g" {
		t.Errorf("postman.setGlobalVariable 失效: %q", v)
	}
	// legacy tests 应合并进结果
	got := map[string]bool{}
	for _, tr := range res.Tests {
		got[tr.Name] = tr.Passed
	}
	if !got["legacy test pass"] {
		t.Errorf("legacy tests['...'] 未合并或未通过: %+v", res.Tests)
	}
	if !got["body present"] {
		t.Errorf("responseBody 缺失: %+v", res.Tests)
	}
}

func TestVariablesPrecedenceAndIterationData(t *testing.T) {
	e := New()
	stores := fullStores()
	stores.Environment.Set("k", "env")
	stores.Collection.Set("k", "coll")
	stores.Globals.Set("k", "glob")
	res := e.Run(`
		// local 覆盖一切
		pm.variables.set("k", "local");
		pm.environment.set("r1", pm.variables.get("k"));       // local
		pm.environment.set("r2", pm.variables.get("dataKey")); // iterationData
		// iterationData 只读：set 不应存在
		pm.environment.set("ro", typeof pm.iterationData.set);
	`, Options{Phase: PhasePreRequest, Stores: stores})
	mustNoError(t, res)
	if v, _ := stores.Environment.Get("r1"); v != "local" {
		t.Errorf("precedence local 失败: %q", v)
	}
	if v, _ := stores.Environment.Get("r2"); v != "dataVal" {
		t.Errorf("iterationData 解析失败: %q", v)
	}
	if v, _ := stores.Environment.Get("ro"); v != "undefined" {
		t.Errorf("iterationData 应只读(set 不存在): %q", v)
	}
}

func TestExecutionSkipAndNext(t *testing.T) {
	e := New()
	res := e.Run(`pm.execution.skipRequest(); pm.execution.setNextRequest("Login");`,
		Options{Phase: PhasePreRequest, Stores: fullStores()})
	mustNoError(t, res)
	if !res.SkipRequest {
		t.Error("skipRequest 未生效")
	}
	if res.NextRequest == nil || *res.NextRequest != "Login" {
		t.Errorf("setNextRequest 未生效: %v", res.NextRequest)
	}
}

func TestRequestUrlAndHeaderConvenience(t *testing.T) {
	e := New()
	req := &RequestData{Method: "GET", URL: "https://api.example.com/v1/users?a=1", BaseURL: "https://api.example.com"}
	res := e.Run(`
		pm.environment.set("host", pm.request.url.getHost());
		pm.environment.set("path", pm.request.url.getPath());
		pm.environment.set("base", pm.request.getBaseUrl());
		pm.request.addHeader({ key: "X-A", value: "1" });
		pm.request.upsertHeader({ key: "X-A", value: "2" });
		pm.request.url.query.add({ key: "b", value: "2" });
	`, Options{Phase: PhasePreRequest, Request: req, Stores: fullStores()})
	mustNoError(t, res)
	envGet := func(k string) string { return "" }
	_ = envGet
	if req.Headers[0].Key != "X-A" || req.Headers[0].Value != "2" {
		t.Errorf("addHeader/upsertHeader 失败: %+v", req.Headers)
	}
	if len(req.Query) != 1 || req.Query[0].Key != "b" {
		t.Errorf("url.query.add 失败: %+v", req.Query)
	}
}

func TestTimeoutStillWorks(t *testing.T) {
	e := New()
	res := e.Run(`while(true){}`, Options{Phase: PhasePreRequest, Stores: fullStores(), Timeout: 400 * time.Millisecond})
	if res.Error == "" {
		t.Error("死循环应超时")
	}
}

// 确保 strings 被使用（避免 import 报错，若上面未直接用）
var _ = strings.Contains

// TestProcessEnvIsolated 确认脚本无法通过 process.env 读到宿主机环境变量。
func TestProcessEnvIsolated(t *testing.T) {
	t.Setenv("POSTPIGEON_SECRET", "topsecret")
	e := New()
	stores := fullStores()
	res := e.Run(`
		pm.environment.set("home", String(process.env.HOME));
		pm.environment.set("secret", String(process.env.POSTPIGEON_SECRET));
		pm.environment.set("viaRequire", String(require('process').env.POSTPIGEON_SECRET));
		pm.environment.set("envType", typeof process.env);
	`, Options{Phase: PhasePreRequest, Stores: stores})
	mustNoError(t, res)
	if v, _ := stores.Environment.Get("secret"); v != "undefined" {
		t.Errorf("宿主环境变量泄露到 process.env: secret=%q", v)
	}
	if v, _ := stores.Environment.Get("home"); v != "undefined" {
		t.Errorf("宿主 HOME 泄露: %q", v)
	}
	if v, _ := stores.Environment.Get("viaRequire"); v != "undefined" {
		t.Errorf("require('process').env 泄露宿主变量: %q", v)
	}
	if v, _ := stores.Environment.Get("envType"); v != "object" {
		t.Errorf("process.env 应为对象: %q", v)
	}
}
