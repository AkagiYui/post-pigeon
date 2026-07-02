package services

import (
	"testing"
)

const swagger2Doc = `{
  "swagger": "2.0",
  "basePath": "/api",
  "paths": {
    "/user/qrcode": {
      "post": {
        "summary": "获取门禁二维码",
        "consumes": ["application/x-www-form-urlencoded"],
        "parameters": [
          {"name": "Authorization", "in": "header", "required": true, "type": "string", "x-example": "token123"},
          {"name": "officeId", "in": "formData", "required": true, "type": "string"},
          {"name": "employeeId", "in": "formData", "required": true, "type": "string"}
        ]
      }
    },
    "/user/list": {
      "get": {
        "summary": "用户列表",
        "parameters": [
          {"name": "page", "in": "query", "type": "integer", "x-example": 1}
        ]
      }
    }
  }
}`

const openapi3Doc = `{
  "openapi": "3.0.1",
  "info": {"title": "订单服务", "description": "d"},
  "servers": [
    {"url": "https://test.example.com", "description": "测试环境"},
    {"url": "https://new-env.example.com", "description": "预发环境"}
  ],
  "paths": {
    "/user/create": {
      "post": {
        "summary": "创建用户",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {"type": "string", "example": "张三"},
                  "age": {"type": "integer", "example": 20}
                }
              }
            }
          }
        }
      }
    },
    "/user/form": {
      "post": {
        "summary": "表单提交",
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "object",
                "properties": {
                  "field1": {"type": "string", "example": "v1"}
                }
              }
            }
          }
        }
      }
    }
  }
}`

func TestParseSwagger2(t *testing.T) {
	eps, err := parseOpenAPI(swagger2Doc)
	if err != nil {
		t.Fatalf("parseOpenAPI err=%v", err)
	}
	if len(eps) != 2 {
		t.Fatalf("解析端点数 = %d，期望 2", len(eps))
	}
	// 找到 qrcode 端点
	var qr *parsedEndpoint
	for i := range eps {
		if eps[i].Path == "/api/user/qrcode" {
			qr = &eps[i]
		}
	}
	if qr == nil {
		t.Fatalf("未找到 /api/user/qrcode 端点，实际=%+v", eps)
	}
	if qr.Method != "POST" {
		t.Errorf("method = %q，期望 POST", qr.Method)
	}
	if len(qr.Headers) != 1 || qr.Headers[0].Name != "Authorization" || qr.Headers[0].Value != "token123" {
		t.Errorf("header 解析错误：%+v", qr.Headers)
	}
	if qr.BodyType != "x-www-form-urlencoded" {
		t.Errorf("bodyType = %q，期望 x-www-form-urlencoded", qr.BodyType)
	}
	if len(qr.BodyFields) != 2 {
		t.Errorf("表单字段数 = %d，期望 2", len(qr.BodyFields))
	}
}

func TestParseOpenAPI3(t *testing.T) {
	eps, err := parseOpenAPI(openapi3Doc)
	if err != nil {
		t.Fatalf("parseOpenAPI err=%v", err)
	}
	if len(eps) != 2 {
		t.Fatalf("解析端点数 = %d，期望 2", len(eps))
	}
	var create *parsedEndpoint
	for i := range eps {
		if eps[i].Path == "/user/create" {
			create = &eps[i]
		}
	}
	if create == nil {
		t.Fatalf("未找到 /user/create")
	}
	if create.BodyType != "json" {
		t.Errorf("bodyType = %q，期望 json", create.BodyType)
	}
	if create.ContentType != "application/json" {
		t.Errorf("contentType = %q", create.ContentType)
	}
	if create.BodyContent == "" || !contains(create.BodyContent, "张三") {
		t.Errorf("json 请求体未包含示例值：%q", create.BodyContent)
	}
}

