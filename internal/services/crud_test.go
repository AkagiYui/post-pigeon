package services

import (
	"testing"
	"time"

	"post-pigeon/internal/models"
)

// ---------- 项目 ----------

func TestProjectLifecycle(t *testing.T) {
	db := newTestDB(t)
	ps := NewProjectService(db)

	p := mustCreateProject(t, db, "项目A")

	// 创建项目应自动建默认模块 + 根文件夹 + 两个环境
	var moduleCount int64
	db.Model(&models.Module{}).Where("project_id = ?", p.ID).Count(&moduleCount)
	if moduleCount != 1 {
		t.Errorf("默认模块数 = %d，期望 1", moduleCount)
	}
	mod := defaultModule(t, db, p.ID)
	if mod.Name != "默认模块" {
		t.Errorf("默认模块名 = %q", mod.Name)
	}
	var rootCount int64
	db.Model(&models.Folder{}).Where("module_id = ? AND parent_id IS NULL AND name = ?", mod.ID, "__root").Count(&rootCount)
	if rootCount != 1 {
		t.Errorf("根文件夹数 = %d，期望 1", rootCount)
	}
	envs, _ := NewEnvironmentService(db).ListEnvironments(p.ID)
	if len(envs) != 2 {
		t.Fatalf("默认环境数 = %d，期望 2", len(envs))
	}
	if envs[0].Name != "测试环境" || envs[1].Name != "正式环境" {
		t.Errorf("默认环境名 = %q,%q", envs[0].Name, envs[1].Name)
	}

	// List / Get
	list, err := ps.ListProjects()
	if err != nil || len(list) != 1 {
		t.Fatalf("ListProjects = %d, err=%v", len(list), err)
	}
	got, err := ps.GetProject(p.ID)
	if err != nil || got == nil || got.Name != "项目A" {
		t.Fatalf("GetProject = %+v, err=%v", got, err)
	}
	// 不存在的项目返回 nil,nil
	missing, err := ps.GetProject("does-not-exist")
	if err != nil || missing != nil {
		t.Errorf("GetProject(不存在) = %+v, err=%v，期望 nil,nil", missing, err)
	}

	// Update
	if err := ps.UpdateProject(p.ID, "项目A改", "新描述"); err != nil {
		t.Fatalf("UpdateProject err=%v", err)
	}
	got, _ = ps.GetProject(p.ID)
	if got.Name != "项目A改" || got.Description != "新描述" {
		t.Errorf("更新后 = %q/%q", got.Name, got.Description)
	}

	// Tree（空：根文件夹被展平，无文件夹无端点）
	tree, err := ps.GetProjectTree(p.ID)
	if err != nil || len(tree) != 1 {
		t.Fatalf("GetProjectTree = %d, err=%v", len(tree), err)
	}
	if len(tree[0].Folders) != 0 || len(tree[0].Endpoints) != 0 {
		t.Errorf("空项目树应无文件夹/端点，得到 folders=%d endpoints=%d", len(tree[0].Folders), len(tree[0].Endpoints))
	}

	// Delete + 级联
	if err := ps.DeleteProject(p.ID); err != nil {
		t.Fatalf("DeleteProject err=%v", err)
	}
	got, _ = ps.GetProject(p.ID)
	if got != nil {
		t.Error("删除后仍能获取到项目")
	}
	db.Model(&models.Module{}).Where("project_id = ?", p.ID).Count(&moduleCount)
	if moduleCount != 0 {
		t.Errorf("删除后模块残留 %d", moduleCount)
	}
	var envCount int64
	db.Model(&models.Environment{}).Where("project_id = ?", p.ID).Count(&envCount)
	if envCount != 0 {
		t.Errorf("删除后环境残留 %d", envCount)
	}
}

