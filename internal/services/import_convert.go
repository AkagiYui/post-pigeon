package services

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"net/url"
	"sort"
	"strings"
)

// ConvertedImportDocument 是第三方格式转换后的标准导入文档。
// Kind 决定前端继续走哪一套既有预览/导入流程，目前统一转换为 Postman Collection。
type ConvertedImportDocument struct {
	Kind    string `json:"kind"`
	Content string `json:"content"`
}

// ConvertImportDocument 把第三方请求集合转换为 PostPigeon 已完整支持的交换格式。
// 转换与真正入库分开，用户仍能先预览转换结果再确认导入。
func (s *ImportExportService) ConvertImportDocument(kind, content string) (*ConvertedImportDocument, error) {
	var (
		converted any
		err       error
	)
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "har":
		converted, err = convertHARToPostman(content)
	case "insomnia":
		converted, err = convertInsomniaToPostman(content)
	case "jmeter":
		converted, err = convertJMeterToPostman(content)
	case "yapi":
		converted, err = convertYApiToPostman(content)
	case "hoppscotch":
		converted, err = convertHoppscotchToPostman(content)
	case "apipost":
		converted, err = convertApiPostToPostman(content)
	default:
		return nil, fmt.Errorf("暂不支持转换导入格式 %q", kind)
	}
	if err != nil {
		return nil, err
	}
	encoded, err := json.MarshalIndent(converted, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("生成标准导入文档失败: %w", err)
	}
	return &ConvertedImportDocument{Kind: "postman", Content: string(encoded)}, nil
}

type harDocument struct {
	Log struct {
		Pages []struct {
			ID    string `json:"id"`
			Title string `json:"title"`
		} `json:"pages"`
		Entries []struct {
			PageRef string `json:"pageref"`
			Request struct {
				Method  string `json:"method"`
				URL     string `json:"url"`
				Headers []struct {
					Name  string `json:"name"`
					Value string `json:"value"`
				} `json:"headers"`
				PostData *struct {
					MimeType string `json:"mimeType"`
					Text     string `json:"text"`
					Params   []struct {
						Name        string `json:"name"`
						Value       string `json:"value"`
						FileName    string `json:"fileName"`
						ContentType string `json:"contentType"`
					} `json:"params"`
				} `json:"postData"`
			} `json:"request"`
		} `json:"entries"`
	} `json:"log"`
}

func convertHARToPostman(content string) (map[string]any, error) {
	var har harDocument
	if err := json.Unmarshal([]byte(normalizeJSONC(content)), &har); err != nil {
		return nil, fmt.Errorf("解析 HAR 失败: %w", err)
	}
	if len(har.Log.Entries) == 0 {
		return nil, fmt.Errorf("HAR 中没有可导入的请求")
	}

	pageTitles := map[string]string{}
	pageOrder := make([]string, 0, len(har.Log.Pages))
	for _, page := range har.Log.Pages {
		if page.ID == "" {
			continue
		}
		pageTitles[page.ID] = firstNonEmpty(strings.TrimSpace(page.Title), page.ID)
		pageOrder = append(pageOrder, page.ID)
	}
	grouped := map[string][]any{}
	var root []any
	for index, entry := range har.Log.Entries {
		request := entry.Request
		if strings.TrimSpace(request.URL) == "" {
			continue
		}
		item := map[string]any{
			"name":    importRequestName(request.Method, request.URL, index),
			"request": harPostmanRequest(request.Method, request.URL, request.Headers, request.PostData),
		}
		if entry.PageRef != "" && pageTitles[entry.PageRef] != "" {
			grouped[entry.PageRef] = append(grouped[entry.PageRef], item)
		} else {
			root = append(root, item)
		}
	}
	for _, pageID := range pageOrder {
		if items := grouped[pageID]; len(items) > 0 {
			root = append(root, map[string]any{"name": pageTitles[pageID], "item": items})
			delete(grouped, pageID)
		}
	}
	unknownPages := make([]string, 0, len(grouped))
	for pageID := range grouped {
		unknownPages = append(unknownPages, pageID)
	}
	sort.Strings(unknownPages)
	for _, pageID := range unknownPages {
		root = append(root, map[string]any{"name": pageID, "item": grouped[pageID]})
	}
	if len(root) == 0 {
		return nil, fmt.Errorf("HAR 中没有包含有效 URL 的请求")
	}
	return postmanCollectionDocument("HAR Import", root, nil), nil
}

