package services

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// ExportedDocument 是可直接下载的模块导出文件。
type ExportedDocument struct {
	FileName  string `json:"fileName"`
	MediaType string `json:"mediaType"`
	Content   string `json:"content"`
	// Encoding 为空表示 UTF-8 文本；base64 用于 ZIP、DOCX 等二进制文件。
	Encoding string `json:"encoding,omitempty"`
}

// ExportModuleAs 统一提供 Apifox 常用的本地交换格式。
func (s *ImportExportService) ExportModuleAs(moduleID, format string) (*ExportedDocument, error) {
	var module models.Module
	if err := s.db.Where("id = ?", moduleID).First(&module).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeModuleNotFound, apperr.P("id", moduleID))
	}
	baseName := safeExportName(module.Name)
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "openapi31", "openapi3.1":
		content, err := s.ExportOpenAPIAs(moduleID, "3.1")
		return exportedDocument(baseName+".openapi-3.1.json", "application/json", content, err)
	case "openapi30", "openapi3.0":
		content, err := s.ExportOpenAPIAs(moduleID, "3.0")
		return exportedDocument(baseName+".openapi-3.0.json", "application/json", content, err)
	case "swagger2", "openapi2":
		content, err := s.ExportOpenAPIAs(moduleID, "2.0")
		return exportedDocument(baseName+".swagger-2.0.json", "application/json", content, err)
	case "postman":
		content, err := s.exportPostmanCollection(module)
		return exportedDocument(baseName+".postman_collection.json", "application/json", content, err)
	case "har":
		content, err := s.exportHAR(module)
		return exportedDocument(baseName+".har", "application/json", content, err)
	case "markdown", "md":
		content, err := s.exportMarkdown(module)
		return exportedDocument(baseName+".md", "text/markdown", content, err)
	default:
		return nil, fmt.Errorf("不支持的导出格式 %q", format)
	}
}

func exportedDocument(fileName, mediaType, content string, err error) (*ExportedDocument, error) {
	if err != nil {
		return nil, err
	}
	return &ExportedDocument{FileName: fileName, MediaType: mediaType, Content: content}, nil
}

func (s *ImportExportService) exportPostmanCollection(module models.Module) (string, error) {
	return s.exportPostmanCollectionFiltered(module, nil)
}

func (s *ImportExportService) exportPostmanCollectionFiltered(module models.Module, selected map[string]bool) (string, error) {
	rootEndpoints, folders, children, folderEndpoints, err := s.exportModuleTreeFiltered(module.ID, selected)
	if err != nil {
		return "", err
	}
	items := make([]any, 0, len(rootEndpoints)+len(folders))
	for _, endpoint := range rootEndpoints {
		if item := s.postmanExportItem(endpoint); item != nil {
			items = append(items, item)
		}
	}
	for _, folder := range folders {
		if folder.ParentID != nil {
			continue
		}
		items = append(items, s.postmanExportFolder(folder, children, folderEndpoints))
	}

	variables := map[string]any{}
	var moduleVariables []models.ModuleVariable
	if err := s.db.Where("module_id = ?", module.ID).Order("sort_order ASC").Find(&moduleVariables).Error; err == nil {
		for _, variable := range moduleVariables {
			if variable.Enabled {
				variables[variable.Key] = variable.Value
			}
		}
	}
	doc := postmanCollectionDocument(module.Name, items, variables)
	info := doc["info"].(map[string]any)
	info["description"] = "Exported by PostPigeon"
	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeExportFailed)
	}
	return string(out), nil
}

func (s *ImportExportService) postmanExportFolder(folder models.Folder, children map[string][]models.Folder, endpoints map[string][]models.Endpoint) map[string]any {
	items := make([]any, 0, len(endpoints[folder.ID])+len(children[folder.ID]))
	for _, endpoint := range endpoints[folder.ID] {
		if item := s.postmanExportItem(endpoint); item != nil {
			items = append(items, item)
		}
	}
	for _, child := range children[folder.ID] {
		items = append(items, s.postmanExportFolder(child, children, endpoints))
	}
	return map[string]any{"name": folder.Name, "item": items}
}

