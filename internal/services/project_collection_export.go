package services

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"os"
	"sort"
	"strings"
	"unicode/utf8"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// ExportProjectAs 提供与 Apifox「项目设置 → 数据 → 导出」对应的项目级导出。
// project 是 PostPigeon 的完整可回导文件；其余格式聚合项目下的全部模块。
func (s *ImportExportService) ExportProjectAs(projectID, format string, includeSecrets bool) (*ExportedDocument, error) {
	options := ProjectExportOptions{Format: format, IncludeSecrets: includeSecrets, Scope: ProjectExportScope{Type: "all"}}
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "openapi31", "openapi3.1":
		options.Format = "openapi"
		options.OpenAPI.SpecVersion = "3.1"
	case "openapi30", "openapi3.0":
		options.Format = "openapi"
		options.OpenAPI.SpecVersion = "3.0"
	case "swagger2", "openapi2":
		options.Format = "openapi"
		options.OpenAPI.SpecVersion = "2.0"
	}
	return s.ExportProjectConfigured(projectID, options)
}

// ExportProjectConfigured 按项目导出页的完整设置生成文档。
func (s *ImportExportService) ExportProjectConfigured(projectID string, options ProjectExportOptions) (*ExportedDocument, error) {
	var project models.Project
	if err := s.db.Where("id = ?", projectID).First(&project).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}
	var modules []models.Module
	if err := s.db.Where("project_id = ?", projectID).Order("sort_order ASC, created_at ASC").Find(&modules).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}

	format := strings.ToLower(strings.TrimSpace(options.Format))
	if format == "project" || format == "postpigeon" || format == "json" {
		if scopeType := strings.ToLower(strings.TrimSpace(options.Scope.Type)); scopeType != "" && scopeType != "all" {
			return nil, fmt.Errorf("PostPigeon 完整项目备份只支持导出全部范围")
		}
		content, err := s.ExportProject(projectID, options.IncludeSecrets)
		return exportedDocument(safeExportName(project.Name)+".postpigeon.json", "application/json", content, err)
	}
	selection, err := s.resolveProjectExportSelection(projectID, options.Scope)
	if err != nil {
		return nil, err
	}
	environmentIDs, err := s.validateProjectExportEnvironments(projectID, options.EnvironmentIDs)
	if err != nil {
		return nil, err
	}
	baseName := safeExportName(project.Name)
	switch format {
	case "project", "postpigeon", "json":
		panic("native project export handled above")
	case "openapi":
		return s.exportProjectOpenAPIBundleConfigured(baseName, modules, selection, environmentIDs, options.OpenAPI)
	case "postman":
		content, err := s.exportProjectPostman(project, modules, options.IncludeSecrets, selection)
		return exportedDocument(baseName+".postman_collection.json", "application/json", content, err)
	case "har":
		content, err := s.exportProjectHAR(project, modules, options.IncludeSecrets, selection, firstString(environmentIDs))
		return exportedDocument(baseName+".har", "application/json", content, err)
	case "markdown", "md":
		content, err := s.exportProjectMarkdown(project, modules, selection)
		return exportedDocument(baseName+".md", "text/markdown", content, err)
	case "html":
		markdown, err := s.exportProjectMarkdown(project, modules, selection)
		if err != nil {
			return nil, err
		}
		return exportedDocument(baseName+".html", "text/html", renderProjectHTML(project.Name, markdown), nil)
	case "word", "docx":
		markdown, err := s.exportProjectMarkdown(project, modules, selection)
		if err != nil {
			return nil, err
		}
		content, err := buildProjectDOCX(markdown)
		if err != nil {
			return nil, err
		}
		return &ExportedDocument{
			FileName: baseName + ".docx", MediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			Content: base64.StdEncoding.EncodeToString(content), Encoding: "base64",
		}, nil
	default:
		return nil, fmt.Errorf("不支持的项目导出格式 %q", options.Format)
	}
}

func (s *ImportExportService) validateProjectExportEnvironments(projectID string, ids []string) ([]string, error) {
	ids = uniqueStrings(ids)
	if len(ids) == 0 {
		return nil, nil
	}
	var count int64
	if err := s.db.Model(&models.Environment{}).Where("project_id = ? AND id IN ?", projectID, ids).Count(&count).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}
	if count != int64(len(ids)) {
		return nil, fmt.Errorf("导出环境包含不属于当前项目的环境")
	}
	return ids, nil
}

