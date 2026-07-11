package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// ApifoxService 负责解析 Apifox 导出文件并导入到项目中。
type ApifoxService struct {
	db *gorm.DB
}

// NewApifoxService 创建 Apifox 导入服务实例
func NewApifoxService(db *gorm.DB) *ApifoxService {
	return &ApifoxService{db: db}
}

// ---- Apifox 导出格式（仅声明需要的字段） ----

// flexStr 兼容 Apifox 中同一字段有时为数字、有时为字符串（如各种 id）。
type flexStr string

func (f *flexStr) UnmarshalJSON(b []byte) error {
	*f = flexStr(strings.Trim(string(b), "\""))
	return nil
}

func (f flexStr) String() string { return string(f) }

// jstr 兼容 Apifox 中值字段可能为字符串/数字/布尔/数组/对象：统一转为字符串。
type jstr string

func (j *jstr) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	if len(b) == 0 || string(b) == "null" {
		*j = ""
		return nil
	}
	if b[0] == '"' {
		var s string
		if err := json.Unmarshal(b, &s); err == nil {
			*j = jstr(s)
			return nil
		}
	}
	*j = jstr(b) // 数组/对象/数字/布尔按原始 JSON 文本保留
	return nil
}

func (j jstr) String() string { return string(j) }

type apifoxExport struct {
	ApifoxProject string          `json:"apifoxProject"`
	Info          apifoxInfo      `json:"info"`
	Schema        apifoxSchemaTag `json:"$schema"`

	APICollection       []apifoxCollectionRoot `json:"apiCollection"`
	DocCollection       []apifoxDocRoot        `json:"docCollection"`
	WebSocketCollection []apifoxCollectionRoot `json:"webSocketCollection"`
	RequestCollection   []apifoxRequestRoot    `json:"requestCollection"`

	Environments    []apifoxEnvironment `json:"environments"`
	ModuleSettings  []apifoxModule      `json:"moduleSettings"`
	CommonScripts   []apifoxCommonScript `json:"commonScripts"`
	GlobalVariables []apifoxGlobalVarSet `json:"globalVariables"`
	CommonParameters apifoxCommonParameters `json:"commonParameters"`
}

type apifoxSchemaTag struct {
	App string `json:"app"`
}

type apifoxInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type apifoxModule struct {
	ID   flexStr `json:"id"`
	Name string  `json:"name"`
}

type apifoxCollectionRoot struct {
	Name           string             `json:"name"`
	ModuleID       flexStr            `json:"moduleId"`
	Auth           apifoxAuth         `json:"auth"`
	PreProcessors  []apifoxProcessor  `json:"preProcessors"`
	PostProcessors []apifoxProcessor  `json:"postProcessors"`
	Items          []apifoxItem       `json:"items"`
}

// apifoxItem 既可能是文件夹（含 items），也可能是端点（含 api）。
type apifoxItem struct {
	Name           string            `json:"name"`
	API            *apifoxAPI        `json:"api"`
	Items          []apifoxItem      `json:"items"`
	Auth           apifoxAuth        `json:"auth"`
	Description    string            `json:"description"`
	PreProcessors  []apifoxProcessor `json:"preProcessors"`
	PostProcessors []apifoxProcessor `json:"postProcessors"`
}

// isFolder 判断该 item 是否为文件夹（无 api 视为文件夹）。
func (it apifoxItem) isFolder() bool { return it.API == nil }

type apifoxAPI struct {
	ID               flexStr              `json:"id"`
	Method           string               `json:"method"`
	Path             string               `json:"path"`
	Name             string               `json:"name"`
	Description      string               `json:"description"`
	Status           string               `json:"status"`
	Tags             []string             `json:"tags"`
	Ordering         int                  `json:"ordering"`
	Parameters       apifoxParameters     `json:"parameters"`
	RequestBody      apifoxRequestBody    `json:"requestBody"`
	Auth             apifoxAuth           `json:"auth"`
	Responses        []apifoxResponse     `json:"responses"`
	ResponseExamples []apifoxRespExample  `json:"responseExamples"`
	PreProcessors    []apifoxProcessor    `json:"preProcessors"`
	PostProcessors   []apifoxProcessor    `json:"postProcessors"`
}

type apifoxParameters struct {
	Query  []apifoxParam `json:"query"`
	Path   []apifoxParam `json:"path"`
	Header []apifoxParam `json:"header"`
	Cookie []apifoxParam `json:"cookie"`
}

type apifoxParam struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Description string `json:"description"`
	Example     jstr   `json:"example"`
	Value       jstr   `json:"value"`
	SampleValue jstr   `json:"sampleValue"`
	Enable      *bool  `json:"enable"`
}

// val 返回参数的取值：优先 value，其次 example，再次 sampleValue。
func (p apifoxParam) val() string {
	return firstNonEmpty(p.Value.String(), p.Example.String(), p.SampleValue.String())
}

// exampleStr 返回参数示例文本。
func (p apifoxParam) exampleStr() string { return p.Example.String() }

type apifoxRequestBody struct {
	Type       string             `json:"type"`
	Parameters []apifoxParam      `json:"parameters"`
	Examples   []apifoxBodyExample `json:"examples"`
	Example    jstr               `json:"example"`
	Data       jstr               `json:"data"`
	JSONSchema json.RawMessage    `json:"jsonSchema"`
}

