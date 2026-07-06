package services

import (
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"post-pigeon/internal/database"
	"post-pigeon/internal/models"
)

// countIn 返回某模型表中满足条件的行数。cond 为空时统计全表。
func countIn(t *testing.T, db *gorm.DB, model interface{}, cond ...interface{}) int64 {
	t.Helper()
	var c int64
	q := db.Model(model)
	if len(cond) > 0 {
		q = q.Where(cond[0], cond[1:]...)
	}
	if err := q.Count(&c).Error; err != nil {
		t.Fatalf("统计 %T 失败: %v", model, err)
	}
	return c
}

// mkOp 直接写入一条归属于指定层级的前置操作，返回其 ID。
func mkOp(t *testing.T, db *gorm.DB, ownerType models.OperationOwnerType, ownerID string) string {
	t.Helper()
	op := &models.Operation{
		OwnerType: string(ownerType), OwnerID: ownerID,
		Stage: string(models.OperationStagePre), Type: string(models.OpTypeScript),
		Name: "op", Enabled: true,
		Data: models.ToJSON(models.ScriptOperationData{Script: "console.log(1)"}),
	}
	if err := db.Create(op).Error; err != nil {
		t.Fatalf("创建操作失败: %v", err)
	}
	return op.ID
}

// 所有会随项目删除而应被清空的表；用于断言删除单个项目后数据库彻底干净。
func allDataModels() []interface{} {
	return []interface{}{
		&models.Project{}, &models.Module{}, &models.ModuleBaseURL{}, &models.ModuleParam{},
		&models.Folder{}, &models.Endpoint{}, &models.EndpointParam{}, &models.EndpointBodyField{},
		&models.EndpointHeader{}, &models.EndpointAuth{}, &models.Response{}, &models.ResponseExample{},
		&models.ResponseSchema{}, &models.Operation{}, &models.Environment{}, &models.EnvironmentVariable{},
		&models.GlobalVariable{}, &models.ScriptLibrary{}, &models.RequestHistory{},
	}
}

// buildRichProject 搭一棵尽量“满”的项目树，覆盖所有会级联的关联数据，返回关键 ID。
type richProject struct {
	projectID             string
	moduleID              string // 默认模块
	rootFolderID          string
	folderID, subFolderID string
	epModule              string // 直接挂在模块下（folder_id 为空）
	epFolder, epSubFolder string
}

