package services

import (
	"testing"

	"PostPigeon/internal/models"
)

func TestInheritedOperationOverridesCascadeAndRestore(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "operation overrides")
	module := defaultModule(t, db, project.ID)
	folders := NewFolderService(db)
	parent, err := folders.CreateFolder(module.ID, nil, "parent")
	if err != nil {
		t.Fatal(err)
	}
	child, err := folders.CreateFolder(module.ID, &parent.ID, "child")
	if err != nil {
		t.Fatal(err)
	}
	endpoint, err := NewEndpointService(db).CreateEndpoint(module.ID, &child.ID, "endpoint", "GET", "/")
	if err != nil {
		t.Fatal(err)
	}

	moduleOp := models.Operation{Stage: "pre", Type: "script", Name: "module op", Enabled: true, Data: `{"script":"module"}`}
	if err := syncOperations(db, models.OperationOwnerModule, module.ID, []models.Operation{moduleOp}); err != nil {
		t.Fatal(err)
	}
	var persisted models.Operation
	if err := db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerModule, module.ID).First(&persisted).Error; err != nil {
		t.Fatal(err)
	}

	parentOverride := models.OperationOverride{
		OwnerType: string(models.OperationOwnerFolder), OwnerID: parent.ID,
		OperationID: persisted.ID, Enabled: false,
	}
	if err := db.Create(&parentOverride).Error; err != nil {
		t.Fatal(err)
	}
	items := inheritedOperationsForEndpoint(db, endpoint)
	if len(items) != 1 || items[0].Operation.Enabled {
		t.Fatalf("parent override was not inherited: %+v", items)
	}
	if items[0].ParentEnabled || items[0].Overridden {
		t.Fatalf("endpoint should follow its disabled parent without a local override: %+v", items[0])
	}

	endpointOverride := models.OperationOverride{
		OwnerType: string(models.OperationOwnerEndpoint), OwnerID: endpoint.ID,
		OperationID: persisted.ID, Enabled: true,
	}
	if err := db.Create(&endpointOverride).Error; err != nil {
		t.Fatal(err)
	}
	items = inheritedOperationsForEndpoint(db, endpoint)
	if len(items) != 1 || !items[0].Operation.Enabled || !items[0].Overridden || items[0].ParentEnabled {
		t.Fatalf("endpoint override did not replace parent value: %+v", items)
	}

	if err := saveOperationOverrides(db, models.OperationOwnerEndpoint, endpoint.ID, nil, items); err != nil {
		t.Fatal(err)
	}
	items = inheritedOperationsForEndpoint(db, endpoint)
	if items[0].Operation.Enabled || items[0].Overridden {
		t.Fatalf("restore should resume following parent: %+v", items[0])
	}
}

func TestSyncOperationsPreservesIDsAndDeletesRemovedRows(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "stable operation ids")
	module := defaultModule(t, db, project.ID)
	first := models.Operation{Stage: "pre", Type: "script", Name: "first", Enabled: true, Data: `{}`}
	second := models.Operation{Stage: "post", Type: "wait", Name: "second", Enabled: true, Data: `{"milliseconds":1}`}
	if err := syncOperations(db, models.OperationOwnerModule, module.ID, []models.Operation{first, second}); err != nil {
		t.Fatal(err)
	}
	var saved []models.Operation
	db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerModule, module.ID).Order("name").Find(&saved)
	if len(saved) != 2 {
		t.Fatalf("saved operations = %d", len(saved))
	}
	keptID, removedID := saved[0].ID, saved[1].ID
	saved[0].Name = "renamed"
	if err := syncOperations(db, models.OperationOwnerModule, module.ID, saved[:1]); err != nil {
		t.Fatal(err)
	}
	var got models.Operation
	if err := db.Where("id = ?", keptID).First(&got).Error; err != nil || got.Name != "renamed" {
		t.Fatalf("stable row was not updated: %+v, %v", got, err)
	}
	var count int64
	db.Model(&models.Operation{}).Where("id = ?", removedID).Count(&count)
	if count != 0 {
		t.Fatalf("removed operation still exists")
	}
}
