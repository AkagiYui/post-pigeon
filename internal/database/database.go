// Package database 提供数据库初始化和连接管理
package database

import (
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"path"
	"strconv"
	"strings"

	"github.com/glebarez/sqlite"
	goose "github.com/pressly/goose/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"post-pigeon/internal/models"
)

// migrationsFS 将 goose SQL 迁移文件打进二进制，运行时无需外部文件。
//
//go:embed migrations/*.sql
var migrationsFS embed.FS

// migrationsDir 是嵌入 FS 中迁移文件所在目录。
const migrationsDir = "migrations"

// Initialize 初始化数据库连接并执行自动迁移
func Initialize(dbPath string) (*gorm.DB, error) {
	slog.Info("正在初始化数据库", "path", dbPath)

	// 迁移与运行时使用不同的外键设置，二者缺一不可：
	//
	// 【迁移阶段：外键必须关闭】
	// 为已有的表补建外键约束时，glebarez 需要「建新表 → 拷数据 → DROP 旧表 → 改名」。
	// 若外键处于开启状态，DROP 一个被其它表引用的父表（如 modules 被 endpoints 引用）会触发
	// 隐式 DELETE，进而违反子表外键，报 “FOREIGN KEY constraint failed (787)”。
	// 半迁移状态（部分表已带外键）下尤其必然触发。因此迁移连接不启用 foreign_keys。
	//
	// 【运行时阶段：外键必须开启】
	// 只有开启 foreign_keys，ON DELETE CASCADE 才会生效；且它是「连接级」设置，
	// 必须写进 DSN 由驱动对连接池中每条连接执行（用 db.Exec 只作用于单条连接，不可靠）。
	if err := migrate(dbPath); err != nil {
		return nil, err
	}

	dsn := dbPath + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("无法打开数据库: %w", err)
	}

	slog.Info("数据库初始化完成")
	return db, nil
}

// migrate 在「外键关闭」的独立连接上完成所有迁移，随后关闭该连接。
//
// schema 的唯一真实来源是 migrations/ 下的 goose 版本化 SQL：
//   - 全新库：goose 依次执行 00001.. 建立 schema。
//   - 已纳入 goose 管理的库：goose 只执行未应用的增量迁移。
//   - 历史库（goose 之前由 AutoMigrate 维护、无版本表）：一次性用 AutoMigrate +
//     外键修正收敛到当前基线，再登记 goose 版本，此后完全交给 goose。
//
// 迁移期间外键必须关闭：为已有表重建/补外键时，DROP 被引用的父表会触发隐式 DELETE，
// 开启外键会报 “FOREIGN KEY constraint failed (787)”。
func migrate(dbPath string) error {
	// 不含 foreign_keys，故此连接上外键默认关闭
	dsn := dbPath + "?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return fmt.Errorf("无法打开数据库: %w", err)
	}
	// 迁移结束后释放该连接，避免与运行时连接池并存
	defer func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}()

	// 历史库判定：有业务表（projects）但没有 goose 版本表，说明是 goose 接管前的旧库。
	preGoose := tableExists(db, "projects") && !tableExists(db, "goose_db_version")
	if preGoose {
		if err := adoptLegacyDB(db); err != nil {
			return err
		}
	}

	// goose 接管：新库建基线；已登记库执行增量迁移；历史库已 stamp 到最新版本，此处无操作。
	if err := runGoose(db); err != nil {
		return fmt.Errorf("goose 迁移失败: %w", err)
	}

	return nil
}

// adoptLegacyDB 将 goose 之前的历史库一次性收敛到当前基线，并登记 goose 版本。
//
// 历史库可能停留在任意旧结构（缺列、旧的非级联外键等）。这里复用 AutoMigrate 补齐
// 表/列，再用 fixCascadeConstraints 把外键统一为级联，最后把 goose 版本 stamp 到
// 最新迁移号——因为 AutoMigrate 反映的正是「全部迁移应用后」的最新 schema，
// 于是 goose 视所有现有迁移为已应用，后续只跑将来新增的迁移。
//
// 注意：这是一次性过渡逻辑，仅对无版本表的旧库执行；库一旦被 stamp，下次启动即走
// 纯 goose 路径，不再进入此分支。
func adoptLegacyDB(db *gorm.DB) error {
	slog.Info("检测到无版本管理的历史数据库，正在收敛到基线并纳入 goose 管理")

	if err := autoMigrate(db); err != nil {
		return fmt.Errorf("历史库结构收敛失败: %w", err)
	}
	if err := fixCascadeConstraints(db); err != nil {
		return fmt.Errorf("外键级联修正失败: %w", err)
	}
	if err := migrateProjectSortOrder(db); err != nil {
		return fmt.Errorf("项目排序迁移失败: %w", err)
	}
	if err := migrateScriptsToOperations(db); err != nil {
		return fmt.Errorf("脚本迁移失败: %w", err)
	}

	if err := stampGooseVersion(db); err != nil {
		return fmt.Errorf("登记 goose 版本失败: %w", err)
	}
	slog.Info("历史数据库已纳入 goose 管理")
	return nil
}

