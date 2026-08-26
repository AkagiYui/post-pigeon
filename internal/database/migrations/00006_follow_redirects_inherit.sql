-- +goose Up
-- 接口级「跟随重定向」改为三态：NULL 表示继承上级（目前只有全局设置），显式 0/1 才覆盖。
-- 历史行里的 1 是老的隐式默认值而非用户的显式选择，统一收敛为 NULL；
-- 全局开关默认开启，因此这些接口的实际行为不变。显式关掉的 0 保留。
UPDATE `endpoints` SET `follow_redirects` = NULL WHERE `follow_redirects` = 1;

-- +goose Down
-- 回到二态：继承按老的默认值 true 还原。
UPDATE `endpoints` SET `follow_redirects` = 1 WHERE `follow_redirects` IS NULL;
