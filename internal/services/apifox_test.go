package services

import (
	"os"
	"strings"
	"testing"

	"post-pigeon/internal/models"

	"gorm.io/gorm"
)

// corpusPath 指向真实的 Apifox 导出语料（gitignore 中，仅本地存在）。
const corpusPath = "../../tmp/杂项.apifox.json"

func loadCorpus(t *testing.T) string {
	t.Helper()
	b, err := os.ReadFile(corpusPath)
	if err != nil {
		t.Skipf("跳过：未找到 Apifox 语料 %s", corpusPath)
	}
	return string(b)
}

func TestApifoxPreview(t *testing.T) {
	corpus := loadCorpus(t)
	svc := NewApifoxService(newTestDB(t))
	p, err := svc.PreviewApifox(corpus)
	if err != nil {
		t.Fatalf("预览失败: %v", err)
	}
	if !p.IsApifox {
		t.Fatalf("应识别为 Apifox 文件")
	}
	if p.Endpoints < 80 {
		t.Errorf("接口数偏少: %d", p.Endpoints)
	}
	if p.Modules < 4 {
		t.Errorf("模块数应 >=4: %d", p.Modules)
	}
	if p.Documents < 1 {
		t.Errorf("文档数应 >=1: %d", p.Documents)
	}
	if p.Scripts < 1 {
		t.Errorf("脚本库数应 >=1: %d", p.Scripts)
	}
	t.Logf("预览: %+v", p)
}

func TestApifoxImport(t *testing.T) {
	corpus := loadCorpus(t)
	db := newTestDB(t)
	project := mustCreateProject(t, db, "apifox-import")
	svc := NewApifoxService(db)

	res, err := svc.ImportApifox(project.ID, corpus, nil)
	if err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	t.Logf("导入结果: %+v", res)

	// 接口名称应取 name 字段而非 path（如「获取音乐」）
	var namedEP int64
	db.Model(&models.Endpoint{}).Where("name = ?", "获取音乐").Count(&namedEP)
	if namedEP < 1 {
		t.Errorf("接口应以 name 命名（获取音乐），而非 path")
	}
	// 以 path 命名的接口应很少（大部分有真实名称）
	var pathNamed int64
	db.Model(&models.Endpoint{}).Where("type = ? AND name LIKE ?", "http", ":%").Count(&pathNamed)
	if pathNamed > 5 {
		t.Errorf("过多接口以 path 命名，name 解析可能有误: %d", pathNamed)
	}

	// 文件夹按名称去重：WebSocket 集合镜像的同名空目录不应造成重复（如「音乐」仅 1 个）
	var musicFolders int64
	db.Model(&models.Folder{}).Where("name = ?", "音乐").Count(&musicFolders)
	if musicFolders != 1 {
		t.Errorf("同名文件夹「音乐」应去重为 1 个，实际 %d", musicFolders)
	}

	// 端点总数：apiCollection(90) + requestCollection(3)
	var epCount int64
	db.Model(&models.Endpoint{}).Where("type = ?", "http").Count(&epCount)
	if epCount < 90 {
		t.Errorf("HTTP 端点数偏少: %d", epCount)
	}

	// 文档：至少 1 个 doc 类型端点，内容含「学校代码」
	var docs []models.Endpoint
	db.Where("type = ?", "doc").Find(&docs)
	if len(docs) < 1 {
		t.Fatalf("未导入文档")
	}
	foundDoc := false
	for _, d := range docs {
		if strings.Contains(d.DocContent, "学校代码") {
			foundDoc = true
		}
	}
	if !foundDoc {
		t.Errorf("文档内容缺失预期文本")
	}

	// 模块级 apikey 认证：时代企业邦（moduleId 7447252）根集合 auth 为 apikey
	var modApikey int64
	db.Model(&models.Module{}).Where("project_id = ? AND auth_type = ?", project.ID, "apikey").Count(&modApikey)
	if modApikey < 1 {
		t.Errorf("应有模块使用 apikey 认证")
	}
	// 模块级 bearer 认证：Gotify（moduleId 6540881）
	var modBearer int64
	db.Model(&models.Module{}).Where("project_id = ? AND auth_type = ?", project.ID, "bearer").Count(&modBearer)
	if modBearer < 1 {
		t.Errorf("应有模块使用 bearer 认证")
	}

	// 名称去重：默认模块只有一个（自动创建 + 导入复用）
	var defCount int64
	db.Model(&models.Module{}).Where("project_id = ? AND name = ?", project.ID, "默认模块").Count(&defCount)
	if defCount != 1 {
		t.Errorf("默认模块应因去重仅有 1 个，实际 %d", defCount)
	}

	// 路径参数：存在 type=path 的端点参数（如 {openid}）
	var pathParams int64
	db.Model(&models.EndpointParam{}).Where("type = ?", "path").Count(&pathParams)
	if pathParams < 1 {
		t.Errorf("应导入 path 类型参数")
	}
	// Cookie 参数
	var cookieParams int64
	db.Model(&models.EndpointParam{}).Where("type = ?", "cookie").Count(&cookieParams)
	if cookieParams < 1 {
		t.Errorf("应导入 cookie 类型参数")
	}

	// 参数 required / example 字段落库
	var reqParams int64
	db.Model(&models.EndpointParam{}).Where("required = ?", true).Count(&reqParams)
	if reqParams < 1 {
		t.Errorf("应有必填参数")
	}

	// 后置操作（customScript 转 script 操作）
	var postOps int64
	db.Model(&models.Operation{}).Where("stage = ? AND type = ?", "post", "script").Count(&postOps)
	if postOps < 1 {
		t.Errorf("应导入后置脚本操作")
	}

	// 脚本库
	var libCount int64
	db.Model(&models.ScriptLibrary{}).Where("project_id = ?", project.ID).Count(&libCount)
	if libCount < 1 {
		t.Errorf("应导入脚本库")
	}

	// 全局变量
	var gvCount int64
	db.Model(&models.GlobalVariable{}).Where("project_id = ?", project.ID).Count(&gvCount)
	if gvCount < 1 {
		t.Errorf("应导入全局变量")
	}

	// 响应示例
	var exCount int64
	db.Model(&models.ResponseExample{}).Count(&exCount)
	if exCount < 1 {
		t.Errorf("应导入响应示例")
	}

	// XML / form-data / json 请求体
	assertBodyType(t, db, "xml")
	assertBodyType(t, db, "form-data")
	assertBodyType(t, db, "json")

	// 环境按名称去重：测试环境/正式环境不重复
	var envCount int64
	db.Model(&models.Environment{}).Where("project_id = ? AND name = ?", project.ID, "测试环境").Count(&envCount)
	if envCount != 1 {
		t.Errorf("测试环境应去重为 1 个，实际 %d", envCount)
	}

	// 模块 baseUrl 已按环境写入
	var baseURLCount int64
	db.Model(&models.ModuleBaseURL{}).Count(&baseURLCount)
	if baseURLCount < 1 {
		t.Errorf("应导入模块 baseUrl")
	}
}

