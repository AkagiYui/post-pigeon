// 运行时预置脚本：在 pm.* 构建完成后、用户脚本执行前运行。
// 负责：TextEncoder/Decoder 垫片、chai + chai-postman 断言插件、pm.expect、
// pm.response.to 简写、以及 Postman/Apifox 的 legacy 兼容别名。
;(function () {
  var g = globalThis
  var pm = g.pm
  if (!pm) return

  // --- TextEncoder / TextDecoder 垫片（部分库依赖，基于 Buffer） ---
  if (typeof g.TextEncoder === "undefined" && typeof g.Buffer !== "undefined") {
    g.TextEncoder = function () {}
    g.TextEncoder.prototype.encode = function (s) { return new Uint8Array(g.Buffer.from(String(s), "utf8")) }
    g.TextDecoder = function () {}
    g.TextDecoder.prototype.decode = function (b) { return g.Buffer.from(b || []).toString("utf8") }
  }

  // --- chai + chai-postman 断言插件 ---
  var chai
  try { chai = require("chai") } catch (e) { chai = null }
  if (chai) {
    pm.expect = chai.expect
    g.expect = chai.expect

    chai.use(function (chai, utils) {
      var Assertion = chai.Assertion
      function resp(a) { return a._obj }
      function isResp(o) { return o && typeof o.code === "number" && o.headers }

      Assertion.addMethod("status", function (codeOrReason) {
        var r = resp(this)
        if (typeof codeOrReason === "number") {
          this.assert(r.code === codeOrReason,
            "expected response to have status code #{exp} but got #{act}",
            "expected response to not have status code #{act}", codeOrReason, r.code)
        } else {
          var reason = (r.status || "").toString()
          this.assert(reason.toLowerCase() === String(codeOrReason).toLowerCase(),
            "expected response to have status reason #{exp} but got #{act}",
            "expected response to not have status reason #{act}", codeOrReason, reason)
        }
      })

      Assertion.addMethod("header", function (key, value) {
        var r = resp(this)
        var has = r.headers && r.headers.has(key)
        this.assert(has, "expected response to have header '" + key + "'",
          "expected response to not have header '" + key + "'")
        if (arguments.length > 1) {
          var actual = r.headers.get(key)
          this.assert(actual === value, "expected header '" + key + "' to be #{exp} but got #{act}",
            "expected header '" + key + "' to not be #{act}", value, actual)
        }
      })

      Assertion.addMethod("body", function (expected) {
        var text = (resp(this).text ? resp(this).text() : "") || ""
        if (arguments.length === 0) {
          this.assert(text.length > 0, "expected response to have a body", "expected response to not have a body")
        } else if (expected instanceof RegExp) {
          this.assert(expected.test(text), "expected body to match " + expected, "expected body to not match " + expected)
        } else {
          this.assert(text === expected, "expected body to equal #{exp}", "expected body to not equal #{act}", expected, text)
        }
      })

      Assertion.addMethod("jsonBody", function (path, value) {
        var json
        try { json = resp(this).json() } catch (e) { this.assert(false, "expected body to be valid JSON"); return }
        if (arguments.length === 0) { this.assert(true, ""); return }
        if (typeof path === "object") { new chai.Assertion(json).to.deep.equal(path); return }
        var cur = json, parts = String(path).split(".")
        for (var i = 0; i < parts.length; i++) { cur = cur == null ? undefined : cur[parts[i]] }
        if (arguments.length > 1) {
          this.assert(cur === value, "expected jsonBody '" + path + "' to be #{exp} but got #{act}",
            "expected jsonBody '" + path + "' to not be #{act}", value, cur)
        } else {
          this.assert(cur !== undefined, "expected jsonBody to have path '" + path + "'",
            "expected jsonBody to not have path '" + path + "'")
        }
      })

      Assertion.addMethod("jsonSchema", function (schema) {
        var data
        try { data = resp(this).json ? resp(this).json() : resp(this) } catch (e) { data = undefined }
        var valid = false, errText = ""
        try {
          var tv4 = require("tv4")
          var res = tv4.validateResult(data, schema)
          valid = res.valid; if (!valid && res.error) errText = res.error.message
        } catch (e1) {
          try {
            var Ajv = require("ajv"); var ajv = new Ajv()
            valid = ajv.validate(schema, data); if (!valid) errText = ajv.errorsText()
          } catch (e2) { errText = "no json schema validator available" }
        }
        this.assert(valid, "expected body to match json schema: " + errText, "expected body to not match json schema")
      })

      function statusClass(name, lo, hi) {
        utils.addProperty(Assertion.prototype, name, function () {
          var c = resp(this).code
          this.assert(c >= lo && c <= hi, "expected response code " + c + " to be " + name,
            "expected response code " + c + " to not be " + name)
        })
      }
      statusClass("info", 100, 199); statusClass("success", 200, 299); statusClass("redirection", 300, 399)
      statusClass("clientError", 400, 499); statusClass("serverError", 500, 599)
      utils.addProperty(Assertion.prototype, "error", function () {
        if (!isResp(this._obj)) return
        var c = resp(this).code
        this.assert(c >= 400 && c <= 599, "expected error status but got " + c, "expected non-error status")
      })

      function statusCode(name, code) {
        utils.addProperty(Assertion.prototype, name, function () {
          var c = resp(this).code
          this.assert(c === code, "expected status #{exp} but got #{act}", "expected status not #{act}", code, c)
        })
      }
      statusCode("accepted", 202); statusCode("withoutContent", 204); statusCode("badRequest", 400)
      statusCode("unauthorized", 401); statusCode("unauthorised", 401); statusCode("forbidden", 403)
      statusCode("notFound", 404); statusCode("notAcceptable", 406); statusCode("rateLimited", 429)

      // ok 与 chai 内置冲突：仅当断言对象是响应时按 200 判定，否则回退默认行为。
      var origOk = Object.getOwnPropertyDescriptor(Assertion.prototype, "ok")
      utils.addProperty(Assertion.prototype, "ok", function () {
        if (isResp(this._obj)) {
          var c = resp(this).code
          this.assert(c === 200, "expected status 200 but got " + c, "expected status not 200")
        } else if (origOk && origOk.get) {
          origOk.get.call(this)
        }
      })

      utils.addProperty(Assertion.prototype, "json", function () {
        if (!isResp(this._obj)) return
        var ok = true; try { resp(this).json() } catch (e) { ok = false }
        this.assert(ok, "expected body to be valid JSON", "expected body to not be valid JSON")
      })
      utils.addProperty(Assertion.prototype, "withBody", function () {
        var t = (resp(this).text ? resp(this).text() : "") || ""
        this.assert(t.length > 0, "expected a non-empty body", "expected an empty body")
      })
    })

    // pm.response.to 简写
    if (pm.response) {
      Object.defineProperty(pm.response, "to", {
        configurable: true,
        get: function () { return chai.expect(pm.response).to },
      })
    }
  }

  // --- legacy 兼容别名 ---
  g.postman = {
    setEnvironmentVariable: function (k, v) { pm.environment.set(k, v) },
    getEnvironmentVariable: function (k) { return pm.environment.get(k) },
    clearEnvironmentVariable: function (k) { pm.environment.unset(k) },
    setGlobalVariable: function (k, v) { pm.globals.set(k, v) },
    getGlobalVariable: function (k) { return pm.globals.get(k) },
    clearGlobalVariable: function (k) { pm.globals.unset(k) },
    setNextRequest: function (n) { pm.execution.setNextRequest(n) },
  }
  g.tests = {}

  if (pm.response) {
    g.responseBody = pm.response.text()
    g.responseCode = { code: pm.response.code, name: pm.response.status, detail: "" }
    g.responseTime = pm.response.responseTime
    try { g.responseHeaders = pm.response.headers.toObject() } catch (e) {}
  }
  if (pm.request) {
    try {
      g.request = {
        url: String(pm.request.url),
        method: pm.request.method,
        headers: pm.request.headers.toObject(),
        data: pm.request.body,
      }
    } catch (e) {}
  }
  try { g.environment = pm.environment.toObject() } catch (e) {}
  try { g.globals = pm.globals.toObject() } catch (e) {}
  try { g.iterationData = pm.iterationData.toObject() } catch (e) {}

  g.xml2Json = function (s) {
    try {
      var x = require("xml2js"); var out = null
      x.parseString(String(s), { explicitArray: false, async: false }, function (e, r) { out = r })
      return out
    } catch (e) { return null }
  }
})()
