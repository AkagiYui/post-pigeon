package services

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// corpusPath 指向真实的 Apifox 导出语料（gitignore 中，仅本地存在）。
const corpusPath = "../../tmp/杂项.apifox.json"

func loadCorpus(t *testing.T) string {
	t.Helper()
	b, err := os.ReadFile(corpusPath)
	if err != nil {
		t.Skipf("跳过：未找到 Apifox 语料 %s", corpusPath)
	}
	return string(b)
}

func TestApifoxPreview(t *testing.T) {
	corpus := loadCorpus(t)
	svc := NewApifoxService(newTestDB(t))
	p, err := svc.PreviewApifox(corpus)
	if err != nil {
		t.Fatalf("预览失败: %v", err)
	}
	if !p.IsApifox {
		t.Fatalf("应识别为 Apifox 文件")
	}
	if p.Endpoints < 80 {
		t.Errorf("接口数偏少: %d", p.Endpoints)
	}
	if p.Modules < 4 {
		t.Errorf("模块数应 >=4: %d", p.Modules)
	}
	if p.Documents < 1 {
		t.Errorf("文档数应 >=1: %d", p.Documents)
	}
	if p.Scripts < 1 {
		t.Errorf("脚本库数应 >=1: %d", p.Scripts)
	}
	t.Logf("预览: %+v", p)
}

func TestApifoxImport(t *testing.T) {
	corpus := loadCorpus(t)
	db := newTestDB(t)
	project := mustCreateProject(t, db, "apifox-import")
	svc := NewApifoxService(db)

	res, err := svc.ImportApifox(project.ID, corpus, nil, "")
	if err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	t.Logf("导入结果: %+v", res)

	// 接口名称应取 name 字段而非 path（如「获取音乐」）
	var namedEP int64
	db.Model(&models.Endpoint{}).Where("name = ?", "获取音乐").Count(&namedEP)
	if namedEP < 1 {
		t.Errorf("接口应以 name 命名（获取音乐），而非 path")
	}
	// 以 path 命名的接口应很少（大部分有真实名称）
	var pathNamed int64
	db.Model(&models.Endpoint{}).Where("type = ? AND name LIKE ?", "http", ":%").Count(&pathNamed)
	if pathNamed > 5 {
		t.Errorf("过多接口以 path 命名，name 解析可能有误: %d", pathNamed)
	}

	// 文件夹按名称去重：WebSocket 集合镜像的同名空目录不应造成重复（如「音乐」仅 1 个）
	var musicFolders int64
	db.Model(&models.Folder{}).Where("name = ?", "音乐").Count(&musicFolders)
	if musicFolders != 1 {
		t.Errorf("同名文件夹「音乐」应去重为 1 个，实际 %d", musicFolders)
	}

	// 端点总数：apiCollection(90) + requestCollection(3)
	var epCount int64
	db.Model(&models.Endpoint{}).Where("type = ?", "http").Count(&epCount)
	if epCount < 90 {
		t.Errorf("HTTP 端点数偏少: %d", epCount)
	}

	// 文档：至少 1 个 doc 类型端点，内容含「学校代码」
	var docs []models.Endpoint
	db.Where("type = ?", "doc").Find(&docs)
	if len(docs) < 1 {
		t.Fatalf("未导入文档")
	}
	foundDoc := false
	for _, d := range docs {
		if strings.Contains(d.DocContent, "学校代码") {
			foundDoc = true
		}
	}
	if !foundDoc {
		t.Errorf("文档内容缺失预期文本")
	}

	// 模块级 apikey 认证：时代企业邦（moduleId 7447252）根集合 auth 为 apikey
	var modApikey int64
	db.Model(&models.Module{}).Where("project_id = ? AND auth_type = ?", project.ID, "apikey").Count(&modApikey)
	if modApikey < 1 {
		t.Errorf("应有模块使用 apikey 认证")
	}
	// 模块级 bearer 认证：Gotify（moduleId 6540881）
	var modBearer int64
	db.Model(&models.Module{}).Where("project_id = ? AND auth_type = ?", project.ID, "bearer").Count(&modBearer)
	if modBearer < 1 {
		t.Errorf("应有模块使用 bearer 认证")
	}

	// 名称去重：默认模块只有一个（自动创建 + 导入复用）
	var defCount int64
	db.Model(&models.Module{}).Where("project_id = ? AND name = ?", project.ID, "默认模块").Count(&defCount)
	if defCount != 1 {
		t.Errorf("默认模块应因去重仅有 1 个，实际 %d", defCount)
	}

	// 路径参数：存在 type=path 的端点参数（如 {openid}）
	var pathParams int64
	db.Model(&models.EndpointParam{}).Where("type = ?", "path").Count(&pathParams)
	if pathParams < 1 {
		t.Errorf("应导入 path 类型参数")
	}
	// Cookie 参数
	var cookieParams int64
	db.Model(&models.EndpointParam{}).Where("type = ?", "cookie").Count(&cookieParams)
	if cookieParams < 1 {
		t.Errorf("应导入 cookie 类型参数")
	}

	// 参数 required / example 字段落库
	var reqParams int64
	db.Model(&models.EndpointParam{}).Where("required = ?", true).Count(&reqParams)
	if reqParams < 1 {
		t.Errorf("应有必填参数")
	}

	// 后置操作（customScript 转 script 操作）
	var postOps int64
	db.Model(&models.Operation{}).Where("stage = ? AND type = ?", "post", "script").Count(&postOps)
	if postOps < 1 {
		t.Errorf("应导入后置脚本操作")
	}

	// 脚本库
	var libCount int64
	db.Model(&models.ScriptLibrary{}).Where("project_id = ?", project.ID).Count(&libCount)
	if libCount < 1 {
		t.Errorf("应导入脚本库")
	}

	// 全局变量
	var gvCount int64
	db.Model(&models.GlobalVariable{}).Where("project_id = ?", project.ID).Count(&gvCount)
	if gvCount < 1 {
		t.Errorf("应导入全局变量")
	}

	// 响应示例
	var exCount int64
	db.Model(&models.ResponseExample{}).Count(&exCount)
	if exCount < 1 {
		t.Errorf("应导入响应示例")
	}

	// XML / form-data / json 请求体
	assertBodyType(t, db, "xml")
	assertBodyType(t, db, "form-data")
	assertBodyType(t, db, "json")

	// 环境按名称去重：测试环境/正式环境不重复
	var envCount int64
	db.Model(&models.Environment{}).Where("project_id = ? AND name = ?", project.ID, "测试环境").Count(&envCount)
	if envCount != 1 {
		t.Errorf("测试环境应去重为 1 个，实际 %d", envCount)
	}

	// 模块 baseUrl 已按环境写入
	var baseURLCount int64
	db.Model(&models.ModuleBaseURL{}).Count(&baseURLCount)
	if baseURLCount < 1 {
		t.Errorf("应导入模块 baseUrl")
	}
}