func (s *ImportExportService) postmanExportItem(endpoint models.Endpoint) map[string]any {
	detail, err := NewEndpointService(s.db).GetEndpoint(endpoint.ID)
	if err != nil {
		return nil
	}
	query := make([]any, 0)
	pathVariables := make([]any, 0)
	for _, param := range detail.Params {
		if param.Name == "" {
			continue
		}
		item := map[string]any{
			"key": param.Name, "value": param.Value, "description": param.Description, "disabled": !param.Enabled,
		}
		switch param.Type {
		case "query":
			query = append(query, item)
		case "path":
			pathVariables = append(pathVariables, item)
		}
	}
	headers := make([]any, 0, len(detail.Headers))
	for _, header := range detail.Headers {
		if header.Name == "" {
			continue
		}
		headers = append(headers, map[string]any{
			"key": header.Name, "value": header.Value, "description": header.Description, "disabled": !header.Enabled,
		})
	}
	request := map[string]any{
		"method":      strings.ToUpper(firstNonEmpty(endpoint.Method, "GET")),
		"header":      headers,
		"url":         map[string]any{"raw": firstNonEmpty(endpoint.Path, "/"), "query": query, "variable": pathVariables},
		"description": endpoint.Description,
	}
	if body := postmanExportBody(endpoint, detail); body != nil {
		request["body"] = body
	}
	if auth := postmanExportAuth(detail.Auth); auth != nil {
		request["auth"] = auth
	}
	item := map[string]any{"name": endpoint.Name, "request": request}
	if events := postmanExportEvents(endpoint); len(events) > 0 {
		item["event"] = events
	}
	return item
}

func postmanExportBody(endpoint models.Endpoint, detail *EndpointDetail) map[string]any {
	switch endpoint.BodyType {
	case string(models.BodyTypeJSON), string(models.BodyTypeXML), string(models.BodyTypeText):
		return map[string]any{
			"mode": "raw", "raw": endpoint.BodyContent,
			"options": map[string]any{"raw": map[string]any{"language": postmanRawLanguage(endpoint.ContentType)}},
		}
	case string(models.BodyTypeGraphQL):
		var body models.GraphQLBody
		_ = json.Unmarshal([]byte(endpoint.BodyContent), &body)
		return map[string]any{"mode": "graphql", "graphql": map[string]any{
			"query": body.Query, "variables": body.Variables, "operationName": body.OperationName,
		}}
	case string(models.BodyTypeFormData), string(models.BodyTypeURLEncoded):
		mode := "urlencoded"
		if endpoint.BodyType == string(models.BodyTypeFormData) {
			mode = "formdata"
		}
		fields := make([]any, 0, len(detail.BodyFields))
		for _, field := range detail.BodyFields {
			item := map[string]any{
				"key": field.Name, "value": field.Value, "description": field.Description,
				"disabled": !field.Enabled, "type": "text", "contentType": field.ContentType,
			}
			if field.FieldType == "file" {
				item["type"] = "file"
				item["src"] = exportedFilePath(field.Value)
			}
			fields = append(fields, item)
		}
		return map[string]any{"mode": mode, mode: fields}
	case string(models.BodyTypeBinary):
		return map[string]any{"mode": "file", "file": map[string]any{"src": exportedFilePath(endpoint.BodyContent)}}
	}
	return nil
}

func postmanExportAuth(auth *models.EndpointAuth) map[string]any {
	if auth == nil {
		return nil
	}
	switch auth.Type {
	case string(models.AuthTypeNone):
		return map[string]any{"type": "noauth"}
	case string(models.AuthTypeBasic):
		var data models.BasicAuthData
		_ = json.Unmarshal([]byte(auth.Data), &data)
		return map[string]any{"type": "basic", "basic": []any{
			map[string]any{"key": "username", "value": data.Username, "type": "string"},
			map[string]any{"key": "password", "value": data.Password, "type": "string"},
		}}
	case string(models.AuthTypeBearer):
		var data models.BearerAuthData
		_ = json.Unmarshal([]byte(auth.Data), &data)
		return map[string]any{"type": "bearer", "bearer": []any{map[string]any{"key": "token", "value": data.Token, "type": "string"}}}
	case string(models.AuthTypeAPIKey):
		var data models.APIKeyAuthData
		_ = json.Unmarshal([]byte(auth.Data), &data)
		return map[string]any{"type": "apikey", "apikey": []any{
			map[string]any{"key": "key", "value": data.Key, "type": "string"},
			map[string]any{"key": "value", "value": data.Value, "type": "string"},
			map[string]any{"key": "in", "value": firstNonEmpty(data.In, "header"), "type": "string"},
		}}
	}
	return nil
}

