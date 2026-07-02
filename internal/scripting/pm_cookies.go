package scripting

import (
	"github.com/dop251/goja"
)

// buildCookies 构建 pm.cookies（基于响应 cookie；无响应时为空）。
func buildCookies(vm *goja.Runtime, resp *ResponseData) *goja.Object {
	var cookies []Cookie
	if resp != nil {
		cookies = resp.Cookies
	}
	return buildCookieList(vm, cookies)
}

// buildCookieList 构建 CookieList 对象：has/get/toObject/jar。
func buildCookieList(vm *goja.Runtime, cookies []Cookie) *goja.Object {
	o := vm.NewObject()
	find := func(name string) (string, bool) {
		for _, c := range cookies {
			if c.Name == name {
				return c.Value, true
			}
		}
		return "", false
	}
	o.Set("has", func(call goja.FunctionCall) goja.Value {
		_, ok := find(call.Argument(0).String())
		return vm.ToValue(ok)
	})
	o.Set("get", func(call goja.FunctionCall) goja.Value {
		if v, ok := find(call.Argument(0).String()); ok {
			return vm.ToValue(v)
		}
		return goja.Undefined()
	})
	o.Set("toObject", func(goja.FunctionCall) goja.Value {
		m := make(map[string]string, len(cookies))
		for _, c := range cookies {
			m[c.Name] = c.Value
		}
		return vm.ToValue(m)
	})
	o.Set("count", func(goja.FunctionCall) goja.Value { return vm.ToValue(len(cookies)) })
	o.Set("jar", func(goja.FunctionCall) goja.Value { return buildCookieJar(vm) })
	return o
}

// buildCookieJar 构建一个内存 cookie jar，回调风格 (err, ...)。
// 第一版为进程内内存实现，不与真实请求的 cookie 存储联动。
func buildCookieJar(vm *goja.Runtime) *goja.Object {
	store := map[string]string{}
	jar := vm.NewObject()
	callback := func(call goja.FunctionCall, argIdx int, args ...interface{}) {
		if fn, ok := goja.AssertFunction(call.Argument(argIdx)); ok {
			vals := make([]goja.Value, 0, len(args)+1)
			vals = append(vals, goja.Null()) // err = null
			for _, a := range args {
				vals = append(vals, vm.ToValue(a))
			}
			_, _ = fn(goja.Undefined(), vals...)
		}
	}
	jar.Set("set", func(call goja.FunctionCall) goja.Value {
		// set(url, name, value, cb) 或 set(url, {name,value}, cb)
		if obj, ok := call.Argument(1).(*goja.Object); ok {
			store[obj.Get("name").String()] = obj.Get("value").String()
			callback(call, 2)
		} else {
			store[call.Argument(1).String()] = call.Argument(2).String()
			callback(call, 3)
		}
		return goja.Undefined()
	})
	jar.Set("get", func(call goja.FunctionCall) goja.Value {
		callback(call, 2, store[call.Argument(1).String()])
		return goja.Undefined()
	})
	jar.Set("getAll", func(call goja.FunctionCall) goja.Value {
		callback(call, 1, store)
		return goja.Undefined()
	})
	jar.Set("unset", func(call goja.FunctionCall) goja.Value {
		delete(store, call.Argument(1).String())
		callback(call, 2)
		return goja.Undefined()
	})
	jar.Set("clear", func(call goja.FunctionCall) goja.Value {
		for k := range store {
			delete(store, k)
		}
		callback(call, 1)
		return goja.Undefined()
	})
	return jar
}
