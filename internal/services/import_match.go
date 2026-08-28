package services

import "PostPigeon/internal/models"

// ImportMatchMode 决定重复导入时「什么算同一条接口」。
//
// 三种口径各有适用场景，所以交给用户选而不是替他定：
//   - 来源 ID 最准，但要求文件里带得有（Apifox 导出必带接口 ID；OpenAPI 的
//     operationId 是可选字段，实测很多导出根本不写）。
//   - 方法+路径是 OpenAPI 文档的结构主键，最通用。
//   - 加上名称最严格，适合同一路径下挂着多条只有名字不同的接口。
type ImportMatchMode = string

const (
	// MatchBySourceID 按来源系统的稳定标识（Apifox 接口 ID / OpenAPI operationId）。
	// 改名、改路径、挪目录都认得出是同一条。文件里没带标识的条目自动退回 MatchByMethodPath。
	MatchBySourceID ImportMatchMode = "sourceId"
	// MatchByMethodPath 按「方法 + 路径」。
	MatchByMethodPath ImportMatchMode = "methodPath"
	// MatchByMethodPathName 按「方法 + 路径 + 名称」，改了名就当成新接口。
	MatchByMethodPathName ImportMatchMode = "methodPathName"
)

// 来源标识，写进 Endpoint.Source。
const (
	EndpointSourceApifox  = "apifox"
	EndpointSourceOpenAPI = "openapi"
)

// normalizeMatchMode 把外部传入的模式收敛到已知取值，空值或无法识别时用 fallback。
func normalizeMatchMode(mode, fallback ImportMatchMode) ImportMatchMode {
	switch mode {
	case MatchBySourceID, MatchByMethodPath, MatchByMethodPathName:
		return mode
	default:
		return fallback
	}
}

// endpointMatchKey 生成「方法 + 路径」或「方法 + 路径 + 名称」的比对键。
// 文档类型没有 method/path 可比，一律退化为按名称。
func endpointMatchKey(mode ImportMatchMode, epType, method, path, name string) string {
	if epType == string(models.EndpointTypeDoc) {
		return "doc\x00" + name
	}
	key := method + "\x00" + path
	if mode == MatchByMethodPathName {
		key += "\x00" + name
	}
	return key
}