func postmanExportEvents(endpoint models.Endpoint) []any {
	var events []any
	for _, item := range []struct {
		listen string
		script string
	}{{"prerequest", endpoint.PreRequestScript}, {"test", endpoint.PostResponseScript}} {
		if strings.TrimSpace(item.script) == "" {
			continue
		}
		events = append(events, map[string]any{"listen": item.listen, "script": map[string]any{
			"type": "text/javascript", "exec": strings.Split(item.script, "\n"),
		}})
	}
	return events
}

func (s *ImportExportService) exportHAR(module models.Module) (string, error) {
	return s.exportHARFiltered(module, nil, "")
}

func (s *ImportExportService) exportHARFiltered(module models.Module, selected map[string]bool, environmentID string) (string, error) {
	rootEndpoints, folders, _, folderEndpoints, err := s.exportModuleTreeFiltered(module.ID, selected)
	if err != nil {
		return "", err
	}
	baseURL := s.exportBaseURLForEnvironment(module.ID, environmentID)
	entries := make([]any, 0)
	appendEndpoint := func(endpoint models.Endpoint, pageRef string) {
		detail, detailErr := NewEndpointService(s.db).GetEndpoint(endpoint.ID)
		if detailErr != nil {
			return
		}
		requestURL := joinExportURL(baseURL, endpoint.Path, detail.Params)
		request := map[string]any{
			"method":      strings.ToUpper(firstNonEmpty(endpoint.Method, "GET")),
			"url":         requestURL,
			"httpVersion": "HTTP/1.1",
			"headers":     harExportHeaders(detail.Headers),
			"queryString": harExportQuery(detail.Params),
			"cookies":     []any{},
			"headersSize": -1,
			"bodySize":    -1,
		}
		if body := harExportPostData(endpoint, detail); body != nil {
			request["postData"] = body
		}
		entry := map[string]any{
			"request": request,
			"response": map[string]any{
				"status": 0, "statusText": "", "httpVersion": "HTTP/1.1", "headers": []any{}, "cookies": []any{},
				"content": map[string]any{"size": 0, "mimeType": "text/plain", "text": ""}, "redirectURL": "", "headersSize": -1, "bodySize": -1,
			},
			"cache": map[string]any{}, "timings": map[string]any{"send": 0, "wait": 0, "receive": 0}, "time": 0,
		}
		if pageRef != "" {
			entry["pageref"] = pageRef
		}
		entries = append(entries, entry)
	}
	for _, endpoint := range rootEndpoints {
		appendEndpoint(endpoint, "")
	}
	pages := make([]any, 0, len(folders))
	for _, folder := range folders {
		pages = append(pages, map[string]any{
			"id": folder.ID, "title": folder.Name, "pageTimings": map[string]any{},
		})
		for _, endpoint := range folderEndpoints[folder.ID] {
			appendEndpoint(endpoint, folder.ID)
		}
	}
	doc := map[string]any{"log": map[string]any{
		"version": "1.2", "creator": map[string]any{"name": "PostPigeon", "version": "1"},
		"pages": pages, "entries": entries,
	}}
	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeExportFailed)
	}
	return string(out), nil
}

func (s *ImportExportService) exportMarkdown(module models.Module) (string, error) {
	return s.exportMarkdownFiltered(module, nil)
}

func (s *ImportExportService) exportMarkdownFiltered(module models.Module, selected map[string]bool) (string, error) {
	rootEndpoints, folders, _, folderEndpoints, err := s.exportModuleTreeFiltered(module.ID, selected)
	if err != nil {
		return "", err
	}
	var out strings.Builder
	fmt.Fprintf(&out, "# %s\n\n", module.Name)
	writeEndpoint := func(endpoint models.Endpoint) {
		detail, detailErr := NewEndpointService(s.db).GetEndpoint(endpoint.ID)
		if detailErr != nil {
			return
		}
		fmt.Fprintf(&out, "### `%s` %s\n\n", strings.ToUpper(endpoint.Method), firstNonEmpty(endpoint.Path, "/"))
		if endpoint.Name != "" {
			fmt.Fprintf(&out, "**%s**\n\n", endpoint.Name)
		}
		if endpoint.Description != "" {
			fmt.Fprintf(&out, "%s\n\n", endpoint.Description)
		}
		writeMarkdownParameters(&out, detail)
		if endpoint.BodyType != string(models.BodyTypeNone) && endpoint.BodyType != "" {
			fmt.Fprintf(&out, "#### Request body\n\nContent-Type: `%s`\n\n", defaultStr(endpoint.ContentType, endpoint.BodyType))
			if endpoint.BodyContent != "" {
				fmt.Fprintf(&out, "```%s\n%s\n```\n\n", markdownFenceLanguage(endpoint.ContentType), endpoint.BodyContent)
			}
		}
		for _, example := range detail.Examples {
			fmt.Fprintf(&out, "#### Response %d — %s\n\n```%s\n%s\n```\n\n", example.StatusCode, example.Name, markdownFenceLanguage(example.ContentType), example.Body)
		}
	}
	for _, endpoint := range rootEndpoints {
		writeEndpoint(endpoint)
	}
	for _, folder := range folders {
		fmt.Fprintf(&out, "## %s\n\n", folder.Name)
		for _, endpoint := range folderEndpoints[folder.ID] {
			writeEndpoint(endpoint)
		}
	}
	return out.String(), nil
}

