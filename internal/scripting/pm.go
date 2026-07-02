package scripting

import (
	"time"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/eventloop"
)

// buildPM 构建并注入 pm 全局对象。chai-postman 断言插件与 legacy 别名在 prelude.js 中补齐。
func buildPM(vm *goja.Runtime, loop *eventloop.EventLoop, opts Options, res *Result) {
	pm := vm.NewObject()

	// pm.info
	info := vm.NewObject()
	info.Set("eventName", string(opts.Phase))
	name := opts.RequestName
	if name == "" && opts.Request != nil {
		name = opts.Request.Name
	}
	info.Set("requestName", name)
	info.Set("requestId", opts.RequestID)
	info.Set("iteration", 0)
	info.Set("iterationCount", 1)
	pm.Set("info", info)

	// 变量作用域
	buildVarScopes(vm, pm, opts.Stores)

	// pm.request（前置与后置均可读；前置可改）
	if opts.Request != nil {
		pm.Set("request", buildRequest(vm, opts.Request))
	}
	// pm.response（仅后置）
	if opts.Response != nil {
		pm.Set("response", buildResponse(vm, opts.Response))
	}

	// pm.cookies
	pm.Set("cookies", buildCookies(vm, opts.Response))

	// pm.sendRequest
	pm.Set("sendRequest", buildSendRequest(vm, loop, res))

	// pm.test（同步 / 异步(done) / skip / index）
	buildTest(vm, loop, pm, res)

	// pm.execution
	pm.Set("execution", buildExecution(vm, opts, res))

	vm.Set("pm", pm)
}

// buildTest 安装 pm.test 及其 skip / index。
func buildTest(vm *goja.Runtime, loop *eventloop.EventLoop, pm *goja.Object, res *Result) {
	index := 0

	testFn := func(call goja.FunctionCall) goja.Value {
		name := call.Argument(0).String()
		fn, ok := goja.AssertFunction(call.Argument(1))
		index++
		if !ok {
			res.Tests = append(res.Tests, TestResult{Name: name, Passed: true})
			return pm
		}
		// 判断是否为异步测试：回调声明了形参(done)
		isAsync := false
		if fnObj, ok := call.Argument(1).(*goja.Object); ok {
			if l := fnObj.Get("length"); l != nil && l.ToInteger() >= 1 {
				isAsync = true
			}
		}
		if !isAsync {
			tr := TestResult{Name: name, Passed: true}
			if _, err := fn(goja.Undefined()); err != nil {
				tr.Passed = false
				tr.Error = err.Error()
			}
			res.Tests = append(res.Tests, tr)
			return pm
		}
		// 异步：提供 done 回调；用保活定时器维持事件循环直至 done 被调用。
		idx := len(res.Tests)
		res.Tests = append(res.Tests, TestResult{Name: name, Passed: true})
		keepalive := loop.SetTimeout(func(*goja.Runtime) {}, time.Hour)
		finished := false
		done := func(call goja.FunctionCall) goja.Value {
			if finished {
				return goja.Undefined()
			}
			finished = true
			if len(call.Arguments) > 0 && !goja.IsUndefined(call.Argument(0)) && !goja.IsNull(call.Argument(0)) {
				res.Tests[idx].Passed = false
				res.Tests[idx].Error = call.Argument(0).String()
			}
			loop.ClearTimeout(keepalive)
			return goja.Undefined()
		}
		if _, err := fn(goja.Undefined(), vm.ToValue(done)); err != nil {
			if !finished {
				finished = true
				res.Tests[idx].Passed = false
				res.Tests[idx].Error = err.Error()
				loop.ClearTimeout(keepalive)
			}
		}
		return pm
	}

	fnVal := vm.ToValue(testFn).(*goja.Object)
	fnVal.Set("skip", func(call goja.FunctionCall) goja.Value {
		res.Tests = append(res.Tests, TestResult{Name: call.Argument(0).String(), Passed: true, Skipped: true})
		return goja.Undefined()
	})
	fnVal.Set("index", func(goja.FunctionCall) goja.Value { return vm.ToValue(index) })
	pm.Set("test", fnVal)
}

// buildExecution 安装 pm.execution（skipRequest / setNextRequest / location）。
func buildExecution(vm *goja.Runtime, opts Options, res *Result) *goja.Object {
	ex := vm.NewObject()
	ex.Set("skipRequest", func(goja.FunctionCall) goja.Value {
		res.SkipRequest = true
		return goja.Undefined()
	})
	ex.Set("setNextRequest", func(call goja.FunctionCall) goja.Value {
		arg := call.Argument(0)
		if goja.IsNull(arg) || goja.IsUndefined(arg) {
			empty := ""
			res.NextRequest = &empty // null → 停止运行
		} else {
			s := arg.String()
			res.NextRequest = &s
		}
		return goja.Undefined()
	})
	// location：当前项路径（单次发送场景仅含请求名）
	name := opts.RequestName
	if name == "" && opts.Request != nil {
		name = opts.Request.Name
	}
	loc := vm.NewArray(vm.ToValue(name))
	loc.Set("current", name)
	ex.Set("location", loc)
	return ex
}