func TestImportOpenAPIToModule(t *testing.T) {
	db := newTestDB(t)
	ie := NewImportExportService(db)
	p := mustCreateProject(t, db, "导入项目")
	m := defaultModule(t, db, p.ID)

	// 预览
	preview, err := ie.PreviewOpenAPIImport(m.ID, openapi3Doc)
	if err != nil {
		t.Fatalf("PreviewOpenAPIImport err=%v", err)
	}
	if preview.Total != 2 {
		t.Fatalf("预览总数 = %d，期望 2", preview.Total)
	}
	if preview.DuplicateCount != 0 {
		t.Errorf("首次导入不应有重复项，实际 %d", preview.DuplicateCount)
	}
	if preview.ModuleName != "订单服务" {
		t.Errorf("预览模块名 = %q，期望 订单服务", preview.ModuleName)
	}
	if len(preview.Servers) != 2 {
		t.Fatalf("预览服务器数 = %d，期望 2", len(preview.Servers))
	}
	// 「测试环境」为项目默认环境，应标记为已存在；「预发环境」为新环境
	for _, srv := range preview.Servers {
		if srv.Name == "测试环境" && !srv.EnvironmentSame {
			t.Errorf("测试环境应标记为已存在")
		}
		if srv.Name == "预发环境" && srv.EnvironmentSame {
			t.Errorf("预发环境应标记为新环境")
		}
	}

	// 导入（含覆盖模块名与导入环境/前置 URL）
	res, err := ie.ImportOpenAPIToModule(m.ID, openapi3Doc, OpenAPIImportOptions{
		Overwrite: false, OverwriteModuleName: true, ImportServers: true,
	})
	if err != nil {
		t.Fatalf("ImportOpenAPIToModule err=%v", err)
	}
	if res.Created != 2 {
		t.Errorf("创建数 = %d，期望 2", res.Created)
	}
	if !res.ModuleRenamed {
		t.Errorf("应重命名模块")
	}
	if res.EnvironmentsCreated != 1 {
		t.Errorf("新建环境数 = %d，期望 1（预发环境）", res.EnvironmentsCreated)
	}
	if res.BaseURLsSet != 2 {
		t.Errorf("设置前置 URL 数 = %d，期望 2", res.BaseURLsSet)
	}
	// 校验模块已改名
	renamed, _ := NewModuleService(db).GetModule(m.ID)
	if renamed.Name != "订单服务" {
		t.Errorf("模块名 = %q，期望 订单服务", renamed.Name)
	}
	// 校验前置 URL 已设置（测试环境）
	urls, _ := NewModuleService(db).GetModuleBaseURLs(m.ID)
	var foundURL bool
	for _, u := range urls {
		if u.BaseURL == "https://test.example.com" {
			foundURL = true
		}
	}
	if !foundURL {
		t.Errorf("未找到测试环境前置 URL，urls=%+v", urls)
	}

	// 再次预览应检测到重复
	preview2, _ := ie.PreviewOpenAPIImport(m.ID, openapi3Doc)
	if preview2.DuplicateCount != 2 {
		t.Errorf("重复检测数 = %d，期望 2", preview2.DuplicateCount)
	}

	// 忽略重复导入
	resSkip, _ := ie.ImportOpenAPIToModule(m.ID, openapi3Doc, OpenAPIImportOptions{Overwrite: false})
	if resSkip.Skipped != 2 || resSkip.Created != 0 {
		t.Errorf("忽略导入结果 = %+v，期望 skipped=2 created=0", resSkip)
	}

	// 覆盖导入
	resOver, _ := ie.ImportOpenAPIToModule(m.ID, openapi3Doc, OpenAPIImportOptions{Overwrite: true})
	if resOver.Overwritten != 2 {
		t.Errorf("覆盖导入结果 = %+v，期望 overwritten=2", resOver)
	}

	// 最终模块中应仍只有 2 个端点（覆盖不重复累加）
	tree, _ := NewProjectService(db).GetProjectTree(m.ProjectID)
	if len(tree) != 1 {
		t.Fatalf("模块数 = %d", len(tree))
	}
	if len(tree[0].Endpoints) != 2 {
		t.Errorf("覆盖后模块端点数 = %d，期望 2", len(tree[0].Endpoints))
	}
}

// TestImportOpenAPISelectedIndexes 验证仅导入用户勾选的接口
func TestImportOpenAPISelectedIndexes(t *testing.T) {
	db := newTestDB(t)
	ie := NewImportExportService(db)
	p := mustCreateProject(t, db, "选择导入项目")
	m := defaultModule(t, db, p.ID)

	preview, err := ie.PreviewOpenAPIImport(m.ID, openapi3Doc)
	if err != nil {
		t.Fatalf("PreviewOpenAPIImport err=%v", err)
	}
	if preview.Total != 2 {
		t.Fatalf("预览总数 = %d，期望 2", preview.Total)
	}

	// 仅勾选第一个接口
	res, err := ie.ImportOpenAPIToModule(m.ID, openapi3Doc, OpenAPIImportOptions{
		SelectedIndexes: []int{preview.Items[0].Index},
	})
	if err != nil {
		t.Fatalf("ImportOpenAPIToModule err=%v", err)
	}
	if res.Created != 1 {
		t.Errorf("创建数 = %d，期望 1", res.Created)
	}

	tree, _ := NewProjectService(db).GetProjectTree(m.ProjectID)
	if len(tree[0].Endpoints) != 1 {
		t.Errorf("选择性导入后模块端点数 = %d，期望 1", len(tree[0].Endpoints))
	}
	if tree[0].Endpoints[0].Name != preview.Items[0].Name {
		t.Errorf("导入的接口名 = %q，期望 %q", tree[0].Endpoints[0].Name, preview.Items[0].Name)
	}

	// 勾选空数组时不应导入任何接口
	resNone, err := ie.ImportOpenAPIToModule(m.ID, openapi3Doc, OpenAPIImportOptions{
		SelectedIndexes: []int{},
	})
	if err != nil {
		t.Fatalf("ImportOpenAPIToModule err=%v", err)
	}
	if resNone.Created != 0 || resNone.Skipped != 0 {
		t.Errorf("空选择导入结果 = %+v，期望 created=0 skipped=0", resNone)
	}
}

