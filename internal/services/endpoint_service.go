package services

import (
	"PostPigeon/internal/models"
	"encoding/json"
	"fmt"
	"log/slog"

	"gorm.io/gorm"
)

// EndpointService 端点管理服务
type EndpointService struct {
	db *gorm.DB
}

// OperationSource 是操作编辑器“从其他接口/文件夹导入”的候选来源。
type OperationSource struct {
	OwnerType  string             `json:"ownerType"`
	OwnerID    string             `json:"ownerId"`
	Name       string             `json:"name"`
	Operations []models.Operation `json:"operations"`
}

// ListOperationSources 列出项目内在指定阶段拥有本地操作的模块、文件夹和接口。
func (s *EndpointService) ListOperationSources(projectID, stage string) ([]OperationSource, error) {
	var modules []models.Module
	if err := s.db.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&modules).Error; err != nil {
		return nil, err
	}
	result := make([]OperationSource, 0)
	for _, module := range modules {
		appendSource := func(ownerType models.OperationOwnerType, ownerID, name string) {
			ops := loadOperations(s.db, ownerType, ownerID, models.OperationStage(stage))
			if len(ops) > 0 {
				result = append(result, OperationSource{OwnerType: string(ownerType), OwnerID: ownerID, Name: name, Operations: ops})
			}
		}
		appendSource(models.OperationOwnerModule, module.ID, module.Name)
		var folders []models.Folder
		s.db.Where("module_id = ?", module.ID).Order("sort_order ASC").Find(&folders)
		for _, folder := range folders {
			if folder.Name != "__root" {
				appendSource(models.OperationOwnerFolder, folder.ID, module.Name+" / "+folder.Name)
			}
		}
		var endpoints []models.Endpoint
		s.db.Where("module_id = ?", module.ID).Order("sort_order ASC").Find(&endpoints)
		for _, endpoint := range endpoints {
			appendSource(models.OperationOwnerEndpoint, endpoint.ID, module.Name+" / "+endpoint.Name)
		}
	}
	return result, nil
}

// NewEndpointService 创建端点服务实例
func NewEndpointService(db *gorm.DB) *EndpointService {
	return &EndpointService{db: db}
}

// EndpointDetail 端点完整详情（包含所有关联数据）
type EndpointDetail struct {
	models.Endpoint
	// InheritedWSProtocolConversion 是不考虑接口自身覆盖时，由父级链计算出的结果。
	InheritedWSProtocolConversion bool `json:"inheritedWsProtocolConversion"`
	// HasInheritedAuth 表示不考虑接口自身覆盖时，文件夹/模块链上是否存在会实际生效的认证。
	HasInheritedAuth    bool                       `json:"hasInheritedAuth"`
	Params              []models.EndpointParam     `json:"params"`
	BodyFields          []models.EndpointBodyField `json:"bodyFields"`
	Headers             []models.EndpointHeader    `json:"headers"`
	Auth                *models.EndpointAuth       `json:"auth"`
	Response            *models.Response           `json:"response"`
	Operations          []models.Operation         `json:"operations"`
	InheritedOperations []InheritedOperation       `json:"inheritedOperations"`
	OperationOverrides  []models.OperationOverride `json:"operationOverrides"`
	Examples            []models.ResponseExample   `json:"examples"`
	Schemas             []models.ResponseSchema    `json:"schemas"`
}

