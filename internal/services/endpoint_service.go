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
}

// GetEndpoint 获取端点完整详情
func (s *EndpointService) GetEndpoint(id string) (*EndpointDetail, error) {
	var endpoint models.Endpoint
	if err := s.db.Where("id = ?", id).First(&endpoint).Error; err != nil {
		return nil, fmt.Errorf("获取端点失败: %w", err)
	}

	detail := &EndpointDetail{Endpoint: endpoint}

	// 加载参数
	s.db.Where("endpoint_id = ?", id).Order("created_at ASC").Find(&detail.Params)
	// 加载请求体字段
	s.db.Where("endpoint_id = ?", id).Order("created_at ASC").Find(&detail.BodyFields)
	// 加载请求头
	s.db.Where("endpoint_id = ?", id).Order("created_at ASC").Find(&detail.Headers)
	// 加载认证信息
	s.db.Where("endpoint_id = ?", id).First(&detail.Auth)
	// 加载最后一次响应
	s.db.Where("endpoint_id = ?", id).First(&detail.Response)

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
			"content_type":     data.ContentType,
			"timeout":          data.Timeout,
			"follow_redirects": data.FollowRedirects,
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

		// 保存认证信息
		if data.Auth != nil {
			if err := tx.Where("endpoint_id = ?", data.ID).Delete(&models.EndpointAuth{}).Error; err != nil {
				return err
			}
			data.Auth.ID = ""
			data.Auth.EndpointID = data.ID
			if err := tx.Create(data.Auth).Error; err != nil {
				return err
			}
		}

		slog.Info("端点数据已保存", "id", data.ID)
		return nil
	})
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
	ContentType     string                     `json:"contentType"`
	Timeout         int                        `json:"timeout"`
	FollowRedirects bool                       `json:"followRedirects"`
	Params          []models.EndpointParam     `json:"params"`
	BodyFields      []models.EndpointBodyField `json:"bodyFields"`
	Headers         []models.EndpointHeader    `json:"headers"`
	Auth            *models.EndpointAuth       `json:"auth"`
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

// EndpointToJSON 将端点导出为 JSON
func (s *EndpointService) EndpointToJSON(endpoint *EndpointDetail) (string, error) {
	data, err := json.MarshalIndent(endpoint, "", "  ")
	if err != nil {
		return "", fmt.Errorf("序列化端点数据失败: %w", err)
	}
	return string(data), nil
}
