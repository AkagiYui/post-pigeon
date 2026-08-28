package services

import (
	"strings"
	"testing"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// saveModuleVars 保存模块变量并断言成功。
func saveModuleVars(t *testing.T, db *gorm.DB, moduleID string, vars []models.ModuleVariable) {
	t.Helper()
	svc := NewScopeSettingsService(db)
	settings, err := svc.GetModuleSettings(moduleID)
	if err != nil {
		t.Fatalf("读取模块设置失败: %v", err)
	}
	settings.Variables = vars
	if err := svc.SaveModuleSettings(moduleID, *settings); err != nil {
		t.Fatalf("保存模块变量失败: %v", err)
	}
}

// TestModuleVars_Priority 钉住三层变量的解析优先级：环境变量 > 模块变量 > 全局变量。
// 三个作用域各放一个同名键 + 一个独占键，一次请求里同时验证覆盖与可见性。
func TestModuleVars_Priority(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

	p := mustCreateProject(t, db, "prio")
	m := defaultModule(t, db, p.ID)
	env, err := NewEnvironmentService(db).CreateEnvironment(p.ID, "dev")
	if err != nil {
		t.Fatalf("创建环境失败: %v", err)
	}

	if err := NewGlobalVariableService(db).SaveGlobalVariables(p.ID, []models.GlobalVariable{
		{Key: "shared", Value: "from-global", Enabled: true},
		{Key: "onlyGlobal", Value: "g", Enabled: true},
	}); err != nil {
		t.Fatalf("保存全局变量失败: %v", err)
	}
	saveModuleVars(t, db, m.ID, []models.ModuleVariable{
		{Key: "shared", Value: "from-module", Enabled: true},
		{Key: "onlyModule", Value: "m", Enabled: true},
		{Key: "disabled", Value: "should-not-apply", Enabled: false},
	})
	if err := NewEnvironmentService(db).SaveEnvironmentVariables(env.ID, []models.EnvironmentVariable{
		{Key: "shared", Value: "from-env", Enabled: true},
	}); err != nil {
		t.Fatalf("保存环境变量失败: %v", err)
	}

	resp, err := hs.SendRequest(SendRequestData{
		ModuleID: m.ID, EnvironmentID: env.ID,
		Method: "POST", BaseURL: srv.URL, Path: "/echo",
		BodyType:    string(models.BodyTypeJSON),
		BodyContent: `{"shared":"{{shared}}","g":"{{onlyGlobal}}","m":"{{onlyModule}}","d":"{{disabled}}"}`,
	})
	if err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}
	echo := decodeEcho(t, resp.Body)
	body, _ := echo["body"].(string)
	want := `{"shared":"from-env","g":"g","m":"m","d":"{{disabled}}"}`
	if body != want {
		t.Errorf("变量解析 = %s，期望 %s", body, want)
	}
}

// TestModuleVars_OverrideGlobal 无环境时，模块变量应覆盖同名全局变量。
func TestModuleVars_OverrideGlobal(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

	p := mustCreateProject(t, db, "override")
	m := defaultModule(t, db, p.ID)
	if err := NewGlobalVariableService(db).SaveGlobalVariables(p.ID, []models.GlobalVariable{
		{Key: "host", Value: "global-host", Enabled: true},
	}); err != nil {
		t.Fatalf("保存全局变量失败: %v", err)
	}
	saveModuleVars(t, db, m.ID, []models.ModuleVariable{
		{Key: "host", Value: "module-host", Enabled: true},
	})

	resp, err := hs.SendRequest(SendRequestData{
		ModuleID: m.ID,
		Method:   "GET", BaseURL: srv.URL, Path: "/echo",
		Headers: []models.EndpointHeader{{Name: "X-Host", Value: "{{host}}", Enabled: true}},
	})
	if err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}
	echo := decodeEcho(t, resp.Body)
	hdr, _ := echo["headers"].(map[string]any)
	if hdr["X-Host"] != "module-host" {
		t.Errorf("X-Host = %v，期望 module-host（模块变量覆盖全局变量）", hdr["X-Host"])
	}
}

