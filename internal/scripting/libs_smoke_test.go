package scripting

import (
	"testing"
)

// TestLibrariesSmoke 逐个 require 每个内置库并调用其核心 API，验证在 goja 中确实可用。
// 该测试的用例集即"官方支持的库集合"——清单(manifest.json)应与此保持一致。
func TestLibrariesSmoke(t *testing.T) {
	cases := []struct {
		name   string
		script string // 结果写入 pm.environment.set("r", ...)；抛错或结果为空/undefined 视为失败
	}{
		{"lodash", `const _=require('lodash'); pm.environment.set("r", String(_.sum([1,2,3])));`},
		{"crypto-js", `const C=require('crypto-js'); pm.environment.set("r", C.MD5("x").toString());`},
		{"chai", `const c=require('chai'); c.expect(1).to.equal(1); pm.environment.set("r","ok");`},
		{"moment", `const m=require('moment'); pm.environment.set("r", m("2020-01-02").format("YYYY"));`},
		{"uuid", `const u=require('uuid'); pm.environment.set("r", String(u.v4().length));`},
		{"atob", `const a=require('atob'); pm.environment.set("r", a("aGk="));`},
		{"btoa", `const b=require('btoa'); pm.environment.set("r", b("hi"));`},
		{"tv4", `const t=require('tv4'); pm.environment.set("r", String(t.validate(1,{type:"number"})));`},
		{"ajv", `const A=require('ajv'); const a=new A(); pm.environment.set("r", String(a.validate({type:"number"},1)));`},
		{"jsrsasign", `require('jsrsasign'); pm.environment.set("r", typeof KEYUTIL);`},
		{"mockjs", `const M=require('mockjs'); pm.environment.set("r", typeof M.mock);`},
		{"xml2js", `const x=require('xml2js'); let out=""; x.parseString("<a>1</a>",{explicitArray:false},(e,r)=>{out=r.a}); pm.environment.set("r", out);`},
		{"iconv-lite", `const ic=require('iconv-lite'); pm.environment.set("r", String(ic.encodingExists("utf8")));`},
		{"cheerio", `const ch=require('cheerio'); const $=ch.load("<h1>Hi</h1>"); pm.environment.set("r", $("h1").text());`},
		{"postman-collection", `const pc=require('postman-collection'); pm.environment.set("r", typeof pc.Request);`},
		// Node 内建
		{"events", `const E=require('events'); const e=new E(); let v=""; e.on("x",d=>{v=d}); e.emit("x","hi"); pm.environment.set("r", v);`},
		{"string_decoder", `const sd=require('string_decoder'); pm.environment.set("r", typeof sd.StringDecoder);`},
		{"path", `const p=require('path'); pm.environment.set("r", p.join("a","b"));`},
		{"querystring", `const q=require('querystring'); pm.environment.set("r", q.stringify({a:1}));`},
		{"punycode", `const pc=require('punycode'); pm.environment.set("r", typeof pc.encode);`},
		{"assert", `const as=require('assert'); as.equal(1,1); pm.environment.set("r","ok");`},
		{"util", `const u=require('util'); pm.environment.set("r", u.format("%s",7));`},
		{"url", `const U=require('url'); pm.environment.set("r", typeof U.URL);`},
		{"buffer", `const b=require('buffer'); pm.environment.set("r", typeof b.Buffer);`},
	}
	e := New()
	var failed []string
	for _, c := range cases {
		stores := newTestStores(nil)
		res := e.Run(c.script, Options{Phase: PhasePreRequest, Stores: stores})
		v, _ := stores.Environment.Get("r")
		if res.Error != "" || v == "" || v == "undefined" {
			failed = append(failed, c.name+" (err="+res.Error+", r="+v+")")
			t.Logf("LIB FAIL %s: err=%q r=%q", c.name, res.Error, v)
		} else {
			t.Logf("LIB OK   %s -> %q", c.name, v)
		}
	}
	if len(failed) > 0 {
		t.Errorf("以下库在 goja 中不可用（需从清单移除或修复）:\n  %v", failed)
	}
}