func harPostmanRequest(method, rawURL string, headers []struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}, postData *struct {
	MimeType string `json:"mimeType"`
	Text     string `json:"text"`
	Params   []struct {
		Name        string `json:"name"`
		Value       string `json:"value"`
		FileName    string `json:"fileName"`
		ContentType string `json:"contentType"`
	} `json:"params"`
}) map[string]any {
	convertedHeaders := make([]any, 0, len(headers))
	for _, header := range headers {
		if strings.TrimSpace(header.Name) == "" || strings.EqualFold(header.Name, "Content-Length") {
			continue
		}
		convertedHeaders = append(convertedHeaders, map[string]any{"key": header.Name, "value": header.Value})
	}
	request := map[string]any{
		"method": strings.ToUpper(firstNonEmpty(strings.TrimSpace(method), "GET")),
		"header": convertedHeaders,
		"url":    postmanURLDocument(rawURL, nil),
	}
	if body := harPostmanBody(postData); body != nil {
		request["body"] = body
	}
	return request
}

// jmxNode 保留 JMeter JMX 的属性、文本与层级。JMX 的 HTTP sampler 与配置项
// 通过相邻 hashTree 关联，使用通用节点比为每一种 property 标签建结构更可靠。
type jmxNode struct {
	XMLName  xml.Name
	Attrs    []xml.Attr `xml:",any,attr"`
	Text     string     `xml:",chardata"`
	Children []jmxNode  `xml:",any"`
}

func convertJMeterToPostman(content string) (map[string]any, error) {
	var root jmxNode
	if err := xml.Unmarshal([]byte(content), &root); err != nil {
		return nil, fmt.Errorf("解析 JMeter JMX 失败: %w", err)
	}
	items := collectJMeterItems(root)
	if len(items) == 0 {
		return nil, fmt.Errorf("JMeter JMX 中没有 HTTP Request sampler")
	}
	return postmanCollectionDocument("JMeter Import", items, nil), nil
}

func collectJMeterItems(node jmxNode) []any {
	var items []any
	for index := 0; index < len(node.Children); index++ {
		child := node.Children[index]
		if child.XMLName.Local == "HTTPSamplerProxy" {
			var config jmxNode
			if index+1 < len(node.Children) && node.Children[index+1].XMLName.Local == "hashTree" {
				config = node.Children[index+1]
			}
			items = append(items, jmeterPostmanItem(child, config))
			continue
		}
		items = append(items, collectJMeterItems(child)...)
	}
	return items
}

func jmeterPostmanItem(sampler, config jmxNode) map[string]any {
	properties := jmxProperties(sampler)
	method := strings.ToUpper(firstNonEmpty(properties["HTTPSampler.method"], "GET"))
	protocol := firstNonEmpty(properties["HTTPSampler.protocol"], "http")
	domain := properties["HTTPSampler.domain"]
	port := properties["HTTPSampler.port"]
	path := firstNonEmpty(properties["HTTPSampler.path"], "/")
	rawURL := path
	if domain != "" {
		host := domain
		if port != "" {
			host += ":" + port
		}
		rawURL = protocol + "://" + host + ensureLeadingSlash(path)
	}

	queryValues, bodyValues := jmeterArguments(sampler, method, properties["HTTPSampler.postBodyRaw"] == "true")
	request := map[string]any{
		"method": method,
		"header": jmeterHeaders(config),
		"url":    postmanURLDocument(rawURL, queryValues),
	}
	if len(bodyValues) > 0 {
		if properties["HTTPSampler.postBodyRaw"] == "true" {
			request["body"] = map[string]any{
				"mode": "raw", "raw": stringValue(bodyValues[0].(map[string]any)["value"]),
				"options": map[string]any{"raw": map[string]any{"language": "text"}},
			}
		} else {
			request["body"] = map[string]any{"mode": "urlencoded", "urlencoded": bodyValues}
		}
	}
	name := firstNonEmpty(jmxAttr(sampler, "testname"), method+" "+path)
	return map[string]any{"name": name, "request": request}
}

