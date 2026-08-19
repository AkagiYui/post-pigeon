package services

import (
	"encoding/json"
	"strings"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// PostmanService 导入 Postman Collection v2.x。
//
// Postman 是事实上的交换格式，团队里常有一份现成的 collection。这里把它的
// item 树映射到「文件夹 / 接口」，变量映射到环境变量，并把 {{var}} 占位符
// 原样保留——两边的变量语法恰好一致。
type PostmanService struct {
	db *gorm.DB
}

// NewPostmanService 创建 Postman 导入服务实例。
func NewPostmanService(db *gorm.DB) *PostmanService {
	return &PostmanService{db: db}
}

// ---- Postman Collection 结构（只取导入需要的字段）----

type postmanCollection struct {
	Info      postmanInfo       `json:"info"`
	Item      []postmanItem     `json:"item"`
	Variable  []postmanVariable `json:"variable"`
	Auth      *postmanAuth      `json:"auth"`
	Event     []postmanEvent    `json:"event"`
	Responses []json.RawMessage `json:"response"`
}

type postmanInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Schema      string `json:"schema"`
}

type postmanVariable struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Disabled bool   `json:"disabled"`
}

type postmanItem struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Item        []postmanItem   `json:"item"`
	Request     *postmanRequest `json:"request"`
	Event       []postmanEvent  `json:"event"`
}

type postmanEvent struct {
	Listen string        `json:"listen"` // prerequest | test
	Script postmanScript `json:"script"`
}

type postmanScript struct {
	Exec []string `json:"exec"`
}

type postmanRequest struct {
	Method      string            `json:"method"`
	Header      []postmanHeader   `json:"header"`
	Body        *postmanBody      `json:"body"`
	URL         postmanURL        `json:"url"`
	Auth        *postmanAuth      `json:"auth"`
	Description string            `json:"description"`
	Extra       map[string]any    `json:"-"`
	Variable    []postmanVariable `json:"variable"`
}

type postmanHeader struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Disabled bool   `json:"disabled"`
}

type postmanBody struct {
	Mode       string            `json:"mode"` // raw | urlencoded | formdata | file | graphql
	Raw        string            `json:"raw"`
	URLEncoded []postmanKV       `json:"urlencoded"`
	FormData   []postmanKV       `json:"formdata"`
	Options    map[string]any    `json:"options"`
	GraphQL    map[string]string `json:"graphql"`
}

type postmanKV struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Type     string `json:"type"` // text | file
	Src      any    `json:"src"`
	Disabled bool   `json:"disabled"`
}

// postmanURL 既可能是字符串，也可能是结构体，需自定义解码。
type postmanURL struct {
	Raw      string
	Path     []string
	Host     []string
	Query    []postmanKV
	Variable []postmanVariable
}

func (u *postmanURL) UnmarshalJSON(data []byte) error {
	// 形式一：直接是一个字符串
	var raw string
	if err := json.Unmarshal(data, &raw); err == nil {
		u.Raw = raw
		return nil
	}
	// 形式二：结构体
	var structured struct {
		Raw      string            `json:"raw"`
		Path     any               `json:"path"`
		Host     any               `json:"host"`
		Query    []postmanKV       `json:"query"`
		Variable []postmanVariable `json:"variable"`
	}
	if err := json.Unmarshal(data, &structured); err != nil {
		return err
	}
	u.Raw = structured.Raw
	u.Path = toStringSlice(structured.Path)
	u.Host = toStringSlice(structured.Host)
	u.Query = structured.Query
	u.Variable = structured.Variable
	return nil
}

// toStringSlice 把 path/host 统一成字符串切片（它们既可能是数组也可能是字符串）。
func toStringSlice(v any) []string {
	switch value := v.(type) {
	case string:
		if value == "" {
			return nil
		}
		return strings.Split(strings.Trim(value, "/"), "/")
	case []any:
		out := make([]string, 0, len(value))
		for _, item := range value {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	}
	return nil
}

type postmanAuth struct {
	Type   string      `json:"type"`
	Basic  []postmanKV `json:"basic"`
	Bearer []postmanKV `json:"bearer"`
	APIKey []postmanKV `json:"apikey"`
}

// kvValue 在 auth 的键值数组里按 key 取值。
func kvValue(list []postmanKV, key string) string {
	for _, item := range list {
		if item.Key == key {
			return item.Value
		}
	}
	return ""
}

// ---- 预览与导入 ----

// PostmanPreview 是导入前的概览，供用户确认。
type PostmanPreview struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Folders     int    `json:"folders"`
	Endpoints   int    `json:"endpoints"`
	Variables   int    `json:"variables"`
	// HasScripts 表示集合中存在前置/后置脚本，导入后会转成接口脚本
	HasScripts bool `json:"hasScripts"`
}

