package services

import (
	"net/http"
	"strings"
	"sync/atomic"
	"testing"

	"PostPigeon/internal/models"
	"github.com/coder/websocket"
	"gorm.io/gorm"
)

func serverFixture(t *testing.T) (*gorm.DB, models.Module, models.Environment, *models.Folder, *models.Folder) {
	t.Helper()
	db := newTestDB(t)
	p := mustCreateProject(t, db, "servers")
	m := defaultModule(t, db, p.ID)
	env := firstEnvironment(t, db, p.ID)
	settings := NewScopeSettingsService(db)
	if err := settings.SaveModuleSettings(m.ID, ModuleSettings{ServerID: "module", Servers: []models.ModuleServer{{ID: "module", Name: "Module"}, {ID: "parent", Name: "Parent"}, {ID: "endpoint", Name: "Endpoint"}, {ID: "empty", Name: "Empty"}}}); err != nil {
		t.Fatal(err)
	}
	if err := db.First(&m, "id = ?", m.ID).Error; err != nil {
		t.Fatal(err)
	}
	parent, err := NewFolderService(db).CreateFolder(m.ID, nil, "parent")
	if err != nil {
		t.Fatal(err)
	}
	child, err := NewFolderService(db).CreateFolder(m.ID, &parent.ID, "child")
	if err != nil {
		t.Fatal(err)
	}
	if err := settings.SaveFolderSettings(parent.ID, FolderSettings{ServerID: "parent"}); err != nil {
		t.Fatal(err)
	}
	ws := "wss://default.example"
	if err := NewModuleService(db).SaveEnvironmentBaseURLs(env.ID, []models.ModuleBaseURL{{ModuleID: m.ID, BaseURL: "https://default.example", WebSocketBaseURL: &ws, ServerURLs: map[string]models.ServerBaseURL{
		"module":   {HTTP: "https://module.example", WebSocket: "wss://module.example"},
		"parent":   {HTTP: "https://parent.example", WebSocket: "wss://parent.example"},
		"endpoint": {HTTP: "https://endpoint.example"},
	}}}); err != nil {
		t.Fatal(err)
	}
	return db, m, env, parent, child
}

func TestEnvironmentServiceInheritance(t *testing.T) {
	db, m, env, parent, child := serverFixture(t)
	ms := NewModuleService(db)
	for _, tc := range []struct{ name, folder, server, protocol, want string }{
		{"module default", "", "", "http", "https://module.example"},
		{"parent", child.ID, "", "http", "https://parent.example"},
		{"endpoint wins", child.ID, "endpoint", "http", "https://endpoint.example"},
		{"explicit default stops inheritance", child.ID, "default", "http", "https://default.example"},
		{"removed service inherits", child.ID, "deleted", "http", "https://parent.example"},
		{"valid empty service does not fall back", child.ID, "empty", "http", ""},
		{"protocol-specific address", child.ID, "", "websocket", "wss://parent.example"},
		{"empty websocket does not borrow http", child.ID, "endpoint", "websocket", ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			urls, err := ms.ResolveEnvironmentBaseURLs(m.ID, tc.folder, tc.server, tc.protocol)
			if err != nil {
				t.Fatal(err)
			}
			found := false
			for _, row := range urls {
				if row.EnvironmentID == env.ID {
					found = true
					if row.BaseURL != tc.want {
						t.Fatalf("URL=%q want=%q", row.BaseURL, tc.want)
					}
				}
			}
			if !found {
				t.Fatal("configured environment absent")
			}
			data := SendRequestData{UseEnvironmentBaseURL: true, ModuleID: m.ID, EnvironmentID: env.ID, FolderID: tc.folder, ServerID: tc.server, BaseURL: "stale"}
			if err := resolveEnvironmentRequestBaseURL(db, &data, tc.protocol); err != nil || data.BaseURL != tc.want {
				t.Fatalf("send URL=%q err=%v", data.BaseURL, err)
			}
		})
	}
	// Parent services removed after configuration fall through to the module.
	if err := db.Model(parent).Update("server_id", "deleted").Error; err != nil {
		t.Fatal(err)
	}
	data := SendRequestData{UseEnvironmentBaseURL: true, ModuleID: m.ID, FolderID: child.ID, EnvironmentID: env.ID}
	if err := resolveEnvironmentRequestBaseURL(db, &data, "http"); err != nil || data.BaseURL != "https://module.example" {
		t.Fatalf("deleted parent service: %+v %v", data, err)
	}
	// A real environment without a row remains selectable but cannot borrow an address.
	empty, err := NewEnvironmentService(db).CreateEnvironment(m.ProjectID, "No URLs")
	if err != nil {
		t.Fatal(err)
	}
	urls, err := ms.ResolveEnvironmentBaseURLs(m.ID, "", "", "http")
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, row := range urls {
		if row.EnvironmentID == empty.ID {
			found = true
			if row.BaseURL != "" {
				t.Fatal(row)
			}
		}
	}
	if !found {
		t.Fatal("unconfigured environment absent from selector")
	}
}