func jmxProperties(node jmxNode) map[string]string {
	result := map[string]string{}
	var walk func(jmxNode)
	walk = func(current jmxNode) {
		if current.XMLName.Local == "stringProp" || current.XMLName.Local == "boolProp" {
			if name := jmxAttr(current, "name"); name != "" {
				result[name] = strings.TrimSpace(current.Text)
			}
		}
		for _, child := range current.Children {
			walk(child)
		}
	}
	walk(node)
	return result
}

func jmeterArguments(sampler jmxNode, method string, raw bool) ([]any, []any) {
	var all []any
	var walk func(jmxNode)
	walk = func(node jmxNode) {
		if node.XMLName.Local == "elementProp" && jmxAttr(node, "elementType") == "HTTPArgument" {
			props := jmxProperties(node)
			all = append(all, map[string]any{
				"key":   props["Argument.name"],
				"value": props["Argument.value"],
				"type":  "text",
			})
			return
		}
		for _, child := range node.Children {
			walk(child)
		}
	}
	walk(sampler)
	if raw || (method != "GET" && method != "HEAD" && method != "DELETE") {
		return nil, all
	}
	return all, nil
}

func jmeterHeaders(config jmxNode) []any {
	var result []any
	var walk func(jmxNode)
	walk = func(node jmxNode) {
		if node.XMLName.Local == "elementProp" && jmxAttr(node, "elementType") == "Header" {
			props := jmxProperties(node)
			if props["Header.name"] != "" {
				result = append(result, map[string]any{"key": props["Header.name"], "value": props["Header.value"]})
			}
			return
		}
		for _, child := range node.Children {
			walk(child)
		}
	}
	walk(config)
	return result
}

func jmxAttr(node jmxNode, name string) string {
	for _, attr := range node.Attrs {
		if attr.Name.Local == name {
			return attr.Value
		}
	}
	return ""
}

type yapiCategory struct {
	Name string         `json:"name"`
	List []yapiEndpoint `json:"list"`
}

type yapiEndpoint struct {
	ID           any             `json:"_id"`
	Title        string          `json:"title"`
	Path         string          `json:"path"`
	Method       string          `json:"method"`
	Description  string          `json:"desc"`
	Headers      []yapiKV        `json:"req_headers"`
	Query        []yapiKV        `json:"req_query"`
	BodyType     string          `json:"req_body_type"`
	BodyForm     []yapiKV        `json:"req_body_form"`
	BodyOther    any             `json:"req_body_other"`
	RawBodyJSON  bool            `json:"req_body_is_json_schema"`
	PathParams   []yapiKV        `json:"req_params"`
	ResponseBody json.RawMessage `json:"res_body"`
}

type yapiKV struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	Example  string `json:"example"`
	Desc     string `json:"desc"`
	Required any    `json:"required"`
	Type     string `json:"type"`
}

func convertYApiToPostman(content string) (map[string]any, error) {
	var categories []yapiCategory
	normalized := []byte(normalizeJSONC(content))
	if err := json.Unmarshal(normalized, &categories); err != nil {
		var wrapper struct {
			Name string         `json:"name"`
			Cats []yapiCategory `json:"cats"`
			Data []yapiCategory `json:"data"`
		}
		if wrapperErr := json.Unmarshal(normalized, &wrapper); wrapperErr != nil {
			return nil, fmt.Errorf("解析 YApi 导出文件失败: %w", err)
		}
		categories = wrapper.Cats
		if len(categories) == 0 {
			categories = wrapper.Data
		}
	}
	var items []any
	for _, category := range categories {
		var requests []any
		for _, endpoint := range category.List {
			requests = append(requests, yapiPostmanItem(endpoint))
		}
		if len(requests) == 0 {
			continue
		}
		items = append(items, map[string]any{"name": firstNonEmpty(category.Name, "Default"), "item": requests})
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("YApi 导出文件中没有可导入的接口")
	}
	return postmanCollectionDocument("YApi Import", items, nil), nil
}