// TestApifoxFolderTree 验证导入后经 GetProjectTree 呈现的目录层级正确（不被 __root 平铺打乱）。
func TestApifoxFolderTree(t *testing.T) {
	corpus := loadCorpus(t)
	db := newTestDB(t)
	project := mustCreateProject(t, db, "apifox-tree")
	if _, err := NewApifoxService(db).ImportApifox(project.ID, corpus, nil, ""); err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	tree, err := NewProjectService(db).GetProjectTree(project.ID)
	if err != nil {
		t.Fatalf("获取树失败: %v", err)
	}
	// 定位默认模块
	var def *ModuleTree
	for i := range tree {
		if tree[i].Name == "默认模块" {
			def = &tree[i]
		}
	}
	if def == nil {
		t.Fatal("未找到默认模块")
	}

	// 顶级文件夹应包含这些（一级目录未被平铺到根）
	topNames := map[string]FolderTree{}
	for _, f := range def.Folders {
		topNames[f.Name] = f
	}
	for _, want := range []string{"音乐", "utools", "车来了", "泰兴公交", "星穹铁道", "有谱么", "亲邻开门", "音源"} {
		if _, ok := topNames[want]; !ok {
			t.Errorf("顶级目录应包含 %q，实际顶级: %v", want, keysOf(topNames))
		}
	}
	// __root 占位文件夹不应出现在树中
	if _, ok := topNames["__root"]; ok {
		t.Error("__root 占位文件夹不应出现在展示树中")
	}
	// 嵌套关系：车来了>地铁、音源>酷我、星穹铁道>游戏工具
	assertChild(t, topNames["车来了"], "地铁")
	assertChild(t, topNames["音源"], "酷我")
	assertChild(t, topNames["星穹铁道"], "游戏工具")

	// 根目录接口数量应远小于总数（不再把子目录接口平铺到根）
	if len(def.Endpoints) > 20 {
		t.Errorf("默认模块根目录接口过多(%d)，疑似目录被平铺", len(def.Endpoints))
	}
}

func assertChild(t *testing.T, parent FolderTree, childName string) {
	t.Helper()
	for _, c := range parent.Children {
		if c.Name == childName {
			return
		}
	}
	t.Errorf("目录 %q 下应包含子目录 %q，实际子目录: %v", parent.Name, childName, childNames(parent.Children))
}

func keysOf(m map[string]FolderTree) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}

func childNames(fs []FolderTree) []string {
	out := make([]string, 0, len(fs))
	for _, f := range fs {
		out = append(out, f.Name)
	}
	return out
}

// TestApifoxSelectiveImport 仅导入选中的少量接口，验证按 Index 过滤生效。
func TestApifoxSelectiveImport(t *testing.T) {
	corpus := loadCorpus(t)
	db := newTestDB(t)
	project := mustCreateProject(t, db, "apifox-select")
	svc := NewApifoxService(db)

	preview, err := svc.PreviewApifox(corpus)
	if err != nil {
		t.Fatalf("预览失败: %v", err)
	}
	if len(preview.Items) < 10 {
		t.Fatalf("预览项过少: %d", len(preview.Items))
	}
	// 仅选前 3 个 http 接口
	selected := []int{}
	for _, it := range preview.Items {
		if it.Kind == "http" {
			selected = append(selected, it.Index)
			if len(selected) == 3 {
				break
			}
		}
	}
	if _, err := svc.ImportApifox(project.ID, corpus, selected, ""); err != nil {
		t.Fatalf("选择性导入失败: %v", err)
	}
	// 仅应有 3 个接口端点被创建
	var epCount int64
	db.Model(&models.Endpoint{}).Where("type IN ?", []string{"http", "websocket", "doc"}).Count(&epCount)
	if epCount != 3 {
		t.Errorf("应仅导入 3 个选中项，实际 %d", epCount)
	}
}