type apifoxBodyExample struct {
	Value     jstr   `json:"value"`
	MediaType string `json:"mediaType"`
}

type apifoxResponse struct {
	ID          flexStr         `json:"id"`
	Code        int             `json:"code"`
	Name        string          `json:"name"`
	ContentType string          `json:"contentType"`
	JSONSchema  json.RawMessage `json:"jsonSchema"`
}

type apifoxRespExample struct {
	Name       string  `json:"name"`
	Data       string  `json:"data"`
	ResponseID flexStr `json:"responseId"`
}

type apifoxAuth struct {
	Type   string `json:"type"`
	APIKey *struct {
		In    string `json:"in"`
		Key   string `json:"key"`
		Value string `json:"value"`
	} `json:"apikey"`
	Bearer *struct {
		Token string `json:"token"`
	} `json:"bearer"`
	Basic *struct {
		Username string `json:"username"`
		Password string `json:"password"`
	} `json:"basic"`
}

type apifoxProcessor struct {
	Type   string          `json:"type"`
	Data   json.RawMessage `json:"data"`
	Enable *bool           `json:"enable"`
	Name   string          `json:"name"`
}

type apifoxEnvironment struct {
	ID        flexStr            `json:"id"`
	Name      string             `json:"name"`
	BaseURLs  map[string]string  `json:"baseUrls"`
	Variables []apifoxEnvVariable `json:"variables"`
}

type apifoxEnvVariable struct {
	Name  string `json:"name"`
	Value jstr   `json:"value"`
}

type apifoxCommonScript struct {
	Name        string `json:"name"`
	Content     string `json:"content"`
	Description string `json:"description"`
}

type apifoxGlobalVarSet struct {
	Variables []apifoxGlobalVar `json:"variables"`
}

type apifoxGlobalVar struct {
	Name        string `json:"name"`
	Value       jstr   `json:"value"`
	Description string `json:"description"`
}

type apifoxCommonParameters struct {
	Parameters apifoxParameters `json:"parameters"`
}

type apifoxDocRoot struct {
	Items    []apifoxDoc `json:"items"`
	Children []apifoxDoc `json:"children"`
}

type apifoxDoc struct {
	Name     string      `json:"name"`
	Content  string      `json:"content"`
	ModuleID flexStr     `json:"moduleId"`
	Children []apifoxDoc `json:"children"`
	Items    []apifoxDoc `json:"items"`
}

type apifoxRequestRoot struct {
	Items []apifoxRequestItem `json:"items"`
}

type apifoxRequestItem struct {
	Name        string            `json:"name"`
	Method      string            `json:"method"`
	Path        string            `json:"path"`
	RequestBody apifoxRequestBody `json:"requestBody"`
	Parameters  apifoxParameters  `json:"parameters"`
	Auth        apifoxAuth        `json:"auth"`
}

// ---- 预览与导入结果 ----

// ApifoxPreview Apifox 导入前的内容概览
type ApifoxPreview struct {
	IsApifox     bool               `json:"isApifox"`
	ProjectName  string             `json:"projectName"`
	Modules      int                `json:"modules"`
	Folders      int                `json:"folders"`
	Endpoints    int                `json:"endpoints"`
	Documents    int                `json:"documents"`
	WebSockets   int                `json:"webSockets"`
	Environments int                `json:"environments"`
	GlobalVars   int                `json:"globalVars"`
	Scripts      int                `json:"scripts"`
	// Items 可逐项选择导入的叶子列表（接口 / 文档 / WebSocket / 通用请求）
	Items []ApifoxPreviewItem `json:"items"`
}

// ApifoxPreviewItem 预览中的单个可选择项
type ApifoxPreviewItem struct {
	Index      int    `json:"index"`
	Kind       string `json:"kind"` // http, websocket, doc, request
	Name       string `json:"name"`
	Method     string `json:"method"`
	Path       string `json:"path"`
	ModuleName string `json:"moduleName"`
	FolderPath string `json:"folderPath"`
}

// ApifoxImportResult Apifox 导入结果统计
type ApifoxImportResult struct {
	Modules      int `json:"modules"`
	Folders      int `json:"folders"`
	Endpoints    int `json:"endpoints"`
	Documents    int `json:"documents"`
	WebSockets   int `json:"webSockets"`
	Environments int `json:"environments"`
	GlobalVars   int `json:"globalVars"`
	Scripts      int `json:"scripts"`
	ModuleParams int `json:"moduleParams"`
}

// apifoxFolderRef 计划中的一层文件夹（携带导入所需的认证与前置/后置操作）。
type apifoxFolderRef struct {
	Name string
	Auth apifoxAuth
	Pre  []apifoxProcessor
	Post []apifoxProcessor
}

// apifoxLeaf 一个可被单独选择导入的叶子项（接口 / 文档 / WebSocket / 通用请求）。
type apifoxLeaf struct {
	Index          int
	Kind           string // http, websocket, doc, request
	Name           string
	Method         string
	Path           string
	ModuleApifoxID string // 空表示归入默认模块（如通用请求）
	ModuleName     string
	Folders        []apifoxFolderRef
	api            *apifoxAPI
	doc            *apifoxDoc
	request        *apifoxRequestItem
}

