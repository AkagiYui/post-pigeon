package services

import (
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

// TestSendRequestWithScripts 端到端验证前置/后置脚本在真实请求流程中的行为：
// 前置脚本注入请求头并读环境变量；后置脚本解析响应、断言、并把值写回环境（持久化）。
func TestSendRequestWithScripts(t *testing.T) {
	db := newTestDB(t)
	server := echoServer(t)
	defer server.Close()

	project := mustCreateProject(t, db, "scripts")
	envSvc := NewEnvironmentService(db)
	env, err := envSvc.CreateEnvironment(project.ID, "dev")
	if err != nil {
		t.Fatalf("创建环境失败: %v", err)
	}
	if err := envSvc.SaveEnvironmentVariables(env.ID, []models.EnvironmentVariable{
		{Key: "seed", Value: "abc", Enabled: true},
	}); err != nil {
		t.Fatalf("保存环境变量失败: %v", err)
	}

	httpSvc := NewHTTPService(db)
	resp, err := httpSvc.SendRequest(SendRequestData{
		EnvironmentID: env.ID,
		Method:        "POST",
		BaseURL:       server.URL,
		Path:          "/echo",
		BodyType:      string(models.BodyTypeJSON),
		BodyContent:   `{"a":"{{seed}}"}`,
		PreRequestScript: `
			pm.request.headers.upsert('X-Token', 't-' + pm.environment.get('seed'));
			pm.environment.set('preRan', 'yes');
		`,
		PostResponseScript: `
			const j = pm.response.json();
			pm.test('method is POST', function () {
				pm.expect(j.method).to.equal('POST');
			});
			pm.test('token header forwarded', function () {
				pm.expect(j.headers['X-Token']).to.equal('t-abc');
			});
			pm.environment.set('echoedBody', j.body);
		`,
	})
	if err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}

	// 脚本结果应随响应返回
	if resp.Scripts == nil || resp.Scripts.PreRequest == nil || resp.Scripts.PostResponse == nil {
		t.Fatalf("响应应包含前置与后置脚本结果: %+v", resp.Scripts)
	}
	if !resp.Scripts.PreRequest.Executed {
		t.Error("前置脚本应被标记为已执行")
	}
	if resp.Scripts.PostResponse.Error != "" {
		t.Fatalf("后置脚本出错: %s", resp.Scripts.PostResponse.Error)
	}
	tests := resp.Scripts.PostResponse.Tests
	if len(tests) != 2 || !tests[0].Passed || !tests[1].Passed {
		t.Fatalf("两个断言都应通过: %+v", tests)
	}

	// 环境变量增量应持久化：preRan=yes（前置）、echoedBody 含 abc（后置）
	vars, err := envSvc.GetEnvironmentVariables(env.ID)
	if err != nil {
		t.Fatalf("读取环境变量失败: %v", err)
	}
	got := map[string]string{}
	for _, v := range vars {
		got[v.Key] = v.Value
	}
	if got["preRan"] != "yes" {
		t.Errorf("preRan 应被持久化为 yes，实际: %q", got["preRan"])
	}
	if !strings.Contains(got["echoedBody"], "abc") {
		t.Errorf("echoedBody 应含解析后的 abc，实际: %q", got["echoedBody"])
	}
	// 原有变量 seed 应保持不变
	if got["seed"] != "abc" {
		t.Errorf("seed 应保持 abc，实际: %q", got["seed"])
	}
}

// TestSendRequestPostScriptMutatesBody 验证后置脚本可改写响应体（模拟解密场景）。
func TestSendRequestPostScriptMutatesBody(t *testing.T) {
	db := newTestDB(t)
	server := echoServer(t)
	defer server.Close()

	httpSvc := NewHTTPService(db)
	resp, err := httpSvc.SendRequest(SendRequestData{
		Method:  "GET",
		BaseURL: server.URL,
		Path:    "/echo",
		PostResponseScript: `
			pm.response.setBody({ replaced: true, original: pm.response.json().method });
		`,
	})
	if err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}
	if !strings.Contains(resp.Body, "replaced") {
		t.Errorf("响应体应被后置脚本改写，实际: %s", resp.Body)
	}
}
