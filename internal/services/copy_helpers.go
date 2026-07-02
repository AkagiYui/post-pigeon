package services

import (
	"post-pigeon/internal/models"

	"gorm.io/gorm"
)

// copyEndpointRecord 在事务内复制一个端点记录及其所有关联数据到目标模块/文件夹
// nameOverride 为空时沿用源端点名称
func copyEndpointRecord(tx *gorm.DB, src models.Endpoint, moduleID string, folderID *string, nameOverride string) error {
	name := src.Name
	if nameOverride != "" {
		name = nameOverride
	}

	newEndpoint := &models.Endpoint{
		ModuleID:        moduleID,
		FolderID:        folderID,
		Name:            name,
		Method:          src.Method,
		Path:            src.Path,
		BodyType:        src.BodyType,
		BodyContent:     src.BodyContent,
		ContentType:     src.ContentType,
		Timeout:         src.Timeout,
		FollowRedirects: src.FollowRedirects,
		SortOrder:       src.SortOrder,
	}
	if err := tx.Create(newEndpoint).Error; err != nil {
		return err
	}

	// 复制参数
	var params []models.EndpointParam
	if err := tx.Where("endpoint_id = ?", src.ID).Find(&params).Error; err != nil {
		return err
	}
	for _, p := range params {
		p.ID = ""
		p.EndpointID = newEndpoint.ID
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
	}

	// 复制请求体字段
	var bodyFields []models.EndpointBodyField
	if err := tx.Where("endpoint_id = ?", src.ID).Find(&bodyFields).Error; err != nil {
		return err
	}
	for _, bf := range bodyFields {
		bf.ID = ""
		bf.EndpointID = newEndpoint.ID
		if err := tx.Create(&bf).Error; err != nil {
			return err
		}
	}

	// 复制请求头
	var headers []models.EndpointHeader
	if err := tx.Where("endpoint_id = ?", src.ID).Find(&headers).Error; err != nil {
		return err
	}
	for _, h := range headers {
		h.ID = ""
		h.EndpointID = newEndpoint.ID
		if err := tx.Create(&h).Error; err != nil {
			return err
		}
	}

	// 复制认证信息
	var auth models.EndpointAuth
	if err := tx.Where("endpoint_id = ?", src.ID).First(&auth).Error; err == nil {
		auth.ID = ""
		auth.EndpointID = newEndpoint.ID
		if err := tx.Create(&auth).Error; err != nil {
			return err
		}
	}

	return nil
}