// importCtx 在一次导入过程中维护各种 ID 映射与统计。
type importCtx struct {
	tx         *gorm.DB
	projectID  string
	moduleName map[string]string // apifoxModuleID -> 模块名（来自 moduleSettings）
	moduleByID map[string]string // apifoxModuleID -> 我方 Module.ID
	envByID    map[string]string // apifoxEnvID -> 我方 Environment.ID
	result     *ApifoxImportResult

	// 选择导入
	selected  map[int]bool // 选中的叶子 Index
	selectAll bool         // 未指定选择时全部导入

	// 文件夹按名称去重（同模块+父级+名称仅一条），修复重复文件夹
	folderCache map[string]string // moduleID|parentID|name -> folderID
	folderSort  map[string]int    // moduleID|parentID -> 下一个 sortOrder
	orderIn     map[string]int    // 端点所在容器 -> 下一个 sortOrder（容器 = moduleID|folderID）
	moduleInit  map[string]bool   // apifoxModuleID 是否已应用模块级认证/操作/前置URL
	rootByMod   map[string]apifoxCollectionRoot
	rootFolder  map[string]string // moduleID -> __root 占位文件夹 ID
	environs    []apifoxEnvironment
}

// ensureRootFolder 返回模块的 __root 占位文件夹 ID（不存在则创建）。
// 本项目约定：每个模块有一个 parent_id 为空、名为 __root 的根文件夹，
// GetProjectTree 会把其内容平铺到模块层级并隐藏它本身。所有导入内容必须挂在其下，
// 否则一级文件夹会被误当作根容器而被平铺，导致接口散落到根目录。
func (ic *importCtx) ensureRootFolder(moduleID string) string {
	if id, ok := ic.rootFolder[moduleID]; ok {
		return id
	}
	var f models.Folder
	if err := ic.tx.Where("module_id = ? AND parent_id IS NULL", moduleID).First(&f).Error; err == nil {
		ic.rootFolder[moduleID] = f.ID
		return f.ID
	}
	f = models.Folder{ModuleID: moduleID, ParentID: nil, Name: "__root", SortOrder: 0}
	ic.tx.Create(&f)
	ic.rootFolder[moduleID] = f.ID
	return f.ID
}

// PreviewApifox 解析并返回 Apifox 导出文件的内容概览。
func (s *ApifoxService) PreviewApifox(jsonStr string) (*ApifoxPreview, error) {
	var exp apifoxExport
	if err := json.Unmarshal([]byte(jsonStr), &exp); err != nil {
		return &ApifoxPreview{IsApifox: false}, fmt.Errorf("解析 Apifox 文件失败: %w", err)
	}
	if exp.ApifoxProject == "" && exp.Schema.App != "apifox" {
		return &ApifoxPreview{IsApifox: false}, nil
	}

	moduleName := map[string]string{}
	for _, m := range exp.ModuleSettings {
		moduleName[m.ID.String()] = m.Name
	}

	p := &ApifoxPreview{IsApifox: true, ProjectName: exp.Info.Name}
	leaves := buildLeaves(&exp, moduleName)
	folderSet := map[string]bool{}
	for _, lf := range leaves {
		switch lf.Kind {
		case "http", "request":
			p.Endpoints++
		case "websocket":
			p.WebSockets++
		case "doc":
			p.Documents++
		}
		// 统计去重后的文件夹数量
		key := lf.ModuleApifoxID
		for _, fr := range lf.Folders {
			key += "|" + fr.Name
			folderSet[key] = true
		}
		p.Items = append(p.Items, ApifoxPreviewItem{
			Index: lf.Index, Kind: lf.Kind, Name: lf.Name, Method: lf.Method,
			Path: lf.Path, ModuleName: lf.ModuleName, FolderPath: folderPathString(lf.Folders),
		})
	}
	p.Folders = len(folderSet)
	p.Modules = len(exp.ModuleSettings)
	p.Environments = len(exp.Environments)
	for _, g := range exp.GlobalVariables {
		p.GlobalVars += len(g.Variables)
	}
	p.Scripts = len(exp.CommonScripts)
	return p, nil
}

// folderPathString 将文件夹层级拼为 "a / b / c" 展示。
func folderPathString(folders []apifoxFolderRef) string {
	names := make([]string, 0, len(folders))
	for _, f := range folders {
		names = append(names, f.Name)
	}
	return strings.Join(names, " / ")
}