// TestModuleVars_ScopedToModule 模块变量对其它模块不可见。
func TestModuleVars_ScopedToModule(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

	p := mustCreateProject(t, db, "scoped")
	m1 := defaultModule(t, db, p.ID)
	m2, err := NewModuleService(db).CreateModule(p.ID, "另一个模块")
	if err != nil {
		t.Fatalf("创建模块失败: %v", err)
	}
	saveModuleVars(t, db, m1.ID, []models.ModuleVariable{{Key: "secretKey", Value: "v1", Enabled: true}})

	resp, err := hs.SendRequest(SendRequestData{
		ModuleID: m2.ID,
		Method:   "GET", BaseURL: srv.URL, Path: "/echo",
		Headers: []models.EndpointHeader{{Name: "X-K", Value: "{{secretKey}}", Enabled: true}},
	})
	if err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}
	echo := decodeEcho(t, resp.Body)
	hdr, _ := echo["headers"].(map[string]any)
	if hdr["X-K"] != "{{secretKey}}" {
		t.Errorf("X-K = %v，期望占位符原样保留（模块变量不应跨模块可见）", hdr["X-K"])
	}
}

// TestModuleVars_ScriptReadWrite 脚本里 pm.moduleVariables 可读取模块变量，
// 写入的值在请求结束后落库（新增与更新两种情况）。
func TestModuleVars_ScriptReadWrite(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

	p := mustCreateProject(t, db, "script")
	m := defaultModule(t, db, p.ID)
	saveModuleVars(t, db, m.ID, []models.ModuleVariable{{Key: "token", Value: "old", Enabled: true}})

	resp, err := hs.SendRequest(SendRequestData{
		ModuleID: m.ID,
		Method:   "POST", BaseURL: srv.URL, Path: "/echo",
		PreRequestScript: `
			pm.request.headers.upsert('X-Read', pm.moduleVariables.get('token'));
			pm.moduleVariables.set('token', 'new');
		`,
		PostResponseScript: `pm.moduleVariables.set('fresh', 'created');`,
	})
	if err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}
	echo := decodeEcho(t, resp.Body)
	hdr, _ := echo["headers"].(map[string]any)
	if hdr["X-Read"] != "old" {
		t.Errorf("pm.moduleVariables.get = %v，期望 old", hdr["X-Read"])
	}

	var vars []models.ModuleVariable
	db.Where("module_id = ?", m.ID).Order("sort_order ASC").Find(&vars)
	got := map[string]string{}
	for _, v := range vars {
		got[v.Key] = v.Value
	}
	if got["token"] != "new" {
		t.Errorf("已有模块变量未被脚本更新：token = %q，期望 new", got["token"])
	}
	if got["fresh"] != "created" {
		t.Errorf("脚本新增的模块变量未落库：fresh = %q，期望 created", got["fresh"])
	}
}

// TestModuleVars_ScriptUnsetPersists 脚本删除的模块变量应从库里消失。
func TestModuleVars_ScriptUnsetPersists(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

	p := mustCreateProject(t, db, "unset")
	m := defaultModule(t, db, p.ID)
	saveModuleVars(t, db, m.ID, []models.ModuleVariable{
		{Key: "keep", Value: "1", Enabled: true},
		{Key: "drop", Value: "2", Enabled: true},
	})

	if _, err := hs.SendRequest(SendRequestData{
		ModuleID: m.ID,
		Method:   "GET", BaseURL: srv.URL, Path: "/echo",
		PostResponseScript: `pm.moduleVariables.unset('drop');`,
	}); err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}

	var count int64
	db.Model(&models.ModuleVariable{}).Where("module_id = ? AND key = ?", m.ID, "drop").Count(&count)
	if count != 0 {
		t.Errorf("被脚本 unset 的模块变量仍在库中（%d 行）", count)
	}
	db.Model(&models.ModuleVariable{}).Where("module_id = ? AND key = ?", m.ID, "keep").Count(&count)
	if count != 1 {
		t.Errorf("未被删除的模块变量应保留，实际 %d 行", count)
	}
}

