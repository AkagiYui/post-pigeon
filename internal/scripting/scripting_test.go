package scripting

import (
	"strings"
	"testing"
	"time"
)

func timeoutForTest() time.Duration { return 500 * time.Millisecond }

// newTestStores 构建三套空作用域存储，Environment 可带初始值。
func newTestStores(env map[string]string) Stores {
	return Stores{
		Environment: NewVarStore(env),
		Globals:     NewVarStore(nil),
		Collection:  NewVarStore(nil),
	}
}

func TestRun_EmptyScriptNotExecuted(t *testing.T) {
	e := New()
	res := e.Run("   ", Options{Phase: PhasePreRequest, Stores: newTestStores(nil)})
	if res.Executed {
		t.Fatal("空脚本不应被标记为已执行")
	}
}

func TestConsoleCapture(t *testing.T) {
	e := New()
	res := e.Run(`
		console.log("hello", 42);
		console.warn("careful");
		console.debug({a: 1});
	`, Options{Phase: PhasePreRequest, Stores: newTestStores(nil)})
	if res.Error != "" {
		t.Fatalf("意外错误: %s", res.Error)
	}
	if len(res.Logs) != 3 {
		t.Fatalf("期望 3 条日志，得到 %d: %+v", len(res.Logs), res.Logs)
	}
	if res.Logs[0].Message != "hello 42" || res.Logs[0].Level != "log" {
		t.Errorf("首条日志不符: %+v", res.Logs[0])
	}
	if res.Logs[1].Level != "warn" {
		t.Errorf("第二条应为 warn: %+v", res.Logs[1])
	}
	if !strings.Contains(res.Logs[2].Message, `"a"`) {
		t.Errorf("对象日志应为 JSON: %+v", res.Logs[2])
	}
}

func TestEnvironmentGetSetPersistence(t *testing.T) {
	e := New()
	stores := newTestStores(map[string]string{"base": "v1", "drop": "x"})
	res := e.Run(`
		pm.environment.set("token", "abc");
		pm.environment.set("base", "v2");
		pm.environment.unset("drop");
		if (!pm.environment.has("token")) throw new Error("token should exist");
	`, Options{Phase: PhasePreRequest, Stores: stores})
	if res.Error != "" {
		t.Fatalf("意外错误: %s", res.Error)
	}
	if v, _ := stores.Environment.Get("token"); v != "abc" {
		t.Errorf("token = %q", v)
	}
	upserts, removed := stores.Environment.Changes()
	if upserts["token"] != "abc" || upserts["base"] != "v2" {
		t.Errorf("upserts 不符: %+v", upserts)
	}
	if len(removed) != 1 || removed[0] != "drop" {
		t.Errorf("removed 不符: %+v", removed)
	}
}

func TestVariablesMergedView(t *testing.T) {
	e := New()
	stores := newTestStores(map[string]string{"a": "env"})
	stores.Globals.Set("a", "glob") // globals 优先
	stores.Collection.Set("b", "coll")
	res := e.Run(`
		result = pm.variables.get("a") + "," + pm.variables.get("b") + "," + pm.variables.has("nope");
	`, Options{Phase: PhasePreRequest, Stores: stores})
	if res.Error != "" {
		t.Fatalf("意外错误: %s", res.Error)
	}
}

func TestPmTestAndExpect(t *testing.T) {
	e := New()
	res := e.Run(`
		pm.test("passes", function () {
			pm.expect(200).to.equal(200);
		});
		pm.test("fails", function () {
			pm.expect(1).to.equal(2);
		});
		pm.test("no assertion also passes", function () {});
	`, Options{Phase: PhasePostResponse, Stores: newTestStores(nil), Response: &ResponseData{Code: 200}})
	if res.Error != "" {
		t.Fatalf("意外错误: %s", res.Error)
	}
	if len(res.Tests) != 3 {
		t.Fatalf("期望 3 个测试，得到 %d", len(res.Tests))
	}
	if !res.Tests[0].Passed {
		t.Errorf("测试1应通过: %+v", res.Tests[0])
	}
	if res.Tests[1].Passed {
		t.Errorf("测试2应失败")
	}
	if res.Tests[1].Error == "" {
		t.Errorf("失败测试应带错误信息")
	}
	if !res.Tests[2].Passed {
		t.Errorf("测试3应通过")
	}
}

