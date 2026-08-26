package services

import (
	"PostPigeon/internal/config"
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
	// RepositoryURL 源码仓库地址
	RepositoryURL string `json:"repositoryUrl"`
	// ReleasesURL 历史版本页面。用户在版本之间来回跳是常态——新版本用着不顺手想退回
	// 旧版本，总得有个地方能拿到旧版本的安装包，而不是自己去翻 GitHub。
	ReleasesURL string `json:"releasesUrl"`
}

// GetAppInfo 获取应用信息
// 返回版本号、构建哈希和构建时间
// 如果构建时间为空（dev模式），则返回应用启动时间
func (s *AppService) GetAppInfo() AppInfo {
	buildTime := config.BuildTime
	// 如果构建时间为空或为 "dev"，使用应用启动时间（UTC 时间，ISO 8601 格式）
	if buildTime == "" || buildTime == "dev" {
		buildTime = s.startTime.UTC().Format(time.RFC3339)
	}

	return AppInfo{
		Version:       config.Version,
		BuildHash:     config.BuildHash,
		BuildTime:     buildTime,
		RepositoryURL: RepositoryURL(),
		ReleasesURL:   ReleasesURL(),
	}
}

// RepositoryURL 返回源码仓库地址。
func RepositoryURL() string {
	return "https://github.com/" + config.Repository
}

// ReleasesURL 返回历史版本页面地址。
func ReleasesURL() string {
	return RepositoryURL() + "/releases"
}