func assertBodyType(t *testing.T, db *gorm.DB, bt string) {
	t.Helper()
	var n int64
	db.Model(&models.Endpoint{}).Where("body_type = ?", bt).Count(&n)
	if n < 1 {
		t.Errorf("应有 body_type=%s 的端点", bt)
	}
}

// apifoxProjectFixture 一份最小可导入的 Apifox 导出：项目名 + 一个模块 + 一个环境 + 一个接口。
const apifoxProjectFixture = `{
  "apifoxProject": "1.0.0",
  "$schema": { "app": "apifox", "type": "project", "version": "1.2.0" },
  "info": { "name": "来自 Apifox 的项目", "description": "描述" },
  "moduleSettings": [ { "id": "2001", "name": "支付", "moduleVariables": [] } ],
  "environments": [
    { "id": "3001", "name": "预发", "baseUrls": { "2001": "https://pre.example.com" }, "variables": [] }
  ],
  "apiCollection": [
    {
      "name": "根目录",
      "moduleId": 2001,
      "items": [ { "api": { "id": 1, "name": "支付下单", "method": "post", "path": "/pay" } } ]
    }
  ]
}`

// TestApifoxImportAsProject_DefaultName 不传名字时用导出文件的 $.info.name，
// 且新项目里不该出现 CreateProject 预置的「默认模块 / 测试环境 / 正式环境」空壳。
func TestApifoxImportAsProject_DefaultName(t *testing.T) {
	db := newTestDB(t)
	res, err := NewApifoxService(db).ImportApifoxAsProject("", apifoxProjectFixture, nil, "")
	if err != nil {
		t.Fatalf("导入为新项目失败: %v", err)
	}
	if res.Project == nil || res.Project.Name != "来自 Apifox 的项目" {
		t.Fatalf("项目名 = %+v，期望取 $.info.name", res.Project)
	}
	if res.Project.Description != "描述" {
		t.Errorf("项目描述 = %q，期望取 $.info.description", res.Project.Description)
	}
	if res.Stats == nil || res.Stats.Endpoints != 1 {
		t.Errorf("导入统计 = %+v，期望 1 个接口", res.Stats)
	}

	var modules []models.Module
	db.Where("project_id = ?", res.Project.ID).Find(&modules)
	if len(modules) != 1 || modules[0].Name != "支付" {
		t.Errorf("模块 = %+v，期望仅有导出文件里的「支付」", modules)
	}
	var envs []models.Environment
	db.Where("project_id = ?", res.Project.ID).Find(&envs)
	if len(envs) != 1 || envs[0].Name != "预发" {
		t.Errorf("环境 = %+v，期望仅有导出文件里的「预发」", envs)
	}
	// 模块前置 URL 也应跟着环境一起落地
	var baseURL models.ModuleBaseURL
	if err := db.Where("module_id = ? AND environment_id = ?", modules[0].ID, envs[0].ID).First(&baseURL).Error; err != nil {
		t.Fatalf("模块前置 URL 未导入: %v", err)
	}
	if baseURL.BaseURL != "https://pre.example.com" {
		t.Errorf("前置 URL = %q", baseURL.BaseURL)
	}
}

// TestApifoxImportAsProject_Rename 传了名字就用传的名字。
func TestApifoxImportAsProject_Rename(t *testing.T) {
	db := newTestDB(t)
	res, err := NewApifoxService(db).ImportApifoxAsProject("  我改的名字  ", apifoxProjectFixture, nil, "")
	if err != nil {
		t.Fatalf("导入为新项目失败: %v", err)
	}
	if res.Project.Name != "我改的名字" {
		t.Errorf("项目名 = %q，期望使用调用方给的名字（并去掉首尾空格）", res.Project.Name)
	}
}

// TestApifoxImportAsProject_NoNameFallback 名字与 $.info.name 都为空时兜底。
func TestApifoxImportAsProject_NoNameFallback(t *testing.T) {
	db := newTestDB(t)
	res, err := NewApifoxService(db).ImportApifoxAsProject("", `{"apifoxProject":"1.0.0","info":{"name":""}}`, nil, "")
	if err != nil {
		t.Fatalf("导入为新项目失败: %v", err)
	}
	if res.Project.Name != "未命名项目" {
		t.Errorf("项目名 = %q，期望兜底为「未命名项目」", res.Project.Name)
	}
}

