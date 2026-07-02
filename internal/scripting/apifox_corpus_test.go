package scripting

import (
	"os"
	"strings"
	"testing"
)

// 本测试用从真实 Apifox 导出（tmp/杂项.apifox.json）中提取的脚本作为兼容性语料，
// 逐个在引擎中运行并断言成功，确保引擎覆盖真实用户脚本用到的 pm.* 面与内置库。

func readScript(t *testing.T, name string) string {
	t.Helper()
	b, err := os.ReadFile("testdata/apifox/" + name)
	if err != nil {
		t.Fatalf("读取脚本失败 %s: %v", name, err)
	}
	return string(b)
}

// pre_headers_query.js：前置脚本，pm.request.headers.add + pm.request.url.query.add
func TestApifox_PreHeadersQuery(t *testing.T) {
	e := New()
	req := &RequestData{Method: "GET", URL: "https://api.example.com/bus"}
	res := e.Run(readScript(t, "pre_headers_query.js"), Options{
		Phase: PhasePreRequest, Request: req, Stores: newTestStores(nil),
	})
	if res.Error != "" {
		t.Fatalf("脚本执行失败: %s", res.Error)
	}
	// Referer 头应被添加
	hasReferer := false
	for _, h := range req.Headers {
		if h.Key == "Referer" {
			hasReferer = true
		}
	}
	if !hasReferer {
		t.Errorf("应添加 Referer 头: %+v", req.Headers)
	}
	// url.query 应追加 s / v / src
	got := map[string]string{}
	for _, q := range req.Query {
		got[q.Key] = q.Value
	}
	if got["s"] != "h5" || got["v"] != "3.3.19" || got["src"] != "weixinapp_cx" {
		t.Errorf("query 追加不符: %+v", req.Query)
	}
}

// post_vqd_set.js：后置脚本，pm.response.headers.get + console.log + pm.environment.set
func TestApifox_PostVqdSet(t *testing.T) {
	e := New()
	stores := newTestStores(nil)
	resp := &ResponseData{
		Code:    200,
		Headers: []Header{{Key: "X-Vqd-4", Value: "token-xyz"}}, // 规范化大小写；get 应大小写不敏感
	}
	res := e.Run(readScript(t, "post_vqd_set.js"), Options{
		Phase: PhasePostResponse, Response: resp, Stores: stores,
	})
	if res.Error != "" {
		t.Fatalf("脚本执行失败: %s", res.Error)
	}
	if v, _ := stores.Environment.Get("vqd"); v != "token-xyz" {
		t.Errorf("vqd 应写入环境: %q", v)
	}
}

// post_chelaile_decrypt.js：后置脚本，require('crypto-js') + AES-ECB 解密 + setBody + headers.upsert
func TestApifox_PostChelaileDecrypt(t *testing.T) {
	e := New()
	key := "422556651C7F7B2B5C266EED06068230"

	// 用相同算法生成加密响应体作为夹具
	fx := newTestStores(nil)
	r := e.Run(`
		const CryptoJS = require('crypto-js');
		const key = CryptoJS.enc.Utf8.parse("`+key+`");
		const plain = JSON.stringify({name: "赣州", code: 39});
		const ct = CryptoJS.AES.encrypt(plain, key, {mode: CryptoJS.mode.ECB}).toString();
		pm.environment.set("body", JSON.stringify({jsonr: {data: {encryptResult: ct}}}));
	`, Options{Phase: PhasePreRequest, Stores: fx})
	if r.Error != "" {
		t.Fatalf("夹具生成失败: %s", r.Error)
	}
	body, _ := fx.Environment.Get("body")

	resp := &ResponseData{
		Code:    200,
		Headers: []Header{{Key: "Content-Type", Value: "application/octet-stream"}},
		Body:    body,
	}
	res := e.Run(readScript(t, "post_chelaile_decrypt.js"), Options{
		Phase: PhasePostResponse, Response: resp, Stores: newTestStores(nil),
	})
	if res.Error != "" {
		t.Fatalf("解密脚本执行失败: %s", res.Error)
	}
	if !strings.Contains(resp.Body, "赣州") {
		t.Fatalf("响应体应被解密，实际: %s", resp.Body)
	}
	ct := ""
	for _, h := range resp.Headers {
		if h.Key == "Content-Type" {
			ct = h.Value
		}
	}
	if ct != "application/json" {
		t.Errorf("Content-Type 应改写为 application/json: %q", ct)
	}
}