func uniqueStrings(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && !seen[value] {
			seen[value] = true
			out = append(out, value)
		}
	}
	return out
}

func firstString(values []string) string {
	if len(values) == 0 {
		return ""
	}
	return values[0]
}

func (s *ImportExportService) moduleHasSelectedEndpoints(moduleID string, selection *projectExportSelection) bool {
	var count int64
	ids := make([]string, 0, len(selection.endpointIDs))
	for id := range selection.endpointIDs {
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return false
	}
	_ = s.db.Model(&models.Endpoint{}).Where("module_id = ? AND id IN ?", moduleID, ids).Count(&count).Error
	return count > 0
}

// SaveExportedDocument 把生成结果写到用户通过系统保存面板选择的明确路径。
func (s *ImportExportService) SaveExportedDocument(document ExportedDocument, path string) error {
	if strings.TrimSpace(path) == "" {
		return fmt.Errorf("保存路径不能为空")
	}
	content := []byte(document.Content)
	if document.Encoding == "base64" {
		decoded, err := base64.StdEncoding.DecodeString(document.Content)
		if err != nil {
			return apperr.Wrap(err, apperr.CodeExportFailed)
		}
		content = decoded
	}
	if err := os.WriteFile(path, content, 0o600); err != nil {
		return apperr.Wrap(err, apperr.CodeExportFailed)
	}
	return nil
}

// OpenAPI 的 server 和 path 都属于单文档命名空间；多个模块可能有相同路径但指向不同服务。
// 项目级导出因此打包为每模块一份规范，避免静默覆盖接口或篡改真实路径。
func (s *ImportExportService) exportProjectOpenAPIBundle(baseName string, modules []models.Module, version, suffix string) (*ExportedDocument, error) {
	return s.exportProjectOpenAPIBundleConfigured(baseName, modules, &projectExportSelection{endpointIDs: nil, folderTags: nil}, nil, ProjectOpenAPIExportOptions{
		SpecVersion: version, FileFormat: "json",
	})
}

func (s *ImportExportService) exportProjectOpenAPIBundleConfigured(baseName string, modules []models.Module, selection *projectExportSelection, environmentIDs []string, options ProjectOpenAPIExportOptions) (*ExportedDocument, error) {
	version := strings.TrimSpace(options.SpecVersion)
	if version == "" {
		version = "3.1"
	}
	suffix := "openapi-3.1"
	switch version {
	case "3.1", "3.1.0":
		version = "3.1"
	case "3.0", "3.0.3":
		version, suffix = "3.0", "openapi-3.0"
	case "2", "2.0", "swagger2":
		version, suffix = "2.0", "swagger-2.0"
		if len(environmentIDs) > 1 {
			return nil, fmt.Errorf("Swagger 2.0 只能选择一个环境")
		}
	default:
		return nil, fmt.Errorf("不支持的 OpenAPI 导出版本 %q", options.SpecVersion)
	}
	fileFormat := strings.ToLower(strings.TrimSpace(options.FileFormat))
	if fileFormat == "" {
		fileFormat = "json"
	}
	if fileFormat != "json" && fileFormat != "yaml" {
		return nil, fmt.Errorf("不支持的 OpenAPI 文件格式 %q", options.FileFormat)
	}
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	usedNames := map[string]int{}
	for _, module := range modules {
		if selection.endpointIDs != nil && !s.moduleHasSelectedEndpoints(module.ID, selection) {
			continue
		}
		title := strings.TrimSpace(options.Title)
		if title != "" && len(modules) > 1 {
			title += " - " + module.Name
		}
		content, err := s.exportOpenAPIConfigured(module.ID, version, fileFormat, openAPIExportBuildOptions{
			SelectedEndpointIDs:        selection.endpointIDs,
			EnvironmentIDs:             environmentIDs,
			FolderTags:                 selection.folderTags,
			AddFoldersToTags:           options.AddFoldersToTags,
			IncludeExtensionProperties: options.IncludeExtensionProperties,
			Title:                      title,
			DocumentVersion:            options.DocumentVersion,
		})
		if err != nil {
			_ = zw.Close()
			return nil, err
		}
		name := uniqueArchiveName(safeExportName(module.Name)+"."+suffix+"."+fileFormat, usedNames)
		entry, err := zw.Create(name)
		if err != nil {
			_ = zw.Close()
			return nil, apperr.Wrap(err, apperr.CodeExportFailed)
		}
		if _, err := entry.Write([]byte(content)); err != nil {
			_ = zw.Close()
			return nil, apperr.Wrap(err, apperr.CodeExportFailed)
		}
	}
	if err := zw.Close(); err != nil {
		return nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}
	return &ExportedDocument{
		FileName: baseName + "." + suffix + ".zip", MediaType: "application/zip",
		Content: base64.StdEncoding.EncodeToString(buf.Bytes()), Encoding: "base64",
	}, nil
}

