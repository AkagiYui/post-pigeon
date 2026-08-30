package services

import (
	"encoding/json"
	"fmt"
	"maps"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// 本文件把模块导出为 OpenAPI 3.1 文档。
//
// 此前只有导入方向：接口设计能进来，却出不去，无法交给网关、代码生成器或
// 其它团队使用。导出走的是与导入相同的数据模型，保证往返尽量无损。

// openAPIExportDoc 是导出用的文档结构（与解析用的结构分开：导出需要有序输出与
// omitempty 控制，解析只关心宽松读取）。
type openAPIExportDoc struct {
	OpenAPI    string                                  `json:"openapi"`
	Info       openAPIExportInfo                       `json:"info"`
	Servers    []openAPIExportServer                   `json:"servers,omitempty"`
	Paths      map[string]map[string]openAPIExportOper `json:"paths"`
	Components *openAPIExportComponents                `json:"components,omitempty"`
}

type openAPIExportInfo struct {
	Title       string `json:"title"`
	Version     string `json:"version"`
	Description string `json:"description,omitempty"`
}

type openAPIExportServer struct {
	URL         string `json:"url"`
	Description string `json:"description,omitempty"`
}

type openAPIExportOper struct {
	Summary     string                     `json:"summary,omitempty"`
	Description string                     `json:"description,omitempty"`
	OperationID string                     `json:"operationId,omitempty"`
	Tags        []string                   `json:"tags,omitempty"`
	Deprecated  bool                       `json:"deprecated,omitempty"`
	Parameters  []openAPIExportParam       `json:"parameters,omitempty"`
	RequestBody *openAPIExportBody         `json:"requestBody,omitempty"`
	Responses   map[string]openAPIExportRs `json:"responses"`
	Security    []map[string][]string      `json:"security,omitempty"`
}

type openAPIExportParam struct {
	Name        string          `json:"name"`
	In          string          `json:"in"`
	Description string          `json:"description,omitempty"`
	Required    bool            `json:"required,omitempty"`
	Schema      openAPIExportSc `json:"schema"`
	Example     string          `json:"example,omitempty"`
}

type openAPIExportSc struct {
	Type   string `json:"type,omitempty"`
	Format string `json:"format,omitempty"`
}

type openAPIExportBody struct {
	Required bool                             `json:"required,omitempty"`
	Content  map[string]openAPIExportMediaTyp `json:"content"`
}

type openAPIExportMediaTyp struct {
	Schema  map[string]any `json:"schema,omitempty"`
	Example any            `json:"example,omitempty"`
}

type openAPIExportRs struct {
	Description string                           `json:"description"`
	Content     map[string]openAPIExportMediaTyp `json:"content,omitempty"`
}

type openAPIExportComponents struct {
	SecuritySchemes map[string]map[string]any `json:"securitySchemes,omitempty"`
}

// ExportOpenAPI 把一个模块导出为 OpenAPI 3.1 JSON 文档，保留旧调用方语义。
func (s *ImportExportService) ExportOpenAPI(moduleID string) (string, error) {
	return s.ExportOpenAPIAs(moduleID, "3.1")
}

// ExportOpenAPIAs 按指定版本导出 OpenAPI 3.1、OpenAPI 3.0 或 Swagger 2.0。
func (s *ImportExportService) ExportOpenAPIAs(moduleID, version string) (string, error) {
	doc, err := s.buildOpenAPIExportDoc(moduleID)
	if err != nil {
		return "", err
	}
	switch strings.TrimSpace(version) {
	case "", "3.1", "3.1.0":
		doc.OpenAPI = "3.1.0"
	case "3.0", "3.0.3":
		doc.OpenAPI = "3.0.3"
	case "2", "2.0", "swagger2":
		return marshalSwagger2(doc)
	default:
		return "", fmt.Errorf("不支持的 OpenAPI 导出版本 %q", version)
	}
	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeExportFailed)
	}
	return string(out), nil
}

