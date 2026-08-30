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
	if len(request.URL.Query) != 1 || request.URL.Query[0].Key != "q" {
		t.Fatalf("HAR URL 查询参数丢失: %+v", request.URL.Query)
	}
}

func TestConvertJMeterToPostman(t *testing.T) {
	fixture := `<?xml version="1.0"?><jmeterTestPlan><hashTree><TestPlan testname="Plan"/><hashTree><ThreadGroup testname="Users"/><hashTree><HTTPSamplerProxy testname="Create item"><stringProp name="HTTPSampler.domain">api.example.com</stringProp><stringProp name="HTTPSampler.protocol">https</stringProp><stringProp name="HTTPSampler.path">/items</stringProp><stringProp name="HTTPSampler.method">POST</stringProp><boolProp name="HTTPSampler.postBodyRaw">false</boolProp><elementProp name="HTTPsampler.Arguments" elementType="Arguments"><collectionProp name="Arguments.arguments"><elementProp name="name" elementType="HTTPArgument"><stringProp name="Argument.name">title</stringProp><stringProp name="Argument.value">hello</stringProp></elementProp></collectionProp></elementProp></HTTPSamplerProxy><hashTree><HeaderManager><collectionProp><elementProp name="" elementType="Header"><stringProp name="Header.name">X-Trace</stringProp><stringProp name="Header.value">one</stringProp></elementProp></collectionProp></HeaderManager></hashTree></hashTree></hashTree></hashTree></jmeterTestPlan>`
	converted, err := NewImportExportService(nil).ConvertImportDocument("jmeter", fixture)
	if err != nil {
		t.Fatalf("ConvertImportDocument: %v", err)
	}
	collection, err := parsePostman(converted.Content)
	if err != nil || len(collection.Item) != 1 {
		t.Fatalf("JMeter 转换结果错误: err=%v collection=%+v", err, collection)
	}
	request := collection.Item[0].Request
	if request == nil || request.URL.Raw != "https://api.example.com/items" || request.Body == nil || len(request.Body.URLEncoded) != 1 {
		t.Fatalf("JMeter 请求内容丢失: %+v", request)
	}
	if len(request.Header) != 1 || request.Header[0].Key != "X-Trace" {
		t.Fatalf("JMeter HeaderManager 丢失: %+v", request.Header)
	}
}

func TestConvertYApiToPostman(t *testing.T) {
	fixture := `[{"name":"Users","list":[{"_id":1,"title":"Create user","path":"/users","method":"POST","req_headers":[{"name":"X-Trace","value":"one"}],"req_query":[{"name":"dry","example":"true"}],"req_body_type":"json","req_body_other":"{\"name\":\"A\"}"}]}]`
	converted, err := NewImportExportService(nil).ConvertImportDocument("yapi", fixture)
	if err != nil {
		t.Fatalf("ConvertImportDocument: %v", err)
	}
	collection, err := parsePostman(converted.Content)
	if err != nil || len(collection.Item) != 1 || len(collection.Item[0].Item) != 1 {
		t.Fatalf("YApi 目录转换错误: err=%v collection=%+v", err, collection)
	}
	request := collection.Item[0].Item[0].Request
	if request == nil || request.Body == nil || request.Body.Raw != `{"name":"A"}` || len(request.URL.Query) != 1 {
		t.Fatalf("YApi 请求内容丢失: %+v", request)
	}
}

func TestConvertHoppscotchToPostman(t *testing.T) {
	fixture := `{"name":"Demo","folders":[{"name":"Admin","folders":[],"requests":[{"name":"List","method":"GET","endpoint":"https://api.example.com/users","params":[{"key":"page","value":"1","active":true}],"headers":[{"key":"Authorization","value":"Bearer token","active":false}]}]}],"requests":[]}`
	converted, err := NewImportExportService(nil).ConvertImportDocument("hoppscotch", fixture)
	if err != nil {
		t.Fatalf("ConvertImportDocument: %v", err)
	}
	collection, err := parsePostman(converted.Content)
	if err != nil || collection.Info.Name != "Demo" || len(collection.Item) != 1 {
		t.Fatalf("Hoppscotch 转换错误: err=%v collection=%+v", err, collection)
	}
	request := collection.Item[0].Item[0].Request
	if request == nil || len(request.URL.Query) != 1 || len(request.Header) != 1 || !request.Header[0].Disabled {
		t.Fatalf("Hoppscotch 参数或开关丢失: %+v", request)
	}
}

func TestConvertApiPostToPostman(t *testing.T) {
	fixture := `{"name":"ApiPost Demo","apis":[{"name":"Ping","method":"GET","url":"https://api.example.com/ping","headers":{"X-Trace":"one"},"query":[{"key":"q","value":"ok"}]}]}`
	converted, err := NewImportExportService(nil).ConvertImportDocument("apipost", fixture)
	if err != nil {
		t.Fatalf("ConvertImportDocument: %v", err)
	}
	collection, err := parsePostman(converted.Content)
	if err != nil || collection.Info.Name != "ApiPost Demo" || len(collection.Item) != 1 {
		t.Fatalf("ApiPost 转换错误: err=%v collection=%+v", err, collection)
	}
	request := collection.Item[0].Request
	if request == nil || len(request.Header) != 1 || len(request.URL.Query) != 1 {
		t.Fatalf("ApiPost 请求内容丢失: %+v", request)
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