// GetEndpoint 获取端点完整详情
func (s *EndpointService) GetEndpoint(id string) (*EndpointDetail, error) {
	var endpoint models.Endpoint
	if err := s.db.Where("id = ?", id).First(&endpoint).Error; err != nil {
		return nil, fmt.Errorf("获取端点失败: %w", err)
	}

	inheritedAuth := resolveEffectiveAuth(s.db, &endpoint, nil)
	detail := &EndpointDetail{
		Endpoint:                      endpoint,
		InheritedWSProtocolConversion: resolveEffectiveWSProtocolConversion(s.db, endpoint, "inherit"),
		HasInheritedAuth:              inheritedAuth != nil && isConcreteAuth(inheritedAuth.Type),
	}

	// 加载参数、请求体字段、请求头
	// 注意：这三张子表没有 created_at 字段，不能按其排序，否则 SQLite 报错且静默返回 0 行；
	// 默认按 rowid（插入顺序）返回即可，与用户编辑顺序一致
	s.db.Where("endpoint_id = ?", id).Find(&detail.Params)
	s.db.Where("endpoint_id = ?", id).Find(&detail.BodyFields)
	s.db.Where("endpoint_id = ?", id).Find(&detail.Headers)

	// 加载认证信息（无记录时保持 nil，避免返回空对象误导前端）
	var auth models.EndpointAuth
	if err := s.db.Where("endpoint_id = ?", id).First(&auth).Error; err == nil {
		detail.Auth = &auth
	}
	// 加载最后一次响应（无记录时保持 nil）
	var resp models.Response
	if err := s.db.Preload("RequestRun.Attempts", func(tx *gorm.DB) *gorm.DB {
		return tx.Order("sequence ASC")
	}).Where("endpoint_id = ?", id).First(&resp).Error; err == nil {
		detail.Response = &resp
	}

	// 加载前置/后置操作、响应示例、响应定义
	s.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerEndpoint, id).
		Order("stage ASC, sort_order ASC").Find(&detail.Operations)
	detail.InheritedOperations = inheritedOperationsForEndpoint(s.db, &endpoint)
	s.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerEndpoint, id).
		Find(&detail.OperationOverrides)
	s.db.Where("endpoint_id = ?", id).Order("sort_order ASC").Find(&detail.Examples)
	s.db.Where("endpoint_id = ?", id).Order("sort_order ASC").Find(&detail.Schemas)

	return detail, nil
}

// CreateEndpoint 创建新端点
func (s *EndpointService) CreateEndpoint(moduleID string, folderID *string, name string, method string, path string) (*models.Endpoint, error) {
	// 获取当前最大排序号
	var maxSort int
	query := s.db.Model(&models.Endpoint{}).Where("module_id = ?", moduleID)
	if folderID != nil {
		query = query.Where("folder_id = ?", *folderID)
	} else {
		query = query.Where("folder_id IS NULL")
	}
	query.Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	endpoint := &models.Endpoint{
		ModuleID:  moduleID,
		FolderID:  folderID,
		Name:      name,
		Method:    method,
		Path:      path,
		SortOrder: maxSort + 1,
		BodyType:  string(models.BodyTypeNone),
		// 普通接口默认继承上级操作；文档等不继承的类型由各自创建入口显式覆盖。
		InheritOperations: true,
	}
	if err := s.db.Create(endpoint).Error; err != nil {
		slog.Error("创建端点失败", "error", err)
		return nil, fmt.Errorf("创建端点失败: %w", err)
	}
	slog.Info("端点已创建", "id", endpoint.ID, "name", endpoint.Name)
	return endpoint, nil
}

