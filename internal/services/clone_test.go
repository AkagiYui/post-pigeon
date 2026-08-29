package services

import (
	"encoding/json"
	"slices"
	"testing"

	"gorm.io/gorm"

	"PostPigeon/internal/models"
)

// countForProject 统计某个模型在指定项目下的行数。
// 各表挂到项目的路径不同，统一在这里用子查询表达，免得每个断言都写一遍 JOIN。
func countForProject(t *testing.T, db *gorm.DB, model any, projectID string) int64 {
	t.Helper()
	modules := db.Model(&models.Module{}).Select("id").Where("project_id = ?", projectID)
	folders := db.Model(&models.Folder{}).Select("id").Where("module_id IN (?)", modules)
	endpoints := db.Model(&models.Endpoint{}).Select("id").Where("module_id IN (?)", modules)
	envs := db.Model(&models.Environment{}).Select("id").Where("project_id = ?", projectID)

	q := db.Model(model)
	switch model.(type) {
	case *models.Module:
		q = q.Where("project_id = ?", projectID)
	case *models.Environment, *models.GlobalVariable, *models.ScriptLibrary, *models.StoredCookie:
		q = q.Where("project_id = ?", projectID)
	case *models.EnvironmentVariable:
		q = q.Where("environment_id IN (?)", envs)
	case *models.ModuleBaseURL, *models.ModuleParam, *models.ModuleVariable, *models.RequestHistory:
		q = q.Where("module_id IN (?)", modules)
	case *models.Folder:
		q = q.Where("module_id IN (?)", modules)
	case *models.Endpoint:
		q = q.Where("module_id IN (?)", modules)
	case *models.EndpointParam, *models.EndpointBodyField, *models.EndpointHeader, *models.EndpointAuth,
		*models.Response, *models.ResponseExample, *models.ResponseSchema:
		q = q.Where("endpoint_id IN (?)", endpoints)
	case *models.Operation:
		q = q.Where("(owner_type = 'module' AND owner_id IN (?)) OR (owner_type = 'folder' AND owner_id IN (?)) OR (owner_type = 'endpoint' AND owner_id IN (?))",
			modules, folders, endpoints)
	default:
		t.Fatalf("countForProject 不认识的模型 %T", model)
	}

	var c int64
	if err := q.Count(&c).Error; err != nil {
		t.Fatalf("统计 %T 失败: %v", model, err)
	}
	return c
}