func buildRichProject(t *testing.T, db *gorm.DB) richProject {
	t.Helper()
	fs := NewFolderService(db)
	es := NewEndpointService(db)
	ms := NewModuleService(db)

	p := mustCreateProject(t, db, "富项目")
	m := defaultModule(t, db, p.ID)
	env := firstEnvironment(t, db, p.ID)

	var root models.Folder
	db.Where("module_id = ? AND parent_id IS NULL", m.ID).First(&root)

	f, err := fs.CreateFolder(m.ID, nil, "F")
	if err != nil {
		t.Fatalf("建文件夹失败: %v", err)
	}
	sf, err := fs.CreateFolder(m.ID, &f.ID, "SF")
	if err != nil {
		t.Fatalf("建子文件夹失败: %v", err)
	}

	epMod, _ := es.CreateEndpoint(m.ID, nil, "E-mod", "GET", "/mod")
	epF, _ := es.CreateEndpoint(m.ID, &f.ID, "E-f", "GET", "/f")
	epSF, _ := es.CreateEndpoint(m.ID, &sf.ID, "E-sf", "POST", "/sf")

	// 给 epF 塞满关联数据（参数/请求头/请求体字段/认证/响应）
	if err := es.SaveEndpointData(EndpointSaveData{
		ID: epF.ID, Name: "E-f", Method: "GET", Path: "/f",
		Params:     []models.EndpointParam{{Type: "query", Name: "q", Value: "1", Enabled: true}},
		Headers:    []models.EndpointHeader{{Name: "H", Value: "v", Enabled: true}},
		BodyFields: []models.EndpointBodyField{{Name: "b", Value: "v", FieldType: "text", Enabled: true}},
		Auth:       &models.EndpointAuth{Type: "bearer", Data: models.ToJSON(models.BearerAuthData{Token: "t"})},
	}); err != nil {
		t.Fatalf("保存端点数据失败: %v", err)
	}
	if err := es.SaveResponse(epF.ID, &models.Response{StatusCode: 200, Body: "ok"}); err != nil {
		t.Fatalf("保存响应失败: %v", err)
	}
	if err := db.Create(&models.ResponseExample{EndpointID: epF.ID, Name: "ex", StatusCode: 200, Body: "{}"}).Error; err != nil {
		t.Fatalf("建响应示例失败: %v", err)
	}
	if err := db.Create(&models.ResponseSchema{EndpointID: epF.ID, StatusCode: 200, Schema: "{}"}).Error; err != nil {
		t.Fatalf("建响应 Schema 失败: %v", err)
	}

	// 每一层都挂一个操作（多态归属，无外键）
	mkOp(t, db, models.OperationOwnerEndpoint, epF.ID)
	mkOp(t, db, models.OperationOwnerEndpoint, epMod.ID)
	mkOp(t, db, models.OperationOwnerFolder, f.ID)
	mkOp(t, db, models.OperationOwnerFolder, sf.ID)
	mkOp(t, db, models.OperationOwnerModule, m.ID)

	// 模块级：前置 URL、模块参数、请求历史（含挂到端点的历史）
	if err := ms.SetModuleBaseURL(m.ID, env.ID, "http://a.com"); err != nil {
		t.Fatalf("设置前置URL失败: %v", err)
	}
	if err := db.Create(&models.ModuleParam{ModuleID: m.ID, Type: "query", Name: "mp", Enabled: true}).Error; err != nil {
		t.Fatalf("建模块参数失败: %v", err)
	}
	if err := db.Create(&models.RequestHistory{ModuleID: m.ID, Method: "GET", URL: "http://x/"}).Error; err != nil {
		t.Fatalf("建模块历史失败: %v", err)
	}
	if err := db.Create(&models.RequestHistory{ModuleID: m.ID, EndpointID: &epF.ID, Method: "GET", URL: "http://x/f"}).Error; err != nil {
		t.Fatalf("建端点历史失败: %v", err)
	}

	// 项目级：全局变量、脚本库、环境变量
	if err := NewGlobalVariableService(db).SaveGlobalVariables(p.ID, []models.GlobalVariable{{Key: "g", Value: "1", Enabled: true}}); err != nil {
		t.Fatalf("保存全局变量失败: %v", err)
	}
	if _, err := NewScriptLibraryService(db).CreateScript(p.ID, "lib", "code", ""); err != nil {
		t.Fatalf("建脚本库失败: %v", err)
	}
	if err := NewEnvironmentService(db).SaveEnvironmentVariables(env.ID, []models.EnvironmentVariable{{Key: "k", Value: "v", Enabled: true}}); err != nil {
		t.Fatalf("保存环境变量失败: %v", err)
	}

	return richProject{
		projectID: p.ID, moduleID: m.ID, rootFolderID: root.ID,
		folderID: f.ID, subFolderID: sf.ID,
		epModule: epMod.ID, epFolder: epF.ID, epSubFolder: epSF.ID,
	}
}

// TestDeleteProjectCascadeAll 删除唯一项目后，除设置表外所有业务表都应被外键级联清空。
func TestDeleteProjectCascadeAll(t *testing.T) {
	db := newTestDB(t)
	rp := buildRichProject(t, db)

	// 删除前确认确有数据（否则测试形同虚设）
	if countIn(t, db, &models.Operation{}) != 5 {
		t.Fatalf("删除前操作数应为 5，实际 %d", countIn(t, db, &models.Operation{}))
	}
	if countIn(t, db, &models.Endpoint{}) != 3 {
		t.Fatalf("删除前端点数应为 3，实际 %d", countIn(t, db, &models.Endpoint{}))
	}

	if err := NewProjectService(db).DeleteProject(rp.projectID); err != nil {
		t.Fatalf("删除项目失败: %v", err)
	}

	for _, m := range allDataModels() {
		if n := countIn(t, db, m); n != 0 {
			t.Errorf("删除项目后 %T 残留 %d 行", m, n)
		}
	}
}

