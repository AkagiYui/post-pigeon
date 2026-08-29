// Package services 提供业务逻辑层，处理数据 CRUD 和业务规则
package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"gorm.io/gorm"

	"PostPigeon/internal/models"
)

// ProjectService 项目管理服务
type ProjectService struct {
	db *gorm.DB
}

// NewProjectService 创建项目服务实例
func NewProjectService(db *gorm.DB) *ProjectService {
	return &ProjectService{db: db}
}

// ListProjects 获取所有项目列表
func (s *ProjectService) ListProjects() ([]models.Project, error) {
	var projects []models.Project
	err := s.db.Order("sort_order ASC, updated_at DESC").Find(&projects).Error
	if err != nil {
		slog.Error("获取项目列表失败", "error", err)
		return nil, fmt.Errorf("获取项目列表失败: %w", err)
	}
	return projects, nil
}

// ReorderProjects 更新项目排序顺序
// 接收一个项目 ID 列表，按列表顺序设置每个项目的 sort_order
func (s *ProjectService) ReorderProjects(ids []string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for i, id := range ids {
			result := tx.Model(&models.Project{}).Where("id = ?", id).Update("sort_order", i+1)
			if result.Error != nil {
				slog.Error("更新项目排序失败", "error", result.Error, "id", id)
				return fmt.Errorf("更新项目排序失败: %w", result.Error)
			}
			if result.RowsAffected == 0 {
				slog.Warn("排序项目不存在", "id", id)
			}
		}
		slog.Info("项目排序已更新")
		return nil
	})
}

// GetProject 根据 ID 获取项目详情
func (s *ProjectService) GetProject(id string) (*models.Project, error) {
	slog.Debug("GetProject 被调用", "id", id)
	var project models.Project
	err := s.db.Where("id = ?", id).First(&project).Error
	if err != nil {
		// 项目不存在时不返回错误，而是返回 nil
		if err == gorm.ErrRecordNotFound {
			slog.Warn("项目不存在", "id", id)
			return nil, nil
		}
		return nil, fmt.Errorf("获取项目失败: %w", err)
	}
	slog.Debug("项目查询成功", "id", id, "name", project.Name)
	return &project, nil
}

// CreateProject 创建新项目，并自动创建默认模块、根文件夹和默认环境
func (s *ProjectService) CreateProject(name string, description string) (*models.Project, error) {
	project := &models.Project{
		Name:        name,
		Description: description,
	}

	// 使用事务确保项目、默认模块、根文件夹和默认环境的创建是原子操作
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 创建项目
		if err := tx.Create(project).Error; err != nil {
			return err
		}

		// 创建默认模块
		module := &models.Module{
			ProjectID: project.ID,
			Name:      "默认模块",
			SortOrder: 0,
		}
		if err := tx.Create(module).Error; err != nil {
			return err
		}

		// 创建根文件夹
		folder := &models.Folder{
			ModuleID:  module.ID,
			ParentID:  nil,
			Name:      "__root",
			SortOrder: 0,
		}
		if err := tx.Create(folder).Error; err != nil {
			return err
		}

		// 创建默认环境：「测试环境」和「正式环境」
		envNames := []string{"测试环境", "正式环境"}
		for _, envName := range envNames {
			env := &models.Environment{
				ProjectID: project.ID,
				Name:      envName,
			}
			if err := tx.Create(env).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		slog.Error("创建项目失败", "error", err)
		return nil, fmt.Errorf("创建项目失败: %w", err)
	}

	slog.Info("项目已创建", "id", project.ID, "name", project.Name)
	return project, nil
}