// buildLeaves 以确定的顺序展开导出文件中所有可导入的叶子项并编号。
// 预览与导入共用此函数，保证下标一致。
func buildLeaves(exp *apifoxExport, moduleName map[string]string) []apifoxLeaf {
	leaves := make([]apifoxLeaf, 0, 64)
	idx := 0

	// API 集合：每个 root 对应一个模块，递归展开文件夹与接口
	for ri := range exp.APICollection {
		root := &exp.APICollection[ri]
		modID := root.ModuleID.String()
		var walk func(items []apifoxItem, folders []apifoxFolderRef)
		walk = func(items []apifoxItem, folders []apifoxFolderRef) {
			for i := range items {
				it := &items[i]
				if it.isFolder() {
					fr := apifoxFolderRef{Name: it.Name, Auth: it.Auth, Pre: it.PreProcessors, Post: it.PostProcessors}
					walk(it.Items, appendFolder(folders, fr))
				} else {
					leaves = append(leaves, apifoxLeaf{
						Index: idx, Kind: "http", Name: apiLeafName(it), Method: strings.ToUpper(defaultStr(it.API.Method, "GET")),
						Path: it.API.Path, ModuleApifoxID: modID, ModuleName: moduleName[modID],
						Folders: cloneFolders(folders), api: it.API,
					})
					idx++
				}
			}
		}
		walk(root.Items, nil)
	}

	// WebSocket 集合：仅收集真正的 WS 端点（空文件夹不产生叶子，避免重复空目录）
	for ri := range exp.WebSocketCollection {
		root := &exp.WebSocketCollection[ri]
		modID := root.ModuleID.String()
		var walk func(items []apifoxItem, folders []apifoxFolderRef)
		walk = func(items []apifoxItem, folders []apifoxFolderRef) {
			for i := range items {
				it := &items[i]
				if it.API != nil {
					leaves = append(leaves, apifoxLeaf{
						Index: idx, Kind: "websocket", Name: apiLeafName(it), Method: "GET",
						Path: it.API.Path, ModuleApifoxID: modID, ModuleName: moduleName[modID],
						Folders: cloneFolders(folders), api: it.API,
					})
					idx++
				} else {
					walk(it.Items, appendFolder(folders, apifoxFolderRef{Name: it.Name}))
				}
			}
		}
		walk(root.Items, nil)
	}

	// 文档集合：有正文的文档作为叶子
	for ri := range exp.DocCollection {
		root := &exp.DocCollection[ri]
		var walk func(docs []apifoxDoc)
		walk = func(docs []apifoxDoc) {
			for i := range docs {
				d := &docs[i]
				if d.Content != "" {
					leaves = append(leaves, apifoxLeaf{
						Index: idx, Kind: "doc", Name: defaultStr(d.Name, "文档"),
						ModuleApifoxID: d.ModuleID.String(), ModuleName: moduleName[d.ModuleID.String()], doc: d,
					})
					idx++
				}
				walk(d.Items)
				walk(d.Children)
			}
		}
		walk(root.Items)
		walk(root.Children)
	}

	// 通用请求：视为默认模块下的普通接口
	for ri := range exp.RequestCollection {
		r := &exp.RequestCollection[ri]
		for i := range r.Items {
			it := &r.Items[i]
			leaves = append(leaves, apifoxLeaf{
				Index: idx, Kind: "request", Name: defaultStr(it.Name, it.Path),
				Method: strings.ToUpper(defaultStr(it.Method, "GET")), Path: it.Path,
				ModuleName: "默认模块", request: it,
			})
			idx++
		}
	}

	return leaves
}

// apiLeafName 解析接口名称：优先 item.Name（真实名称），其次 api.name，最后回退到 path。
func apiLeafName(it *apifoxItem) string {
	name := it.Name
	if strings.TrimSpace(name) == "" && it.API != nil {
		name = it.API.Name
	}
	if it.API != nil {
		return defaultStr(name, it.API.Path)
	}
	return defaultStr(name, "接口")
}

// appendFolder 追加一层文件夹并返回新切片（用三索引切片避免共享底层数组的别名问题）。
func appendFolder(folders []apifoxFolderRef, fr apifoxFolderRef) []apifoxFolderRef {
	out := folders[:len(folders):len(folders)]
	return append(out, fr)
}

func cloneFolders(folders []apifoxFolderRef) []apifoxFolderRef {
	if len(folders) == 0 {
		return nil
	}
	out := make([]apifoxFolderRef, len(folders))
	copy(out, folders)
	return out
}

// ImportApifox 将 Apifox 导出内容导入到指定项目。
// selectedIndexes 为空时导入全部叶子，否则仅导入对应下标的叶子（对应预览列表 Item.Index）。
func (s *ApifoxService) ImportApifox(projectID string, jsonStr string, selectedIndexes []int) (*ApifoxImportResult, error) {
	var exp apifoxExport
	if err := json.Unmarshal([]byte(jsonStr), &exp); err != nil {
		return nil, fmt.Errorf("解析 Apifox 文件失败: %w", err)
	}
	if exp.ApifoxProject == "" && exp.Schema.App != "apifox" {
		return nil, fmt.Errorf("该文件不是有效的 Apifox 导出文件")
	}

	// 校验项目存在
	var project models.Project
	if err := s.db.Where("id = ?", projectID).First(&project).Error; err != nil {
		return nil, fmt.Errorf("目标项目不存在: %w", err)
	}

	result := &ApifoxImportResult{}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		ic := &importCtx{
			tx:          tx,
			projectID:   projectID,
			moduleName:  map[string]string{},
			moduleByID:  map[string]string{},
			envByID:     map[string]string{},
			result:      result,
			selected:    map[int]bool{},
			selectAll:   len(selectedIndexes) == 0,
			folderCache: map[string]string{},
			folderSort:  map[string]int{},
			orderIn:     map[string]int{},
			moduleInit:  map[string]bool{},
			rootByMod:   map[string]apifoxCollectionRoot{},
			rootFolder:  map[string]string{},
			environs:    exp.Environments,
		}
		for _, i := range selectedIndexes {
			ic.selected[i] = true
		}
		for _, m := range exp.ModuleSettings {
			ic.moduleName[m.ID.String()] = m.Name
		}
		for _, root := range exp.APICollection {
			ic.rootByMod[root.ModuleID.String()] = root
		}

		if err := ic.importEnvironments(exp.Environments); err != nil {
			return err
		}
		ic.importGlobalVars(exp.GlobalVariables)
		ic.importScripts(exp.CommonScripts)

		// 逐叶子导入：文件夹按路径去重、按需创建（修复重复文件夹并跳过空目录）
		leaves := buildLeaves(&exp, ic.moduleName)
		for i := range leaves {
			lf := &leaves[i]
			if !ic.selectAll && !ic.selected[lf.Index] {
				continue
			}
			moduleID := ic.ensureModuleForLeaf(lf)
			folderID := ic.ensureFolderPath(moduleID, lf.Folders)
			order := ic.nextOrder(moduleID, folderID)
			switch lf.Kind {
			case "http":
				ic.createAPIEndpoint(moduleID, folderID, lf.Name, lf.api, order)
			case "websocket":
				ic.createWSEndpoint(moduleID, folderID, lf.Name, lf.api, order)
			case "doc":
				ic.createDocEndpoint(moduleID, folderID, lf.doc, order)
			case "request":
				ic.createRequestEndpoint(moduleID, folderID, *lf.request, order)
			}
		}

		// 公共参数：并入默认模块的自动参数
		ic.importCommonParameters(exp.CommonParameters)

		return nil
	})
	if err != nil {
		return nil, err
	}
	slog.Info("Apifox 导入完成", "projectId", projectID, "endpoints", result.Endpoints, "modules", result.Modules)
	return result, nil
}