// TestDeleteFolderCascade 删除文件夹应级联清掉其子树（含子文件夹、端点、端点关联、操作），
// 但不得影响同模块下的其它端点与模块级操作。
func TestDeleteFolderCascade(t *testing.T) {
	db := newTestDB(t)
	rp := buildRichProject(t, db)

	if err := NewFolderService(db).DeleteFolder(rp.folderID); err != nil {
		t.Fatalf("删除文件夹失败: %v", err)
	}

	// 子树内的文件夹、端点应消失
	for _, id := range []string{rp.folderID, rp.subFolderID} {
		if countIn(t, db, &models.Folder{}, "id = ?", id) != 0 {
			t.Errorf("文件夹 %s 应被删除", id)
		}
	}
	for _, id := range []string{rp.epFolder, rp.epSubFolder} {
		if countIn(t, db, &models.Endpoint{}, "id = ?", id) != 0 {
			t.Errorf("端点 %s 应随文件夹级联删除", id)
		}
	}
	// epFolder 的关联数据（请求头/认证/响应/示例/Schema/历史）应级联删除
	if countIn(t, db, &models.EndpointHeader{}, "endpoint_id = ?", rp.epFolder) != 0 {
		t.Error("端点请求头应级联删除")
	}
	if countIn(t, db, &models.Response{}, "endpoint_id = ?", rp.epFolder) != 0 {
		t.Error("端点响应应级联删除")
	}
	if countIn(t, db, &models.RequestHistory{}, "endpoint_id = ?", rp.epFolder) != 0 {
		t.Error("端点请求历史应级联删除")
	}
	// 文件夹级 + 端点级操作应被显式清理
	if countIn(t, db, &models.Operation{}, "owner_id IN ?", []string{rp.folderID, rp.subFolderID, rp.epFolder, rp.epSubFolder}) != 0 {
		t.Error("子树内的操作应被清理")
	}

	// 未被删除的：模块级端点、模块级操作仍在
	if countIn(t, db, &models.Endpoint{}, "id = ?", rp.epModule) != 1 {
		t.Error("模块级端点不应被删除")
	}
	if countIn(t, db, &models.Operation{}, "owner_id = ?", rp.moduleID) != 1 {
		t.Error("模块级操作不应被删除")
	}
	if countIn(t, db, &models.Operation{}, "owner_id = ?", rp.epModule) != 1 {
		t.Error("模块级端点的操作不应被删除")
	}
}

// TestDeleteModuleCascade 删除模块应清掉其下全部内容与各级操作，且不残留任何相关行。
func TestDeleteModuleCascade(t *testing.T) {
	db := newTestDB(t)
	rp := buildRichProject(t, db)

	if err := NewModuleService(db).DeleteModule(rp.moduleID); err != nil {
		t.Fatalf("删除模块失败: %v", err)
	}

	if countIn(t, db, &models.Module{}, "id = ?", rp.moduleID) != 0 {
		t.Error("模块应被删除")
	}
	if countIn(t, db, &models.Folder{}, "module_id = ?", rp.moduleID) != 0 {
		t.Error("模块下文件夹应级联删除")
	}
	if countIn(t, db, &models.Endpoint{}, "module_id = ?", rp.moduleID) != 0 {
		t.Error("模块下端点应级联删除")
	}
	if countIn(t, db, &models.ModuleBaseURL{}, "module_id = ?", rp.moduleID) != 0 {
		t.Error("模块前置URL应级联删除")
	}
	if countIn(t, db, &models.ModuleParam{}, "module_id = ?", rp.moduleID) != 0 {
		t.Error("模块参数应级联删除")
	}
	if countIn(t, db, &models.RequestHistory{}, "module_id = ?", rp.moduleID) != 0 {
		t.Error("模块请求历史应级联删除")
	}
	// 各级操作（端点/文件夹/模块）都应清理干净
	if n := countIn(t, db, &models.Operation{}); n != 0 {
		t.Errorf("删除模块后不应残留操作，实际 %d", n)
	}
	// 端点关联表也应全空
	if countIn(t, db, &models.EndpointHeader{}) != 0 || countIn(t, db, &models.EndpointAuth{}) != 0 {
		t.Error("端点关联数据应级联删除")
	}
}

