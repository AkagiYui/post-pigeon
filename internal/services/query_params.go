package services

import (
	"encoding/json"
	"net/url"
	"sort"
	"strings"

	"PostPigeon/internal/models"
)

// queryParamValues 展开一条端点 Query 参数。
//
// array 的 value 使用 JSON 数组保存，并按 OpenAPI query 的默认 form + explode=true
// 语义展开为重复键（tags=a&tags=b）。非数组及无法解析的历史值保持原有单值行为。
func queryParamValues(param models.EndpointParam, vars map[string]string) []string {
	value := resolveVars(param.Value, vars)
	if !strings.EqualFold(strings.TrimSpace(param.DataType), "array") {
		return []string{value}
	}

	var items []json.RawMessage
	if err := json.Unmarshal([]byte(value), &items); err != nil {
		return []string{value}
	}
	values := make([]string, 0, len(items))
	for _, item := range items {
		if string(item) == "null" {
			values = append(values, "")
			continue
		}
		var text string
		if err := json.Unmarshal(item, &text); err == nil {
			values = append(values, text)
			continue
		}
		// 数字、布尔和对象保留 JSON 文本，避免 float64 转换损失大整数精度。
		values = append(values, string(item))
	}
	return values
}

// addEndpointQueryParams 把 EndpointParam 列表加入 URL；数组参数在这里统一展开，
// 供 HTTP/WS/cURL/导出复用。
func addEndpointQueryParams(query url.Values, params []models.EndpointParam, vars map[string]string) {
	for _, param := range params {
		if !param.Enabled || param.Type != "query" || param.Name == "" {
			continue
		}
		for _, value := range queryParamValues(param, vars) {
			query.Add(param.Name, value)
		}
	}
}

// endpointParamsFromQuery 把 URL/cURL 中的重复查询键收成一条数组参数，避免导入后
// 又要求用户维护多行同名 key。键排序让导入结果稳定，值顺序保持 URL 原顺序。
func endpointParamsFromQuery(query url.Values) []models.EndpointParam {
	keys := make([]string, 0, len(query))
	for key := range query {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	params := make([]models.EndpointParam, 0, len(keys))
	for _, key := range keys {
		values := query[key]
		param := models.EndpointParam{Type: "query", Name: key, Enabled: true, DataType: "string"}
		if len(values) <= 1 {
			if len(values) == 1 {
				param.Value = values[0]
			}
		} else {
			encoded, _ := json.Marshal(values)
			param.DataType = "array"
			param.Value = string(encoded)
		}
		params = append(params, param)
	}
	return params
}
