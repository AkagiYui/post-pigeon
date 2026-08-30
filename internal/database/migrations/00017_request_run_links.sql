-- +goose Up
-- 最近响应与历史记录只保存执行链引用；删除历史不会删除 run，删除 run 则清空引用。
ALTER TABLE `responses` ADD COLUMN `request_run_id` text
  REFERENCES `request_runs`(`id`) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS `idx_responses_request_run_id` ON `responses` (`request_run_id`);

ALTER TABLE `request_histories` ADD COLUMN `request_run_id` text
  REFERENCES `request_runs`(`id`) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS `idx_request_histories_request_run_id`
  ON `request_histories` (`request_run_id`);

-- +goose Down
DROP INDEX IF EXISTS `idx_request_histories_request_run_id`;
ALTER TABLE `request_histories` DROP COLUMN `request_run_id`;
DROP INDEX IF EXISTS `idx_responses_request_run_id`;
ALTER TABLE `responses` DROP COLUMN `request_run_id`;
