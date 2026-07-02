package scripting

import (
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

// buildConsole 安装 console 全局对象，把日志捕获到 Result.Logs。
func buildConsole(vm *goja.Runtime, res *Result) {
	console := vm.NewObject()
	mk := func(level string) func(goja.FunctionCall) goja.Value {
		return func(call goja.FunctionCall) goja.Value {
			parts := make([]string, 0, len(call.Arguments))
			for _, a := range call.Arguments {
				parts = append(parts, stringify(vm, a))
			}
			res.Logs = append(res.Logs, LogEntry{Level: level, Message: strings.Join(parts, " ")})
			return goja.Undefined()
		}
	}
	console.Set("log", mk("log"))
	console.Set("info", mk("info"))
	console.Set("warn", mk("warn"))
	console.Set("error", mk("error"))
	console.Set("debug", mk("debug"))
	vm.Set("console", console)
}

// stringify 将 JS 值转为可读字符串：对象/数组用 JSON，其余用其字符串表示。
func stringify(vm *goja.Runtime, v goja.Value) string {
	if v == nil || goja.IsUndefined(v) {
		return "undefined"
	}
	if goja.IsNull(v) {
		return "null"
	}
	if obj, ok := v.(*goja.Object); ok {
		// 优先用 JSON.stringify，失败则回退到默认字符串
		if fn, ok := goja.AssertFunction(vm.Get("JSON").(*goja.Object).Get("stringify")); ok {
			if s, err := fn(goja.Undefined(), obj); err == nil && !goja.IsUndefined(s) {
				return s.String()
			}
		}
	}
	return v.String()
}

// buildPM 构建并注入 pm 全局对象。
func buildPM(vm *goja.Runtime, opts Options, res *Result) {
	pm := vm.NewObject()

	// pm.info
	info := vm.NewObject()
	info.Set("eventName", string(opts.Phase))
	reqName := ""
	if opts.Request != nil {
		reqName = opts.Request.Name
	}
	info.Set("requestName", reqName)
	info.Set("iteration", 0)
	info.Set("iterationCount", 1)
	pm.Set("info", info)

	// 变量作用域
	pm.Set("environment", newVarScope(vm, opts.Stores.Environment))
	pm.Set("globals", newVarScope(vm, opts.Stores.Globals))
	pm.Set("collectionVariables", newVarScope(vm, opts.Stores.Collection))
	// pm.variables 为跨作用域的只读合并视图（collection < environment < globals，后者优先）
	pm.Set("variables", newMergedScope(vm, opts.Stores))

	// pm.request
	if opts.Request != nil {
		pm.Set("request", buildRequest(vm, opts.Request))
	}

	// pm.response（仅后置）
	if opts.Response != nil {
		pm.Set("response", buildResponse(vm, opts.Response))
	}

	// pm.expect = chai.expect
	if expect := loadChaiExpect(vm); expect != nil {
		pm.Set("expect", expect)
	}

	// pm.test(name, fn)
	pm.Set("test", func(call goja.FunctionCall) goja.Value {
		name := call.Argument(0).String()
		tr := TestResult{Name: name, Passed: true}
		if fn, ok := goja.AssertFunction(call.Argument(1)); ok {
			if _, err := fn(goja.Undefined()); err != nil {
				tr.Passed = false
				tr.Error = err.Error()
			}
		}
		res.Tests = append(res.Tests, tr)
		return goja.Undefined()
	})

	vm.Set("pm", pm)
}

// loadChaiExpect 通过 require('chai') 取得 expect 函数。
func loadChaiExpect(vm *goja.Runtime) goja.Value {
	v, err := vm.RunString(`(function(){ try { return require('chai').expect; } catch(e){ return undefined; } })()`)
	if err != nil || v == nil || goja.IsUndefined(v) {
		return nil
	}
	return v
}

// newVarScope 构建一个绑定到给定 VarStore 的作用域对象（get/set/has/unset/clear/toObject）。
func newVarScope(vm *goja.Runtime, store *VarStore) *goja.Object {
	o := vm.NewObject()
	o.Set("get", func(call goja.FunctionCall) goja.Value {
		if store == nil {
			return goja.Undefined()
		}
		if v, ok := store.Get(call.Argument(0).String()); ok {
			return vm.ToValue(v)
		}
		return goja.Undefined()
	})
	o.Set("set", func(call goja.FunctionCall) goja.Value {
		if store != nil {
			store.Set(call.Argument(0).String(), valueToString(call.Argument(1)))
		}
		return goja.Undefined()
	})
	o.Set("has", func(call goja.FunctionCall) goja.Value {
		return vm.ToValue(store != nil && store.Has(call.Argument(0).String()))
	})
	o.Set("unset", func(call goja.FunctionCall) goja.Value {
		if store != nil {
			store.Unset(call.Argument(0).String())
		}
		return goja.Undefined()
	})
	o.Set("clear", func(goja.FunctionCall) goja.Value {
		if store != nil {
			store.Clear()
		}
		return goja.Undefined()
	})
	o.Set("toObject", func(goja.FunctionCall) goja.Value {
		if store == nil {
			return vm.ToValue(map[string]string{})
		}
		return vm.ToValue(store.ToMap())
	})
	// replaceIn: 替换字符串中的 {{var}} 占位符
	o.Set("replaceIn", func(call goja.FunctionCall) goja.Value {
		if store == nil {
			return call.Argument(0)
		}
		return vm.ToValue(resolvePlaceholders(call.Argument(0).String(), store.ToMap()))
	})
	return o
}

// newMergedScope 构建 pm.variables：跨作用域只读合并视图。
func newMergedScope(vm *goja.Runtime, stores Stores) *goja.Object {
	lookup := func(key string) (string, bool) {
		// 优先级：globals > environment > collection
		if stores.Globals != nil {
			if v, ok := stores.Globals.Get(key); ok {
				return v, true
			}
		}
		if stores.Environment != nil {
			if v, ok := stores.Environment.Get(key); ok {
				return v, true
			}
		}
		if stores.Collection != nil {
			if v, ok := stores.Collection.Get(key); ok {
				return v, true
			}
		}
		return "", false
	}
	o := vm.NewObject()
	o.Set("get", func(call goja.FunctionCall) goja.Value {
		if v, ok := lookup(call.Argument(0).String()); ok {
			return vm.ToValue(v)
		}
		return goja.Undefined()
	})
	o.Set("has", func(call goja.FunctionCall) goja.Value {
		_, ok := lookup(call.Argument(0).String())
		return vm.ToValue(ok)
	})
	// pm.variables.set 写入环境作用域（与 Postman 的行为近似）
	o.Set("set", func(call goja.FunctionCall) goja.Value {
		if stores.Environment != nil {
			stores.Environment.Set(call.Argument(0).String(), valueToString(call.Argument(1)))
		}
		return goja.Undefined()
	})
	o.Set("replaceIn", func(call goja.FunctionCall) goja.Value {
		merged := map[string]string{}
		for _, s := range []*VarStore{stores.Collection, stores.Environment, stores.Globals} {
			if s != nil {
				for k, v := range s.ToMap() {
					merged[k] = v
				}
			}
		}
		return vm.ToValue(resolvePlaceholders(call.Argument(0).String(), merged))
	})
	return o
}

// buildRequest 构建 pm.request：标量字段用访问器属性直接读写 RequestData；headers 用方法操作。
func buildRequest(vm *goja.Runtime, req *RequestData) *goja.Object {
	o := vm.NewObject()
	defineStringAccessor(vm, o, "method", func() string { return req.Method }, func(s string) { req.Method = s })
	defineStringAccessor(vm, o, "url", func() string { return req.URL }, func(s string) { req.URL = s })
	defineStringAccessor(vm, o, "body", func() string { return req.Body }, func(s string) { req.Body = s })
	o.Set("headers", buildHeaders(vm, &req.Headers))
	return o
}

// buildResponse 构建 pm.response。
func buildResponse(vm *goja.Runtime, resp *ResponseData) *goja.Object {
	o := vm.NewObject()
	o.Set("code", resp.Code)
	o.Set("status", resp.Status)
	o.Set("responseTime", resp.ResponseTime)
	o.Set("responseSize", resp.ResponseSize)
	o.Set("headers", buildHeaders(vm, &resp.Headers))
	o.Set("text", func(goja.FunctionCall) goja.Value {
		return vm.ToValue(resp.Body)
	})
	o.Set("json", func(goja.FunctionCall) goja.Value {
		parse, _ := goja.AssertFunction(vm.Get("JSON").(*goja.Object).Get("parse"))
		v, err := parse(goja.Undefined(), vm.ToValue(resp.Body))
		if err != nil {
			panic(vm.NewTypeError("响应体不是合法 JSON: " + err.Error()))
		}
		return v
	})
	o.Set("setBody", func(call goja.FunctionCall) goja.Value {
		arg := call.Argument(0)
		if obj, ok := arg.(*goja.Object); ok {
			// 传对象时序列化为 JSON 字符串
			resp.Body = stringify(vm, obj)
		} else {
			resp.Body = arg.String()
		}
		return goja.Undefined()
	})
	return o
}

// buildHeaders 构建 headers 操作对象：get/has/add/upsert/remove，直接修改底层切片。
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
	// keyValueFromCall 支持 add({key,value}) 与 add(key, value) 两种调用形式。
	keyValueFromCall := func(call goja.FunctionCall) (string, string) {
		if obj, ok := call.Argument(0).(*goja.Object); ok {
			return obj.Get("key").String(), obj.Get("value").String()
		}
		return call.Argument(0).String(), call.Argument(1).String()
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
		if i := indexOf(k); i >= 0 {
			(*headers)[i].Value = v
		} else {
			*headers = append(*headers, Header{Key: k, Value: v})
		}
		return goja.Undefined()
	})
	o.Set("remove", func(call goja.FunctionCall) goja.Value {
		if i := indexOf(call.Argument(0).String()); i >= 0 {
			*headers = append((*headers)[:i], (*headers)[i+1:]...)
		}
		return goja.Undefined()
	})
	o.Set("toObject", func(goja.FunctionCall) goja.Value {
		m := make(map[string]string, len(*headers))
		for _, h := range *headers {
			m[h.Key] = h.Value
		}
		return vm.ToValue(m)
	})
	return o
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

// valueToString 将 JS 值转为存储用字符串（对象序列化为 JSON）。
func valueToString(v goja.Value) string {
	if v == nil || goja.IsUndefined(v) || goja.IsNull(v) {
		return ""
	}
	return v.String()
}

// resolvePlaceholders 替换字符串中的 {{key}} 占位符。
func resolvePlaceholders(input string, vars map[string]string) string {
	if !strings.Contains(input, "{{") {
		return input
	}
	result := input
	for k, v := range vars {
		result = strings.ReplaceAll(result, fmt.Sprintf("{{%s}}", k), v)
	}
	return result
}
