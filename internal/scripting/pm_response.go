package scripting

import (
	"encoding/base64"
	"strings"

	"github.com/dop251/goja"
)

// buildResponse 构建 pm.response（可被后置脚本读取，并可通过 setBody / headers 改写）。
func buildResponse(vm *goja.Runtime, resp *ResponseData) *goja.Object {
	o := buildResponseObject(vm, resp, true)
	return o
}

// buildResponseObject 由 ResponseData 构建响应对象。mutable 为 true 时暴露 Apifox 的 setBody
// 并让 body/headers 的修改写回 resp（用于 pm.response）；sendRequest 的回调响应用 false。
func buildResponseObject(vm *goja.Runtime, resp *ResponseData, mutable bool) *goja.Object {
	o := vm.NewObject()
	o.Set("code", resp.Code)
	o.Set("status", resp.Status)
	o.Set("responseTime", resp.ResponseTime)
	o.Set("responseSize", resp.ResponseSize)
	o.Set("headers", buildHeaders(vm, &resp.Headers))

	o.Set("text", func(goja.FunctionCall) goja.Value { return vm.ToValue(resp.Body) })
	o.Set("json", func(call goja.FunctionCall) goja.Value {
		parse, _ := goja.AssertFunction(vm.Get("JSON").(*goja.Object).Get("parse"))
		v, err := parse(goja.Undefined(), vm.ToValue(resp.Body))
		if err != nil {
			panic(vm.NewTypeError("响应体不是合法 JSON: " + err.Error()))
		}
		return v
	})
	o.Set("reason", func(goja.FunctionCall) goja.Value { return vm.ToValue(resp.Status) })
	o.Set("size", func(goja.FunctionCall) goja.Value {
		s := vm.NewObject()
		s.Set("body", len(resp.Body))
		s.Set("header", 0)
		s.Set("total", len(resp.Body))
		return s
	})
	o.Set("dataURI", func(goja.FunctionCall) goja.Value {
		ct := headerValue(resp.Headers, "Content-Type")
		if ct == "" {
			ct = "application/octet-stream"
		}
		return vm.ToValue("data:" + ct + ";base64," + base64.StdEncoding.EncodeToString([]byte(resp.Body)))
	})
	o.Set("contentInfo", func(goja.FunctionCall) goja.Value {
		ct := headerValue(resp.Headers, "Content-Type")
		mime := ct
		charset := ""
		if i := strings.Index(ct, ";"); i >= 0 {
			mime = strings.TrimSpace(ct[:i])
			if j := strings.Index(strings.ToLower(ct), "charset="); j >= 0 {
				charset = strings.TrimSpace(ct[j+len("charset="):])
			}
		}
		info := vm.NewObject()
		info.Set("mimeType", mime)
		info.Set("charset", charset)
		return info
	})
	o.Set("cookies", buildCookieList(vm, resp.Cookies))

	if mutable {
		o.Set("setBody", func(call goja.FunctionCall) goja.Value {
			arg := call.Argument(0)
			if obj, ok := arg.(*goja.Object); ok {
				resp.Body = stringify(vm, obj)
			} else {
				resp.Body = arg.String()
			}
			return goja.Undefined()
		})
	}
	return o
}

// headerValue 大小写不敏感取头值。
func headerValue(headers []Header, key string) string {
	for _, h := range headers {
		if strings.EqualFold(h.Key, key) {
			return h.Value
		}
	}
	return ""
}
