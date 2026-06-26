package services

import (
	"net/http"
	"testing"
)

func TestCombineURL(t *testing.T) {
	cases := []struct{ base, path, want string }{
		{"http://x.com", "/api", "http://x.com/api"},
		{"http://x.com/", "/api", "http://x.com/api"},
		{"http://x.com/", "api", "http://x.com/api"},
		{"http://x.com", "api", "http://x.com/api"},
		{"", "/api", "/api"},
		{"http://x.com/base", "/a/b", "http://x.com/base/a/b"},
	}
	for _, c := range cases {
		if got := combineURL(c.base, c.path); got != c.want {
			t.Errorf("combineURL(%q,%q)=%q 期望 %q", c.base, c.path, got, c.want)
		}
	}
}

func TestReplaceAllFindIndex(t *testing.T) {
	if got := replaceAll("a{{x}}b{{x}}c", "{{x}}", "Y"); got != "aYbYc" {
		t.Errorf("replaceAll 多次替换 got %q", got)
	}
	if got := replaceAll("no placeholder", "{{x}}", "Y"); got != "no placeholder" {
		t.Errorf("replaceAll 无匹配 got %q", got)
	}
	if findIndex("hello", "ll") != 2 {
		t.Errorf("findIndex 期望 2")
	}
	if findIndex("hello", "z") != -1 {
		t.Errorf("findIndex 期望 -1")
	}
}

func TestFlattenHeaders(t *testing.T) {
	h := http.Header{"A": {"1", "2"}, "B": {"x"}}
	got := flattenHeaders(h)
	if got["A"] != "1, 2" || got["B"] != "x" {
		t.Errorf("flattenHeaders got %v", got)
	}
}

func TestSameSiteString(t *testing.T) {
	if sameSiteString(http.SameSiteLaxMode) != "Lax" {
		t.Error("期望 Lax")
	}
	if sameSiteString(http.SameSiteStrictMode) != "Strict" {
		t.Error("期望 Strict")
	}
	if sameSiteString(http.SameSiteNoneMode) != "None" {
		t.Error("期望 None")
	}
}

func TestNilOrNilString(t *testing.T) {
	if nilOrNilString("") != nil {
		t.Error("空字符串期望 nil")
	}
	if v := nilOrNilString("x"); v == nil || *v != "x" {
		t.Error("非空字符串期望指向 x")
	}
}
