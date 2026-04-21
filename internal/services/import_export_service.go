package services

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"post-pigeon/internal/models"
	"time"

	"gorm.io/gorm"
)

// ImportExportService 导入导出服务
type ImportExportService struct {
	db *gorm.DB
}

// NewImportExportService 创建导入导出服务实例
func NewImportExportService(db *gorm.DB) *ImportExportService {
	return &ImportExportService{db: db}
}

// ExportData 导出数据结构
type ExportData struct {
	Version      string               `json:"version"`    // 导出格式版本
	ExportedAt   time.Time            `json:"exportedAt"` // 导出时间
	Project      models.Project       `json:"project"`
	Environments []models.Environment `json:"environments"`
	Modules      []ModuleExport       `json:"modules"`
}

// ModuleExport 模块导出数据
type ModuleExport struct {
	models.Module
	BaseURLs  []models.ModuleBaseURL `json:"baseUrls"`
	Folders   []FolderExport         `json:"folders"`
	Endpoints []EndpointExport       `json:"endpoints"`
}

// FolderExport 文件夹导出数据
type FolderExport struct {
	models.Folder
	Children  []FolderExport   `json:"children"`
	Endpoints []EndpointExport `json:"endpoints"`
}

// EndpointExport 端点导出数据
type EndpointExport struct {
	models.Endpoint
	Params     []models.EndpointParam     `json:"params"`
	BodyFields []models.EndpointBodyField `json:"bodyFields"`
	Headers    []models.EndpointHeader    `json:"headers"`
	Auth       *models.EndpointAuth       `json:"auth"`
}

// ExportProject 导出项目为 JSON
func (s *ImportExportService) ExportProject(projectID string) (string, error) {
	// 获取项目
	var project models.Project
	if err := s.db.Where("id = ?", projectID).First(&project).Error; err != nil {
		return "", fmt.Errorf("获取项目失败: %w", err)
	}

	// 获取环境
	var environments []models.Environment
	s.db.Where("project_id = ?", projectID).Find(&environments)
	for i := range environments {
		s.db.Where("environment_id = ?", environments[i].ID).Find(&environments[i].Variables)
	}

	// 获取模块
	var modules []models.Module
	s.db.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&modules)

	moduleExports := make([]ModuleExport, 0, len(modules))
	for _, module := range modules {
		me := ModuleExport{Module: module}

		// 获取前置 URL
		s.db.Where("module_id = ?", module.ID).Find(&me.BaseURLs)

		// 获取顶级文件夹
		me.Folders = s.exportFolders(s.db, module.ID, nil)

		// 获取直属端点
		me.Endpoints = s.exportEndpoints(s.db, module.ID, nil)

		moduleExports = append(moduleExports, me)
	}

	data := ExportData{
		Version:      "1.0",
		ExportedAt:   time.Now(),
		Project:      project,
		Environments: environments,
		Modules:      moduleExports,
	}

	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return "", fmt.Errorf("序列化导出数据失败: %w", err)
	}

	slog.Info("项目已导出", "projectId", projectID)
	return string(jsonData), nil
}

// exportFolders 递归导出文件夹
func (s *ImportExportService) exportFolders(db *gorm.DB, moduleID string, parentID *string) []FolderExport {
	var folders []models.Folder
	query := db.Where("module_id = ?", moduleID)
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	query.Order("sort_order ASC").Find(&folders)

	result := make([]FolderExport, 0, len(folders))
	for _, folder := range folders {
		fe := FolderExport{Folder: folder}
		fe.Children = s.exportFolders(db, moduleID, &folder.ID)
		fe.Endpoints = s.exportEndpoints(db, moduleID, &folder.ID)
		result = append(result, fe)
	}
	return result
}

// exportEndpoints 导出端点
func (s *ImportExportService) exportEndpoints(db *gorm.DB, moduleID string, folderID *string) []EndpointExport {
	var endpoints []models.Endpoint
	query := db.Where("module_id = ?", moduleID)
	if folderID != nil {
		query = query.Where("folder_id = ?", *folderID)
	} else {
		query = query.Where("folder_id IS NULL")
	}
	query.Order("sort_order ASC").Find(&endpoints)

	result := make([]EndpointExport, 0, len(endpoints))
	for _, endpoint := range endpoints {
		ee := EndpointExport{Endpoint: endpoint}
		db.Where("endpoint_id = ?", endpoint.ID).Find(&ee.Params)
		db.Where("endpoint_id = ?", endpoint.ID).Find(&ee.BodyFields)
		db.Where("endpoint_id = ?", endpoint.ID).Find(&ee.Headers)
		db.Where("endpoint_id = ?", endpoint.ID).First(&ee.Auth)
		result = append(result, ee)
	}
	return result
}