// TestDeleteEndpointCascade 删除端点应级联清掉其关联数据 + 显式清理其操作。
func TestDeleteEndpointCascade(t *testing.T) {
	db := newTestDB(t)
	rp := buildRichProject(t, db)

	if err := NewEndpointService(db).DeleteEndpoint(rp.epFolder); err != nil {
		t.Fatalf("删除端点失败: %v", err)
	}

	if countIn(t, db, &models.Endpoint{}, "id = ?", rp.epFolder) != 0 {
		t.Error("端点应被删除")
	}
	for _, tbl := range []interface{}{
		&models.EndpointParam{}, &models.EndpointBodyField{}, &models.EndpointHeader{},
		&models.EndpointAuth{}, &models.Response{}, &models.ResponseExample{}, &models.ResponseSchema{},
	} {
		if n := countIn(t, db, tbl, "endpoint_id = ?", rp.epFolder); n != 0 {
			t.Errorf("端点关联 %T 应级联删除，残留 %d", tbl, n)
		}
	}
	if countIn(t, db, &models.RequestHistory{}, "endpoint_id = ?", rp.epFolder) != 0 {
		t.Error("端点请求历史应级联删除")
	}
	if countIn(t, db, &models.Operation{}, "owner_id = ?", rp.epFolder) != 0 {
		t.Error("端点操作应被清理")
	}
	// 所属文件夹与模块不受影响
	if countIn(t, db, &models.Folder{}, "id = ?", rp.folderID) != 1 {
		t.Error("端点所属文件夹不应被删除")
	}
}

// TestDeleteEnvironmentCascade 删除环境应级联清掉其变量与各模块在该环境下的前置 URL。
func TestDeleteEnvironmentCascade(t *testing.T) {
	db := newTestDB(t)
	rp := buildRichProject(t, db)
	env := firstEnvironment(t, db, rp.projectID)

	if err := NewEnvironmentService(db).DeleteEnvironment(env.ID); err != nil {
		t.Fatalf("删除环境失败: %v", err)
	}
	if countIn(t, db, &models.Environment{}, "id = ?", env.ID) != 0 {
		t.Error("环境应被删除")
	}
	if countIn(t, db, &models.EnvironmentVariable{}, "environment_id = ?", env.ID) != 0 {
		t.Error("环境变量应级联删除")
	}
	if countIn(t, db, &models.ModuleBaseURL{}, "environment_id = ?", env.ID) != 0 {
		t.Error("该环境下的模块前置URL应级联删除")
	}
}

// TestForeignKeyEnforced 验证外键约束确实被启用：插入引用不存在父项的子行应失败。
func TestForeignKeyEnforced(t *testing.T) {
	db := newTestDB(t)
	err := db.Create(&models.EndpointHeader{EndpointID: "no-such-endpoint", Name: "H"}).Error
	if err == nil {
		t.Fatal("插入引用不存在端点的请求头应因外键约束失败，但成功了——外键未启用")
	}
}

