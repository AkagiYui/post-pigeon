package services

import (
	"post-pigeon/internal/config"
	"time"
)

// AppService 应用信息服务
type AppService struct {
	startTime time.Time // 应用启动时间
}

// NewAppService 创建应用信息服务实例
func NewAppService() *AppService {
	return &AppService{
		startTime: time.Now(),
	}
}

// AppInfo 应用信息结构
type AppInfo struct {
	Version   string `json:"version"`   // 应用版本
	BuildHash string `json:"buildHash"` // 构建哈希
	BuildTime string `json:"buildTime"` // 构建时间
}

// GetAppInfo 获取应用信息
// 返回版本号、构建哈希和构建时间
// 如果构建时间为空（dev模式），则返回应用启动时间
func (s *AppService) GetAppInfo() AppInfo {
	buildTime := config.BuildTime
	// 如果构建时间为空或为 "dev"，使用应用启动时间
	if buildTime == "" || buildTime == "dev" {
		buildTime = s.startTime.Format("2006-01-02 15:04:05")
	}

	return AppInfo{
		Version:   config.Version,
		BuildHash: config.BuildHash,
		BuildTime: buildTime,
	}
}
