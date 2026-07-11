-- +goose Up
-- 代理设置：项目级代理设置存于 projects.proxy_settings（ScopeProxySettings 的 JSON，
-- 空字符串表示跟随全局）；接口级代理选择存于 endpoints.proxy_config（EndpointProxy 的 JSON，
-- 空字符串表示 inherit 跟随项目）。全局级代理设置存于 settings 键值表，无需新增列。
ALTER TABLE `projects` ADD COLUMN `proxy_settings` text DEFAULT '';
ALTER TABLE `endpoints` ADD COLUMN `proxy_config` text DEFAULT '';

-- +goose Down
ALTER TABLE `endpoints` DROP COLUMN `proxy_config`;
ALTER TABLE `projects` DROP COLUMN `proxy_settings`;