func TestProjectReorder(t *testing.T) {
	db := newTestDB(t)
	ps := NewProjectService(db)
	p1 := mustCreateProject(t, db, "P1")
	p2 := mustCreateProject(t, db, "P2")
	p3 := mustCreateProject(t, db, "P3")

	if err := ps.ReorderProjects([]string{p3.ID, p1.ID, p2.ID}); err != nil {
		t.Fatalf("ReorderProjects err=%v", err)
	}
	list, _ := ps.ListProjects()
	if len(list) != 3 {
		t.Fatalf("项目数 = %d", len(list))
	}
	want := []string{p3.ID, p1.ID, p2.ID}
	for i, id := range want {
		if list[i].ID != id {
			t.Errorf("排序[%d] = %s，期望 %s", i, list[i].ID, id)
		}
	}
}

// ---------- 模块 ----------

func TestModuleLifecycle(t *testing.T) {
	db := newTestDB(t)
	ms := NewModuleService(db)
	p := mustCreateProject(t, db, "P")

	m2, err := ms.CreateModule(p.ID, "模块2")
	if err != nil {
		t.Fatalf("CreateModule err=%v", err)
	}
	// 创建模块应自动建根文件夹
	var rootCount int64
	db.Model(&models.Folder{}).Where("module_id = ? AND parent_id IS NULL", m2.ID).Count(&rootCount)
	if rootCount != 1 {
		t.Errorf("模块2 根文件夹数 = %d，期望 1", rootCount)
	}

	mods, _ := ms.ListModules(p.ID)
	if len(mods) != 2 {
		t.Fatalf("模块数 = %d，期望 2", len(mods))
	}
	// sort_order：默认模块=0，模块2=1
	if mods[0].SortOrder > mods[1].SortOrder {
		t.Errorf("模块排序错误: %d, %d", mods[0].SortOrder, mods[1].SortOrder)
	}

	if err := ms.UpdateModule(m2.ID, "模块2改"); err != nil {
		t.Fatalf("UpdateModule err=%v", err)
	}
	got, _ := ms.GetModule(m2.ID)
	if got.Name != "模块2改" {
		t.Errorf("更新后模块名 = %q", got.Name)
	}

	// 前置 URL
	env := firstEnvironment(t, db, p.ID)
	if err := ms.SetModuleBaseURL(m2.ID, env.ID, "http://a.com"); err != nil {
		t.Fatalf("SetModuleBaseURL err=%v", err)
	}
	urls, _ := ms.GetModuleBaseURLs(m2.ID)
	if len(urls) != 1 || urls[0].BaseURL != "http://a.com" {
		t.Fatalf("前置URL = %+v", urls)
	}
	// 再次设置应更新而非新增
	if err := ms.SetModuleBaseURL(m2.ID, env.ID, "http://b.com"); err != nil {
		t.Fatalf("SetModuleBaseURL 更新 err=%v", err)
	}
	urls, _ = ms.GetModuleBaseURLs(m2.ID)
	if len(urls) != 1 || urls[0].BaseURL != "http://b.com" {
		t.Errorf("更新后前置URL = %+v，期望单条 http://b.com", urls)
	}

	// 删除
	if err := ms.DeleteModule(m2.ID); err != nil {
		t.Fatalf("DeleteModule err=%v", err)
	}
	if _, err := ms.GetModule(m2.ID); err == nil {
		t.Error("删除后仍能获取模块")
	}
	db.Model(&models.Folder{}).Where("module_id = ?", m2.ID).Count(&rootCount)
	if rootCount != 0 {
		t.Errorf("删除模块后文件夹残留 %d", rootCount)
	}
}

// ---------- 文件夹 ----------