// TestApifoxImportAsProject_RejectsNonApifox 非 Apifox 文件应直接报错，且不留下空项目。
func TestApifoxImportAsProject_RejectsNonApifox(t *testing.T) {
	db := newTestDB(t)
	if _, err := NewApifoxService(db).ImportApifoxAsProject("x", `{"info":{"name":"n"}}`, nil, ""); err == nil {
		t.Fatal("非 Apifox 文件应报错")
	}
	var n int64
	db.Model(&models.Project{}).Count(&n)
	if n != 0 {
		t.Errorf("导入失败后不应留下项目，实际 %d 个", n)
	}
}

// TestApifoxImportAsProject_Selective 只导入选中的叶子。
func TestApifoxImportAsProject_Selective(t *testing.T) {
	db := newTestDB(t)
	svc := NewApifoxService(db)
	preview, err := svc.PreviewApifox(apifoxProjectFixture)
	if err != nil {
		t.Fatalf("预览失败: %v", err)
	}
	if len(preview.Items) != 1 {
		t.Fatalf("预览项数 = %d，期望 1", len(preview.Items))
	}
	// 传一个不存在的下标 = 一个都不选
	res, err := svc.ImportApifoxAsProject("空导入", apifoxProjectFixture, []int{999}, "")
	if err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	if res.Stats.Endpoints != 0 {
		t.Errorf("未选中任何叶子时不应导入接口，实际 %d", res.Stats.Endpoints)
	}
	var n int64
	db.Model(&models.Project{}).Where("id = ?", res.Project.ID).Count(&n)
	if n != 1 {
		t.Error("项目本身仍应创建成功")
	}
}

// apifoxEmptyFolderFixture 一份带空文件夹的导出：
//   - 待补充           空目录
//   - 待补充/子级       空目录（嵌套在空目录下）
//   - 已有             含一个接口
//   - 已有/待填         空目录（嵌套在非空目录下）
//   - 独立空目录        整棵子树都没有接口
const apifoxEmptyFolderFixture = `{
  "apifoxProject": "1.0.0",
  "$schema": { "app": "apifox", "type": "project", "version": "1.2.0" },
  "info": { "name": "带空目录的项目" },
  "moduleSettings": [ { "id": "3001", "name": "订单" } ],
  "apiCollection": [
    {
      "name": "根目录",
      "moduleId": 3001,
      "items": [
        { "name": "待补充", "items": [ { "name": "子级", "items": [] } ] },
        { "name": "已有", "items": [
          { "api": { "id": 1, "name": "下单", "method": "post", "path": "/orders" } },
          { "name": "待填", "items": [] }
        ] },
        { "name": "独立空目录", "items": [] }
      ]
    }
  ]
}`

// folderPaths 返回某模块下所有文件夹的「父级路径/名称」，__root 折叠为空前缀。
func folderPaths(t *testing.T, db *gorm.DB, moduleID string) map[string]bool {
	t.Helper()
	var folders []models.Folder
	db.Where("module_id = ?", moduleID).Find(&folders)
	byID := map[string]models.Folder{}
	for _, f := range folders {
		byID[f.ID] = f
	}
	out := map[string]bool{}
	for _, f := range folders {
		if f.Name == "__root" {
			continue
		}
		path := f.Name
		for cur := f; cur.ParentID != nil; {
			parent, ok := byID[*cur.ParentID]
			if !ok || parent.Name == "__root" {
				break
			}
			path = parent.Name + "/" + path
			cur = parent
		}
		out[path] = true
	}
	return out
}

// TestApifoxImport_EmptyFolders 空文件夹（含嵌套）应一并导入，不该被静默丢掉。
func TestApifoxImport_EmptyFolders(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "empty-folders")

	if _, err := NewApifoxService(db).ImportApifox(p.ID, apifoxEmptyFolderFixture, nil, ""); err != nil {
		t.Fatalf("导入失败: %v", err)
	}

	var mod models.Module
	if err := db.Where("project_id = ? AND name = ?", p.ID, "订单").First(&mod).Error; err != nil {
		t.Fatalf("未找到模块: %v", err)
	}
	got := folderPaths(t, db, mod.ID)
	for _, want := range []string{"待补充", "待补充/子级", "已有", "已有/待填", "独立空目录"} {
		if !got[want] {
			t.Errorf("缺少文件夹 %q，实际有 %v", want, got)
		}
	}
	// 数量卡死重复创建：「待补充」既自身是空目录、又是「待补充/子级」的祖先，
	// 「已有」则是叶子循环先建好的，补建时都必须命中缓存而不是再建一个
	if len(got) != 5 {
		t.Errorf("文件夹数 = %d，期望 5，实际 %v", len(got), got)
	}
	var dup int64
	db.Model(&models.Folder{}).Where("module_id = ? AND name = ?", mod.ID, "已有").Count(&dup)
	if dup != 1 {
		t.Errorf("非空目录「已有」被建了 %d 次，补建空目录时应复用它", dup)
	}
}

