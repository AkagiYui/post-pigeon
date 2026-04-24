package services

import (
	"log/slog"
	"sync"
	"time"

	"post-pigeon/internal/models"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"gorm.io/gorm"
)

// 防抖保存的默认延迟时间
const debounceDelay = 300 * time.Millisecond

// WindowStateService 窗口状态管理服务
// 负责持久化窗口的位置和大小，以便下次启动时恢复
type WindowStateService struct {
	settingsService *SettingsService
	debounceTimer   *time.Timer        // 防抖定时器
	mu              sync.Mutex         // 保护定时器操作的互斥锁
	cachedState     models.WindowState // 缓存的最新有效窗口状态，用于窗口关闭时读取
}

// NewWindowStateService 创建窗口状态服务实例
func NewWindowStateService(db *gorm.DB) *WindowStateService {
	return &WindowStateService{
		settingsService: NewSettingsService(db),
	}
}

// LoadWindowState 从数据库加载保存的窗口状态
// 返回保存的状态和是否存在记录
func (s *WindowStateService) LoadWindowState() (*models.WindowState, bool) {
	jsonStr := s.settingsService.GetSetting(models.SettingsKeyWindowState)
	if jsonStr == "" {
		slog.Info("未找到保存的窗口状态，使用默认值")
		return nil, false
	}

	var state models.WindowState
	if err := models.FromJSON(jsonStr, &state); err != nil {
		slog.Warn("解析窗口状态失败，使用默认值", "error", err)
		return nil, false
	}

	slog.Info("已加载窗口状态",
		"x", state.X, "y", state.Y,
		"width", state.Width, "height", state.Height,
		"isMaximised", state.IsMaximised,
	)
	return &state, true
}

// SaveWindowState 保存窗口状态到数据库
// 同时更新缓存，供窗口关闭等场景使用
func (s *WindowStateService) SaveWindowState(win application.Window) {
	// 获取窗口位置和大小
	x, y := win.Position()
	width, height := win.Size()
	isMaximised := win.IsMaximised()

	state := models.WindowState{
		X:           x,
		Y:           y,
		Width:       width,
		Height:      height,
		IsMaximised: isMaximised,
	}

	// 更新缓存
	s.mu.Lock()
	s.cachedState = state
	s.mu.Unlock()

	// 保存到数据库
	s.saveState(state)
}

// saveState 将窗口状态写入数据库
func (s *WindowStateService) saveState(state models.WindowState) {
	// 校验数据有效性，避免保存无效值（如窗口关闭时可能返回0）
	if state.Width <= 0 || state.Height <= 0 {
		slog.Debug("跳过保存无效的窗口状态", "width", state.Width, "height", state.Height)
		return
	}

	jsonStr := models.ToJSON(state)
	if err := s.settingsService.SetSetting(models.SettingsKeyWindowState, jsonStr); err != nil {
		slog.Error("保存窗口状态失败", "error", err)
		return
	}

	slog.Debug("窗口状态已保存",
		"x", state.X, "y", state.Y,
		"width", state.Width, "height", state.Height,
		"isMaximised", state.IsMaximised,
	)
}

// debouncedSave 防抖保存窗口状态
// 在连续触发时只会执行最后一次，间隔由 debounceDelay 控制
func (s *WindowStateService) debouncedSave(win application.Window) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 如果已有定时器，重置它（取消之前的计划，重新计时）
	if s.debounceTimer != nil {
		s.debounceTimer.Stop()
	}
	s.debounceTimer = time.AfterFunc(debounceDelay, func() {
		s.SaveWindowState(win)
	})
}

// flushDebouncedSave 立即执行待处理的防抖保存
// 在窗口关闭等需要确保状态已保存的场景调用
// 使用缓存的状态，避免窗口已销毁时获取不到有效值
func (s *WindowStateService) flushDebouncedSave(_win application.Window) {
	s.mu.Lock()
	hasTimer := s.debounceTimer != nil
	if hasTimer {
		s.debounceTimer.Stop()
		s.debounceTimer = nil
	}
	// 使用缓存的状态（此时窗口可能已不可用）
	state := s.cachedState
	s.mu.Unlock()

	if hasTimer {
		s.saveState(state)
	}
}

// SetupWindowStatePersistence 为指定窗口设置状态持久化监听
// 监听窗口的移动、大小变化、最大化/还原和关闭事件，自动保存窗口状态
// 移动、缩放等连续事件使用防抖，避免频繁写库
func (s *WindowStateService) SetupWindowStatePersistence(win application.Window) {
	// 防抖保存（用于连续触发的事件）
	debouncedSaveFn := func(event *application.WindowEvent) {
		s.debouncedSave(win)
	}

	// 监听窗口移动事件（连续触发，使用防抖）
	win.OnWindowEvent(events.Common.WindowDidMove, debouncedSaveFn)

	// 监听窗口大小变化事件（连续触发，使用防抖）
	win.OnWindowEvent(events.Common.WindowDidResize, debouncedSaveFn)

	// 监听窗口最大化事件
	win.OnWindowEvent(events.Common.WindowMaximise, debouncedSaveFn)

	// 监听窗口取消最大化事件
	win.OnWindowEvent(events.Common.WindowUnMaximise, debouncedSaveFn)

	// 监听窗口关闭事件，关闭前确保最终状态已保存
	win.OnWindowEvent(events.Common.WindowClosing, func(event *application.WindowEvent) {
		s.flushDebouncedSave(win)
	})

	slog.Info("窗口状态持久化监听已设置（防抖延迟: " + debounceDelay.String() + "）")
}