func TestFolderLifecycleAndCascade(t *testing.T) {
	db := newTestDB(t)
	fs := NewFolderService(db)
	es := NewEndpointService(db)
	p := mustCreateProject(t, db, "P")
	m := defaultModule(t, db, p.ID)

	// 创建（不指定父 → 自动挂到根文件夹下）
	f1, err := fs.CreateFolder(m.ID, nil, "F1")
	if err != nil {
		t.Fatalf("CreateFolder err=%v", err)
	}
	if f1.ParentID == nil {
		t.Error("未指定父文件夹时应自动挂到根文件夹，ParentID 不应为 nil")
	}
	f1a, err := fs.CreateFolder(m.ID, &f1.ID, "F1a")
	if err != nil {
		t.Fatalf("CreateFolder 子文件夹 err=%v", err)
	}

	// 重命名
	if err := fs.UpdateFolder(f1.ID, "F1改"); err != nil {
		t.Fatalf("UpdateFolder err=%v", err)
	}
	var nameCheck models.Folder
	db.Where("id = ?", f1.ID).First(&nameCheck)
	if nameCheck.Name != "F1改" {
		t.Errorf("重命名后 = %q", nameCheck.Name)
	}

	// 移动：把 f1a 移到根（parent = 根文件夹）
	var root models.Folder
	db.Where("module_id = ? AND parent_id IS NULL", m.ID).First(&root)
	if err := fs.MoveFolder(f1a.ID, &root.ID); err != nil {
		t.Fatalf("MoveFolder err=%v", err)
	}
	db.Where("id = ?", f1a.ID).First(&nameCheck)
	if nameCheck.ParentID == nil || *nameCheck.ParentID != root.ID {
		t.Errorf("移动后父文件夹 = %v，期望根 %s", nameCheck.ParentID, root.ID)
	}

	// 级联删除：F1 > F1b > 端点；删除 F1 应清掉全部
	f1b, _ := fs.CreateFolder(m.ID, &f1.ID, "F1b")
	e1, _ := es.CreateEndpoint(m.ID, &f1.ID, "E-in-F1", "GET", "/a")
	e2, _ := es.CreateEndpoint(m.ID, &f1b.ID, "E-in-F1b", "GET", "/b")
	// 给端点加点关联数据，验证一并清理
	_ = es.SaveEndpointData(EndpointSaveData{
		ID: e1.ID, Name: "E-in-F1", Method: "GET", Path: "/a",
		Headers: []models.EndpointHeader{{Name: "H", Value: "v", Enabled: true}},
	})

	if err := fs.DeleteFolder(f1.ID); err != nil {
		t.Fatalf("DeleteFolder err=%v", err)
	}
	for _, id := range []string{f1.ID, f1b.ID} {
		var c int64
		db.Model(&models.Folder{}).Where("id = ?", id).Count(&c)
		if c != 0 {
			t.Errorf("文件夹 %s 删除后残留", id)
		}
	}
	for _, id := range []string{e1.ID, e2.ID} {
		var c int64
		db.Model(&models.Endpoint{}).Where("id = ?", id).Count(&c)
		if c != 0 {
			t.Errorf("端点 %s 应随文件夹级联删除", id)
		}
	}
	var hc int64
	db.Model(&models.EndpointHeader{}).Where("endpoint_id = ?", e1.ID).Count(&hc)
	if hc != 0 {
		t.Errorf("端点请求头应级联删除，残留 %d", hc)
	}
}

// ---------- 端点 ----------