// TestCloneProjectCopiesEverything 克隆出的项目应与源项目逐表等量——
// 配置数据与运行状态（Cookie、上次响应、请求历史）都在内。
func TestCloneProjectCopiesEverything(t *testing.T) {
	db := newTestDB(t)
	rp := buildRichProject(t, db)
	ps := NewProjectService(db)
	// 五级 WS 协议转换设置也属于项目配置，克隆后各层应原样保留。
	db.Model(&models.Project{}).Where("id = ?", rp.projectID).Update("ws_protocol_conversion", "off")
	db.Model(&models.Module{}).Where("id = ?", rp.moduleID).Update("ws_protocol_conversion", "on")
	db.Model(&models.Folder{}).Where("id = ?", rp.folderID).Update("ws_protocol_conversion", "off")
	db.Model(&models.Endpoint{}).Where("id = ?", rp.epFolder).Update("ws_protocol_conversion", "on")

	// 登录态：会话 cookie 也该跟着克隆走
	if err := db.Create(&models.StoredCookie{
		ProjectID: rp.projectID, Domain: "a.com", Path: "/", Name: "session", Value: "abc",
	}).Error; err != nil {
		t.Fatalf("建 cookie 失败: %v", err)
	}

	clone, err := ps.CloneProject(rp.projectID, "克隆出来的项目")
	if err != nil {
		t.Fatalf("CloneProject err=%v", err)
	}
	if clone == nil || clone.ID == "" || clone.ID == rp.projectID {
		t.Fatalf("克隆应返回一个新项目，得到 %+v", clone)
	}
	if clone.Name != "克隆出来的项目" {
		t.Errorf("克隆项目名 = %q，期望「克隆出来的项目」", clone.Name)
	}
	if clone.WSProtocolConversion != "off" {
		t.Errorf("项目级 WS 协议设置 = %q，期望 off", clone.WSProtocolConversion)
	}
	var clonedModule models.Module
	db.Where("project_id = ?", clone.ID).Order("sort_order ASC").First(&clonedModule)
	if clonedModule.WSProtocolConversion != "on" {
		t.Errorf("模块级 WS 协议设置 = %q，期望 on", clonedModule.WSProtocolConversion)
	}
	var clonedFolder models.Folder
	db.Where("module_id = ? AND name = ?", clonedModule.ID, "F").First(&clonedFolder)
	if clonedFolder.WSProtocolConversion != "off" {
		t.Errorf("文件夹级 WS 协议设置 = %q，期望 off", clonedFolder.WSProtocolConversion)
	}
	var clonedEndpoint models.Endpoint
	db.Where("folder_id = ? AND name = ?", clonedFolder.ID, "E-f").First(&clonedEndpoint)
	if clonedEndpoint.WSProtocolConversion != "on" {
		t.Errorf("接口级 WS 协议设置 = %q，期望 on", clonedEndpoint.WSProtocolConversion)
	}

	// 挂在项目下的每一张表都要逐表等量
	for _, model := range []any{
		&models.Module{}, &models.ModuleBaseURL{}, &models.ModuleParam{}, &models.ModuleVariable{},
		&models.Folder{}, &models.Endpoint{}, &models.EndpointParam{}, &models.EndpointBodyField{},
		&models.EndpointHeader{}, &models.EndpointAuth{}, &models.ResponseExample{}, &models.ResponseSchema{},
		&models.Operation{}, &models.Environment{}, &models.EnvironmentVariable{},
		&models.GlobalVariable{}, &models.ScriptLibrary{},
		&models.StoredCookie{}, &models.Response{}, &models.RequestHistory{},
	} {
		src := countForProject(t, db, model, rp.projectID)
		dst := countForProject(t, db, model, clone.ID)
		if src == 0 {
			t.Fatalf("测试数据不足：源项目的 %T 为空", model)
		}
		if src != dst {
			t.Errorf("%T 克隆后数量 = %d，期望与源项目一致的 %d", model, dst, src)
		}
	}

	// 请求历史挂着的接口要换成克隆出的那条，不能还指着源项目
	var cloneEndpointIDs []string
	db.Model(&models.Endpoint{}).
		Where("module_id IN (?)", db.Model(&models.Module{}).Select("id").Where("project_id = ?", clone.ID)).
		Pluck("id", &cloneEndpointIDs)
	var cloneHistories []models.RequestHistory
	db.Where("module_id IN (?)", db.Model(&models.Module{}).Select("id").Where("project_id = ?", clone.ID)).
		Find(&cloneHistories)
	linked := 0
	for _, h := range cloneHistories {
		if h.EndpointID == nil {
			continue
		}
		linked++
		if !slices.Contains(cloneEndpointIDs, *h.EndpointID) {
			t.Errorf("请求历史指向的接口 %s 不属于克隆项目", *h.EndpointID)
		}
	}
	if linked == 0 {
		t.Fatal("测试数据不足：源项目没有挂到接口上的请求历史")
	}

	// 前置 URL 的环境要指向克隆出的新环境，而不是源项目的
	var srcEnvIDs, cloneEnvIDs []string
	db.Model(&models.Environment{}).Where("project_id = ?", rp.projectID).Pluck("id", &srcEnvIDs)
	db.Model(&models.Environment{}).Where("project_id = ?", clone.ID).Pluck("id", &cloneEnvIDs)
	var cloneModuleIDs []string
	db.Model(&models.Module{}).Where("project_id = ?", clone.ID).Pluck("id", &cloneModuleIDs)
	var baseURLs []models.ModuleBaseURL
	db.Where("module_id IN ?", cloneModuleIDs).Find(&baseURLs)
	if len(baseURLs) == 0 {
		t.Fatal("克隆项目没有前置 URL")
	}
	for _, bu := range baseURLs {
		if !slices.Contains(cloneEnvIDs, bu.EnvironmentID) {
			t.Errorf("前置 URL 的环境 %s 不在克隆项目的环境里（源项目环境：%v）", bu.EnvironmentID, srcEnvIDs)
		}
	}

	// 源项目原样不动
	var srcProject models.Project
	if err := db.Where("id = ?", rp.projectID).First(&srcProject).Error; err != nil {
		t.Fatalf("源项目应仍在: %v", err)
	}

	// 删掉克隆件后源项目仍完整
	if err := ps.DeleteProject(clone.ID); err != nil {
		t.Fatalf("DeleteProject err=%v", err)
	}
	if n := countForProject(t, db, &models.Endpoint{}, rp.projectID); n == 0 {
		t.Error("删除克隆件后源项目的接口不应消失")
	}
}

