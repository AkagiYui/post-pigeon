package services

import (
	"strings"
	"testing"

	"post-pigeon/internal/models"
)

func TestImportExportRoundTrip(t *testing.T) {
	db := newTestDB(t)
	ps := NewProjectService(db)
	es := NewEndpointService(db)
	fs := NewFolderService(db)
	envs := NewEnvironmentService(db)
	ie := NewImportExportService(db)

	// 构造一个有内容的项目
	p := mustCreateProject(t, db, "源项目")
	m := defaultModule(t, db, p.ID)
	env := firstEnvironment(t, db, p.ID)
	if err := envs.SaveEnvironmentVariables(env.ID, []models.EnvironmentVariable{
		{Key: "k", Value: "v", Enabled: true},
	}); err != nil {
		t.Fatalf("保存变量 err=%v", err)
	}
	if err := NewModuleService(db).SetModuleBaseURL(m.ID, env.ID, "https://api.example.com"); err != nil {
		t.Fatalf("设置前置URL err=%v", err)
	}
	folder, _ := fs.CreateFolder(m.ID, nil, "Docs")
	e1, _ := es.CreateEndpoint(m.ID, nil, "List", "GET", "/list")
	if err := es.SaveEndpointData(EndpointSaveData{
		ID: e1.ID, Name: "List", Method: "GET", Path: "/list",
		Params:  []models.EndpointParam{{Type: "query", Name: "a", Value: "1", Enabled: true}},
		Headers: []models.EndpointHeader{{Name: "H", Value: "h", Enabled: true}},
		Auth:    &models.EndpointAuth{Type: "bearer", Data: models.ToJSON(models.BearerAuthData{Token: "tok"})},
	}); err != nil {
		t.Fatalf("保存端点 err=%v", err)
	}
	_, _ = es.CreateEndpoint(m.ID, &folder.ID, "Detail", "GET", "/d/1")

	// 导出
	jsonStr, err := ie.ExportProject(p.ID)
	if err != nil {
		t.Fatalf("ExportProject err=%v", err)
	}
	if !strings.Contains(jsonStr, `"version"`) {
		t.Errorf("导出 JSON 缺少 version 字段")
	}

	// 导入为新项目
	np, err := ie.ImportProject(jsonStr)
	if err != nil {
		t.Fatalf("ImportProject err=%v", err)
	}
	if np.ID == p.ID {
		t.Error("导入应生成新项目 ID")
	}
	if np.Name != "源项目" {
		t.Errorf("导入项目名 = %q", np.Name)
	}

	// 校验结构：通过项目树
	tree, err := ps.GetProjectTree(np.ID)
	if err != nil {
		t.Fatalf("GetProjectTree(导入后) err=%v", err)
	}
	if len(tree) != 1 {
		t.Fatalf("导入后模块数 = %d，期望 1", len(tree))
	}
	mt := tree[0]
	// 模块直属端点 List
	var foundList bool
	for _, ep := range mt.Endpoints {
		if ep.Name == "List" {
			foundList = true
		}
	}
	if !foundList {
		t.Errorf("导入后未找到模块直属端点 List，端点=%v", endpointNames(mt.Endpoints))
	}
	// 文件夹 Docs 及其端点 Detail
	if len(mt.Folders) != 1 || mt.Folders[0].Name != "Docs" {
		t.Fatalf("导入后文件夹 = %v，期望 [Docs]", folderNames(mt.Folders))
	}
	if len(mt.Folders[0].Endpoints) != 1 || mt.Folders[0].Endpoints[0].Name != "Detail" {
		t.Errorf("Docs 下端点 = %v，期望 [Detail]", endpointNames(mt.Folders[0].Endpoints))
	}

	// 校验 List 端点的关联数据是否一并导入
	var listID string
	for _, ep := range mt.Endpoints {
		if ep.Name == "List" {
			listID = ep.ID
		}
	}
	detail, err := es.GetEndpoint(listID)
	if err != nil {
		t.Fatalf("GetEndpoint(导入的 List) err=%v", err)
	}
	if len(detail.Params) != 1 {
		t.Errorf("导入后 List 参数数 = %d，期望 1", len(detail.Params))
	}
	if len(detail.Headers) != 1 {
		t.Errorf("导入后 List 请求头数 = %d，期望 1", len(detail.Headers))
	}
	if detail.Auth == nil || detail.Auth.Type != "bearer" {
		t.Errorf("导入后 List 认证 = %+v，期望 bearer", detail.Auth)
	}

	// 校验环境与变量
	importedEnvs, _ := envs.ListEnvironments(np.ID)
	if len(importedEnvs) != 2 {
		t.Errorf("导入后环境数 = %d，期望 2", len(importedEnvs))
	}
	var foundVar bool
	for _, ie := range importedEnvs {
		vs, _ := envs.GetEnvironmentVariables(ie.ID)
		for _, v := range vs {
			if v.Key == "k" && v.Value == "v" {
				foundVar = true
			}
		}
	}
	if !foundVar {
		t.Error("导入后未找到环境变量 k=v")
	}

	// 校验模块前置 URL 随环境 ID 映射一并恢复
	importedModuleID := tree[0].ID
	var importedEnvID string
	for _, ie := range importedEnvs {
		if ie.Name == env.Name {
			importedEnvID = ie.ID
		}
	}
	urls, _ := NewModuleService(db).GetModuleBaseURLs(importedModuleID)
	var foundURL bool
	for _, u := range urls {
		if u.EnvironmentID == importedEnvID && u.BaseURL == "https://api.example.com" {
			foundURL = true
		}
	}
	if !foundURL {
		t.Errorf("导入后未恢复模块前置 URL，urls=%+v", urls)
	}
}

func endpointNames(eps []models.Endpoint) []string {
	out := make([]string, 0, len(eps))
	for _, e := range eps {
		out = append(out, e.Name)
	}
	return out
}

func folderNames(fs []FolderTree) []string {
	out := make([]string, 0, len(fs))
	for _, f := range fs {
		out = append(out, f.Name)
	}
	return out
}