// runGoose 使用嵌入的迁移文件，将数据库升级到最新版本。
func runGoose(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	goose.SetBaseFS(migrationsFS)
	goose.SetLogger(goose.NopLogger())
	if err := goose.SetDialect("sqlite3"); err != nil {
		return err
	}
	return goose.Up(sqlDB, migrationsDir)
}

// stampGooseVersion 为「已收敛到最新 schema」的历史库登记 goose 版本，
// 使 goose 视所有现有迁移为已应用（不会重跑基线）。
func stampGooseVersion(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	goose.SetBaseFS(migrationsFS)
	goose.SetLogger(goose.NopLogger())
	if err := goose.SetDialect("sqlite3"); err != nil {
		return err
	}
	// 创建 goose 版本表（并写入初始 0 版本）
	if _, err := goose.EnsureDBVersion(sqlDB); err != nil {
		return err
	}
	latest, err := latestMigrationVersion()
	if err != nil {
		return err
	}
	// 直接写入版本记录：goose_db_version(version_id, is_applied)，表结构见 goose sqlite3 方言
	if _, err := sqlDB.Exec(
		"INSERT INTO "+goose.TableName()+" (version_id, is_applied) VALUES (?, 1)", latest,
	); err != nil {
		return err
	}
	return nil
}

// latestMigrationVersion 返回嵌入迁移文件中最大的版本号（文件名形如 00001_xxx.sql）。
func latestMigrationVersion() (int64, error) {
	entries, err := fs.ReadDir(migrationsFS, migrationsDir)
	if err != nil {
		return 0, err
	}
	var maxV int64
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		base := path.Base(e.Name())
		numStr, _, ok := strings.Cut(base, "_")
		if !ok {
			continue
		}
		v, err := strconv.ParseInt(numStr, 10, 64)
		if err != nil {
			continue
		}
		if v > maxV {
			maxV = v
		}
	}
	if maxV == 0 {
		return 0, fmt.Errorf("未找到任何迁移文件")
	}
	return maxV, nil
}

// tableExists 判断指定表是否存在。
func tableExists(db *gorm.DB, name string) bool {
	var count int64
	db.Raw("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = ?", name).Scan(&count)
	return count > 0
}

// migrateScriptsToOperations 将端点上旧的 PreRequestScript/PostResponseScript 字段
// 转换为对应的 script 类型操作（仅在该端点尚无同阶段操作时执行，避免重复迁移）。
func migrateScriptsToOperations(db *gorm.DB) error {
	var endpoints []models.Endpoint
	if err := db.Where("(pre_request_script != '' AND pre_request_script IS NOT NULL) OR (post_response_script != '' AND post_response_script IS NOT NULL)").
		Find(&endpoints).Error; err != nil {
		return err
	}
	if len(endpoints) == 0 {
		return nil
	}
	for _, ep := range endpoints {
		var existing int64
		db.Model(&models.Operation{}).
			Where("owner_type = ? AND owner_id = ?", models.OperationOwnerEndpoint, ep.ID).
			Count(&existing)
		if existing > 0 {
			continue
		}
		if s := ep.PreRequestScript; s != "" {
			db.Create(&models.Operation{
				OwnerType: string(models.OperationOwnerEndpoint), OwnerID: ep.ID,
				Stage: string(models.OperationStagePre), Type: string(models.OpTypeScript),
				Name: "前置脚本", Enabled: true, SortOrder: 0,
				Data: models.ToJSON(models.ScriptOperationData{Script: s}),
			})
		}
		if s := ep.PostResponseScript; s != "" {
			db.Create(&models.Operation{
				OwnerType: string(models.OperationOwnerEndpoint), OwnerID: ep.ID,
				Stage: string(models.OperationStagePost), Type: string(models.OpTypeScript),
				Name: "后置脚本", Enabled: true, SortOrder: 0,
				Data: models.ToJSON(models.ScriptOperationData{Script: s}),
			})
		}
	}
	slog.Info("端点脚本已迁移为操作", "count", len(endpoints))
	return nil
}