// TestApifoxImport_EmptyFoldersSkippedOnPartialImport 勾选式导入时，
// 一个接口都没选中的模块不该因为空目录而凭空出现。
func TestApifoxImport_EmptyFoldersSkippedOnPartialImport(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "empty-folders-partial")

	// 传一个不存在的下标 = 一个叶子都没选中
	if _, err := NewApifoxService(db).ImportApifox(p.ID, apifoxEmptyFolderFixture, []int{999}, ""); err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	var n int64
	db.Model(&models.Module{}).Where("project_id = ? AND name = ?", p.ID, "订单").Count(&n)
	if n != 0 {
		t.Errorf("没选中任何接口时不该创建模块「订单」")
	}
}

// countAll 统计一个项目下各类数据的条数，用于比对「导入一次」与「导入两次」。
func countAll(t *testing.T, db *gorm.DB, projectID string) map[string]int64 {
	t.Helper()
	var modIDs, epIDs []string
	db.Model(&models.Module{}).Where("project_id = ?", projectID).Pluck("id", &modIDs)
	db.Model(&models.Endpoint{}).Where("module_id IN ?", modIDs).Pluck("id", &epIDs)

	out := map[string]int64{}
	count := func(key string, dest any, query string, args ...any) {
		var n int64
		db.Model(dest).Where(query, args...).Count(&n)
		out[key] = n
	}
	count("模块", &models.Module{}, "project_id = ?", projectID)
	count("环境", &models.Environment{}, "project_id = ?", projectID)
	count("全局变量", &models.GlobalVariable{}, "project_id = ?", projectID)
	count("脚本库", &models.ScriptLibrary{}, "project_id = ?", projectID)
	count("文件夹", &models.Folder{}, "module_id IN ?", modIDs)
	count("端点", &models.Endpoint{}, "module_id IN ?", modIDs)
	count("模块参数", &models.ModuleParam{}, "module_id IN ?", modIDs)
	count("模块变量", &models.ModuleVariable{}, "module_id IN ?", modIDs)
	count("模块前置URL", &models.ModuleBaseURL{}, "module_id IN ?", modIDs)
	if len(epIDs) > 0 {
		count("端点参数", &models.EndpointParam{}, "endpoint_id IN ?", epIDs)
		count("端点请求头", &models.EndpointHeader{}, "endpoint_id IN ?", epIDs)
		count("端点请求体字段", &models.EndpointBodyField{}, "endpoint_id IN ?", epIDs)
		count("端点认证", &models.EndpointAuth{}, "endpoint_id IN ?", epIDs)
		count("响应示例", &models.ResponseExample{}, "endpoint_id IN ?", epIDs)
		count("响应结构", &models.ResponseSchema{}, "endpoint_id IN ?", epIDs)
	}
	var envIDs []string
	db.Model(&models.Environment{}).Where("project_id = ?", projectID).Pluck("id", &envIDs)
	if len(envIDs) > 0 {
		count("环境变量", &models.EnvironmentVariable{}, "environment_id IN ?", envIDs)
	}
	var opN int64
	db.Model(&models.Operation{}).Count(&opN)
	out["操作"] = opN
	return out
}

// TestApifoxImport_Idempotent 同一份文件导入两次，结果必须与导入一次完全一致。
// 用真实语料跑，覆盖面比任何手写夹具都大。
func TestApifoxImport_Idempotent(t *testing.T) {
	corpus := loadCorpus(t)

	once := newTestDB(t)
	p1 := mustCreateProject(t, once, "import-once")
	if _, err := NewApifoxService(once).ImportApifox(p1.ID, corpus, nil, ""); err != nil {
		t.Fatalf("首次导入失败: %v", err)
	}
	want := countAll(t, once, p1.ID)

	twice := newTestDB(t)
	p2 := mustCreateProject(t, twice, "import-twice")
	svc := NewApifoxService(twice)
	for i := range 2 {
		if _, err := svc.ImportApifox(p2.ID, corpus, nil, ""); err != nil {
			t.Fatalf("第 %d 次导入失败: %v", i+1, err)
		}
	}
	got := countAll(t, twice, p2.ID)

	for key, w := range want {
		if got[key] != w {
			t.Errorf("%s：导入两次 = %d，导入一次 = %d（应当幂等）", key, got[key], w)
		}
	}
	t.Logf("一次导入的规模: %v", want)
}

// TestApifoxImport_MergeKeepsEndpointID 重新导入应原地更新已有接口，
// 而不是删了重建——端点 ID 保持不变，挂在它上面的请求历史才不会失联。
func TestApifoxImport_MergeKeepsEndpointID(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "merge-id")
	svc := NewApifoxService(db)

	if _, err := svc.ImportApifox(p.ID, apifoxEmptyFolderFixture, nil, ""); err != nil {
		t.Fatalf("首次导入失败: %v", err)
	}
	var before models.Endpoint
	if err := db.Where("path = ?", "/orders").First(&before).Error; err != nil {
		t.Fatalf("未找到导入的接口: %v", err)
	}
	// 挂一条请求历史，验证它在重新导入后仍连着同一个端点
	if err := db.Create(&models.RequestHistory{
		ModuleID: before.ModuleID, EndpointID: &before.ID, Method: "POST", URL: "http://x/orders",
	}).Error; err != nil {
		t.Fatalf("建历史失败: %v", err)
	}

	if _, err := svc.ImportApifox(p.ID, apifoxEmptyFolderFixture, nil, ""); err != nil {
		t.Fatalf("再次导入失败: %v", err)
	}
	var after []models.Endpoint
	db.Where("path = ?", "/orders").Find(&after)
	if len(after) != 1 {
		t.Fatalf("接口数 = %d，期望 1（应更新而非新建）", len(after))
	}
	if after[0].ID != before.ID {
		t.Errorf("端点 ID 变了：%s → %s，请求历史会失联", before.ID, after[0].ID)
	}
	var histories int64
	db.Model(&models.RequestHistory{}).Where("endpoint_id = ?", before.ID).Count(&histories)
	if histories != 1 {
		t.Errorf("请求历史 = %d 条，期望 1（不该因重新导入而丢）", histories)
	}
}

