package services

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"PostPigeon/internal/apperr"
)

func TestFetchImportDocument(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/ok":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte("  {\"info\":{\"name\":\"demo\"}}\n"))
		case "/empty":
			_, _ = w.Write([]byte("   "))
		case "/big":
			_, _ = w.Write([]byte(strings.Repeat("x", maxImportDocumentBytes+10)))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	ie := NewImportExportService(newTestDB(t))

	t.Run("正常返回并去掉首尾空白", func(t *testing.T) {
		got, err := ie.FetchImportDocument(srv.URL + "/ok")
		if err != nil {
			t.Fatalf("err=%v", err)
		}
		if got != `{"info":{"name":"demo"}}` {
			t.Fatalf("内容不符: %q", got)
		}
	})

	t.Run("非 2xx 响应报错", func(t *testing.T) {
		if _, err := ie.FetchImportDocument(srv.URL + "/missing"); err == nil {
			t.Fatal("期望报错")
		} else if apperr.Code(err) != apperr.CodeImportFetch {
			t.Fatalf("错误码=%s", apperr.Code(err))
		}
	})

	t.Run("空响应报错", func(t *testing.T) {
		if _, err := ie.FetchImportDocument(srv.URL + "/empty"); err == nil {
			t.Fatal("期望报错")
		}
	})

	t.Run("超出大小上限报错", func(t *testing.T) {
		if _, err := ie.FetchImportDocument(srv.URL + "/big"); err == nil {
			t.Fatal("期望报错")
		} else if apperr.Code(err) != apperr.CodeResponseTooLarge {
			t.Fatalf("错误码=%s", apperr.Code(err))
		}
	})

	t.Run("非法地址报错", func(t *testing.T) {
		for _, raw := range []string{"", "   ", "file:///etc/hosts", "ftp://example.com/a.json"} {
			if _, err := ie.FetchImportDocument(raw); apperr.Code(err) != apperr.CodeInvalidURL {
				t.Fatalf("%q 错误码=%s", raw, apperr.Code(err))
			}
		}
	})
}

func TestReadImportDocument(t *testing.T) {
	dir := t.TempDir()
	write := func(name, content string) string {
		t.Helper()
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
			t.Fatalf("写测试文件失败: %v", err)
		}
		return path
	}

	ie := NewImportExportService(newTestDB(t))

	t.Run("正常读取并去掉首尾空白", func(t *testing.T) {
		got, err := ie.ReadImportDocument(write("ok.json", "  {\"info\":{\"name\":\"demo\"}}\n"))
		if err != nil {
			t.Fatalf("err=%v", err)
		}
		if got != `{"info":{"name":"demo"}}` {
			t.Fatalf("内容不符: %q", got)
		}
	})

	t.Run("空路径报错", func(t *testing.T) {
		if _, err := ie.ReadImportDocument("  "); err == nil {
			t.Fatal("期望报错")
		} else if apperr.Code(err) != apperr.CodeInvalidInput {
			t.Fatalf("错误码=%s", apperr.Code(err))
		}
	})

	t.Run("文件不存在报错", func(t *testing.T) {
		if _, err := ie.ReadImportDocument(filepath.Join(dir, "nope.json")); err == nil {
			t.Fatal("期望报错")
		} else if apperr.Code(err) != apperr.CodeNotFound {
			t.Fatalf("错误码=%s", apperr.Code(err))
		}
	})

	t.Run("目录报错", func(t *testing.T) {
		if _, err := ie.ReadImportDocument(dir); err == nil {
			t.Fatal("期望报错")
		} else if apperr.Code(err) != apperr.CodeInvalidInput {
			t.Fatalf("错误码=%s", apperr.Code(err))
		}
	})

	t.Run("空内容报错", func(t *testing.T) {
		if _, err := ie.ReadImportDocument(write("empty.json", "   \n")); err == nil {
			t.Fatal("期望报错")
		} else if apperr.Code(err) != apperr.CodeImportParse {
			t.Fatalf("错误码=%s", apperr.Code(err))
		}
	})

	t.Run("超过上限报错", func(t *testing.T) {
		big := write("big.json", strings.Repeat("x", maxImportDocumentBytes+10))
		if _, err := ie.ReadImportDocument(big); err == nil {
			t.Fatal("期望报错")
		} else if apperr.Code(err) != apperr.CodeResponseTooLarge {
			t.Fatalf("错误码=%s", apperr.Code(err))
		}
	})
}