func TestEndpointLifecycle(t *testing.T) {
	db := newTestDB(t)
	es := NewEndpointService(db)
	p := mustCreateProject(t, db, "P")
	m := defaultModule(t, db, p.ID)

	e1, err := es.CreateEndpoint(m.ID, nil, "E1", "GET", "/x")
	if err != nil {
		t.Fatalf("CreateEndpoint err=%v", err)
	}
	e2, _ := es.CreateEndpoint(m.ID, nil, "E2", "POST", "/y")
	if e1.SortOrder == e2.SortOrder {
		t.Errorf("两个端点 sortOrder 不应相同: %d", e1.SortOrder)
	}

	// 初始详情：无关联
	d, err := es.GetEndpoint(e1.ID)
	if err != nil {
		t.Fatalf("GetEndpoint err=%v", err)
	}
	if d.Auth != nil || d.Response != nil || len(d.Params) != 0 {
		t.Errorf("新端点不应有关联数据: auth=%v resp=%v params=%d", d.Auth, d.Response, len(d.Params))
	}

	// 保存完整数据
	err = es.SaveEndpointData(EndpointSaveData{
		ID: e1.ID, Name: "E1改", Method: "POST", Path: "/z",
		BodyType: "json", BodyContent: `{"a":1}`, ContentType: "application/json",
		Timeout: 5000, FollowRedirects: false,
		Params:     []models.EndpointParam{{Type: "query", Name: "q", Value: "1", Enabled: true}},
		Headers:    []models.EndpointHeader{{Name: "X-Test", Value: "hi", Enabled: true}},
		BodyFields: []models.EndpointBodyField{{Name: "f", Value: "fv", FieldType: "text", Enabled: true}},
		Auth:       &models.EndpointAuth{Type: "bearer", Data: models.ToJSON(models.BearerAuthData{Token: "tok"})},
	})
	if err != nil {
		t.Fatalf("SaveEndpointData err=%v", err)
	}

	// 重新读取，验证关联数据全部写入（含 Auth 这一指针字段 —— 验证 GetEndpoint 的指针扫描）
	d, err = es.GetEndpoint(e1.ID)
	if err != nil {
		t.Fatalf("GetEndpoint(更新后) err=%v", err)
	}
	if d.Name != "E1改" || d.Method != "POST" || d.Path != "/z" || d.BodyType != "json" {
		t.Errorf("基础字段未更新: %+v", d.Endpoint)
	}
	if d.FollowRedirects != false || d.Timeout != 5000 {
		t.Errorf("FollowRedirects/Timeout 未正确保存: %v/%d", d.FollowRedirects, d.Timeout)
	}
	if len(d.Params) != 1 || d.Params[0].Name != "q" {
		t.Errorf("Params 未保存: %+v", d.Params)
	}
	if len(d.Headers) != 1 || d.Headers[0].Name != "X-Test" {
		t.Errorf("Headers 未保存: %+v", d.Headers)
	}
	if len(d.BodyFields) != 1 || d.BodyFields[0].Name != "f" {
		t.Errorf("BodyFields 未保存: %+v", d.BodyFields)
	}
	if d.Auth == nil {
		t.Fatalf("Auth 为 nil —— GetEndpoint 未能加载认证信息（指针字段扫描问题）")
	}
	if d.Auth.Type != "bearer" {
		t.Errorf("Auth.Type = %q，期望 bearer", d.Auth.Type)
	}

	// 保存响应（upsert：先建后更）
	resp := &models.Response{StatusCode: 201, Body: "created", ContentType: "text/plain"}
	if err := es.SaveResponse(e1.ID, resp); err != nil {
		t.Fatalf("SaveResponse(建) err=%v", err)
	}
	resp2 := &models.Response{StatusCode: 200, Body: "ok", ContentType: "text/plain"}
	if err := es.SaveResponse(e1.ID, resp2); err != nil {
		t.Fatalf("SaveResponse(更) err=%v", err)
	}
	var respCount int64
	db.Model(&models.Response{}).Where("endpoint_id = ?", e1.ID).Count(&respCount)
	if respCount != 1 {
		t.Errorf("响应应为 upsert，仅 1 条，实际 %d", respCount)
	}
	d, _ = es.GetEndpoint(e1.ID)
	if d.Response == nil || d.Response.StatusCode != 200 || d.Response.Body != "ok" {
		t.Errorf("响应未正确更新: %+v", d.Response)
	}

	// 搜索
	found, _ := es.SearchEndpoints(m.ID, "E")
	if len(found) != 2 {
		t.Errorf("搜索 'E' = %d，期望 2", len(found))
	}
	found, _ = es.SearchEndpoints(m.ID, "E1")
	if len(found) != 1 {
		t.Errorf("搜索 'E1' = %d，期望 1", len(found))
	}

	// CreateFullEndpoint（一次性带关联）
	full, err := es.CreateFullEndpoint(m.ID, nil, EndpointSaveData{
		Name: "Full", Method: "PUT", Path: "/full", BodyType: "none",
		Params:  []models.EndpointParam{{Type: "query", Name: "p", Value: "v", Enabled: true}},
		Headers: []models.EndpointHeader{{Name: "H", Value: "1", Enabled: true}},
		Auth:    &models.EndpointAuth{Type: "basic", Data: models.ToJSON(models.BasicAuthData{Username: "u", Password: "p"})},
	})
	if err != nil {
		t.Fatalf("CreateFullEndpoint err=%v", err)
	}
	fd, _ := es.GetEndpoint(full.ID)
	if len(fd.Params) != 1 || len(fd.Headers) != 1 || fd.Auth == nil || fd.Auth.Type != "basic" {
		t.Errorf("CreateFullEndpoint 关联数据不完整: params=%d headers=%d auth=%v", len(fd.Params), len(fd.Headers), fd.Auth)
	}

	// 删除 + 级联
	if err := es.DeleteEndpoint(e1.ID); err != nil {
		t.Fatalf("DeleteEndpoint err=%v", err)
	}
	for _, tbl := range []struct {
		name string
		c    func() int64
	}{
		{"endpoint", func() int64 { var c int64; db.Model(&models.Endpoint{}).Where("id = ?", e1.ID).Count(&c); return c }},
		{"param", func() int64 {
			var c int64
			db.Model(&models.EndpointParam{}).Where("endpoint_id = ?", e1.ID).Count(&c)
			return c
		}},
		{"header", func() int64 {
			var c int64
			db.Model(&models.EndpointHeader{}).Where("endpoint_id = ?", e1.ID).Count(&c)
			return c
		}},
		{"auth", func() int64 {
			var c int64
			db.Model(&models.EndpointAuth{}).Where("endpoint_id = ?", e1.ID).Count(&c)
			return c
		}},
		{"response", func() int64 {
			var c int64
			db.Model(&models.Response{}).Where("endpoint_id = ?", e1.ID).Count(&c)
			return c
		}},
	} {
		if tbl.c() != 0 {
			t.Errorf("删除端点后 %s 残留", tbl.name)
		}
	}
}

