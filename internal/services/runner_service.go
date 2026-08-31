package services

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
	"PostPigeon/internal/scripting"

	"github.com/wailsapp/wails/v3/pkg/application"
	"gorm.io/gorm"
)

// RunnerEventName 是运行进度推送给前端的事件名。
const RunnerEventName = "runner:progress"

// RunnerService 批量运行一组接口并汇总断言结果。
//
// 脚本引擎里的 pm.test / chai 断言早已完整，缺的只是「把一批接口按顺序跑一遍、
// 把断言结果汇总成一份报告」这层调度。有了它，接口集合才真正可用于回归。
type RunnerService struct {
	db   *gorm.DB
	http *HTTPService

	mu   sync.Mutex
	runs map[string]context.CancelFunc
}

// NewRunnerService 创建集合运行服务实例。
func NewRunnerService(db *gorm.DB, httpService *HTTPService) *RunnerService {
	return &RunnerService{db: db, http: httpService, runs: map[string]context.CancelFunc{}}
}

// RunOptions 是一次运行的输入。
type RunOptions struct {
	// RunID 由前端生成，用于取消与进度关联
	RunID string `json:"runId"`
	// 运行范围：显式给出接口 ID 列表，或给出模块/文件夹让后端展开
	EndpointIDs []string `json:"endpointIds"`
	ModuleID    string   `json:"moduleId"`
	FolderID    string   `json:"folderId"`
	// EnvironmentID 运行时使用的环境
	EnvironmentID string `json:"environmentId"`
	// Iterations 重复轮数，默认 1
	Iterations int `json:"iterations"`
	// DelayMs 每个请求之间的间隔，用于给被测服务留出喘息
	DelayMs int `json:"delayMs"`
	// StopOnFailure 遇到失败即中止后续请求
	StopOnFailure bool `json:"stopOnFailure"`
}

// RunItemResult 是单个接口一次运行的结果。
type RunItemResult struct {
	EndpointID string `json:"endpointId"`
	Name       string `json:"name"`
	Method     string `json:"method"`
	Path       string `json:"path"`
	Iteration  int    `json:"iteration"`

	StatusCode int     `json:"statusCode"`
	DurationMs float64 `json:"durationMs"`
	Size       int64   `json:"size"`
	// Error 为传输层/脚本层错误的本地化错误码 JSON（前端用 lib/errors 解析）
	Error string `json:"error,omitempty"`
	// Skipped 表示请求被前置脚本跳过
	Skipped bool `json:"skipped"`

	Tests       []scripting.TestResult `json:"tests"`
	PassedTests int                    `json:"passedTests"`
	FailedTests int                    `json:"failedTests"`
	// Passed 汇总本条是否算通过：无错误、状态码 <400、且没有失败断言
	Passed bool `json:"passed"`
}

// RunReport 是一次运行的完整报告。
type RunReport struct {
	RunID      string `json:"runId"`
	StartedAt  int64  `json:"startedAt"`
	FinishedAt int64  `json:"finishedAt"`
	// Canceled 表示运行被用户中途取消
	Canceled bool `json:"canceled"`

	Total      int     `json:"total"`
	Succeeded  int     `json:"succeeded"`
	Failed     int     `json:"failed"`
	DurationMs float64 `json:"durationMs"`

	TotalTests  int `json:"totalTests"`
	PassedTests int `json:"passedTests"`
	FailedTests int `json:"failedTests"`

	Items []RunItemResult `json:"items"`
}

// RunProgress 是推送给前端的进度事件。
type RunProgress struct {
	RunID     string        `json:"runId"`
	Index     int           `json:"index"`
	Total     int           `json:"total"`
	Item      RunItemResult `json:"item"`
	Timestamp int64         `json:"timestamp"`
}

// ServiceShutdown 应用退出时取消所有进行中的运行。
func (s *RunnerService) ServiceShutdown() error {
	s.mu.Lock()
	cancels := make([]context.CancelFunc, 0, len(s.runs))
	for id, cancel := range s.runs {
		cancels = append(cancels, cancel)
		delete(s.runs, id)
	}
	s.mu.Unlock()
	for _, cancel := range cancels {
		cancel()
	}
	return nil
}

