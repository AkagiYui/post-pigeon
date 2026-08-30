package services

import (
	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
	"encoding/json"
	"fmt"
	"log/slog"
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
	Version         string                  `json:"version"`    // 导出格式版本
	ExportedAt      time.Time               `json:"exportedAt"` // 导出时间
	Project         models.Project          `json:"project"`
	Environments    []models.Environment    `json:"environments"`
	GlobalVariables []models.GlobalVariable `json:"globalVariables,omitempty"`
	Scripts         []models.ScriptLibrary  `json:"scripts,omitempty"`
	Modules         []ModuleExport          `json:"modules"`
}

// ModuleExport 模块导出数据
type ModuleExport struct {
	models.Module
	BaseURLs   []models.ModuleBaseURL  `json:"baseUrls"`
	Params     []models.ModuleParam    `json:"params,omitempty"`
	Variables  []models.ModuleVariable `json:"variables,omitempty"`
	Operations []models.Operation      `json:"operations,omitempty"`
	Folders    []FolderExport          `json:"folders"`
	Endpoints  []EndpointExport        `json:"endpoints"`
}

// FolderExport 文件夹导出数据
type FolderExport struct {
	models.Folder
	Operations         []models.Operation         `json:"operations,omitempty"`
	OperationOverrides []models.OperationOverride `json:"operationOverrides,omitempty"`
	Children           []FolderExport             `json:"children"`
	Endpoints          []EndpointExport           `json:"endpoints"`
}

// EndpointExport 端点导出数据
type EndpointExport struct {
	models.Endpoint
	Params             []models.EndpointParam     `json:"params"`
	BodyFields         []models.EndpointBodyField `json:"bodyFields"`
	Headers            []models.EndpointHeader    `json:"headers"`
	Auth               *models.EndpointAuth       `json:"auth"`
	Operations         []models.Operation         `json:"operations,omitempty"`
	OperationOverrides []models.OperationOverride `json:"operationOverrides,omitempty"`
	Examples           []models.ResponseExample   `json:"examples,omitempty"`
	Schemas            []models.ResponseSchema    `json:"schemas,omitempty"`
}

// ExportSecretSummary 导出前的凭据统计，供界面决定要不要问一句。
type ExportSecretSummary struct {
	// SecretVariables 标记为「秘密」且有值的环境变量个数
	SecretVariables int `json:"secretVariables"`
	// AuthCredentials 填了凭据（密码 / token / client secret / API Key 值）的认证配置个数
	AuthCredentials int `json:"authCredentials"`
}

// Total 返回两类之和，为 0 表示这个项目导出去不带任何凭据。
func (s ExportSecretSummary) Total() int {
	return s.SecretVariables + s.AuthCredentials
}

// InspectExportSecrets 统计导出这个项目会带出多少凭据。
func (s *ImportExportService) InspectExportSecrets(projectID string) (ExportSecretSummary, error) {
	var summary ExportSecretSummary

	var environments []models.Environment
	if err := s.db.Where("project_id = ?", projectID).Find(&environments).Error; err != nil {
		return summary, apperr.Wrap(err, apperr.CodeDatabase)
	}
	for _, env := range environments {
		var variables []models.EnvironmentVariable
		s.db.Where("environment_id = ?", env.ID).Find(&variables)
		for _, v := range variables {
			if v.IsSecret && v.Value != "" {
				summary.SecretVariables++
			}
		}
	}
	var moduleVariables []models.ModuleVariable
	if err := s.db.Table("module_variables AS v").Select("v.*").
		Joins("JOIN modules AS m ON m.id = v.module_id").
		Where("m.project_id = ? AND v.is_secret = ? AND v.value <> ''", projectID, true).
		Find(&moduleVariables).Error; err != nil {
		return summary, apperr.Wrap(err, apperr.CodeDatabase)
	}
	summary.SecretVariables += len(moduleVariables)

	// 模块、文件夹和接口都可以显式保存认证凭据，项目导出会覆盖全部层级。
	var modules []models.Module
	if err := s.db.Where("project_id = ?", projectID).Find(&modules).Error; err != nil {
		return summary, apperr.Wrap(err, apperr.CodeDatabase)
	}
	for _, module := range modules {
		if hasAuthCredential(models.EndpointAuth{Type: module.AuthType, Data: module.AuthData}) {
			summary.AuthCredentials++
		}
	}
	var folders []models.Folder
	if err := s.db.Table("folders AS f").Select("f.*").
		Joins("JOIN modules AS m ON m.id = f.module_id").Where("m.project_id = ?", projectID).
		Find(&folders).Error; err != nil {
		return summary, apperr.Wrap(err, apperr.CodeDatabase)
	}
	for _, folder := range folders {
		if hasAuthCredential(models.EndpointAuth{Type: folder.AuthType, Data: folder.AuthData}) {
			summary.AuthCredentials++
		}
	}

	// 接口鉴权：只统计真的填了凭据的，空壳配置不必惊动用户
	var auths []models.EndpointAuth
	if err := s.db.Raw(`
		SELECT endpoint_auths.* FROM endpoint_auths
		JOIN endpoints ON endpoints.id = endpoint_auths.endpoint_id
		JOIN modules ON modules.id = endpoints.module_id
		WHERE modules.project_id = ?`, projectID).Scan(&auths).Error; err != nil {
		return summary, apperr.Wrap(err, apperr.CodeDatabase)
	}
	for _, auth := range auths {
		if hasAuthCredential(auth) {
			summary.AuthCredentials++
		}
	}
	return summary, nil
}

