package apperr

// 错误码常量。每个错误码在前端 i18n 的 error 命名空间下都有对应词条
// （zh-CN.json / en.json 的 error.<code>），新增错误码时必须同步补齐两侧词条。
const (
	// ---- 通用 ----
	CodeNotFound      = "common.not_found"
	CodeInvalidInput  = "common.invalid_input"
	CodeDatabase      = "common.database"
	CodeSerialization = "common.serialization"

	// ---- HTTP 请求 ----
	CodeInvalidURL        = "http.invalid_url"
	CodeBuildRequest      = "http.build_request"
	CodeSendRequest       = "http.send_request"
	CodeReadResponse      = "http.read_response"
	CodeRequestTimeout    = "http.timeout"
	CodeRequestCanceled   = "http.canceled"
	CodeResponseTooLarge  = "http.response_too_large"
	CodeBuildBody         = "http.build_body"
	CodeAuthConfigInvalid = "http.auth_config_invalid"
	CodeTLSConfigInvalid  = "http.tls_config_invalid"
	// CodeRequestFileMissing 请求体引用的本地文件读不到（被移走、删掉或换了台机器）
	CodeRequestFileMissing = "http.file_missing"

	// ---- WebSocket ----
	CodeWSConnect      = "ws.connect"
	CodeWSSend         = "ws.send"
	CodeWSNotConnected = "ws.not_connected"

	// ---- 导入导出 ----
	CodeImportParse       = "importexport.parse"
	CodeImportFailed      = "importexport.import_failed"
	CodeExportFailed      = "importexport.export_failed"
	CodeUnsupportedFormat = "importexport.unsupported_format"
	// CodeImportFetch 从 URL 拉取待导入文档失败（网络不通 / 非 2xx 响应）
	CodeImportFetch = "importexport.fetch_failed"

	// ---- 领域对象 ----
	CodeProjectNotFound     = "project.not_found"
	CodeProjectCreate       = "project.create_failed"
	CodeProjectUpdate       = "project.update_failed"
	CodeProjectDelete       = "project.delete_failed"
	CodeModuleNotFound      = "module.not_found"
	CodeFolderNotFound      = "folder.not_found"
	CodeEndpointNotFound    = "endpoint.not_found"
	CodeEndpointSave        = "endpoint.save_failed"
	CodeEnvironmentNotFound = "environment.not_found"
	CodeEnvironmentSave     = "environment.save_failed"
	CodeScriptNotFound      = "script.not_found"
	CodeHistoryNotFound     = "history.not_found"

	// ---- 集合运行 ----
	CodeRunnerNoTargets = "runner.no_targets"
	CodeRunnerFailed    = "runner.failed"

	// ---- 自动更新 ----
	CodeUpdateDisabled  = "update.disabled"
	CodeUpdateCheck     = "update.check_failed"
	CodeUpdateDownload  = "update.download_failed"
	CodeUpdateNotReady  = "update.not_ready"
	CodeUpdateRestart   = "update.restart_failed"
	CodeUpdateChangelog = "update.changelog_failed"

	// ---- 数据维护 ----
	CodeDataStats   = "data.stats_failed"
	CodeDataCompact = "data.compact_failed"
	CodeDataExport  = "data.export_failed"
	CodeDataRestore = "data.restore_failed"
	CodeDataOpenDir = "data.open_dir_failed"
)