// TestApifoxImport_MergeRefreshesContent 重新导入要能把上游的改动同步下来，
// 且不会把同名参数叠成两份。
func TestApifoxImport_MergeRefreshesContent(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "merge-refresh")
	svc := NewApifoxService(db)

	const v1 = `{
      "apifoxProject": "1.0.0",
      "info": { "name": "P" },
      "moduleSettings": [ { "id": "1", "name": "M" } ],
      "apiCollection": [ { "name": "根目录", "moduleId": 1, "items": [
        { "api": { "id": 1, "name": "旧名字", "method": "get", "path": "/thing",
          "parameters": { "query": [ { "name": "a", "value": "1" } ] } } }
      ] } ]
    }`
	// 同一个 method+path，改了名字、换了参数值
	const v2 = `{
      "apifoxProject": "1.0.0",
      "info": { "name": "P" },
      "moduleSettings": [ { "id": "1", "name": "M" } ],
      "apiCollection": [ { "name": "根目录", "moduleId": 1, "items": [
        { "api": { "id": 1, "name": "新名字", "method": "get", "path": "/thing",
          "parameters": { "query": [ { "name": "a", "value": "2" } ] } } }
      ] } ]
    }`

	if _, err := svc.ImportApifox(p.ID, v1, nil, ""); err != nil {
		t.Fatalf("导入 v1 失败: %v", err)
	}
	if _, err := svc.ImportApifox(p.ID, v2, nil, ""); err != nil {
		t.Fatalf("导入 v2 失败: %v", err)
	}

	var eps []models.Endpoint
	db.Where("path = ?", "/thing").Find(&eps)
	if len(eps) != 1 {
		t.Fatalf("接口数 = %d，期望 1", len(eps))
	}
	if eps[0].Name != "新名字" {
		t.Errorf("接口名 = %q，期望被上游改动刷新为「新名字」", eps[0].Name)
	}
	var params []models.EndpointParam
	db.Where("endpoint_id = ?", eps[0].ID).Find(&params)
	if len(params) != 1 {
		t.Fatalf("参数数 = %d，期望 1（不该叠加）", len(params))
	}
	if params[0].Value != "2" {
		t.Errorf("参数值 = %q，期望刷新为 2", params[0].Value)
	}
}

// TestApifoxImport_SamePathDistinctEndpoints 同一目录下 method+path 相同、
// 仅名称不同的两个接口必须各自建一条，不能被合并成一条；且重复导入仍然幂等。
func TestApifoxImport_SamePathDistinctEndpoints(t *testing.T) {
	const fixture = `{
      "apifoxProject": "1.0.0",
      "info": { "name": "P" },
      "moduleSettings": [ { "id": "1", "name": "M" } ],
      "apiCollection": [ { "name": "根目录", "moduleId": 1, "items": [
        { "api": { "id": 1, "name": "登录-手机", "method": "post", "path": "/login" } },
        { "api": { "id": 2, "name": "登录-邮箱", "method": "post", "path": "/login" } }
      ] } ]
    }`
	db := newTestDB(t)
	p := mustCreateProject(t, db, "same-path")
	svc := NewApifoxService(db)

	if _, err := svc.ImportApifox(p.ID, fixture, nil, ""); err != nil {
		t.Fatalf("首次导入失败: %v", err)
	}
	var eps []models.Endpoint
	db.Where("path = ?", "/login").Order("sort_order ASC").Find(&eps)
	if len(eps) != 2 {
		t.Fatalf("接口数 = %d，期望 2（同 path 不同名的接口不该被合并）", len(eps))
	}
	names := []string{eps[0].Name, eps[1].Name}
	if names[0] != "登录-手机" || names[1] != "登录-邮箱" {
		t.Errorf("接口名 = %v，期望 [登录-手机 登录-邮箱]", names)
	}

	// 再导一次仍是 2 条，且各自对上原来那条
	if _, err := svc.ImportApifox(p.ID, fixture, nil, ""); err != nil {
		t.Fatalf("再次导入失败: %v", err)
	}
	var again []models.Endpoint
	db.Where("path = ?", "/login").Order("sort_order ASC").Find(&again)
	if len(again) != 2 {
		t.Fatalf("重复导入后接口数 = %d，期望仍是 2", len(again))
	}
	if again[0].ID != eps[0].ID || again[1].ID != eps[1].ID {
		t.Errorf("重复导入后端点 ID 变了：%v → %v",
			[]string{eps[0].ID, eps[1].ID}, []string{again[0].ID, again[1].ID})
	}
	if again[0].Name != "登录-手机" || again[1].Name != "登录-邮箱" {
		t.Errorf("重复导入后接口名错位 = %v", []string{again[0].Name, again[1].Name})
	}
}

