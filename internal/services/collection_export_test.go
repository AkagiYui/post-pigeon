package services

import (
	"encoding/json"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

func buildCollectionExportFixture(t *testing.T) (*ImportExportService, *models.Module) {
	t.Helper()
	db := newTestDB(t)
	project := mustCreateProject(t, db, "export project")
	module := defaultModule(t, db, project.ID)
	module.Name = "Orders / Admin"
	if err := db.Save(&module).Error; err != nil {
		t.Fatalf("save module: %v", err)
	}
	environment := firstEnvironment(t, db, project.ID)
	if err := NewModuleService(db).SetModuleBaseURL(module.ID, environment.ID, "https://api.example.com/v1"); err != nil {
		t.Fatalf("SetModuleBaseURL: %v", err)
	}
	if err := db.Create(&models.ModuleVariable{ModuleID: module.ID, Key: "token", Value: "secret", Enabled: true}).Error; err != nil {
		t.Fatalf("create module variable: %v", err)
	}
	folder, err := NewFolderService(db).CreateFolder(module.ID, nil, "Orders")
	if err != nil {
		t.Fatalf("CreateFolder: %v", err)
	}
	endpoint, err := NewEndpointService(db).CreateFullEndpoint(module.ID, &folder.ID, EndpointSaveData{
		Name: "Create order", Method: "POST", Path: "/orders/{id}", Description: "Creates one order",
		BodyType: string(models.BodyTypeJSON), BodyContent: `{"amount":10}`, ContentType: "application/json",
		Params: []models.EndpointParam{
			{Type: "path", Name: "id", Value: "42", Enabled: true, Required: true, DataType: "string"},
			{Type: "query", Name: "dry", Value: "true", Enabled: true, DataType: "boolean"},
		},
		Headers:            []models.EndpointHeader{{Name: "X-Trace", Value: "one", Enabled: true}},
		Auth:               &models.EndpointAuth{Type: string(models.AuthTypeBearer), Data: models.ToJSON(models.BearerAuthData{Token: "{{token}}"})},
		PreRequestScript:   "pm.environment.set('before', '1');",
		PostResponseScript: "pm.test('ok', () => pm.expect(pm.response.code).to.eql(201));",
		Examples:           []models.ResponseExample{{Name: "Created", StatusCode: 201, ContentType: "application/json", Body: `{"id":42}`}},
	})
	if err != nil || endpoint == nil {
		t.Fatalf("CreateFullEndpoint: endpoint=%+v err=%v", endpoint, err)
	}
	return NewImportExportService(db), &module
}

func TestExportOpenAPIVersions(t *testing.T) {
	svc, module := buildCollectionExportFixture(t)
	for _, tc := range []struct {
		version string
		field   string
		want    string
	}{{"3.1", "openapi", "3.1.0"}, {"3.0", "openapi", "3.0.3"}, {"2.0", "swagger", "2.0"}} {
		out, err := svc.ExportOpenAPIAs(module.ID, tc.version)
		if err != nil {
			t.Fatalf("ExportOpenAPIAs(%s): %v", tc.version, err)
		}
		var doc map[string]any
		if err := json.Unmarshal([]byte(out), &doc); err != nil {
			t.Fatalf("%s output is invalid JSON: %v", tc.version, err)
		}
		if doc[tc.field] != tc.want {
			t.Errorf("%s %s=%v, want %s", tc.version, tc.field, doc[tc.field], tc.want)
		}
		paths, _ := doc["paths"].(map[string]any)
		if paths["/orders/{id}"] == nil {
			t.Errorf("%s missing request path: %v", tc.version, paths)
		}
		if tc.version == "2.0" {
			if doc["host"] != "api.example.com" || doc["basePath"] != "/v1" {
				t.Errorf("Swagger server fields not converted: %v", doc)
			}
			if doc["securityDefinitions"] == nil {
				t.Errorf("Swagger securityDefinitions missing")
			}
		}
	}
	if _, err := svc.ExportOpenAPIAs(module.ID, "9"); err == nil {
		t.Fatal("unsupported OpenAPI version should fail")
	}
}

func TestExportPostmanCollectionRoundTrip(t *testing.T) {
	svc, module := buildCollectionExportFixture(t)
	document, err := svc.ExportModuleAs(module.ID, "postman")
	if err != nil {
		t.Fatalf("ExportModuleAs(postman): %v", err)
	}
	if document.FileName != "Orders - Admin.postman_collection.json" {
		t.Errorf("fileName=%q", document.FileName)
	}
	collection, err := parsePostman(document.Content)
	if err != nil {
		t.Fatalf("exported Postman Collection cannot be parsed: %v", err)
	}
	if len(collection.Variable) != 1 || len(collection.Item) != 1 || len(collection.Item[0].Item) != 1 {
		t.Fatalf("collection hierarchy or variables missing: %+v", collection)
	}
	request := collection.Item[0].Item[0]
	if request.Request == nil || request.Request.Body == nil || request.Request.Body.Raw != `{"amount":10}` {
		t.Fatalf("request body missing: %+v", request.Request)
	}
	if request.Request.Auth == nil || request.Request.Auth.Type != "bearer" || len(request.Event) != 2 {
		t.Fatalf("auth or scripts missing: %+v", request)
	}
}

func TestExportHARRoundTripAndMarkdown(t *testing.T) {
	svc, module := buildCollectionExportFixture(t)
	har, err := svc.ExportModuleAs(module.ID, "har")
	if err != nil {
		t.Fatalf("ExportModuleAs(har): %v", err)
	}
	converted, err := svc.ConvertImportDocument("har", har.Content)
	if err != nil {
		t.Fatalf("exported HAR cannot be imported: %v", err)
	}
	collection, err := parsePostman(converted.Content)
	if err != nil || len(collection.Item) != 1 || len(collection.Item[0].Item) != 1 {
		t.Fatalf("HAR round trip lost folder/request: err=%v collection=%+v", err, collection)
	}
	request := collection.Item[0].Item[0].Request
	if request == nil || !strings.Contains(request.URL.Raw, "https://api.example.com/v1/orders/{id}") || len(request.URL.Query) != 1 {
		t.Fatalf("HAR round trip lost URL/query: %+v", request)
	}

	markdown, err := svc.ExportModuleAs(module.ID, "markdown")
	if err != nil {
		t.Fatalf("ExportModuleAs(markdown): %v", err)
	}
	for _, expected := range []string{"# Orders / Admin", "## Orders", "`POST` /orders/{id}", "| query | `dry`", "Response 201", `{"id":42}`} {
		if !strings.Contains(markdown.Content, expected) {
			t.Errorf("Markdown missing %q:\n%s", expected, markdown.Content)
		}
	}
}

func TestExportModuleAsRejectsUnknownFormat(t *testing.T) {
	svc, module := buildCollectionExportFixture(t)
	if _, err := svc.ExportModuleAs(module.ID, "unknown"); err == nil {
		t.Fatal("unknown export format should fail")
	}
}
