package services

import (
	"net/http"
	"net/http/httptest"
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
