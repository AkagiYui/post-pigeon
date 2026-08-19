package services

import (
	"encoding/json"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

const samplePostmanCollection = `{
  "info": {
    "name": "Demo API",
    "description": "示例集合",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "https://api.demo.com" },
    { "key": "token", "value": "t-1" }
  ],
  "event": [
    { "listen": "prerequest", "script": { "exec": ["console.log('collection pre')"] } }
  ],
  "item": [
    {
      "name": "Users",
      "item": [
        {
          "name": "List users",
          "request": {
            "method": "GET",
            "header": [{ "key": "Accept", "value": "application/json" }],
            "url": {
              "raw": "{{baseUrl}}/users?page=1",
              "path": ["users"],
              "query": [{ "key": "page", "value": "1" }]
            }
          },
          "event": [
            { "listen": "test", "script": { "exec": ["pm.test('ok', () => pm.response.to.have.status(200))"] } }
          ]
        },
        {
          "name": "Get user",
          "request": {
            "method": "GET",
            "url": { "raw": "{{baseUrl}}/users/:id", "path": ["users", ":id"], "variable": [{ "key": "id", "value": "1" }] }
          }
        }
      ]
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{token}}" }] },
        "body": {
          "mode": "raw",
          "raw": "{\"user\":\"a\"}",
          "options": { "raw": { "language": "json" } }
        },
        "url": { "raw": "{{baseUrl}}/login", "path": ["login"] }
      }
    },
    {
      "name": "Upload",
      "request": {
        "method": "POST",
        "body": {
          "mode": "formdata",
          "formdata": [
            { "key": "name", "value": "a", "type": "text" },
            { "key": "file", "type": "file", "src": "x.png" }
          ]
        },
        "url": { "raw": "{{baseUrl}}/upload", "path": ["upload"] }
      }
    }
  ]
}`

func TestPreviewPostman(t *testing.T) {
	svc := NewPostmanService(nil)
	preview, err := svc.PreviewPostman(samplePostmanCollection)
	if err != nil {
		t.Fatalf("PreviewPostman err=%v", err)
	}
	if preview.Name != "Demo API" {
		t.Errorf("Name=%q", preview.Name)
	}
	if preview.Folders != 1 {
		t.Errorf("Folders=%d", preview.Folders)
	}
	if preview.Endpoints != 4 {
		t.Errorf("Endpoints=%d", preview.Endpoints)
	}
	if preview.Variables != 2 {
		t.Errorf("Variables=%d", preview.Variables)
	}
	if !preview.HasScripts {
		t.Errorf("应识别出脚本")
	}
}

func TestPreviewPostmanRejectsOtherFormats(t *testing.T) {
	svc := NewPostmanService(nil)
	if _, err := svc.PreviewPostman(`{"openapi":"3.0.0","paths":{}}`); err == nil {
		t.Errorf("OpenAPI 文档不应被当作 Postman Collection")
	}
	if _, err := svc.PreviewPostman(`not json`); err == nil {
		t.Errorf("非法 JSON 应报错")
	}
}

func TestImportPostman(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "postman")

	svc := NewPostmanService(db)
	result, err := svc.ImportPostman(project.ID, samplePostmanCollection)
	if err != nil {
		t.Fatalf("ImportPostman err=%v", err)
	}
	if result.Endpoints != 4 || result.Folders != 1 || result.Variables != 2 {
		t.Fatalf("导入统计有误：%+v", result)
	}

	var endpoints []models.Endpoint
	if err := db.Where("module_id = ?", result.ModuleID).Find(&endpoints).Error; err != nil {
		t.Fatalf("查询接口失败: %v", err)
	}
	byName := map[string]models.Endpoint{}
	for _, ep := range endpoints {
		byName[ep.Name] = ep
	}

	// 路径参数 :id 应转成本项目的 {id} 约定
	if got := byName["Get user"].Path; got != "/users/{id}" {
		t.Errorf("路径参数未转换：%q", got)
	}
	// raw + language=json 应识别为 JSON 请求体
	login := byName["Login"]
	if login.BodyType != string(models.BodyTypeJSON) {
		t.Errorf("Login.BodyType=%q", login.BodyType)
	}
	// 集合级前置脚本应下发到没有自己脚本的接口
	if !strings.Contains(login.PreRequestScript, "collection pre") {
		t.Errorf("集合级前置脚本未继承：%q", login.PreRequestScript)
	}
	// 接口自己的后置脚本优先
	if !strings.Contains(byName["List users"].PostResponseScript, "pm.test") {
		t.Errorf("接口后置脚本丢失")
	}
	// formdata 的文件字段
	upload := byName["Upload"]
	if upload.BodyType != string(models.BodyTypeFormData) {
		t.Errorf("Upload.BodyType=%q", upload.BodyType)
	}
	var fields []models.EndpointBodyField
	_ = db.Where("endpoint_id = ?", upload.ID).Find(&fields).Error
	if len(fields) != 2 {
		t.Fatalf("form 字段数=%d", len(fields))
	}
	fileField := 0
	for _, f := range fields {
		if f.FieldType == "file" {
			fileField++
		}
	}
	if fileField != 1 {
		t.Errorf("应有 1 个文件字段，实际 %d", fileField)
	}

	// bearer 认证
	var auth models.EndpointAuth
	if err := db.Where("endpoint_id = ?", login.ID).First(&auth).Error; err != nil {
		t.Fatalf("未导入认证: %v", err)
	}
	if auth.Type != string(models.AuthTypeBearer) {
		t.Errorf("认证类型=%q", auth.Type)
	}

	// 集合变量导入为项目全局变量
	var globals []models.GlobalVariable
	_ = db.Where("project_id = ?", project.ID).Find(&globals).Error
	if len(globals) != 2 {
		t.Errorf("全局变量数=%d", len(globals))
	}
}

