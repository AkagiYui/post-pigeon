-- +goose Up
-- 模块级变量：作用域缩小到单个模块的「全局变量」，跨环境生效。
-- 解析优先级：环境变量 > 模块变量 > 全局变量。
-- 表结构与 environment_variables 对齐（同一套编辑器与脱敏逻辑）。
CREATE TABLE IF NOT EXISTS `module_variables` (
  `id`          text,
  `module_id`   text NOT NULL,
  `key`         text NOT NULL,
  `value`       text,
  `description` text,
  `enabled`     numeric NOT NULL,
  `sort_order`  integer NOT NULL DEFAULT 0,
  `is_secret`   numeric NOT NULL DEFAULT false,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_modules_variables` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_module_variables_module_id` ON `module_variables`(`module_id`);

-- +goose Down
DROP INDEX IF EXISTS `idx_module_variables_module_id`;
DROP TABLE IF EXISTS `module_variables`;