// TestCloneProjectRemapsLibraryScript 引用脚本库的操作应指向克隆出的新脚本，而不是源项目的。
func TestCloneProjectRemapsLibraryScript(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "带脚本库的项目")
	m := defaultModule(t, db, p.ID)

	script, err := NewScriptLibraryService(db).CreateScript(p.ID, "共用脚本", "console.log(1)", "")
	if err != nil {
		t.Fatalf("建脚本库失败: %v", err)
	}
	op := &models.Operation{
		OwnerType: string(models.OperationOwnerModule), OwnerID: m.ID,
		Stage: string(models.OperationStagePre), Type: string(models.OpTypeLibraryScript),
		Name: "引用脚本", Enabled: true,
		Data: models.ToJSON(models.ScriptOperationData{LibraryID: script.ID}),
	}
	if err := db.Create(op).Error; err != nil {
		t.Fatalf("建操作失败: %v", err)
	}

	clone, err := NewProjectService(db).CloneProject(p.ID, "克隆件")
	if err != nil {
		t.Fatalf("CloneProject err=%v", err)
	}

	var cloneScript models.ScriptLibrary
	if err := db.Where("project_id = ?", clone.ID).First(&cloneScript).Error; err != nil {
		t.Fatalf("克隆项目应有脚本库: %v", err)
	}
	var cloneModuleIDs []string
	db.Model(&models.Module{}).Where("project_id = ?", clone.ID).Pluck("id", &cloneModuleIDs)
	var cloneOp models.Operation
	if err := db.Where("owner_type = 'module' AND owner_id IN ?", cloneModuleIDs).First(&cloneOp).Error; err != nil {
		t.Fatalf("克隆项目应有模块操作: %v", err)
	}

	var data map[string]any
	if err := json.Unmarshal([]byte(cloneOp.Data), &data); err != nil {
		t.Fatalf("解析操作数据失败: %v", err)
	}
	if got := data["libraryId"]; got != cloneScript.ID {
		t.Errorf("操作引用的脚本 ID = %v，期望克隆出的 %s（源脚本 %s）", got, cloneScript.ID, script.ID)
	}
}

// TestCloneProjectDefaultName 不给名字时用「源名称 + 副本」。
func TestCloneProjectDefaultName(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "原项目")

	clone, err := NewProjectService(db).CloneProject(p.ID, "   ")
	if err != nil {
		t.Fatalf("CloneProject err=%v", err)
	}
	if clone.Name != "原项目 副本" {
		t.Errorf("默认克隆名 = %q，期望「原项目 副本」", clone.Name)
	}
}

// TestCloneProjectPreservesExplicitFalse 验证克隆时不会把显式 false 当作缺省值恢复为 true。
func TestCloneProjectPreservesExplicitFalse(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "false 状态")
	m := defaultModule(t, db, p.ID)
	if err := NewGlobalVariableService(db).SaveGlobalVariables(p.ID, []models.GlobalVariable{
		{Key: "disabled", Value: "x", Enabled: false},
	}); err != nil {
		t.Fatalf("保存全局变量失败: %v", err)
	}
	if _, err := NewEndpointService(db).CreateFullEndpoint(m.ID, nil, EndpointSaveData{
		Name: "no-inherit", Method: "GET", Path: "/", InheritOperations: false,
	}); err != nil {
		t.Fatalf("创建接口失败: %v", err)
	}

	clone, err := NewProjectService(db).CloneProject(p.ID, "clone")
	if err != nil {
		t.Fatalf("CloneProject err=%v", err)
	}
	var gv models.GlobalVariable
	if err := db.Where("project_id = ? AND key = ?", clone.ID, "disabled").First(&gv).Error; err != nil {
		t.Fatalf("读取克隆全局变量失败: %v", err)
	}
	if gv.Enabled {
		t.Error("克隆把禁用的全局变量恢复成了启用")
	}
	var ep models.Endpoint
	if err := db.Where("module_id IN (?) AND name = ?",
		db.Model(&models.Module{}).Select("id").Where("project_id = ?", clone.ID), "no-inherit").First(&ep).Error; err != nil {
		t.Fatalf("读取克隆接口失败: %v", err)
	}
	if ep.InheritOperations {
		t.Error("克隆把 inheritOperations=false 恢复成了 true")
	}
}

// TestCloneProjectNotFound 克隆不存在的项目应报错而不是建出空项目。
func TestCloneProjectNotFound(t *testing.T) {
	db := newTestDB(t)
	if _, err := NewProjectService(db).CloneProject("nope", "x"); err == nil {
		t.Fatal("克隆不存在的项目应返回错误")
	}
	if n := countIn(t, db, &models.Project{}); n != 0 {
		t.Errorf("失败的克隆不应留下项目，现有 %d 个", n)
	}
}