// twinsFixture 两条 method+path 相同、只有名字与参数不同的接口。
// order 参数决定它们在文件里的先后，用来模拟上游调整顺序。
func twinsFixture(phoneFirst bool) string {
	phone := `{ "api": { "id": 10, "name": "登录-手机", "method": "post", "path": "/login",
		"parameters": { "query": [ { "name": "by", "value": "phone" } ] } } }`
	email := `{ "api": { "id": 11, "name": "登录-邮箱", "method": "post", "path": "/login",
		"parameters": { "query": [ { "name": "by", "value": "email" } ] } } }`
	first, second := phone, email
	if !phoneFirst {
		first, second = email, phone
	}
	return `{ "apifoxProject": "1.0.0", "info": { "name": "P" },
	  "moduleSettings": [ { "id": "1", "name": "M" } ],
	  "apiCollection": [ { "name": "根目录", "moduleId": 1, "items": [ ` + first + `, ` + second + ` ] } ] }`
}

// paramOf 返回某接口第一个参数的值，便于断言「哪套参数落到了哪条记录上」。
func paramOf(t *testing.T, db *gorm.DB, endpointID string) string {
	t.Helper()
	var ps []models.EndpointParam
	db.Where("endpoint_id = ?", endpointID).Find(&ps)
	if len(ps) == 0 {
		return ""
	}
	return ps[0].Value
}

// TestApifoxImport_MatchByMethodPath_SwapsOnReorder 记录「按方法+路径」这一档的已知局限：
// 两条接口在 method+path 上完全无法区分时，只能按位置配对，上游一调顺序内容就串位。
// 这正是另外两档存在的理由。
func TestApifoxImport_MatchByMethodPath_SwapsOnReorder(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "swap")
	svc := NewApifoxService(db)

	if _, err := svc.ImportApifox(p.ID, twinsFixture(true), nil, MatchByMethodPath); err != nil {
		t.Fatal(err)
	}
	var eps []models.Endpoint
	db.Where("path = ?", "/login").Order("sort_order ASC").Find(&eps)
	if len(eps) != 2 {
		t.Fatalf("接口数 = %d，期望 2", len(eps))
	}
	first := eps[0].ID
	if got := paramOf(t, db, first); got != "phone" {
		t.Fatalf("首次导入第一条的参数 = %q，期望 phone", got)
	}

	// 上游调换顺序后重新导入：数量仍对，但两条的参数互换了
	if _, err := svc.ImportApifox(p.ID, twinsFixture(false), nil, MatchByMethodPath); err != nil {
		t.Fatal(err)
	}
	if got := paramOf(t, db, first); got != "email" {
		t.Errorf("按方法+路径匹配时，调换顺序后第一条应拿到 email（已知局限），实际 %q", got)
	}
}

// TestApifoxImport_MatchBySourceID_SurvivesReorder 按来源 ID 匹配时，
// 上游怎么调顺序都不会串位——这是默认档。
func TestApifoxImport_MatchBySourceID_SurvivesReorder(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "byid")
	svc := NewApifoxService(db)

	if _, err := svc.ImportApifox(p.ID, twinsFixture(true), nil, MatchBySourceID); err != nil {
		t.Fatal(err)
	}
	var phone models.Endpoint
	if err := db.Where("name = ?", "登录-手机").First(&phone).Error; err != nil {
		t.Fatalf("未找到「登录-手机」: %v", err)
	}
	if phone.SourceID != "10" || phone.Source != EndpointSourceApifox {
		t.Errorf("来源标识未落库: source=%q sourceId=%q", phone.Source, phone.SourceID)
	}

	if _, err := svc.ImportApifox(p.ID, twinsFixture(false), nil, MatchBySourceID); err != nil {
		t.Fatal(err)
	}
	var eps []models.Endpoint
	db.Where("path = ?", "/login").Find(&eps)
	if len(eps) != 2 {
		t.Fatalf("接口数 = %d，期望 2", len(eps))
	}
	var after models.Endpoint
	db.Where("id = ?", phone.ID).First(&after)
	if after.Name != "登录-手机" {
		t.Errorf("同一条记录的名字变了：%q，按来源 ID 匹配不该串位", after.Name)
	}
	if got := paramOf(t, db, phone.ID); got != "phone" {
		t.Errorf("参数 = %q，期望仍是 phone", got)
	}
}