// ImportProject 从 JSON 导入项目
func (s *ImportExportService) ImportProject(jsonStr string) (*models.Project, error) {
	var data ExportData
	if err := json.Unmarshal([]byte(jsonStr), &data); err != nil {
		return nil, fmt.Errorf("解析导入数据失败: %w", err)
	}

	// 验证版本
	if data.Version == "" {
		return nil, fmt.Errorf("无效的导入数据：缺少版本信息")
	}

	var project *models.Project
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 创建项目（生成新 ID 避免冲突）
		project = &models.Project{
			Name:        data.Project.Name,
			Description: data.Project.Description,
		}
		if err := tx.Create(project).Error; err != nil {
			return fmt.Errorf("创建项目失败: %w", err)
		}

		// 导入环境
		for _, env := range data.Environments {
			newEnv := models.Environment{
				ProjectID: project.ID,
				Name:      env.Name,
			}
			if err := tx.Create(&newEnv).Error; err != nil {
				return err
			}
			// 导入环境变量
			for _, v := range env.Variables {
				newVar := models.EnvironmentVariable{
					EnvironmentID: newEnv.ID,
					Key:           v.Key,
					Value:         v.Value,
					Description:   v.Description,
				}
				if err := tx.Create(&newVar).Error; err != nil {
					return err
				}
			}

			// 更新环境 ID 映射（用于模块前置 URL）
			// 这里简化处理，导入后用户需要重新配置前置 URL
		}

		// 导入模块
		for _, me := range data.Modules {
			newModule := models.Module{
				ProjectID: project.ID,
				Name:      me.Name,
				SortOrder: me.SortOrder,
			}
			if err := tx.Create(&newModule).Error; err != nil {
				return err
			}

			// 导入文件夹
			if err := s.importFolders(tx, newModule.ID, nil, me.Folders); err != nil {
				return err
			}

			// 导入直属端点
			if err := s.importEndpoints(tx, newModule.ID, nil, me.Endpoints); err != nil {
				return err
			}
		}

		slog.Info("项目已导入", "name", project.Name)
		return nil
	})

	if err != nil {
		return nil, err
	}

	return project, nil
}

// importFolders 递归导入文件夹
func (s *ImportExportService) importFolders(tx *gorm.DB, moduleID string, parentID *string, folders []FolderExport) error {
	for _, fe := range folders {
		newFolder := models.Folder{
			ModuleID:  moduleID,
			ParentID:  parentID,
			Name:      fe.Name,
			SortOrder: fe.SortOrder,
		}
		if err := tx.Create(&newFolder).Error; err != nil {
			return err
		}

		// 递归导入子文件夹
		if err := s.importFolders(tx, moduleID, &newFolder.ID, fe.Children); err != nil {
			return err
		}

		// 导入端点
		if err := s.importEndpoints(tx, moduleID, &newFolder.ID, fe.Endpoints); err != nil {
			return err
		}
	}
	return nil
}

// importEndpoints 导入端点
func (s *ImportExportService) importEndpoints(tx *gorm.DB, moduleID string, folderID *string, endpoints []EndpointExport) error {
	for _, ee := range endpoints {
		newEndpoint := models.Endpoint{
			ModuleID:        moduleID,
			FolderID:        folderID,
			Name:            ee.Name,
			Method:          ee.Method,
			Path:            ee.Path,
			BodyType:        ee.BodyType,
			BodyContent:     ee.BodyContent,
			ContentType:     ee.ContentType,
			Timeout:         ee.Timeout,
			FollowRedirects: ee.FollowRedirects,
			SortOrder:       ee.SortOrder,
		}
		if err := tx.Create(&newEndpoint).Error; err != nil {
			return err
		}

		// 导入参数
		for _, p := range ee.Params {
			newParam := models.EndpointParam{
				EndpointID:  newEndpoint.ID,
				Type:        p.Type,
				Name:        p.Name,
				Value:       p.Value,
				Description: p.Description,
				Enabled:     p.Enabled,
			}
			if err := tx.Create(&newParam).Error; err != nil {
				return err
			}
		}

		// 导入请求体字段
		for _, bf := range ee.BodyFields {
			newField := models.EndpointBodyField{
				EndpointID: newEndpoint.ID,
				Name:       bf.Name,
				Value:      bf.Value,
				FieldType:  bf.FieldType,
				Enabled:    bf.Enabled,
			}
			if err := tx.Create(&newField).Error; err != nil {
				return err
			}
		}

		// 导入请求头
		for _, h := range ee.Headers {
			newHeader := models.EndpointHeader{
				EndpointID:  newEndpoint.ID,
				Name:        h.Name,
				Value:       h.Value,
				Description: h.Description,
				Enabled:     h.Enabled,
			}
			if err := tx.Create(&newHeader).Error; err != nil {
				return err
			}
		}

		// 导入认证信息
		if ee.Auth != nil {
			newAuth := models.EndpointAuth{
				EndpointID: newEndpoint.ID,
				Type:       ee.Auth.Type,
				Data:       ee.Auth.Data,
			}
			if err := tx.Create(&newAuth).Error; err != nil {
				return err
			}
		}
	}
	return nil
}
