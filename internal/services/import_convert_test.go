package services

import (
	"encoding/json"
	"testing"
)

func TestConvertHARToPostman(t *testing.T) {
	fixture := `{
  "log": {
    "pages": [{"id":"page-1","title":"Catalog"}],
    "entries": [
      {"pageref":"page-1","request":{"method":"POST","url":"https://api.example.com/items?q=1","headers":[{"name":"Content-Type","value":"application/json"},{"name":"Content-Length","value":"9"}],"postData":{"mimeType":"application/json","text":"{\"ok\":true}"}}},
      {"request":{"method":"POST","url":"https://api.example.com/form","headers":[],"postData":{"mimeType":"application/x-www-form-urlencoded","text":"a=1&a=2"}}}
    ]
  }
}`
	converted, err := NewImportExportService(nil).ConvertImportDocument("har", fixture)
	if err != nil {
		t.Fatalf("ConvertImportDocument: %v", err)
	}
	if converted.Kind != "postman" {
		t.Fatalf("kind=%q", converted.Kind)
	}
	collection, err := parsePostman(converted.Content)
	if err != nil {
		t.Fatalf("转换结果不是合法 Postman Collection: %v\n%s", err, converted.Content)
	}
	if len(collection.Item) != 2 || collection.Item[0].Request == nil || len(collection.Item[1].Item) != 1 {
		t.Fatalf("转换后的树结构错误: %+v", collection.Item)
	}
	form := collection.Item[0].Request.Body
	if form == nil || form.Mode != "urlencoded" || len(form.URLEncoded) != 2 {
		t.Fatalf("urlencoded 请求体未保留重复字段: %+v", form)
	}
	request := collection.Item[1].Item[0].Request
	if request == nil || request.Body == nil || request.Body.Raw != `{"ok":true}` {
		t.Fatalf("JSON 请求体未保留: %+v", request)
	}
	if len(request.Header) != 1 || request.Header[0].Key != "Content-Type" {
		t.Fatalf("应过滤 Content-Length 并保留其余请求头: %+v", request.Header)
	}
}

func TestConvertInsomniaToPostman(t *testing.T) {
	fixture := `{
  "__export_format": 4,
  "resources": [
    {"_id":"wrk_1","_type":"workspace","name":"Orders"},
    {"_id":"env_1","_type":"environment","parentId":"wrk_1","data":{"base_url":"https://api.example.com","token":"secret"}},
    {"_id":"fld_1","_type":"request_group","parentId":"wrk_1","name":"Admin"},
    {"_id":"req_1","_type":"request","parentId":"fld_1","name":"Create","method":"POST","url":"{{ base_url }}/orders","headers":[{"name":"X-Trace","value":"one"}],"parameters":[{"name":"dry","value":"true"}],"body":{"mimeType":"application/json","text":"{\"id\":1}"},"authentication":{"type":"bearer","token":"{{ token }}"}}
  ]
}`
	converted, err := NewImportExportService(nil).ConvertImportDocument("insomnia", fixture)
	if err != nil {
		t.Fatalf("ConvertImportDocument: %v", err)
	}
	collection, err := parsePostman(converted.Content)
	if err != nil {
		t.Fatalf("转换结果不是合法 Postman Collection: %v", err)
	}
	if collection.Info.Name != "Orders" || len(collection.Variable) != 2 {
		t.Fatalf("工作区名称或变量丢失: %+v", collection)
	}
	if len(collection.Item) != 1 || len(collection.Item[0].Item) != 1 {
		t.Fatalf("目录层级丢失: %+v", collection.Item)
	}
	request := collection.Item[0].Item[0].Request
	if request == nil || request.Auth == nil || request.Auth.Type != "bearer" {
		t.Fatalf("认证丢失: %+v", request)
	}
	if request.Body == nil || request.Body.Raw != `{"id":1}` || len(request.URL.Query) != 1 {
		t.Fatalf("请求内容丢失: %+v", request)
	}

	var raw map[string]any
	if err := json.Unmarshal([]byte(converted.Content), &raw); err != nil {
		t.Fatalf("JSON 无法解码: %v", err)
	}
}

func TestConvertImportDocumentRejectsUnknownAndEmpty(t *testing.T) {
	svc := NewImportExportService(nil)
	if _, err := svc.ConvertImportDocument("unknown", `{}`); err == nil {
		t.Fatal("未知格式应报错")
	}
	if _, err := svc.ConvertImportDocument("har", `{"log":{"entries":[]}}`); err == nil {
		t.Fatal("空 HAR 应报错")
	}
}