func TestExportOpenAPI(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "export")
	module := defaultModule(t, db, project.ID)

	endpointSvc := NewEndpointService(db)
	created, err := endpointSvc.CreateFullEndpoint(module.ID, nil, EndpointSaveData{
		Name: "创建订单", Method: "POST", Path: "/orders/{id}",
		BodyType: string(models.BodyTypeJSON), BodyContent: `{"n":1}`,
		Description: "下单接口", Tags: `["order"]`,
		Params: []models.EndpointParam{
			{Type: "path", Name: "id", Enabled: true, DataType: "string"},
			{Type: "query", Name: "dry", Enabled: true, DataType: "boolean"},
		},
		Headers: []models.EndpointHeader{{Name: "X-Trace", Enabled: true}},
		Auth: &models.EndpointAuth{
			Type: string(models.AuthTypeBearer),
			Data: models.ToJSON(models.BearerAuthData{Token: "t"}),
		},
	})
	if err != nil {
		t.Fatalf("CreateFullEndpoint err=%v", err)
	}
	if created == nil {
		t.Fatal("创建接口返回空")
	}

	out, err := NewImportExportService(db).ExportOpenAPI(module.ID)
	if err != nil {
		t.Fatalf("ExportOpenAPI err=%v", err)
	}

	var doc map[string]any
	if err := json.Unmarshal([]byte(out), &doc); err != nil {
		t.Fatalf("导出结果不是合法 JSON: %v", err)
	}
	if doc["openapi"] != "3.1.0" {
		t.Errorf("openapi=%v", doc["openapi"])
	}
	paths, _ := doc["paths"].(map[string]any)
	operation, ok := paths["/orders/{id}"].(map[string]any)
	if !ok {
		t.Fatalf("缺少路径 /orders/{id}，实际 %v", paths)
	}
	post, ok := operation["post"].(map[string]any)
	if !ok {
		t.Fatalf("缺少 post 操作")
	}
	if post["summary"] != "创建订单" {
		t.Errorf("summary=%v", post["summary"])
	}
	params, _ := post["parameters"].([]any)
	if len(params) != 3 {
		t.Errorf("参数数量=%d（path + query + header）", len(params))
	}
	// path 参数必须 required
	for _, raw := range params {
		p, _ := raw.(map[string]any)
		if p["in"] == "path" && p["required"] != true {
			t.Errorf("path 参数必须 required：%v", p)
		}
	}
	if _, ok := post["requestBody"]; !ok {
		t.Errorf("缺少 requestBody")
	}
	components, _ := doc["components"].(map[string]any)
	schemes, _ := components["securitySchemes"].(map[string]any)
	if _, ok := schemes["bearerAuth"]; !ok {
		t.Errorf("缺少 bearerAuth 安全方案：%v", components)
	}
}

func TestExportOpenAPIUnknownModule(t *testing.T) {
	db := newTestDB(t)
	if _, err := NewImportExportService(db).ExportOpenAPI("nope"); err == nil {
		t.Errorf("模块不存在应报错")
	}
}
