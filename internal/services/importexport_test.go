package services

import (
	"strings"
	"testing"

	"gorm.io/gorm"

	"PostPigeon/internal/models"
)

func TestImportExportRoundTrip(t *testing.T) {
	db := newTestDB(t)
	ps := NewProjectService(db)
	es := NewEndpointService(db)
	fs := NewFolderService(db)
	envs := NewEnvironmentService(db)
	ie := NewImportExportService(db)

	// 构造一个有内容的项目
	p := mustCreateProject(t, db, "源项目")
	m := defaultModule(t, db, p.ID)
	env := firstEnvironment(t, db, p.ID)
	if err := envs.SaveEnvironmentVariables(env.ID, []models.EnvironmentVariable{
		{Key: "k", Value: "v", Enabled: true},
	}); err != nil {
		t.Fatalf("保存变量 err=%v", err)
	}
	if err := NewModuleService(db).SetModuleBaseURL(m.ID, env.ID, "https://api.example.com"); err != nil {
		t.Fatalf("设置前置URL err=%v", err)
	}
	folder, _ := fs.CreateFolder(m.ID, nil, "Docs")
	e1, _ := es.CreateEndpoint(m.ID, nil, "List", "GET", "/list")
	if err := es.SaveEndpointData(EndpointSaveData{
		ID: e1.ID, Name: "List", Method: "GET", Path: "/list",
		Params:  []models.EndpointParam{{Type: "query", Name: "a", Value: "1", Enabled: true}},
		Headers: []models.EndpointHeader{{Name: "H", Value: "h", Enabled: true}},
		Auth:    &models.EndpointAuth{Type: "bearer", Data: models.ToJSON(models.BearerAuthData{Token: "tok"})},
	}); err != nil {
		t.Fatalf("保存端点 err=%v", err)
	}
	_, _ = es.CreateEndpoint(m.ID, &folder.ID, "Detail", "GET", "/d/1")

	// 导出
	jsonStr, err := ie.ExportProject(p.ID, true)
	if err != nil {
		t.Fatalf("ExportProject err=%v", err)
	}
	if !strings.Contains(jsonStr, `"version"`) {
		t.Errorf("导出 JSON 缺少 version 字段")
	}

	// 导入为新项目
	np, err := ie.ImportProject(jsonStr)
	if err != nil {
		t.Fatalf("ImportProject err=%v", err)
	}
	if np.ID == p.ID {
		t.Error("导入应生成新项目 ID")
	}
	if np.Name != "源项目" {
		t.Errorf("导入项目名 = %q", np.Name)
	}

	// 校验结构：通过项目树
	tree, err := ps.GetProjectTree(np.ID)
	if err != nil {
		t.Fatalf("GetProjectTree(导入后) err=%v", err)
	}
	if len(tree) != 1 {
		t.Fatalf("导入后模块数 = %d，期望 1", len(tree))
	}
	mt := tree[0]
	// 模块直属端点 List
	var foundList bool
	for _, ep := range mt.Endpoints {
		if ep.Name == "List" {
			foundList = true
		}
	}
	if !foundList {
		t.Errorf("导入后未找到模块直属端点 List，端点=%v", endpointNames(mt.Endpoints))
	}
	// 文件夹 Docs 及其端点 Detail
	if len(mt.Folders) != 1 || mt.Folders[0].Name != "Docs" {
		t.Fatalf("导入后文件夹 = %v，期望 [Docs]", folderNames(mt.Folders))
	}
	if len(mt.Folders[0].Endpoints) != 1 || mt.Folders[0].Endpoints[0].Name != "Detail" {
		t.Errorf("Docs 下端点 = %v，期望 [Detail]", endpointNames(mt.Folders[0].Endpoints))
	}

	// 校验 List 端点的关联数据是否一并导入
	var listID string
	for _, ep := range mt.Endpoints {
		if ep.Name == "List" {
			listID = ep.ID
		}
	}
	detail, err := es.GetEndpoint(listID)
	if err != nil {
		t.Fatalf("GetEndpoint(导入的 List) err=%v", err)
	}
	if len(detail.Params) != 1 {
		t.Errorf("导入后 List 参数数 = %d，期望 1", len(detail.Params))
	}
	if len(detail.Headers) != 1 {
		t.Errorf("导入后 List 请求头数 = %d，期望 1", len(detail.Headers))
	}
	if detail.Auth == nil || detail.Auth.Type != "bearer" {
		t.Errorf("导入后 List 认证 = %+v，期望 bearer", detail.Auth)
	}

	// 校验环境与变量
	importedEnvs, _ := envs.ListEnvironments(np.ID)
	if len(importedEnvs) != 2 {
		t.Errorf("导入后环境数 = %d，期望 2", len(importedEnvs))
	}
	var foundVar bool
	for _, ie := range importedEnvs {
		vs, _ := envs.GetEnvironmentVariables(ie.ID)
		for _, v := range vs {
			if v.Key == "k" && v.Value == "v" {
				foundVar = true
			}
		}
	}
	if !foundVar {
		t.Error("导入后未找到环境变量 k=v")
	}

	// 校验模块前置 URL 随环境 ID 映射一并恢复
	importedModuleID := tree[0].ID
	var importedEnvID string
	for _, ie := range importedEnvs {
		if ie.Name == env.Name {
			importedEnvID = ie.ID
		}
	}
	urls, _ := NewModuleService(db).GetModuleBaseURLs(importedModuleID)
	var foundURL bool
	for _, u := range urls {
		if u.EnvironmentID == importedEnvID && u.BaseURL == "https://api.example.com" {
			foundURL = true
		}
	}
	if !foundURL {
		t.Errorf("导入后未恢复模块前置 URL，urls=%+v", urls)
	}
}

