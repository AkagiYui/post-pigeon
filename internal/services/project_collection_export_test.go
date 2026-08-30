package services

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

func buildProjectExportFixture(t *testing.T) (*ImportExportService, models.Project) {
	t.Helper()
	svc, firstModule := buildCollectionExportFixture(t)
	var project models.Project
	if err := svc.db.Where("id = ?", firstModule.ProjectID).First(&project).Error; err != nil {
		t.Fatalf("load project: %v", err)
	}
	var auth models.EndpointAuth
	if err := svc.db.Table("endpoint_auths AS a").Select("a.*").
		Joins("JOIN endpoints AS e ON e.id = a.endpoint_id").Where("e.module_id = ?", firstModule.ID).
		First(&auth).Error; err != nil {
		t.Fatalf("load endpoint auth: %v", err)
	}
	auth.Data = models.ToJSON(models.BearerAuthData{Token: "live-token"})
	if err := svc.db.Save(&auth).Error; err != nil {
		t.Fatalf("save endpoint auth: %v", err)
	}
	if err := svc.db.Model(&models.ModuleVariable{}).Where("module_id = ?", firstModule.ID).
		Updates(map[string]any{"is_secret": true, "value": "module-secret"}).Error; err != nil {
		t.Fatalf("mark module variable secret: %v", err)
	}
	if err := svc.db.Create(&models.ModuleParam{ModuleID: firstModule.ID, Type: "header", Name: "X-Module", Value: "one", Enabled: true}).Error; err != nil {
		t.Fatalf("create module param: %v", err)
	}

	second := models.Module{ProjectID: project.ID, Name: "Orders / Admin", SortOrder: 2}
	if err := svc.db.Create(&second).Error; err != nil {
		t.Fatalf("create second module: %v", err)
	}
	if _, err := NewEndpointService(svc.db).CreateFullEndpoint(second.ID, nil, EndpointSaveData{
		Name: "Health", Method: "GET", Path: "/health",
	}); err != nil {
		t.Fatalf("create second endpoint: %v", err)
	}
	return svc, project
}

func TestExportProjectAsNativeRoundTripPreservesAndRedactsModuleSettings(t *testing.T) {
	svc, project := buildProjectExportFixture(t)
	hidden, err := svc.ExportProjectAs(project.ID, "project", false)
	if err != nil {
		t.Fatalf("ExportProjectAs(project): %v", err)
	}
	if hidden.FileName != "export project.postpigeon.json" || hidden.Encoding != "" {
		t.Fatalf("unexpected native document metadata: %+v", hidden)
	}
	var data ExportData
	if err := json.Unmarshal([]byte(hidden.Content), &data); err != nil {
		t.Fatalf("decode native export: %v", err)
	}
	if len(data.Modules) != 2 || len(data.Modules[0].Params) != 1 || len(data.Modules[0].Variables) != 1 {
		t.Fatalf("module settings missing from native export: %+v", data.Modules)
	}
	if data.Modules[0].Variables[0].Value != "" {
		t.Fatalf("secret module variable leaked: %+v", data.Modules[0].Variables[0])
	}

	revealed, err := svc.ExportProjectAs(project.ID, "project", true)
	if err != nil {
		t.Fatalf("ExportProjectAs(project, secrets): %v", err)
	}
	if !strings.Contains(revealed.Content, "module-secret") || !strings.Contains(revealed.Content, "live-token") {
		t.Fatal("included credentials were unexpectedly removed")
	}
	imported, err := svc.ImportProject(revealed.Content)
	if err != nil {
		t.Fatalf("ImportProject(export): %v", err)
	}
	var importedModules []models.Module
	svc.db.Where("project_id = ?", imported.ID).Order("sort_order ASC").Find(&importedModules)
	var params []models.ModuleParam
	var variables []models.ModuleVariable
	svc.db.Where("module_id = ?", importedModules[0].ID).Find(&params)
	svc.db.Where("module_id = ?", importedModules[0].ID).Find(&variables)
	if len(params) != 1 || len(variables) != 1 || variables[0].Value != "module-secret" || !variables[0].IsSecret {
		t.Fatalf("native round trip lost module settings: params=%+v variables=%+v", params, variables)
	}
}