func yapiPostmanItem(endpoint yapiEndpoint) map[string]any {
	query := make([]any, 0, len(endpoint.Query))
	for _, param := range endpoint.Query {
		query = append(query, map[string]any{"key": param.Name, "value": firstNonEmpty(param.Value, param.Example), "description": param.Desc})
	}
	headers := make([]any, 0, len(endpoint.Headers))
	for _, header := range endpoint.Headers {
		headers = append(headers, map[string]any{"key": header.Name, "value": firstNonEmpty(header.Value, header.Example), "description": header.Desc})
	}
	request := map[string]any{
		"method":      strings.ToUpper(firstNonEmpty(endpoint.Method, "GET")),
		"header":      headers,
		"url":         postmanURLDocument(endpoint.Path, query),
		"description": endpoint.Description,
	}
	switch strings.ToLower(endpoint.BodyType) {
	case "form", "formdata":
		mode := "urlencoded"
		for _, field := range endpoint.BodyForm {
			if field.Type == "file" {
				mode = "formdata"
				break
			}
		}
		fields := make([]any, 0, len(endpoint.BodyForm))
		for _, field := range endpoint.BodyForm {
			fieldType := "text"
			if field.Type == "file" {
				fieldType = "file"
			}
			fields = append(fields, map[string]any{"key": field.Name, "value": firstNonEmpty(field.Value, field.Example), "type": fieldType, "description": field.Desc})
		}
		request["body"] = map[string]any{"mode": mode, mode: fields}
	case "json", "raw":
		body := stringValue(endpoint.BodyOther)
		request["body"] = map[string]any{"mode": "raw", "raw": body, "options": map[string]any{"raw": map[string]any{"language": "json"}}}
	}
	return map[string]any{
		"name":    endpoint.Title,
		"request": request,
	}
}

type hoppscotchCollection struct {
	Name     string                 `json:"name"`
	Folders  []hoppscotchCollection `json:"folders"`
	Requests []hoppscotchRequest    `json:"requests"`
}

type hoppscotchRequest struct {
	Name     string         `json:"name"`
	Method   string         `json:"method"`
	Endpoint string         `json:"endpoint"`
	Params   []hoppscotchKV `json:"params"`
	Headers  []hoppscotchKV `json:"headers"`
	Body     any            `json:"body"`
	Auth     any            `json:"auth"`
}

type hoppscotchKV struct {
	Key    string `json:"key"`
	Value  string `json:"value"`
	Active *bool  `json:"active"`
}

func convertHoppscotchToPostman(content string) (map[string]any, error) {
	var collection hoppscotchCollection
	if err := json.Unmarshal([]byte(normalizeJSONC(content)), &collection); err != nil {
		return nil, fmt.Errorf("解析 Hoppscotch 集合失败: %w", err)
	}
	items := hoppscotchItems(collection)
	if len(items) == 0 {
		return nil, fmt.Errorf("Hoppscotch 集合中没有可导入的请求")
	}
	return postmanCollectionDocument(firstNonEmpty(collection.Name, "Hoppscotch Import"), items, nil), nil
}

