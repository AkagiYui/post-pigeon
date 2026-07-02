// Package scripting 提供 Postman/Apifox 风格的前置(pre-request)与后置(post-response)脚本运行时。
//
// 基于纯 Go 的 goja 引擎 + goja_nodejs 事件循环实现，力求对齐 Apifox 的
// postman-script-api 与 js-libraries：
//   - 完整 pm.* API（变量作用域、request/response、test/expect、chai-postman 断言、
//     sendRequest、cookies、execution、legacy 别名）
//   - 事件循环：支持 pm.sendRequest、异步 pm.test(done)、setTimeout/setInterval
//   - 通过 require() 提供内置 JS 库（见 libs/manifest.json）
package scripting

import (
	"embed"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/buffer"
	"github.com/dop251/goja_nodejs/eventloop"
	"github.com/dop251/goja_nodejs/process"
	"github.com/dop251/goja_nodejs/require"
	nodeurl "github.com/dop251/goja_nodejs/url"
	"github.com/google/uuid"
)

//go:embed libs/*.js libs/manifest.json runtime/*.js
var libsFS embed.FS

// DefaultTimeout 是单个脚本的默认执行超时。
const DefaultTimeout = 10 * time.Second

// Phase 表示脚本的执行阶段，对应 pm.info.eventName。
type Phase string

const (
	// PhasePreRequest 前置脚本（请求发送前）。
	PhasePreRequest Phase = "prerequest"
	// PhasePostResponse 后置脚本（响应返回后），Postman 中称为 "test"。
	PhasePostResponse Phase = "test"
)

// RequestData 是脚本可读写的请求数据。前置脚本对它的修改会应用到实际发送的请求上。
type RequestData struct {
	Name    string
	Method  string
	URL     string
	BaseURL string
	Headers []Header
	Body    string
	Query   []Header
}

// ResponseData 是后置脚本可读的响应数据；setBody / headers 的修改会写回最终响应。
type ResponseData struct {
	Code         int
	Status       string
	Headers      []Header
	Body         string
	ResponseTime int64
	ResponseSize int64
	Cookies      []Cookie
}

// Cookie 表示一个 cookie（供 pm.cookies / pm.response.cookies）。
type Cookie struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// Stores 汇集各作用域的变量存储。仅 Environment/Globals/Collection 会被调用方持久化。
type Stores struct {
	Environment *VarStore
	Globals     *VarStore
	Collection  *VarStore
	Data        *VarStore // iterationData（只读）
	Local       *VarStore // pm.variables 的本地层（脚本内临时）
	EnvName     string
}

// LogEntry 是被捕获的一条 console 输出。
type LogEntry struct {
	Level   string `json:"level"`
	Message string `json:"message"`
}

// TestResult 是一次 pm.test 的结果。
type TestResult struct {
	Name    string `json:"name"`
	Passed  bool   `json:"passed"`
	Skipped bool   `json:"skipped,omitempty"`
	Error   string `json:"error,omitempty"`
}

// Result 汇总一次脚本执行的产出。
type Result struct {
	Executed    bool         `json:"executed"`
	Logs        []LogEntry   `json:"logs"`
	Tests       []TestResult `json:"tests"`
	Error       string       `json:"error,omitempty"`
	Duration    int64        `json:"duration"`
	SkipRequest bool         `json:"skipRequest,omitempty"` // pm.execution.skipRequest（前置）
	NextRequest *string      `json:"nextRequest,omitempty"` // pm.execution.setNextRequest
}

// Options 是一次脚本运行的输入。
type Options struct {
	Phase       Phase
	Request     *RequestData
	Response    *ResponseData
	Stores      Stores
	Timeout     time.Duration
	RequestName string
	RequestID   string
}

// Engine 持有可跨 runtime 复用的模块注册表。并发安全，可作为单例长期持有。
type Engine struct {
	registry *require.Registry
}

