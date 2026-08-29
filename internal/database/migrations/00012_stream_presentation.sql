-- +goose Up
-- 每个接口保存自己的流式响应展示偏好。默认值刻意保持发布前行为：
-- 分条展示、自动识别协议、不使用 JSONPath、不渲染 Markdown。
ALTER TABLE `endpoints` ADD COLUMN `stream_view_mode` text DEFAULT 'timeline';
ALTER TABLE `endpoints` ADD COLUMN `stream_completion_format` text DEFAULT 'auto';
ALTER TABLE `endpoints` ADD COLUMN `stream_json_path` text DEFAULT '';
ALTER TABLE `endpoints` ADD COLUMN `stream_render_markdown` numeric DEFAULT 0;

-- +goose Down
ALTER TABLE `endpoints` DROP COLUMN `stream_render_markdown`;
ALTER TABLE `endpoints` DROP COLUMN `stream_json_path`;
ALTER TABLE `endpoints` DROP COLUMN `stream_completion_format`;
ALTER TABLE `endpoints` DROP COLUMN `stream_view_mode`;
