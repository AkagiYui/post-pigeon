package services

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"PostPigeon/internal/database"
	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// TestMain 静音日志，保持测试输出整洁
func TestMain(m *testing.M) {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
	os.Exit(m.Run())
}

// newTestServer 启动一个测试 HTTP 服务。
//
// 必须先释放共享 Transport 的空闲连接再关闭服务：生产代码按「代理 + TLS」缓存
// Transport 并保持 keep-alive 连接（这正是连接复用的前提），而
// httptest.Server.Close 会一直阻塞到所有客户端连接关闭为止。
func newTestServer(t *testing.T, handler http.Handler) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(func() {
		closeAllTransports()
		srv.Close()
	})
	return srv
}

// newTestHTTPService 创建 HTTPService，并在用例结束时走真实的关停流程
// （取消进行中的请求与流、落盘队列、释放连接池）。
//
// 注册顺序很重要：t.Cleanup 按 LIFO 执行，用例应先建测试服务再建本服务，
// 这样关停先发生、httptest.Server.Close 才不会等在还开着的流式连接上。
func newTestHTTPService(t *testing.T, db *gorm.DB) *HTTPService {
	t.Helper()
	hs := NewHTTPService(db)
	t.Cleanup(func() { _ = hs.ServiceShutdown() })
	return hs
}

// newTestDB 创建一个隔离的临时 SQLite 测试数据库（走真实的 Initialize 路径）
func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := database.Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化测试数据库失败: %v", err)
	}
	return db
}

// waitFor 轮询等待条件成立（最多 ~2s），用于验证异步操作
func waitFor(cond func() bool) bool {
	for i := 0; i < 200; i++ {
		if cond() {
			return true
		}
		time.Sleep(10 * time.Millisecond)
	}
	return cond()
}

// mustCreateProject 创建项目并断言成功
func mustCreateProject(t *testing.T, db *gorm.DB, name string) *models.Project {
	t.Helper()
	p, err := NewProjectService(db).CreateProject(name, "desc-"+name)
	if err != nil {
		t.Fatalf("创建项目失败: %v", err)
	}
	if p == nil || p.ID == "" {
		t.Fatalf("创建项目返回空 ID")
	}
	return p
}

// defaultModule 返回项目的默认模块
func defaultModule(t *testing.T, db *gorm.DB, projectID string) models.Module {
	t.Helper()
	mods, err := NewModuleService(db).ListModules(projectID)
	if err != nil {
		t.Fatalf("获取模块列表失败: %v", err)
	}
	if len(mods) == 0 {
		t.Fatalf("项目没有默认模块")
	}
	return mods[0]
}

// firstEnvironment 返回项目的第一个环境
func firstEnvironment(t *testing.T, db *gorm.DB, projectID string) models.Environment {
	t.Helper()
	envs, err := NewEnvironmentService(db).ListEnvironments(projectID)
	if err != nil {
		t.Fatalf("获取环境列表失败: %v", err)
	}
	if len(envs) == 0 {
		t.Fatalf("项目没有默认环境")
	}
	return envs[0]
}
