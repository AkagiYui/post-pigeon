-- +goose Up
-- Cookie 从项目级单 Jar 升级为可命名的 Jar：模块默认私有，也可显式跨模块共享；
-- environment_id 为空是模块默认绑定，非空则覆盖特定环境，cookie_jar_id 为 NULL 表示禁用。
CREATE TABLE IF NOT EXISTS `cookie_jars` (
  `id`         text NOT NULL,
  `project_id` text NOT NULL,
  `name`       text NOT NULL,
  `created_at` datetime,
  `updated_at` datetime,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cookie_jars_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_cookie_jars_project_id` ON `cookie_jars` (`project_id`);

CREATE TABLE IF NOT EXISTS `module_cookie_bindings` (
  `id`             text NOT NULL,
  `module_id`      text NOT NULL,
  `environment_id` text NOT NULL DEFAULT '',
  `cookie_jar_id`  text,
  `created_at`     datetime,
  `updated_at`     datetime,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_module_cookie_bindings_module` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_module_cookie_bindings_cookie_jar` FOREIGN KEY (`cookie_jar_id`) REFERENCES `cookie_jars`(`id`) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_module_cookie_binding`
  ON `module_cookie_bindings` (`module_id`, `environment_id`);
CREATE INDEX IF NOT EXISTS `idx_module_cookie_bindings_cookie_jar_id`
  ON `module_cookie_bindings` (`cookie_jar_id`);

CREATE TABLE IF NOT EXISTS `cookie_jar_cookies` (
  `id`            text NOT NULL,
  `cookie_jar_id` text NOT NULL,
  `domain`        text NOT NULL,
  `path`          text NOT NULL DEFAULT '/',
  `name`          text NOT NULL,
  `value`         text,
  `secure`        numeric,
  `http_only`     numeric,
  `host_only`     numeric,
  `same_site`     text,
  `expires`       datetime,
  `created_at`    datetime,
  `updated_at`    datetime,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cookie_jar_cookies_cookie_jar` FOREIGN KEY (`cookie_jar_id`) REFERENCES `cookie_jars`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_cookie_jar_scope`
  ON `cookie_jar_cookies` (`cookie_jar_id`, `domain`, `path`, `name`);

-- 兼容迁移：每个老项目得到一份共享 Jar，所有既有模块先绑定它，行为不突变。
INSERT OR IGNORE INTO `cookie_jars` (`id`, `project_id`, `name`, `created_at`, `updated_at`)
SELECT 'legacy-' || `id`, `id`, '旧版项目共享会话', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM `projects`;

INSERT OR IGNORE INTO `module_cookie_bindings`
  (`id`, `module_id`, `environment_id`, `cookie_jar_id`, `created_at`, `updated_at`)
SELECT 'legacy-binding-' || `id`, `id`, '', 'legacy-' || `project_id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `modules`;

INSERT OR IGNORE INTO `cookie_jar_cookies`
  (`id`, `cookie_jar_id`, `domain`, `path`, `name`, `value`, `secure`, `http_only`, `host_only`, `same_site`, `expires`, `created_at`, `updated_at`)
SELECT `id`, 'legacy-' || `project_id`, `domain`, `path`, `name`, `value`, `secure`, `http_only`, 0, `same_site`, `expires`, `created_at`, `updated_at`
FROM `cookies`;

-- +goose Down
DROP INDEX IF EXISTS `idx_cookie_jar_scope`;
DROP TABLE IF EXISTS `cookie_jar_cookies`;
DROP INDEX IF EXISTS `idx_module_cookie_bindings_cookie_jar_id`;
DROP INDEX IF EXISTS `idx_module_cookie_binding`;
DROP TABLE IF EXISTS `module_cookie_bindings`;
DROP INDEX IF EXISTS `idx_cookie_jars_project_id`;
DROP TABLE IF EXISTS `cookie_jars`;