// migrateProjectSortOrder 为现有项目初始化排序值
// 对于 sort_order 为 0 的项目，按 updated_at 降序设置排序值
func migrateProjectSortOrder(db *gorm.DB) error {
	var projects []models.Project
	// 找出所有未设置排序（sort_order = 0）且有多个项目的情况
	if err := db.Where("sort_order = 0").Order("updated_at DESC").Find(&projects).Error; err != nil {
		return err
	}

	// 如果有未设置排序的项目，逐个更新
	if len(projects) > 0 {
		slog.Info("正在为现有项目初始化排序值", "count", len(projects))
		// 先获取最大排序值，避免覆盖已有排序的项目
		var maxOrder int64
		db.Model(&models.Project{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder)

		for i, project := range projects {
			newOrder := maxOrder + int64(i) + 1
			if err := db.Model(&project).Update("sort_order", newOrder).Error; err != nil {
				return err
			}
		}
		slog.Info("项目排序值初始化完成")
	}
	return nil
}

// cascadeRelations 列出所有应为 ON DELETE CASCADE 的父子关系，
// 以「父模型 + 该模型上的关系字段名」表示（DropConstraint/CreateConstraint 均按此解析）。
// 不含 Operation：它是多态归属，无外键，由服务层显式清理。
func cascadeRelations() []struct {
	model  interface{}
	fields []string
} {
	return []struct {
		model  interface{}
		fields []string
	}{
		{&models.Project{}, []string{"Modules", "Environments", "GlobalVariables", "Scripts"}},
		{&models.Module{}, []string{"BaseURLs", "Params", "Endpoints", "Folders", "Histories"}},
		{&models.Folder{}, []string{"Children", "Endpoints"}},
		{&models.Environment{}, []string{"Variables", "BaseURLs"}},
		{&models.Endpoint{}, []string{"Params", "BodyFields", "Headers", "Auth", "Response", "Examples", "Schemas", "Histories"}},
	}
}

// fixCascadeConstraints 将历史遗留的非级联外键统一重建为 ON DELETE CASCADE。
//
// 背景：早期版本对带关联字段的关系（如 Folder.Endpoints）使用 gorm 默认方式建立了外键，
// 但没有级联动作；而 AutoMigrate 只会「补建缺失的约束」，不会修改已存在的同名约束，
// 因此这些旧外键即便模型已声明 CASCADE 也不会被更新。此处显式删除后重建。
//
// 通过代表性约束（endpoints.folder_id 的 on_delete）判断是否已是级联，
// 全新库或已修正过的库直接跳过，避免每次启动都重建表。
// 必须在「外键关闭」的迁移连接上调用：DropConstraint/CreateConstraint 会重建表，
// 开启外键时重建被引用的父表会触发约束失败。
func fixCascadeConstraints(db *gorm.DB) error {
	if fkOnDelete(db, "endpoints", "folder_id") == "CASCADE" {
		return nil // 已是级联，无需处理
	}
	slog.Info("检测到历史遗留的非级联外键，正在重建为 ON DELETE CASCADE")

	m := db.Migrator()
	for _, rel := range cascadeRelations() {
		for _, field := range rel.fields {
			if m.HasConstraint(rel.model, field) {
				if err := m.DropConstraint(rel.model, field); err != nil {
					return fmt.Errorf("删除旧外键 %T.%s 失败: %w", rel.model, field, err)
				}
			}
			if err := m.CreateConstraint(rel.model, field); err != nil {
				return fmt.Errorf("重建外键 %T.%s 失败: %w", rel.model, field, err)
			}
		}
	}
	slog.Info("外键已全部重建为级联删除")
	return nil
}

// fkOnDelete 返回 table 上以 fromCol 为外键列的 ON DELETE 动作（如 "CASCADE"）；
// 不存在该外键时返回空串。
func fkOnDelete(db *gorm.DB, table, fromCol string) string {
	rows, err := db.Raw("PRAGMA foreign_key_list(" + table + ")").Rows()
	if err != nil {
		return ""
	}
	defer rows.Close()
	for rows.Next() {
		// 列：id, seq, table, from, to, on_update, on_delete, match
		var id, seq int
		var refTable, from, to, onUpdate, onDelete, match string
		if err := rows.Scan(&id, &seq, &refTable, &from, &to, &onUpdate, &onDelete, &match); err != nil {
			return ""
		}
		if from == fromCol {
			return onDelete
		}
	}
	return ""
}

// autoMigrate 执行所有模型的自动迁移
func autoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Project{},
		&models.Environment{},
		&models.EnvironmentVariable{},
		&models.GlobalVariable{},
		&models.Module{},
		&models.ModuleBaseURL{},
		&models.ModuleParam{},
		&models.Folder{},
		&models.Endpoint{},
		&models.EndpointParam{},
		&models.EndpointBodyField{},
		&models.EndpointHeader{},
		&models.EndpointAuth{},
		&models.Operation{},
		&models.ResponseExample{},
		&models.ResponseSchema{},
		&models.ScriptLibrary{},
		&models.Response{},
		&models.RequestHistory{},
		&models.Settings{},
	)
}