func endpointNames(eps []models.Endpoint) []string {
	out := make([]string, 0, len(eps))
	for _, e := range eps {
		out = append(out, e.Name)
	}
	return out
}

func folderNames(fs []FolderTree) []string {
	out := make([]string, 0, len(fs))
	for _, f := range fs {
		out = append(out, f.Name)
	}
	return out
}

// buildSecretProject 造一个带各类凭据的项目：秘密变量、bearer、oauth2、basic。
func buildSecretProject(t *testing.T, db *gorm.DB) *models.Project {
	t.Helper()
	p := mustCreateProject(t, db, "带凭据的项目")
	m, err := NewModuleService(db).CreateModule(p.ID, "模块")
	if err != nil {
		t.Fatalf("建模块失败: %v", err)
	}

	envSvc := NewEnvironmentService(db)
	env, err := envSvc.CreateEnvironment(p.ID, "生产")
	if err != nil {
		t.Fatalf("建环境失败: %v", err)
	}
	if err := envSvc.SaveEnvironmentVariables(env.ID, []models.EnvironmentVariable{
		{Key: "API_TOKEN", Value: "super-secret-token", IsSecret: true},
		{Key: "BASE_PATH", Value: "/api/v1", IsSecret: false},
	}); err != nil {
		t.Fatalf("保存变量失败: %v", err)
	}

	es := NewEndpointService(db)
	bearer, _ := es.CreateEndpoint(m.ID, nil, "Bearer 接口", "GET", "/b")
	if err := es.SaveEndpointData(EndpointSaveData{
		ID: bearer.ID, Name: "Bearer 接口", Method: "GET", Path: "/b",
		Auth: &models.EndpointAuth{Type: "bearer", Data: models.ToJSON(models.BearerAuthData{Token: "bearer-secret"})},
	}); err != nil {
		t.Fatalf("保存端点失败: %v", err)
	}

	oauth, _ := es.CreateEndpoint(m.ID, nil, "OAuth 接口", "GET", "/o")
	if err := es.SaveEndpointData(EndpointSaveData{
		ID: oauth.ID, Name: "OAuth 接口", Method: "GET", Path: "/o",
		Auth: &models.EndpointAuth{Type: "oauth2", Data: models.ToJSON(models.OAuth2AuthData{
			GrantType: "client_credentials", TokenURL: "https://auth.example.com/token",
			ClientID: "public-client-id", ClientSecret: "oauth-secret",
		})},
	}); err != nil {
		t.Fatalf("保存端点失败: %v", err)
	}

	basic, _ := es.CreateEndpoint(m.ID, nil, "Basic 接口", "GET", "/a")
	if err := es.SaveEndpointData(EndpointSaveData{
		ID: basic.ID, Name: "Basic 接口", Method: "GET", Path: "/a",
		Auth: &models.EndpointAuth{Type: "basic", Data: models.ToJSON(models.BasicAuthData{
			Username: "alice", Password: "basic-secret",
		})},
	}); err != nil {
		t.Fatalf("保存端点失败: %v", err)
	}
	return p
}