// ensureModuleForLeaf 解析叶子所属模块并按需应用模块级认证/操作/前置 URL（每模块仅一次）。
func (ic *importCtx) ensureModuleForLeaf(lf *apifoxLeaf) string {
	if lf.ModuleApifoxID == "" {
		return ic.ensureModule(defaultStr(lf.ModuleName, "默认模块"))
	}
	moduleID := ic.ensureModuleByApifoxID(lf.ModuleApifoxID)
	if !ic.moduleInit[lf.ModuleApifoxID] {
		ic.moduleInit[lf.ModuleApifoxID] = true
		if root, ok := ic.rootByMod[lf.ModuleApifoxID]; ok {
			ic.applyModuleAuth(moduleID, root.Auth)
			ic.importModuleOperations(moduleID, root.PreProcessors, root.PostProcessors)
		}
		ic.importEnvBaseURLs(ic.environs, lf.ModuleApifoxID, moduleID)
	}
	return moduleID
}

// ensureFolderPath 按名称去重地创建/复用一条文件夹路径，返回最末层文件夹 ID。
// 起点为模块的 __root 占位文件夹，因此一级文件夹的 parent_id 指向 __root（与 UI 建目录一致），
// 无子路径时返回 __root（根级内容），保证 GetProjectTree 正确平铺显示。
func (ic *importCtx) ensureFolderPath(moduleID string, folders []apifoxFolderRef) *string {
	rootID := ic.ensureRootFolder(moduleID)
	parentID := &rootID
	for _, fr := range folders {
		pkey := moduleID + "|" + ptrOrEmpty(parentID)
		key := pkey + "|" + fr.Name
		if id, ok := ic.folderCache[key]; ok {
			idCopy := id
			parentID = &idCopy
			continue
		}
		t, data := convertAuth(fr.Auth)
		folder := models.Folder{
			ModuleID: moduleID, ParentID: parentID, Name: fr.Name,
			SortOrder: ic.folderSort[pkey], AuthType: defaultStr(t, string(models.AuthTypeInherit)), AuthData: data,
		}
		ic.tx.Create(&folder)
		ic.result.Folders++
		ic.folderSort[pkey]++
		ic.createOperations(models.OperationOwnerFolder, folder.ID, fr.Pre, fr.Post)
		ic.folderCache[key] = folder.ID
		idCopy := folder.ID
		parentID = &idCopy
	}
	return parentID
}

// nextOrder 返回某容器（模块+文件夹）内下一个端点排序号。
func (ic *importCtx) nextOrder(moduleID string, folderID *string) int {
	key := moduleID + "|" + ptrOrEmpty(folderID)
	n := ic.orderIn[key]
	ic.orderIn[key] = n + 1
	return n
}

func ptrOrEmpty(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// ensureModule 按名称去重获取/创建模块（忽略 Apifox 的 moduleId）。
func (ic *importCtx) ensureModule(name string) string {
	if name == "" {
		name = "默认模块"
	}
	// 已在本次导入中创建/使用
	for aid, mid := range ic.moduleByID {
		if ic.moduleName[aid] == name {
			return mid
		}
	}
	// 复用项目中已存在的同名模块
	var existing models.Module
	if err := ic.tx.Where("project_id = ? AND name = ?", ic.projectID, name).First(&existing).Error; err == nil {
		return existing.ID
	}
	// 新建
	var maxSort int
	ic.tx.Model(&models.Module{}).Where("project_id = ?", ic.projectID).
		Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)
	m := models.Module{ProjectID: ic.projectID, Name: name, SortOrder: maxSort + 1}
	ic.tx.Create(&m)
	ic.result.Modules++
	return m.ID
}

// ensureModuleByApifoxID 通过 Apifox moduleId 找到模块名并按名去重创建。
func (ic *importCtx) ensureModuleByApifoxID(apifoxID string) string {
	if mid, ok := ic.moduleByID[apifoxID]; ok {
		return mid
	}
	name := ic.moduleName[apifoxID]
	mid := ic.ensureModule(name)
	ic.moduleByID[apifoxID] = mid
	return mid
}