// CancelRun 取消一次进行中的运行。
func (s *RunnerService) CancelRun(runID string) bool {
	s.mu.Lock()
	cancel := s.runs[runID]
	delete(s.runs, runID)
	s.mu.Unlock()
	if cancel == nil {
		return false
	}
	cancel()
	return true
}

// IsRunning 返回指定运行是否仍在进行。
func (s *RunnerService) IsRunning(runID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.runs[runID]
	return ok
}

// ResolveTargets 展开运行范围，返回将要运行的接口列表（供前端预览与勾选）。
func (s *RunnerService) ResolveTargets(opts RunOptions) ([]models.Endpoint, error) {
	return s.resolveEndpoints(opts)
}

// RunCollection 按顺序运行一组接口并返回汇总报告。
// 运行过程中通过 runner:progress 事件推送每条结果，前端可实时展示。
func (s *RunnerService) RunCollection(opts RunOptions) (*RunReport, error) {
	endpoints, err := s.resolveEndpoints(opts)
	if err != nil {
		return nil, err
	}
	if len(endpoints) == 0 {
		return nil, apperr.New(apperr.CodeRunnerNoTargets)
	}

	iterations := opts.Iterations
	if iterations <= 0 {
		iterations = 1
	}

	ctx, cancel := context.WithCancel(context.Background())
	if opts.RunID != "" {
		s.mu.Lock()
		s.runs[opts.RunID] = cancel
		s.mu.Unlock()
		defer func() {
			s.mu.Lock()
			delete(s.runs, opts.RunID)
			s.mu.Unlock()
		}()
	}
	defer cancel()

	report := &RunReport{
		RunID:     opts.RunID,
		StartedAt: nowMillis(),
		Items:     make([]RunItemResult, 0, len(endpoints)*iterations),
	}
	start := time.Now()
	total := len(endpoints) * iterations
	index := 0

runLoop:
	for iteration := 1; iteration <= iterations; iteration++ {
		for _, endpoint := range endpoints {
			select {
			case <-ctx.Done():
				report.Canceled = true
				break runLoop
			default:
			}

			item := s.runOne(endpoint, opts, iteration)
			index++
			report.Items = append(report.Items, item)
			emitRunProgress(RunProgress{
				RunID: opts.RunID, Index: index, Total: total,
				Item: item, Timestamp: nowMillis(),
			})

			if opts.StopOnFailure && !item.Passed {
				break runLoop
			}
			if opts.DelayMs > 0 {
				select {
				case <-ctx.Done():
					report.Canceled = true
					break runLoop
				case <-time.After(time.Duration(opts.DelayMs) * time.Millisecond):
				}
			}
		}
	}

	report.FinishedAt = nowMillis()
	report.DurationMs = durMs(time.Since(start))
	summarizeReport(report)
	return report, nil
}