func hoppscotchItems(collection hoppscotchCollection) []any {
	items := make([]any, 0, len(collection.Folders)+len(collection.Requests))
	for _, request := range collection.Requests {
		query := make([]any, 0, len(request.Params))
		for _, param := range request.Params {
			query = append(query, map[string]any{"key": param.Key, "value": param.Value, "disabled": param.Active != nil && !*param.Active})
		}
		headers := make([]any, 0, len(request.Headers))
		for _, header := range request.Headers {
			headers = append(headers, map[string]any{"key": header.Key, "value": header.Value, "disabled": header.Active != nil && !*header.Active})
		}
		req := map[string]any{
			"method": strings.ToUpper(firstNonEmpty(request.Method, "GET")),
			"header": headers,
			"url":    postmanURLDocument(request.Endpoint, query),
		}
		if body := hoppscotchPostmanBody(request.Body); body != nil {
			req["body"] = body
		}
		items = append(items, map[string]any{"name": firstNonEmpty(request.Name, request.Method+" "+request.Endpoint), "request": req})
	}
	for _, folder := range collection.Folders {
		children := hoppscotchItems(folder)
		if len(children) > 0 {
			items = append(items, map[string]any{"name": firstNonEmpty(folder.Name, "Folder"), "item": children})
		}
	}
	return items
}

func hoppscotchPostmanBody(raw any) map[string]any {
	body, ok := raw.(map[string]any)
	if !ok || body == nil {
		return nil
	}
	contentType := strings.ToLower(firstNonEmpty(stringValue(body["contentType"]), stringValue(body["mimeType"])))
	content := firstNonEmpty(stringValue(body["body"]), stringValue(body["content"]), stringValue(body["text"]))
	if content == "" {
		return nil
	}
	return map[string]any{
		"mode": "raw", "raw": content,
		"options": map[string]any{"raw": map[string]any{"language": postmanRawLanguage(contentType)}},
	}
}

func convertApiPostToPostman(content string) (map[string]any, error) {
	var direct map[string]any
	if err := json.Unmarshal([]byte(normalizeJSONC(content)), &direct); err != nil {
		return nil, fmt.Errorf("解析 ApiPost 导出文件失败: %w", err)
	}
	// ApiPost 支持直接导出 Postman Collection；此时只校验并原样复用。
	if _, ok := direct["item"]; ok {
		if _, err := parsePostman(content); err == nil {
			return direct, nil
		}
	}
	// 常见 ApiPost 导出把请求数组放在 apis/data.apis/data.apiList 下。
	requests := firstMapSlice(direct["apis"])
	if data, ok := direct["data"].(map[string]any); ok && len(requests) == 0 {
		requests = firstMapSlice(data["apis"])
		if len(requests) == 0 {
			requests = firstMapSlice(data["apiList"])
		}
	}
	items := make([]any, 0, len(requests))
	for _, request := range requests {
		rawURL := firstNonEmpty(stringValue(request["url"]), stringValue(request["requestUrl"]), stringValue(request["path"]))
		if rawURL == "" {
			continue
		}
		method := strings.ToUpper(firstNonEmpty(stringValue(request["method"]), "GET"))
		headers := genericKeyValueList(request["headers"])
		query := genericKeyValueList(firstNonNil(request["query"], request["queryParams"], request["params"]))
		req := map[string]any{"method": method, "header": headers, "url": postmanURLDocument(rawURL, query)}
		body := firstNonEmpty(stringValue(request["body"]), stringValue(request["rawBody"]), stringValue(request["requestBody"]))
		if body != "" {
			req["body"] = map[string]any{"mode": "raw", "raw": body, "options": map[string]any{"raw": map[string]any{"language": "json"}}}
		}
		items = append(items, map[string]any{"name": firstNonEmpty(stringValue(request["name"]), stringValue(request["title"]), method+" "+rawURL), "request": req})
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("无法识别 ApiPost 导出结构，或文件中没有请求")
	}
	return postmanCollectionDocument(firstNonEmpty(stringValue(direct["name"]), "ApiPost Import"), items, nil), nil
}

func postmanURLDocument(rawURL string, explicitQuery []any) map[string]any {
	query := explicitQuery
	if len(query) == 0 {
		if parsed, err := url.Parse(rawURL); err == nil {
			for _, key := range sortedStringKeys(parsed.Query()) {
				for _, value := range parsed.Query()[key] {
					query = append(query, map[string]any{"key": key, "value": value})
				}
			}
		}
	}
	return map[string]any{"raw": rawURL, "query": query}
}

