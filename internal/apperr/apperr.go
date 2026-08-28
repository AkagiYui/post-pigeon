// Package apperr 提供可被前端识别与本地化的结构化错误。
//
// Wails 的服务绑定只把 error 以字符串形式传给前端，因此这里把「错误码 + 参数 +
// 原始原因」编码成一段 JSON 作为 Error() 的返回值。前端 lib/errors.ts 解析该
// JSON，用错误码查 i18n 词条渲染本地化文案，解析失败时回退展示原始字符串。
//
// 后端不再拼接面向用户的中文文案：文案的唯一来源是前端 i18n 词条。
package apperr

import (
	"encoding/json"
	"errors"
	"fmt"
)

// Marker 是编码后 JSON 的固定字段，供前端快速判定这是结构化错误。
const Marker = "post-pigeon/error"

// Error 是带错误码的应用错误。
type Error struct {
	// Kind 恒为 Marker，用于前端识别。
	Kind string `json:"$kind"`
	// Code 错误码，形如 "http.send_failed"，对应 i18n 词条 error.<code>。
	Code string `json:"code"`
	// Params 供 i18n 插值的参数（如 {"name": "订单接口"}）。
	Params map[string]string `json:"params,omitempty"`
	// Cause 原始错误文本，前端在没有对应词条时兜底展示，也便于日志排查。
	Cause string `json:"cause,omitempty"`

	cause error
}

// Error 返回 JSON 编码后的错误，供 Wails 传给前端。
func (e *Error) Error() string {
	b, err := json.Marshal(e)
	if err != nil {
		// 极端情况下退化为纯文本，前端仍能兜底展示
		return e.Code
	}
	return string(b)
}

// Unwrap 返回被包装的原始错误，支持 errors.Is / errors.As。
func (e *Error) Unwrap() error { return e.cause }

// New 构造一个不含原始错误的应用错误。
func New(code string, params ...Param) *Error {
	return &Error{Kind: Marker, Code: code, Params: buildParams(params)}
}

// Wrap 用错误码包装一个原始错误；err 为 nil 时返回 nil，便于直接 return。
func Wrap(err error, code string, params ...Param) error {
	if err == nil {
		return nil
	}
	// 已经是应用错误时保留最内层的错误码，避免层层包装丢失语义
	if appErr, ok := errors.AsType[*Error](err); ok {
		return appErr
	}
	return &Error{Kind: Marker, Code: code, Params: buildParams(params), Cause: err.Error(), cause: err}
}

// Param 是一条 i18n 插值参数。
type Param struct {
	Key   string
	Value string
}

// P 构造一条插值参数，值会按 %v 格式化。
func P(key string, value any) Param {
	return Param{Key: key, Value: fmt.Sprintf("%v", value)}
}

func buildParams(params []Param) map[string]string {
	if len(params) == 0 {
		return nil
	}
	out := make(map[string]string, len(params))
	for _, p := range params {
		out[p.Key] = p.Value
	}
	return out
}

// Code 返回错误链上第一个应用错误的错误码；不存在时返回空串。
func Code(err error) string {
	if appErr, ok := errors.AsType[*Error](err); ok {
		return appErr.Code
	}
	return ""
}