func (s *ImportExportService) buildOpenAPIExportDoc(moduleID string) (*openAPIExportDoc, error) {
	var module models.Module
	if err := s.db.Where("id = ?", moduleID).First(&module).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeModuleNotFound, apperr.P("id", moduleID))
	}

	var endpoints []models.Endpoint
	if err := s.db.Where("module_id = ? AND type = ?", moduleID, string(models.EndpointTypeHTTP)).
		Order("sort_order ASC").Find(&endpoints).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}

	doc := &openAPIExportDoc{
		OpenAPI: "3.1.0",
		Info: openAPIExportInfo{
			Title:   module.Name,
			Version: "1.0.0",
		},
		Paths: map[string]map[string]openAPIExportOper{},
	}

	// 服务器地址取模块在各环境下的前置 URL
	var baseURLs []models.ModuleBaseURL
	if err := s.db.Where("module_id = ?", moduleID).Find(&baseURLs).Error; err == nil {
		seen := map[string]bool{}
		for _, item := range baseURLs {
			url := strings.TrimSpace(item.BaseURL)
			if url == "" || seen[url] {
				continue
			}
			seen[url] = true
			doc.Servers = append(doc.Servers, openAPIExportServer{URL: url})
		}
		sort.Slice(doc.Servers, func(i, j int) bool { return doc.Servers[i].URL < doc.Servers[j].URL })
	}

	securitySchemes := map[string]map[string]any{}

	for _, endpoint := range endpoints {
		detail, err := NewEndpointService(s.db).GetEndpoint(endpoint.ID)
		if err != nil {
			continue
		}
		path := endpoint.Path
		if path == "" {
			path = "/"
		}
		method := strings.ToLower(endpoint.Method)
		if method == "" {
			method = "get"
		}

		oper := openAPIExportOper{
			Summary:     endpoint.Name,
			Description: endpoint.Description,
			OperationID: operationID(endpoint),
			Tags:        parseTagList(endpoint.Tags),
			Deprecated:  endpoint.Status == "deprecated",
			Responses: map[string]openAPIExportRs{
				"200": {Description: "OK"},
			},
			Parameters:  exportParameters(detail),
			RequestBody: exportRequestBody(endpoint, detail),
		}
		if scheme, security := exportSecurity(detail.Auth); scheme != nil {
			maps.Copy(securitySchemes, scheme)
			oper.Security = security
		}
		if len(detail.Examples) > 0 {
			oper.Responses = exportResponses(detail.Examples)
		}

		if doc.Paths[path] == nil {
			doc.Paths[path] = map[string]openAPIExportOper{}
		}
		doc.Paths[path][method] = oper
	}

	if len(securitySchemes) > 0 {
		doc.Components = &openAPIExportComponents{SecuritySchemes: securitySchemes}
	}

	return doc, nil
}

// marshalSwagger2 把内部的 OpenAPI 3 文档降级为 Swagger 2.0。
// 当前数据模型没有 callbacks/links/oneOf 等 3.x 专属结构，转换可以保持请求与示例语义。
func marshalSwagger2(doc *openAPIExportDoc) (string, error) {
	result := map[string]any{
		"swagger": "2.0",
		"info":    doc.Info,
		"paths":   map[string]any{},
	}
	if len(doc.Servers) > 0 {
		if server, err := url.Parse(doc.Servers[0].URL); err == nil {
			if server.Host != "" {
				result["host"] = server.Host
			}
			if server.Scheme != "" {
				result["schemes"] = []string{server.Scheme}
			}
			if server.Path != "" && server.Path != "/" {
				result["basePath"] = server.Path
			}
		}
	}
	paths := result["paths"].(map[string]any)
	for path, methods := range doc.Paths {
		exportedMethods := map[string]any{}
		for method, operation := range methods {
			exportedMethods[method] = swagger2Operation(operation)
		}
		paths[path] = exportedMethods
	}
	if doc.Components != nil && len(doc.Components.SecuritySchemes) > 0 {
		definitions := map[string]any{}
		for name, scheme := range doc.Components.SecuritySchemes {
			copy := maps.Clone(scheme)
			if copy["type"] == "http" {
				switch copy["scheme"] {
				case "basic":
					copy = map[string]any{"type": "basic"}
				case "bearer":
					copy = map[string]any{"type": "apiKey", "name": "Authorization", "in": "header", "description": "Bearer token"}
				}
			}
			definitions[name] = copy
		}
		result["securityDefinitions"] = definitions
	}
	out, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeExportFailed)
	}
	return string(out), nil
}

