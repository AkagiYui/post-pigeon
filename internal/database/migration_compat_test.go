package database

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	goose "github.com/pressly/goose/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// column 是 PRAGMA table_info 里与「旧版本能否读写」相关的那几列。
type column struct {
	Type       string
	NotNull    bool
	HasDefault bool
}

// openMigrationDB 按迁移连接的方式打开库（外键关闭）。
func openMigrationDB(t *testing.T, dbPath string) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(dbPath+"?_pragma=journal_mode(WAL)"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("打开数据库失败: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	return db
}

// migrateUpTo 把库迁到指定版本。
func migrateUpTo(t *testing.T, db *gorm.DB, version int64) {
	t.Helper()
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("取底层连接失败: %v", err)
	}
	goose.SetBaseFS(migrationsFS)
	goose.SetLogger(goose.NopLogger())
	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatalf("设置方言失败: %v", err)
	}
	if err := goose.UpTo(sqlDB, migrationsDir, version); err != nil {
		t.Fatalf("迁移到版本 %d 失败: %v", version, err)
	}
}

// schemaSnapshot 抓取当前 schema：表 → 列 → 列属性。goose 自己的版本表不算。
func schemaSnapshot(t *testing.T, db *gorm.DB) map[string]map[string]column {
	t.Helper()
	var tables []string
	if err := db.Raw(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != ?",
		goose.TableName(),
	).Scan(&tables).Error; err != nil {
		t.Fatalf("读取表清单失败: %v", err)
	}

	snapshot := make(map[string]map[string]column, len(tables))
	for _, table := range tables {
		rows, err := db.Raw(fmt.Sprintf("PRAGMA table_info(`%s`)", table)).Rows()
		if err != nil {
			t.Fatalf("读取 %s 结构失败: %v", table, err)
		}
		cols := map[string]column{}
		for rows.Next() {
			var (
				cid, notNull, pk int
				name, colType    string
				dflt             sql.NullString
			)
			if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
				rows.Close()
				t.Fatalf("解析 %s 结构失败: %v", table, err)
			}
			cols[name] = column{Type: colType, NotNull: notNull != 0, HasDefault: dflt.Valid}
		}
		rows.Close()
		snapshot[table] = cols
	}
	return snapshot
}

// TestMigrationsAreAdditive 钉死降级兼容性：每条迁移相对上一版本都必须是「纯增量」。
//
// 用户会在版本之间来回跳，而降级时 goose 不会执行 Down（旧二进制根本不认识库里
// 更高的版本号，goose.Up 直接空转），所以降级等于「旧代码跑在新 schema 上」。
// 两种改动会让旧版本当场报错，必须拦在提交前：
//   - 删表 / 删列：旧代码的 INSERT/UPDATE 会报 no such column；
//   - 给已有表加 NOT NULL 且无默认值的列：旧代码插入时不带这一列，直接失败。
//
// 详见 CONTRIBUTING.md 的「数据库迁移」。确需破坏兼容时，改这里的期望值，
// 并在 CHANGELOG 里写清楚降级会发生什么。
func TestMigrationsAreAdditive(t *testing.T) {
	versions, err := allMigrationVersions()
	if err != nil {
		t.Fatalf("读取迁移清单失败: %v", err)
	}

	for i, version := range versions {
		if i == 0 {
			continue // 基线没有「上一个版本」可比
		}
		prev := versions[i-1]

		t.Run(fmt.Sprintf("v%d_to_v%d", prev, version), func(t *testing.T) {
			db := openMigrationDB(t, filepath.Join(t.TempDir(), "compat.db"))
			migrateUpTo(t, db, prev)
			before := schemaSnapshot(t, db)
			migrateUpTo(t, db, version)
			after := schemaSnapshot(t, db)

			for table, oldCols := range before {
				newCols, ok := after[table]
				if !ok {
					t.Errorf("迁移 %d 删掉了表 %s：旧版本会直接报错", version, table)
					continue
				}
				for name := range oldCols {
					if _, ok := newCols[name]; !ok {
						t.Errorf("迁移 %d 删掉了 %s.%s：旧版本的 INSERT/UPDATE 会报 no such column",
							version, table, name)
					}
				}
				for name, col := range newCols {
					if _, existed := oldCols[name]; existed {
						continue
					}
					if col.NotNull && !col.HasDefault {
						t.Errorf("迁移 %d 给已有表加了 NOT NULL 且无默认值的列 %s.%s：旧版本插入时不带这一列，会失败",
							version, table, name)
					}
				}
			}
		})
	}
}

