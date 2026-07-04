package services

import (
	"testing"

	"post-pigeon/internal/models"
)

// TestConvertFolderToModule 验证「文件夹转换为模块」：
// 文件夹成为新模块根、后代归属更新、前置 URL 复制、树结构正确。
func TestConvertFolderToModule(t *testing.T) {
	db := newTestDB(t)
	ms := NewModuleService(db)
	fs := NewFolderService(db)
	es := NewEndpointService(db)

	p := mustCreateProject(t, db, "P")
	m0 := defaultModule(t, db, p.ID)
	env := firstEnvironment(t, db, p.ID)

	// 原模块设置一个前置 URL，转换后应复制到新模块
	if err := ms.SetModuleBaseURL(m0.ID, env.ID, "https://api.example.com"); err != nil {
		t.Fatalf("SetModuleBaseURL err=%v", err)
	}

	// F（M0 下的普通文件夹）→ SF（F 的子文件夹）
	f, err := fs.CreateFolder(m0.ID, nil, "F")
	if err != nil {
		t.Fatalf("CreateFolder F err=%v", err)
	}
	sf, err := fs.CreateFolder(m0.ID, &f.ID, "SF")
	if err != nil {
		t.Fatalf("CreateFolder SF err=%v", err)
	}
	// F 下一个接口、SF 下一个接口
	e1, err := es.CreateEndpoint(m0.ID, &f.ID, "E1", "GET", "/e1")
	if err != nil {
		t.Fatalf("CreateEndpoint E1 err=%v", err)
	}
	e2, err := es.CreateEndpoint(m0.ID, &sf.ID, "E2", "POST", "/e2")
	if err != nil {
		t.Fatalf("CreateEndpoint E2 err=%v", err)
	}

	newMod, err := ms.ConvertFolderToModule(f.ID, "新模块")
	if err != nil {
		t.Fatalf("ConvertFolderToModule err=%v", err)
	}
	if newMod == nil || newMod.ID == "" || newMod.Name != "新模块" {
		t.Fatalf("新模块无效: %+v", newMod)
	}
	if newMod.ProjectID != p.ID {
		t.Errorf("新模块 projectID = %q，期望 %q", newMod.ProjectID, p.ID)
	}

	// F 成为新模块的根文件夹
	var fReloaded models.Folder
	db.Where("id = ?", f.ID).First(&fReloaded)
	if fReloaded.ModuleID != newMod.ID {
		t.Errorf("F.module_id = %q，期望新模块 %q", fReloaded.ModuleID, newMod.ID)
	}
	if fReloaded.ParentID != nil {
		t.Errorf("F.parent_id = %v，期望 nil（根文件夹）", fReloaded.ParentID)
	}
	if fReloaded.Name != "__root" {
		t.Errorf("F.name = %q，期望 __root", fReloaded.Name)
	}

	// 后代文件夹与接口归入新模块
	var sfReloaded models.Folder
	db.Where("id = ?", sf.ID).First(&sfReloaded)
	if sfReloaded.ModuleID != newMod.ID {
		t.Errorf("SF.module_id = %q，期望 %q", sfReloaded.ModuleID, newMod.ID)
	}
	var e1Reloaded, e2Reloaded models.Endpoint
	db.Where("id = ?", e1.ID).First(&e1Reloaded)
	db.Where("id = ?", e2.ID).First(&e2Reloaded)
	if e1Reloaded.ModuleID != newMod.ID || e2Reloaded.ModuleID != newMod.ID {
		t.Errorf("接口归属未更新: E1=%q E2=%q，期望 %q", e1Reloaded.ModuleID, e2Reloaded.ModuleID, newMod.ID)
	}

	// 前置 URL 复制到新模块
	urls, err := ms.GetModuleBaseURLs(newMod.ID)
	if err != nil {
		t.Fatalf("GetModuleBaseURLs err=%v", err)
	}
	if len(urls) != 1 || urls[0].EnvironmentID != env.ID || urls[0].BaseURL != "https://api.example.com" {
		t.Errorf("前置 URL 复制错误: %+v", urls)
	}

	// 项目树：新模块把 F 的内容展开到模块层（E1 在模块直属，SF 为顶级文件夹，E2 在 SF 下）
	tree, err := NewProjectService(db).GetProjectTree(p.ID)
	if err != nil {
		t.Fatalf("GetProjectTree err=%v", err)
	}
	var nt *ModuleTree
	for i := range tree {
		if tree[i].ID == newMod.ID {
			nt = &tree[i]
			break
		}
	}
	if nt == nil {
		t.Fatalf("项目树缺少新模块")
	}
	if len(nt.Endpoints) != 1 || nt.Endpoints[0].ID != e1.ID {
		t.Errorf("新模块直属接口 = %+v，期望仅 E1", nt.Endpoints)
	}
	if len(nt.Folders) != 1 || nt.Folders[0].ID != sf.ID {
		t.Errorf("新模块顶级文件夹 = %+v，期望仅 SF", nt.Folders)
	}
	if len(nt.Folders) == 1 && (len(nt.Folders[0].Endpoints) != 1 || nt.Folders[0].Endpoints[0].ID != e2.ID) {
		t.Errorf("SF 下接口 = %+v，期望仅 E2", nt.Folders[0].Endpoints)
	}

	// 原模块不再包含 F（其树已空）
	var m0Tree *ModuleTree
	for i := range tree {
		if tree[i].ID == m0.ID {
			m0Tree = &tree[i]
			break
		}
	}
	if m0Tree == nil {
		t.Fatalf("项目树缺少原模块")
	}
	if len(m0Tree.Folders) != 0 {
		t.Errorf("原模块仍有文件夹 = %+v，期望空", m0Tree.Folders)
	}

	// 根文件夹不可转换
	var m0Root models.Folder
	db.Where("module_id = ? AND parent_id IS NULL", m0.ID).First(&m0Root)
	if _, err := ms.ConvertFolderToModule(m0Root.ID, "X"); err == nil {
		t.Errorf("转换根文件夹应报错")
	}
}