// TestModuleVars_SaveRoundTrip 模块设置的读写往返：变量与自动参数互不干扰，
// 且保存是整体替换（删掉的行不会残留）。
func TestModuleVars_SaveRoundTrip(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "roundtrip")
	m := defaultModule(t, db, p.ID)
	svc := NewScopeSettingsService(db)

	if err := svc.SaveModuleSettings(m.ID, ModuleSettings{
		AuthType: "none",
		Params:   []models.ModuleParam{{Type: "query", Name: "trace", Value: "1", Enabled: true}},
		Variables: []models.ModuleVariable{
			{Key: "a", Value: "1", Description: "第一个", Enabled: true},
			{Key: "b", Value: "2", Enabled: false, IsSecret: true},
			{Key: "", Value: "空键应被丢弃", Enabled: true},
		},
	}); err != nil {
		t.Fatalf("保存模块设置失败: %v", err)
	}

	got, err := svc.GetModuleSettings(m.ID)
	if err != nil {
		t.Fatalf("读取模块设置失败: %v", err)
	}
	if len(got.Variables) != 2 {
		t.Fatalf("模块变量数 = %d，期望 2（空键被丢弃）", len(got.Variables))
	}
	if got.Variables[0].Key != "a" || got.Variables[0].Value != "1" || got.Variables[0].Description != "第一个" {
		t.Errorf("第一条变量 = %+v", got.Variables[0])
	}
	// enabled 的 false 与 isSecret 的 true 都必须原样存回
	if got.Variables[1].Key != "b" || got.Variables[1].Enabled || !got.Variables[1].IsSecret {
		t.Errorf("第二条变量 = %+v，期望 enabled=false isSecret=true", got.Variables[1])
	}
	if len(got.Params) != 1 {
		t.Errorf("自动参数数 = %d，期望 1", len(got.Params))
	}

	// 整体替换：只留一条
	got.Variables = []models.ModuleVariable{{Key: "c", Value: "3", Enabled: true}}
	if err := svc.SaveModuleSettings(m.ID, *got); err != nil {
		t.Fatalf("再次保存失败: %v", err)
	}
	after, err := svc.GetModuleSettings(m.ID)
	if err != nil {
		t.Fatalf("再次读取失败: %v", err)
	}
	if len(after.Variables) != 1 || after.Variables[0].Key != "c" {
		t.Errorf("整体替换后 = %+v，期望仅剩 c", after.Variables)
	}
}

// TestModuleVars_SecretMasked 模块变量标记为 secret 后，其值不应出现在请求历史里。
func TestModuleVars_SecretMasked(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

	p := mustCreateProject(t, db, "mask")
	m := defaultModule(t, db, p.ID)
	saveModuleVars(t, db, m.ID, []models.ModuleVariable{
		{Key: "apiKey", Value: "super-secret-value", Enabled: true, IsSecret: true},
	})

	if _, err := hs.SendRequest(SendRequestData{
		ModuleID: m.ID,
		Method:   "POST", BaseURL: srv.URL, Path: "/echo",
		BodyType: string(models.BodyTypeJSON), BodyContent: `{"k":"{{apiKey}}"}`,
	}); err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}

	ok := waitFor(func() bool {
		var n int64
		db.Model(&models.RequestHistory{}).Where("module_id = ?", m.ID).Count(&n)
		return n > 0
	})
	if !ok {
		t.Fatal("请求历史未落库")
	}
	var h models.RequestHistory
	db.Where("module_id = ?", m.ID).First(&h)
	if strings.Contains(h.RequestBody, "super-secret-value") {
		t.Errorf("秘密模块变量的值出现在历史请求体里: %s", h.RequestBody)
	}
}

