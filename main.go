package main

import (
	"embed"
	"log"
	"log/slog"
	"os"
	"time"

	"post-pigeon/internal/config"
	"post-pigeon/internal/database"
	"post-pigeon/internal/logger"
	"post-pigeon/internal/services"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// 初始化配置
	cfg, err := config.New()
	if err != nil {
		log.Fatal("初始化配置失败:", err)
	}

	// 初始化日志系统
	logFile, err := logger.Setup(cfg)
	if err != nil {
		log.Fatal("初始化日志失败:", err)
	}
	defer logFile.Close()

	slog.Info("Post Pigeon 应用启动", "version", config.Version, "buildHash", config.BuildHash)

	// 初始化数据库
	db, err := database.Initialize(cfg.DBPath)
	if err != nil {
		log.Fatal("初始化数据库失败:", err)
	}

	// 创建服务实例
	projectService := services.NewProjectService(db)
	moduleService := services.NewModuleService(db)
	folderService := services.NewFolderService(db)
	endpointService := services.NewEndpointService(db)
	environmentService := services.NewEnvironmentService(db)
	settingsService := services.NewSettingsService(db)
	httpService := services.NewHTTPService(db)
	historyService := services.NewRequestHistoryService(db)
	importExportService := services.NewImportExportService(db)

	// 注册数据变更事件
	application.RegisterEvent[string]("data:changed")

	// 创建 Wails 应用
	app := application.New(application.Options{
		Name:        config.AppName,
		Description: "A lightweight API testing tool",
		Services: []application.Service{
			application.NewService(projectService),
			application.NewService(moduleService),
			application.NewService(folderService),
			application.NewService(endpointService),
			application.NewService(environmentService),
			application.NewService(settingsService),
			application.NewService(httpService),
			application.NewService(historyService),
			application.NewService(importExportService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// 配置 macOS 系统菜单
	appMenu := app.NewMenu()

	// 打开开发者工具的快捷键回调
	openDevToolsKeyBinding := func(window application.Window) {
		window.(*application.WebviewWindow).OpenDevTools()
	}

	windowOptions := application.WebviewWindowOptions{
		Title: config.AppName,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
		DevToolsEnabled:  true,
		KeyBindings: map[string]func(window application.Window){
			"F12": openDevToolsKeyBinding,
		},
		Width:  1280,
		Height: 720,
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
		app.Window.NewWithOptions(windowOptions)
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

	slog.Info("Post Pigeon 应用退出")
}
