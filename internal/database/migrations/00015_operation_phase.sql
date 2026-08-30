-- +goose Up
-- 前置操作可位于“变量替换”分界线之前或之后；空值兼容旧数据，等价于替换前。
ALTER TABLE `operations` ADD COLUMN `phase` text NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE `operations` DROP COLUMN `phase`;