func uniqueArchiveName(name string, used map[string]int) string {
	key := strings.ToLower(name)
	used[key]++
	if used[key] == 1 {
		return name
	}
	ext := strings.LastIndex(name, ".")
	if ext < 0 {
		return fmt.Sprintf("%s-%d", name, used[key])
	}
	return fmt.Sprintf("%s-%d%s", name[:ext], used[key], name[ext:])
}

func (s *ImportExportService) exportProjectPostman(project models.Project, modules []models.Module, includeSecrets bool, selection *projectExportSelection) (string, error) {
	items := make([]any, 0, len(modules))
	variables := map[string]any{}
	var globals []models.GlobalVariable
	if err := s.db.Where("project_id = ?", project.ID).Order("sort_order ASC").Find(&globals).Error; err == nil {
		for _, variable := range globals {
			if variable.Enabled {
				variables[variable.Key] = variable.Value
			}
		}
	}

	for _, module := range modules {
		if !s.moduleHasSelectedEndpoints(module.ID, selection) {
			continue
		}
		content, err := s.exportPostmanCollectionFiltered(module, selection.endpointIDs)
		if err != nil {
			return "", err
		}
		var collection map[string]any
		if err := json.Unmarshal([]byte(content), &collection); err != nil {
			return "", apperr.Wrap(err, apperr.CodeExportFailed)
		}
		moduleItems, _ := collection["item"].([]any)
		items = append(items, map[string]any{"name": module.Name, "item": moduleItems})
		if moduleVariables, ok := collection["variable"].([]any); ok {
			for _, raw := range moduleVariables {
				variable, _ := raw.(map[string]any)
				key, _ := variable["key"].(string)
				if key != "" {
					variables[key] = variable["value"]
				}
			}
		}
	}

	doc := postmanCollectionDocument(project.Name, items, variables)
	info := doc["info"].(map[string]any)
	info["description"] = firstNonEmpty(project.Description, "Exported by PostPigeon")
	if !includeSecrets {
		s.redactProjectPostman(project.ID, doc)
		maskDocumentStrings(doc, s.projectSecretValues(project.ID))
	}
	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeExportFailed)
	}
	return string(out), nil
}

func (s *ImportExportService) redactProjectPostman(projectID string, doc map[string]any) {
	secretKeys := map[string]bool{}
	var moduleVariables []models.ModuleVariable
	_ = s.db.Table("module_variables AS v").Select("v.*").
		Joins("JOIN modules AS m ON m.id = v.module_id").Where("m.project_id = ? AND v.is_secret = ?", projectID, true).
		Find(&moduleVariables).Error
	for _, variable := range moduleVariables {
		secretKeys[variable.Key] = true
	}
	if variables, ok := doc["variable"].([]any); ok {
		for _, raw := range variables {
			variable, _ := raw.(map[string]any)
			key, _ := variable["key"].(string)
			if secretKeys[key] {
				variable["value"] = ""
			}
		}
	}
	redactPostmanItems(doc["item"])
}

func redactPostmanItems(raw any) {
	items, _ := raw.([]any)
	for _, value := range items {
		item, _ := value.(map[string]any)
		if children, ok := item["item"]; ok {
			redactPostmanItems(children)
		}
		request, _ := item["request"].(map[string]any)
		if headers, ok := request["header"].([]any); ok {
			for _, rawHeader := range headers {
				header, _ := rawHeader.(map[string]any)
				name := firstNonEmpty(stringValue(header["key"]), stringValue(header["name"]))
				if isSensitiveHeader(name) {
					header["value"] = ""
				}
			}
		}
		auth, _ := request["auth"].(map[string]any)
		typeName, _ := auth["type"].(string)
		secretKeys := map[string]bool{}
		switch typeName {
		case "basic":
			secretKeys["password"] = true
		case "bearer":
			secretKeys["token"] = true
		case "apikey":
			secretKeys["value"] = true
		case "oauth2":
			secretKeys["clientSecret"] = true
			secretKeys["password"] = true
		}
		values, _ := auth[typeName].([]any)
		for _, rawValue := range values {
			entry, _ := rawValue.(map[string]any)
			key, _ := entry["key"].(string)
			if secretKeys[key] {
				entry["value"] = ""
			}
		}
	}
}