// runOne 运行单个接口并整理成一条结果。
func (s *RunnerService) runOne(endpoint models.Endpoint, opts RunOptions, iteration int) RunItemResult {
	item := RunItemResult{
		EndpointID: endpoint.ID,
		Name:       endpoint.Name,
		Method:     endpoint.Method,
		Path:       endpoint.Path,
		Iteration:  iteration,
		Tests:      []scripting.TestResult{},
	}

	resp, err := s.http.SendRequest(SendRequestData{
		UseEnvironmentBaseURL: true, ServerID: endpoint.ServerID, FolderID: func() string {
			if endpoint.FolderID != nil {
				return *endpoint.FolderID
			}
			return ""
		}(),
		EndpointID:    endpoint.ID,
		ModuleID:      endpoint.ModuleID,
		EnvironmentID: opts.EnvironmentID,
		Method:        endpoint.Method,
		Path:          endpoint.Path,
		BodyType:      endpoint.BodyType,
		BodyContent:   endpoint.BodyContent,
		ContentType:   endpoint.ContentType,
		Timeout:       endpoint.Timeout,
		TimeoutMode:   endpoint.TimeoutMode,
		// 运行器不跟随重定向设置以外的额外配置：其余（认证/参数/脚本/代理/TLS）
		// 都由 SendRequest 依据已保存的端点自行解析，与手动发送完全一致
		FollowRedirects:    endpoint.FollowRedirects,
		SendNoCacheHeaders: endpoint.SendNoCacheHeaders,
		ProxyConfig:        endpoint.ProxyConfig,
		TLSConfig:          endpoint.TLSConfig,
		URLEncoding:        endpoint.URLEncoding,
	})
	if err != nil {
		item.Error = err.Error()
		return item
	}

	item.Error = resp.Error
	item.StatusCode = resp.StatusCode
	item.DurationMs = resp.Timing.Total
	item.Size = resp.Size
	item.Skipped = resp.Skipped

	if resp.Scripts != nil {
		item.Tests = append(item.Tests, collectTests(resp.Scripts.PreRequest)...)
		item.Tests = append(item.Tests, collectTests(resp.Scripts.PostResponse)...)
		if scriptErr := firstScriptError(resp.Scripts); scriptErr != "" && item.Error == "" {
			item.Error = scriptErr
		}
	}
	for _, test := range item.Tests {
		if test.Skipped {
			continue
		}
		if test.Passed {
			item.PassedTests++
		} else {
			item.FailedTests++
		}
	}

	item.Passed = item.Error == "" && item.FailedTests == 0 && (item.Skipped || resp.StatusCode < 400)
	return item
}

// resolveEndpoints 把运行范围展开成具体的接口列表（只含 HTTP 接口，按排序字段有序）。
func (s *RunnerService) resolveEndpoints(opts RunOptions) ([]models.Endpoint, error) {
	var endpoints []models.Endpoint
	query := s.db.Where("type = ?", string(models.EndpointTypeHTTP))

	switch {
	case len(opts.EndpointIDs) > 0:
		if err := query.Where("id IN ?", opts.EndpointIDs).Find(&endpoints).Error; err != nil {
			return nil, apperr.Wrap(err, apperr.CodeDatabase)
		}
		// 保持前端传入的顺序：运行顺序往往承载着依赖关系（先登录再调用）
		order := map[string]int{}
		for i, id := range opts.EndpointIDs {
			order[id] = i
		}
		sort.SliceStable(endpoints, func(i, j int) bool { return order[endpoints[i].ID] < order[endpoints[j].ID] })
		return endpoints, nil

	case opts.FolderID != "":
		folderIDs := collectFolderSubtree(s.db, opts.FolderID)
		if err := query.Where("folder_id IN ?", folderIDs).
			Order("sort_order ASC").Find(&endpoints).Error; err != nil {
			return nil, apperr.Wrap(err, apperr.CodeDatabase)
		}
		return endpoints, nil

	case opts.ModuleID != "":
		if err := query.Where("module_id = ?", opts.ModuleID).
			Order("sort_order ASC").Find(&endpoints).Error; err != nil {
			return nil, apperr.Wrap(err, apperr.CodeDatabase)
		}
		return endpoints, nil
	}

	return nil, apperr.New(apperr.CodeRunnerNoTargets)
}

// collectFolderSubtree 收集文件夹及其所有子孙文件夹的 ID。
func collectFolderSubtree(db *gorm.DB, folderID string) []string {
	ids := []string{folderID}
	queue := []string{folderID}
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		var children []models.Folder
		if err := db.Select("id").Where("parent_id = ?", current).Find(&children).Error; err != nil {
			continue
		}
		for _, child := range children {
			ids = append(ids, child.ID)
			queue = append(queue, child.ID)
		}
	}
	return ids
}

// collectTests 从一次脚本执行结果里取出断言。
func collectTests(result *scripting.Result) []scripting.TestResult {
	if result == nil {
		return nil
	}
	return result.Tests
}

