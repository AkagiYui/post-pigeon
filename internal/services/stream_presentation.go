package services

// 流式展示偏好属于接口文档，而不是运行期连接状态。这里在服务层收敛白名单，
// 防止旧客户端或手工导入写入未知值后让前端无法恢复默认展示。
func persistedStreamViewMode(mode string) string {
	if mode == "completion" {
		return "completion"
	}
	return "timeline"
}

func persistedStreamCompletionFormat(format string) string {
	switch format {
	case "openai", "gemini", "claude", "ollama-generate", "ollama-chat", "custom":
		return format
	default:
		return "auto"
	}
}

// hasStreamPresentation 区分「新版前端显式保存默认值」和「旧版前端根本不认识这些字段」。
// 前者至少会携带 timeline 或 auto，后者四项均为 Go 零值。
func hasStreamPresentation(data EndpointSaveData) bool {
	return data.StreamViewMode != "" || data.StreamCompletionFormat != "" ||
		data.StreamJSONPath != "" || data.StreamRenderMarkdown
}
