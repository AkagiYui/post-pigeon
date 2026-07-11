package scripting

import (
	"encoding/base64"
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
		if fn, ok := goja.AssertFunction(vm.Get("JSON").(*goja.Object).Get("stringify")); ok {
			if s, err := fn(goja.Undefined(), obj); err == nil && !goja.IsUndefined(s) {
				return s.String()
			}
		}
	}
	return v.String()
}

// buildGlobals 安装常用全局：atob/btoa、self/global 别名。
// （setTimeout/setInterval 由事件循环安装；Buffer/process/URL 由 goja_nodejs 安装；
//  TextEncoder/TextDecoder、xml2Json 等在 prelude.js 中安装。）
func buildGlobals(vm *goja.Runtime) {
	vm.Set("btoa", func(call goja.FunctionCall) goja.Value { return encodeBase64(vm, call) })
	vm.Set("atob", func(call goja.FunctionCall) goja.Value { return decodeBase64(vm, call) })
	vm.Set("self", vm.GlobalObject())
	vm.Set("global", vm.GlobalObject())
	// 部分打包库（jsrsasign、jspm 内核垫片）会读取 navigator。
	nav := vm.NewObject()
	nav.Set("userAgent", "PostPigeon-goja")
	nav.Set("platform", "")
	nav.Set("language", "en")
	vm.Set("navigator", nav)
	vm.Set("window", vm.GlobalObject()) // jsrsasign 等浏览器库依赖 window
	vm.Set("process", buildProcess(vm))
}

// buildProcess 构建一个最小化的 process 对象。
// 关键：env 为空对象，绝不把宿主机环境变量暴露给脚本（隔离要求）。
func buildProcess(vm *goja.Runtime) *goja.Object {
	p := vm.NewObject()
	p.Set("env", vm.NewObject())        // 空 env：不泄露宿主环境变量
	p.Set("argv", []string{"node", ""}) // 占位
	p.Set("platform", "")
	p.Set("arch", "")
	p.Set("version", "v18.0.0")
	p.Set("versions", map[string]string{"node": "18.0.0"})
	p.Set("browser", false)
	p.Set("cwd", func(goja.FunctionCall) goja.Value { return vm.ToValue("/") })
	// nextTick：交给事件循环下一拍执行（依赖已安装的 setTimeout）
	p.Set("nextTick", func(call goja.FunctionCall) goja.Value {
		fn, ok := goja.AssertFunction(call.Argument(0))
		if !ok {
			return goja.Undefined()
		}
		if st, ok := goja.AssertFunction(vm.Get("setTimeout")); ok {
			extra := append([]goja.Value{vm.ToValue(fn), vm.ToValue(0)}, call.Arguments[1:]...)
			_, _ = st(goja.Undefined(), extra...)
		}
		return goja.Undefined()
	})
	return p
}

// encodeBase64 实现 btoa。
func encodeBase64(vm *goja.Runtime, call goja.FunctionCall) goja.Value {
	return vm.ToValue(base64.StdEncoding.EncodeToString([]byte(call.Argument(0).String())))
}

// decodeBase64 实现 atob。
func decodeBase64(vm *goja.Runtime, call goja.FunctionCall) goja.Value {
	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(call.Argument(0).String()))
	if err != nil {
		panic(vm.NewTypeError("atob: 非法的 base64 输入: " + err.Error()))
	}
	return vm.ToValue(string(decoded))
}
