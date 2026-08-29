package database

import (
	"path/filepath"
	"testing"
)

func TestNamedCookieJarMigrationPreservesProjectSharing(t *testing.T) {
	db := openMigrationDB(t, filepath.Join(t.TempDir(), "cookies.db"))
	migrateUpTo(t, db, 12)

	if err := db.Exec("INSERT INTO projects (id, name) VALUES ('p1', 'P')").Error; err != nil {
		t.Fatal(err)
	}
	for _, moduleID := range []string{"m1", "m2"} {
		if err := db.Exec("INSERT INTO modules (id, project_id, name) VALUES (?, 'p1', ?)", moduleID, moduleID).Error; err != nil {
			t.Fatal(err)
		}
	}
	if err := db.Exec(`INSERT INTO cookies (id, project_id, domain, path, name, value)
		VALUES ('c1', 'p1', 'example.com', '/', 'sid', 'legacy')`).Error; err != nil {
		t.Fatal(err)
	}

	migrateUpTo(t, db, 13)

	var jarCount, bindingCount, cookieCount int64
	db.Table("cookie_jars").Where("id = ? AND project_id = ?", "legacy-p1", "p1").Count(&jarCount)
	db.Table("module_cookie_bindings").Where("cookie_jar_id = ? AND environment_id = ''", "legacy-p1").Count(&bindingCount)
	db.Table("cookie_jar_cookies").Where("cookie_jar_id = ? AND name = ? AND value = ?", "legacy-p1", "sid", "legacy").Count(&cookieCount)
	if jarCount != 1 || bindingCount != 2 || cookieCount != 1 {
		t.Fatalf("迁移结果 jar=%d bindings=%d cookies=%d", jarCount, bindingCount, cookieCount)
	}
}
