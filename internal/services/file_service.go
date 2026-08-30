package services

import (
	"os"
	"path/filepath"

	"PostPigeon/internal/apperr"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// FileService 让界面能选到「本机上的一个文件」。
//
// 为什么要它：请求体里的附件现在存路径而不是内容，而浏览器的 <input type="file">
// 出于安全根本不给路径——拿得到的只有内容。所以选文件这件事必须走原生对话框。
type FileService struct{}

// NewFileService 创建文件服务实例。
func NewFileService() *FileService {
	return &FileService{}
}

// FileRef 一个本地文件的引用。
type FileRef struct {
	// Path 绝对路径，空表示用户取消了选择
	Path string `json:"path"`
	// Name 文件名（路径的最后一段）
	Name string `json:"name"`
	// Size 字节数，文件不存在时为 0
	Size int64 `json:"size"`
	// Exists 文件当前是否还在
	Exists bool `json:"exists"`
}

// PickFile 打开原生文件选择框；用户取消时返回 Path 为空的结果。
func (s *FileService) PickFile() (FileRef, error) {
	path, err := application.Get().Dialog.OpenFile().
		CanChooseFiles(true).
		PromptForSingleSelection()
	if err != nil {
		return FileRef{}, apperr.Wrap(err, apperr.CodeInvalidInput)
	}
	if path == "" {
		return FileRef{}, nil // 用户取消
	}
	return s.StatFile(path), nil
}

// PickFiles 打开原生文件选择框并允许多选；用户取消时返回空列表。
func (s *FileService) PickFiles() ([]FileRef, error) {
	paths, err := application.Get().Dialog.OpenFile().
		CanChooseFiles(true).
		PromptForMultipleSelection()
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeInvalidInput)
	}
	refs := make([]FileRef, 0, len(paths))
	for _, path := range paths {
		if path != "" {
			refs = append(refs, s.StatFile(path))
		}
	}
	return refs, nil
}

// StatFile 查一个路径当前的状态，供界面提示「这个附件已经不在了」。
func (s *FileService) StatFile(path string) FileRef {
	ref := FileRef{Path: path, Name: filepath.Base(path)}
	if path == "" {
		return ref
	}
	stat, err := os.Stat(path)
	if err != nil || stat.IsDir() {
		return ref
	}
	ref.Exists = true
	ref.Size = stat.Size()
	return ref
}