// SaveEndpointData 保存端点所有数据
func (s *EndpointService) SaveEndpointData(data EndpointSaveData) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 更新端点基本信息
		updates := map[string]any{
			"name":                   data.Name,
			"method":                 data.Method,
			"path":                   data.Path,
			"body_type":              data.BodyType,
			"body_content":           data.BodyContent,
			"content_type":           data.ContentType,
			"timeout":                models.NormalizeScopedTimeoutValue(data.TimeoutMode, data.Timeout),
			"timeout_mode":           models.PersistedTimeoutMode(data.TimeoutMode),
			"follow_redirects":       data.FollowRedirects,
			"send_no_cache_headers":  data.SendNoCacheHeaders,
			"pre_request_script":     data.PreRequestScript,
			"post_response_script":   data.PostResponseScript,
			"doc_content":            data.DocContent,
			"status":                 data.Status,
			"tags":                   data.Tags,
			"description":            data.Description,
			"inherit_operations":     data.InheritOperations,
			"disabled_global_params": data.DisabledGlobalParams,
			"proxy_config":           data.ProxyConfig,
			"tls_config":             data.TLSConfig,
			"url_encoding":           data.URLEncoding,
			"ws_protocol_conversion": persistedWSProtocolConversion(data.WSProtocolConversion),
		}
		// 新字段发布后，旧版前端的 SaveEndpointData 调用不会携带它们。空载荷在
		// 此处表示「未知而非重置」，以免用户降级再保存请求时丢掉展示偏好。
		// 当前前端始终传 timeline/auto，因此用户主动恢复默认值仍会正常写入。
		if hasStreamPresentation(data) {
			updates["stream_view_mode"] = persistedStreamViewMode(data.StreamViewMode)
			updates["stream_completion_format"] = persistedStreamCompletionFormat(data.StreamCompletionFormat)
			updates["stream_json_path"] = data.StreamJSONPath
			updates["stream_render_markdown"] = data.StreamRenderMarkdown
		}
		if err := tx.Model(&models.Endpoint{}).Where("id = ?", data.ID).Updates(updates).Error; err != nil {
			return err
		}

		// 保存参数：先删除再创建
		if data.Params != nil {
			if err := tx.Where("endpoint_id = ?", data.ID).Delete(&models.EndpointParam{}).Error; err != nil {
				return err
			}
			for i := range data.Params {
				data.Params[i].ID = ""
				data.Params[i].EndpointID = data.ID
				if err := tx.Create(&data.Params[i]).Error; err != nil {
					return err
				}
			}
		}

		// 保存请求体字段：先删除再创建
		if data.BodyFields != nil {
			if err := tx.Where("endpoint_id = ?", data.ID).Delete(&models.EndpointBodyField{}).Error; err != nil {
				return err
			}
			for i := range data.BodyFields {
				data.BodyFields[i].ID = ""
				data.BodyFields[i].EndpointID = data.ID
				if err := tx.Create(&data.BodyFields[i]).Error; err != nil {
					return err
				}
			}
		}

		// 保存请求头：先删除再创建
		if data.Headers != nil {
			if err := tx.Where("endpoint_id = ?", data.ID).Delete(&models.EndpointHeader{}).Error; err != nil {
				return err
			}
			for i := range data.Headers {
				data.Headers[i].ID = ""
				data.Headers[i].EndpointID = data.ID
				if err := tx.Create(&data.Headers[i]).Error; err != nil {
					return err
				}
			}
		}

		// 保存认证信息：始终先清除旧认证，再按需写入。
		// nil 表示 inherit（不留记录）；none 必须作为显式记录保存，才能停止上级认证继承。
		if err := tx.Where("endpoint_id = ?", data.ID).Delete(&models.EndpointAuth{}).Error; err != nil {
			return err
		}
		if data.Auth != nil {
			data.Auth.ID = ""
			data.Auth.EndpointID = data.ID
			if err := tx.Create(data.Auth).Error; err != nil {
				return err
			}
		}

		// 保存前置/后置操作：保留稳定 ID，以供下级覆盖引用。
		if data.Operations != nil {
			if err := syncOperations(tx, models.OperationOwnerEndpoint, data.ID, data.Operations); err != nil {
				return err
			}
		}
		if data.OperationOverrides != nil {
			var endpoint models.Endpoint
			if err := tx.Where("id = ?", data.ID).First(&endpoint).Error; err != nil {
				return err
			}
			if err := saveOperationOverrides(tx, models.OperationOwnerEndpoint, data.ID,
				data.OperationOverrides, inheritedOperationsForEndpoint(tx, &endpoint)); err != nil {
				return err
			}
		}

		// 保存响应示例
		if data.Examples != nil {
			if err := tx.Where("endpoint_id = ?", data.ID).Delete(&models.ResponseExample{}).Error; err != nil {
				return err
			}
			for i := range data.Examples {
				data.Examples[i].ID = ""
				data.Examples[i].EndpointID = data.ID
				if err := tx.Create(&data.Examples[i]).Error; err != nil {
					return err
				}
			}
		}

		// 保存响应定义
		if data.Schemas != nil {
			if err := tx.Where("endpoint_id = ?", data.ID).Delete(&models.ResponseSchema{}).Error; err != nil {
				return err
			}
			for i := range data.Schemas {
				data.Schemas[i].ID = ""
				data.Schemas[i].EndpointID = data.ID
				if err := tx.Create(&data.Schemas[i]).Error; err != nil {
					return err
				}
			}
		}

		slog.Info("端点数据已保存", "id", data.ID)
		return nil
	})
}

