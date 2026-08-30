-- +goose Up
-- 表单请求体字段与 Apifox/OpenAPI 的参数模型对齐；全部为可空或带默认值的增量列，
-- 旧版本仍可继续只读写 name/value/field_type/enabled。
ALTER TABLE `endpoint_body_fields` ADD COLUMN `data_type` text;
ALTER TABLE `endpoint_body_fields` ADD COLUMN `description` text;
ALTER TABLE `endpoint_body_fields` ADD COLUMN `required` numeric DEFAULT false;
ALTER TABLE `endpoint_body_fields` ADD COLUMN `content_type` text;
ALTER TABLE `endpoint_body_fields` ADD COLUMN `schema` text;
ALTER TABLE `endpoint_body_fields` ADD COLUMN `style` text;
ALTER TABLE `endpoint_body_fields` ADD COLUMN `explode` numeric;
ALTER TABLE `endpoint_body_fields` ADD COLUMN `sort_order` integer DEFAULT 0;

-- +goose Down
ALTER TABLE `endpoint_body_fields` DROP COLUMN `sort_order`;
ALTER TABLE `endpoint_body_fields` DROP COLUMN `explode`;
ALTER TABLE `endpoint_body_fields` DROP COLUMN `style`;
ALTER TABLE `endpoint_body_fields` DROP COLUMN `schema`;
ALTER TABLE `endpoint_body_fields` DROP COLUMN `content_type`;
ALTER TABLE `endpoint_body_fields` DROP COLUMN `required`;
ALTER TABLE `endpoint_body_fields` DROP COLUMN `description`;
ALTER TABLE `endpoint_body_fields` DROP COLUMN `data_type`;