// TestApifoxImport_MatchByMethodPathName 名称参与匹配时，同路径不同名的两条各认各的。
func TestApifoxImport_MatchByMethodPathName(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "bypathname")
	svc := NewApifoxService(db)

	if _, err := svc.ImportApifox(p.ID, twinsFixture(true), nil, MatchByMethodPathName); err != nil {
		t.Fatal(err)
	}
	var phone models.Endpoint
	db.Where("name = ?", "登录-手机").First(&phone)

	if _, err := svc.ImportApifox(p.ID, twinsFixture(false), nil, MatchByMethodPathName); err != nil {
		t.Fatal(err)
	}
	var n int64
	db.Model(&models.Endpoint{}).Where("path = ?", "/login").Count(&n)
	if n != 2 {
		t.Fatalf("接口数 = %d，期望 2", n)
	}
	if got := paramOf(t, db, phone.ID); got != "phone" {
		t.Errorf("参数 = %q，期望仍是 phone（按名称配对不会串位）", got)
	}
}

// TestApifoxImport_SourceIDSurvivesRenameAndPathChange 来源 ID 不变时，
// 上游改名、改路径都应认得出是同一条，而不是再建一条。
func TestApifoxImport_SourceIDSurvivesRenameAndPathChange(t *testing.T) {
	mk := func(name, path string) string {
		return `{ "apifoxProject": "1.0.0", "info": { "name": "P" },
		  "moduleSettings": [ { "id": "1", "name": "M" } ],
		  "apiCollection": [ { "name": "根目录", "moduleId": 1, "items": [
		    { "api": { "id": 42, "name": "` + name + `", "method": "get", "path": "` + path + `" } }
		  ] } ] }`
	}
	db := newTestDB(t)
	p := mustCreateProject(t, db, "rename")
	svc := NewApifoxService(db)

	if _, err := svc.ImportApifox(p.ID, mk("旧名", "/old"), nil, MatchBySourceID); err != nil {
		t.Fatal(err)
	}
	var before models.Endpoint
	db.Where("source_id = ?", "42").First(&before)

	if _, err := svc.ImportApifox(p.ID, mk("新名", "/new"), nil, MatchBySourceID); err != nil {
		t.Fatal(err)
	}
	var eps []models.Endpoint
	db.Where("module_id = ?", before.ModuleID).Find(&eps)
	if len(eps) != 1 {
		t.Fatalf("接口数 = %d，期望 1（改名改路径仍是同一条）", len(eps))
	}
	if eps[0].ID != before.ID || eps[0].Name != "新名" || eps[0].Path != "/new" {
		t.Errorf("应原地更新为 新名 /new，实际 id=%v name=%q path=%q",
			eps[0].ID == before.ID, eps[0].Name, eps[0].Path)
	}
}

// TestApifoxImport_AdoptsRecordsWithoutSourceID 加来源 ID 之前导进来的老记录，
// 首次按来源 ID 重新导入时应被认领并补写标识，而不是重复建一条。
func TestApifoxImport_AdoptsRecordsWithoutSourceID(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "adopt")
	svc := NewApifoxService(db)

	if _, err := svc.ImportApifox(p.ID, apifoxEmptyFolderFixture, nil, MatchByMethodPath); err != nil {
		t.Fatal(err)
	}
	var before models.Endpoint
	db.Where("path = ?", "/orders").First(&before)
	// 抹掉来源标识，模拟「升级前导入的老数据」
	db.Model(&models.Endpoint{}).Where("id = ?", before.ID).
		Updates(map[string]any{"source": "", "source_id": ""})

	if _, err := svc.ImportApifox(p.ID, apifoxEmptyFolderFixture, nil, MatchBySourceID); err != nil {
		t.Fatal(err)
	}
	var eps []models.Endpoint
	db.Where("path = ?", "/orders").Find(&eps)
	if len(eps) != 1 {
		t.Fatalf("接口数 = %d，期望 1（老记录应被认领而非重建）", len(eps))
	}
	if eps[0].ID != before.ID {
		t.Errorf("端点 ID 变了，说明是重建而非认领")
	}
	if eps[0].SourceID == "" {
		t.Errorf("认领后应补写来源 ID，实际为空")
	}
}

func TestConvertFormFieldsPreservesApifoxMetadata(t *testing.T) {
	explode := false
	fields := convertFormFields([]apifoxParam{{
		Name: "tags", Type: "array", Required: true, Description: "标签",
		ContentType: "application/json", Style: "form", Explode: &explode,
		Schema: json.RawMessage(`{"type":"array","items":{"type":"string"}}`),
		Value:  jstr(`["a","b"]`),
	}})
	if len(fields) != 1 {
		t.Fatalf("字段数 = %d，期望 1", len(fields))
	}
	f := fields[0]
	if f.DataType != "array" || f.FieldType != "text" || !f.Required || f.Description != "标签" {
		t.Errorf("类型或文档元数据丢失: %+v", f)
	}
	if f.ContentType != "application/json" || f.Style != "form" || f.Explode == nil || *f.Explode {
		t.Errorf("序列化元数据丢失: %+v", f)
	}
	if !strings.Contains(f.Schema, `"type":"array"`) || f.SortOrder != 0 {
		t.Errorf("Schema 或顺序丢失: %+v", f)
	}
}