func TestPreRequestMutatesRequest(t *testing.T) {
	e := New()
	req := &RequestData{
		Method:  "GET",
		URL:     "https://api.example.com/{{path}}",
		Headers: []Header{{Key: "X-Old", Value: "1"}},
		Body:    "",
	}
	res := e.Run(`
		pm.request.method = "POST";
		pm.request.body = JSON.stringify({hello: "world"});
		pm.request.headers.add({key: "X-New", value: "n"});
		pm.request.headers.upsert("X-Old", "2");
		pm.request.headers.remove("X-Gone");
		if (pm.request.headers.get("X-Old") !== "2") throw new Error("upsert failed");
	`, Options{Phase: PhasePreRequest, Stores: newTestStores(nil), Request: req})
	if res.Error != "" {
		t.Fatalf("意外错误: %s", res.Error)
	}
	if req.Method != "POST" {
		t.Errorf("method = %q", req.Method)
	}
	if !strings.Contains(req.Body, "world") {
		t.Errorf("body = %q", req.Body)
	}
	if req.Headers[len(req.Headers)-1].Key != "X-New" {
		t.Errorf("应新增 X-New: %+v", req.Headers)
	}
	// X-Old 被 upsert 为 2
	found := false
	for _, h := range req.Headers {
		if h.Key == "X-Old" && h.Value == "2" {
			found = true
		}
	}
	if !found {
		t.Errorf("X-Old 应为 2: %+v", req.Headers)
	}
}

func TestResponseJSONAndSetBody(t *testing.T) {
	e := New()
	resp := &ResponseData{
		Code:    200,
		Status:  "OK",
		Headers: []Header{{Key: "Content-Type", Value: "application/json"}},
		Body:    `{"a": 1, "b": [2, 3]}`,
	}
	res := e.Run(`
		const data = pm.response.json();
		pm.test("has a", function () { pm.expect(data.a).to.equal(1); });
		pm.environment.set("b0", String(data.b[0]));
		pm.response.setBody({wrapped: data.a});
		pm.response.headers.upsert("Content-Type", "text/plain");
	`, Options{Phase: PhasePostResponse, Stores: newTestStores(nil), Response: resp})
	if res.Error != "" {
		t.Fatalf("意外错误: %s", res.Error)
	}
	if !res.Tests[0].Passed {
		t.Errorf("json 断言应通过: %+v", res.Tests[0])
	}
	if !strings.Contains(resp.Body, "wrapped") {
		t.Errorf("setBody 未生效: %q", resp.Body)
	}
	ct := ""
	for _, h := range resp.Headers {
		if h.Key == "Content-Type" {
			ct = h.Value
		}
	}
	if ct != "text/plain" {
		t.Errorf("Content-Type 应被改写: %q", ct)
	}
}

func TestRequireLibrariesValues(t *testing.T) {
	e := New()
	stores := newTestStores(nil)
	res := e.Run(`
		const _ = require('lodash');
		const CryptoJS = require('crypto-js');
		const uuid = require('uuid');
		pm.environment.set("sum", String(_.sum([1, 2, 3, 4])));
		pm.environment.set("md5", CryptoJS.MD5("hello").toString());
		pm.environment.set("uuidLen", String(uuid.v4().length));
	`, Options{Phase: PhasePreRequest, Stores: stores})
	if res.Error != "" {
		t.Fatalf("意外错误: %s", res.Error)
	}
	if v, _ := stores.Environment.Get("sum"); v != "10" {
		t.Errorf("lodash sum = %q", v)
	}
	if v, _ := stores.Environment.Get("md5"); v != "5d41402abc4b2a76b9719d911017c592" {
		t.Errorf("crypto-js md5 = %q", v)
	}
	if v, _ := stores.Environment.Get("uuidLen"); v != "36" {
		t.Errorf("uuid v4 长度 = %q", v)
	}
}

