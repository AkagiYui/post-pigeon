-- +goose Up
-- 六项请求配置补齐为 全局 -> 项目 -> 模块 -> 逐层文件夹 -> 接口。
-- timeout_mode 默认 value 是为了兼容用户降级后旧版本新建的数据：旧版本只写 timeout，
-- 新版本再打开时仍把它当作显式值；新版本自身创建记录时会明确写 inherit。
ALTER TABLE `projects` ADD COLUMN `timeout_mode` text DEFAULT 'value';
ALTER TABLE `projects` ADD COLUMN `timeout` integer DEFAULT 0;
ALTER TABLE `projects` ADD COLUMN `follow_redirects` numeric DEFAULT NULL;
ALTER TABLE `projects` ADD COLUMN `send_no_cache_headers` numeric DEFAULT NULL;

ALTER TABLE `modules` ADD COLUMN `proxy_config` text DEFAULT '';
ALTER TABLE `modules` ADD COLUMN `tls_config` text DEFAULT '';
ALTER TABLE `modules` ADD COLUMN `url_encoding` text DEFAULT '';
ALTER TABLE `modules` ADD COLUMN `timeout_mode` text DEFAULT 'value';
ALTER TABLE `modules` ADD COLUMN `timeout` integer DEFAULT 0;
ALTER TABLE `modules` ADD COLUMN `follow_redirects` numeric DEFAULT NULL;
ALTER TABLE `modules` ADD COLUMN `send_no_cache_headers` numeric DEFAULT NULL;

ALTER TABLE `folders` ADD COLUMN `proxy_config` text DEFAULT '';
ALTER TABLE `folders` ADD COLUMN `tls_config` text DEFAULT '';
ALTER TABLE `folders` ADD COLUMN `url_encoding` text DEFAULT '';
ALTER TABLE `folders` ADD COLUMN `timeout_mode` text DEFAULT 'value';
ALTER TABLE `folders` ADD COLUMN `timeout` integer DEFAULT 0;
ALTER TABLE `folders` ADD COLUMN `follow_redirects` numeric DEFAULT NULL;
ALTER TABLE `folders` ADD COLUMN `send_no_cache_headers` numeric DEFAULT NULL;

ALTER TABLE `endpoints` ADD COLUMN `timeout_mode` text DEFAULT 'value';
ALTER TABLE `endpoints` ADD COLUMN `send_no_cache_headers` numeric DEFAULT NULL;

-- 项目/模块/文件夹在旧版本中不存在超时设置，迁移后应继承；接口原有 timeout 是显式值。
UPDATE `projects` SET `timeout_mode` = '';
UPDATE `modules` SET `timeout_mode` = '';
UPDATE `folders` SET `timeout_mode` = '';

-- URL 自动编码原来只有项目和接口，补模块与文件夹列即可。

-- +goose Down
ALTER TABLE `endpoints` DROP COLUMN `send_no_cache_headers`;
ALTER TABLE `endpoints` DROP COLUMN `timeout_mode`;

ALTER TABLE `folders` DROP COLUMN `send_no_cache_headers`;
ALTER TABLE `folders` DROP COLUMN `follow_redirects`;
ALTER TABLE `folders` DROP COLUMN `timeout`;
ALTER TABLE `folders` DROP COLUMN `timeout_mode`;
ALTER TABLE `folders` DROP COLUMN `url_encoding`;
ALTER TABLE `folders` DROP COLUMN `tls_config`;
ALTER TABLE `folders` DROP COLUMN `proxy_config`;

ALTER TABLE `modules` DROP COLUMN `send_no_cache_headers`;
ALTER TABLE `modules` DROP COLUMN `follow_redirects`;
ALTER TABLE `modules` DROP COLUMN `timeout`;
ALTER TABLE `modules` DROP COLUMN `timeout_mode`;
ALTER TABLE `modules` DROP COLUMN `url_encoding`;
ALTER TABLE `modules` DROP COLUMN `tls_config`;
ALTER TABLE `modules` DROP COLUMN `proxy_config`;

ALTER TABLE `projects` DROP COLUMN `send_no_cache_headers`;
ALTER TABLE `projects` DROP COLUMN `follow_redirects`;
ALTER TABLE `projects` DROP COLUMN `timeout`;
ALTER TABLE `projects` DROP COLUMN `timeout_mode`;