func TestEnvironmentProtocolCompatibilityAndAtomicSave(t *testing.T) {
	db, m, env, _, _ := serverFixture(t)
	ms := NewModuleService(db)
	row := models.ModuleBaseURL{ModuleID: m.ID, BaseURL: "https://legacy.example"}
	if err := ms.SaveEnvironmentBaseURLs(env.ID, []models.ModuleBaseURL{row}); err != nil {
		t.Fatal(err)
	}
	data := SendRequestData{UseEnvironmentBaseURL: true, ModuleID: m.ID, EnvironmentID: env.ID, ServerID: "default"}
	if err := resolveEnvironmentRequestBaseURL(db, &data, "websocket"); err != nil || data.BaseURL != row.BaseURL {
		t.Fatalf("legacy websocket: %q %v", data.BaseURL, err)
	}
	empty := ""
	row.WebSocketBaseURL = &empty
	if err := ms.SaveEnvironmentBaseURLs(env.ID, []models.ModuleBaseURL{row}); err != nil {
		t.Fatal(err)
	}
	if err := resolveEnvironmentRequestBaseURL(db, &data, "websocket"); err != nil || data.BaseURL != "" {
		t.Fatalf("explicit empty websocket: %q %v", data.BaseURL, err)
	}
	row.BaseURL = "https://must-not-save.example"
	if err := ms.SaveEnvironmentBaseURLs(env.ID, []models.ModuleBaseURL{row, {ModuleID: "missing"}}); err == nil {
		t.Fatal("accepted invalid batch")
	}
	if err := resolveEnvironmentRequestBaseURL(db, &data, "http"); err != nil || data.BaseURL != "https://legacy.example" {
		t.Fatalf("partial batch persisted: %q %v", data.BaseURL, err)
	}
	data.EnvironmentID = ""
	if err := resolveEnvironmentRequestBaseURL(db, &data, "http"); err != nil || data.BaseURL != "" {
		t.Fatalf("no environment reused a URL: %q %v", data.BaseURL, err)
	}
	other := mustCreateProject(t, db, "other")
	data.EnvironmentID = firstEnvironment(t, db, other.ID).ID
	if err := resolveEnvironmentRequestBaseURL(db, &data, "http"); err == nil {
		t.Fatal("accepted environment belonging to another project")
	}
}

func TestEnvironmentAddressUsedByHTTPWebSocketCurlAndRunner(t *testing.T) {
	db, m, env, _, child := serverFixture(t)
	var staleHits atomic.Int32
	stale := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { staleHits.Add(1) }))
	target := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(r.URL.Path + "/" + r.Header.Get("X-Environment")))
	}))
	wsPaths := make(chan string, 1)
	targetWS := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		wsPaths <- r.URL.Path + "/" + r.Header.Get("X-Environment")
		_, _, _ = conn.Read(r.Context())
		_ = conn.Close(websocket.StatusNormalClosure, "")
	}))
	if err := NewEnvironmentService(db).SaveEnvironmentVariables(env.ID, []models.EnvironmentVariable{{Key: "PREFIX", Value: "/v2", Enabled: true}, {Key: "TOKEN", Value: "new", Enabled: true}}); err != nil {
		t.Fatal(err)
	}
	if err := NewModuleService(db).SaveEnvironmentBaseURLs(env.ID, []models.ModuleBaseURL{{ModuleID: m.ID, BaseURL: stale.URL, ServerURLs: map[string]models.ServerBaseURL{"parent": {HTTP: target.URL, WebSocket: targetWS.URL}}}}); err != nil {
		t.Fatal(err)
	}
	data := SendRequestData{UseEnvironmentBaseURL: true, ModuleID: m.ID, FolderID: child.ID, EnvironmentID: env.ID, Method: "GET", BaseURL: stale.URL, Path: "{{PREFIX}}/users", Headers: []models.EndpointHeader{{Name: "X-Environment", Value: "{{TOKEN}}", Enabled: true}}}
	hs := newTestHTTPService(t, db)
	resp, err := hs.SendRequest(data)
	if err != nil {
		t.Fatal(err)
	}
	if resp.Body != "/v2/users/new" || resp.ActualRequest.URL != target.URL+"/v2/users" {
		t.Fatalf("HTTP used stale address/context: %+v", resp)
	}
	curl, err := NewCurlService(db).ToCurl(data)
	if err != nil || !strings.Contains(curl, target.URL+"/v2/users") || !strings.Contains(curl, "X-Environment: new") {
		t.Fatalf("curl=%q err=%v", curl, err)
	}
	ws := NewWebSocketService(db, hs)
	t.Cleanup(func() { _ = ws.ServiceShutdown() })
	if _, err := ws.Connect("server-context", data, true); err != nil {
		t.Fatal(err)
	}
	if got := <-wsPaths; got != "/v2/users/new" {
		t.Fatalf("websocket=%q", got)
	}
	_ = ws.Close("server-context")
	ep, err := NewEndpointService(db).CreateFullEndpoint(m.ID, &child.ID, EndpointSaveData{Name: "request", Type: "http", Method: "GET", Path: "{{PREFIX}}/users"})
	if err != nil {
		t.Fatal(err)
	}
	runner := NewRunnerService(db, hs)
	t.Cleanup(func() { _ = runner.ServiceShutdown() })
	result := runner.runOne(*ep, RunOptions{EnvironmentID: env.ID}, 0)
	if result.Error != "" || result.StatusCode != 200 {
		t.Fatalf("runner did not inherit service: %+v", result)
	}
	if staleHits.Load() != 0 {
		t.Fatalf("%d requests reached stale/default address", staleHits.Load())
	}
}