func genericKeyValueList(raw any) []any {
	var result []any
	switch values := raw.(type) {
	case []any:
		for _, value := range values {
			if item, ok := value.(map[string]any); ok {
				key := firstNonEmpty(stringValue(item["key"]), stringValue(item["name"]))
				if key != "" {
					result = append(result, map[string]any{"key": key, "value": stringValue(item["value"])})
				}
			}
		}
	case map[string]any:
		keys := make([]string, 0, len(values))
		for key := range values {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys {
			result = append(result, map[string]any{"key": key, "value": stringValue(values[key])})
		}
	}
	return result
}

func firstMapSlice(raw any) []map[string]any {
	values, ok := raw.([]any)
	if !ok {
		return nil
	}
	result := make([]map[string]any, 0, len(values))
	for _, value := range values {
		if item, ok := value.(map[string]any); ok {
			result = append(result, item)
		}
	}
	return result
}

func firstNonNil(values ...any) any {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func ensureLeadingSlash(path string) string {
	if strings.HasPrefix(path, "/") {
		return path
	}
	return "/" + path
}

func harPostmanBody(postData *struct {
	MimeType string `json:"mimeType"`
	Text     string `json:"text"`
	Params   []struct {
		Name        string `json:"name"`
		Value       string `json:"value"`
		FileName    string `json:"fileName"`
		ContentType string `json:"contentType"`
	} `json:"params"`
}) map[string]any {
	if postData == nil {
		return nil
	}
	mime := strings.ToLower(postData.MimeType)
	if strings.Contains(mime, "application/x-www-form-urlencoded") {
		values := make([]any, 0, len(postData.Params))
		if len(postData.Params) > 0 {
			for _, param := range postData.Params {
				values = append(values, map[string]any{"key": param.Name, "value": param.Value, "type": "text"})
			}
		} else if parsed, err := url.ParseQuery(postData.Text); err == nil {
			for _, key := range sortedStringKeys(parsed) {
				for _, value := range parsed[key] {
					values = append(values, map[string]any{"key": key, "value": value, "type": "text"})
				}
			}
		}
		return map[string]any{"mode": "urlencoded", "urlencoded": values}
	}
	if strings.Contains(mime, "multipart/form-data") {
		values := make([]any, 0, len(postData.Params))
		for _, param := range postData.Params {
			item := map[string]any{"key": param.Name, "value": param.Value, "type": "text"}
			if param.FileName != "" {
				item["type"] = "file"
				item["src"] = param.FileName
			}
			if param.ContentType != "" {
				item["contentType"] = param.ContentType
			}
			values = append(values, item)
		}
		return map[string]any{"mode": "formdata", "formdata": values}
	}
	if postData.Text == "" {
		return nil
	}
	return map[string]any{
		"mode": "raw",
		"raw":  postData.Text,
		"options": map[string]any{"raw": map[string]any{
			"language": postmanRawLanguage(postData.MimeType),
		}},
	}
}

type insomniaExport struct {
	ExportFormat int                `json:"__export_format"`
	Resources    []insomniaResource `json:"resources"`
}

type insomniaResource struct {
	ID             string         `json:"_id"`
	Type           string         `json:"_type"`
	ParentID       string         `json:"parentId"`
	Name           string         `json:"name"`
	Description    string         `json:"description"`
	Method         string         `json:"method"`
	URL            string         `json:"url"`
	Headers        []insomniaKV   `json:"headers"`
	Parameters     []insomniaKV   `json:"parameters"`
	Body           insomniaBody   `json:"body"`
	Authentication map[string]any `json:"authentication"`
	Data           map[string]any `json:"data"`
}

type insomniaKV struct {
	Name        string `json:"name"`
	Value       string `json:"value"`
	Description string `json:"description"`
	Disabled    bool   `json:"disabled"`
	Type        string `json:"type"`
	FileName    string `json:"fileName"`
}

type insomniaBody struct {
	MimeType string       `json:"mimeType"`
	Text     string       `json:"text"`
	Params   []insomniaKV `json:"params"`
}

func convertInsomniaToPostman(content string) (map[string]any, error) {
	var export insomniaExport
	if err := json.Unmarshal([]byte(normalizeJSONC(content)), &export); err != nil {
		return nil, fmt.Errorf("解析 Insomnia 导出文件失败: %w", err)
	}
	if len(export.Resources) == 0 {
		return nil, fmt.Errorf("Insomnia 导出文件中没有资源")
	}

	workspaceName := "Insomnia Import"
	children := map[string][]insomniaResource{}
	variables := map[string]any{}
	for _, resource := range export.Resources {
		switch resource.Type {
		case "workspace":
			if strings.TrimSpace(resource.Name) != "" {
				workspaceName = resource.Name
			}
		case "request", "request_group":
			children[resource.ParentID] = append(children[resource.ParentID], resource)
		case "environment":
			for key, value := range resource.Data {
				variables[key] = value
			}
		}
	}
	for parent := range children {
		sort.SliceStable(children[parent], func(i, j int) bool {
			return strings.ToLower(children[parent][i].Name) < strings.ToLower(children[parent][j].Name)
		})
	}

	workspaceIDs := make([]string, 0)
	for _, resource := range export.Resources {
		if resource.Type == "workspace" {
			workspaceIDs = append(workspaceIDs, resource.ID)
		}
	}
	if len(workspaceIDs) == 0 {
		workspaceIDs = append(workspaceIDs, "")
	}
	var items []any
	seen := map[string]bool{}
	for _, id := range workspaceIDs {
		items = append(items, buildInsomniaItems(id, children, seen)...)
	}
	// 部分导出缺 workspace 或 parentId 已失效；仍把孤立请求放进集合，避免静默丢数据。
	for _, resource := range export.Resources {
		if (resource.Type == "request" || resource.Type == "request_group") && !seen[resource.ID] {
			items = append(items, buildInsomniaResource(resource, children, seen))
		}
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("Insomnia 导出文件中没有可导入的请求")
	}
	return postmanCollectionDocument(workspaceName, items, variables), nil
}

func buildInsomniaItems(parentID string, children map[string][]insomniaResource, seen map[string]bool) []any {
	result := make([]any, 0, len(children[parentID]))
	for _, resource := range children[parentID] {
		result = append(result, buildInsomniaResource(resource, children, seen))
	}
	return result
}

func buildInsomniaResource(resource insomniaResource, children map[string][]insomniaResource, seen map[string]bool) any {
	seen[resource.ID] = true
	if resource.Type == "request_group" {
		return map[string]any{
			"name":        firstNonEmpty(resource.Name, "Folder"),
			"description": resource.Description,
			"item":        buildInsomniaItems(resource.ID, children, seen),
		}
	}
	request := map[string]any{
		"method": strings.ToUpper(firstNonEmpty(resource.Method, "GET")),
		"header": insomniaHeaders(resource.Headers),
		"url":    map[string]any{"raw": resource.URL, "query": insomniaQuery(resource.Parameters)},
	}
	if body := insomniaPostmanBody(resource.Body); body != nil {
		request["body"] = body
	}
	if auth := insomniaPostmanAuth(resource.Authentication); auth != nil {
		request["auth"] = auth
	}
	return map[string]any{
		"name":        firstNonEmpty(resource.Name, resource.Method+" "+resource.URL),
		"description": resource.Description,
		"request":     request,
	}
}

func insomniaHeaders(headers []insomniaKV) []any {
	result := make([]any, 0, len(headers))
	for _, header := range headers {
		if strings.TrimSpace(header.Name) == "" {
			continue
		}
		result = append(result, map[string]any{
			"key": header.Name, "value": header.Value, "description": header.Description, "disabled": header.Disabled,
		})
	}
	return result
}

func insomniaQuery(parameters []insomniaKV) []any {
	result := make([]any, 0, len(parameters))
	for _, parameter := range parameters {
		if strings.TrimSpace(parameter.Name) == "" {
			continue
		}
		result = append(result, map[string]any{
			"key": parameter.Name, "value": parameter.Value, "description": parameter.Description, "disabled": parameter.Disabled,
		})
	}
	return result
}

func insomniaPostmanBody(body insomniaBody) map[string]any {
	mime := strings.ToLower(body.MimeType)
	if strings.Contains(mime, "application/x-www-form-urlencoded") || strings.Contains(mime, "multipart/form-data") {
		mode := "urlencoded"
		if strings.Contains(mime, "multipart/form-data") {
			mode = "formdata"
		}
		values := make([]any, 0, len(body.Params))
		for _, param := range body.Params {
			item := map[string]any{
				"key": param.Name, "value": param.Value, "description": param.Description, "disabled": param.Disabled, "type": "text",
			}
			if param.Type == "file" || param.FileName != "" {
				item["type"] = "file"
				item["src"] = param.FileName
			}
			values = append(values, item)
		}
		return map[string]any{"mode": mode, mode: values}
	}
	if body.Text == "" {
		return nil
	}
	return map[string]any{
		"mode": "raw", "raw": body.Text,
		"options": map[string]any{"raw": map[string]any{"language": postmanRawLanguage(body.MimeType)}},
	}
}

func insomniaPostmanAuth(auth map[string]any) map[string]any {
	typeName := strings.ToLower(stringValue(auth["type"]))
	switch typeName {
	case "basic":
		return map[string]any{"type": "basic", "basic": []any{
			map[string]any{"key": "username", "value": stringValue(auth["username"])},
			map[string]any{"key": "password", "value": stringValue(auth["password"])},
		}}
	case "bearer":
		return map[string]any{"type": "bearer", "bearer": []any{
			map[string]any{"key": "token", "value": stringValue(auth["token"])},
		}}
	case "apikey":
		return map[string]any{"type": "apikey", "apikey": []any{
			map[string]any{"key": "key", "value": firstNonEmpty(stringValue(auth["key"]), stringValue(auth["name"]))},
			map[string]any{"key": "value", "value": stringValue(auth["value"])},
			map[string]any{"key": "in", "value": firstNonEmpty(stringValue(auth["addTo"]), "header")},
		}}
	}
	return nil
}

func postmanCollectionDocument(name string, items []any, variables map[string]any) map[string]any {
	doc := map[string]any{
		"info": map[string]any{
			"name":   name,
			"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
		},
		"item": items,
	}
	if len(variables) > 0 {
		keys := make([]string, 0, len(variables))
		for key := range variables {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		list := make([]any, 0, len(keys))
		for _, key := range keys {
			list = append(list, map[string]any{"key": key, "value": toStringValue(variables[key])})
		}
		doc["variable"] = list
	}
	return doc
}

func postmanRawLanguage(mimeType string) string {
	mime := strings.ToLower(mimeType)
	switch {
	case strings.Contains(mime, "json"):
		return "json"
	case strings.Contains(mime, "xml"):
		return "xml"
	case strings.Contains(mime, "html"):
		return "html"
	case strings.Contains(mime, "javascript"):
		return "javascript"
	default:
		return "text"
	}
}

func importRequestName(method, rawURL string, index int) string {
	parsed, err := url.Parse(rawURL)
	if err == nil && parsed.Host != "" {
		path := parsed.Path
		if path == "" {
			path = "/"
		}
		return strings.ToUpper(firstNonEmpty(method, "GET")) + " " + parsed.Host + path
	}
	return fmt.Sprintf("%s Request %d", strings.ToUpper(firstNonEmpty(method, "GET")), index+1)
}

func sortedStringKeys(values url.Values) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func stringValue(value any) string {
	if value == nil {
		return ""
	}
	if text, ok := value.(string); ok {
		return text
	}
	return toStringValue(value)
}