// secretAuthKeys 返回某种认证类型里属于凭据的字段名。
//
// 按类型精确剥离而不是整块清空：tokenUrl、clientId、用户名这些是配置不是凭据，
// 留着对方才知道该往哪里填。
func secretAuthKeys(authType string) []string {
	switch authType {
	case "basic", "digest":
		return []string{"password"}
	case "bearer":
		return []string{"token"}
	case "apikey":
		return []string{"value"}
	case "oauth2":
		return []string{"clientSecret", "password"}
	default:
		return nil
	}
}

// hasAuthCredential 判断这份鉴权配置里是否真的填了凭据。
func hasAuthCredential(auth models.EndpointAuth) bool {
	data := decodeAuthData(auth)
	for _, key := range secretAuthKeys(auth.Type) {
		if v, ok := data[key].(string); ok && v != "" {
			return true
		}
	}
	return false
}

// stripAuthCredentials 抹掉鉴权配置里的凭据字段，保留其余配置。
func stripAuthCredentials(auth *models.EndpointAuth) {
	keys := secretAuthKeys(auth.Type)
	if len(keys) == 0 || auth.Data == "" {
		return
	}
	data := decodeAuthData(*auth)
	if data == nil {
		// 解析不出来就宁可整块丢掉：留着可能就是把凭据原样带出去
		auth.Data = ""
		return
	}
	changed := false
	for _, key := range keys {
		if v, ok := data[key].(string); ok && v != "" {
			data[key] = ""
			changed = true
		}
	}
	if !changed {
		return
	}
	if encoded, err := json.Marshal(data); err == nil {
		auth.Data = string(encoded)
	} else {
		auth.Data = ""
	}
}

// decodeAuthData 把鉴权配置解成通用的键值表；解析失败返回 nil。
func decodeAuthData(auth models.EndpointAuth) map[string]any {
	if auth.Data == "" {
		return map[string]any{}
	}
	var data map[string]any
	if err := json.Unmarshal([]byte(auth.Data), &data); err != nil {
		return nil
	}
	return data
}

// stripSecrets 把导出数据里的凭据抹掉：秘密变量的值清空、接口鉴权里的凭据字段清空。
//
// 条目本身保留（变量名还在、鉴权类型还在），导入的一方一眼能看出「这里要填什么」，
// 只是填什么得自己来。
func stripSecrets(data *ExportData) {
	for i := range data.Environments {
		for j := range data.Environments[i].Variables {
			if data.Environments[i].Variables[j].IsSecret {
				data.Environments[i].Variables[j].Value = ""
			}
		}
	}
	for i := range data.Modules {
		stripScopeAuthCredentials(data.Modules[i].AuthType, &data.Modules[i].AuthData)
		for j := range data.Modules[i].Variables {
			if data.Modules[i].Variables[j].IsSecret {
				data.Modules[i].Variables[j].Value = ""
			}
		}
		stripEndpointSecrets(data.Modules[i].Endpoints)
		stripFolderSecrets(data.Modules[i].Folders)
	}
}

func stripScopeAuthCredentials(authType string, data *string) {
	auth := models.EndpointAuth{Type: authType, Data: *data}
	stripAuthCredentials(&auth)
	*data = auth.Data
}