// TestEndpointSaveDisabledAndAuthClear 验证：禁用标志经完整保存路径后保留；认证切回 none 时被清除
func TestEndpointSaveDisabledAndAuthClear(t *testing.T) {
	db := newTestDB(t)
	es := NewEndpointService(db)
	p := mustCreateProject(t, db, "P")
	m := defaultModule(t, db, p.ID)
	e, _ := es.CreateEndpoint(m.ID, nil, "E", "GET", "/")

	// 保存：一个禁用参数 + 一个启用参数 + bearer 认证
	err := es.SaveEndpointData(EndpointSaveData{
		ID: e.ID, Name: "E", Method: "GET", Path: "/",
		Params: []models.EndpointParam{
			{Type: "query", Name: "on", Value: "1", Enabled: true},
			{Type: "query", Name: "off", Value: "0", Enabled: false},
		},
		Auth: &models.EndpointAuth{Type: "bearer", Data: models.ToJSON(models.BearerAuthData{Token: "t"})},
	})
	if err != nil {
		t.Fatalf("SaveEndpointData err=%v", err)
	}

	d, _ := es.GetEndpoint(e.ID)
	if len(d.Params) != 2 {
		t.Fatalf("参数数 = %d，期望 2", len(d.Params))
	}
	byName := map[string]bool{}
	for _, p := range d.Params {
		byName[p.Name] = p.Enabled
	}
	if byName["on"] != true || byName["off"] != false {
		t.Errorf("禁用标志未正确保存: on=%v off=%v", byName["on"], byName["off"])
	}
	if d.Auth == nil || d.Auth.Type != "bearer" {
		t.Fatalf("认证应为 bearer，实际 %+v", d.Auth)
	}

	// 再次保存：认证切回 none（nil）+ 清空参数
	if err := es.SaveEndpointData(EndpointSaveData{
		ID: e.ID, Name: "E", Method: "GET", Path: "/",
		Params: []models.EndpointParam{}, Auth: nil,
	}); err != nil {
		t.Fatalf("SaveEndpointData(清除) err=%v", err)
	}
	d, _ = es.GetEndpoint(e.ID)
	if d.Auth != nil {
		t.Errorf("切回 none 后认证应被清除，实际 %+v", d.Auth)
	}
	if len(d.Params) != 0 {
		t.Errorf("清空后参数应为 0，实际 %d", len(d.Params))
	}
}

