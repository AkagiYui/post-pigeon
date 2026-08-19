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

	// ---- WebSocket ----
	CodeWSConnect      = "ws.connect"
	CodeWSSend         = "ws.send"
	CodeWSNotConnected = "ws.not_connected"

	// ---- 导入导出 ----
	CodeImportParse       = "importexport.parse"
	CodeImportFailed      = "importexport.import_failed"
	CodeExportFailed      = "importexport.export_failed"
	CodeUnsupportedFormat = "importexport.unsupported_format"

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
)
