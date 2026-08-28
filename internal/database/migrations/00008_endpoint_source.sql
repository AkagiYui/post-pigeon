-- +goose Up
-- 记录接口的导入来源与其在来源系统里的稳定标识（Apifox 接口 ID / OpenAPI operationId）。
-- 重复导入时可据此精确认出「还是那条接口」，改名、改路径、挪目录都不影响。
-- 两列都可空：手工创建的接口、以及来源不提供标识的文件都留空，此时回退到
-- 「方法 + 路径」这类启发式匹配。
ALTER TABLE `endpoints` ADD COLUMN `source` text;
ALTER TABLE `endpoints` ADD COLUMN `source_id` text;

CREATE INDEX IF NOT EXISTS `idx_endpoints_source` ON `endpoints`(`source`);
CREATE INDEX IF NOT EXISTS `idx_endpoints_source_id` ON `endpoints`(`source_id`);

-- +goose Down
DROP INDEX IF EXISTS `idx_endpoints_source_id`;
DROP INDEX IF EXISTS `idx_endpoints_source`;