// applyModuleAuth 将 Apifox 根集合的认证设置为模块级默认认证。
func (ic *importCtx) applyModuleAuth(moduleID string, auth apifoxAuth) {
	t, data := convertAuth(auth)
	if t == "" || t == string(models.AuthTypeInherit) {
		return
	}
	ic.tx.Model(&models.Module{}).Where("id = ?", moduleID).
		Updates(map[string]interface{}{"auth_type": t, "auth_data": data})
}

func (ic *importCtx) importModuleOperations(moduleID string, pre, post []apifoxProcessor) {
	ic.createOperations(models.OperationOwnerModule, moduleID, pre, post)
}

// createAPIEndpoint 创建一个 HTTP 端点及其所有关联数据。name 为已解析的接口名称。
func (ic *importCtx) createAPIEndpoint(moduleID string, folderID *string, name string, api *apifoxAPI, sortOrder int) {
	if api == nil {
		return
	}
	bodyType, bodyContent, contentType, bodyFields := convertBody(api.RequestBody)
	authType, authData := convertAuth(api.Auth)

	ep := models.Endpoint{
		ModuleID:          moduleID,
		FolderID:          folderID,
		Name:              defaultStr(name, defaultStr(api.Name, api.Path)),
		Type:              string(models.EndpointTypeHTTP),
		Method:            strings.ToUpper(defaultStr(api.Method, "GET")),
		Path:              api.Path,
		BodyType:          bodyType,
		BodyContent:       bodyContent,
		ContentType:       contentType,
		Status:            api.Status,
		Tags:              jsonArray(api.Tags),
		Description:       api.Description,
		Timeout:           30000,
		FollowRedirects:   true,
		InheritOperations: true,
		SortOrder:         sortOrder,
	}
	ic.tx.Create(&ep)
	ic.result.Endpoints++

	ic.createParamsAndHeaders(ep.ID, api.Parameters)
	ic.createBodyFields(ep.ID, bodyFields)
	ic.createEndpointAuth(ep.ID, authType, authData)
	ic.createOperations(models.OperationOwnerEndpoint, ep.ID, api.PreProcessors, api.PostProcessors)
	ic.createResponses(ep.ID, api.Responses, api.ResponseExamples)
}

// createWSEndpoint 创建一个 WebSocket 端点。
func (ic *importCtx) createWSEndpoint(moduleID string, folderID *string, name string, api *apifoxAPI, sortOrder int) {
	if api == nil {
		return
	}
	ep := models.Endpoint{
		ModuleID: moduleID, FolderID: folderID, Name: defaultStr(name, api.Path),
		Type: string(models.EndpointTypeWebSocket), Method: "GET", Path: api.Path,
		Timeout: 30000, FollowRedirects: true, InheritOperations: true, SortOrder: sortOrder,
	}
	ic.tx.Create(&ep)
	ic.result.WebSockets++
}

// createDocEndpoint 创建一个文档类型端点（Markdown 内容）。
func (ic *importCtx) createDocEndpoint(moduleID string, folderID *string, doc *apifoxDoc, sortOrder int) {
	if doc == nil {
		return
	}
	ep := models.Endpoint{
		ModuleID: moduleID, FolderID: folderID, Name: defaultStr(doc.Name, "文档"),
		Type: string(models.EndpointTypeDoc), Method: "GET", Path: "/",
		DocContent: doc.Content, SortOrder: sortOrder, InheritOperations: false,
	}
	ic.tx.Create(&ep)
	ic.result.Documents++
}

func (ic *importCtx) createParamsAndHeaders(endpointID string, p apifoxParameters) {
	add := func(list []apifoxParam, loc string) {
		for _, pm := range list {
			ic.tx.Create(&models.EndpointParam{
				EndpointID: endpointID, Type: loc, Name: pm.Name, Value: pm.val(),
				Description: pm.Description, Enabled: boolOr(pm.Enable, true),
				DataType: defaultStr(pm.Type, "string"), Required: pm.Required, Example: pm.exampleStr(),
			})
		}
	}
	add(p.Query, "query")
	add(p.Path, "path")
	add(p.Cookie, "cookie")
	for _, h := range p.Header {
		ic.tx.Create(&models.EndpointHeader{
			EndpointID: endpointID, Name: h.Name, Value: h.val(),
			Description: h.Description, Enabled: boolOr(h.Enable, true),
			Required: h.Required, Example: h.exampleStr(),
		})
	}
}

func (ic *importCtx) createBodyFields(endpointID string, fields []models.EndpointBodyField) {
	for _, f := range fields {
		f.EndpointID = endpointID
		ic.tx.Create(&f)
	}
}

func (ic *importCtx) createEndpointAuth(endpointID, authType, authData string) {
	if authType == "" || authType == string(models.AuthTypeInherit) {
		return // 默认继承，不写记录
	}
	ic.tx.Create(&models.EndpointAuth{EndpointID: endpointID, Type: authType, Data: authData})
}

// createOperations 将前置/后置处理器转换为操作。
func (ic *importCtx) createOperations(ownerType models.OperationOwnerType, ownerID string, pre, post []apifoxProcessor) {
	conv := func(procs []apifoxProcessor, stage models.OperationStage) {
		order := 0
		for _, p := range procs {
			op := convertProcessor(p)
			if op == nil {
				continue
			}
			op.OwnerType = string(ownerType)
			op.OwnerID = ownerID
			op.Stage = string(stage)
			op.SortOrder = order
			order++
			ic.tx.Create(op)
		}
	}
	conv(pre, models.OperationStagePre)
	conv(post, models.OperationStagePost)
}

