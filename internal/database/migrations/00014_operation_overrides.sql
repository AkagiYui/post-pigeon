-- +goose Up
-- 文件夹/接口可以逐条覆盖继承操作的启用状态；删除源操作时自动清理覆盖记录。
CREATE TABLE IF NOT EXISTS `operation_overrides` (
  `id`           text NOT NULL,
  `owner_type`   text NOT NULL,
  `owner_id`     text NOT NULL,
  `operation_id` text NOT NULL,
  `enabled`      numeric NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_operation_overrides_operation`
    FOREIGN KEY (`operation_id`) REFERENCES `operations`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_operation_override`
  ON `operation_overrides` (`owner_type`, `owner_id`, `operation_id`);
CREATE INDEX IF NOT EXISTS `idx_operation_overrides_operation_id`
  ON `operation_overrides` (`operation_id`);

-- +goose Down
DROP INDEX IF EXISTS `idx_operation_overrides_operation_id`;
DROP INDEX IF EXISTS `idx_operation_override`;
DROP TABLE IF EXISTS `operation_overrides`;
