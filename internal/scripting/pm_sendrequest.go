package scripting

import (
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/eventloop"
)

// sendClient 是 pm.sendRequest 使用的 HTTP 客户端（独立于主请求流程）。
var sendClient = &http.Client{Timeout: 30 * time.Second}

// buildSendRequest 构建 pm.sendRequest(req, callback)。回调风格 (err, response)。
// 通过保活定时器维持事件循环，直到异步 HTTP 完成并在循环线程回调。
func buildSendRequest(vm *goja.Runtime, loop *eventloop.EventLoop, res *Result) func(goja.FunctionCall) goja.Value {
	return func(call goja.FunctionCall) goja.Value {
		method, rawURL, headers, body, perr := parseSendSpec(vm, call.Argument(0))
		cb, hasCb := goja.AssertFunction(call.Argument(1))

		if perr != nil {
			if hasCb {
				_, _ = cb(goja.Undefined(), vm.ToValue(perr.Error()), goja.Null())
			}
			return goja.Undefined()
		}

		keepalive := loop.SetTimeout(func(*goja.Runtime) {}, time.Hour)
		start := time.Now()
		go func() {
			respData, err := doSendRequest(method, rawURL, headers, body)
			elapsed := time.Since(start).Milliseconds()
			loop.RunOnLoop(func(rt *goja.Runtime) {
				defer loop.ClearTimeout(keepalive)
				if !hasCb {
					return
				}
				if err != nil {
					_, _ = cb(goja.Undefined(), rt.ToValue(err.Error()), goja.Null())
					return
				}
				respData.ResponseTime = elapsed
				_, _ = cb(goja.Undefined(), goja.Null(), buildResponseObject(rt, respData, false))
			})
		}()
		return goja.Undefined()
	}
}

// parseSendSpec 解析 pm.sendRequest 的第一个参数（字符串或配置对象）。
func parseSendSpec(vm *goja.Runtime, arg goja.Value) (method, rawURL string, headers []Header, body string, err error) {
	method = "GET"
	if arg == nil || goja.IsUndefined(arg) || goja.IsNull(arg) {
		return "", "", nil, "", &sendError{"pm.sendRequest: 缺少请求参数"}
	}
	obj, ok := arg.(*goja.Object)
	if !ok {
		return method, arg.String(), nil, "", nil // 纯字符串 URL
	}
	rawURL = safeStr(obj.Get("url"))
	if m := safeStr(obj.Get("method")); m != "" {
		method = strings.ToUpper(m)
	}
	// header：对象或数组 [{key,value}]
	if h := obj.Get("header"); h != nil && !goja.IsUndefined(h) && !goja.IsNull(h) {
		headers = parseHeadersArg(vm, h)
	}
	// body：{mode, raw, urlencoded, formdata}
	if b := obj.Get("body"); b != nil && !goja.IsUndefined(b) && !goja.IsNull(b) {
		if bo, ok := b.(*goja.Object); ok {
			mode := safeStr(bo.Get("mode"))
			switch mode {
			case "raw":
				body = safeStr(bo.Get("raw"))
			case "urlencoded":
				vals := url.Values{}
				for _, kv := range parseHeadersArg(vm, bo.Get("urlencoded")) {
					vals.Add(kv.Key, kv.Value)
				}
				body = vals.Encode()
				if !hasHeader(headers, "Content-Type") {
					headers = append(headers, Header{Key: "Content-Type", Value: "application/x-www-form-urlencoded"})
				}
			case "formdata":
				// 简化：作为 urlencoded 处理文本字段
				vals := url.Values{}
				for _, kv := range parseHeadersArg(vm, bo.Get("formdata")) {
					vals.Add(kv.Key, kv.Value)
				}
				body = vals.Encode()
				if !hasHeader(headers, "Content-Type") {
					headers = append(headers, Header{Key: "Content-Type", Value: "application/x-www-form-urlencoded"})
				}
			default:
				body = safeStr(bo.Get("raw"))
			}
		}
	}
	if rawURL == "" {
		return method, "", headers, body, &sendError{"pm.sendRequest: 缺少 url"}
	}
	return method, rawURL, headers, body, nil
}

// parseHeadersArg 解析 header 参数：对象 {k:v} 或数组 [{key,value}]。
func parseHeadersArg(vm *goja.Runtime, v goja.Value) []Header {
	obj, ok := v.(*goja.Object)
	if !ok {
		return nil
	}
	var out []Header
	// 数组形态
	if isArray(vm, obj) {
		length := int(obj.Get("length").ToInteger())
		for i := 0; i < length; i++ {
			if item, ok := obj.Get(strconv.Itoa(i)).(*goja.Object); ok {
				out = append(out, Header{Key: safeStr(item.Get("key")), Value: safeStr(item.Get("value"))})
			}
		}
		return out
	}
	// 对象形态
	for _, k := range obj.Keys() {
		out = append(out, Header{Key: k, Value: safeStr(obj.Get(k))})
	}
	return out
}

// doSendRequest 执行实际 HTTP 请求并构建 ResponseData。
func doSendRequest(method, rawURL string, headers []Header, body string) (*ResponseData, error) {
	var bodyReader io.Reader
	if body != "" {
		bodyReader = strings.NewReader(body)
	}
	req, err := http.NewRequest(method, rawURL, bodyReader)
	if err != nil {
		return nil, err
	}
	for _, h := range headers {
		req.Header.Set(h.Key, h.Value)
	}
	resp, err := sendClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var hs []Header
	for k, vals := range resp.Header {
		hs = append(hs, Header{Key: k, Value: strings.Join(vals, ", ")})
	}
	var cookies []Cookie
	for _, c := range resp.Cookies() {
		cookies = append(cookies, Cookie{Name: c.Name, Value: c.Value})
	}
	status := resp.Status
	if i := strings.IndexByte(status, ' '); i >= 0 {
		status = status[i+1:]
	}
	return &ResponseData{
		Code:         resp.StatusCode,
		Status:       status,
		Headers:      hs,
		Body:         string(respBody),
		ResponseSize: int64(len(respBody)),
		Cookies:      cookies,
	}, nil
}

type sendError struct{ msg string }

func (e *sendError) Error() string { return e.msg }

func safeStr(v goja.Value) string {
	if v == nil || goja.IsUndefined(v) || goja.IsNull(v) {
		return ""
	}
	return v.String()
}

func hasHeader(headers []Header, key string) bool {
	for _, h := range headers {
		if strings.EqualFold(h.Key, key) {
			return true
		}
	}
	return false
}

// isArray 通过 Array.isArray 判断。
func isArray(vm *goja.Runtime, obj *goja.Object) bool {
	if arrObj, ok := vm.Get("Array").(*goja.Object); ok {
		if fn, ok := goja.AssertFunction(arrObj.Get("isArray")); ok {
			if r, err := fn(goja.Undefined(), obj); err == nil {
				return r.ToBoolean()
			}
		}
	}
	return false
}
