-- +goose Up
-- WebSocket 的 HTTP(S) → WS(S) 协议头自动转换采用五级继承：
-- 全局存于 settings.request.autoConvertWsProtocol；其余四级存字符串档位，
-- 空字符串表示继承上级，on/off 表示显式开关。
ALTER TABLE `projects` ADD COLUMN `ws_protocol_conversion` text DEFAULT '';
ALTER TABLE `modules` ADD COLUMN `ws_protocol_conversion` text DEFAULT '';
ALTER TABLE `folders` ADD COLUMN `ws_protocol_conversion` text DEFAULT '';
ALTER TABLE `endpoints` ADD COLUMN `ws_protocol_conversion` text DEFAULT '';

-- +goose Down
ALTER TABLE `endpoints` DROP COLUMN `ws_protocol_conversion`;
ALTER TABLE `folders` DROP COLUMN `ws_protocol_conversion`;
ALTER TABLE `modules` DROP COLUMN `ws_protocol_conversion`;
ALTER TABLE `projects` DROP COLUMN `ws_protocol_conversion`;