// createResponses 导入响应定义与响应示例。
func (ic *importCtx) createResponses(endpointID string, responses []apifoxResponse, examples []apifoxRespExample) {
	// responseId -> (code, contentType)
	respMeta := map[string]apifoxResponse{}
	for i, r := range responses {
		respMeta[r.ID.String()] = r
		schema := ""
		if len(r.JSONSchema) > 0 {
			schema = string(r.JSONSchema)
		}
		ic.tx.Create(&models.ResponseSchema{
			EndpointID: endpointID, Name: r.Name, StatusCode: defaultInt(r.Code, 200),
			ContentType: r.ContentType, Schema: schema, SortOrder: i,
		})
	}
	for i, ex := range examples {
		code, ct := 200, "json"
		if m, ok := respMeta[ex.ResponseID.String()]; ok {
			code = defaultInt(m.Code, 200)
			ct = defaultStr(m.ContentType, "json")
		}
		ic.tx.Create(&models.ResponseExample{
			EndpointID: endpointID, Name: defaultStr(ex.Name, "示例"),
			StatusCode: code, ContentType: ct, Body: ex.Data, SortOrder: i,
		})
	}
}

// walkWebSocketItems 递归导入 WebSocket 集合（文件夹与 WS 端点）。
// createRequestEndpoint 将「通用请求」项创建为默认模块下的端点。
func (ic *importCtx) createRequestEndpoint(moduleID string, folderID *string, item apifoxRequestItem, sortOrder int) {
	bodyType, bodyContent, contentType, bodyFields := convertBody(item.RequestBody)
	authType, authData := convertAuth(item.Auth)
	ep := models.Endpoint{
		ModuleID: moduleID, FolderID: folderID, Name: defaultStr(item.Name, item.Path),
		Type: string(models.EndpointTypeHTTP), Method: strings.ToUpper(defaultStr(item.Method, "GET")),
		Path: item.Path, BodyType: bodyType, BodyContent: bodyContent, ContentType: contentType,
		Timeout: 30000, FollowRedirects: true, InheritOperations: true, SortOrder: sortOrder,
	}
	ic.tx.Create(&ep)
	ic.result.Endpoints++
	ic.createParamsAndHeaders(ep.ID, item.Parameters)
	ic.createBodyFields(ep.ID, bodyFields)
	ic.createEndpointAuth(ep.ID, authType, authData)
}

// importEnvironments 按名称去重创建环境及环境变量。
func (ic *importCtx) importEnvironments(envs []apifoxEnvironment) error {
	for _, e := range envs {
		var env models.Environment
		if err := ic.tx.Where("project_id = ? AND name = ?", ic.projectID, e.Name).First(&env).Error; err != nil {
			env = models.Environment{ProjectID: ic.projectID, Name: e.Name}
			if err := ic.tx.Create(&env).Error; err != nil {
				return err
			}
			ic.result.Environments++
		}
		ic.envByID[e.ID.String()] = env.ID
		for i, v := range e.Variables {
			ic.tx.Create(&models.EnvironmentVariable{
				EnvironmentID: env.ID, Key: v.Name, Value: v.Value.String(), Enabled: true, SortOrder: i,
			})
		}
	}
	return nil
}

// importEnvBaseURLs 将某模块在各环境下的 baseUrl 写入 ModuleBaseURL。
func (ic *importCtx) importEnvBaseURLs(envs []apifoxEnvironment, apifoxModuleID, moduleID string) {
	for _, e := range envs {
		envID, ok := ic.envByID[e.ID.String()]
		if !ok {
			continue
		}
		baseURL := e.BaseURLs[apifoxModuleID]
		if baseURL == "" {
			continue
		}
		// 去重：同模块同环境仅保留一条
		var count int64
		ic.tx.Model(&models.ModuleBaseURL{}).Where("module_id = ? AND environment_id = ?", moduleID, envID).Count(&count)
		if count > 0 {
			continue
		}
		ic.tx.Create(&models.ModuleBaseURL{ModuleID: moduleID, EnvironmentID: envID, BaseURL: baseURL})
	}
}

func (ic *importCtx) importGlobalVars(sets []apifoxGlobalVarSet) {
	order := 0
	for _, set := range sets {
		for _, v := range set.Variables {
			if v.Name == "" {
				continue
			}
			ic.tx.Create(&models.GlobalVariable{
				ProjectID: ic.projectID, Key: v.Name, Value: v.Value.String(),
				Description: v.Description, Enabled: true, SortOrder: order,
			})
			ic.result.GlobalVars++
			order++
		}
	}
}

func (ic *importCtx) importScripts(scripts []apifoxCommonScript) {
	for i, sc := range scripts {
		if sc.Name == "" && sc.Content == "" {
			continue
		}
		ic.tx.Create(&models.ScriptLibrary{
			ProjectID: ic.projectID, Name: defaultStr(sc.Name, fmt.Sprintf("脚本%d", i+1)),
			Content: sc.Content, Description: sc.Description, SortOrder: i,
		})
		ic.result.Scripts++
	}
}