// CreateDocument 创建文档类型端点（Markdown 内容）。
func (s *EndpointService) CreateDocument(moduleID string, folderID *string, name string) (*models.Endpoint, error) {
	var maxSort int
	query := s.db.Model(&models.Endpoint{}).Where("module_id = ?", moduleID)
	if folderID != nil {
		query = query.Where("folder_id = ?", *folderID)
	} else {
		query = query.Where("folder_id IS NULL")
	}
	query.Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	doc := &models.Endpoint{
		ModuleID: moduleID, FolderID: folderID, Name: name,
		Type: string(models.EndpointTypeDoc), Method: "GET", Path: "/",
		DocContent: "", SortOrder: maxSort + 1, InheritOperations: false,
	}
	if err := s.db.Create(doc).Error; err != nil {
		return nil, fmt.Errorf("创建文档失败: %w", err)
	}
	slog.Info("文档已创建", "id", doc.ID, "name", doc.Name)
	return doc, nil
}

// SaveDocument 保存文档内容与名称。
func (s *EndpointService) SaveDocument(id string, name string, content string) error {
	return s.db.Model(&models.Endpoint{}).Where("id = ?", id).Updates(map[string]any{
		"name":        name,
		"doc_content": content,
	}).Error
}

// CreateTypedEndpoint 创建指定类型的端点（http/websocket/sse）。
func (s *EndpointService) CreateTypedEndpoint(moduleID string, folderID *string, name, method, path, epType string) (*models.Endpoint, error) {
	ep, err := s.CreateEndpoint(moduleID, folderID, name, method, path)
	if err != nil {
		return nil, err
	}
	if epType != "" && epType != string(models.EndpointTypeHTTP) {
		s.db.Model(&models.Endpoint{}).Where("id = ?", ep.ID).Update("type", epType)
		ep.Type = epType
	}
	return ep, nil
}

// DeleteEndpoint 删除端点及其关联数据
//
// 参数、请求体字段、请求头、认证、响应、示例、Schema、请求历史均由数据库外键
// ON DELETE CASCADE 自动级联删除；这里只需显式清理多态归属的 Operation（外键无法覆盖）。
func (s *EndpointService) DeleteEndpoint(id string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := deleteOperationOverrides(tx, models.OperationOwnerEndpoint, []string{id}); err != nil {
			return err
		}
		if err := deleteOperations(tx, models.OperationOwnerEndpoint, []string{id}); err != nil {
			return err
		}
		if err := tx.Where("id = ?", id).Delete(&models.Endpoint{}).Error; err != nil {
			return err
		}

		slog.Info("端点已删除", "id", id)
		return nil
	})
}

// SearchEndpoints 在模块中搜索端点
func (s *EndpointService) SearchEndpoints(moduleID string, query string) ([]models.Endpoint, error) {
	var endpoints []models.Endpoint
	err := s.db.Where("module_id = ? AND name LIKE ?", moduleID, "%"+query+"%").
		Order("sort_order ASC").Find(&endpoints).Error
	if err != nil {
		return nil, fmt.Errorf("搜索端点失败: %w", err)
	}
	return endpoints, nil
}

