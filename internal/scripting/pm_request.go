package scripting

import (
	"net/url"
	"strings"

	"github.com/dop251/goja"
)

// buildRequest 构建 pm.request。
func buildRequest(vm *goja.Runtime, req *RequestData) *goja.Object {
	o := vm.NewObject()
	defineStringAccessor(vm, o, "method", func() string { return req.Method }, func(s string) { req.Method = s })
	defineStringAccessor(vm, o, "body", func() string { return req.Body }, func(s string) { req.Body = s })
	o.Set("headers", buildHeaders(vm, &req.Headers))

	getter := vm.ToValue(func(goja.FunctionCall) goja.Value { return buildURL(vm, req) })
	setter := vm.ToValue(func(call goja.FunctionCall) goja.Value {
		req.URL = call.Argument(0).String()
		return goja.Undefined()
	})
	o.DefineAccessorProperty("url", getter, setter, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// 便捷方法（Postman）
	o.Set("addHeader", func(call goja.FunctionCall) goja.Value {
		k, v := keyValueFromCall(call)
		req.Headers = append(req.Headers, Header{Key: k, Value: v})
		return goja.Undefined()
	})
	o.Set("removeHeader", func(call goja.FunctionCall) goja.Value {
		removeHeader(&req.Headers, call.Argument(0).String())
		return goja.Undefined()
	})
	o.Set("upsertHeader", func(call goja.FunctionCall) goja.Value {
		k, v := keyValueFromCall(call)
		upsertHeader(&req.Headers, k, v)
		return goja.Undefined()
	})
	o.Set("getBaseUrl", func(goja.FunctionCall) goja.Value { return vm.ToValue(req.BaseURL) })
	return o
}

// buildURL 构建 pm.request.url（含 query PropertyList，toString/valueOf 返回完整 URL）。
func buildURL(vm *goja.Runtime, req *RequestData) *goja.Object {
	o := vm.NewObject()
	o.Set("query", buildHeaders(vm, &req.Query))
	o.Set("toString", func(goja.FunctionCall) goja.Value { return vm.ToValue(req.URL) })
	o.Set("valueOf", func(goja.FunctionCall) goja.Value { return vm.ToValue(req.URL) })
	o.Set("getHost", func(goja.FunctionCall) goja.Value {
		if u, err := url.Parse(req.URL); err == nil {
			return vm.ToValue(u.Host)
		}
		return vm.ToValue("")
	})
	o.Set("getPath", func(goja.FunctionCall) goja.Value {
		if u, err := url.Parse(req.URL); err == nil {
			return vm.ToValue(u.Path)
		}
		return vm.ToValue("")
	})
	o.Set("getRemote", func(goja.FunctionCall) goja.Value {
		if u, err := url.Parse(req.URL); err == nil {
			return vm.ToValue(u.Host)
		}
		return vm.ToValue("")
	})
	return o
}

// buildHeaders 构建 PropertyList 风格的头/查询对象。
func buildHeaders(vm *goja.Runtime, headers *[]Header) *goja.Object {
	o := vm.NewObject()
	indexOf := func(key string) int {
		for i, h := range *headers {
			if strings.EqualFold(h.Key, key) {
				return i
			}
		}
		return -1
	}
	o.Set("get", func(call goja.FunctionCall) goja.Value {
		if i := indexOf(call.Argument(0).String()); i >= 0 {
			return vm.ToValue((*headers)[i].Value)
		}
		return goja.Undefined()
	})
	o.Set("has", func(call goja.FunctionCall) goja.Value {
		return vm.ToValue(indexOf(call.Argument(0).String()) >= 0)
	})
	o.Set("add", func(call goja.FunctionCall) goja.Value {
		k, v := keyValueFromCall(call)
		*headers = append(*headers, Header{Key: k, Value: v})
		return goja.Undefined()
	})
	o.Set("upsert", func(call goja.FunctionCall) goja.Value {
		k, v := keyValueFromCall(call)
		upsertHeader(headers, k, v)
		return goja.Undefined()
	})
	o.Set("remove", func(call goja.FunctionCall) goja.Value {
		removeHeader(headers, call.Argument(0).String())
		return goja.Undefined()
	})
	o.Set("count", func(goja.FunctionCall) goja.Value { return vm.ToValue(len(*headers)) })
	o.Set("all", func(goja.FunctionCall) goja.Value {
		return vm.ToValue(append([]Header(nil), *headers...))
	})
	o.Set("toObject", func(goja.FunctionCall) goja.Value {
		m := make(map[string]string, len(*headers))
		for _, h := range *headers {
			m[h.Key] = h.Value
		}
		return vm.ToValue(m)
	})
	o.Set("each", func(call goja.FunctionCall) goja.Value {
		if fn, ok := goja.AssertFunction(call.Argument(0)); ok {
			for _, h := range *headers {
				item := vm.NewObject()
				item.Set("key", h.Key)
				item.Set("value", h.Value)
				if _, err := fn(goja.Undefined(), item); err != nil {
					panic(err)
				}
			}
		}
		return goja.Undefined()
	})
	return o
}

// keyValueFromCall 支持 add({key,value}) 与 add(key, value) 两种调用形式。
func keyValueFromCall(call goja.FunctionCall) (string, string) {
	if obj, ok := call.Argument(0).(*goja.Object); ok {
		return obj.Get("key").String(), obj.Get("value").String()
	}
	return call.Argument(0).String(), call.Argument(1).String()
}

func upsertHeader(headers *[]Header, key, value string) {
	for i := range *headers {
		if strings.EqualFold((*headers)[i].Key, key) {
			(*headers)[i].Value = value
			return
		}
	}
	*headers = append(*headers, Header{Key: key, Value: value})
}

func removeHeader(headers *[]Header, key string) {
	for i := range *headers {
		if strings.EqualFold((*headers)[i].Key, key) {
			*headers = append((*headers)[:i], (*headers)[i+1:]...)
			return
		}
	}
}

// defineStringAccessor 在对象上定义一个字符串访问器属性（getter/setter 直连 Go 字段）。
func defineStringAccessor(vm *goja.Runtime, o *goja.Object, name string, get func() string, set func(string)) {
	getter := vm.ToValue(func(goja.FunctionCall) goja.Value { return vm.ToValue(get()) })
	setter := vm.ToValue(func(call goja.FunctionCall) goja.Value {
		set(call.Argument(0).String())
		return goja.Undefined()
	})
	o.DefineAccessorProperty(name, getter, setter, goja.FLAG_FALSE, goja.FLAG_TRUE)
}
