package services

import (
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// composeStageScript 组合某端点在指定阶段（pre/post）的完整脚本。
// 会按「继承的模块/文件夹操作」+「端点自身操作」的顺序，将每个启用的操作翻译为
// 等价的 pm.* 脚本片段并拼接。前置阶段从外层到内层执行；后置阶段从内层到外层执行。
func composeStageScript(db *gorm.DB, ep *models.Endpoint, stage models.OperationStage) string {
	return composeStageScriptWithEndpointOps(db, ep, stage, nil)
}

// composeStageScriptWithEndpointOps 与 composeStageScript 相同，但允许用当前编辑态的端点操作
// 覆盖数据库里的端点操作。override 为 nil 时读取数据库；空切片表示端点当前明确没有操作。
func composeStageScriptWithEndpointOps(db *gorm.DB, ep *models.Endpoint, stage models.OperationStage,
	override []models.Operation,
) string {
	return composeStageScriptWithEndpointState(db, ep, stage, override, nil)
}

func composeStageScriptWithEndpointState(db *gorm.DB, ep *models.Endpoint, stage models.OperationStage,
	override []models.Operation, operationOverrides []models.OperationOverride,
) string {
	levels := gatherOperationLevelsWithEndpointState(db, ep, stage, override, operationOverrides)

	var fragments []string
	for _, ops := range levels {
		for _, op := range ops {
			if !op.Enabled {
				continue
			}
			if frag := translateOperation(db, op); frag != "" {
				fragments = append(fragments, frag)
			}
		}
	}
	if len(fragments) == 0 {
		// 没有任何操作时回退到端点自身的脚本字段。
		// 历史数据、以及 Postman / cURL 等导入来源写入的都是这个字段，
		// 不回退会让这些脚本静默失效（前端 deriveScriptFromOps 也是同样的回退语义）。
		return legacyStageScript(ep, stage)
	}
	// 注入 JSONPath 取值辅助函数，供断言/提取变量使用
	return jsonPathHelper + "\n" + strings.Join(fragments, "\n")
}

// legacyStageScript 返回端点上直接保存的阶段脚本（无操作时的回退来源）。
func legacyStageScript(ep *models.Endpoint, stage models.OperationStage) string {
	if stage == models.OperationStagePre {
		return ep.PreRequestScript
	}
	return ep.PostResponseScript
}

// gatherOperationLevels 收集各层级的操作，按执行顺序返回二维列表。
func gatherOperationLevels(db *gorm.DB, ep *models.Endpoint, stage models.OperationStage) [][]models.Operation {
	return gatherOperationLevelsWithEndpointOps(db, ep, stage, nil)
}

func gatherOperationLevelsWithEndpointOps(db *gorm.DB, ep *models.Endpoint, stage models.OperationStage,
	override []models.Operation,
) [][]models.Operation {
	return gatherOperationLevelsWithEndpointState(db, ep, stage, override, nil)
}

func gatherOperationLevelsWithEndpointState(db *gorm.DB, ep *models.Endpoint, stage models.OperationStage,
	override []models.Operation, operationOverrides []models.OperationOverride,
) [][]models.Operation {
	endpointOps := loadOperations(db, models.OperationOwnerEndpoint, ep.ID, stage)
	if override != nil {
		endpointOps = endpointOps[:0]
		for _, op := range override {
			if op.Stage == string(stage) {
				endpointOps = append(endpointOps, op)
			}
		}
		sort.SliceStable(endpointOps, func(i, j int) bool { return endpointOps[i].SortOrder < endpointOps[j].SortOrder })
	}

	// 不继承时仅返回端点自身操作
	if !ep.InheritOperations {
		return [][]models.Operation{endpointOps}
	}

	inherited := inheritedOperationsForEndpoint(db, ep)
	if operationOverrides != nil {
		values := make(map[string]bool, len(operationOverrides))
		for _, item := range operationOverrides {
			values[item.OperationID] = item.Enabled
		}
		for i := range inherited {
			// 当前编辑态覆盖列表是完整快照；先撤销数据库里的接口级覆盖，
			// 再应用快照，确保“恢复跟随”在尚未保存时直接发送也立即生效。
			inherited[i].Operation.Enabled = inherited[i].ParentEnabled
			if enabled, ok := values[inherited[i].Operation.ID]; ok {
				inherited[i].Operation.Enabled = enabled
			}
		}
	}
	inheritedOps := make([]models.Operation, 0, len(inherited))
	for _, item := range inherited {
		if item.Operation.Stage == string(stage) {
			inheritedOps = append(inheritedOps, item.Operation)
		}
	}

	if stage == models.OperationStagePre {
		return [][]models.Operation{inheritedOps, endpointOps}
	}
	// 后置从内向外执行，但同一作用域内部仍保持用户定义的顺序。
	var inheritedLevels [][]models.Operation
	for _, op := range inheritedOps {
		if len(inheritedLevels) == 0 || inheritedLevels[len(inheritedLevels)-1][0].OwnerType != op.OwnerType || inheritedLevels[len(inheritedLevels)-1][0].OwnerID != op.OwnerID {
			inheritedLevels = append(inheritedLevels, []models.Operation{op})
		} else {
			inheritedLevels[len(inheritedLevels)-1] = append(inheritedLevels[len(inheritedLevels)-1], op)
		}
	}
	levels := [][]models.Operation{endpointOps}
	for i := len(inheritedLevels) - 1; i >= 0; i-- {
		levels = append(levels, inheritedLevels[i])
	}
	return levels
}

// folderChainToRoot 返回从当前文件夹到根的 ID 列表（叶在前，根在后）。
func folderChainToRoot(db *gorm.DB, folderID *string) []string {
	var chain []string
	cur := folderID
	seen := map[string]bool{}
	for cur != nil && *cur != "" {
		if seen[*cur] {
			break // 防御环
		}
		seen[*cur] = true
		chain = append(chain, *cur)
		var f models.Folder
		if err := db.Select("parent_id").Where("id = ?", *cur).First(&f).Error; err != nil {
			break
		}
		cur = f.ParentID
	}
	return chain
}

// loadOperations 加载某归属对象在指定阶段的操作，按 SortOrder 排序。
func loadOperations(db *gorm.DB, ownerType models.OperationOwnerType, ownerID string, stage models.OperationStage) []models.Operation {
	var ops []models.Operation
	db.Where("owner_type = ? AND owner_id = ? AND stage = ?", ownerType, ownerID, stage).Find(&ops)
	sort.SliceStable(ops, func(i, j int) bool { return ops[i].SortOrder < ops[j].SortOrder })
	return ops
}

// translateOperation 将单个操作翻译为等价的 pm.* 脚本片段。
func translateOperation(db *gorm.DB, op models.Operation) string {
	switch models.OperationType(op.Type) {
	case models.OpTypeScript:
		var d models.ScriptOperationData
		_ = json.Unmarshal([]byte(op.Data), &d)
		return d.Script

	case models.OpTypeLibraryScript:
		var d models.ScriptOperationData
		_ = json.Unmarshal([]byte(op.Data), &d)
		if d.LibraryID == "" {
			return d.Script
		}
		var lib models.ScriptLibrary
		if err := db.Where("id = ?", d.LibraryID).First(&lib).Error; err != nil {
			return ""
		}
		return lib.Content

	case models.OpTypeAssert:
		var d models.AssertOperationData
		_ = json.Unmarshal([]byte(op.Data), &d)
		return translateAssert(op.Name, d)

	case models.OpTypeExtractVar:
		var d models.ExtractVarOperationData
		_ = json.Unmarshal([]byte(op.Data), &d)
		return translateExtractVar(d)

	case models.OpTypeWait:
		var d models.WaitOperationData
		_ = json.Unmarshal([]byte(op.Data), &d)
		if d.Milliseconds <= 0 {
			return ""
		}
		// 上限，避免脚本超时
		ms := min(d.Milliseconds, 10000)
		return fmt.Sprintf("{const __e=Date.now()+%d;while(Date.now()<__e){}}", ms)

	default:
		return ""
	}
}

// sourceExpr 返回读取断言/提取来源的 JS 表达式。
func sourceExpr(source, expression string) string {
	switch source {
	case "statusCode":
		return "pm.response.code"
	case "responseTime":
		return "pm.response.responseTime"
	case "responseHeader":
		return fmt.Sprintf("pm.response.headers.get(%s)", jsString(expression))
	case "responseText":
		return "pm.response.text()"
	case "responseJson", "":
		return fmt.Sprintf("__pp_get(pm.response.json(), %s)", jsString(expression))
	default:
		return fmt.Sprintf("__pp_get(pm.response.json(), %s)", jsString(expression))
	}
}

// translateAssert 生成断言脚本（包一层 pm.test，失败不会中断后续）。
func translateAssert(name string, d models.AssertOperationData) string {
	if name == "" {
		name = "断言"
	}
	src := sourceExpr(d.Source, d.Expression)
	matcher := assertMatcher(d.Comparison, d.Target)
	return fmt.Sprintf("pm.test(%s, function(){ pm.expect(%s)%s; });", jsString(name), src, matcher)
}

// assertMatcher 依据比较符生成 chai 断言链。
func assertMatcher(comparison, target string) string {
	switch comparison {
	case "eq", "":
		return fmt.Sprintf(".to.eql(%s)", jsLiteral(target))
	case "neq":
		return fmt.Sprintf(".to.not.eql(%s)", jsLiteral(target))
	case "contains":
		return fmt.Sprintf(".to.include(%s)", jsLiteral(target))
	case "notContains":
		return fmt.Sprintf(".to.not.include(%s)", jsLiteral(target))
	case "gt":
		return fmt.Sprintf(".to.be.above(%s)", jsNumber(target))
	case "gte":
		return fmt.Sprintf(".to.be.at.least(%s)", jsNumber(target))
	case "lt":
		return fmt.Sprintf(".to.be.below(%s)", jsNumber(target))
	case "lte":
		return fmt.Sprintf(".to.be.at.most(%s)", jsNumber(target))
	case "exists", "notNull":
		return ".to.exist"
	case "notExists", "isNull":
		return ".to.not.exist"
	default:
		return fmt.Sprintf(".to.eql(%s)", jsLiteral(target))
	}
}

// translateExtractVar 生成提取变量脚本。
func translateExtractVar(d models.ExtractVarOperationData) string {
	if d.Variable == "" {
		return ""
	}
	setter := "pm.environment.set"
	switch d.Scope {
	case "global":
		setter = "pm.globals.set"
	case "collection":
		setter = "pm.collectionVariables.set"
	case "local":
		setter = "pm.variables.set"
	}
	src := sourceExpr(d.Source, d.Expression)
	return fmt.Sprintf("try{ %s(%s, %s); }catch(e){}", setter, jsString(d.Variable), src)
}

// jsonPathHelper 注入的 JSONPath 取值函数，支持 $.a.b、a.b[0].c 形式。
const jsonPathHelper = `function __pp_get(o, path){ if(!path) return o; var p=String(path).replace(/^\$\.?/,'').replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean); var c=o; for(var i=0;i<p.length;i++){ if(c==null) return undefined; c=c[p[i]]; } return c; }`

// jsString 将字符串编码为安全的 JS 字符串字面量。
func jsString(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}

// jsNumber 将目标编码为数字字面量（无法解析时回退为字符串）。
func jsNumber(s string) string {
	if _, err := strconv.ParseFloat(strings.TrimSpace(s), 64); err == nil {
		return strings.TrimSpace(s)
	}
	return jsString(s)
}

// jsLiteral 将目标编码为 JS 字面量：数字/布尔按原义，其余按字符串。
func jsLiteral(s string) string {
	t := strings.TrimSpace(s)
	if t == "true" || t == "false" || t == "null" {
		return t
	}
	if _, err := strconv.ParseFloat(t, 64); err == nil {
		return t
	}
	return jsString(s)
}