func (s *ImportExportService) exportProjectHAR(project models.Project, modules []models.Module, includeSecrets bool, selection *projectExportSelection, environmentID string) (string, error) {
	pages := make([]any, 0)
	entries := make([]any, 0)
	for _, module := range modules {
		if !s.moduleHasSelectedEndpoints(module.ID, selection) {
			continue
		}
		content, err := s.exportHARFiltered(module, selection.endpointIDs, environmentID)
		if err != nil {
			return "", err
		}
		var document map[string]any
		if err := json.Unmarshal([]byte(content), &document); err != nil {
			return "", apperr.Wrap(err, apperr.CodeExportFailed)
		}
		log, _ := document["log"].(map[string]any)
		pageIDs := map[string]string{}
		if modulePages, ok := log["pages"].([]any); ok {
			for _, rawPage := range modulePages {
				page, _ := rawPage.(map[string]any)
				oldID, _ := page["id"].(string)
				newID := module.ID + ":" + oldID
				pageIDs[oldID] = newID
				page["id"] = newID
				page["title"] = module.Name + " / " + stringValue(page["title"])
				pages = append(pages, page)
			}
		}
		if moduleEntries, ok := log["entries"].([]any); ok {
			for _, rawEntry := range moduleEntries {
				entry, _ := rawEntry.(map[string]any)
				if oldID, ok := entry["pageref"].(string); ok {
					entry["pageref"] = pageIDs[oldID]
				}
				entry["_postpigeonModule"] = module.Name
				entries = append(entries, entry)
			}
		}
	}
	doc := map[string]any{"log": map[string]any{
		"version": "1.2", "creator": map[string]any{"name": "PostPigeon", "version": "1"},
		"comment": firstNonEmpty(project.Description, project.Name), "pages": pages, "entries": entries,
	}}
	if !includeSecrets {
		redactHARHeaders(entries)
		maskDocumentStrings(doc, s.projectSecretValues(project.ID))
	}
	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeExportFailed)
	}
	return string(out), nil
}

func redactHARHeaders(entries []any) {
	for _, rawEntry := range entries {
		entry, _ := rawEntry.(map[string]any)
		request, _ := entry["request"].(map[string]any)
		headers, _ := request["headers"].([]any)
		for _, rawHeader := range headers {
			header, _ := rawHeader.(map[string]any)
			if isSensitiveHeader(stringValue(header["name"])) {
				header["value"] = ""
			}
		}
	}
}

func (s *ImportExportService) projectSecretValues(projectID string) []string {
	values := make([]string, 0)
	appendValue := func(value string) {
		value = strings.TrimSpace(value)
		if value != "" {
			values = append(values, value)
		}
	}
	var environmentVariables []models.EnvironmentVariable
	_ = s.db.Table("environment_variables AS v").Select("v.*").
		Joins("JOIN environments AS e ON e.id = v.environment_id").
		Where("e.project_id = ? AND v.is_secret = ?", projectID, true).Find(&environmentVariables).Error
	for _, variable := range environmentVariables {
		appendValue(variable.Value)
	}
	var moduleVariables []models.ModuleVariable
	_ = s.db.Table("module_variables AS v").Select("v.*").
		Joins("JOIN modules AS m ON m.id = v.module_id").
		Where("m.project_id = ? AND v.is_secret = ?", projectID, true).Find(&moduleVariables).Error
	for _, variable := range moduleVariables {
		appendValue(variable.Value)
	}
	return values
}

func maskDocumentStrings(value any, secrets []string) {
	switch current := value.(type) {
	case map[string]any:
		for key, item := range current {
			if text, ok := item.(string); ok {
				current[key] = maskSecretValues(text, secrets)
			} else {
				maskDocumentStrings(item, secrets)
			}
		}
	case []any:
		for i, item := range current {
			if text, ok := item.(string); ok {
				current[i] = maskSecretValues(text, secrets)
			} else {
				maskDocumentStrings(item, secrets)
			}
		}
	}
}