// apifoxModuleVarFixture 一份最小可导入的 Apifox 导出：一个模块 + 一个接口 + 两条模块变量。
const apifoxModuleVarFixture = `{
  "apifoxProject": "1.0.0",
  "$schema": { "app": "apifox", "type": "project", "version": "1.2.0" },
  "info": { "name": "带模块变量的项目" },
  "moduleSettings": [
    {
      "id": "1001",
      "name": "订单",
      "moduleVariables": [
        { "name": "orderHost", "value": "https://order.example.com", "description": "订单服务", "isSync": true },
        { "name": "orderToken", "value": "tk-123", "securityType": "secret" },
        { "name": "", "value": "空名应被忽略" }
      ]
    }
  ],
  "apiCollection": [
    {
      "name": "根目录",
      "moduleId": 1001,
      "items": [
        { "api": { "id": 1, "name": "查询订单", "method": "get", "path": "/orders" } }
      ]
    }
  ]
}`

// TestModuleVars_ApifoxImport Apifox 导出里的 moduleSettings[].moduleVariables 应落到对应模块上。
func TestModuleVars_ApifoxImport(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "apifox-modvars")

	res, err := NewApifoxService(db).ImportApifox(p.ID, apifoxModuleVarFixture, nil, "")
	if err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	if res.ModuleVars != 2 {
		t.Errorf("导入的模块变量数 = %d，期望 2（空名被忽略）", res.ModuleVars)
	}

	var mod models.Module
	if err := db.Where("project_id = ? AND name = ?", p.ID, "订单").First(&mod).Error; err != nil {
		t.Fatalf("未找到导入的模块: %v", err)
	}
	var vars []models.ModuleVariable
	db.Where("module_id = ?", mod.ID).Order("sort_order ASC").Find(&vars)
	if len(vars) != 2 {
		t.Fatalf("模块变量数 = %d，期望 2", len(vars))
	}
	if vars[0].Key != "orderHost" || vars[0].Value != "https://order.example.com" ||
		vars[0].Description != "订单服务" || !vars[0].Enabled || vars[0].IsSecret {
		t.Errorf("第一条变量 = %+v", vars[0])
	}
	if vars[1].Key != "orderToken" || vars[1].Value != "tk-123" || !vars[1].IsSecret {
		t.Errorf("第二条变量 = %+v，期望 securityType=secret 映射为 isSecret", vars[1])
	}
}

// TestModuleVars_CurlExport 「复制为 cURL」必须与发送时同口径地解析模块变量，
// 否则导出的命令会带着未解析的占位符。
func TestModuleVars_CurlExport(t *testing.T) {
	db := newTestDB(t)
	p := mustCreateProject(t, db, "curl")
	m := defaultModule(t, db, p.ID)
	saveModuleVars(t, db, m.ID, []models.ModuleVariable{
		{Key: "host", Value: "api.internal", Enabled: true},
		{Key: "token", Value: "tk-9", Enabled: true},
	})

	command, err := NewCurlService(db).ToCurl(SendRequestData{
		ModuleID: m.ID,
		Method:   "GET", BaseURL: "https://{{host}}", Path: "/ping",
		Headers: []models.EndpointHeader{{Name: "Authorization", Value: "Bearer {{token}}", Enabled: true}},
	})
	if err != nil {
		t.Fatalf("ToCurl err=%v", err)
	}
	for _, want := range []string{"https://api.internal/ping", "-H 'Authorization: Bearer tk-9'"} {
		if !strings.Contains(command, want) {
			t.Errorf("导出的命令缺少 %q\n%s", want, command)
		}
	}
	if strings.Contains(command, "{{") {
		t.Errorf("导出的命令仍含未解析的占位符\n%s", command)
	}
}