// TestApifoxSelectiveImport 仅导入选中的少量接口，验证按 Index 过滤生效。
func TestApifoxSelectiveImport(t *testing.T) {
	corpus := loadCorpus(t)
	db := newTestDB(t)
	project := mustCreateProject(t, db, "apifox-select")
	svc := NewApifoxService(db)

	preview, err := svc.PreviewApifox(corpus)
	if err != nil {
		t.Fatalf("预览失败: %v", err)
	}
	if len(preview.Items) < 10 {
		t.Fatalf("预览项过少: %d", len(preview.Items))
	}
	// 仅选前 3 个 http 接口
	selected := []int{}
	for _, it := range preview.Items {
		if it.Kind == "http" {
			selected = append(selected, it.Index)
			if len(selected) == 3 {
				break
			}
		}
	}
	if _, err := svc.ImportApifox(project.ID, corpus, selected); err != nil {
		t.Fatalf("选择性导入失败: %v", err)
	}
	// 仅应有 3 个接口端点被创建
	var epCount int64
	db.Model(&models.Endpoint{}).Where("type IN ?", []string{"http", "websocket", "doc"}).Count(&epCount)
	if epCount != 3 {
		t.Errorf("应仅导入 3 个选中项，实际 %d", epCount)
	}
}

func assertBodyType(t *testing.T, db *gorm.DB, bt string) {
	t.Helper()
	var n int64
	db.Model(&models.Endpoint{}).Where("body_type = ?", bt).Count(&n)
	if n < 1 {
		t.Errorf("应有 body_type=%s 的端点", bt)
	}
}
