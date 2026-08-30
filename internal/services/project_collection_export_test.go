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

func findExportFolderByName(folders []FolderExport, name string) *FolderExport {
	for i := range folders {
		if folders[i].Name == name {
			return &folders[i]
		}
		if found := findExportFolderByName(folders[i].Children, name); found != nil {
			return found
		}
	}
	return nil
}

func TestExportProjectAsNativeRoundTripPreservesAndRedactsModuleSettings(t *testing.T) {
	svc, project := buildProjectExportFixture(t)
	var sourceModules []models.Module
	if err := svc.db.Where("project_id = ?", project.ID).Order("sort_order ASC").Find(&sourceModules).Error; err != nil {
		t.Fatal(err)
	}
	var sourceEndpoint models.Endpoint
	if err := svc.db.Where("module_id = ?", sourceModules[0].ID).First(&sourceEndpoint).Error; err != nil {
		t.Fatal(err)
	}
	var sourceFolder models.Folder
	if sourceEndpoint.FolderID == nil {
		t.Fatal("fixture endpoint has no folder")
	}
	if err := svc.db.Where("id = ?", *sourceEndpoint.FolderID).First(&sourceFolder).Error; err != nil {
		t.Fatal(err)
	}
	globalVariable := models.GlobalVariable{ProjectID: project.ID, Key: "region", Value: "sg", Description: "deployment region", Enabled: false, SortOrder: 3}
	if err := svc.db.Create(&globalVariable).Error; err != nil {
		t.Fatal(err)
	}
	script := models.ScriptLibrary{ProjectID: project.ID, Name: "sign request", Content: "export function run() {}", Description: "shared signer", SortOrder: 4}
	if err := svc.db.Create(&script).Error; err != nil {
		t.Fatal(err)
	}
	moduleOperation := models.Operation{
		OwnerType: string(models.OperationOwnerModule), OwnerID: sourceModules[0].ID,
		Stage: string(models.OperationStagePre), Type: string(models.OpTypeLibraryScript), Name: "sign", Enabled: true,
		Data: models.ToJSON(models.ScriptOperationData{LibraryID: script.ID}),
	}
	if err := svc.db.Create(&moduleOperation).Error; err != nil {
		t.Fatal(err)
	}
	folderOperation := models.Operation{
		OwnerType: string(models.OperationOwnerFolder), OwnerID: sourceFolder.ID,
		Stage: string(models.OperationStagePre), Type: string(models.OpTypeWait), Name: "wait", Enabled: false,
		Data: models.ToJSON(models.WaitOperationData{Milliseconds: 12}),
	}
	if err := svc.db.Create(&folderOperation).Error; err != nil {
		t.Fatal(err)
	}
	endpointOperation := models.Operation{
		OwnerType: string(models.OperationOwnerEndpoint), OwnerID: sourceEndpoint.ID,
		Stage: string(models.OperationStagePost), Type: string(models.OpTypeAssert), Name: "assert", Enabled: true,
		Data: models.ToJSON(models.AssertOperationData{Source: "statusCode", Comparison: "eq", Target: "201"}),
	}
	if err := svc.db.Create(&endpointOperation).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.db.Create(&models.OperationOverride{
		OwnerType: string(models.OperationOwnerFolder), OwnerID: sourceFolder.ID,
		OperationID: moduleOperation.ID, Enabled: false,
	}).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.db.Create(&models.OperationOverride{
		OwnerType: string(models.OperationOwnerEndpoint), OwnerID: sourceEndpoint.ID,
		OperationID: folderOperation.ID, Enabled: true,
	}).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.db.Create(&models.ResponseSchema{
		EndpointID: sourceEndpoint.ID, Name: "Created response", StatusCode: 201,
		ContentType: "application/json", Schema: `{"type":"object"}`, SortOrder: 2,
	}).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.db.Model(&models.Endpoint{}).Where("id = ?", sourceEndpoint.ID).Updates(map[string]any{
		"type": "websocket", "doc_content": "endpoint notes", "status": "released",
		"tags": `["orders"]`, "source": "apifox", "source_id": "remote-1",
		"disabled_global_params": `["trace"]`, "stream_view_mode": "raw",
		"stream_completion_format": "jsonpath", "stream_json_path": "$.message",
		"stream_render_markdown": true,
	}).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.db.Model(&models.EndpointParam{}).Where("endpoint_id = ?", sourceEndpoint.ID).
		Updates(map[string]any{"example": "param-example", "required": true}).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.db.Model(&models.EndpointHeader{}).Where("endpoint_id = ?", sourceEndpoint.ID).
		Updates(map[string]any{"example": "header-example", "required": true}).Error; err != nil {
		t.Fatal(err)
	}

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
	if data.Version != "1.2" || len(data.GlobalVariables) != 1 || len(data.Scripts) != 1 || len(data.Modules[0].Operations) != 1 {
		t.Fatalf("project-level data missing from native export: %+v", data)
	}
	exportedFolder := findExportFolderByName(data.Modules[0].Folders, sourceFolder.Name)
	if exportedFolder == nil || len(exportedFolder.Operations) != 1 || len(exportedFolder.OperationOverrides) != 1 {
		t.Fatalf("folder operations missing from native export: %+v", data.Modules[0].Folders)
	}
	exportedEndpoint := exportedFolder.Endpoints[0]
	if len(exportedEndpoint.Operations) != 1 || len(exportedEndpoint.OperationOverrides) != 1 || len(exportedEndpoint.Examples) != 1 || len(exportedEndpoint.Schemas) != 1 {
		t.Fatalf("endpoint details missing from native export: %+v", exportedEndpoint)
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
	var importedGlobals []models.GlobalVariable
	var importedScripts []models.ScriptLibrary
	svc.db.Where("project_id = ?", imported.ID).Find(&importedGlobals)
	svc.db.Where("project_id = ?", imported.ID).Find(&importedScripts)
	if len(importedGlobals) != 1 || importedGlobals[0].Enabled || importedGlobals[0].Value != "sg" || len(importedScripts) != 1 {
		t.Fatalf("native round trip lost globals or scripts: globals=%+v scripts=%+v", importedGlobals, importedScripts)
	}
	var importedFolder models.Folder
	if err := svc.db.Where("module_id = ? AND name = ?", importedModules[0].ID, sourceFolder.Name).First(&importedFolder).Error; err != nil {
		t.Fatal(err)
	}
	var importedEndpoint models.Endpoint
	if err := svc.db.Where("folder_id = ?", importedFolder.ID).First(&importedEndpoint).Error; err != nil {
		t.Fatal(err)
	}
	if importedEndpoint.Type != "websocket" || importedEndpoint.DocContent != "endpoint notes" || importedEndpoint.Status != "released" || importedEndpoint.SourceID != "remote-1" || importedEndpoint.StreamJSONPath != "$.message" || !importedEndpoint.StreamRenderMarkdown {
		t.Fatalf("native round trip lost endpoint fields: %+v", importedEndpoint)
	}
	var importedModuleOperations, importedFolderOperations, importedEndpointOperations []models.Operation
	svc.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerModule, importedModules[0].ID).Find(&importedModuleOperations)
	svc.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerFolder, importedFolder.ID).Find(&importedFolderOperations)
	svc.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerEndpoint, importedEndpoint.ID).Find(&importedEndpointOperations)
	if len(importedModuleOperations) != 1 || len(importedFolderOperations) != 1 || len(importedEndpointOperations) != 1 {
		t.Fatalf("native round trip lost operations: module=%+v folder=%+v endpoint=%+v", importedModuleOperations, importedFolderOperations, importedEndpointOperations)
	}
	var importedScriptData models.ScriptOperationData
	if err := json.Unmarshal([]byte(importedModuleOperations[0].Data), &importedScriptData); err != nil || importedScriptData.LibraryID != importedScripts[0].ID || importedScriptData.LibraryID == script.ID {
		t.Fatalf("library operation ID was not remapped: err=%v data=%+v scripts=%+v", err, importedScriptData, importedScripts)
	}
	var folderOverrides, endpointOverrides []models.OperationOverride
	svc.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerFolder, importedFolder.ID).Find(&folderOverrides)
	svc.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerEndpoint, importedEndpoint.ID).Find(&endpointOverrides)
	if len(folderOverrides) != 1 || folderOverrides[0].OperationID != importedModuleOperations[0].ID || len(endpointOverrides) != 1 || endpointOverrides[0].OperationID != importedFolderOperations[0].ID {
		t.Fatalf("operation override IDs were not remapped: folder=%+v endpoint=%+v", folderOverrides, endpointOverrides)
	}
	var importedExamples []models.ResponseExample
	var importedSchemas []models.ResponseSchema
	var importedEndpointParams []models.EndpointParam
	var importedHeaders []models.EndpointHeader
	svc.db.Where("endpoint_id = ?", importedEndpoint.ID).Find(&importedExamples)
	svc.db.Where("endpoint_id = ?", importedEndpoint.ID).Find(&importedSchemas)
	svc.db.Where("endpoint_id = ?", importedEndpoint.ID).Find(&importedEndpointParams)
	svc.db.Where("endpoint_id = ?", importedEndpoint.ID).Find(&importedHeaders)
	if len(importedExamples) != 1 || len(importedSchemas) != 1 || importedSchemas[0].Schema != `{"type":"object"}` {
		t.Fatalf("native round trip lost response definitions: examples=%+v schemas=%+v", importedExamples, importedSchemas)
	}
	if len(importedEndpointParams) == 0 || importedEndpointParams[0].Example != "param-example" || !importedEndpointParams[0].Required || len(importedHeaders) == 0 || importedHeaders[0].Example != "header-example" || !importedHeaders[0].Required {
		t.Fatalf("native round trip lost request metadata: params=%+v headers=%+v", importedEndpointParams, importedHeaders)
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
