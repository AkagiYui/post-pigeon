-- +goose Up
-- 按项目持久化 Cookie：让「先登录再调后续接口」的会话在请求之间保持。
-- (project_id, domain, path, name) 唯一，对应 RFC 6265 中 cookie 的身份。
CREATE TABLE IF NOT EXISTS `cookies` (
  `id`         text NOT NULL,
  `project_id` text NOT NULL,
  `domain`     text NOT NULL,
  `path`       text NOT NULL DEFAULT '/',
  `name`       text NOT NULL,
  `value`      text,
  `secure`     numeric,
  `http_only`  numeric,
  `same_site`  text,
  `expires`    datetime,
  `created_at` datetime,
  `updated_at` datetime,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cookies_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_cookie_scope`
  ON `cookies` (`project_id`, `domain`, `path`, `name`);

-- +goose Down
DROP INDEX IF EXISTS `idx_cookie_scope`;
DROP TABLE IF EXISTS `cookies`;