// UpdateProject 更新项目信息
func (s *ProjectService) UpdateProject(id string, name string, description string) error {
	result := s.db.Model(&models.Project{}).Where("id = ?", id).Updates(map[string]any{
		"name":        name,
		"description": description,
	})
	if result.Error != nil {
		slog.Error("更新项目失败", "error", result.Error)
		return fmt.Errorf("更新项目失败: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("项目不存在: %s", id)
	}
	slog.Info("项目已更新", "id", id)
	return nil
}

// GetProjectURLEncoding 读取项目级的 URL 自动编码档位。未设置时返回 inherit（跟随全局）。
func (s *ProjectService) GetProjectURLEncoding(id string) (string, error) {
	return string(getProjectURLEncoding(s.db, id)), nil
}

// SaveProjectURLEncoding 保存项目级的 URL 自动编码档位。
// inherit 与不认识的值统一存空串，表示跟随全局。
func (s *ProjectService) SaveProjectURLEncoding(id string, mode string) error {
	normalized := models.NormalizeURLEncoding(mode)
	if normalized == models.URLEncodingInherit {
		normalized = ""
	}
	return s.db.Model(&models.Project{}).Where("id = ?", id).
		Update("url_encoding", string(normalized)).Error
}

// SaveProjectWSProtocolConversion 保存项目级 WebSocket 协议头自动转换档位。
// inherit 与未知值存为空串，表示跟随全局。
func (s *ProjectService) SaveProjectWSProtocolConversion(id string, mode string) error {
	normalized := models.NormalizeWSProtocolConversion(mode)
	if normalized == models.WSProtocolConversionInherit {
		normalized = ""
	}
	return s.db.Model(&models.Project{}).Where("id = ?", id).
		Update("ws_protocol_conversion", string(normalized)).Error
}

// SaveProjectRequestInheritance 保存项目级的五级继承请求选项。
func (s *ProjectService) SaveProjectRequestInheritance(id, timeoutMode string, timeout int,
	followRedirects, sendNoCacheHeaders *bool,
) error {
	timeout = models.NormalizeScopedTimeoutValue(timeoutMode, timeout)
	return s.db.Model(&models.Project{}).Where("id = ?", id).Updates(map[string]any{
		"timeout_mode":          models.PersistedTimeoutMode(timeoutMode),
		"timeout":               timeout,
		"follow_redirects":      followRedirects,
		"send_no_cache_headers": sendNoCacheHeaders,
	}).Error
}

// DeleteProject 删除项目及其所有关联数据
func (s *ProjectService) DeleteProject(id string) error {
	// 端点及其关联数据、文件夹、模块、环境与变量、全局变量、脚本库均由数据库外键
	// ON DELETE CASCADE 自动级联删除；这里只需显式清理多态归属的 Operation（外键无法覆盖），
	// 再删除项目即可。使用事务保证「清理操作 + 删除项目」的原子性。
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 收集模块、文件夹、端点 ID —— 仅用于清理它们的多态操作
		var moduleIDs, folderIDs, endpointIDs []string
		if err := tx.Model(&models.Module{}).Where("project_id = ?", id).Pluck("id", &moduleIDs).Error; err != nil {
			return err
		}
		if len(moduleIDs) > 0 {
			if err := tx.Model(&models.Folder{}).Where("module_id IN ?", moduleIDs).Pluck("id", &folderIDs).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.Endpoint{}).Where("module_id IN ?", moduleIDs).Pluck("id", &endpointIDs).Error; err != nil {
				return err
			}
		}
		if err := deleteOperations(tx, models.OperationOwnerEndpoint, endpointIDs); err != nil {
			return err
		}
		if err := deleteOperations(tx, models.OperationOwnerFolder, folderIDs); err != nil {
			return err
		}
		if err := deleteOperations(tx, models.OperationOwnerModule, moduleIDs); err != nil {
			return err
		}

		// 删除项目：其余关联数据随外键级联删除
		if err := tx.Where("id = ?", id).Delete(&models.Project{}).Error; err != nil {
			return err
		}

		slog.Info("项目已删除", "id", id)
		return nil
	})
}