// firstScriptError 返回前置/后置脚本中的第一条执行错误。
func firstScriptError(results *ScriptResults) string {
	if results.PreRequest != nil && results.PreRequest.Error != "" {
		return results.PreRequest.Error
	}
	if results.PostResponse != nil && results.PostResponse.Error != "" {
		return results.PostResponse.Error
	}
	return ""
}

// summarizeReport 汇总统计数字。
func summarizeReport(report *RunReport) {
	report.Total = len(report.Items)
	for _, item := range report.Items {
		if item.Passed {
			report.Succeeded++
		} else {
			report.Failed++
		}
		report.PassedTests += item.PassedTests
		report.FailedTests += item.FailedTests
	}
	report.TotalTests = report.PassedTests + report.FailedTests
}

// emitRunProgress 推送一条运行进度（无运行中的 App 时静默跳过，便于测试）。
func emitRunProgress(progress RunProgress) {
	app := application.Get()
	if app == nil || app.Event == nil {
		return
	}
	app.Event.Emit(RunnerEventName, progress)
}

// ExportReportMarkdown 把运行报告渲染为 Markdown，便于贴进工单或 PR。
func (s *RunnerService) ExportReportMarkdown(report RunReport) (string, error) {
	var b strings.Builder

	b.WriteString("# 接口运行报告\n\n")
	b.WriteString(fmt.Sprintf("- 运行时间：%s\n", time.UnixMilli(report.StartedAt).Format(time.RFC3339)))
	b.WriteString(fmt.Sprintf("- 总耗时：%.0f ms\n", report.DurationMs))
	b.WriteString(fmt.Sprintf("- 请求：%d 个，成功 %d，失败 %d\n", report.Total, report.Succeeded, report.Failed))
	b.WriteString(fmt.Sprintf("- 断言：%d 条，通过 %d，失败 %d\n", report.TotalTests, report.PassedTests, report.FailedTests))
	if report.Canceled {
		b.WriteString("- **本次运行被中途取消**\n")
	}
	b.WriteString("\n## 明细\n\n")
	b.WriteString("| 结果 | 接口 | 方法 | 状态码 | 耗时 | 断言 |\n")
	b.WriteString("| --- | --- | --- | --- | --- | --- |\n")

	for _, item := range report.Items {
		mark := "✅"
		if !item.Passed {
			mark = "❌"
		}
		tests := "-"
		if len(item.Tests) > 0 {
			tests = fmt.Sprintf("%d/%d", item.PassedTests, item.PassedTests+item.FailedTests)
		}
		b.WriteString(fmt.Sprintf("| %s | %s | %s | %d | %.0f ms | %s |\n",
			mark, escapeMarkdownCell(item.Name), item.Method, item.StatusCode, item.DurationMs, tests))
	}

	// 失败详情单列一节：报告的价值主要在这里
	failed := make([]RunItemResult, 0)
	for _, item := range report.Items {
		if !item.Passed {
			failed = append(failed, item)
		}
	}
	if len(failed) > 0 {
		b.WriteString("\n## 失败详情\n")
		for _, item := range failed {
			b.WriteString(fmt.Sprintf("\n### %s %s\n\n", item.Method, escapeMarkdownCell(item.Name)))
			if item.Error != "" {
				b.WriteString(fmt.Sprintf("- 错误：`%s`\n", item.Error))
			}
			if item.StatusCode >= 400 {
				b.WriteString(fmt.Sprintf("- 状态码：%d\n", item.StatusCode))
			}
			for _, test := range item.Tests {
				if test.Passed || test.Skipped {
					continue
				}
				b.WriteString(fmt.Sprintf("- 断言失败：%s — %s\n", test.Name, test.Error))
			}
		}
	}

	return b.String(), nil
}

// escapeMarkdownCell 转义表格单元格里的竖线，避免撑破表格结构。
func escapeMarkdownCell(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, "|", "\\|"), "\n", " ")
}