// stripFolderSecrets 递归处理文件夹树里的接口。
func stripFolderSecrets(folders []FolderExport) {
	for i := range folders {
		stripScopeAuthCredentials(folders[i].AuthType, &folders[i].AuthData)
		stripEndpointSecrets(folders[i].Endpoints)
		stripFolderSecrets(folders[i].Children)
	}
}

// stripEndpointSecrets 抹掉一组接口的鉴权凭据。
func stripEndpointSecrets(endpoints []EndpointExport) {
	for i := range endpoints {
		if endpoints[i].Auth != nil {
			stripAuthCredentials(endpoints[i].Auth)
		}
	}
}

// ExportProject 导出项目为 JSON。
//
// includeSecrets 决定要不要带上凭据（秘密变量的值、接口鉴权里的密码 / token /
// client secret / API Key 值）。导出文件是明文的，而「把接口集合发给同事」是这类
// 工具的日常操作——默认不带，由界面在确实有凭据时问一句。
func (s *ImportExportService) ExportProject(projectID string, includeSecrets bool) (string, error) {
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

	var globalVariables []models.GlobalVariable
	s.db.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&globalVariables)

	var scripts []models.ScriptLibrary
	s.db.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&scripts)

	// 获取模块
	var modules []models.Module
	s.db.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&modules)

	moduleExports := make([]ModuleExport, 0, len(modules))
	for _, module := range modules {
		me := ModuleExport{Module: module}

		// 获取前置 URL
		s.db.Where("module_id = ?", module.ID).Find(&me.BaseURLs)
		s.db.Where("module_id = ?", module.ID).Order("sort_order ASC").Find(&me.Params)
		s.db.Where("module_id = ?", module.ID).Order("sort_order ASC").Find(&me.Variables)
		me.Operations = s.exportOperations(s.db, models.OperationOwnerModule, module.ID)

		// 获取顶级文件夹
		me.Folders = s.exportFolders(s.db, module.ID, nil)

		// 获取直属端点
		me.Endpoints = s.exportEndpoints(s.db, module.ID, nil)

		moduleExports = append(moduleExports, me)
	}

	data := ExportData{
		Version:         "1.2",
		ExportedAt:      time.Now(),
		Project:         project,
		Environments:    environments,
		GlobalVariables: globalVariables,
		Scripts:         scripts,
		Modules:         moduleExports,
	}

	if !includeSecrets {
		stripSecrets(&data)
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
		fe := FolderExport{
			Folder:             folder,
			Operations:         s.exportOperations(db, models.OperationOwnerFolder, folder.ID),
			OperationOverrides: s.exportOperationOverrides(db, models.OperationOwnerFolder, folder.ID),
			Children:           s.exportFolders(db, moduleID, &folder.ID),
			Endpoints:          s.exportEndpoints(db, moduleID, &folder.ID),
		}
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
		db.Where("endpoint_id = ?", endpoint.ID).Order("sort_order ASC").Find(&ee.BodyFields)
		db.Where("endpoint_id = ?", endpoint.ID).Find(&ee.Headers)
		db.Where("endpoint_id = ?", endpoint.ID).First(&ee.Auth)
		ee.Operations = s.exportOperations(db, models.OperationOwnerEndpoint, endpoint.ID)
		ee.OperationOverrides = s.exportOperationOverrides(db, models.OperationOwnerEndpoint, endpoint.ID)
		db.Where("endpoint_id = ?", endpoint.ID).Order("sort_order ASC").Find(&ee.Examples)
		db.Where("endpoint_id = ?", endpoint.ID).Order("sort_order ASC").Find(&ee.Schemas)
		result = append(result, ee)
	}
	return result
}

func (s *ImportExportService) exportOperations(db *gorm.DB, ownerType models.OperationOwnerType, ownerID string) []models.Operation {
	var operations []models.Operation
	db.Where("owner_type = ? AND owner_id = ?", string(ownerType), ownerID).
		Order("stage ASC, sort_order ASC").Find(&operations)
	return operations
}