func swagger2Operation(operation openAPIExportOper) map[string]any {
	result := map[string]any{
		"summary":     operation.Summary,
		"description": operation.Description,
		"operationId": operation.OperationID,
		"tags":        operation.Tags,
		"deprecated":  operation.Deprecated,
		"responses":   map[string]any{},
	}
	parameters := make([]any, 0, len(operation.Parameters)+1)
	for _, parameter := range operation.Parameters {
		parameters = append(parameters, map[string]any{
			"name": parameter.Name, "in": parameter.In, "description": parameter.Description,
			"required": parameter.Required, "type": defaultStr(parameter.Schema.Type, "string"),
			"format": parameter.Schema.Format, "x-example": parameter.Example,
		})
	}
	if operation.RequestBody != nil {
		mediaTypes := make([]string, 0, len(operation.RequestBody.Content))
		for mediaType := range operation.RequestBody.Content {
			mediaTypes = append(mediaTypes, mediaType)
		}
		sort.Strings(mediaTypes)
		if len(mediaTypes) > 0 {
			result["consumes"] = mediaTypes
			mediaType := mediaTypes[0]
			body := operation.RequestBody.Content[mediaType]
			if mediaType == "multipart/form-data" || mediaType == "application/x-www-form-urlencoded" {
				if properties, ok := body.Schema["properties"].(map[string]any); ok {
					keys := make([]string, 0, len(properties))
					for key := range properties {
						keys = append(keys, key)
					}
					sort.Strings(keys)
					for _, key := range keys {
						property, _ := properties[key].(map[string]any)
						parameter := map[string]any{"name": key, "in": "formData", "type": defaultStr(stringValue(property["type"]), "string")}
						if property["format"] == "binary" {
							parameter["type"] = "file"
							delete(parameter, "format")
						}
						parameters = append(parameters, parameter)
					}
				}
			} else {
				parameters = append(parameters, map[string]any{
					"name": "body", "in": "body", "required": operation.RequestBody.Required,
					"schema": body.Schema, "x-example": body.Example,
				})
			}
		}
	}
	if len(parameters) > 0 {
		result["parameters"] = parameters
	}
	responses := result["responses"].(map[string]any)
	for code, response := range operation.Responses {
		converted := map[string]any{"description": response.Description}
		if len(response.Content) > 0 {
			examples := map[string]any{}
			for mediaType, content := range response.Content {
				examples[mediaType] = content.Example
			}
			converted["examples"] = examples
		}
		responses[code] = converted
	}
	if len(operation.Security) > 0 {
		result["security"] = operation.Security
	}
	for _, key := range []string{"summary", "description", "operationId", "tags"} {
		switch value := result[key].(type) {
		case string:
			if value == "" {
				delete(result, key)
			}
		case []string:
			if len(value) == 0 {
				delete(result, key)
			}
		}
	}
	if !operation.Deprecated {
		delete(result, "deprecated")
	}
	return result
}

// operationID 生成稳定的 operationId：method + 路径去掉非字母数字。
func operationID(endpoint models.Endpoint) string {
	var b strings.Builder
	b.WriteString(strings.ToLower(endpoint.Method))
	for _, r := range endpoint.Path {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '/' || r == '-' || r == '_':
			b.WriteRune('_')
		}
	}
	return strings.Trim(b.String(), "_")
}

// parseTagList 把存储的 JSON 字符串数组解析为标签列表。
func parseTagList(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	var tags []string
	if err := json.Unmarshal([]byte(raw), &tags); err != nil {
		return nil
	}
	return tags
}

// exportParameters 导出 query / path / cookie / header 参数。
func exportParameters(detail *EndpointDetail) []openAPIExportParam {
	params := make([]openAPIExportParam, 0, len(detail.Params)+len(detail.Headers))
	for _, p := range detail.Params {
		if !p.Enabled || p.Name == "" {
			continue
		}
		params = append(params, openAPIExportParam{
			Name:        p.Name,
			In:          p.Type,
			Description: p.Description,
			// OpenAPI 要求 path 参数必须 required
			Required: p.Required || p.Type == "path",
			Schema:   openAPIExportSc{Type: defaultStr(p.DataType, "string")},
			Example:  p.Example,
		})
	}
	for _, h := range detail.Headers {
		if !h.Enabled || h.Name == "" {
			continue
		}
		// Content-Type / Accept 由 content 描述，不作为参数导出
		if strings.EqualFold(h.Name, "Content-Type") || strings.EqualFold(h.Name, "Accept") {
			continue
		}
		params = append(params, openAPIExportParam{
			Name:        h.Name,
			In:          "header",
			Description: h.Description,
			Required:    h.Required,
			Schema:      openAPIExportSc{Type: "string"},
			Example:     h.Example,
		})
	}
	if len(params) == 0 {
		return nil
	}
	return params
}