// PostmanImportResult 是导入结果统计。
type PostmanImportResult struct {
	ModuleID  string `json:"moduleId"`
	Folders   int    `json:"folders"`
	Endpoints int    `json:"endpoints"`
	Variables int    `json:"variables"`
}

// PreviewPostman 解析 Postman Collection 并返回概览。
func (s *PostmanService) PreviewPostman(jsonStr string) (*PostmanPreview, error) {
	collection, err := parsePostman(jsonStr)
	if err != nil {
		return nil, err
	}
	preview := &PostmanPreview{
		Name:        collection.Info.Name,
		Description: collection.Info.Description,
		Variables:   len(collection.Variable),
	}
	countPostmanItems(collection.Item, preview)
	if hasPostmanScript(collection.Event) {
		preview.HasScripts = true
	}
	return preview, nil
}

// ImportPostman 把 Postman Collection 作为一个新模块导入指定项目。
func (s *PostmanService) ImportPostman(projectID string, jsonStr string) (*PostmanImportResult, error) {
	collection, err := parsePostman(jsonStr)
	if err != nil {
		return nil, err
	}

	result := &PostmanImportResult{}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		moduleName := strings.TrimSpace(collection.Info.Name)
		if moduleName == "" {
			moduleName = "Postman Collection"
		}
		module := &models.Module{ProjectID: projectID, Name: moduleName}
		if err := tx.Create(module).Error; err != nil {
			return apperr.Wrap(err, apperr.CodeImportFailed)
		}
		result.ModuleID = module.ID

		// 集合变量导入为项目全局变量：它们在 Postman 里也是跨环境生效的
		for _, variable := range collection.Variable {
			if strings.TrimSpace(variable.Key) == "" {
				continue
			}
			record := &models.GlobalVariable{
				ProjectID: projectID,
				Key:       variable.Key,
				Value:     variable.Value,
				Enabled:   !variable.Disabled,
			}
			if err := tx.Create(record).Error; err != nil {
				return apperr.Wrap(err, apperr.CodeImportFailed)
			}
			result.Variables++
		}

		// 集合级脚本作为每个接口的兜底脚本
		collectionPre := joinPostmanScript(collection.Event, "prerequest")
		collectionPost := joinPostmanScript(collection.Event, "test")

		return s.importItems(tx, module.ID, nil, collection.Item, collectionPre, collectionPost, result)
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// importItems 递归导入 item 树：带 request 的是接口，带子 item 的是文件夹。
func (s *PostmanService) importItems(
	tx *gorm.DB, moduleID string, folderID *string, items []postmanItem,
	inheritedPre, inheritedPost string, result *PostmanImportResult,
) error {
	for index, item := range items {
		itemPre := firstNonEmpty(joinPostmanScript(item.Event, "prerequest"), inheritedPre)
		itemPost := firstNonEmpty(joinPostmanScript(item.Event, "test"), inheritedPost)

		if item.Request == nil {
			if len(item.Item) == 0 {
				continue
			}
			folder := &models.Folder{
				ModuleID:  moduleID,
				ParentID:  folderID,
				Name:      defaultStr(item.Name, "folder"),
				SortOrder: index,
			}
			if err := tx.Create(folder).Error; err != nil {
				return apperr.Wrap(err, apperr.CodeImportFailed)
			}
			result.Folders++
			if err := s.importItems(tx, moduleID, &folder.ID, item.Item, itemPre, itemPost, result); err != nil {
				return err
			}
			continue
		}

		if err := s.createEndpointFromPostman(tx, moduleID, folderID, item, itemPre, itemPost, index); err != nil {
			return err
		}
		result.Endpoints++
	}
	return nil
}

// createEndpointFromPostman 由一个 Postman request 创建接口及其参数/请求头/认证。
func (s *PostmanService) createEndpointFromPostman(
	tx *gorm.DB, moduleID string, folderID *string, item postmanItem,
	preScript, postScript string, sortOrder int,
) error {
	request := item.Request
	path, query := postmanPathAndQuery(request.URL)

	endpoint := &models.Endpoint{
		ModuleID:           moduleID,
		FolderID:           folderID,
		Name:               defaultStr(item.Name, path),
		Type:               string(models.EndpointTypeHTTP),
		Method:             strings.ToUpper(defaultStr(request.Method, "GET")),
		Path:               path,
		Description:        firstNonEmpty(item.Description, request.Description),
		SortOrder:          sortOrder,
		FollowRedirects:    true,
		Timeout:            30000,
		InheritOperations:  true,
		PreRequestScript:   preScript,
		PostResponseScript: postScript,
	}
	applyPostmanBody(endpoint, request.Body)
	if err := tx.Create(endpoint).Error; err != nil {
		return apperr.Wrap(err, apperr.CodeImportFailed)
	}

	// 查询参数
	for _, param := range query {
		if strings.TrimSpace(param.Key) == "" {
			continue
		}
		record := &models.EndpointParam{
			EndpointID: endpoint.ID, Type: "query",
			Name: param.Key, Value: param.Value, Enabled: !param.Disabled,
		}
		if err := tx.Create(record).Error; err != nil {
			return apperr.Wrap(err, apperr.CodeImportFailed)
		}
	}
	// 路径参数（Postman 的 :id 形式已在 postmanPathAndQuery 里转成 {id}）
	for _, variable := range request.URL.Variable {
		if strings.TrimSpace(variable.Key) == "" {
			continue
		}
		record := &models.EndpointParam{
			EndpointID: endpoint.ID, Type: "path",
			Name: variable.Key, Value: variable.Value, Enabled: true,
		}
		if err := tx.Create(record).Error; err != nil {
			return apperr.Wrap(err, apperr.CodeImportFailed)
		}
	}
	// 请求头
	for _, header := range request.Header {
		if strings.TrimSpace(header.Key) == "" {
			continue
		}
		record := &models.EndpointHeader{
			EndpointID: endpoint.ID,
			Name:       header.Key, Value: header.Value, Enabled: !header.Disabled,
		}
		if err := tx.Create(record).Error; err != nil {
			return apperr.Wrap(err, apperr.CodeImportFailed)
		}
	}
	// 请求体字段
	if request.Body != nil {
		for _, field := range postmanBodyFields(request.Body) {
			field.EndpointID = endpoint.ID
			record := field
			if err := tx.Create(&record).Error; err != nil {
				return apperr.Wrap(err, apperr.CodeImportFailed)
			}
		}
	}
	// 认证
	if auth := convertPostmanAuth(request.Auth); auth != nil {
		auth.EndpointID = endpoint.ID
		if err := tx.Create(auth).Error; err != nil {
			return apperr.Wrap(err, apperr.CodeImportFailed)
		}
	}
	return nil
}

// postmanPathAndQuery 从 URL 中取出路径与查询参数。
// Postman 用 :id 表示路径参数，这里统一转成本项目的 {id} 约定。
func postmanPathAndQuery(u postmanURL) (string, []postmanKV) {
	query := u.Query

	path := ""
	if len(u.Path) > 0 {
		path = "/" + strings.Join(u.Path, "/")
	} else if u.Raw != "" {
		raw := u.Raw
		if idx := strings.Index(raw, "?"); idx >= 0 {
			raw = raw[:idx]
		}
		// 去掉协议与主机，只留路径
		if idx := strings.Index(raw, "://"); idx >= 0 {
			rest := raw[idx+3:]
			if slash := strings.Index(rest, "/"); slash >= 0 {
				path = rest[slash:]
			} else {
				path = "/"
			}
		} else {
			path = raw
		}
	}
	if path == "" {
		path = "/"
	}

	// :id -> {id}
	segments := strings.Split(path, "/")
	for i, segment := range segments {
		if strings.HasPrefix(segment, ":") && len(segment) > 1 {
			segments[i] = "{" + segment[1:] + "}"
		}
	}
	return strings.Join(segments, "/"), query
}

// applyPostmanBody 把 Postman 的 body.mode 映射到本项目的请求体类型。
func applyPostmanBody(endpoint *models.Endpoint, body *postmanBody) {
	if body == nil {
		endpoint.BodyType = string(models.BodyTypeNone)
		return
	}
	switch body.Mode {
	case "raw":
		endpoint.BodyContent = body.Raw
		endpoint.BodyType = string(models.BodyTypeText)
		// options.raw.language 指明了 raw 的具体语言
		if raw, ok := body.Options["raw"].(map[string]any); ok {
			switch raw["language"] {
			case "json":
				endpoint.BodyType = string(models.BodyTypeJSON)
				endpoint.ContentType = "application/json"
			case "xml":
				endpoint.BodyType = string(models.BodyTypeXML)
				endpoint.ContentType = "application/xml"
			}
		}
		if endpoint.BodyType == string(models.BodyTypeText) {
			trimmed := strings.TrimSpace(body.Raw)
			if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
				endpoint.BodyType = string(models.BodyTypeJSON)
				endpoint.ContentType = "application/json"
			}
		}
	case "urlencoded":
		endpoint.BodyType = string(models.BodyTypeURLEncoded)
	case "formdata":
		endpoint.BodyType = string(models.BodyTypeFormData)
	case "graphql":
		endpoint.BodyType = string(models.BodyTypeGraphQL)
		endpoint.ContentType = "application/json"
		endpoint.BodyContent = models.ToJSON(models.GraphQLBody{
			Query:         body.GraphQL["query"],
			Variables:     body.GraphQL["variables"],
			OperationName: body.GraphQL["operationName"],
		})
	default:
		endpoint.BodyType = string(models.BodyTypeNone)
	}
}