// New 创建脚本引擎，注册内置 JS 库与原生模块。
func New() *Engine {
	reg := require.NewRegistry(require.WithLoader(loadModule))
	registerNativeModules(reg)
	return &Engine{registry: reg}
}

// moduleAliases 将带子路径的 require 名映射到扁平的嵌入文件名。
var moduleAliases = map[string]string{
	"csv-parse/lib/sync": "csv-parse-sync",
	"csv-parse":          "csv-parse-sync",
	"string-decoder":     "string_decoder",
}

// loadModule 把 require 请求的模块名解析到内置 libs/ 下的嵌入源文件。
func loadModule(path string) ([]byte, error) {
	name := normalizeModuleName(path)
	if alias, ok := moduleAliases[name]; ok {
		name = alias
	}
	b, err := libsFS.ReadFile("libs/" + name + ".js")
	if err != nil {
		return nil, require.ModuleFileDoesNotExistError
	}
	return b, nil
}

// normalizeModuleName 去除 Node 解析器附加的 node_modules/ 前缀、.js 后缀与 /index 结尾。
func normalizeModuleName(path string) string {
	name := strings.TrimPrefix(path, "node_modules/")
	name = strings.TrimSuffix(name, ".js")
	name = strings.TrimSuffix(name, "/index")
	return name
}

// registerNativeModules 注册由 Go 原生实现的模块（uuid、atob、btoa）。
func registerNativeModules(reg *require.Registry) {
	reg.RegisterNativeModule("uuid", func(rt *goja.Runtime, module *goja.Object) {
		// 兼容 uuid v3 API：默认导出可调用(=v4)，并带 v1/v3/v4/v5。
		v4 := func(goja.FunctionCall) goja.Value { return rt.ToValue(uuid.NewString()) }
		exports := rt.ToValue(v4).(*goja.Object)
		exports.Set("v4", v4)
		exports.Set("v1", func(goja.FunctionCall) goja.Value { return rt.ToValue(uuid.NewString()) })
		exports.Set("v3", func(goja.FunctionCall) goja.Value { return rt.ToValue(uuid.NewString()) })
		exports.Set("v5", func(goja.FunctionCall) goja.Value { return rt.ToValue(uuid.NewString()) })
		exports.Set("NIL", uuid.Nil.String())
		module.Set("exports", exports)
	})
	reg.RegisterNativeModule("atob", func(rt *goja.Runtime, module *goja.Object) {
		module.Set("exports", func(call goja.FunctionCall) goja.Value { return decodeBase64(rt, call) })
	})
	reg.RegisterNativeModule("btoa", func(rt *goja.Runtime, module *goja.Object) {
		module.Set("exports", func(call goja.FunctionCall) goja.Value { return encodeBase64(rt, call) })
	})
	// url / buffer / process 交给 goja_nodejs 的实现（比 jspm 垫片更完整）。
	reg.RegisterNativeModule("url", nodeurl.Require)
	reg.RegisterNativeModule("buffer", buffer.Require)
	reg.RegisterNativeModule("process", process.Require)
	// jsrsasign 是浏览器 UMD：在全局作用域执行使其挂到 window(=global)，再把命名空间导出。
	reg.RegisterNativeModule("jsrsasign", func(rt *goja.Runtime, module *goja.Object) {
		src, err := libsFS.ReadFile("libs/jsrsasign.js")
		if err != nil {
			return
		}
		if _, err := rt.RunString(string(src)); err != nil {
			return
		}
		exports := module.Get("exports").(*goja.Object)
		for _, n := range []string{
			"KJUR", "KEYUTIL", "RSAKey", "X509", "ASN1HEX", "CryptoJS",
			"b64tohex", "hextob64", "hextob64u", "b64utohex", "utf8tob64", "b64toutf8",
			"hextorstr", "rstrtohex", "stoBA", "BAtos", "hextoArrayBuffer", "ArrayBuffertohex",
		} {
			if v := rt.Get(n); v != nil && !goja.IsUndefined(v) {
				exports.Set(n, v)
			}
		}
	})
}

