-- +goose Up
-- TLS 设置沿用代理的三级模型：项目级存于 projects.tls_settings（ScopeTLSSettings 的 JSON，
-- 空字符串表示跟随全局）；接口级存于 endpoints.tls_config（EndpointTLS 的 JSON，
-- 空字符串表示 inherit）。全局级存于 settings 键值表（tls.global），无需新增列。
ALTER TABLE `projects` ADD COLUMN `tls_settings` text DEFAULT '';
ALTER TABLE `endpoints` ADD COLUMN `tls_config` text DEFAULT '';

-- +goose Down
ALTER TABLE `endpoints` DROP COLUMN `tls_config`;
ALTER TABLE `projects` DROP COLUMN `tls_settings`;