// ---------- 环境与变量 ----------

func TestEnvironmentLifecycle(t *testing.T) {
	db := newTestDB(t)
	es := NewEnvironmentService(db)
	p := mustCreateProject(t, db, "P")

	dev, err := es.CreateEnvironment(p.ID, "Dev")
	if err != nil {
		t.Fatalf("CreateEnvironment err=%v", err)
	}

	vars := []models.EnvironmentVariable{
		{Key: "host", Value: "api.com", Enabled: true},
		{Key: "token", Value: "secret", Enabled: true, IsSecret: true},
		{Key: "off", Value: "nope", Enabled: false},
	}
	if err := es.SaveEnvironmentVariables(dev.ID, vars); err != nil {
		t.Fatalf("SaveEnvironmentVariables err=%v", err)
	}

	// 详情应按 sortOrder 返回变量
	env, err := es.GetEnvironment(dev.ID)
	if err != nil {
		t.Fatalf("GetEnvironment err=%v", err)
	}
	if len(env.Variables) != 3 {
		t.Fatalf("变量数 = %d，期望 3", len(env.Variables))
	}
	if env.Variables[0].Key != "host" || env.Variables[1].Key != "token" || env.Variables[2].Key != "off" {
		t.Errorf("变量顺序错误: %s,%s,%s", env.Variables[0].Key, env.Variables[1].Key, env.Variables[2].Key)
	}

	// 变量解析：启用的被替换，禁用的保留占位符
	out, err := es.ResolveVariables(dev.ID, "http://{{host}}/u?t={{token}}&x={{off}}")
	if err != nil {
		t.Fatalf("ResolveVariables err=%v", err)
	}
	if out != "http://api.com/u?t=secret&x={{off}}" {
		t.Errorf("变量解析结果 = %q", out)
	}

	// 重命名
	if err := es.UpdateEnvironment(dev.ID, "Dev改"); err != nil {
		t.Fatalf("UpdateEnvironment err=%v", err)
	}
	env, _ = es.GetEnvironment(dev.ID)
	if env.Name != "Dev改" {
		t.Errorf("重命名后 = %q", env.Name)
	}

	// 删除 + 级联变量
	if err := es.DeleteEnvironment(dev.ID); err != nil {
		t.Fatalf("DeleteEnvironment err=%v", err)
	}
	var vc int64
	db.Model(&models.EnvironmentVariable{}).Where("environment_id = ?", dev.ID).Count(&vc)
	if vc != 0 {
		t.Errorf("删除环境后变量残留 %d", vc)
	}
}

// ---------- 设置 ----------

