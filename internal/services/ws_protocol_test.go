package services

import (
	"testing"

	"PostPigeon/internal/models"
)

func TestWSProtocolConversionInheritance(t *testing.T) {
	db := newTestDB(t)
	if !getRequestSettings(db).AutoConvertWSProtocol {
		t.Fatal("全局默认应开启 WebSocket 协议头自动转换")
	}
	// 旧版本保存的 request JSON 没有新字段，升级后也必须继承默认开启值。
	if err := NewSettingsService(db).SetSetting(models.SettingsKeyRequest, `{"followRedirects":true}`); err != nil {
		t.Fatal(err)
	}
	if !getRequestSettings(db).AutoConvertWSProtocol {
		t.Fatal("旧 request JSON 缺少新字段时应回落到默认开启")
	}

	project := mustCreateProject(t, db, "ws-protocol")
	module := defaultModule(t, db, project.ID)

	var root models.Folder
	if err := db.Where("module_id = ? AND parent_id IS NULL", module.ID).First(&root).Error; err != nil {
		t.Fatalf("读取根文件夹失败: %v", err)
	}
	child := models.Folder{ModuleID: module.ID, ParentID: &root.ID, Name: "child"}
	if err := db.Create(&child).Error; err != nil {
		t.Fatalf("创建子文件夹失败: %v", err)
	}
	endpoint := models.Endpoint{ModuleID: module.ID, FolderID: &child.ID, Name: "ws", Type: "websocket", Method: "GET", Path: "/socket"}
	if err := db.Create(&endpoint).Error; err != nil {
		t.Fatalf("创建接口失败: %v", err)
	}

	// 所有非全局级默认继承，最终应落到默认开启的全局配置。
	if !resolveEffectiveWSProtocolConversion(db, endpoint, "inherit") {
		t.Fatal("五级均为默认值时应继承全局开启")
	}

	if err := NewProjectService(db).SaveProjectWSProtocolConversion(project.ID, "off"); err != nil {
		t.Fatal(err)
	}
	if resolveEffectiveWSProtocolConversion(db, endpoint, "inherit") {
		t.Fatal("项目 off 应覆盖全局 on")
	}

	if err := NewScopeSettingsService(db).SaveModuleSettings(module.ID, ModuleSettings{WSProtocolConversion: "on"}); err != nil {
		t.Fatal(err)
	}
	if !resolveEffectiveWSProtocolConversion(db, endpoint, "inherit") {
		t.Fatal("模块 on 应覆盖项目 off")
	}

	if err := NewScopeSettingsService(db).SaveFolderSettings(root.ID, FolderSettings{WSProtocolConversion: "off"}); err != nil {
		t.Fatal(err)
	}
	if resolveEffectiveWSProtocolConversion(db, endpoint, "inherit") {
		t.Fatal("父文件夹 off 应覆盖模块 on")
	}

	if err := NewScopeSettingsService(db).SaveFolderSettings(child.ID, FolderSettings{WSProtocolConversion: "on"}); err != nil {
		t.Fatal(err)
	}
	if !resolveEffectiveWSProtocolConversion(db, endpoint, "inherit") {
		t.Fatal("最近的子文件夹 on 应覆盖父文件夹 off")
	}

	if resolveEffectiveWSProtocolConversion(db, endpoint, "off") {
		t.Fatal("接口 off 应覆盖全部父级")
	}
	if !resolveEffectiveWSProtocolConversion(db, endpoint, "on") {
		t.Fatal("接口 on 应覆盖全部父级")
	}

	if err := NewProjectService(db).SaveProjectWSProtocolConversion(project.ID, "inherit"); err != nil {
		t.Fatal(err)
	}
	if err := NewScopeSettingsService(db).SaveModuleSettings(module.ID, ModuleSettings{WSProtocolConversion: "inherit"}); err != nil {
		t.Fatal(err)
	}
	if err := NewScopeSettingsService(db).SaveFolderSettings(root.ID, FolderSettings{WSProtocolConversion: "inherit"}); err != nil {
		t.Fatal(err)
	}
	if err := NewScopeSettingsService(db).SaveFolderSettings(child.ID, FolderSettings{WSProtocolConversion: "inherit"}); err != nil {
		t.Fatal(err)
	}
	global := models.DefaultRequestSettings
	global.AutoConvertWSProtocol = false
	if err := NewSettingsService(db).SaveRequestSettings(global); err != nil {
		t.Fatal(err)
	}
	if resolveEffectiveWSProtocolConversion(db, endpoint, "inherit") {
		t.Fatal("五级均继承时应采用全局关闭")
	}
}

func TestConvertHTTPToWSProtocol(t *testing.T) {
	cases := []struct {
		input   string
		enabled bool
		want    string
	}{
		{"http://example.com/socket", true, "ws://example.com/socket"},
		{"https://example.com/socket", true, "wss://example.com/socket"},
		{"HTTP://Example.com/socket", true, "ws://Example.com/socket"},
		{"ws://example.com/socket", true, "ws://example.com/socket"},
		{"https://example.com/socket", false, "https://example.com/socket"},
		{"/socket", true, "/socket"},
	}
	for _, tc := range cases {
		if got := convertHTTPToWSProtocol(tc.input, tc.enabled); got != tc.want {
			t.Errorf("convertHTTPToWSProtocol(%q, %v) = %q，期望 %q", tc.input, tc.enabled, got, tc.want)
		}
	}
}