// Run 执行脚本并返回结果。脚本为空时返回未执行的空结果。
// 使用事件循环运行，因此 pm.sendRequest / 异步 pm.test / setTimeout 都能在超时内正常结算。
func (e *Engine) Run(script string, opts Options) *Result {
	res := &Result{Logs: []LogEntry{}, Tests: []TestResult{}}
	if strings.TrimSpace(script) == "" {
		return res
	}
	res.Executed = true

	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	if opts.Stores.Local == nil {
		opts.Stores.Local = NewVarStore(nil)
	}

	loop := eventloop.NewEventLoop(eventloop.WithRegistry(e.registry), eventloop.EnableConsole(false))

	var vmRef *goja.Runtime
	start := time.Now()
	done := make(chan struct{})
	go func() {
		defer close(done)
		loop.Run(func(vm *goja.Runtime) {
			vmRef = vm
			defer func() {
				if r := recover(); r != nil && res.Error == "" {
					res.Error = fmt.Sprintf("脚本执行崩溃: %v", r)
				}
			}()
			setupRuntime(vm, loop, opts, res)
			if _, err := vm.RunString(script); err != nil && res.Error == "" {
				res.Error = err.Error()
			}
			mergeLegacyTests(vm, res)
		})
	}()

	select {
	case <-done:
	case <-time.After(timeout):
		if vmRef != nil {
			vmRef.Interrupt("脚本执行超时")
		}
		loop.StopNoWait()
		<-done
		if res.Error == "" {
			res.Error = "脚本执行超时"
		}
	}

	res.Duration = time.Since(start).Milliseconds()
	return res
}

// setupRuntime 在事件循环的 runtime 上安装全局对象、pm.* 与 legacy 兼容层。
func setupRuntime(vm *goja.Runtime, loop *eventloop.EventLoop, opts Options, res *Result) {
	buffer.Enable(vm)
	process.Enable(vm)
	nodeurl.Enable(vm)
	buildConsole(vm, res)
	buildGlobals(vm)
	buildPM(vm, loop, opts, res)
	runPrelude(vm)
}

// mergeLegacyTests 读取 legacy 全局 `tests` 对象（tests['name']=bool），合并为测试结果。
func mergeLegacyTests(vm *goja.Runtime, res *Result) {
	v := vm.Get("tests")
	obj, ok := v.(*goja.Object)
	if !ok {
		return
	}
	for _, key := range obj.Keys() {
		res.Tests = append(res.Tests, TestResult{Name: key, Passed: obj.Get(key).ToBoolean()})
	}
}

// runPrelude 运行内置 JS 预置脚本（chai-postman 断言插件 + legacy 兼容别名）。
func runPrelude(vm *goja.Runtime) {
	src, err := libsFS.ReadFile("runtime/prelude.js")
	if err != nil {
		return
	}
	_, _ = vm.RunString(string(src))
}

// LibraryInfo 描述一个内置脚本库，对应 libs/manifest.json 中的一条记录。
type LibraryInfo struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Require     string `json:"require,omitempty"`
	Kind        string `json:"kind"`
	Usage       string `json:"usage,omitempty"`
	License     string `json:"license"`
	Source      string `json:"source,omitempty"`
	File        string `json:"file,omitempty"`
	SHA256      string `json:"sha256,omitempty"`
	Description string `json:"description"`
}

// Libraries 返回内置脚本库清单（解析自 libs/manifest.json）。
func Libraries() ([]LibraryInfo, error) {
	b, err := libsFS.ReadFile("libs/manifest.json")
	if err != nil {
		return nil, fmt.Errorf("读取内置库清单失败: %w", err)
	}
	var manifest struct {
		Libraries []LibraryInfo `json:"libraries"`
	}
	if err := json.Unmarshal(b, &manifest); err != nil {
		return nil, fmt.Errorf("解析内置库清单失败: %w", err)
	}
	return manifest.Libraries, nil
}