// TestGetInheritedOperationCounts 验证继承操作计数只统计模块+文件夹链上启用的操作。
func TestGetInheritedOperationCounts(t *testing.T) {
	db := newTestDB(t)
	es := NewEndpointService(db)
	scope := NewScopeSettingsService(db)

	p := mustCreateProject(t, db, "P")
	m0 := defaultModule(t, db, p.ID)
	f, err := NewFolderService(db).CreateFolder(m0.ID, nil, "F")
	if err != nil {
		t.Fatalf("CreateFolder err=%v", err)
	}
	ep, err := es.CreateEndpoint(m0.ID, &f.ID, "E", "GET", "/e")
	if err != nil {
		t.Fatalf("CreateEndpoint err=%v", err)
	}

	// 模块：2 个前置（1 启用 1 禁用）、1 个后置启用
	if err := scope.SaveModuleSettings(m0.ID, ModuleSettings{
		AuthType: "none",
		Operations: []models.Operation{
			{Stage: "pre", Type: "script", Enabled: true, Data: `{"script":"1"}`},
			{Stage: "pre", Type: "script", Enabled: false, Data: `{"script":"2"}`},
			{Stage: "post", Type: "script", Enabled: true, Data: `{"script":"3"}`},
		},
	}); err != nil {
		t.Fatalf("SaveModuleSettings err=%v", err)
	}
	// 文件夹：1 个前置启用
	if err := scope.SaveFolderSettings(f.ID, FolderSettings{
		AuthType: "inherit",
		Operations: []models.Operation{
			{Stage: "pre", Type: "script", Enabled: true, Data: `{"script":"4"}`},
		},
	}); err != nil {
		t.Fatalf("SaveFolderSettings err=%v", err)
	}

	counts, err := es.GetInheritedOperationCounts(ep.ID)
	if err != nil {
		t.Fatalf("GetInheritedOperationCounts err=%v", err)
	}
	// 前置：模块启用 1 + 文件夹启用 1 = 2；后置：模块启用 1 = 1
	if counts.Pre != 2 {
		t.Errorf("Pre = %d，期望 2", counts.Pre)
	}
	if counts.Post != 1 {
		t.Errorf("Post = %d，期望 1", counts.Post)
	}
}