// EndpointSaveData 端点保存数据
type EndpointSaveData struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Method      string `json:"method"`
	Path        string `json:"path"`
	BodyType    string `json:"bodyType"`
	BodyContent string `json:"bodyContent"`
	ContentType string `json:"contentType"`
	Timeout     int    `json:"timeout"`
	TimeoutMode string `json:"timeoutMode"`
	// FollowRedirects / SendNoCacheHeaders nil 表示继承上级。
	FollowRedirects    *bool  `json:"followRedirects"`
	SendNoCacheHeaders *bool  `json:"sendNoCacheHeaders"`
	PreRequestScript   string `json:"preRequestScript"`
	PostResponseScript string `json:"postResponseScript"`
	// 新增元数据与文档/操作
	Type              string `json:"type"`
	DocContent        string `json:"docContent"`
	Status            string `json:"status"`
	Tags              string `json:"tags"`
	Description       string `json:"description"`
	InheritOperations bool   `json:"inheritOperations"`
	// DisabledGlobalParams 本接口禁用的全局(模块)查询参数名列表，JSON 字符串数组
	DisabledGlobalParams string `json:"disabledGlobalParams"`
	// ProxyConfig 接口级代理选择（EndpointProxy 的 JSON），空表示 inherit
	ProxyConfig string `json:"proxyConfig"`
	// TLSConfig 接口级 TLS 选择（EndpointTLS 的 JSON），空表示 inherit
	TLSConfig string `json:"tlsConfig"`
	// URLEncoding 接口级 URL 自动编码档位，空表示 inherit
	URLEncoding string `json:"urlEncoding"`
	// WSProtocolConversion 接口级 WebSocket 协议头自动转换档位，空表示 inherit
	WSProtocolConversion string `json:"wsProtocolConversion"`
	// StreamViewMode / StreamCompletionFormat / StreamJSONPath / StreamRenderMarkdown
	// 是接口级的流式响应展示偏好，不参与实际请求。
	StreamViewMode         string                     `json:"streamViewMode"`
	StreamCompletionFormat string                     `json:"streamCompletionFormat"`
	StreamJSONPath         string                     `json:"streamJSONPath"`
	StreamRenderMarkdown   bool                       `json:"streamRenderMarkdown"`
	Params                 []models.EndpointParam     `json:"params"`
	BodyFields             []models.EndpointBodyField `json:"bodyFields"`
	Headers                []models.EndpointHeader    `json:"headers"`
	Auth                   *models.EndpointAuth       `json:"auth"`
	Operations             []models.Operation         `json:"operations"`
	OperationOverrides     []models.OperationOverride `json:"operationOverrides"`
	Examples               []models.ResponseExample   `json:"examples"`
	Schemas                []models.ResponseSchema    `json:"schemas"`
}

// SaveResponse 保存端点响应（upsert）
func (s *EndpointService) SaveResponse(endpointID string, resp *models.Response) error {
	var existing models.Response
	result := s.db.Where("endpoint_id = ?", endpointID).First(&existing)

	if result.Error == gorm.ErrRecordNotFound {
		resp.EndpointID = endpointID
		return s.db.Create(resp).Error
	}

	if result.Error != nil {
		return result.Error
	}

	result = s.db.Model(&existing).Updates(map[string]any{
		"request_run_id": resp.RequestRunID,
		"status_code":    resp.StatusCode,
		"headers":        resp.Headers,
		"body":           resp.Body,
		"content_type":   resp.ContentType,
		"cookies":        resp.Cookies,
		"timing":         resp.Timing,
		"size":           resp.Size,
		"actual_request": resp.ActualRequest,
	})
	return result.Error
}

// GetEndpointsByFolder 获取文件夹下的端点列表
func (s *EndpointService) GetEndpointsByFolder(folderID string) ([]models.Endpoint, error) {
	var endpoints []models.Endpoint
	err := s.db.Where("folder_id = ?", folderID).Order("sort_order ASC").Find(&endpoints).Error
	return endpoints, err
}

// GetEndpointsByModule 获取模块下直属的端点列表
func (s *EndpointService) GetEndpointsByModule(moduleID string) ([]models.Endpoint, error) {
	var endpoints []models.Endpoint
	err := s.db.Where("module_id = ? AND folder_id IS NULL", moduleID).Order("sort_order ASC").Find(&endpoints).Error
	return endpoints, err
}

