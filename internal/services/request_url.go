package services

import (
	"strings"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/scripting"
)

// resolveRequestURL 先展开 path，再决定是否使用前置 URL。完整地址不依赖前置
// URL，因此其未定义变量也不应阻止发送；相对路径仍使用当前环境的前置 URL。
func resolveRequestURL(baseURL, path string, vars map[string]string) string {
	path = strings.TrimSpace(resolveVars(path, vars))
	// 变量替换后的操作仍可补齐变量；在 path 尚未确定前不能提前拼入前置 URL。
	if strings.Contains(path, "{{") {
		return path
	}
	if hasURLScheme(path) {
		return path
	}
	return combineURL(strings.TrimSpace(resolveVars(baseURL, vars)), path)
}

// resolveScriptRequestURL 保留变量替换前脚本读取完整 URL 模板的行为，但不能把
// 该模板的拼接结果直接拿去展开。脚本没有改写 URL 时，从独立的 base/path 解析；
// 改写过时，以脚本提供的 URL 为准（相对地址同样允许使用前置 URL）。
func resolveScriptRequestURL(data SendRequestData, request *scripting.RequestData, vars map[string]string) string {
	path := request.URL
	if path == combineURL(data.BaseURL, data.Path) {
		path = data.Path
	}
	return resolveRequestURL(request.BaseURL, path, vars)
}

// 必须在所有前置操作执行完后校验，允许脚本补齐或替换地址。错误不携带展开后
// 的 URL，避免把地址中的凭据写进错误提示或 WebSocket 事件。
func validateResolvedRequestURL(requestURL string) error {
	if strings.Contains(requestURL, "{{") || strings.Contains(requestURL, "}}") {
		return apperr.New(apperr.CodeUnresolvedURLVariable)
	}
	return nil
}
