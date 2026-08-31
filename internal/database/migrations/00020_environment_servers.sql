-- +goose Up
ALTER TABLE modules ADD COLUMN server_id text NOT NULL DEFAULT '';
ALTER TABLE modules ADD COLUMN servers text DEFAULT NULL;
ALTER TABLE folders ADD COLUMN server_id text NOT NULL DEFAULT '';
ALTER TABLE endpoints ADD COLUMN server_id text NOT NULL DEFAULT '';
ALTER TABLE module_base_urls ADD COLUMN websocket_base_url text DEFAULT NULL;
ALTER TABLE module_base_urls ADD COLUMN server_urls text DEFAULT NULL;

-- +goose Down
ALTER TABLE module_base_urls DROP COLUMN server_urls;
ALTER TABLE module_base_urls DROP COLUMN websocket_base_url;
ALTER TABLE endpoints DROP COLUMN server_id;
ALTER TABLE folders DROP COLUMN server_id;
ALTER TABLE modules DROP COLUMN servers;
ALTER TABLE modules DROP COLUMN server_id;