func (s *ImportExportService) exportProjectMarkdown(project models.Project, modules []models.Module, selection *projectExportSelection) (string, error) {
	var out strings.Builder
	fmt.Fprintf(&out, "# %s\n\n", project.Name)
	if strings.TrimSpace(project.Description) != "" {
		fmt.Fprintf(&out, "%s\n\n", project.Description)
	}
	for _, module := range modules {
		if !s.moduleHasSelectedEndpoints(module.ID, selection) {
			continue
		}
		content, err := s.exportMarkdownFiltered(module, selection.endpointIDs)
		if err != nil {
			return "", err
		}
		out.WriteString(shiftMarkdownHeadings(content, 1))
		if !strings.HasSuffix(content, "\n") {
			out.WriteByte('\n')
		}
	}
	return out.String(), nil
}

func shiftMarkdownHeadings(markdown string, levels int) string {
	lines := strings.Split(markdown, "\n")
	inFence := false
	for i, line := range lines {
		if strings.HasPrefix(strings.TrimSpace(line), "```") {
			inFence = !inFence
			continue
		}
		if !inFence && strings.HasPrefix(line, "#") {
			lines[i] = strings.Repeat("#", levels) + line
		}
	}
	return strings.Join(lines, "\n")
}

func renderProjectHTML(title, markdown string) string {
	var body strings.Builder
	lines := strings.Split(markdown, "\n")
	inCode := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "```") {
			if inCode {
				body.WriteString("</code></pre>\n")
			} else {
				body.WriteString("<pre><code>")
			}
			inCode = !inCode
			continue
		}
		if inCode {
			body.WriteString(html.EscapeString(line) + "\n")
			continue
		}
		level := 0
		for level < len(line) && line[level] == '#' {
			level++
		}
		if level > 0 && level <= 6 && len(line) > level && line[level] == ' ' {
			fmt.Fprintf(&body, "<h%d>%s</h%d>\n", level, html.EscapeString(strings.TrimSpace(line[level:])), level)
		} else if trimmed == "" {
			body.WriteByte('\n')
		} else if strings.HasPrefix(trimmed, "|") {
			body.WriteString("<pre class=\"table\">" + html.EscapeString(line) + "</pre>\n")
		} else {
			body.WriteString("<p>" + html.EscapeString(line) + "</p>\n")
		}
	}
	return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>" + html.EscapeString(title) + "</title><style>body{max-width:960px;margin:40px auto;padding:0 24px;font:15px/1.6 system-ui,sans-serif;color:#24292f}h1,h2,h3,h4{margin-top:1.5em}pre{overflow:auto;padding:12px;background:#f6f8fa;border-radius:6px}.table{margin:0;padding:2px 12px;white-space:pre-wrap}p{white-space:pre-wrap}code{font-family:ui-monospace,monospace}</style></head><body>" + body.String() + "</body></html>"
}

func buildProjectDOCX(markdown string) ([]byte, error) {
	var document strings.Builder
	document.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>`)
	for _, line := range strings.Split(markdown, "\n") {
		level := 0
		for level < len(line) && line[level] == '#' {
			level++
		}
		text := line
		style := ""
		if level > 0 && level <= 6 && len(line) > level && line[level] == ' ' {
			text = strings.TrimSpace(line[level:])
			style = fmt.Sprintf(`<w:pPr><w:pStyle w:val="Heading%d"/></w:pPr>`, level)
		}
		document.WriteString("<w:p>" + style + `<w:r><w:t xml:space="preserve">` + xmlEscape(text) + "</w:t></w:r></w:p>")
	}
	document.WriteString(`<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`)

	files := map[string]string{
		"[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
		"_rels/.rels":         `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
		"word/document.xml":   document.String(),
	}
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	keys := make([]string, 0, len(files))
	for name := range files {
		keys = append(keys, name)
	}
	sort.Strings(keys)
	for _, name := range keys {
		entry, err := zw.Create(name)
		if err != nil {
			return nil, apperr.Wrap(err, apperr.CodeExportFailed)
		}
		if _, err := entry.Write([]byte(files[name])); err != nil {
			return nil, apperr.Wrap(err, apperr.CodeExportFailed)
		}
	}
	if err := zw.Close(); err != nil {
		return nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}
	return buf.Bytes(), nil
}

func xmlEscape(value string) string {
	value = strings.ToValidUTF8(value, "�")
	if !utf8.ValidString(value) {
		return ""
	}
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;", "'", "&apos;").Replace(value)
}
