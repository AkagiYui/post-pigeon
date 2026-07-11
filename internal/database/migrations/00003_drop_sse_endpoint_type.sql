-- +goose Up
-- SSE 不再是独立的端点类型：它只是「响应体为 text/event-stream 的流式 HTTP 响应」。
-- 将历史遗留的 sse 类型端点统一并入普通 http 端点（流式与否完全由响应决定）。
UPDATE `endpoints` SET `type` = 'http' WHERE `type` = 'sse';

-- +goose Down
-- 无法可靠区分哪些 http 端点原为 sse，向下迁移不还原。
SELECT 1;