// TestInspectExportSecrets 统计只算真的填了凭据的条目。
func TestInspectExportSecrets(t *testing.T) {
	db := newTestDB(t)
	ie := NewImportExportService(db)
	p := buildSecretProject(t, db)

	summary, err := ie.InspectExportSecrets(p.ID)
	if err != nil {
		t.Fatalf("统计失败: %v", err)
	}
	if summary.SecretVariables != 1 {
		t.Errorf("秘密变量 = %d，期望 1（非秘密的不算）", summary.SecretVariables)
	}
	if summary.AuthCredentials != 3 {
		t.Errorf("带凭据的接口 = %d，期望 3", summary.AuthCredentials)
	}
	if summary.Total() != 4 {
		t.Errorf("合计 = %d", summary.Total())
	}

	// 没有任何凭据的项目应当是 0，界面据此决定不打扰用户
	clean := mustCreateProject(t, db, "干净项目")
	cleanSummary, err := ie.InspectExportSecrets(clean.ID)
	if err != nil {
		t.Fatalf("统计失败: %v", err)
	}
	if cleanSummary.Total() != 0 {
		t.Errorf("干净项目不该有凭据: %+v", cleanSummary)
	}
}

// TestExportWithoutSecrets 不带凭据导出时，值必须消失、但配置要留着。
func TestExportWithoutSecrets(t *testing.T) {
	db := newTestDB(t)
	ie := NewImportExportService(db)
	p := buildSecretProject(t, db)

	stripped, err := ie.ExportProject(p.ID, false)
	if err != nil {
		t.Fatalf("导出失败: %v", err)
	}

	for _, secret := range []string{"super-secret-token", "bearer-secret", "oauth-secret", "basic-secret"} {
		if strings.Contains(stripped, secret) {
			t.Errorf("导出文件里仍有凭据 %q", secret)
		}
	}
	// 条目与非凭据配置必须保留，否则对方不知道该填什么
	for _, keep := range []string{"API_TOKEN", "BASE_PATH", "/api/v1", "https://auth.example.com/token", "public-client-id", "alice"} {
		if !strings.Contains(stripped, keep) {
			t.Errorf("导出文件里丢了不该丢的 %q", keep)
		}
	}

	// 去掉凭据之后仍是一份可导入的完整数据
	imported, err := ie.ImportProject(stripped)
	if err != nil {
		t.Fatalf("导入去凭据的导出失败: %v", err)
	}
	if imported.ID == p.ID {
		t.Error("导入应生成新项目")
	}
}

// TestExportWithSecrets 明确选择「包含凭据」时才原样带出去。
func TestExportWithSecrets(t *testing.T) {
	db := newTestDB(t)
	ie := NewImportExportService(db)
	p := buildSecretProject(t, db)

	full, err := ie.ExportProject(p.ID, true)
	if err != nil {
		t.Fatalf("导出失败: %v", err)
	}
	for _, secret := range []string{"super-secret-token", "bearer-secret", "oauth-secret", "basic-secret"} {
		if !strings.Contains(full, secret) {
			t.Errorf("选择包含凭据时应带上 %q", secret)
		}
	}
}