// CreateFullEndpoint 创建完整端点（包含所有关联数据），用于从未保存请求保存到项目
// 以事务方式一次性创建端点及其所有关联数据（参数、请求体字段、请求头、认证信息）
func (s *EndpointService) CreateFullEndpoint(moduleID string, folderID *string, data EndpointSaveData) (*models.Endpoint, error) {
	// 获取当前最大排序号
	var maxSort int
	query := s.db.Model(&models.Endpoint{}).Where("module_id = ?", moduleID)
	if folderID != nil {
		query = query.Where("folder_id = ?", *folderID)
	} else {
		query = query.Where("folder_id IS NULL")
	}
	query.Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	// 字段需与 SaveEndpointData 的更新集合保持一致：
	// 少复制一个字段就意味着「新建时填了、保存后才生效」这类难查的丢数据问题
	// （脚本、类型、状态、标签、描述此前都在创建路径上被丢弃）。
	endpoint := &models.Endpoint{
		ModuleID:               moduleID,
		FolderID:               folderID,
		Name:                   data.Name,
		Type:                   defaultStr(data.Type, string(models.EndpointTypeHTTP)),
		Method:                 data.Method,
		Path:                   data.Path,
		BodyType:               data.BodyType,
		BodyContent:            data.BodyContent,
		ContentType:            data.ContentType,
		Timeout:                models.NormalizeScopedTimeoutValue(data.TimeoutMode, data.Timeout),
		TimeoutMode:            models.PersistedTimeoutMode(data.TimeoutMode),
		FollowRedirects:        data.FollowRedirects,
		SendNoCacheHeaders:     data.SendNoCacheHeaders,
		DocContent:             data.DocContent,
		Status:                 data.Status,
		Tags:                   data.Tags,
		Description:            data.Description,
		InheritOperations:      data.InheritOperations,
		PreRequestScript:       data.PreRequestScript,
		PostResponseScript:     data.PostResponseScript,
		DisabledGlobalParams:   data.DisabledGlobalParams,
		ProxyConfig:            data.ProxyConfig,
		TLSConfig:              data.TLSConfig,
		URLEncoding:            data.URLEncoding,
		WSProtocolConversion:   persistedWSProtocolConversion(data.WSProtocolConversion),
		StreamViewMode:         persistedStreamViewMode(data.StreamViewMode),
		StreamCompletionFormat: persistedStreamCompletionFormat(data.StreamCompletionFormat),
		StreamJSONPath:         data.StreamJSONPath,
		StreamRenderMarkdown:   data.StreamRenderMarkdown,
		SortOrder:              maxSort + 1,
	}

	// 使用事务创建端点及其所有关联数据
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 创建端点基本信息
		if err := tx.Create(endpoint).Error; err != nil {
			return err
		}

		// 保存参数
		if data.Params != nil {
			for i := range data.Params {
				data.Params[i].ID = ""
				data.Params[i].EndpointID = endpoint.ID
				if err := tx.Create(&data.Params[i]).Error; err != nil {
					return err
				}
			}
		}

		// 保存请求体字段
		if data.BodyFields != nil {
			for i := range data.BodyFields {
				data.BodyFields[i].ID = ""
				data.BodyFields[i].EndpointID = endpoint.ID
				if err := tx.Create(&data.BodyFields[i]).Error; err != nil {
					return err
				}
			}
		}

		// 保存请求头
		if data.Headers != nil {
			for i := range data.Headers {
				data.Headers[i].ID = ""
				data.Headers[i].EndpointID = endpoint.ID
				if err := tx.Create(&data.Headers[i]).Error; err != nil {
					return err
				}
			}
		}

		// 保存认证信息
		if data.Auth != nil {
			data.Auth.ID = ""
			data.Auth.EndpointID = endpoint.ID
			if err := tx.Create(data.Auth).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		slog.Error("创建完整端点失败", "error", err)
		return nil, fmt.Errorf("创建完整端点失败: %w", err)
	}

	slog.Info("完整端点已创建", "id", endpoint.ID, "name", endpoint.Name)
	return endpoint, nil
}

