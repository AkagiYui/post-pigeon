-- +goose Up
-- configured_request 保留用户点击发送时的编辑态，和 prepared/sent 形成三阶段对照。
ALTER TABLE `request_runs` ADD COLUMN `configured_request` text;

-- +goose Down
ALTER TABLE `request_runs` DROP COLUMN `configured_request`;