// TestOldBinaryOpensNewerDB 旧版本打开新版本写过的库：不该报错，也不该把库改回去。
//
// goose.Up 只补跑「文件里有、库里没登记」的版本，库里那些二进制不认识的更高版本
// 会被忽略——这正是降级不炸的前提，用例把它钉住。
func TestOldBinaryOpensNewerDB(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "newer.db")
	db, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化失败: %v", err)
	}
	// 伪造一条未来的迁移记录与它带来的新列，等价于用户用更新的版本打开过这个库
	if err := db.Exec("INSERT INTO goose_db_version (version_id, is_applied) VALUES (9999, 1)").Error; err != nil {
		t.Fatalf("写入未来版本失败: %v", err)
	}
	if err := db.Exec("ALTER TABLE projects ADD COLUMN future_col text DEFAULT ''").Error; err != nil {
		t.Fatalf("添加未来列失败: %v", err)
	}
	closeDB(t, db)

	db2, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("旧版本打开新库应当成功，实际: %v", err)
	}
	var maxVersion int64
	db2.Raw("SELECT MAX(version_id) FROM goose_db_version").Scan(&maxVersion)
	if maxVersion != 9999 {
		t.Fatalf("库版本被改动了：%d，期望 9999（降级不应执行 Down）", maxVersion)
	}
	if !tableExists(db2, "projects") {
		t.Fatal("业务表丢失")
	}
	// 旧代码只会写自己认识的列，新列有默认值时必须仍能插入
	if err := db2.Exec("INSERT INTO projects (id, name) VALUES ('p1','P')").Error; err != nil {
		t.Fatalf("旧版本写入失败: %v", err)
	}
}

// 旧版没有独立 WS 列；升级后 NULL 保留沿用 HTTP 的含义，不能迁成显式空地址。
func TestEnvironmentServersMigrationPreservesLegacyURLs(t *testing.T) {
	db := openMigrationDB(t, filepath.Join(t.TempDir(), "legacy-servers.db"))
	migrateUpTo(t, db, 19)
	for _, statement := range []string{
		`INSERT INTO projects(id,name) VALUES ('p','legacy')`,
		`INSERT INTO modules(id,project_id,name) VALUES ('m','p','module')`,
		`INSERT INTO environments(id,project_id,name) VALUES ('e','p','env')`,
		`INSERT INTO module_base_urls(id,module_id,environment_id,base_url) VALUES ('url','m','e','https://legacy.example')`,
	} {
		if err := db.Exec(statement).Error; err != nil {
			t.Fatal(err)
		}
	}
	migrateUpTo(t, db, 20)
	var result struct {
		BaseURL          string
		WebsocketBaseURL *string
		ServerURLs       *string
	}
	if err := db.Table("module_base_urls").Where("id = ?", "url").First(&result).Error; err != nil {
		t.Fatal(err)
	}
	if result.BaseURL != "https://legacy.example" || result.WebsocketBaseURL != nil || result.ServerURLs != nil {
		t.Fatalf("legacy URL semantics changed: %+v", result)
	}
	// 旧二进制仍能插入不携带新字段的记录。
	if err := db.Exec(`INSERT INTO modules(id,project_id,name) VALUES ('old-client','p','old client')`).Error; err != nil {
		t.Fatal(err)
	}
	var selected string
	if err := db.Table("modules").Select("server_id").Where("id = ?", "old-client").Scan(&selected).Error; err != nil || selected != "" {
		t.Fatalf("inherit default=%q err=%v", selected, err)
	}
}