// TestRealApifoxDecryptScript 用真实的 Apifox 脚本（车来了响应解密）验证后置脚本端到端。
func TestRealApifoxDecryptScript(t *testing.T) {
	e := New()
	key := "422556651C7F7B2B5C266EED06068230"

	// 先用 CryptoJS 生成一个加密响应体作为夹具（与生产脚本使用相同算法）。
	fixtureStores := newTestStores(nil)
	fx := e.Run(`
		const CryptoJS = require('crypto-js');
		const key = CryptoJS.enc.Utf8.parse("`+key+`");
		const plain = JSON.stringify({name: "张三", id: 42});
		const ct = CryptoJS.AES.encrypt(plain, key, {mode: CryptoJS.mode.ECB}).toString();
		pm.environment.set("body", JSON.stringify({jsonr: {data: {encryptResult: ct}}}));
	`, Options{Phase: PhasePreRequest, Stores: fixtureStores})
	if fx.Error != "" {
		t.Fatalf("夹具生成失败: %s", fx.Error)
	}
	encryptedBody, _ := fixtureStores.Environment.Get("body")

	decryptScript := `
const CryptoJS = require('crypto-js')

function _decrypt(body) {
  console.debug('raw', body)
  const wrapper = ['**YGKJ', 'YGKJ##']
  const jsonText = (() => {
    if (body.startsWith(wrapper[0]) && body.endsWith(wrapper[1])) {
      return body.slice(wrapper[0].length, -wrapper[1].length)
    }
    return body
  })()

  var jsonObject
  try {
    jsonObject = JSON.parse(jsonText)
  } catch (error) {
    console.warn('JSON解析失败', error)
    return jsonText
  }

  const encryptData = jsonObject.jsonr?.data?.encryptResult
  if (encryptData === undefined) {
    return jsonObject
  }

  const key = CryptoJS.enc.Utf8.parse("` + key + `")
  const decryptedData = CryptoJS.AES.decrypt(encryptData, key, {
    mode: CryptoJS.mode.ECB
  })
  const decryptedText = decryptedData.toString(CryptoJS.enc.Utf8)
  jsonObject.jsonr.data = JSON.parse(decryptedText)
  return jsonObject
}

pm.response.setBody(_decrypt(pm.response.text()));
if (pm.response.headers.get('Content-Type') === 'application/octet-stream') {
  pm.response.headers.upsert('Content-Type', 'application/json');
}
`
	resp := &ResponseData{
		Code:    200,
		Status:  "OK",
		Headers: []Header{{Key: "Content-Type", Value: "application/octet-stream"}},
		Body:    encryptedBody,
	}
	res := e.Run(decryptScript, Options{Phase: PhasePostResponse, Stores: newTestStores(nil), Response: resp})
	if res.Error != "" {
		t.Fatalf("解密脚本执行失败: %s", res.Error)
	}
	if !strings.Contains(resp.Body, "张三") {
		t.Fatalf("响应体应被解密为含“张三”的明文，实际: %s", resp.Body)
	}
	// Content-Type 应被改写为 application/json
	ct := ""
	for _, h := range resp.Headers {
		if h.Key == "Content-Type" {
			ct = h.Value
		}
	}
	if ct != "application/json" {
		t.Errorf("Content-Type 应改写为 application/json，实际: %q", ct)
	}
}

func TestScriptErrorCaptured(t *testing.T) {
	e := New()
	res := e.Run(`throw new Error("boom");`, Options{Phase: PhasePreRequest, Stores: newTestStores(nil)})
	if res.Error == "" {
		t.Fatal("应捕获到脚本错误")
	}
	if !strings.Contains(res.Error, "boom") {
		t.Errorf("错误信息应包含 boom: %s", res.Error)
	}
}

func TestScriptTimeout(t *testing.T) {
	e := New()
	res := e.Run(`while (true) {}`, Options{Phase: PhasePreRequest, Stores: newTestStores(nil), Timeout: timeoutForTest()})
	if res.Error == "" {
		t.Fatal("死循环应因超时被中断")
	}
}
