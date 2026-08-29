package database

import "gorm.io/gorm"

// migrateNamedCookieJars 补齐 goose 之前历史库的数据迁移。
// adoptLegacyDB 会先用 AutoMigrate 创建新表，再调用这里；版本化数据库则由 00013 SQL 完成同样工作。
func migrateNamedCookieJars(db *gorm.DB) error {
	statements := []string{
		`INSERT OR IGNORE INTO cookie_jars (id, project_id, name, created_at, updated_at)
		 SELECT 'legacy-' || id, id, '旧版项目共享会话', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM projects`,
		`INSERT OR IGNORE INTO module_cookie_bindings
		 (id, module_id, environment_id, cookie_jar_id, created_at, updated_at)
		 SELECT 'legacy-binding-' || id, id, '', 'legacy-' || project_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
		 FROM modules`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			return err
		}
	}
	if db.Migrator().HasTable("cookies") {
		if err := db.Exec(`INSERT OR IGNORE INTO cookie_jar_cookies
			(id, cookie_jar_id, domain, path, name, value, secure, http_only, host_only, same_site, expires, created_at, updated_at)
			SELECT id, 'legacy-' || project_id, domain, path, name, value, secure, http_only, 0, same_site, expires, created_at, updated_at
			FROM cookies`).Error; err != nil {
			return err
		}
	}
	return nil
}
