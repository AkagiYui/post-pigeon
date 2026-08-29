-- +goose Up
-- URL 自动编码沿用代理 / TLS 的三级模型：项目级存于 projects.url_encoding、
-- 接口级存于 endpoints.url_encoding（均为 URLEncodingMode 字符串，
-- 空字符串表示跟随上一级）。全局级存于 settings 键值表（request 里的 urlEncoding
-- 字段），无需新增列。
ALTER TABLE `projects` ADD COLUMN `url_encoding` text DEFAULT '';
ALTER TABLE `endpoints` ADD COLUMN `url_encoding` text DEFAULT '';

-- +goose Down
ALTER TABLE `endpoints` DROP COLUMN `url_encoding`;
ALTER TABLE `projects` DROP COLUMN `url_encoding`;
