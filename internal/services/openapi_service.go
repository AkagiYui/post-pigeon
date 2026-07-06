package services

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"sort"
	"strings"

	"post-pigeon/internal/models"

	"gorm.io/gorm"
)

// ---- OpenAPI / Swagger 文档解析结构 ----

// openAPIDoc 兼容 Swagger 2.0 与 OpenAPI 3.x 的顶层文档结构
type openAPIDoc struct {
	Swagger  string                                `json:"swagger"` // 2.0
	OpenAPI  string                                `json:"openapi"` // 3.x
	BasePath string                                `json:"basePath"`
	Host     string                                `json:"host"`    // v2
	Schemes  []string                              `json:"schemes"` // v2
	Info     openAPIInfo                           `json:"info"`
	Servers  []openAPIServer                       `json:"servers"` // v3
	Paths    map[string]map[string]json.RawMessage `json:"paths"`
}

// openAPIInfo 文档基本信息
type openAPIInfo struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// openAPIServer v3 服务器条目（url + 描述，描述常对应环境名）
type openAPIServer struct {
	URL         string `json:"url"`
	Description string `json:"description"`
}

// openAPIOperation 单个接口操作
type openAPIOperation struct {
	Summary     string              `json:"summary"`
	OperationID string              `json:"operationId"`
	Description string              `json:"description"`
	Tags        []string            `json:"tags"`
	Consumes    []string            `json:"consumes"` // v2
	Parameters  []openAPIParam      `json:"parameters"`
	RequestBody *openAPIRequestBody `json:"requestBody"` // v3
}

// openAPIParam 参数（query / header / path / formData(v2) / body(v2)）
type openAPIParam struct {
	Name        string         `json:"name"`
	In          string         `json:"in"`
	Required    bool           `json:"required"`
	Description string         `json:"description"`
	Example     interface{}    `json:"example"`
	XExample    interface{}    `json:"x-example"`
	Type        string         `json:"type"` // v2
	Schema      *openAPISchema `json:"schema"`
}

// openAPIRequestBody v3 请求体
type openAPIRequestBody struct {
	Content  map[string]openAPIMediaType `json:"content"`
	Required bool                        `json:"required"`
}

// openAPIMediaType v3 媒体类型
type openAPIMediaType struct {
	Schema  *openAPISchema `json:"schema"`
	Example interface{}    `json:"example"`
}

// openAPISchema 简化的 schema 结构
type openAPISchema struct {
	Type       string                   `json:"type"`
	Format     string                   `json:"format"`
	Properties map[string]openAPISchema `json:"properties"`
	Required   []string                 `json:"required"`
	Example    interface{}              `json:"example"`
	Items      *openAPISchema           `json:"items"`
}

// httpMethods 支持解析的 HTTP 方法集合
var httpMethods = map[string]bool{
	"get": true, "post": true, "put": true, "delete": true,
	"patch": true, "head": true, "options": true,
}

// parsedEndpoint 从文档中解析出的端点
type parsedEndpoint struct {
	Name        string
	Method      string
	Path        string
	Params      []models.EndpointParam
	Headers     []models.EndpointHeader
	BodyType    string
	BodyContent string
	ContentType string
	BodyFields  []models.EndpointBodyField
}

// parsedServer 解析出的服务器（环境名 + baseURL）
type parsedServer struct {
	Name string // 环境名（来自 server.description），v2 单服务器时为空
	URL  string // baseURL（scheme://host）
}

// parsedDoc 文档解析结果
type parsedDoc struct {
	ModuleName string // 文档标题（info.title）
	Endpoints  []parsedEndpoint
	Servers    []parsedServer
}

