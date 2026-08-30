package services

import (
	"fmt"
	"strings"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// ProjectExportOptions 对应 Apifox 项目级导出的完整设置。
// Format 是交换格式；OpenAPI 的规范版本和文件格式是独立选项，不再伪装成三种格式。
type ProjectExportOptions struct {
	Format         string                      `json:"format"`
	IncludeSecrets bool                        `json:"includeSecrets"`
	Scope          ProjectExportScope          `json:"scope"`
	OpenAPI        ProjectOpenAPIExportOptions `json:"openapi"`
	EnvironmentIDs []string                    `json:"environmentIds"`
}

type ProjectExportScope struct {
	Type                string   `json:"type"`
	SelectedFolderIDs   []string `json:"selectedFolderIds"`
	SelectedEndpointIDs []string `json:"selectedEndpointIds"`
	SelectedTags        []string `json:"selectedTags"`
	ExcludedTags        []string `json:"excludedTags"`
}

type ProjectOpenAPIExportOptions struct {
	SpecVersion                string `json:"specVersion"`
	FileFormat                 string `json:"fileFormat"`
	Title                      string `json:"title"`
	DocumentVersion            string `json:"documentVersion"`
	IncludeExtensionProperties bool   `json:"includeExtensionProperties"`
	AddFoldersToTags           bool   `json:"addFoldersToTags"`
}

type projectExportSelection struct {
	endpointIDs map[string]bool
	folderTags  map[string][]string
}

func (s *ImportExportService) resolveProjectExportSelection(projectID string, scope ProjectExportScope) (*projectExportSelection, error) {
	var endpoints []models.Endpoint
	if err := s.db.Table("endpoints AS e").Select("e.*").
		Joins("JOIN modules AS m ON m.id = e.module_id").
		Where("m.project_id = ? AND e.type = ?", projectID, string(models.EndpointTypeHTTP)).
		Order("e.sort_order ASC").Find(&endpoints).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}
	var folders []models.Folder
	if err := s.db.Table("folders AS f").Select("f.*").
		Joins("JOIN modules AS m ON m.id = f.module_id").
		Where("m.project_id = ?", projectID).Find(&folders).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeExportFailed)
	}

	folderByID := make(map[string]models.Folder, len(folders))
	for _, folder := range folders {
		folderByID[folder.ID] = folder
	}
	endpointByID := make(map[string]models.Endpoint, len(endpoints))
	for _, endpoint := range endpoints {
		endpointByID[endpoint.ID] = endpoint
	}

	typeName := strings.ToLower(strings.TrimSpace(scope.Type))
	if typeName == "" {
		typeName = "all"
	}
	selectedFolders := stringSet(scope.SelectedFolderIDs)
	selectedEndpoints := stringSet(scope.SelectedEndpointIDs)
	selectedTags := stringSet(scope.SelectedTags)
	excludedTags := stringSet(scope.ExcludedTags)
	for id := range selectedFolders {
		if _, ok := folderByID[id]; !ok {
			return nil, fmt.Errorf("导出范围包含不属于当前项目的文件夹 %q", id)
		}
	}
	for id := range selectedEndpoints {
		if _, ok := endpointByID[id]; !ok {
			return nil, fmt.Errorf("导出范围包含不属于当前项目的接口 %q", id)
		}
	}
	if typeName != "all" && typeName != "folders" && typeName != "endpoints" && typeName != "tags" {
		return nil, fmt.Errorf("不支持的导出范围 %q", scope.Type)
	}

	selection := &projectExportSelection{endpointIDs: map[string]bool{}, folderTags: map[string][]string{}}
	for _, endpoint := range endpoints {
		tags := parseTagList(endpoint.Tags)
		include := false
		switch typeName {
		case "all":
			include = true
		case "endpoints":
			include = selectedEndpoints[endpoint.ID]
		case "tags":
			include = intersectsStringSet(tags, selectedTags)
		case "folders":
			for folderID := endpoint.FolderID; folderID != nil && *folderID != ""; {
				if selectedFolders[*folderID] {
					include = true
					break
				}
				folder, ok := folderByID[*folderID]
				if !ok {
					break
				}
				folderID = folder.ParentID
			}
		}
		if include && intersectsStringSet(tags, excludedTags) {
			include = false
		}
		if !include {
			continue
		}
		selection.endpointIDs[endpoint.ID] = true
		selection.folderTags[endpoint.ID] = exportFolderNames(endpoint.FolderID, folderByID)
	}
	return selection, nil
}

func stringSet(values []string) map[string]bool {
	out := make(map[string]bool, len(values))
	for _, value := range values {
		if value = strings.TrimSpace(value); value != "" {
			out[value] = true
		}
	}
	return out
}

func intersectsStringSet(values []string, set map[string]bool) bool {
	for _, value := range values {
		if set[value] {
			return true
		}
	}
	return false
}

func exportFolderNames(folderID *string, folders map[string]models.Folder) []string {
	var reversed []string
	seen := map[string]bool{}
	for folderID != nil && *folderID != "" && !seen[*folderID] {
		seen[*folderID] = true
		folder, ok := folders[*folderID]
		if !ok {
			break
		}
		if folder.Name != "__root" && strings.TrimSpace(folder.Name) != "" {
			reversed = append(reversed, folder.Name)
		}
		folderID = folder.ParentID
	}
	for left, right := 0, len(reversed)-1; left < right; left, right = left+1, right-1 {
		reversed[left], reversed[right] = reversed[right], reversed[left]
	}
	return reversed
}