func (s *ImportExportService) exportOperationOverrides(db *gorm.DB, ownerType models.OperationOwnerType, ownerID string) []models.OperationOverride {
	var overrides []models.OperationOverride
	db.Where("owner_type = ? AND owner_id = ?", string(ownerType), ownerID).Find(&overrides)
	return overrides
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
		importedProject := data.Project
		importedProject.ID = ""
		importedProject.CreatedAt, importedProject.UpdatedAt = time.Time{}, time.Time{}
		importedProject.Modules = nil
		importedProject.Environments = nil
		importedProject.GlobalVariables = nil
		importedProject.Scripts = nil
		project = &importedProject
		if err := tx.Create(project).Error; err != nil {
			return fmt.Errorf("创建项目失败: %w", err)
		}

		for _, variable := range data.GlobalVariables {
			variable.ID, variable.ProjectID = "", project.ID
			if err := tx.Create(&variable).Error; err != nil {
				return err
			}
		}

		// 脚本要先于操作导入，libraryScript 操作才能改写成新脚本 ID。
		scriptIDMap := make(map[string]string, len(data.Scripts))
		for _, script := range data.Scripts {
			oldID := script.ID
			script.ID, script.ProjectID = "", project.ID
			script.CreatedAt, script.UpdatedAt = time.Time{}, time.Time{}
			if err := tx.Create(&script).Error; err != nil {
				return err
			}
			scriptIDMap[oldID] = script.ID
		}
		operationIDMap := make(map[string]string)

		// 旧环境 ID -> 新环境 ID 映射，用于恢复模块前置 URL
		envIDMap := make(map[string]string)

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
					Enabled:       v.Enabled,
					SortOrder:     v.SortOrder,
					IsSecret:      v.IsSecret,
				}
				if err := tx.Create(&newVar).Error; err != nil {
					return err
				}
			}

			// 记录旧->新环境 ID 映射，供恢复模块前置 URL 使用
			envIDMap[env.ID] = newEnv.ID
		}

		// 导入模块
		for _, me := range data.Modules {
			newModule := me.Module
			newModule.ID, newModule.ProjectID = "", project.ID
			newModule.CreatedAt, newModule.UpdatedAt = time.Time{}, time.Time{}
			newModule.BaseURLs = nil
			newModule.Params = nil
			newModule.Variables = nil
			newModule.Endpoints = nil
			newModule.Folders = nil
			newModule.Histories = nil
			newModule.RequestRuns = nil
			newModule.Operations = nil
			if err := tx.Create(&newModule).Error; err != nil {
				return err
			}

			for _, p := range me.Params {
				p.ID, p.ModuleID = "", newModule.ID
				if err := tx.Create(&p).Error; err != nil {
					return err
				}
			}
			for _, v := range me.Variables {
				v.ID, v.ModuleID = "", newModule.ID
				if err := tx.Create(&v).Error; err != nil {
					return err
				}
			}

			// 恢复模块在各环境下的前置 URL（按映射转换环境 ID）
			for _, bu := range me.BaseURLs {
				newEnvID, ok := envIDMap[bu.EnvironmentID]
				if !ok || bu.BaseURL == "" {
					continue
				}
				if err := tx.Create(&models.ModuleBaseURL{
					ModuleID:      newModule.ID,
					EnvironmentID: newEnvID,
					BaseURL:       bu.BaseURL,
				}).Error; err != nil {
					return err
				}
			}

			if err := importOperations(tx, models.OperationOwnerModule, newModule.ID, me.Operations, scriptIDMap, operationIDMap); err != nil {
				return err
			}

			// 导入文件夹
			if err := s.importFolders(tx, newModule.ID, nil, me.Folders, data.Version, scriptIDMap, operationIDMap); err != nil {
				return err
			}

			// 导入直属端点
			if err := s.importEndpoints(tx, newModule.ID, nil, me.Endpoints, data.Version, scriptIDMap, operationIDMap); err != nil {
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
func (s *ImportExportService) importFolders(tx *gorm.DB, moduleID string, parentID *string, folders []FolderExport, version string, scriptIDMap, operationIDMap map[string]string) error {
	for _, fe := range folders {
		newFolder := fe.Folder
		newFolder.ID, newFolder.ModuleID, newFolder.ParentID = "", moduleID, parentID
		newFolder.CreatedAt, newFolder.UpdatedAt = time.Time{}, time.Time{}
		newFolder.Children = nil
		newFolder.Endpoints = nil
		newFolder.Operations = nil
		if err := tx.Create(&newFolder).Error; err != nil {
			return err
		}
		if err := importOperations(tx, models.OperationOwnerFolder, newFolder.ID, fe.Operations, scriptIDMap, operationIDMap); err != nil {
			return err
		}
		if err := importOperationOverrides(tx, models.OperationOwnerFolder, newFolder.ID, fe.OperationOverrides, operationIDMap); err != nil {
			return err
		}

		// 递归导入子文件夹
		if err := s.importFolders(tx, moduleID, &newFolder.ID, fe.Children, version, scriptIDMap, operationIDMap); err != nil {
			return err
		}

		// 导入端点
		if err := s.importEndpoints(tx, moduleID, &newFolder.ID, fe.Endpoints, version, scriptIDMap, operationIDMap); err != nil {
			return err
		}
	}
	return nil
}

// importEndpoints 导入端点
func (s *ImportExportService) importEndpoints(tx *gorm.DB, moduleID string, folderID *string, endpoints []EndpointExport, version string, scriptIDMap, operationIDMap map[string]string) error {
	for _, ee := range endpoints {
		newEndpoint := ee.Endpoint
		newEndpoint.ID, newEndpoint.ModuleID, newEndpoint.FolderID = "", moduleID, folderID
		newEndpoint.TimeoutMode = importTimeoutMode(version, ee.TimeoutMode, ee.Timeout)
		newEndpoint.CreatedAt, newEndpoint.UpdatedAt = time.Time{}, time.Time{}
		newEndpoint.Params = nil
		newEndpoint.BodyFields = nil
		newEndpoint.Headers = nil
		newEndpoint.Auth = nil
		newEndpoint.Response = nil
		newEndpoint.Examples = nil
		newEndpoint.Schemas = nil
		newEndpoint.Histories = nil
		newEndpoint.RequestRuns = nil
		newEndpoint.Operations = nil
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
				DataType:    p.DataType,
				Required:    p.Required,
				Example:     p.Example,
			}
			if err := tx.Create(&newParam).Error; err != nil {
				return err
			}
		}

		// 导入请求体字段
		for _, bf := range ee.BodyFields {
			newField := models.EndpointBodyField{
				EndpointID: newEndpoint.ID, Name: bf.Name, Value: bf.Value,
				FieldType: bf.FieldType, Enabled: bf.Enabled, DataType: bf.DataType,
				Description: bf.Description, Required: bf.Required, ContentType: bf.ContentType,
				Schema: bf.Schema, Style: bf.Style, Explode: bf.Explode, SortOrder: bf.SortOrder,
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
				Required:    h.Required,
				Example:     h.Example,
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

		for _, example := range ee.Examples {
			example.ID, example.EndpointID = "", newEndpoint.ID
			if err := tx.Create(&example).Error; err != nil {
				return err
			}
		}
		for _, schema := range ee.Schemas {
			schema.ID, schema.EndpointID = "", newEndpoint.ID
			if err := tx.Create(&schema).Error; err != nil {
				return err
			}
		}
		if err := importOperations(tx, models.OperationOwnerEndpoint, newEndpoint.ID, ee.Operations, scriptIDMap, operationIDMap); err != nil {
			return err
		}
		if err := importOperationOverrides(tx, models.OperationOwnerEndpoint, newEndpoint.ID, ee.OperationOverrides, operationIDMap); err != nil {
			return err
		}
	}
	return nil
}

func importOperations(tx *gorm.DB, ownerType models.OperationOwnerType, ownerID string, operations []models.Operation, scriptIDMap, operationIDMap map[string]string) error {
	for _, operation := range operations {
		oldID := operation.ID
		operation.ID = ""
		operation.OwnerType, operation.OwnerID = string(ownerType), ownerID
		if operation.Type == string(models.OpTypeLibraryScript) {
			operation.Data = remapLibraryScriptID(operation.Data, scriptIDMap)
		}
		if err := tx.Create(&operation).Error; err != nil {
			return err
		}
		operationIDMap[oldID] = operation.ID
	}
	return nil
}

func importOperationOverrides(tx *gorm.DB, ownerType models.OperationOwnerType, ownerID string, overrides []models.OperationOverride, operationIDMap map[string]string) error {
	for _, override := range overrides {
		operationID, ok := operationIDMap[override.OperationID]
		if !ok {
			// 兼容包含过期覆盖记录的旧项目；没有对应操作时保留它没有意义。
			continue
		}
		override.ID = ""
		override.OwnerType, override.OwnerID, override.OperationID = string(ownerType), ownerID, operationID
		if err := tx.Create(&override).Error; err != nil {
			return err
		}
	}
	return nil
}

func importTimeoutMode(version, mode string, timeout int) string {
	// 1.0 及更早的导出没有 timeoutMode，里面的 endpoint.timeout 一直是显式值。
	if (version == "" || version == "1.0") && mode == "" && timeout > 0 {
		return string(models.TimeoutValue)
	}
	return mode
}