// exportRequestBody 依据请求体类型导出 requestBody。
func exportRequestBody(endpoint models.Endpoint, detail *EndpointDetail) *openAPIExportBody {
	switch endpoint.BodyType {
	case string(models.BodyTypeGraphQL):
		// GraphQL 在 HTTP 层就是一个 JSON 请求体，按 JSON 描述即可
		return &openAPIExportBody{Content: map[string]openAPIExportMediaTyp{
			"application/json": {
				Schema: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"query":     map[string]any{"type": "string"},
						"variables": map[string]any{"type": "object"},
					},
					"required": []string{"query"},
				},
			},
		}}
	case string(models.BodyTypeJSON):
		return &openAPIExportBody{Content: map[string]openAPIExportMediaTyp{
			defaultStr(endpoint.ContentType, "application/json"): {
				Schema:  map[string]any{"type": "object"},
				Example: rawJSONOrString(endpoint.BodyContent),
			},
		}}
	case string(models.BodyTypeXML):
		return &openAPIExportBody{Content: map[string]openAPIExportMediaTyp{
			defaultStr(endpoint.ContentType, "application/xml"): {Example: endpoint.BodyContent},
		}}
	case string(models.BodyTypeText):
		return &openAPIExportBody{Content: map[string]openAPIExportMediaTyp{
			defaultStr(endpoint.ContentType, "text/plain"): {Example: endpoint.BodyContent},
		}}
	case string(models.BodyTypeBinary):
		return &openAPIExportBody{Content: map[string]openAPIExportMediaTyp{
			defaultStr(endpoint.ContentType, "application/octet-stream"): {
				Schema: map[string]any{"type": "string", "format": "binary"},
			},
		}}
	case string(models.BodyTypeFormData), string(models.BodyTypeURLEncoded):
		properties := map[string]any{}
		for _, field := range detail.BodyFields {
			if !field.Enabled || field.Name == "" {
				continue
			}
			if field.FieldType == "file" {
				properties[field.Name] = map[string]any{"type": "string", "format": "binary"}
			} else {
				properties[field.Name] = map[string]any{"type": "string"}
			}
		}
		if len(properties) == 0 {
			return nil
		}
		mediaType := "application/x-www-form-urlencoded"
		if endpoint.BodyType == string(models.BodyTypeFormData) {
			mediaType = "multipart/form-data"
		}
		return &openAPIExportBody{Content: map[string]openAPIExportMediaTyp{
			mediaType: {Schema: map[string]any{"type": "object", "properties": properties}},
		}}
	}
	return nil
}

// exportResponses 把已保存的响应示例导出为 responses。
func exportResponses(examples []models.ResponseExample) map[string]openAPIExportRs {
	out := map[string]openAPIExportRs{}
	for _, example := range examples {
		code := "200"
		if example.StatusCode > 0 {
			code = strconv.Itoa(example.StatusCode)
		}
		mediaType := defaultStr(example.ContentType, "application/json")
		out[code] = openAPIExportRs{
			Description: defaultStr(example.Name, "OK"),
			Content: map[string]openAPIExportMediaTyp{
				mediaType: {Example: rawJSONOrString(example.Body)},
			},
		}
	}
	if len(out) == 0 {
		out["200"] = openAPIExportRs{Description: "OK"}
	}
	return out
}

// exportSecurity 把端点认证导出为 securityScheme + security 引用。
func exportSecurity(auth *models.EndpointAuth) (map[string]map[string]any, []map[string][]string) {
	if auth == nil {
		return nil, nil
	}
	switch auth.Type {
	case string(models.AuthTypeBasic):
		return map[string]map[string]any{"basicAuth": {"type": "http", "scheme": "basic"}},
			[]map[string][]string{{"basicAuth": {}}}
	case string(models.AuthTypeBearer):
		return map[string]map[string]any{"bearerAuth": {"type": "http", "scheme": "bearer"}},
			[]map[string][]string{{"bearerAuth": {}}}
	case string(models.AuthTypeAPIKey):
		var data models.APIKeyAuthData
		if err := models.FromJSON(auth.Data, &data); err != nil || data.Key == "" {
			return nil, nil
		}
		in := defaultStr(data.In, "header")
		return map[string]map[string]any{"apiKeyAuth": {"type": "apiKey", "in": in, "name": data.Key}},
			[]map[string][]string{{"apiKeyAuth": {}}}
	}
	return nil, nil
}

// rawJSONOrString 能解析成 JSON 就作为结构化示例输出，否则原样作为字符串。
func rawJSONOrString(body string) any {
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return nil
	}
	var parsed any
	if err := json.Unmarshal([]byte(trimmed), &parsed); err == nil {
		return parsed
	}
	return body
}