func (s *ImportExportService) exportModuleTree(moduleID string) ([]models.Endpoint, []models.Folder, map[string][]models.Folder, map[string][]models.Endpoint, error) {
	return s.exportModuleTreeFiltered(moduleID, nil)
}

func (s *ImportExportService) exportModuleTreeFiltered(moduleID string, selected map[string]bool) ([]models.Endpoint, []models.Folder, map[string][]models.Folder, map[string][]models.Endpoint, error) {
	var endpoints []models.Endpoint
	if err := s.db.Where("module_id = ? AND type = ?", moduleID, string(models.EndpointTypeHTTP)).Order("sort_order ASC").Find(&endpoints).Error; err != nil {
		return nil, nil, nil, nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}
	var folders []models.Folder
	if err := s.db.Where("module_id = ?", moduleID).Order("sort_order ASC").Find(&folders).Error; err != nil {
		return nil, nil, nil, nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}
	rootFolderID := ""
	for _, folder := range folders {
		if folder.ParentID == nil && folder.Name == "__root" {
			rootFolderID = folder.ID
			break
		}
	}
	if selected != nil {
		filtered := endpoints[:0]
		for _, endpoint := range endpoints {
			if selected[endpoint.ID] {
				filtered = append(filtered, endpoint)
			}
		}
		endpoints = filtered
	}
	includedFolders := map[string]bool{}
	folderByID := make(map[string]models.Folder, len(folders))
	for _, folder := range folders {
		folderByID[folder.ID] = folder
	}
	for _, endpoint := range endpoints {
		for folderID := endpoint.FolderID; folderID != nil && *folderID != "" && !includedFolders[*folderID]; {
			includedFolders[*folderID] = true
			folder, ok := folderByID[*folderID]
			if !ok {
				break
			}
			folderID = folder.ParentID
		}
	}
	var root []models.Endpoint
	folderEndpoints := map[string][]models.Endpoint{}
	for _, endpoint := range endpoints {
		if endpoint.FolderID == nil || *endpoint.FolderID == "" || *endpoint.FolderID == rootFolderID {
			root = append(root, endpoint)
		} else {
			folderEndpoints[*endpoint.FolderID] = append(folderEndpoints[*endpoint.FolderID], endpoint)
		}
	}
	exportedFolders := make([]models.Folder, 0, len(folders))
	children := map[string][]models.Folder{}
	for _, folder := range folders {
		if folder.ID == rootFolderID {
			continue
		}
		if selected != nil && !includedFolders[folder.ID] {
			continue
		}
		if folder.ParentID != nil && *folder.ParentID == rootFolderID {
			folder.ParentID = nil
		}
		exportedFolders = append(exportedFolders, folder)
		if folder.ParentID != nil {
			children[*folder.ParentID] = append(children[*folder.ParentID], folder)
		}
	}
	return root, exportedFolders, children, folderEndpoints, nil
}

func (s *ImportExportService) exportBaseURL(moduleID string) string {
	return s.exportBaseURLForEnvironment(moduleID, "")
}

func (s *ImportExportService) exportBaseURLForEnvironment(moduleID, environmentID string) string {
	var values []models.ModuleBaseURL
	query := s.db.Where("module_id = ?", moduleID)
	if environmentID != "" {
		query = query.Where("environment_id = ?", environmentID)
	}
	if err := query.Order("base_url ASC").Find(&values).Error; err != nil {
		return ""
	}
	for _, value := range values {
		if strings.TrimSpace(value.BaseURL) != "" {
			return strings.TrimRight(value.BaseURL, "/")
		}
	}
	return ""
}

