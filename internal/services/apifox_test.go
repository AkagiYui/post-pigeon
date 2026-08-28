package services

import (
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

	res, err := svc.ImportApifox(project.ID, corpus, nil)
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
	if _, err := NewApifoxService(db).ImportApifox(project.ID, corpus, nil); err != nil {
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
	if _, err := svc.ImportApifox(project.ID, corpus, selected); err != nil {
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
	res, err := NewApifoxService(db).ImportApifoxAsProject("", apifoxProjectFixture, nil)
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
	res, err := NewApifoxService(db).ImportApifoxAsProject("  我改的名字  ", apifoxProjectFixture, nil)
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
	res, err := NewApifoxService(db).ImportApifoxAsProject("", `{"apifoxProject":"1.0.0","info":{"name":""}}`, nil)
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
	if _, err := NewApifoxService(db).ImportApifoxAsProject("x", `{"info":{"name":"n"}}`, nil); err == nil {
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
	res, err := svc.ImportApifoxAsProject("空导入", apifoxProjectFixture, []int{999})
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

	if _, err := NewApifoxService(db).ImportApifox(p.ID, apifoxEmptyFolderFixture, nil); err != nil {
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
	if _, err := NewApifoxService(db).ImportApifox(p.ID, apifoxEmptyFolderFixture, []int{999}); err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	var n int64
	db.Model(&models.Module{}).Where("project_id = ? AND name = ?", p.ID, "订单").Count(&n)
	if n != 0 {
		t.Errorf("没选中任何接口时不该创建模块「订单」")
	}
}