func TestDuplicateAndMoveEndpoint(t *testing.T) {
	db := newTestDB(t)
	es := NewEndpointService(db)
	fs := NewFolderService(db)
	p := mustCreateProject(t, db, "复制移动项目")
	m := defaultModule(t, db, p.ID)

	e1, _ := es.CreateEndpoint(m.ID, nil, "接口A", "GET", "/a")
	// 复制
	dup, err := es.DuplicateEndpoint(e1.ID)
	if err != nil {
		t.Fatalf("DuplicateEndpoint err=%v", err)
	}
	if dup.ID == e1.ID || dup.Name != "接口A 副本" {
		t.Errorf("复制端点结果异常：%+v", dup)
	}

	// 重命名
	if err := es.RenameEndpoint(e1.ID, "接口A改"); err != nil {
		t.Fatalf("RenameEndpoint err=%v", err)
	}
	got, _ := es.GetEndpoint(e1.ID)
	if got.Name != "接口A改" {
		t.Errorf("重命名后 name = %q", got.Name)
	}

	// 移动到文件夹
	folder, _ := fs.CreateFolder(m.ID, nil, "目标夹")
	if err := es.MoveEndpoint(e1.ID, m.ID, &folder.ID); err != nil {
		t.Fatalf("MoveEndpoint err=%v", err)
	}
	moved, _ := es.GetEndpoint(e1.ID)
	if moved.FolderID == nil || *moved.FolderID != folder.ID {
		t.Errorf("移动后 folderID = %v，期望 %s", moved.FolderID, folder.ID)
	}
}

func TestDuplicateFolderAndModule(t *testing.T) {
	db := newTestDB(t)
	es := NewEndpointService(db)
	fs := NewFolderService(db)
	ms := NewModuleService(db)
	ps := NewProjectService(db)
	p := mustCreateProject(t, db, "复制夹项目")
	m := defaultModule(t, db, p.ID)

	folder, _ := fs.CreateFolder(m.ID, nil, "夹1")
	_, _ = es.CreateEndpoint(m.ID, &folder.ID, "夹内接口", "GET", "/x")
	sub, _ := fs.CreateFolder(m.ID, &folder.ID, "子夹")
	_, _ = es.CreateEndpoint(m.ID, &sub.ID, "子夹接口", "POST", "/y")

	// 复制文件夹
	if _, err := fs.DuplicateFolder(folder.ID); err != nil {
		t.Fatalf("DuplicateFolder err=%v", err)
	}
	tree, _ := ps.GetProjectTree(p.ID)
	// 模块层级应有 夹1 与 夹1 副本
	var names []string
	for _, f := range tree[0].Folders {
		names = append(names, f.Name)
	}
	if len(tree[0].Folders) != 2 {
		t.Errorf("复制后顶级文件夹 = %v，期望 2 个", names)
	}

	// 复制模块
	if _, err := ms.DuplicateModule(m.ID); err != nil {
		t.Fatalf("DuplicateModule err=%v", err)
	}
	tree2, _ := ps.GetProjectTree(p.ID)
	if len(tree2) != 2 {
		t.Errorf("复制后模块数 = %d，期望 2", len(tree2))
	}
}

func TestMoveFolderToAnotherModule(t *testing.T) {
	db := newTestDB(t)
	es := NewEndpointService(db)
	fs := NewFolderService(db)
	ms := NewModuleService(db)
	ps := NewProjectService(db)
	p := mustCreateProject(t, db, "跨模块移动")
	m1 := defaultModule(t, db, p.ID)
	m2, _ := ms.CreateModule(p.ID, "模块2")

	folder, _ := fs.CreateFolder(m1.ID, nil, "被移动")
	ep, _ := es.CreateEndpoint(m1.ID, &folder.ID, "夹内", "GET", "/z")

	// 移动到 m2 根级
	if err := fs.MoveFolderTo(folder.ID, m2.ID, nil); err != nil {
		t.Fatalf("MoveFolderTo err=%v", err)
	}

	// 端点的 module_id 也应更新为 m2
	movedEp, _ := es.GetEndpoint(ep.ID)
	if movedEp.ModuleID != m2.ID {
		t.Errorf("移动后端点 moduleID = %q，期望 %q", movedEp.ModuleID, m2.ID)
	}

	// m2 树中应能看到该文件夹
	tree, _ := ps.GetProjectTree(p.ID)
	var m2Tree *ModuleTree
	for i := range tree {
		if tree[i].ID == m2.ID {
			m2Tree = &tree[i]
		}
	}
	if m2Tree == nil || len(m2Tree.Folders) != 1 || m2Tree.Folders[0].Name != "被移动" {
		t.Errorf("m2 文件夹 = %+v，期望包含 被移动", m2Tree)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
