package database

import (
	"os"
	"testing"

	"PostPigeon/internal/models"
)

// TestRealDBMigration 针对真实（可能半迁移）数据库副本验证升级迁移与级联。
// 仅当设置了 REALDB 环境变量时运行；平时（CI）跳过。
//
//	REALDB=/path/to/copy.db go test ./internal/database/ -run TestRealDBMigration -v
func TestRealDBMigration(t *testing.T) {
	path := os.Getenv("REALDB")
	if path == "" {
		t.Skip("未设置 REALDB，跳过真实库迁移测试")
	}

	db, err := Initialize(path)
	if err != nil {
		t.Fatalf("真实库初始化失败: %v", err)
	}

	// 外键确已在运行时连接上启用
	var fk int
	db.Raw("PRAGMA foreign_keys").Scan(&fk)
	if fk != 1 {
		t.Fatalf("运行时外键未启用, PRAGMA foreign_keys=%d", fk)
	}

	// 数据完好
	var projects int64
	db.Model(&models.Project{}).Count(&projects)
	t.Logf("迁移成功：projects=%d", projects)
	if projects == 0 {
		t.Fatal("迁移后项目丢失")
	}

	// 级联冒烟测试：删除一个模块，其端点应随外键级联消失
	var mod models.Module
	if err := db.First(&mod).Error; err != nil {
		t.Fatalf("取模块失败: %v", err)
	}
	var before int64
	db.Model(&models.Endpoint{}).Where("module_id = ?", mod.ID).Count(&before)

	// 直接用外键级联删除（不经服务层），验证 DB 层约束真正生效
	if err := db.Where("id = ?", mod.ID).Delete(&models.Module{}).Error; err != nil {
		t.Fatalf("删除模块失败: %v", err)
	}
	var after int64
	db.Model(&models.Endpoint{}).Where("module_id = ?", mod.ID).Count(&after)
	t.Logf("模块 %s 删除前端点=%d，删除后=%d", mod.ID, before, after)
	if after != 0 {
		t.Fatalf("外键级联未生效：删除模块后仍残留 %d 个端点", after)
	}
}