// CloneProject 克隆项目：把源项目原样复制成一个新项目，除名字外与源项目完全一致。
// 覆盖挂在项目下的每一张表——模块、目录、接口及其参数/请求头/认证/响应示例与定义、
// 前置后置操作、环境与变量、模块变量、全局变量、脚本库、项目级代理/TLS/WS 协议设置，
// 以及运行状态：Cookie（会话跟着走，克隆件不必重新登录）、上次响应、请求历史。
// newName 为空时用「源名称 + 副本」。
func (s *ProjectService) CloneProject(id string, newName string) (*models.Project, error) {
	var src models.Project
	if err := s.db.Where("id = ?", id).First(&src).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("项目不存在: %s", id)
		}
		return nil, fmt.Errorf("获取项目失败: %w", err)
	}

	name := strings.TrimSpace(newName)
	if name == "" {
		name = src.Name + " 副本"
	}

	// 排到列表末尾，避免和源项目抢同一个 sort_order 后顺序随更新时间乱跳
	var maxSort int64
	s.db.Model(&models.Project{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxSort)

	dst := &models.Project{
		Name:                 name,
		Description:          src.Description,
		SortOrder:            maxSort + 1,
		ProxySettings:        src.ProxySettings,
		TLSSettings:          src.TLSSettings,
		URLEncoding:          src.URLEncoding,
		WSProtocolConversion: src.WSProtocolConversion,
		TimeoutMode:          src.TimeoutMode,
		Timeout:              src.Timeout,
		FollowRedirects:      src.FollowRedirects,
		SendNoCacheHeaders:   src.SendNoCacheHeaders,
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(dst).Error; err != nil {
			return err
		}

		// 环境与环境变量：模块前置 URL 按环境存，先建好环境拿到 旧ID -> 新ID 的映射
		envIDs := make(map[string]string)
		var envs []models.Environment
		if err := tx.Where("project_id = ?", src.ID).Order("created_at ASC").Find(&envs).Error; err != nil {
			return err
		}
		for _, env := range envs {
			srcEnvID := env.ID
			env.ID, env.ProjectID = "", dst.ID
			env.CreatedAt, env.UpdatedAt = time.Time{}, time.Time{}
			if err := tx.Create(&env).Error; err != nil {
				return err
			}
			envIDs[srcEnvID] = env.ID

			var envVars []models.EnvironmentVariable
			if err := tx.Where("environment_id = ?", srcEnvID).Order("sort_order ASC").Find(&envVars).Error; err != nil {
				return err
			}
			for _, v := range envVars {
				v.ID, v.EnvironmentID = "", env.ID
				if err := tx.Create(&v).Error; err != nil {
					return err
				}
			}
		}

		// 全局变量
		var globalVars []models.GlobalVariable
		if err := tx.Where("project_id = ?", src.ID).Order("sort_order ASC").Find(&globalVars).Error; err != nil {
			return err
		}
		for _, v := range globalVars {
			v.ID, v.ProjectID = "", dst.ID
			if err := tx.Create(&v).Error; err != nil {
				return err
			}
		}

		// 脚本库：前置后置操作会按 ID 引用它，同样先建好并留下映射
		scriptIDs := make(map[string]string)
		var scripts []models.ScriptLibrary
		if err := tx.Where("project_id = ?", src.ID).Order("sort_order ASC").Find(&scripts).Error; err != nil {
			return err
		}
		for _, sc := range scripts {
			srcScriptID := sc.ID
			sc.ID, sc.ProjectID = "", dst.ID
			sc.CreatedAt, sc.UpdatedAt = time.Time{}, time.Time{}
			if err := tx.Create(&sc).Error; err != nil {
				return err
			}
			scriptIDs[srcScriptID] = sc.ID
		}

		// Cookie：会话状态跟着项目走，克隆件不用重新登录一遍
		var cookies []models.StoredCookie
		if err := tx.Where("project_id = ?", src.ID).Find(&cookies).Error; err != nil {
			return err
		}
		for _, c := range cookies {
			c.ID, c.ProjectID = "", dst.ID
			if err := tx.Create(&c).Error; err != nil {
				return err
			}
		}

		// 模块及其下属内容
		var modules []models.Module
		if err := tx.Where("project_id = ?", src.ID).Order("sort_order ASC").Find(&modules).Error; err != nil {
			return err
		}
		for _, module := range modules {
			srcModuleID := module.ID
			module.ID, module.ProjectID = "", dst.ID
			module.CreatedAt, module.UpdatedAt = time.Time{}, time.Time{}
			if err := tx.Create(&module).Error; err != nil {
				return err
			}
			if err := cloneModuleContent(tx, srcModuleID, module.ID, envIDs, scriptIDs); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		slog.Error("克隆项目失败", "error", err, "srcId", id)
		return nil, fmt.Errorf("克隆项目失败: %w", err)
	}

	slog.Info("项目已克隆", "srcId", id, "newId", dst.ID, "name", dst.Name)
	return dst, nil
}

// cloneModuleContent 复制一个模块下的全部内容到已建好的新模块
func cloneModuleContent(tx *gorm.DB, srcModuleID, dstModuleID string, envIDs, scriptIDs map[string]string) error {
	// 前置 URL：环境 ID 要换成克隆出的新环境
	var baseURLs []models.ModuleBaseURL
	if err := tx.Where("module_id = ?", srcModuleID).Find(&baseURLs).Error; err != nil {
		return err
	}
	for _, bu := range baseURLs {
		envID, ok := envIDs[bu.EnvironmentID]
		if !ok {
			// 指向本项目之外的环境，属于脏数据，跳过而不是让整次克隆失败
			slog.Warn("克隆项目：模块前置 URL 指向未知环境，已跳过", "moduleId", srcModuleID, "environmentId", bu.EnvironmentID)
			continue
		}
		bu.ID, bu.ModuleID, bu.EnvironmentID = "", dstModuleID, envID
		if err := tx.Create(&bu).Error; err != nil {
			return err
		}
	}

	// 模块级自动参数
	var moduleParams []models.ModuleParam
	if err := tx.Where("module_id = ?", srcModuleID).Order("sort_order ASC").Find(&moduleParams).Error; err != nil {
		return err
	}
	for _, p := range moduleParams {
		p.ID, p.ModuleID = "", dstModuleID
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
	}

	// 模块变量
	var moduleVars []models.ModuleVariable
	if err := tx.Where("module_id = ?", srcModuleID).Order("sort_order ASC").Find(&moduleVars).Error; err != nil {
		return err
	}
	for _, v := range moduleVars {
		v.ID, v.ModuleID = "", dstModuleID
		if err := tx.Create(&v).Error; err != nil {
			return err
		}
	}

	if err := cloneOperations(tx, models.OperationOwnerModule, srcModuleID, dstModuleID, scriptIDs); err != nil {
		return err
	}

	// 文件夹树：自顶向下复制，留下 旧ID -> 新ID 供端点认领自己的目录
	folderIDs := make(map[string]string)
	if err := cloneFolderLevel(tx, srcModuleID, dstModuleID, nil, nil, folderIDs, scriptIDs); err != nil {
		return err
	}

	// 端点：文件夹建完后一次性复制，模块直属的（folder_id 为空）也在其中
	endpointIDs := make(map[string]string)
	var endpoints []models.Endpoint
	if err := tx.Where("module_id = ?", srcModuleID).Order("sort_order ASC").Find(&endpoints).Error; err != nil {
		return err
	}
	for _, ep := range endpoints {
		srcEndpointID := ep.ID
		var folderID *string
		if ep.FolderID != nil {
			if mapped, ok := folderIDs[*ep.FolderID]; ok {
				folderID = &mapped
			}
		}
		ep.ID, ep.ModuleID, ep.FolderID = "", dstModuleID, folderID
		ep.CreatedAt, ep.UpdatedAt = time.Time{}, time.Time{}
		if err := tx.Create(&ep).Error; err != nil {
			return err
		}
		endpointIDs[srcEndpointID] = ep.ID
		if err := cloneEndpointContent(tx, srcEndpointID, ep.ID, scriptIDs); err != nil {
			return err
		}
	}

	// 请求历史：CreatedAt 是「这次请求发生在什么时候」，属于内容，原样保留不重新打时间戳。
	// endpoint_id 可空（不挂接口的临时请求），挂着的要换成克隆出的新接口。
	var histories []models.RequestHistory
	if err := tx.Where("module_id = ?", srcModuleID).Find(&histories).Error; err != nil {
		return err
	}
	for _, h := range histories {
		var endpointID *string
		if h.EndpointID != nil {
			if mapped, ok := endpointIDs[*h.EndpointID]; ok {
				endpointID = &mapped
			}
		}
		h.ID, h.ModuleID, h.EndpointID = "", dstModuleID, endpointID
		if err := tx.Create(&h).Error; err != nil {
			return err
		}
	}

	return nil
}

// cloneFolderLevel 递归复制某个父文件夹下的一层文件夹，folderIDs 累积 旧ID -> 新ID 的映射
func cloneFolderLevel(tx *gorm.DB, srcModuleID, dstModuleID string, srcParentID, dstParentID *string, folderIDs, scriptIDs map[string]string) error {
	query := tx.Where("module_id = ?", srcModuleID)
	if srcParentID == nil {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", *srcParentID)
	}

	var folders []models.Folder
	if err := query.Order("sort_order ASC").Find(&folders).Error; err != nil {
		return err
	}
	for _, f := range folders {
		srcFolderID := f.ID
		f.ID, f.ModuleID, f.ParentID = "", dstModuleID, dstParentID
		f.CreatedAt, f.UpdatedAt = time.Time{}, time.Time{}
		if err := tx.Create(&f).Error; err != nil {
			return err
		}
		folderIDs[srcFolderID] = f.ID
		if err := cloneOperations(tx, models.OperationOwnerFolder, srcFolderID, f.ID, scriptIDs); err != nil {
			return err
		}
		dstFolderID := f.ID
		if err := cloneFolderLevel(tx, srcModuleID, dstModuleID, &srcFolderID, &dstFolderID, folderIDs, scriptIDs); err != nil {
			return err
		}
	}
	return nil
}

// cloneEndpointContent 复制一个端点的全部关联数据到已建好的新端点
func cloneEndpointContent(tx *gorm.DB, srcEndpointID, dstEndpointID string, scriptIDs map[string]string) error {
	var params []models.EndpointParam
	if err := tx.Where("endpoint_id = ?", srcEndpointID).Find(&params).Error; err != nil {
		return err
	}
	for _, p := range params {
		p.ID, p.EndpointID = "", dstEndpointID
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
	}

	var bodyFields []models.EndpointBodyField
	if err := tx.Where("endpoint_id = ?", srcEndpointID).Find(&bodyFields).Error; err != nil {
		return err
	}
	for _, bf := range bodyFields {
		bf.ID, bf.EndpointID = "", dstEndpointID
		if err := tx.Create(&bf).Error; err != nil {
			return err
		}
	}

	var headers []models.EndpointHeader
	if err := tx.Where("endpoint_id = ?", srcEndpointID).Find(&headers).Error; err != nil {
		return err
	}
	for _, h := range headers {
		h.ID, h.EndpointID = "", dstEndpointID
		if err := tx.Create(&h).Error; err != nil {
			return err
		}
	}

	// 认证一个端点至多一条，用 Find 取切片避免「没有认证」被当成查询错误
	var auths []models.EndpointAuth
	if err := tx.Where("endpoint_id = ?", srcEndpointID).Find(&auths).Error; err != nil {
		return err
	}
	for _, a := range auths {
		a.ID, a.EndpointID = "", dstEndpointID
		if err := tx.Create(&a).Error; err != nil {
			return err
		}
	}

	var examples []models.ResponseExample
	if err := tx.Where("endpoint_id = ?", srcEndpointID).Order("sort_order ASC").Find(&examples).Error; err != nil {
		return err
	}
	for _, ex := range examples {
		ex.ID, ex.EndpointID = "", dstEndpointID
		if err := tx.Create(&ex).Error; err != nil {
			return err
		}
	}

	var schemas []models.ResponseSchema
	if err := tx.Where("endpoint_id = ?", srcEndpointID).Order("sort_order ASC").Find(&schemas).Error; err != nil {
		return err
	}
	for _, sc := range schemas {
		sc.ID, sc.EndpointID = "", dstEndpointID
		if err := tx.Create(&sc).Error; err != nil {
			return err
		}
	}

	// 上次响应每个端点至多一条；CreatedAt 是「这次响应收到的时刻」，保留原值
	var responses []models.Response
	if err := tx.Where("endpoint_id = ?", srcEndpointID).Find(&responses).Error; err != nil {
		return err
	}
	for _, r := range responses {
		r.ID, r.EndpointID = "", dstEndpointID
		if err := tx.Create(&r).Error; err != nil {
			return err
		}
	}

	return cloneOperations(tx, models.OperationOwnerEndpoint, srcEndpointID, dstEndpointID, scriptIDs)
}

// cloneOperations 复制某个归属对象的前置/后置操作，并把引用脚本库的操作指向克隆出的新脚本
func cloneOperations(tx *gorm.DB, ownerType models.OperationOwnerType, srcOwnerID, dstOwnerID string, scriptIDs map[string]string) error {
	var ops []models.Operation
	if err := tx.Where("owner_type = ? AND owner_id = ?", string(ownerType), srcOwnerID).
		Order("sort_order ASC").Find(&ops).Error; err != nil {
		return err
	}
	for _, op := range ops {
		op.ID, op.OwnerID = "", dstOwnerID
		if op.Type == string(models.OpTypeLibraryScript) {
			op.Data = remapLibraryScriptID(op.Data, scriptIDs)
		}
		if err := tx.Create(&op).Error; err != nil {
			return err
		}
	}
	return nil
}

// remapLibraryScriptID 把 libraryScript 操作数据里的 libraryId 换成克隆出的新脚本 ID。
// 按 map 改写而不是走 ScriptOperationData 结构体，避免把将来新增的字段在往返中丢掉；
// 解析不出或映射不到时原样返回——留个指不到的引用，也好过让整次克隆失败。
func remapLibraryScriptID(data string, scriptIDs map[string]string) string {
	if data == "" {
		return data
	}
	var raw map[string]any
	if err := json.Unmarshal([]byte(data), &raw); err != nil {
		return data
	}
	oldID, _ := raw["libraryId"].(string)
	newID, ok := scriptIDs[oldID]
	if !ok {
		return data
	}
	raw["libraryId"] = newID
	encoded, err := json.Marshal(raw)
	if err != nil {
		return data
	}
	return string(encoded)
}

// GetProjectTree 获取项目的完整树形结构（模块 + 文件夹 + 端点）
func (s *ProjectService) GetProjectTree(id string) ([]ModuleTree, error) {
	var modules []models.Module
	if err := s.db.Where("project_id = ?", id).Order("sort_order ASC").Find(&modules).Error; err != nil {
		return nil, err
	}

	var result []ModuleTree
	for _, module := range modules {
		tree := ModuleTree{
			ID:              module.ID,
			ProjectID:       module.ProjectID,
			Name:            module.Name,
			SortOrder:       module.SortOrder,
			EndpointDisplay: module.EndpointDisplay,
			CreatedAt:       module.CreatedAt,
			UpdatedAt:       module.UpdatedAt,
			Folders:         []FolderTree{},
			Endpoints:       []models.Endpoint{},
		}

		// 获取模块下直属的端点（不在任何文件夹中的）
		if err := s.db.Where("module_id = ? AND folder_id IS NULL", module.ID).
			Order("sort_order ASC").Find(&tree.Endpoints).Error; err != nil {
			return nil, err
		}

		// 获取模块下的顶级文件夹（先查 models.Folder 再转 FolderTree，避免 GORM 解析 FolderTree 的递归字段报错）
		var topFolders []models.Folder
		if err := s.db.Where("module_id = ? AND parent_id IS NULL", module.ID).
			Order("sort_order ASC").Find(&topFolders).Error; err != nil {
			return nil, err
		}

		// 将 parent_id 为空的顶级文件夹（即根文件夹）的内容展开到模块层级，不显示根文件夹本身
		tree.Folders = make([]FolderTree, 0)
		for _, f := range topFolders {
			// 构建根文件夹的完整树
			rootTree := FolderTree{
				ID:        f.ID,
				ModuleID:  f.ModuleID,
				ParentID:  f.ParentID,
				Name:      f.Name,
				SortOrder: f.SortOrder,
				CreatedAt: f.CreatedAt,
				UpdatedAt: f.UpdatedAt,
				Children:  []FolderTree{},
				Endpoints: []models.Endpoint{},
			}
			if err := s.buildFolderTree(&rootTree); err != nil {
				return nil, err
			}
			// 将根文件夹的子文件夹和端点直接合并到模块层级
			tree.Endpoints = append(tree.Endpoints, rootTree.Endpoints...)
			tree.Folders = append(tree.Folders, rootTree.Children...)
		}

		result = append(result, tree)
	}

	return result, nil
}

// buildFolderTree 递归构建文件夹树
func (s *ProjectService) buildFolderTree(folder *FolderTree) error {
	// 获取子文件夹（先查 models.Folder 再转 FolderTree，避免 GORM 解析 FolderTree 的递归字段报错）
	var childFolders []models.Folder
	if err := s.db.Where("parent_id = ?", folder.ID).
		Order("sort_order ASC").Find(&childFolders).Error; err != nil {
		return err
	}

	// 转换为 FolderTree
	folder.Children = make([]FolderTree, len(childFolders))
	for i, f := range childFolders {
		folder.Children[i] = FolderTree{
			ID:        f.ID,
			ModuleID:  f.ModuleID,
			ParentID:  f.ParentID,
			Name:      f.Name,
			SortOrder: f.SortOrder,
			CreatedAt: f.CreatedAt,
			UpdatedAt: f.UpdatedAt,
			Children:  []FolderTree{},
			Endpoints: []models.Endpoint{},
		}
	}

	// 获取文件夹下的端点
	if err := s.db.Model(&models.Endpoint{}).Where("folder_id = ?", folder.ID).
		Order("sort_order ASC").Find(&folder.Endpoints).Error; err != nil {
		return err
	}

	// 递归处理子文件夹
	for i := range folder.Children {
		if err := s.buildFolderTree(&folder.Children[i]); err != nil {
			return err
		}
	}

	return nil
}

// ModuleTree 模块树形结构（不含 GORM 标签，避免与 models.Module 的 GORM 注解冲突）
type ModuleTree struct {
	ID              string            `json:"id"`
	ProjectID       string            `json:"projectId"`
	Name            string            `json:"name"`
	SortOrder       int               `json:"sortOrder"`
	EndpointDisplay string            `json:"endpointDisplay"` // name / url
	CreatedAt       time.Time         `json:"createdAt"`
	UpdatedAt       time.Time         `json:"updatedAt"`
	Folders         []FolderTree      `json:"folders"`
	Endpoints       []models.Endpoint `json:"endpoints"`
}

// FolderTree 文件夹树形结构（不含 GORM 标签，避免与 models.Folder 的 GORM 注解冲突）
type FolderTree struct {
	ID        string            `json:"id"`
	ModuleID  string            `json:"moduleId"`
	ParentID  *string           `json:"parentId"`
	Name      string            `json:"name"`
	SortOrder int               `json:"sortOrder"`
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
	Children  []FolderTree      `json:"children"`
	Endpoints []models.Endpoint `json:"endpoints"`
}