// postmanBodyFields 提取 urlencoded / formdata 的字段。
func postmanBodyFields(body *postmanBody) []models.EndpointBodyField {
	var source []postmanKV
	switch body.Mode {
	case "urlencoded":
		source = body.URLEncoded
	case "formdata":
		source = body.FormData
	default:
		return nil
	}
	fields := make([]models.EndpointBodyField, 0, len(source))
	for _, item := range source {
		if strings.TrimSpace(item.Key) == "" {
			continue
		}
		fieldType := "text"
		if item.Type == "file" {
			fieldType = "file"
		}
		fields = append(fields, models.EndpointBodyField{
			Name: item.Key, Value: item.Value, FieldType: fieldType, Enabled: !item.Disabled,
		})
	}
	return fields
}

// convertPostmanAuth 把 Postman 的 auth 转成端点认证。
func convertPostmanAuth(auth *postmanAuth) *models.EndpointAuth {
	if auth == nil {
		return nil
	}
	switch auth.Type {
	case "basic":
		return &models.EndpointAuth{
			Type: string(models.AuthTypeBasic),
			Data: models.ToJSON(models.BasicAuthData{
				Username: kvValue(auth.Basic, "username"),
				Password: kvValue(auth.Basic, "password"),
			}),
		}
	case "bearer":
		return &models.EndpointAuth{
			Type: string(models.AuthTypeBearer),
			Data: models.ToJSON(models.BearerAuthData{Token: kvValue(auth.Bearer, "token")}),
		}
	case "apikey":
		in := kvValue(auth.APIKey, "in")
		if in == "" {
			in = "header"
		}
		return &models.EndpointAuth{
			Type: string(models.AuthTypeAPIKey),
			Data: models.ToJSON(models.APIKeyAuthData{
				Key:   kvValue(auth.APIKey, "key"),
				Value: kvValue(auth.APIKey, "value"),
				In:    in,
			}),
		}
	case "noauth":
		return &models.EndpointAuth{Type: string(models.AuthTypeNone)}
	}
	return nil
}