// TestCascadeMigrationFromLegacySchema 模拟“旧版本数据库无外键约束 → 升级后自动补建约束”。
// 先用不建外键的配置建表并写入数据，再走真实 Initialize（会通过重建表补上外键），
// 最后验证：数据被完整保留，且删除项目能真正级联。
func TestCascadeMigrationFromLegacySchema(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "legacy.db")

	// 1. 旧库：显式禁用外键约束建表
	legacy, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("打开旧库失败: %v", err)
	}
	if err := legacy.AutoMigrate(legacyModels()...); err != nil {
		t.Fatalf("旧库建表失败: %v", err)
	}
	// 写入 项目 → 模块 → 端点 → 请求头 一条链路
	proj := &models.Project{ID: "p1", Name: "旧项目"}
	mod := &models.Module{ID: "m1", ProjectID: "p1", Name: "M"}
	ep := &models.Endpoint{ID: "e1", ModuleID: "m1", Name: "E", Method: "GET", Path: "/"}
	hdr := &models.EndpointHeader{ID: "h1", EndpointID: "e1", Name: "H"}
	for _, r := range []interface{}{proj, mod, ep, hdr} {
		if err := legacy.Create(r).Error; err != nil {
			t.Fatalf("旧库写入失败: %v", err)
		}
	}
	sqlDB, _ := legacy.DB()
	sqlDB.Close()

	// 2. 走真实初始化路径（开启外键 + AutoMigrate 补建约束）
	db, err := database.Initialize(dbPath)
	if err != nil {
		t.Fatalf("升级初始化失败: %v", err)
	}

	// 数据应被完整保留
	if countIn(t, db, &models.EndpointHeader{}, "id = ?", "h1") != 1 {
		t.Fatal("升级后旧数据丢失")
	}

	// 3. 删除项目应级联清掉模块、端点、请求头（证明外键约束确已补建生效）
	if err := NewProjectService(db).DeleteProject("p1"); err != nil {
		t.Fatalf("删除项目失败: %v", err)
	}
	for _, m := range []interface{}{&models.Module{}, &models.Endpoint{}, &models.EndpointHeader{}} {
		if n := countIn(t, db, m); n != 0 {
			t.Errorf("升级后删除项目，%T 仍残留 %d 行——外键级联未生效", m, n)
		}
	}
}

// legacyModels 与 database.autoMigrate 保持一致的模型清单，供迁移测试建“旧库”使用。
func legacyModels() []interface{} {
	return []interface{}{
		&models.Project{}, &models.Environment{}, &models.EnvironmentVariable{}, &models.GlobalVariable{},
		&models.Module{}, &models.ModuleBaseURL{}, &models.ModuleParam{}, &models.Folder{},
		&models.Endpoint{}, &models.EndpointParam{}, &models.EndpointBodyField{}, &models.EndpointHeader{},
		&models.EndpointAuth{}, &models.Operation{}, &models.ResponseExample{}, &models.ResponseSchema{},
		&models.ScriptLibrary{}, &models.Response{}, &models.RequestHistory{}, &models.Settings{},
	}
}

// --- 模拟“旧版本带外键但无级联”的镜像模型 ---
// 表名与真实模型一致，关联仅用 foreignKey（不含 constraint），
// 因此 GORM 会以默认方式（无 ON DELETE 动作）建立外键，且约束命名与真实模型相同
// （fk_<表>_<字段>），从而精确复现线上历史库的形态。

type legProject struct {
	ID      string      `gorm:"primaryKey"`
	Name    string      `gorm:"not null"`
	Modules []legModule `gorm:"foreignKey:ProjectID"`
}

func (legProject) TableName() string { return "projects" }

type legModule struct {
	ID        string        `gorm:"primaryKey"`
	ProjectID string        `gorm:"not null"`
	Name      string        `gorm:"not null"`
	Endpoints []legEndpoint `gorm:"foreignKey:ModuleID"`
	Folders   []legFolder   `gorm:"foreignKey:ModuleID"`
}

func (legModule) TableName() string { return "modules" }

type legFolder struct {
	ID        string        `gorm:"primaryKey"`
	ModuleID  string        `gorm:"not null"`
	Name      string        `gorm:"not null"`
	Endpoints []legEndpoint `gorm:"foreignKey:FolderID"`
}

func (legFolder) TableName() string { return "folders" }

type legEndpoint struct {
	ID       string `gorm:"primaryKey"`
	ModuleID string `gorm:"not null"`
	FolderID *string
	Name     string      `gorm:"not null"`
	Headers  []legHeader `gorm:"foreignKey:EndpointID"`
}

