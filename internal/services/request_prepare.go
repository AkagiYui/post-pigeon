package services

import (
	"log/slog"
	"maps"
	"strings"

	"PostPigeon/internal/models"
	"PostPigeon/internal/scripting"
)

// preparedRequestData 是 HTTP 请求与 WebSocket 握手共用的请求编辑态解析结果。
// 两种协议在真正发出请求前都应使用相同的变量作用域、模块自动参数、继承操作与作用域链。
type preparedRequestData struct {
	environmentService *EnvironmentService
	stores             scripting.Stores
	loadedEndpoint     *models.Endpoint
	path               requestScopePath
}

// prepareRequestData 补齐请求编辑器的公共语义：
//   - 全局变量 < 模块变量 < 环境变量；
//   - 已保存端点的继承操作；
//   - 模块级 query/cookie/header 自动参数；
//   - 接口对模块 query 参数的禁用覆盖；
//   - 接口 -> 文件夹 -> 模块 -> 项目作用域链。
//
// data 会被原地补齐，调用方随后再执行前置脚本并解析 URL、请求头与认证。
func (s *HTTPService) prepareRequestData(data *SendRequestData) preparedRequestData {
	envService := NewEnvironmentService(s.db)

	globalVars := s.loadGlobalVars(data.ModuleID)
	moduleVars := s.loadModuleVars(data.ModuleID)
	envVars := map[string]string{}
	maps.Copy(envVars, globalVars)
	maps.Copy(envVars, moduleVars)
	if data.EnvironmentID != "" {
		if variables, err := envService.GetEnvironmentVariables(data.EnvironmentID); err == nil {
			for _, variable := range variables {
				if variable.Enabled {
					envVars[variable.Key] = variable.Value
				}
			}
		} else {
			slog.Warn("载入环境变量失败", "error", err)
		}
	}
	stores := scripting.Stores{
		Environment: scripting.NewVarStore(envVars),
		Globals:     scripting.NewVarStore(globalVars),
		Collection:  scripting.NewVarStore(moduleVars),
	}

	var loadedEndpoint *models.Endpoint
	if data.EndpointID != "" {
		var endpoint models.Endpoint
		if err := s.db.Where("id = ?", data.EndpointID).First(&endpoint).Error; err == nil {
			loadedEndpoint = &endpoint
			if data.Operations != nil || data.InheritOperations != nil {
				effectiveEndpoint := endpoint
				if data.InheritOperations != nil {
					effectiveEndpoint.InheritOperations = *data.InheritOperations
				}
				effectiveEndpoint.PreRequestScript = data.PreRequestScript
				effectiveEndpoint.PostResponseScript = data.PostResponseScript
				data.PreRequestScript = composeStageScriptWithEndpointStatePhase(
					s.db, &effectiveEndpoint, models.OperationStagePre, data.Operations, data.OperationOverrides, "beforeVariables")
				data.PreSendScript = composeStageScriptWithEndpointStatePhase(
					s.db, &effectiveEndpoint, models.OperationStagePre, data.Operations, data.OperationOverrides, "afterVariables")
				data.PostResponseScript = composeStageScriptWithEndpointState(
					s.db, &effectiveEndpoint, models.OperationStagePost, data.Operations, data.OperationOverrides)
			} else {
				data.PreRequestScript = composeStageScriptWithEndpointStatePhase(s.db, &endpoint, models.OperationStagePre, nil, nil, "beforeVariables")
				data.PreSendScript = composeStageScriptWithEndpointStatePhase(s.db, &endpoint, models.OperationStagePre, nil, nil, "afterVariables")
				data.PostResponseScript = composeStageScript(s.db, &endpoint, models.OperationStagePost)
			}
		}
	}

	moduleParams, moduleHeaders := s.loadModuleParams(data.ModuleID)
	if loadedEndpoint != nil {
		disabledRaw := loadedEndpoint.DisabledGlobalParams
		if strings.TrimSpace(data.DisabledGlobalParams) != "" {
			disabledRaw = data.DisabledGlobalParams
		}
		if disabled := parseNameSet(disabledRaw); len(disabled) > 0 {
			kept := moduleParams[:0]
			for _, param := range moduleParams {
				if param.Type == "query" && disabled[param.Name] {
					continue
				}
				kept = append(kept, param)
			}
			moduleParams = kept
		}
	}
	data.Params = append(data.Params, moduleParams...)
	data.Headers = append(data.Headers, moduleHeaders...)

	requestEndpoint := models.Endpoint{ModuleID: data.ModuleID}
	if loadedEndpoint != nil {
		requestEndpoint = *loadedEndpoint
	}
	return preparedRequestData{
		environmentService: envService,
		stores:             stores,
		loadedEndpoint:     loadedEndpoint,
		path:               loadRequestScopePath(s.db, requestEndpoint),
	}
}