// parsePostman 解析并校验 Collection JSON。
func parsePostman(jsonStr string) (*postmanCollection, error) {
	var collection postmanCollection
	if err := json.Unmarshal([]byte(jsonStr), &collection); err != nil {
		return nil, apperr.Wrap(err, apperr.CodeImportParse)
	}
	// schema 里带 collection 才认为是 Postman Collection
	if !strings.Contains(collection.Info.Schema, "getpostman.com") && len(collection.Item) == 0 {
		return nil, apperr.New(apperr.CodeUnsupportedFormat, apperr.P("format", "postman"))
	}
	return &collection, nil
}

// countPostmanItems 递归统计文件夹与接口数量。
func countPostmanItems(items []postmanItem, preview *PostmanPreview) {
	for _, item := range items {
		if item.Request != nil {
			preview.Endpoints++
		} else if len(item.Item) > 0 {
			preview.Folders++
			countPostmanItems(item.Item, preview)
		}
		if hasPostmanScript(item.Event) {
			preview.HasScripts = true
		}
	}
}

// hasPostmanScript 判断事件列表中是否含非空脚本。
func hasPostmanScript(events []postmanEvent) bool {
	for _, event := range events {
		for _, line := range event.Script.Exec {
			if strings.TrimSpace(line) != "" {
				return true
			}
		}
	}
	return false
}

// joinPostmanScript 取出指定阶段的脚本内容（多行拼接）。
func joinPostmanScript(events []postmanEvent, listen string) string {
	for _, event := range events {
		if event.Listen != listen {
			continue
		}
		script := strings.TrimSpace(strings.Join(event.Script.Exec, "\n"))
		if script != "" {
			return script
		}
	}
	return ""
}