func TestSettings(t *testing.T) {
	db := newTestDB(t)
	ss := NewSettingsService(db)

	if got := ss.GetSetting(models.SettingsKeyThemeMode); got != "system" {
		t.Errorf("默认主题 = %q，期望 system", got)
	}
	if got := ss.GetSetting("unknown.key"); got != "" {
		t.Errorf("未知键默认 = %q，期望空", got)
	}
	if err := ss.SetThemeMode("dark"); err != nil {
		t.Fatalf("SetThemeMode err=%v", err)
	}
	if got := ss.GetThemeMode(); got != "dark" {
		t.Errorf("SetThemeMode 后 = %q", got)
	}
	// 再次 set 走 update 分支
	if err := ss.SetThemeMode("light"); err != nil {
		t.Fatalf("SetThemeMode 更新 err=%v", err)
	}
	if got := ss.GetThemeMode(); got != "light" {
		t.Errorf("更新后主题 = %q", got)
	}

	_ = ss.SetThemeAccent("blue")
	if ss.GetThemeAccent() != "blue" {
		t.Error("主题色未保存")
	}
	// 语言：空默认返回 system
	if got := ss.GetLanguage(); got != "system" {
		t.Errorf("默认语言 = %q，期望 system", got)
	}
	_ = ss.SetLanguage("en")
	if ss.GetLanguage() != "en" {
		t.Error("语言未保存")
	}
	if got := ss.GetUIScale(); got != "1.0" {
		t.Errorf("默认缩放 = %q，期望 1.0", got)
	}

	all, err := ss.GetAllSettings()
	if err != nil {
		t.Fatalf("GetAllSettings err=%v", err)
	}
	if all[models.SettingsKeyThemeMode] != "light" || all[models.SettingsKeyThemeAccent] != "blue" {
		t.Errorf("GetAllSettings 覆盖值错误: %v", all)
	}
	// 未设置的键应有默认值
	if _, ok := all[models.SettingsKeyUIScale]; !ok {
		t.Error("GetAllSettings 缺少默认 UIScale")
	}
}

// ---------- 请求历史 ----------

func TestRequestHistory(t *testing.T) {
	db := newTestDB(t)
	hs := NewRequestHistoryService(db)
	p := mustCreateProject(t, db, "P")
	m := defaultModule(t, db, p.ID)

	timingJSON := models.ToJSON(models.TimingInfo{Total: 42})
	var firstID string
	for i := 0; i < 3; i++ {
		h := &models.RequestHistory{
			ModuleID: m.ID, Method: "GET", URL: "http://x/",
			StatusCode: 200, Timing: timingJSON, Size: 10,
		}
		if err := db.Create(h).Error; err != nil {
			t.Fatalf("创建历史 err=%v", err)
		}
		if i == 0 {
			firstID = h.ID
		}
	}

	byMod, err := hs.ListHistoryByModule(m.ID, 0, 0)
	if err != nil || len(byMod) != 3 {
		t.Fatalf("ListHistoryByModule = %d, err=%v", len(byMod), err)
	}
	byProj, err := hs.ListHistoryByProject(p.ID, 0, 0)
	if err != nil || len(byProj) != 3 {
		t.Fatalf("ListHistoryByProject = %d, err=%v", len(byProj), err)
	}

	// 详情：解析计时
	detail, err := hs.GetHistoryDetail(firstID)
	if err != nil {
		t.Fatalf("GetHistoryDetail err=%v", err)
	}
	if detail.TimingInfo == nil || detail.TimingInfo.Total != 42 {
		t.Errorf("计时解析失败: %+v", detail.TimingInfo)
	}

	// 删除单条
	if err := hs.DeleteHistory(firstID); err != nil {
		t.Fatalf("DeleteHistory err=%v", err)
	}
	byMod, _ = hs.ListHistoryByModule(m.ID, 0, 0)
	if len(byMod) != 2 {
		t.Errorf("删除后历史 = %d，期望 2", len(byMod))
	}

	// 清理过期：把一条标记为 10 天前，prune 1 天
	old := time.Now().AddDate(0, 0, -10)
	db.Model(&models.RequestHistory{}).Where("id = ?", byMod[0].ID).UpdateColumn("created_at", old)
	if err := hs.PruneOldHistory(m.ID, 1); err != nil {
		t.Fatalf("PruneOldHistory err=%v", err)
	}
	byMod, _ = hs.ListHistoryByModule(m.ID, 0, 0)
	if len(byMod) != 1 {
		t.Errorf("清理过期后历史 = %d，期望 1", len(byMod))
	}

	// 清空模块
	if err := hs.ClearModuleHistory(m.ID); err != nil {
		t.Fatalf("ClearModuleHistory err=%v", err)
	}
	byMod, _ = hs.ListHistoryByModule(m.ID, 0, 0)
	if len(byMod) != 0 {
		t.Errorf("清空后历史 = %d，期望 0", len(byMod))
	}
}