// importCommonParameters 把项目公共参数并入默认模块的自动参数。
func (ic *importCtx) importCommonParameters(cp apifoxCommonParameters) {
	all := append([]apifoxParam{}, cp.Parameters.Query...)
	hdr := cp.Parameters.Header
	ck := cp.Parameters.Cookie
	if len(all) == 0 && len(hdr) == 0 && len(ck) == 0 {
		return
	}
	moduleID := ic.ensureModule("默认模块")
	order := 0
	create := func(list []apifoxParam, loc string) {
		for _, p := range list {
			if p.Name == "" {
				continue
			}
			ic.tx.Create(&models.ModuleParam{
				ModuleID: moduleID, Type: loc, Name: p.Name, Value: p.val(),
				Description: p.Description, Enabled: boolOr(p.Enable, true), SortOrder: order,
			})
			ic.result.ModuleParams++
			order++
		}
	}
	create(all, "query")
	create(hdr, "header")
	create(ck, "cookie")
}

// ---- 转换辅助函数 ----

// convertAuth 将 Apifox 认证转换为我方类型与数据 JSON。
func convertAuth(a apifoxAuth) (authType, authData string) {
	switch a.Type {
	case "apikey":
		if a.APIKey != nil {
			return string(models.AuthTypeAPIKey), models.ToJSON(models.APIKeyAuthData{
				Key: a.APIKey.Key, Value: a.APIKey.Value, In: defaultStr(a.APIKey.In, "header"),
			})
		}
	case "bearer":
		if a.Bearer != nil {
			return string(models.AuthTypeBearer), models.ToJSON(models.BearerAuthData{Token: a.Bearer.Token})
		}
	case "basic":
		if a.Basic != nil {
			return string(models.AuthTypeBasic), models.ToJSON(models.BasicAuthData{
				Username: a.Basic.Username, Password: a.Basic.Password,
			})
		}
	case "noauth":
		return string(models.AuthTypeNone), ""
	case "inherit", "":
		return string(models.AuthTypeInherit), ""
	}
	return string(models.AuthTypeInherit), ""
}

// convertBody 将 Apifox 请求体转换为我方 BodyType / 内容 / 表单字段。
func convertBody(rb apifoxRequestBody) (bodyType, bodyContent, contentType string, fields []models.EndpointBodyField) {
	rawExample := rb.Example.String()
	if rawExample == "" && len(rb.Examples) > 0 {
		rawExample = rb.Examples[0].Value.String()
	}
	if rawExample == "" {
		rawExample = rb.Data.String()
	}
	switch rb.Type {
	case "application/json":
		return string(models.BodyTypeJSON), rawExample, "application/json", nil
	case "text/plain":
		return string(models.BodyTypeText), rawExample, "text/plain", nil
	case "application/xml", "text/xml":
		return string(models.BodyTypeXML), rawExample, "application/xml", nil
	case "multipart/form-data":
		return string(models.BodyTypeFormData), "", "", convertFormFields(rb.Parameters)
	case "application/x-www-form-urlencoded":
		return string(models.BodyTypeURLEncoded), "", "", convertFormFields(rb.Parameters)
	case "binary", "application/octet-stream":
		return string(models.BodyTypeBinary), rawExample, "application/octet-stream", nil
	case "none", "":
		return string(models.BodyTypeNone), "", "", nil
	default:
		// 其它类型按原始文本处理
		if rawExample != "" {
			return string(models.BodyTypeText), rawExample, rb.Type, nil
		}
		return string(models.BodyTypeNone), "", "", nil
	}
}

func convertFormFields(params []apifoxParam) []models.EndpointBodyField {
	fields := make([]models.EndpointBodyField, 0, len(params))
	for _, p := range params {
		ft := "text"
		if p.Type == "file" {
			ft = "file"
		}
		fields = append(fields, models.EndpointBodyField{
			Name: p.Name, Value: p.val(), FieldType: ft, Enabled: boolOr(p.Enable, true),
		})
	}
	return fields
}

// convertProcessor 将 Apifox 处理器转换为操作（inheritProcessors 等标记返回 nil）。
func convertProcessor(p apifoxProcessor) *models.Operation {
	enable := boolOr(p.Enable, true)
	switch p.Type {
	case "customScript":
		var script string
		if err := json.Unmarshal(p.Data, &script); err != nil {
			// data 可能是对象 {"script": "..."}
			var obj struct {
				Script string `json:"script"`
			}
			_ = json.Unmarshal(p.Data, &obj)
			script = obj.Script
		}
		if strings.TrimSpace(script) == "" {
			return nil
		}
		return &models.Operation{
			Type: string(models.OpTypeScript), Name: defaultStr(p.Name, "脚本"),
			Enabled: enable, Data: models.ToJSON(models.ScriptOperationData{Script: script}),
		}
	case "inheritProcessors", "":
		return nil
	default:
		// 其它处理器类型暂不支持精确转换，跳过（保留扩展位）
		return nil
	}
}

// ---- 小工具 ----

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func defaultStr(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}

func defaultInt(v, def int) int {
	if v == 0 {
		return def
	}
	return v
}

func boolOr(p *bool, def bool) bool {
	if p == nil {
		return def
	}
	return *p
}

func jsonArray(items []string) string {
	if len(items) == 0 {
		return ""
	}
	b, _ := json.Marshal(items)
	return string(b)
}