func TestExportProjectOpenAPIBundleContainsEveryModule(t *testing.T) {
	svc, project := buildProjectExportFixture(t)
	document, err := svc.ExportProjectAs(project.ID, "openapi31", false)
	if err != nil {
		t.Fatalf("ExportProjectAs(openapi31): %v", err)
	}
	if document.Encoding != "base64" || document.MediaType != "application/zip" {
		t.Fatalf("unexpected OpenAPI bundle metadata: %+v", document)
	}
	raw, err := base64.StdEncoding.DecodeString(document.Content)
	if err != nil {
		t.Fatalf("decode OpenAPI bundle: %v", err)
	}
	zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		t.Fatalf("open OpenAPI bundle: %v", err)
	}
	if len(zr.File) != 2 || zr.File[0].Name == zr.File[1].Name {
		t.Fatalf("module documents missing or collided: %+v", zr.File)
	}
	paths := map[string]bool{}
	for _, file := range zr.File {
		reader, err := file.Open()
		if err != nil {
			t.Fatal(err)
		}
		content, _ := io.ReadAll(reader)
		_ = reader.Close()
		var spec map[string]any
		if err := json.Unmarshal(content, &spec); err != nil || spec["openapi"] != "3.1.0" {
			t.Fatalf("invalid OpenAPI entry %s: err=%v spec=%v", file.Name, err, spec)
		}
		for path := range spec["paths"].(map[string]any) {
			paths[path] = true
		}
	}
	if !paths["/orders/{id}"] || !paths["/health"] {
		t.Fatalf("bundle lost module paths: %v", paths)
	}
}

func TestExportProjectInteroperableDocuments(t *testing.T) {
	svc, project := buildProjectExportFixture(t)

	postmanHidden, err := svc.ExportProjectAs(project.ID, "postman", false)
	if err != nil {
		t.Fatalf("ExportProjectAs(postman): %v", err)
	}
	if strings.Contains(postmanHidden.Content, "live-token") || strings.Contains(postmanHidden.Content, "module-secret") {
		t.Fatal("Postman export leaked credentials")
	}
	postmanFull, err := svc.ExportProjectAs(project.ID, "postman", true)
	if err != nil {
		t.Fatalf("ExportProjectAs(postman, secrets): %v", err)
	}
	collection, err := parsePostman(postmanFull.Content)
	if err != nil || len(collection.Item) != 2 || !strings.Contains(postmanFull.Content, "live-token") {
		t.Fatalf("project Postman export lost modules or credentials: err=%v collection=%+v", err, collection)
	}

	har, err := svc.ExportProjectAs(project.ID, "har", false)
	if err != nil {
		t.Fatalf("ExportProjectAs(har): %v", err)
	}
	var harDoc struct {
		Log struct {
			Entries []any `json:"entries"`
		} `json:"log"`
	}
	if err := json.Unmarshal([]byte(har.Content), &harDoc); err != nil || len(harDoc.Log.Entries) != 2 {
		t.Fatalf("project HAR lost requests: err=%v entries=%d", err, len(harDoc.Log.Entries))
	}

	markdown, err := svc.ExportProjectAs(project.ID, "markdown", false)
	if err != nil || !strings.Contains(markdown.Content, "# export project") || strings.Count(markdown.Content, "## Orders / Admin") != 2 {
		t.Fatalf("project Markdown lost hierarchy: err=%v\n%s", err, markdown.Content)
	}
	htmlDoc, err := svc.ExportProjectAs(project.ID, "html", false)
	if err != nil || !strings.Contains(htmlDoc.Content, "<!doctype html>") || !strings.Contains(htmlDoc.Content, "<h1>export project</h1>") {
		t.Fatalf("invalid project HTML: err=%v", err)
	}

	word, err := svc.ExportProjectAs(project.ID, "word", false)
	if err != nil || word.Encoding != "base64" {
		t.Fatalf("invalid Word metadata: err=%v document=%+v", err, word)
	}
	wordBytes, err := base64.StdEncoding.DecodeString(word.Content)
	if err != nil {
		t.Fatal(err)
	}
	wordZip, err := zip.NewReader(bytes.NewReader(wordBytes), int64(len(wordBytes)))
	if err != nil {
		t.Fatalf("Word output is not DOCX: %v", err)
	}
	foundDocument := false
	for _, file := range wordZip.File {
		foundDocument = foundDocument || file.Name == "word/document.xml"
	}
	if !foundDocument {
		t.Fatal("Word output missing word/document.xml")
	}
}

func TestExportProjectAsRejectsUnknownFormat(t *testing.T) {
	svc, project := buildProjectExportFixture(t)
	if _, err := svc.ExportProjectAs(project.ID, "unknown", false); err == nil {
		t.Fatal("unknown project export format should fail")
	}
}
