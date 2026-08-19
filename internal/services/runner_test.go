package services

import (
	"net/http"
	"strings"
	"testing"

	"PostPigeon/internal/apperr"
)

// newRunnerFixture 建好一个可运行的模块：两个成功接口 + 一个失败接口，
// 并把模块前置 URL 指向测试服务器。
func newRunnerFixture(t *testing.T) (*RunnerService, string, string) {
	t.Helper()
	db := newTestDB(t)

	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/ok":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"code":0}`))
		case "/bad":
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"code":1}`))
		default:
			_, _ = w.Write([]byte("ok"))
		}
	}))

	project := mustCreateProject(t, db, "runner")
	module := defaultModule(t, db, project.ID)
	env := firstEnvironment(t, db, project.ID)
	if err := NewModuleService(db).SetModuleBaseURL(module.ID, env.ID, srv.URL); err != nil {
		t.Fatalf("设置模块前置 URL 失败: %v", err)
	}

	endpointSvc := NewEndpointService(db)
	specs := []struct {
		name, path, script string
	}{
		{"成功接口", "/ok", `pm.test("状态码为 200", function () { pm.response.to.have.status(200) })`},
		{"断言失败接口", "/ok", `pm.test("期望 404", function () { pm.response.to.have.status(404) })`},
		{"服务端错误接口", "/bad", ""},
	}
	for i, spec := range specs {
		if _, err := endpointSvc.CreateFullEndpoint(module.ID, nil, EndpointSaveData{
			Name: spec.name, Method: "GET", Path: spec.path,
			PostResponseScript: spec.script,
			Timeout:            5000,
		}); err != nil {
			t.Fatalf("创建接口 %d 失败: %v", i, err)
		}
	}

	httpSvc := newTestHTTPService(t, db)
	runner := NewRunnerService(db, httpSvc)
	t.Cleanup(func() { _ = runner.ServiceShutdown() })
	return runner, module.ID, env.ID
}

func TestRunCollection(t *testing.T) {
	runner, moduleID, envID := newRunnerFixture(t)

	report, err := runner.RunCollection(RunOptions{
		RunID: "run-1", ModuleID: moduleID, EnvironmentID: envID,
	})
	if err != nil {
		t.Fatalf("RunCollection err=%v", err)
	}

	if report.Total != 3 {
		t.Fatalf("应运行 3 个接口，实际 %d", report.Total)
	}
	if report.Succeeded != 1 || report.Failed != 2 {
		t.Errorf("成功/失败统计有误：成功 %d 失败 %d", report.Succeeded, report.Failed)
	}
	// 两条断言：一条通过、一条失败
	if report.TotalTests != 2 || report.PassedTests != 1 || report.FailedTests != 1 {
		t.Errorf("断言统计有误：总 %d 通过 %d 失败 %d", report.TotalTests, report.PassedTests, report.FailedTests)
	}
	// 5xx 即使没有断言也应算失败
	for _, item := range report.Items {
		if item.Name == "服务端错误接口" {
			if item.Passed {
				t.Errorf("5xx 响应不应算通过")
			}
			if item.StatusCode != 500 {
				t.Errorf("状态码=%d", item.StatusCode)
			}
		}
	}
}

func TestRunCollectionIterationsAndStopOnFailure(t *testing.T) {
	runner, moduleID, envID := newRunnerFixture(t)

	multi, err := runner.RunCollection(RunOptions{
		RunID: "run-2", ModuleID: moduleID, EnvironmentID: envID, Iterations: 2,
	})
	if err != nil {
		t.Fatalf("RunCollection err=%v", err)
	}
	if multi.Total != 6 {
		t.Errorf("两轮应运行 6 次，实际 %d", multi.Total)
	}

	// 第二个接口断言失败，开启 StopOnFailure 后应只跑到它为止
	stopped, err := runner.RunCollection(RunOptions{
		RunID: "run-3", ModuleID: moduleID, EnvironmentID: envID, StopOnFailure: true,
	})
	if err != nil {
		t.Fatalf("RunCollection err=%v", err)
	}
	if stopped.Total != 2 {
		t.Errorf("遇到失败应立即停止，实际运行了 %d 条", stopped.Total)
	}
}

func TestRunCollectionRespectsEndpointOrder(t *testing.T) {
	runner, moduleID, envID := newRunnerFixture(t)

	all, err := runner.ResolveTargets(RunOptions{ModuleID: moduleID})
	if err != nil {
		t.Fatalf("ResolveTargets err=%v", err)
	}
	if len(all) != 3 {
		t.Fatalf("应展开出 3 个接口，实际 %d", len(all))
	}

	// 反序传入接口 ID，运行顺序应严格跟随（依赖关系常靠顺序表达）
	reversed := []string{all[2].ID, all[1].ID, all[0].ID}
	report, err := runner.RunCollection(RunOptions{
		RunID: "run-4", EndpointIDs: reversed, EnvironmentID: envID,
	})
	if err != nil {
		t.Fatalf("RunCollection err=%v", err)
	}
	for i, id := range reversed {
		if report.Items[i].EndpointID != id {
			t.Fatalf("第 %d 条应为 %s，实际 %s", i, id, report.Items[i].EndpointID)
		}
	}
}

func TestRunCollectionNoTargets(t *testing.T) {
	runner, _, _ := newRunnerFixture(t)
	_, err := runner.RunCollection(RunOptions{RunID: "run-5"})
	if err == nil {
		t.Fatalf("没有运行范围应报错")
	}
	if code := apperr.Code(err); code != apperr.CodeRunnerNoTargets {
		t.Errorf("错误码=%s", code)
	}
}

func TestExportReportMarkdown(t *testing.T) {
	runner, moduleID, envID := newRunnerFixture(t)
	report, err := runner.RunCollection(RunOptions{RunID: "run-6", ModuleID: moduleID, EnvironmentID: envID})
	if err != nil {
		t.Fatalf("RunCollection err=%v", err)
	}

	markdown, err := runner.ExportReportMarkdown(*report)
	if err != nil {
		t.Fatalf("ExportReportMarkdown err=%v", err)
	}
	for _, want := range []string{"# 接口运行报告", "## 明细", "## 失败详情", "断言失败"} {
		if !strings.Contains(markdown, want) {
			t.Errorf("报告缺少 %q\n%s", want, markdown)
		}
	}
}

func TestEscapeMarkdownCell(t *testing.T) {
	if got := escapeMarkdownCell("a|b\nc"); got != `a\|b c` {
		t.Errorf("escapeMarkdownCell=%q", got)
	}
}

func TestCollectFolderSubtree(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "folders")
	module := defaultModule(t, db, project.ID)

	folderSvc := NewFolderService(db)
	root, err := folderSvc.CreateFolder(module.ID, nil, "root")
	if err != nil {
		t.Fatalf("CreateFolder err=%v", err)
	}
	child, err := folderSvc.CreateFolder(module.ID, &root.ID, "child")
	if err != nil {
		t.Fatalf("CreateFolder err=%v", err)
	}
	if _, err := folderSvc.CreateFolder(module.ID, &child.ID, "grandchild"); err != nil {
		t.Fatalf("CreateFolder err=%v", err)
	}

	ids := collectFolderSubtree(db, root.ID)
	if len(ids) != 3 {
		t.Fatalf("应收集到 3 层文件夹，实际 %d：%v", len(ids), ids)
	}
}

// TestRunnerUsesEndpointBaseURL 验证运行器会按环境取模块前置 URL。
func TestRunnerUsesEndpointBaseURL(t *testing.T) {
	runner, moduleID, envID := newRunnerFixture(t)
	if got := runner.baseURLFor(moduleID, envID); !strings.HasPrefix(got, "http://127.0.0.1") {
		t.Errorf("应取到测试服务器地址，实际 %q", got)
	}
	// 环境不匹配时回退到该模块的任意一条
	if got := runner.baseURLFor(moduleID, "not-exist"); got == "" {
		t.Errorf("环境不匹配时应回退到模块已有的前置 URL")
	}
	if got := runner.baseURLFor("no-such-module", envID); got != "" {
		t.Errorf("模块不存在时应返回空串，实际 %q", got)
	}
}