func (legEndpoint) TableName() string { return "endpoints" }

type legHeader struct {
	ID         string `gorm:"primaryKey"`
	EndpointID string `gorm:"not null"`
	Name       string `gorm:"not null"`
}

func (legHeader) TableName() string { return "endpoint_headers" }

// TestCascadeMigrationFixesLegacyNonCascadeFK 复现线上真实故障：
// 旧库已有外键但没有 ON DELETE CASCADE（AutoMigrate 不会修改既有约束）。
// 升级后应把这些外键重建为级联，并让删除真正级联生效。
func TestCascadeMigrationFixesLegacyNonCascadeFK(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "legacy_fk.db")

	// 1. 旧库：以默认方式建外键（无级联）
	legacy, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("打开旧库失败: %v", err)
	}
	if err := legacy.AutoMigrate(&legProject{}, &legModule{}, &legFolder{}, &legEndpoint{}, &legHeader{}); err != nil {
		t.Fatalf("旧库建表失败: %v", err)
	}
	// 确认旧库外键确实是“非级联”，否则该测试无意义
	if od := legFKOnDelete(t, legacy, "endpoints", "folder_id"); od == "CASCADE" {
		t.Fatalf("旧库 endpoints.folder_id 竟已是 CASCADE，无法复现场景")
	}
	fid := "fo1"
	rows := []interface{}{
		&legProject{ID: "p1", Name: "P"},
		&legModule{ID: "m1", ProjectID: "p1", Name: "M"},
		&legFolder{ID: "fo1", ModuleID: "m1", Name: "F"},
		&legEndpoint{ID: "e1", ModuleID: "m1", FolderID: &fid, Name: "E"},
		&legHeader{ID: "h1", EndpointID: "e1", Name: "H"},
	}
	for _, r := range rows {
		if err := legacy.Create(r).Error; err != nil {
			t.Fatalf("旧库写入失败: %v", err)
		}
	}
	if sqlDB, err := legacy.DB(); err == nil {
		sqlDB.Close()
	}

	// 2. 真实初始化：应检测到非级联外键并全部重建为 CASCADE
	db, err := database.Initialize(dbPath)
	if err != nil {
		t.Fatalf("升级初始化失败: %v", err)
	}

	// 外键应已被重建为级联
	if od := legFKOnDelete(t, db, "endpoints", "folder_id"); od != "CASCADE" {
		t.Fatalf("升级后 endpoints.folder_id 的 on_delete = %q，期望 CASCADE", od)
	}
	if od := legFKOnDelete(t, db, "endpoint_headers", "endpoint_id"); od != "CASCADE" {
		t.Fatalf("升级后 endpoint_headers.endpoint_id 的 on_delete = %q，期望 CASCADE", od)
	}

	// 3. 删除文件夹应级联删除其端点及请求头（旧库形态下这正是会 787 失败的场景）
	if err := NewFolderService(db).DeleteFolder("fo1"); err != nil {
		t.Fatalf("删除文件夹失败: %v", err)
	}
	if countIn(t, db, &models.Endpoint{}, "id = ?", "e1") != 0 {
		t.Error("端点应随文件夹级联删除")
	}
	if countIn(t, db, &models.EndpointHeader{}, "id = ?", "h1") != 0 {
		t.Error("请求头应随端点级联删除")
	}

	// 4. 删除项目应级联清空模块（验证父表也被重建为级联）
	if err := NewProjectService(db).DeleteProject("p1"); err != nil {
		t.Fatalf("删除项目失败: %v", err)
	}
	if countIn(t, db, &models.Module{}) != 0 {
		t.Error("删除项目后模块应级联删除")
	}
}

// legFKOnDelete 读取某表某外键列的 on_delete 动作，供迁移测试断言。
func legFKOnDelete(t *testing.T, db *gorm.DB, table, from string) string {
	t.Helper()
	var od string
	db.Raw("SELECT on_delete FROM pragma_foreign_key_list(?) WHERE \"from\" = ?", table, from).Scan(&od)
	return od
}