// OpenAPIPreviewItem 预览项，供前端确认导入
type OpenAPIPreviewItem struct {
	Index     int    `json:"index"` // 在文档解析结果中的序号，导入时用于选择性导入
	Name      string `json:"name"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Duplicate bool   `json:"duplicate"` // 目标模块中是否已存在同名同方法的接口
}

// OpenAPIServerInfo 预览中的服务器/环境信息
type OpenAPIServerInfo struct {
	Name            string `json:"name"`            // 环境名（server 描述）
	URL             string `json:"url"`             // baseURL
	EnvironmentSame bool   `json:"environmentSame"` // 项目中是否已存在同名环境
}

// OpenAPIPreview OpenAPI 导入预览
type OpenAPIPreview struct {
	Total             int                  `json:"total"`
	DuplicateCount    int                  `json:"duplicateCount"`
	Items             []OpenAPIPreviewItem `json:"items"`
	ModuleName        string               `json:"moduleName"`        // 文档标题（可用于覆盖模块名），空表示文档未提供
	CurrentModuleName string               `json:"currentModuleName"` // 目标模块当前名称
	Servers           []OpenAPIServerInfo  `json:"servers"`           // 文档中的服务器/环境
}

// OpenAPIImportOptions OpenAPI 导入选项
type OpenAPIImportOptions struct {
	Overwrite           bool  `json:"overwrite"`           // 覆盖重名重方法的接口（false 时跳过）
	OverwriteModuleName bool  `json:"overwriteModuleName"` // 用文档标题覆盖模块名称
	ImportServers       bool  `json:"importServers"`       // 创建/覆盖环境与模块前置 URL
	SelectedIndexes     []int `json:"selectedIndexes"`     // 勾选导入的接口序号（对应预览项 Index）；为 nil 时导入全部，便于兼容旧调用方
}

// OpenAPIImportResult OpenAPI 导入结果
type OpenAPIImportResult struct {
	Created             int  `json:"created"`
	Overwritten         int  `json:"overwritten"`
	Skipped             int  `json:"skipped"`
	ModuleRenamed       bool `json:"moduleRenamed"`       // 是否重命名了模块
	EnvironmentsCreated int  `json:"environmentsCreated"` // 新建的环境数
	BaseURLsSet         int  `json:"baseUrlsSet"`         // 设置的模块前置 URL 数
}

// paramExample 提取参数示例值并转为字符串
func paramExample(p openAPIParam) string {
	if p.Example != nil {
		return toStringValue(p.Example)
	}
	if p.XExample != nil {
		return toStringValue(p.XExample)
	}
	if p.Schema != nil && p.Schema.Example != nil {
		return toStringValue(p.Schema.Example)
	}
	return ""
}

// toStringValue 将任意 JSON 值转为字符串
func toStringValue(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case nil:
		return ""
	default:
		b, err := json.Marshal(val)
		if err != nil {
			return fmt.Sprintf("%v", val)
		}
		return string(b)
	}
}

// schemaExampleJSON 根据 schema 生成示例 JSON 字符串（用于 JSON 请求体）
func schemaExampleJSON(schema *openAPISchema, fallback interface{}) string {
	if fallback != nil {
		if b, err := json.MarshalIndent(fallback, "", "  "); err == nil {
			return string(b)
		}
	}
	if schema == nil {
		return ""
	}
	value := buildExampleValue(*schema)
	b, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return ""
	}
	return string(b)
}

// buildExampleValue 递归根据 schema 构建示例值
func buildExampleValue(schema openAPISchema) interface{} {
	if schema.Example != nil {
		return schema.Example
	}
	switch schema.Type {
	case "object":
		obj := map[string]interface{}{}
		for name, prop := range schema.Properties {
			obj[name] = buildExampleValue(prop)
		}
		return obj
	case "array":
		if schema.Items != nil {
			return []interface{}{buildExampleValue(*schema.Items)}
		}
		return []interface{}{}
	case "integer", "number":
		return 0
	case "boolean":
		return false
	default:
		return ""
	}
}

// parseOpenAPI 解析 OpenAPI/Swagger 文档为端点列表（保留供测试与内部复用）
func parseOpenAPI(jsonStr string) ([]parsedEndpoint, error) {
	doc, err := parseOpenAPIDoc(jsonStr)
	if err != nil {
		return nil, err
	}
	return doc.Endpoints, nil
}

// parseOpenAPIDoc 解析 OpenAPI/Swagger 文档，返回端点、模块名与服务器信息
func parseOpenAPIDoc(jsonStr string) (*parsedDoc, error) {
	var doc openAPIDoc
	if err := json.Unmarshal([]byte(jsonStr), &doc); err != nil {
		return nil, fmt.Errorf("解析接口文档失败: %w", err)
	}
	if doc.Swagger == "" && doc.OpenAPI == "" {
		return nil, fmt.Errorf("无法识别的接口文档格式：缺少 swagger 或 openapi 版本字段")
	}
	if len(doc.Paths) == 0 {
		return nil, fmt.Errorf("接口文档中没有可导入的接口")
	}

	result := &parsedDoc{
		ModuleName: strings.TrimSpace(doc.Info.Title),
		Servers:    extractServers(&doc),
	}
	// 按路径、方法名排序确定遍历顺序，保证生成的端点顺序稳定，
	// 使 preview 与 import 两次解析得到一致的索引（否则 map 随机序会导致按索引选择时导入错误的接口）
	paths := make([]string, 0, len(doc.Paths))
	for path := range doc.Paths {
		paths = append(paths, path)
	}
	sort.Strings(paths)
	for _, path := range paths {
		methods := doc.Paths[path]
		fullPath := joinPath(doc.BasePath, path)
		methodNames := make([]string, 0, len(methods))
		for method := range methods {
			methodNames = append(methodNames, method)
		}
		sort.Strings(methodNames)
		for _, method := range methodNames {
			raw := methods[method]
			methodLower := strings.ToLower(method)
			if !httpMethods[methodLower] {
				continue
			}
			var op openAPIOperation
			if err := json.Unmarshal(raw, &op); err != nil {
				// 跳过无法解析的操作，不中断整体导入
				slog.Warn("跳过无法解析的接口操作", "path", path, "method", method, "error", err)
				continue
			}

			result.Endpoints = append(result.Endpoints, buildParsedEndpoint(fullPath, methodLower, op))
		}
	}
	return result, nil
}

// extractServers 提取文档中的服务器/环境信息
// v3：读取 servers[]（url + description）；v2：由 schemes + host 合成单个服务器
func extractServers(doc *openAPIDoc) []parsedServer {
	var servers []parsedServer
	if len(doc.Servers) > 0 {
		for _, s := range doc.Servers {
			servers = append(servers, parsedServer{
				Name: strings.TrimSpace(s.Description),
				URL:  strings.TrimRight(strings.TrimSpace(s.URL), "/"),
			})
		}
		return servers
	}
	// Swagger 2.0：host + schemes 合成 baseURL（basePath 已并入各接口路径，此处不重复）
	if doc.Host != "" {
		scheme := "https"
		if len(doc.Schemes) > 0 && doc.Schemes[0] != "" {
			scheme = doc.Schemes[0]
		}
		servers = append(servers, parsedServer{
			Name: "",
			URL:  scheme + "://" + doc.Host,
		})
	}
	return servers
}

// buildParsedEndpoint 将单个操作转换为 parsedEndpoint
func buildParsedEndpoint(path string, method string, op openAPIOperation) parsedEndpoint {
	ep := parsedEndpoint{
		Method: strings.ToUpper(method),
		Path:   path,
	}

	// 名称：优先 summary，其次 operationId，最后 "METHOD path"
	if op.Summary != "" {
		ep.Name = op.Summary
	} else if op.OperationID != "" {
		ep.Name = op.OperationID
	} else {
		ep.Name = strings.ToUpper(method) + " " + path
	}

	// 处理参数
	var formFields []models.EndpointBodyField
	var bodySchemaParam *openAPIParam
	for i := range op.Parameters {
		p := op.Parameters[i]
		switch p.In {
		case "query":
			ep.Params = append(ep.Params, models.EndpointParam{
				Type:        "query",
				Name:        p.Name,
				Value:       paramExample(p),
				Description: p.Description,
				Enabled:     true,
			})
		case "header":
			ep.Headers = append(ep.Headers, models.EndpointHeader{
				Name:        p.Name,
				Value:       paramExample(p),
				Description: p.Description,
				Enabled:     true,
			})
		case "formData": // Swagger 2.0 表单字段
			fieldType := "text"
			if p.Type == "file" {
				fieldType = "file"
			}
			formFields = append(formFields, models.EndpointBodyField{
				Name:      p.Name,
				Value:     paramExample(p),
				FieldType: fieldType,
				Enabled:   true,
			})
		case "body": // Swagger 2.0 body 参数
			bodySchemaParam = &p
		}
	}

	// Swagger 2.0：body 参数（JSON 请求体）
	if bodySchemaParam != nil && bodySchemaParam.Schema != nil {
		ep.BodyType = string(models.BodyTypeJSON)
		ep.ContentType = "application/json"
		ep.BodyContent = schemaExampleJSON(bodySchemaParam.Schema, nil)
	}

	// Swagger 2.0：表单字段
	if len(formFields) > 0 {
		ep.BodyFields = formFields
		if hasFileField(formFields) || containsMediaType(op.Consumes, "multipart/form-data") {
			ep.BodyType = string(models.BodyTypeFormData)
		} else {
			ep.BodyType = string(models.BodyTypeURLEncoded)
		}
	}

	// OpenAPI 3.x：requestBody
	if op.RequestBody != nil {
		applyRequestBodyV3(&ep, op.RequestBody)
	}

	if ep.BodyType == "" {
		ep.BodyType = string(models.BodyTypeNone)
	}
	return ep
}

// applyRequestBodyV3 处理 OpenAPI 3.x requestBody
func applyRequestBodyV3(ep *parsedEndpoint, rb *openAPIRequestBody) {
	// 优先级：json > urlencoded > multipart
	if mt, ok := rb.Content["application/json"]; ok {
		ep.BodyType = string(models.BodyTypeJSON)
		ep.ContentType = "application/json"
		ep.BodyContent = schemaExampleJSON(mt.Schema, mt.Example)
		return
	}
	if mt, ok := rb.Content["application/x-www-form-urlencoded"]; ok {
		ep.BodyType = string(models.BodyTypeURLEncoded)
		ep.BodyFields = schemaToBodyFields(mt.Schema)
		return
	}
	if mt, ok := rb.Content["multipart/form-data"]; ok {
		ep.BodyType = string(models.BodyTypeFormData)
		ep.BodyFields = schemaToBodyFields(mt.Schema)
		return
	}
	// 其它类型：取第一个 content 作为文本处理
	for ct, mt := range rb.Content {
		ep.ContentType = ct
		ep.BodyType = string(models.BodyTypeText)
		ep.BodyContent = schemaExampleJSON(mt.Schema, mt.Example)
		return
	}
}

// schemaToBodyFields 将对象 schema 的属性转为表单字段
func schemaToBodyFields(schema *openAPISchema) []models.EndpointBodyField {
	if schema == nil || schema.Properties == nil {
		return nil
	}
	var fields []models.EndpointBodyField
	for name, prop := range schema.Properties {
		fieldType := "text"
		if prop.Type == "string" && prop.Format == "binary" {
			fieldType = "file"
		}
		value := ""
		if prop.Example != nil {
			value = toStringValue(prop.Example)
		}
		fields = append(fields, models.EndpointBodyField{
			Name:      name,
			Value:     value,
			FieldType: fieldType,
			Enabled:   true,
		})
	}
	return fields
}

func hasFileField(fields []models.EndpointBodyField) bool {
	for _, f := range fields {
		if f.FieldType == "file" {
			return true
		}
	}
	return false
}

func containsMediaType(list []string, target string) bool {
	for _, s := range list {
		if strings.Contains(s, target) {
			return true
		}
	}
	return false
}

// joinPath 拼接 basePath 与路径，避免出现多余的双斜杠
func joinPath(basePath, path string) string {
	base := strings.TrimRight(basePath, "/")
	if base == "" {
		return path
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return base + path
}

// dupKey 生成重复检测键（同名 + 同方法）
func dupKey(method, name string) string {
	return strings.ToUpper(method) + "\x00" + name
}

// PreviewOpenAPIImport 预览 OpenAPI 导入，标记与目标模块中已有接口重名重方法的项，
// 并返回文档标题、服务器/环境信息，供前端选择是否覆盖模块名、导入环境与前置 URL
func (s *ImportExportService) PreviewOpenAPIImport(moduleID string, jsonStr string) (*OpenAPIPreview, error) {
	doc, err := parseOpenAPIDoc(jsonStr)
	if err != nil {
		return nil, err
	}

	// 目标模块（获取当前名称与所属项目）
	var module models.Module
	if err := s.db.Where("id = ?", moduleID).First(&module).Error; err != nil {
		return nil, fmt.Errorf("目标模块不存在: %w", err)
	}

	existing := s.existingEndpointKeys(moduleID)

	preview := &OpenAPIPreview{
		Items:             make([]OpenAPIPreviewItem, 0, len(doc.Endpoints)),
		ModuleName:        doc.ModuleName,
		CurrentModuleName: module.Name,
	}
	for i, ep := range doc.Endpoints {
		dup := existing[dupKey(ep.Method, ep.Name)]
		if dup {
			preview.DuplicateCount++
		}
		preview.Items = append(preview.Items, OpenAPIPreviewItem{
			Index:     i,
			Name:      ep.Name,
			Method:    ep.Method,
			Path:      ep.Path,
			Duplicate: dup,
		})
	}
	preview.Total = len(preview.Items)

	// 服务器/环境预览：标记项目中是否已存在同名环境
	existingEnvNames := s.existingEnvNames(module.ProjectID)
	for _, srv := range doc.Servers {
		preview.Servers = append(preview.Servers, OpenAPIServerInfo{
			Name:            srv.Name,
			URL:             srv.URL,
			EnvironmentSame: srv.Name != "" && existingEnvNames[srv.Name],
		})
	}

	return preview, nil
}

// existingEnvNames 返回项目中已有环境名称集合
func (s *ImportExportService) existingEnvNames(projectID string) map[string]bool {
	var envs []models.Environment
	s.db.Where("project_id = ?", projectID).Find(&envs)
	names := make(map[string]bool, len(envs))
	for _, e := range envs {
		names[e.Name] = true
	}
	return names
}

// existingEndpointKeys 返回模块中已有端点的重复检测键集合
func (s *ImportExportService) existingEndpointKeys(moduleID string) map[string]bool {
	var endpoints []models.Endpoint
	s.db.Where("module_id = ?", moduleID).Find(&endpoints)
	keys := make(map[string]bool, len(endpoints))
	for _, e := range endpoints {
		keys[dupKey(e.Method, e.Name)] = true
	}
	return keys
}

// ImportOpenAPIToModule 将 OpenAPI/Swagger 文档导入到指定模块（导入到模块根级）
// opts.Overwrite=true 时对重名重方法接口先删除已有再导入，否则跳过；
// opts.OverwriteModuleName=true 时用文档标题覆盖模块名；
// opts.ImportServers=true 时按文档 servers 创建/复用环境并设置模块前置 URL。
func (s *ImportExportService) ImportOpenAPIToModule(moduleID string, jsonStr string, opts OpenAPIImportOptions) (*OpenAPIImportResult, error) {
	// 校验模块存在
	var module models.Module
	if err := s.db.Where("id = ?", moduleID).First(&module).Error; err != nil {
		return nil, fmt.Errorf("目标模块不存在: %w", err)
	}

	doc, err := parseOpenAPIDoc(jsonStr)
	if err != nil {
		return nil, err
	}

	result := &OpenAPIImportResult{}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 覆盖模块名称
		if opts.OverwriteModuleName && doc.ModuleName != "" && doc.ModuleName != module.Name {
			if err := tx.Model(&models.Module{}).Where("id = ?", moduleID).Update("name", doc.ModuleName).Error; err != nil {
				return err
			}
			result.ModuleRenamed = true
		}

		// 导入环境与模块前置 URL
		if opts.ImportServers && len(doc.Servers) > 0 {
			if err := s.importServers(tx, module.ProjectID, moduleID, doc.Servers, result); err != nil {
				return err
			}
		}

		// 加载模块现有端点，建立 key -> ID 列表映射
		var existingList []models.Endpoint
		if err := tx.Where("module_id = ?", moduleID).Find(&existingList).Error; err != nil {
			return err
		}
		existing := make(map[string][]string)
		for _, e := range existingList {
			k := dupKey(e.Method, e.Name)
			existing[k] = append(existing[k], e.ID)
		}

		// 计算模块根级（folder_id 为空）的当前最大排序号
		var maxSort int
		tx.Model(&models.Endpoint{}).Where("module_id = ? AND folder_id IS NULL", moduleID).
			Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

		var selected map[int]bool
		if opts.SelectedIndexes != nil {
			selected = make(map[int]bool, len(opts.SelectedIndexes))
			for _, idx := range opts.SelectedIndexes {
				selected[idx] = true
			}
		}

		for i, ep := range doc.Endpoints {
			if selected != nil && !selected[i] {
				continue
			}
			key := dupKey(ep.Method, ep.Name)
			if ids, dup := existing[key]; dup {
				if !opts.Overwrite {
					result.Skipped++
					continue
				}
				// 覆盖：删除已有的同名同方法端点
				for _, id := range ids {
					if err := deleteEndpointInTx(tx, id); err != nil {
						return err
					}
				}
				delete(existing, key)
				result.Overwritten++
			} else {
				result.Created++
			}

			maxSort++
			if err := createParsedEndpoint(tx, moduleID, ep, maxSort); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	slog.Info("OpenAPI 已导入", "moduleID", moduleID,
		"created", result.Created, "overwritten", result.Overwritten, "skipped", result.Skipped,
		"moduleRenamed", result.ModuleRenamed, "envsCreated", result.EnvironmentsCreated, "baseUrlsSet", result.BaseURLsSet)
	return result, nil
}

// importServers 根据文档 servers 创建/复用环境并设置模块前置 URL
func (s *ImportExportService) importServers(tx *gorm.DB, projectID string, moduleID string, servers []parsedServer, result *OpenAPIImportResult) error {
	// 加载项目现有环境：名称 -> ID
	var envs []models.Environment
	if err := tx.Where("project_id = ?", projectID).Find(&envs).Error; err != nil {
		return err
	}
	envByName := make(map[string]string, len(envs))
	var allEnvIDs []string
	for _, e := range envs {
		envByName[e.Name] = e.ID
		allEnvIDs = append(allEnvIDs, e.ID)
	}

	for _, srv := range servers {
		if srv.URL == "" {
			continue // 无 URL 不设置前置 URL
		}
		if srv.Name != "" {
			// 命名服务器：匹配同名环境，缺失则创建
			envID, ok := envByName[srv.Name]
			if !ok {
				newEnv := models.Environment{ProjectID: projectID, Name: srv.Name}
				if err := tx.Create(&newEnv).Error; err != nil {
					return err
				}
				envID = newEnv.ID
				envByName[srv.Name] = envID
				allEnvIDs = append(allEnvIDs, envID)
				result.EnvironmentsCreated++
			}
			if err := setModuleBaseURLInTx(tx, moduleID, envID, srv.URL); err != nil {
				return err
			}
			result.BaseURLsSet++
		} else {
			// 无名服务器（v2 单一 host）：为项目下所有环境设置相同前置 URL
			for _, envID := range allEnvIDs {
				if err := setModuleBaseURLInTx(tx, moduleID, envID, srv.URL); err != nil {
					return err
				}
				result.BaseURLsSet++
			}
		}
	}
	return nil
}

// setModuleBaseURLInTx 在事务内 upsert 模块在指定环境下的前置 URL
func setModuleBaseURLInTx(tx *gorm.DB, moduleID string, environmentID string, baseURL string) error {
	var existing models.ModuleBaseURL
	result := tx.Where("module_id = ? AND environment_id = ?", moduleID, environmentID).First(&existing)
	if result.Error == gorm.ErrRecordNotFound {
		return tx.Create(&models.ModuleBaseURL{
			ModuleID:      moduleID,
			EnvironmentID: environmentID,
			BaseURL:       baseURL,
		}).Error
	}
	if result.Error != nil {
		return result.Error
	}
	return tx.Model(&existing).Update("base_url", baseURL).Error
}

// createParsedEndpoint 在事务内创建一个解析出的端点（导入到模块根级）
func createParsedEndpoint(tx *gorm.DB, moduleID string, ep parsedEndpoint, sortOrder int) error {
	newEndpoint := &models.Endpoint{
		ModuleID:        moduleID,
		FolderID:        nil,
		Name:            ep.Name,
		Method:          ep.Method,
		Path:            ep.Path,
		BodyType:        ep.BodyType,
		BodyContent:     ep.BodyContent,
		ContentType:     ep.ContentType,
		Timeout:         30000,
		FollowRedirects: true,
		SortOrder:       sortOrder,
	}
	if err := tx.Create(newEndpoint).Error; err != nil {
		return err
	}
	for _, p := range ep.Params {
		p.ID = ""
		p.EndpointID = newEndpoint.ID
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
	}
	for _, h := range ep.Headers {
		h.ID = ""
		h.EndpointID = newEndpoint.ID
		if err := tx.Create(&h).Error; err != nil {
			return err
		}
	}
	for _, bf := range ep.BodyFields {
		bf.ID = ""
		bf.EndpointID = newEndpoint.ID
		if err := tx.Create(&bf).Error; err != nil {
			return err
		}
	}
	return nil
}

// deleteEndpointInTx 在事务内删除端点及其关联数据
func deleteEndpointInTx(tx *gorm.DB, id string) error {
	if err := tx.Where("endpoint_id = ?", id).Delete(&models.EndpointParam{}).Error; err != nil {
		return err
	}
	if err := tx.Where("endpoint_id = ?", id).Delete(&models.EndpointBodyField{}).Error; err != nil {
		return err
	}
	if err := tx.Where("endpoint_id = ?", id).Delete(&models.EndpointHeader{}).Error; err != nil {
		return err
	}
	if err := tx.Where("endpoint_id = ?", id).Delete(&models.EndpointAuth{}).Error; err != nil {
		return err
	}
	if err := tx.Where("endpoint_id = ?", id).Delete(&models.Response{}).Error; err != nil {
		return err
	}
	return tx.Where("id = ?", id).Delete(&models.Endpoint{}).Error
}