// RenameEndpoint 重命名端点
func (s *EndpointService) RenameEndpoint(id string, name string) error {
	result := s.db.Model(&models.Endpoint{}).Where("id = ?", id).Update("name", name)
	if result.Error != nil {
		return fmt.Errorf("重命名端点失败: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("端点不存在: %s", id)
	}
	slog.Info("端点已重命名", "id", id, "name", name)
	return nil
}

// MoveEndpoint 移动端点到目标模块和文件夹（folderID 为 nil 表示移动到模块根级）
func (s *EndpointService) MoveEndpoint(id string, moduleID string, folderID *string) error {
	// 计算目标位置的最大排序号，追加到末尾
	var maxSort int
	query := s.db.Model(&models.Endpoint{}).Where("module_id = ?", moduleID)
	if folderID != nil {
		query = query.Where("folder_id = ?", *folderID)
	} else {
		query = query.Where("folder_id IS NULL")
	}
	query.Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	result := s.db.Model(&models.Endpoint{}).Where("id = ?", id).Updates(map[string]any{
		"module_id":  moduleID,
		"folder_id":  folderID,
		"sort_order": maxSort + 1,
	})
	if result.Error != nil {
		return fmt.Errorf("移动端点失败: %w", result.Error)
	}
	slog.Info("端点已移动", "id", id, "moduleID", moduleID)
	return nil
}

// ReorderEndpoints 按给定顺序重排一批端点（通常为同一容器内的兄弟节点）。
// 依据 orderedIDs 的下标批量写入 sort_order，实现拖拽排序。
func (s *EndpointService) ReorderEndpoints(orderedIDs []string) error {
	if len(orderedIDs) == 0 {
		return nil
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		for i, id := range orderedIDs {
			if err := tx.Model(&models.Endpoint{}).Where("id = ?", id).Update("sort_order", i).Error; err != nil {
				return fmt.Errorf("重排端点失败: %w", err)
			}
		}
		return nil
	})
}

// DuplicateEndpoint 复制端点及其所有关联数据到同一位置
func (s *EndpointService) DuplicateEndpoint(id string) (*models.Endpoint, error) {
	var src models.Endpoint
	if err := s.db.Where("id = ?", id).First(&src).Error; err != nil {
		return nil, fmt.Errorf("获取端点失败: %w", err)
	}

	// 计算同位置的最大排序号
	var maxSort int
	query := s.db.Model(&models.Endpoint{}).Where("module_id = ?", src.ModuleID)
	if src.FolderID != nil {
		query = query.Where("folder_id = ?", *src.FolderID)
	} else {
		query = query.Where("folder_id IS NULL")
	}
	query.Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	var newEndpoint *models.Endpoint
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var copyErr error
		newEndpoint, copyErr = copyEndpointRecord(tx, src, src.ModuleID, src.FolderID, src.Name+" 副本", maxSort+1)
		return copyErr
	})
	if err != nil {
		slog.Error("复制端点失败", "error", err)
		return nil, fmt.Errorf("复制端点失败: %w", err)
	}
	slog.Info("端点已复制", "srcID", id, "newID", newEndpoint.ID)
	return newEndpoint, nil
}

// OperationStageCounts 前置/后置操作数量统计
type OperationStageCounts struct {
	Pre  int `json:"pre"`
	Post int `json:"post"`
}

// GetInheritedOperationCounts 统计某端点从模块与文件夹链继承的、已启用的前置/后置操作数量
// （不含端点自身的操作）。前端据此在参数/操作标签上显示「包含全局的」启用计数。
func (s *EndpointService) GetInheritedOperationCounts(endpointID string) (*OperationStageCounts, error) {
	var ep models.Endpoint
	if err := s.db.Where("id = ?", endpointID).First(&ep).Error; err != nil {
		return nil, fmt.Errorf("获取端点失败: %w", err)
	}
	countStage := func(stage models.OperationStage) int {
		n := 0
		for _, op := range loadOperations(s.db, models.OperationOwnerModule, ep.ModuleID, stage) {
			if op.Enabled {
				n++
			}
		}
		for _, fid := range folderChainToRoot(s.db, ep.FolderID) {
			for _, op := range loadOperations(s.db, models.OperationOwnerFolder, fid, stage) {
				if op.Enabled {
					n++
				}
			}
		}
		return n
	}
	return &OperationStageCounts{
		Pre:  countStage(models.OperationStagePre),
		Post: countStage(models.OperationStagePost),
	}, nil
}

// EndpointToJSON 将端点导出为 JSON
func (s *EndpointService) EndpointToJSON(endpoint *EndpointDetail) (string, error) {
	data, err := json.MarshalIndent(endpoint, "", "  ")
	if err != nil {
		return "", fmt.Errorf("序列化端点数据失败: %w", err)
	}
	return string(data), nil
}
