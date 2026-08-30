-- +goose Up
-- 一次“发送”可能包含初始请求、重定向、认证挑战重发和流式重连。
-- 以 run + attempt 保存不可变执行链，替代无法表达多次网络请求的 actual_request 单对象。
CREATE TABLE IF NOT EXISTS `request_runs` (
  `id`                  text NOT NULL,
  `module_id`           text NOT NULL,
  `endpoint_id`         text,
  `outcome`             text NOT NULL,
  `prepared_request`    text,
  `selected_attempt_id` text,
  `error_info`          text,
  `started_at`          datetime NOT NULL,
  `completed_at`        datetime,
  `created_at`          datetime,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_request_runs_module`
    FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_request_runs_endpoint`
    FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_request_runs_module_id` ON `request_runs` (`module_id`);
CREATE INDEX IF NOT EXISTS `idx_request_runs_endpoint_id` ON `request_runs` (`endpoint_id`);
CREATE INDEX IF NOT EXISTS `idx_request_runs_outcome` ON `request_runs` (`outcome`);
CREATE INDEX IF NOT EXISTS `idx_request_runs_started_at` ON `request_runs` (`started_at`);
CREATE INDEX IF NOT EXISTS `idx_request_runs_selected_attempt_id` ON `request_runs` (`selected_attempt_id`);

CREATE TABLE IF NOT EXISTS `request_attempts` (
  `id`                text NOT NULL,
  `run_id`            text NOT NULL,
  `sequence`          integer NOT NULL,
  `cause`             text NOT NULL,
  `parent_attempt_id` text,
  `request`           text NOT NULL,
  `response`          text,
  `transport`         text NOT NULL,
  `error_info`        text,
  `started_at`        datetime NOT NULL,
  `completed_at`      datetime,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_request_attempts_run`
    FOREIGN KEY (`run_id`) REFERENCES `request_runs`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_request_attempt_run_sequence`
  ON `request_attempts` (`run_id`, `sequence`);
CREATE INDEX IF NOT EXISTS `idx_request_attempts_run_id` ON `request_attempts` (`run_id`);
CREATE INDEX IF NOT EXISTS `idx_request_attempts_parent_attempt_id`
  ON `request_attempts` (`parent_attempt_id`);

-- +goose Down
DROP INDEX IF EXISTS `idx_request_attempts_parent_attempt_id`;
DROP INDEX IF EXISTS `idx_request_attempts_run_id`;
DROP INDEX IF EXISTS `idx_request_attempt_run_sequence`;
DROP TABLE IF EXISTS `request_attempts`;
DROP INDEX IF EXISTS `idx_request_runs_selected_attempt_id`;
DROP INDEX IF EXISTS `idx_request_runs_started_at`;
DROP INDEX IF EXISTS `idx_request_runs_outcome`;
DROP INDEX IF EXISTS `idx_request_runs_endpoint_id`;
DROP INDEX IF EXISTS `idx_request_runs_module_id`;
DROP TABLE IF EXISTS `request_runs`;
