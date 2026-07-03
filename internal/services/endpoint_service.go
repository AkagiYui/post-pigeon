package services

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"post-pigeon/internal/models"

	"gorm.io/gorm"
)

// EndpointService 端点管理服务
type EndpointService struct {
	db *gorm.DB
}

// NewEndpointService 创建端点服务实例
func NewEndpointService(db *gorm.DB) *EndpointService {
	return &EndpointService{db: db}
}

// EndpointDetail 端点完整详情（包含所有关联数据）
type EndpointDetail struct {
	models.Endpoint
	Params     []models.EndpointParam     `json:"params"`
	BodyFields []models.EndpointBodyField `json:"bodyFields"`
	Headers    []models.EndpointHeader    `json:"headers"`
	Auth       *models.EndpointAuth       `json:"auth"`
	Response   *models.Response           `json:"response"`
	Operations []models.Operation         `json:"operations"`
	Examples   []models.ResponseExample   `json:"examples"`
	Schemas    []models.ResponseSchema    `json:"schemas"`
}

// GetEndpoint 获取端点完整详情
func (s *EndpointService) GetEndpoint(id string) (*EndpointDetail, error) {
	var endpoint models.Endpoint
	if err := s.db.Where("id = ?", id).First(&endpoint).Error; err != nil {
		return nil, fmt.Errorf("获取端点失败: %w", err)
	}

	detail := &EndpointDetail{Endpoint: endpoint}

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
	if err := s.db.Where("endpoint_id = ?", id).First(&resp).Error; err == nil {
		detail.Response = &resp
	}

	// 加载前置/后置操作、响应示例、响应定义
	s.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerEndpoint, id).
		Order("stage ASC, sort_order ASC").Find(&detail.Operations)
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
		if err := tx.Model(&models.Endpoint{}).Where("id = ?", data.ID).Updates(map[string]interface{}{
			"name":             data.Name,
			"method":           data.Method,
			"path":             data.Path,
			"body_type":        data.BodyType,
			"body_content":     data.BodyContent,
			"content_type":         data.ContentType,
			"timeout":              data.Timeout,
			"follow_redirects":     data.FollowRedirects,
			"pre_request_script":   data.PreRequestScript,
			"post_response_script": data.PostResponseScript,
			"doc_content":          data.DocContent,
			"status":               data.Status,
			"tags":                 data.Tags,
			"description":          data.Description,
			"inherit_operations":   data.InheritOperations,
		}).Error; err != nil {
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

		// 保存认证信息：始终先清除旧认证，再按需写入
		// （切换为 none 或 nil 时仅清除，避免旧认证残留）
		if err := tx.Where("endpoint_id = ?", data.ID).Delete(&models.EndpointAuth{}).Error; err != nil {
			return err
		}
		if data.Auth != nil && data.Auth.Type != string(models.AuthTypeNone) {
			data.Auth.ID = ""
			data.Auth.EndpointID = data.ID
			if err := tx.Create(data.Auth).Error; err != nil {
				return err
			}
		}

		// 保存前置/后置操作：先删除端点自身操作再创建
		if data.Operations != nil {
			if err := tx.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerEndpoint, data.ID).
				Delete(&models.Operation{}).Error; err != nil {
				return err
			}
			for i := range data.Operations {
				data.Operations[i].ID = ""
				data.Operations[i].OwnerType = string(models.OperationOwnerEndpoint)
				data.Operations[i].OwnerID = data.ID
				if err := tx.Create(&data.Operations[i]).Error; err != nil {
					return err
				}
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
	return s.db.Model(&models.Endpoint{}).Where("id = ?", id).Updates(map[string]interface{}{
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
func (s *EndpointService) DeleteEndpoint(id string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("endpoint_id = ?", id).Delete(&models.EndpointParam{}).Error; err != nil {
			return err
		}
		if err := tx.Where("endpoint_id = ?", id).Delete(&models.EndpointBodyField{}).Error; err != nil {
			return err
		}
		if err := tx.Where("endpoint_id = ?", id).Delete(&models.EndpointHeader{}).Error; err != nil {
			return err
		}
		if err := tx.Where("endpoint_id = ?", id).Delete(&models.EndpointAuth{}).Error; err != nil {
			return err
		}
		if err := tx.Where("endpoint_id = ?", id).Delete(&models.Response{}).Error; err != nil {
			return err
		}
		if err := tx.Where("endpoint_id = ?", id).Delete(&models.ResponseExample{}).Error; err != nil {
			return err
		}
		if err := tx.Where("endpoint_id = ?", id).Delete(&models.ResponseSchema{}).Error; err != nil {
			return err
		}
		if err := tx.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerEndpoint, id).Delete(&models.Operation{}).Error; err != nil {
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
	ID              string                     `json:"id"`
	Name            string                     `json:"name"`
	Method          string                     `json:"method"`
	Path            string                     `json:"path"`
	BodyType        string                     `json:"bodyType"`
	BodyContent     string                     `json:"bodyContent"`
	ContentType        string                     `json:"contentType"`
	Timeout            int                        `json:"timeout"`
	FollowRedirects    bool                       `json:"followRedirects"`
	PreRequestScript   string                     `json:"preRequestScript"`
	PostResponseScript string                     `json:"postResponseScript"`
	// 新增元数据与文档/操作
	Type              string `json:"type"`
	DocContent        string `json:"docContent"`
	Status            string `json:"status"`
	Tags              string `json:"tags"`
	Description       string `json:"description"`
	InheritOperations bool   `json:"inheritOperations"`
	Params             []models.EndpointParam     `json:"params"`
	BodyFields      []models.EndpointBodyField `json:"bodyFields"`
	Headers         []models.EndpointHeader    `json:"headers"`
	Auth            *models.EndpointAuth       `json:"auth"`
	Operations      []models.Operation         `json:"operations"`
	Examples        []models.ResponseExample   `json:"examples"`
	Schemas         []models.ResponseSchema    `json:"schemas"`
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

	result = s.db.Model(&existing).Updates(map[string]interface{}{
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

	endpoint := &models.Endpoint{
		ModuleID:        moduleID,
		FolderID:        folderID,
		Name:            data.Name,
		Method:          data.Method,
		Path:            data.Path,
		BodyType:        data.BodyType,
		BodyContent:     data.BodyContent,
		ContentType:     data.ContentType,
		Timeout:         data.Timeout,
		FollowRedirects: data.FollowRedirects,
		SortOrder:       maxSort + 1,
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

	result := s.db.Model(&models.Endpoint{}).Where("id = ?", id).Updates(map[string]interface{}{
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
	// 加载源端点完整详情
	src, err := s.GetEndpoint(id)
	if err != nil {
		return nil, err
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

	newEndpoint := &models.Endpoint{
		ModuleID:        src.ModuleID,
		FolderID:        src.FolderID,
		Name:            src.Name + " 副本",
		Method:          src.Method,
		Path:            src.Path,
		BodyType:        src.BodyType,
		BodyContent:     src.BodyContent,
		ContentType:     src.ContentType,
		Timeout:         src.Timeout,
		FollowRedirects: src.FollowRedirects,
		SortOrder:       maxSort + 1,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(newEndpoint).Error; err != nil {
			return err
		}
		for _, p := range src.Params {
			p.ID = ""
			p.EndpointID = newEndpoint.ID
			if err := tx.Create(&p).Error; err != nil {
				return err
			}
		}
		for _, bf := range src.BodyFields {
			bf.ID = ""
			bf.EndpointID = newEndpoint.ID
			if err := tx.Create(&bf).Error; err != nil {
				return err
			}
		}
		for _, h := range src.Headers {
			h.ID = ""
			h.EndpointID = newEndpoint.ID
			if err := tx.Create(&h).Error; err != nil {
				return err
			}
		}
		if src.Auth != nil {
			auth := *src.Auth
			auth.ID = ""
			auth.EndpointID = newEndpoint.ID
			if err := tx.Create(&auth).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		slog.Error("复制端点失败", "error", err)
		return nil, fmt.Errorf("复制端点失败: %w", err)
	}
	slog.Info("端点已复制", "srcID", id, "newID", newEndpoint.ID)
	return newEndpoint, nil
}

// EndpointToJSON 将端点导出为 JSON
func (s *EndpointService) EndpointToJSON(endpoint *EndpointDetail) (string, error) {
	data, err := json.MarshalIndent(endpoint, "", "  ")
	if err != nil {
		return "", fmt.Errorf("序列化端点数据失败: %w", err)
	}
	return string(data), nil
}