func joinExportURL(baseURL, path string, params []models.EndpointParam) string {
	raw := firstNonEmpty(path, "/")
	if baseURL != "" && !strings.Contains(raw, "://") {
		raw = strings.TrimRight(baseURL, "/") + ensureLeadingSlash(raw)
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	query := parsed.Query()
	for _, param := range params {
		if param.Enabled && param.Type == "query" && param.Name != "" {
			query.Add(param.Name, param.Value)
		}
	}
	parsed.RawQuery = query.Encode()
	return strings.NewReplacer("%7B", "{", "%7D", "}", "%7b", "{", "%7d", "}").Replace(parsed.String())
}

func harExportHeaders(headers []models.EndpointHeader) []any {
	result := make([]any, 0, len(headers))
	for _, header := range headers {
		if header.Enabled && header.Name != "" {
			result = append(result, map[string]any{"name": header.Name, "value": header.Value})
		}
	}
	return result
}

func harExportQuery(params []models.EndpointParam) []any {
	result := make([]any, 0)
	for _, param := range params {
		if param.Enabled && param.Type == "query" && param.Name != "" {
			result = append(result, map[string]any{"name": param.Name, "value": param.Value})
		}
	}
	return result
}

func harExportPostData(endpoint models.Endpoint, detail *EndpointDetail) map[string]any {
	switch endpoint.BodyType {
	case string(models.BodyTypeJSON), string(models.BodyTypeXML), string(models.BodyTypeText), string(models.BodyTypeGraphQL):
		return map[string]any{"mimeType": defaultStr(endpoint.ContentType, "text/plain"), "text": endpoint.BodyContent}
	case string(models.BodyTypeFormData), string(models.BodyTypeURLEncoded):
		mimeType := "application/x-www-form-urlencoded"
		if endpoint.BodyType == string(models.BodyTypeFormData) {
			mimeType = "multipart/form-data"
		}
		params := make([]any, 0, len(detail.BodyFields))
		for _, field := range detail.BodyFields {
			if !field.Enabled || field.Name == "" {
				continue
			}
			item := map[string]any{"name": field.Name, "value": field.Value}
			if field.FieldType == "file" {
				item["fileName"] = exportedFilePath(field.Value)
			}
			if field.ContentType != "" {
				item["contentType"] = field.ContentType
			}
			params = append(params, item)
		}
		return map[string]any{"mimeType": mimeType, "params": params}
	}
	return nil
}

func writeMarkdownParameters(out *strings.Builder, detail *EndpointDetail) {
	rows := make([][5]string, 0, len(detail.Params)+len(detail.Headers))
	for _, param := range detail.Params {
		if param.Enabled {
			rows = append(rows, [5]string{param.Type, param.Name, defaultStr(param.DataType, "string"), fmt.Sprint(param.Required), firstNonEmpty(param.Description, param.Example)})
		}
	}
	for _, header := range detail.Headers {
		if header.Enabled {
			rows = append(rows, [5]string{"header", header.Name, "string", fmt.Sprint(header.Required), firstNonEmpty(header.Description, header.Example)})
		}
	}
	if len(rows) == 0 {
		return
	}
	out.WriteString("#### Parameters\n\n| In | Name | Type | Required | Description / example |\n|---|---|---|---|---|\n")
	for _, row := range rows {
		fmt.Fprintf(out, "| %s | `%s` | %s | %s | %s |\n", row[0], strings.ReplaceAll(row[1], "|", "\\|"), row[2], row[3], strings.ReplaceAll(row[4], "|", "\\|"))
	}
	out.WriteString("\n")
}

func markdownFenceLanguage(contentType string) string {
	switch {
	case strings.Contains(strings.ToLower(contentType), "json"):
		return "json"
	case strings.Contains(strings.ToLower(contentType), "xml"):
		return "xml"
	case strings.Contains(strings.ToLower(contentType), "html"):
		return "html"
	default:
		return "text"
	}
}

func exportedFilePath(raw string) string {
	var value struct {
		Path     string `json:"path"`
		FileName string `json:"fileName"`
	}
	if json.Unmarshal([]byte(raw), &value) == nil {
		return firstNonEmpty(value.Path, value.FileName)
	}
	return raw
}

func safeExportName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "module"
	}
	replacer := strings.NewReplacer("/", "-", "\\", "-", ":", "-", "\x00", "")
	return replacer.Replace(name)
}
