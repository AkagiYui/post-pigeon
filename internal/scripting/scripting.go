// Package scripting 提供 Postman/Apifox 风格的前置(pre-request)与后置(post-response)脚本运行时。
//
// 第一版为同步实现，基于纯 Go 的 goja 引擎，暴露 pm.* API 与 console，
// 并通过 require() 提供内置 JS 库（lodash、crypto-js、chai、uuid 等）。
// 尚未实现事件循环，因此 pm.sendRequest、异步 pm.test、setTimeout、用户脚本中的
// async/await 均不在本版范围内。
package scripting

import (
	"embed"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"github.com/google/uuid"
)

//go:embed libs/*.js libs/manifest.json
var libsFS embed.FS

// LibraryInfo 描述一个内置脚本库，对应 libs/manifest.json 中的一条记录。
type LibraryInfo struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Require     string `json:"require,omitempty"` // require() 名称；global 类型为空
	Kind        string `json:"kind"`              // embed | native | global
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

// DefaultTimeout 是单个脚本的默认执行超时。
const DefaultTimeout = 5 * time.Second

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
	Headers []Header
	Body    string
	// Query 前置脚本通过 pm.request.url.query.add(...) 追加的查询参数，
	// 由发送流程合并到实际请求的查询串上。
	Query []Header
}

// ResponseData 是后置脚本可读的响应数据；setBody / headers 的修改会写回最终响应。
type ResponseData struct {
	Code         int
	Status       string
	Headers      []Header
	Body         string
	ResponseTime int64
	ResponseSize int64
}

// Stores 汇集三种作用域的变量存储。第一版仅 Environment 会被持久化，
// Globals 与 Collection 为单次请求内的内存存储。
type Stores struct {
	Environment *VarStore
	Globals     *VarStore
	Collection  *VarStore
}

// LogEntry 是被捕获的一条 console 输出。
type LogEntry struct {
	Level   string `json:"level"`
	Message string `json:"message"`
}

// TestResult 是一次 pm.test 的结果。
type TestResult struct {
	Name   string `json:"name"`
	Passed bool   `json:"passed"`
	Error  string `json:"error,omitempty"`
}

// Result 汇总一次脚本执行的产出。
type Result struct {
	Executed bool         `json:"executed"`
	Logs     []LogEntry   `json:"logs"`
	Tests    []TestResult `json:"tests"`
	Error    string       `json:"error,omitempty"`
	Duration int64        `json:"duration"` // 毫秒
}

// Options 是一次脚本运行的输入。
type Options struct {
	Phase    Phase
	Request  *RequestData  // 前置与后置脚本均可读；前置脚本可修改
	Response *ResponseData // 仅后置脚本；为 nil 时脚本中 pm.response 不可用
	Stores   Stores
	Timeout  time.Duration
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

// loadModule 把 require 请求的模块名解析到内置 libs/ 下的嵌入源文件。
func loadModule(path string) ([]byte, error) {
	name := normalizeModuleName(path)
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

// registerNativeModules 注册由 Go 实现的模块（当前为 uuid）。
func registerNativeModules(reg *require.Registry) {
	reg.RegisterNativeModule("uuid", func(_ *goja.Runtime, module *goja.Object) {
		exports := module.Get("exports").(*goja.Object)
		exports.Set("v4", func() string { return uuid.NewString() })
		exports.Set("v1", func() string { return uuid.NewString() })
		exports.Set("NIL", uuid.Nil.String())
	})
}

// Run 执行脚本并返回结果。脚本为空时返回未执行的空结果。
// 任何 JS 错误或超时都会被记录到 Result.Error，不会返回 Go error（脚本失败不应中断请求流程）。
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

	vm := goja.New()
	e.registry.Enable(vm)
	buildConsole(vm, res)
	buildGlobals(vm)
	buildPM(vm, opts, res)

	start := time.Now()
	defer func() {
		if r := recover(); r != nil {
			res.Error = fmt.Sprintf("脚本执行崩溃: %v", r)
		}
		res.Duration = time.Since(start).Milliseconds()
	}()

	timer := time.AfterFunc(timeout, func() {
		vm.Interrupt("脚本执行超时")
	})
	defer timer.Stop()

	if _, err := vm.RunString(script); err != nil {
		res.Error = err.Error()
	}
	return res
}
