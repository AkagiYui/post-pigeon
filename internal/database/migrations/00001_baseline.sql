-- +goose Up
-- 基线 schema：与 goose 接管前由 GORM AutoMigrate 生成的结构完全一致，
-- 所有父子外键均为 ON DELETE CASCADE。此文件仅在全新数据库上执行；
-- 历史（无版本管理）数据库由 Initialize 收敛到本基线后直接登记版本，不重跑本文件。
-- 使用 IF NOT EXISTS 保证幂等，便于任何情况下安全执行。

CREATE TABLE IF NOT EXISTS `projects` (`id` text,`name` text NOT NULL,`description` text,`sort_order` integer DEFAULT 0,`created_at` datetime,`updated_at` datetime,PRIMARY KEY (`id`));

CREATE TABLE IF NOT EXISTS `modules` (`id` text,`project_id` text NOT NULL,`name` text NOT NULL,`sort_order` integer DEFAULT 0,`auth_type` text DEFAULT "none",`auth_data` text,`endpoint_display` text DEFAULT "name",`created_at` datetime,`updated_at` datetime,PRIMARY KEY (`id`),CONSTRAINT `fk_projects_modules` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `environments` (`id` text,`project_id` text NOT NULL,`name` text NOT NULL,`created_at` datetime,`updated_at` datetime,PRIMARY KEY (`id`),CONSTRAINT `fk_projects_environments` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `folders` (`id` text,`module_id` text NOT NULL,`parent_id` text,`name` text NOT NULL,`sort_order` integer DEFAULT 0,`auth_type` text DEFAULT "inherit",`auth_data` text,`created_at` datetime,`updated_at` datetime,PRIMARY KEY (`id`),CONSTRAINT `fk_folders_children` FOREIGN KEY (`parent_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE,CONSTRAINT `fk_modules_folders` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `endpoints` (`id` text,`module_id` text NOT NULL,`folder_id` text,`name` text NOT NULL,`type` text DEFAULT "http",`method` text NOT NULL DEFAULT "GET",`path` text NOT NULL DEFAULT "/",`body_type` text DEFAULT "none",`body_content` text,`content_type` text,`timeout` integer DEFAULT 30000,`follow_redirects` numeric DEFAULT true,`doc_content` text,`status` text,`tags` text,`description` text,`inherit_operations` numeric DEFAULT true,`disabled_global_params` text,`pre_request_script` text,`post_response_script` text,`sort_order` integer DEFAULT 0,`created_at` datetime,`updated_at` datetime,PRIMARY KEY (`id`),CONSTRAINT `fk_modules_endpoints` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE,CONSTRAINT `fk_folders_endpoints` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `endpoint_params` (`id` text,`endpoint_id` text NOT NULL,`type` text NOT NULL DEFAULT "query",`name` text NOT NULL,`value` text,`description` text,`enabled` numeric,`data_type` text DEFAULT "string",`required` numeric,`example` text,PRIMARY KEY (`id`),CONSTRAINT `fk_endpoints_params` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `endpoint_body_fields` (`id` text,`endpoint_id` text NOT NULL,`name` text NOT NULL,`value` text,`field_type` text DEFAULT "text",`enabled` numeric,PRIMARY KEY (`id`),CONSTRAINT `fk_endpoints_body_fields` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `endpoint_headers` (`id` text,`endpoint_id` text NOT NULL,`name` text NOT NULL,`value` text,`description` text,`enabled` numeric,`required` numeric,`example` text,PRIMARY KEY (`id`),CONSTRAINT `fk_endpoints_headers` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `endpoint_auths` (`id` text,`endpoint_id` text,`type` text DEFAULT "none",`data` text,PRIMARY KEY (`id`,`endpoint_id`),CONSTRAINT `fk_endpoints_auth` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `responses` (`id` text,`endpoint_id` text NOT NULL,`status_code` integer,`headers` text,`body` text,`content_type` text,`cookies` text,`timing` text,`size` integer,`actual_request` text,`created_at` datetime,PRIMARY KEY (`id`),CONSTRAINT `fk_endpoints_response` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `response_examples` (`id` text,`endpoint_id` text NOT NULL,`name` text NOT NULL,`status_code` integer DEFAULT 200,`content_type` text,`body` text,`sort_order` integer DEFAULT 0,PRIMARY KEY (`id`),CONSTRAINT `fk_endpoints_examples` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `response_schemas` (`id` text,`endpoint_id` text NOT NULL,`name` text,`status_code` integer DEFAULT 200,`content_type` text,`schema` text,`sort_order` integer DEFAULT 0,PRIMARY KEY (`id`),CONSTRAINT `fk_endpoints_schemas` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `module_base_urls` (`id` text,`module_id` text NOT NULL,`environment_id` text NOT NULL,`base_url` text,PRIMARY KEY (`id`),CONSTRAINT `fk_modules_base_urls` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE,CONSTRAINT `fk_environments_base_urls` FOREIGN KEY (`environment_id`) REFERENCES `environments`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `module_params` (`id` text,`module_id` text NOT NULL,`type` text NOT NULL DEFAULT "query",`name` text NOT NULL,`value` text,`description` text,`enabled` numeric,`sort_order` integer DEFAULT 0,PRIMARY KEY (`id`),CONSTRAINT `fk_modules_params` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `environment_variables` (`id` text,`environment_id` text NOT NULL,`key` text NOT NULL,`value` text,`description` text,`enabled` numeric NOT NULL,`sort_order` integer NOT NULL DEFAULT 0,`is_secret` numeric NOT NULL DEFAULT false,PRIMARY KEY (`id`),CONSTRAINT `fk_environments_variables` FOREIGN KEY (`environment_id`) REFERENCES `environments`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `global_variables` (`id` text,`project_id` text NOT NULL,`key` text NOT NULL,`value` text,`description` text,`enabled` numeric NOT NULL DEFAULT true,`sort_order` integer NOT NULL DEFAULT 0,PRIMARY KEY (`id`),CONSTRAINT `fk_projects_global_variables` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `script_libraries` (`id` text,`project_id` text NOT NULL,`name` text NOT NULL,`content` text,`description` text,`sort_order` integer DEFAULT 0,`created_at` datetime,`updated_at` datetime,PRIMARY KEY (`id`),CONSTRAINT `fk_projects_scripts` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `request_histories` (`id` text,`module_id` text NOT NULL,`endpoint_id` text,`method` text NOT NULL,`url` text NOT NULL,`status_code` integer,`timing` text,`size` integer,`request_headers` text,`request_body` text,`response_headers` text,`response_body` text,`content_type` text,`created_at` datetime,PRIMARY KEY (`id`),CONSTRAINT `fk_modules_histories` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE,CONSTRAINT `fk_endpoints_histories` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS `operations` (`id` text,`owner_type` text NOT NULL,`owner_id` text NOT NULL,`stage` text NOT NULL,`type` text NOT NULL,`name` text,`enabled` numeric,`sort_order` integer DEFAULT 0,`data` text,PRIMARY KEY (`id`));

CREATE TABLE IF NOT EXISTS `settings` (`key` text,`value` text,PRIMARY KEY (`key`));

CREATE INDEX IF NOT EXISTS `idx_modules_project_id` ON `modules`(`project_id`);
CREATE INDEX IF NOT EXISTS `idx_environments_project_id` ON `environments`(`project_id`);
CREATE INDEX IF NOT EXISTS `idx_folders_module_id` ON `folders`(`module_id`);
CREATE INDEX IF NOT EXISTS `idx_folders_parent_id` ON `folders`(`parent_id`);
CREATE INDEX IF NOT EXISTS `idx_endpoints_module_id` ON `endpoints`(`module_id`);
CREATE INDEX IF NOT EXISTS `idx_endpoints_folder_id` ON `endpoints`(`folder_id`);
CREATE INDEX IF NOT EXISTS `idx_endpoint_params_endpoint_id` ON `endpoint_params`(`endpoint_id`);
CREATE INDEX IF NOT EXISTS `idx_endpoint_body_fields_endpoint_id` ON `endpoint_body_fields`(`endpoint_id`);
CREATE INDEX IF NOT EXISTS `idx_endpoint_headers_endpoint_id` ON `endpoint_headers`(`endpoint_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_responses_endpoint_id` ON `responses`(`endpoint_id`);
CREATE INDEX IF NOT EXISTS `idx_response_examples_endpoint_id` ON `response_examples`(`endpoint_id`);
CREATE INDEX IF NOT EXISTS `idx_response_schemas_endpoint_id` ON `response_schemas`(`endpoint_id`);
CREATE INDEX IF NOT EXISTS `idx_module_base_urls_module_id` ON `module_base_urls`(`module_id`);
CREATE INDEX IF NOT EXISTS `idx_module_base_urls_environment_id` ON `module_base_urls`(`environment_id`);
CREATE INDEX IF NOT EXISTS `idx_module_params_module_id` ON `module_params`(`module_id`);
CREATE INDEX IF NOT EXISTS `idx_environment_variables_environment_id` ON `environment_variables`(`environment_id`);
CREATE INDEX IF NOT EXISTS `idx_global_variables_project_id` ON `global_variables`(`project_id`);
CREATE INDEX IF NOT EXISTS `idx_script_libraries_project_id` ON `script_libraries`(`project_id`);
CREATE INDEX IF NOT EXISTS `idx_request_histories_module_id` ON `request_histories`(`module_id`);
CREATE INDEX IF NOT EXISTS `idx_request_histories_endpoint_id` ON `request_histories`(`endpoint_id`);
CREATE INDEX IF NOT EXISTS `idx_op_owner` ON `operations`(`owner_type`,`owner_id`);

-- +goose Down
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `operations`;
DROP TABLE IF EXISTS `request_histories`;
DROP TABLE IF EXISTS `script_libraries`;
DROP TABLE IF EXISTS `global_variables`;
DROP TABLE IF EXISTS `environment_variables`;
DROP TABLE IF EXISTS `module_params`;
DROP TABLE IF EXISTS `module_base_urls`;
DROP TABLE IF EXISTS `response_schemas`;
DROP TABLE IF EXISTS `response_examples`;
DROP TABLE IF EXISTS `responses`;
DROP TABLE IF EXISTS `endpoint_auths`;
DROP TABLE IF EXISTS `endpoint_headers`;
DROP TABLE IF EXISTS `endpoint_body_fields`;
DROP TABLE IF EXISTS `endpoint_params`;
DROP TABLE IF EXISTS `endpoints`;
DROP TABLE IF EXISTS `folders`;
DROP TABLE IF EXISTS `environments`;
DROP TABLE IF EXISTS `modules`;
DROP TABLE IF EXISTS `projects`;
