package models

import (
	"encoding/json"
	"testing"
	"time"
)

func TestToJSONAndFromJSON(t *testing.T) {
	original := BasicAuthData{Username: "u", Password: "p"}
	encoded := ToJSON(original)

	var decoded BasicAuthData
	if err := FromJSON(encoded, &decoded); err != nil {
		t.Fatalf("FromJSON err=%v", err)
	}
	if decoded != original {
		t.Errorf("往返后不一致：%+v vs %+v", decoded, original)
	}
}

func TestFromJSONRejectsInvalid(t *testing.T) {
	var decoded BasicAuthData
	if err := FromJSON("{oops", &decoded); err == nil {
		t.Errorf("非法 JSON 应报错")
	}
}

func TestToJSONOfUnserializable(t *testing.T) {
	// 通道无法序列化：应返回空串而不是 panic
	if got := ToJSON(make(chan int)); got != "" {
		t.Errorf("不可序列化的值应返回空串，实际 %q", got)
	}
}

func TestNormalizeScopeProxySettings(t *testing.T) {
	settings := ScopeProxySettings{
		ActiveID: "missing",
		Proxies: []ProxyConfig{
			{ID: ProxyBuiltinSystemID, Name: "重复的系统代理"},
			{ID: "", Name: "无 ID"},
			{ID: "custom-1", Name: "自建", Mode: "whatever"},
		},
	}
	NormalizeScopeProxySettings(&settings, true)

	// 内置条目应被重建并置顶，重复项与无 ID 项被丢弃
	if len(settings.Proxies) != 3 {
		t.Fatalf("条目数=%d：%+v", len(settings.Proxies), settings.Proxies)
	}
	if settings.Proxies[0].ID != ProxyBuiltinSystemID || settings.Proxies[1].ID != ProxyBuiltinNoneID {
		t.Errorf("内置条目应置顶：%+v", settings.Proxies)
	}
	// 用户条目一律按自定义模式处理
	if settings.Proxies[2].Mode != string(ProxyModeCustom) {
		t.Errorf("用户条目模式=%q", settings.Proxies[2].Mode)
	}
	// ActiveID 指向不存在的条目时回退到系统代理
	if settings.ActiveID != ProxyBuiltinSystemID {
		t.Errorf("ActiveID=%q", settings.ActiveID)
	}
}

func TestNormalizeScopeProxySettingsGlobalIgnoresFollowGlobal(t *testing.T) {
	settings := ScopeProxySettings{FollowGlobal: true}
	NormalizeScopeProxySettings(&settings, false)
	if settings.FollowGlobal {
		t.Errorf("全局作用域不应保留 followGlobal")
	}
}

func TestFindProxy(t *testing.T) {
	list := BuiltinProxies()
	if cfg, ok := FindProxy(list, ProxyBuiltinNoneID); !ok || cfg.Mode != string(ProxyModeNone) {
		t.Errorf("应找到内置的「不使用代理」：%+v %v", cfg, ok)
	}
	if _, ok := FindProxy(list, "nope"); ok {
		t.Errorf("不存在的 ID 不应命中")
	}
}

func TestNormalizeScopeTLSSettings(t *testing.T) {
	settings := ScopeTLSSettings{MinVersion: "1.9"}
	NormalizeScopeTLSSettings(&settings, true)
	if settings.MinVersion != string(TLSVersionDefault) {
		t.Errorf("非法版本应回退到默认，实际 %q", settings.MinVersion)
	}

	valid := ScopeTLSSettings{MinVersion: string(TLSVersion13), FollowGlobal: true}
	NormalizeScopeTLSSettings(&valid, false)
	if valid.MinVersion != string(TLSVersion13) {
		t.Errorf("合法版本应保留，实际 %q", valid.MinVersion)
	}
	if valid.FollowGlobal {
		t.Errorf("全局作用域不应保留 followGlobal")
	}
}

func TestStoredCookieExpired(t *testing.T) {
	now := time.Now()
	past := now.Add(-time.Hour)
	future := now.Add(time.Hour)

	if (&StoredCookie{}).Expired(now) {
		t.Errorf("会话 cookie（无过期时间）不应按时间过期")
	}
	if !(&StoredCookie{Expires: &past}).Expired(now) {
		t.Errorf("过期时间在过去应判定为过期")
	}
	if (&StoredCookie{Expires: &future}).Expired(now) {
		t.Errorf("过期时间在将来不应判定为过期")
	}
	var zero time.Time
	if (&StoredCookie{Expires: &zero}).Expired(now) {
		t.Errorf("零值过期时间应等同于会话 cookie")
	}
}

func TestStoredCookieTableName(t *testing.T) {
	// 表名被命名 Cookie Jar 迁移硬编码，不能被 GORM 的复数化推断带偏
	var cookie StoredCookie
	if cookie.TableName() != "cookie_jar_cookies" {
		t.Errorf("表名=%q", cookie.TableName())
	}
}

func TestDefaultSettingsAreSerializable(t *testing.T) {
	for _, value := range []any{DefaultRequestSettings, DefaultHistorySettings} {
		if _, err := json.Marshal(value); err != nil {
			t.Errorf("默认设置应可序列化：%v", err)
		}
	}
	if !DefaultHistorySettings.MaskSensitive {
		t.Errorf("历史脱敏必须默认开启")
	}
	if DefaultRequestSettings.MaxResponseBytes <= 0 {
		t.Errorf("响应体上限应有一个正的默认值")
	}
}

func TestBuiltinProxiesAreStable(t *testing.T) {
	first := BuiltinProxies()
	second := BuiltinProxies()
	if len(first) != 2 || len(second) != 2 {
		t.Fatalf("内置代理应恰有两项")
	}
	// 返回的必须是独立切片，调用方修改不应影响下一次
	first[0].Name = "changed"
	if second[0].Name == "changed" {
		t.Errorf("BuiltinProxies 不应共享底层数组")
	}
}
