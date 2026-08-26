package main

import (
	"embed"
	"errors"
	"log"
	"log/slog"
	"os"
	"runtime"
	"time"

	"PostPigeon/internal/config"
	"PostPigeon/internal/crashreport"
	"PostPigeon/internal/database"
	"PostPigeon/internal/instancelock"
	"PostPigeon/internal/logger"
	"PostPigeon/internal/models"
	"PostPigeon/internal/platform"
	"PostPigeon/internal/services"
	"PostPigeon/internal/updates"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

// 变更日志随应用一起分发，「关于」里的历史记录直接读它，不必联网。
//
//go:embed CHANGELOG.md
var changelogMarkdown string

// 后台检查更新的节奏：启动 30 秒后查第一次（避开启动时的其它初始化），
// 之后每 6 小时一次。只检查、不自动下载。
const (
	updateCheckDelay    = 30 * time.Second
	updateCheckInterval = 6 * time.Hour
)

func main() {
	// 初始化配置
	cfg, err := config.New()
	if err != nil {
		fatal("初始化配置失败", err, "无法创建数据目录，请检查用户配置目录的权限与剩余空间。")
	}

	// 初始化日志系统
	logFile, err := logger.Setup(cfg)
	if err != nil {
		fatal("初始化日志失败", err, "日志目录："+cfg.LogsDir)
	}
	defer logFile.Close()

	slog.Info("PostPigeon 应用启动", "version", config.Version, "buildHash", config.BuildHash)

	// 抢占实例锁。必须放在碰数据库之前：两个实例操作同一个 SQLite 文件时，WAL 与
	// busy_timeout 会让它「看起来能用」，实际是设置、窗口状态、Cookie 互相覆盖，
	// 后关闭的那个赢；升级时更糟——两个进程会各自跑一遍迁移和迁移前备份。
	lock, err := instancelock.Acquire(cfg.DataDir)
	if errors.Is(err, instancelock.ErrAlreadyRunning) {
		slog.Info("已有实例在运行，本次启动直接退出")
		platform.ShowInfoDialog(config.AppName, "PostPigeon 已经在运行了。\n\n请切换到已经打开的窗口。")
		os.Exit(0)
	}
	if err != nil {
		fatal("获取实例锁失败", err, "数据目录："+cfg.DataDir)
	}
	defer lock.Release()

	// 运行标记：正常退出时清掉，下次启动还看得见就说明上次是崩的。
	// 放在实例锁之后，免得被随后就退出的第二个实例覆盖。
	lastRunCrashed, err := crashreport.Mark(cfg.DataDir)
	if err != nil {
		slog.Warn("写入运行标记失败", "error", err)
	}
	if lastRunCrashed {
		slog.Warn("上次未正常退出，可在设置 → 数据里导出诊断信息")
	}

	// 应用上次暂存的「从备份恢复」。必须在打开数据库之前：换掉的是数据库文件本身，
	// 已经建立的连接会看到一个被抽走的文件。
	if restored, err := database.ApplyPendingRestore(cfg.DBPath); err != nil {
		fatal("从备份恢复失败", err,
			"数据目录："+cfg.DataDir+"\n\n"+
				"待恢复的文件是 postpigeon.db.restore-pending，删掉它即可按原样启动。")
	} else if restored {
		slog.Info("已从备份恢复数据库，继续按恢复后的库启动")
	}

	// 初始化数据库
	db, err := database.Initialize(cfg.DBPath)
	if err != nil {
		fatal("数据库初始化失败", err,
			"数据目录："+cfg.DataDir+"\n"+
				"日志目录："+cfg.LogsDir+"\n\n"+
				"升级会在改动数据库前自动备份。数据目录下最新的 postpigeon.db.bak-* 就是备份，"+
				"把它改名成 postpigeon.db 即可回到升级前的状态。")
	}

	// 创建服务实例
	appService := services.NewAppService()
	projectService := services.NewProjectService(db)
	moduleService := services.NewModuleService(db)
	folderService := services.NewFolderService(db)
	endpointService := services.NewEndpointService(db)
	environmentService := services.NewEnvironmentService(db)
	settingsService := services.NewSettingsService(db)
	webSocketService := services.NewWebSocketService(db)
	httpService := services.NewHTTPService(db)
	historyService := services.NewRequestHistoryService(db)
	importExportService := services.NewImportExportService(db)
	apifoxService := services.NewApifoxService(db)
	globalVariableService := services.NewGlobalVariableService(db)
	scriptLibraryService := services.NewScriptLibraryService(db)
	scopeSettingsService := services.NewScopeSettingsService(db)
	proxyService := services.NewProxyService(db)
	tlsService := services.NewTLSService(db)
	curlService := services.NewCurlService(db)
	postmanService := services.NewPostmanService(db)
	cookieService := services.NewCookieService(db)
	dataService := services.NewDataService(db, cfg, lastRunCrashed)
	runnerService := services.NewRunnerService(db, httpService)
	updateManager := newUpdateManager()
	updaterService := services.NewUpdaterService(db, updateManager, changelogMarkdown)

	// 注册数据变更事件
	application.RegisterEvent[string]("data:changed")
	// 注册流式事件：WebSocket 消息流、HTTP 流式响应（text/event-stream）
	application.RegisterEvent[services.StreamEvent](services.WSEventName)
	application.RegisterEvent[services.StreamEvent](services.HTTPStreamEventName)
	// 注册集合运行进度事件
	application.RegisterEvent[services.RunProgress](services.RunnerEventName)

	// 窗口状态持久化服务
	windowStateService := services.NewWindowStateService(db)

	// 创建 Wails 应用
	app := application.New(application.Options{
		Name:        config.AppName,
		Description: "A lightweight API testing tool",
		Services: []application.Service{
			application.NewService(appService),
			application.NewService(projectService),
			application.NewService(moduleService),
			application.NewService(folderService),
			application.NewService(endpointService),
			application.NewService(environmentService),
			application.NewService(settingsService),
			application.NewService(httpService),
			application.NewService(historyService),
			application.NewService(importExportService),
			application.NewService(apifoxService),
			application.NewService(globalVariableService),
			application.NewService(scriptLibraryService),
			application.NewService(scopeSettingsService),
			application.NewService(proxyService),
			application.NewService(tlsService),
			application.NewService(curlService),
			application.NewService(postmanService),
			application.NewService(cookieService),
			application.NewService(dataService),
			application.NewService(runnerService),
			application.NewService(webSocketService),
			application.NewService(updaterService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// 接上更新器。必须放在 application.New 之后：app.Updater 是在那里创建的。
	// Wails 的 updater 只在内存里记「跳过的版本」与通道选择，这里把持久化的
	// 设置回填回去，否则用户每次重启都会被同一个跳过的版本再打扰一次。
	if updateManager != nil {
		if err := updateManager.Attach(app.Updater); err != nil {
			slog.Error("接入更新器失败", "error", err)
		} else {
			updateSettings := updaterService.GetUpdateSettings()
			updaterService.ApplySettings(updateSettings)
			if updateSettings.AutoCheck {
				updateManager.StartPeriodicCheck(updateCheckDelay, updateCheckInterval)
				defer updateManager.StopPeriodicCheck()
			}
		}
	}

	// 配置 macOS 系统菜单
	appMenu := app.NewMenu()

	// 打开开发者工具的快捷键回调
	openDevToolsKeyBinding := func(window application.Window) {
		window.(*application.WebviewWindow).OpenDevTools()
	}

	// Windows/Linux 端使用无边框窗口，由前端自定义标题栏
	frameless := runtime.GOOS != "darwin"

	// 尝试加载保存的窗口状态。
	// 按住 Shift 启动、设置 POSTPIGEON_RESET_WINDOW=1 或带上 --reset-window
	// 都会跳过恢复，回到默认大小与位置（后两者是 Linux/Wayland 下唯一可靠的入口）。
	skipRestore := platform.ShouldResetWindowState()
	var savedState *models.WindowState
	if !skipRestore {
		savedState, _ = windowStateService.LoadWindowState()
	}

	if skipRestore {
		slog.Info("已请求重置窗口状态，使用默认大小和位置")
	}

	// 窗口最小有效尺寸阈值，低于此值则恢复默认大小和位置
	const minWindowThreshold = 200

	// 初始化窗口大小和位置
	windowWidth := platform.DefaultWindowWidth
	windowHeight := platform.DefaultWindowHeight
	var windowX, windowY int
	windowStartPos := application.WindowCentered
	windowStartState := application.WindowStateNormal

	if savedState != nil {
		// 检查保存的尺寸是否有效（长宽均不低于阈值）
		if savedState.Width >= minWindowThreshold && savedState.Height >= minWindowThreshold {
			windowWidth = savedState.Width
			windowHeight = savedState.Height
			windowX = savedState.X
			windowY = savedState.Y
			windowStartPos = application.WindowXY
			if savedState.IsMaximised {
				windowStartState = application.WindowStateMaximised
			}
		} else {
			slog.Warn("保存的窗口尺寸过小，使用默认大小和位置",
				"width", savedState.Width, "height", savedState.Height,
				"threshold", minWindowThreshold,
			)
		}
	}

	windowOptions := application.WebviewWindowOptions{
		Title:     config.AppName,
		Frameless: frameless,
		Mac: application.MacWindow{
			// 不启用原生「隐形标题栏」拖拽条：Wails 在 macOS 上会让顶部
			// InvisibleTitleBarHeight 像素内的任意 mousedown 直接触发原生
			// performWindowDragWithEvent（见 webview_window_darwin.m 的
			// handleLeftMouseDown），该原生路径完全绕过 --wails-draggable，
			// 会导致顶栏内的项目标签一按下就被识别为「拖动窗口」，无法拖拽排序。
			// 置 0 后窗口拖动改由前端 --wails-draggable:drag（JS 路径）接管，
			// 该路径尊重 no-drag，标签得以正常拖拽排序，空白区仍可拖动窗口。
			InvisibleTitleBarHeight: 0,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		Windows: application.WindowsWindow{
			DisableFramelessWindowDecorations: false,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
		DevToolsEnabled:  true,
		KeyBindings: map[string]func(window application.Window){
			"F12": openDevToolsKeyBinding,
		},
		Width:           windowWidth,
		Height:          windowHeight,
		X:               windowX,
		Y:               windowY,
		InitialPosition: windowStartPos,
		StartState:      windowStartState,
	}

	// 应用菜单（第一个菜单项，显示应用名称）
	appSubMenu := appMenu.AddSubmenu(config.AppName)
	appSubMenu.Add("关于 " + config.AppName).SetAccelerator("Cmd+Shift+A").OnClick(func(_ *application.Context) {
		app.Menu.ShowAbout()
	})
	// 构建哈希值（灰色不可点击）
	appSubMenu.Add("版本: " + config.Version + " (" + config.BuildHash + ")").SetEnabled(false)
	appSubMenu.AddSeparator()
	appSubMenu.Add("新窗口").SetAccelerator("Cmd+Shift+N").OnClick(func(_ *application.Context) {
		// 新窗口使用默认大小并居中显示
		defaultOpts := windowOptions
		defaultOpts.InitialPosition = application.WindowCentered
		defaultOpts.StartState = application.WindowStateNormal
		defaultOpts.Width = platform.DefaultWindowWidth
		defaultOpts.Height = platform.DefaultWindowHeight
		app.Window.NewWithOptions(defaultOpts)
	})
	appSubMenu.AddSeparator()
	appSubMenu.Add("隐藏 " + config.AppName).SetAccelerator("Cmd+H").OnClick(func(_ *application.Context) {
		app.Hide()
	})
	appSubMenu.Add("退出 " + config.AppName).SetAccelerator("Cmd+Q").OnClick(func(_ *application.Context) {
		app.Quit()
	})

	// 编辑菜单
	editMenu := appMenu.AddSubmenu("编辑")
	editMenu.AddRole(application.EditMenu)

	// 视图菜单
	viewMenu := appMenu.AddSubmenu("视图")
	viewMenu.Add("开发者工具").SetAccelerator("Cmd+Option+I").OnClick(func(_ *application.Context) {
		if currentWindow := app.Window.Current(); currentWindow != nil {
			currentWindow.(*application.WebviewWindow).OpenDevTools()
		}
	})

	// 设置应用菜单
	app.Menu.Set(appMenu)

	// 创建主窗口
	mainWindow := app.Window.NewWithOptions(windowOptions)

	// 设置窗口状态持久化监听（保存位置和大小变化）
	windowStateService.SetupWindowStatePersistence(mainWindow)

	// 开发模式下自动打开开发者工具
	if config.BuildHash == "dev" {
		go func() {
			// 等待窗口加载完成
			time.Sleep(500 * time.Millisecond)
			mainWindow.OpenDevTools()
		}()
	}

	// 运行应用
	err = app.Run()
	if err != nil {
		slog.Error("应用运行失败", "error", err)
		os.Exit(1)
	}

	// 走到这里才算正常退出，清掉运行标记
	if err := crashreport.Clear(cfg.DataDir); err != nil {
		slog.Warn("清除运行标记失败", "error", err)
	}
	slog.Info("PostPigeon 应用退出")
}

// fatal 记录致命错误、弹出原生对话框，然后退出。
//
// 启动阶段的失败必须让用户看见：GUI 应用是双击起来的，既没有控制台也还没有窗口，
// 只写 stderr 的话用户看到的就是「双击没反应」，既不知道出了什么事，也不知道数据
// 还在不在。对话框由 platform.ShowErrorDialog 用系统自带工具弹，不依赖 Wails 的
// 主循环（那时 application 还没创建）。
func fatal(reason string, err error, detail string) {
	// 日志系统可能还没起来，两条都发：slog 落到默认 handler，log 落到 stderr
	slog.Error(reason, "error", err)
	log.Printf("%s: %v", reason, err)

	message := reason + "：\n" + err.Error()
	if detail != "" {
		message += "\n\n" + detail
	}
	platform.ShowErrorDialog(config.AppName+" 启动失败", message)
	os.Exit(1)
}

// newUpdateManager 构造更新管理器；不启用更新时返回 nil。
//
// 开发构建一律不接更新器：dev 的版本号恒为 0.0.1，任何正式发布都会被判定成
// 「有新版本」，一不留神就把正在开发的二进制换成了线上版本。需要在本地验证
// 更新流程时设置 POSTPIGEON_UPDATER_FORCE=1。
func newUpdateManager() *updates.Manager {
	if config.BuildHash == "dev" && os.Getenv("POSTPIGEON_UPDATER_FORCE") != "1" {
		slog.Info("开发构建，跳过更新器初始化")
		return nil
	}

	manager, err := updates.New(updates.Options{
		Repository:     config.Repository,
		AppName:        config.AppName,
		CurrentVersion: config.Version,
		// 发布流程会随产物上传 SHA256SUMS，下载后按它校验摘要
		ChecksumAsset: "SHA256SUMS",
	})
	if err != nil {
		slog.Error("初始化更新器失败", "error", err)
		return nil
	}
	return manager
}