func TestEnvironmentServicesSurviveCopyAndNativeBackup(t *testing.T) {
	db, m, env, _, child := serverFixture(t)
	ep, err := NewEndpointService(db).CreateFullEndpoint(m.ID, &child.ID, EndpointSaveData{Name: "request", Method: "GET", Path: "/users", ServerID: "endpoint"})
	if err != nil {
		t.Fatal(err)
	}
	// WS-only and custom-service-only configurations must not be dropped on import.
	rows, err := NewModuleService(db).GetModuleBaseURLs(m.ID)
	if err != nil {
		t.Fatal(err)
	}
	for i := range rows {
		rows[i].BaseURL = ""
	}
	if err := NewModuleService(db).SaveEnvironmentBaseURLs(env.ID, rows); err != nil {
		t.Fatal(err)
	}
	check := func(moduleID string) {
		t.Helper()
		var copied models.Module
		if err := db.First(&copied, "id = ?", moduleID).Error; err != nil {
			t.Fatal(err)
		}
		if len(copied.Servers) != len(m.Servers) {
			t.Fatalf("services lost: %+v", copied)
		}
		var endpoint models.Endpoint
		if err := db.Where("module_id = ? AND name = ?", moduleID, ep.Name).First(&endpoint).Error; err != nil {
			t.Fatal(err)
		}
		if endpoint.ServerID != "endpoint" {
			t.Fatalf("endpoint service lost: %+v", endpoint)
		}
		folderID := ""
		if endpoint.FolderID != nil {
			folderID = *endpoint.FolderID
		}
		urls, err := NewModuleService(db).ResolveEnvironmentBaseURLs(moduleID, folderID, "", "websocket")
		if err != nil {
			t.Fatal(err)
		}
		found := false
		for _, url := range urls {
			if url.BaseURL == "wss://parent.example" {
				found = true
			}
		}
		if !found {
			t.Fatal("inherited service/protocol URL lost")
		}
	}
	copied, err := NewModuleService(db).DuplicateModule(m.ID)
	if err != nil {
		t.Fatal(err)
	}
	check(copied.ID)
	clone, err := NewProjectService(db).CloneProject(m.ProjectID, "copy")
	if err != nil {
		t.Fatal(err)
	}
	check(defaultModule(t, db, clone.ID).ID)
	exported, err := NewImportExportService(db).ExportProject(m.ProjectID, true)
	if err != nil {
		t.Fatal(err)
	}
	imported, err := NewImportExportService(db).ImportProject(exported)
	if err != nil {
		t.Fatal(err)
	}
	var importedModule models.Module
	if err := db.Where("project_id = ? AND name = ?", imported.ID, m.Name).First(&importedModule).Error; err != nil {
		t.Fatal(err)
	}
	check(importedModule.ID)
	converted, err := NewModuleService(db).ConvertFolderToModule(child.ID, "converted")
	if err != nil {
		t.Fatal(err)
	}
	if converted.ServerID != "parent" {
		t.Fatalf("conversion lost inherited service: %+v", converted)
	}
	check(converted.ID)
}
