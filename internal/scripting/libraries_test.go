package scripting

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

// TestLibrariesManifestParses 确认清单可解析且非空。
func TestLibrariesManifestParses(t *testing.T) {
	libs, err := Libraries()
	if err != nil {
		t.Fatalf("解析清单失败: %v", err)
	}
	if len(libs) == 0 {
		t.Fatal("清单为空")
	}
	for _, l := range libs {
		if l.Name == "" || l.Kind == "" {
			t.Errorf("库缺少必要字段: %+v", l)
		}
	}
}

// TestLibrariesIntegrity 重算每个 embed 库文件的 sha256 并与清单比对，
// 防止升级库文件时忘记同步 manifest.json（或反之）。
func TestLibrariesIntegrity(t *testing.T) {
	libs, err := Libraries()
	if err != nil {
		t.Fatalf("解析清单失败: %v", err)
	}
	for _, l := range libs {
		if l.Kind != "embed" {
			continue
		}
		if l.File == "" || l.SHA256 == "" {
			t.Errorf("embed 库 %q 必须有 file 与 sha256", l.Name)
			continue
		}
		b, err := libsFS.ReadFile("libs/" + l.File)
		if err != nil {
			t.Errorf("读取库文件 %s 失败: %v", l.File, err)
			continue
		}
		sum := hex.EncodeToString(sha256Sum(b))
		if sum != l.SHA256 {
			t.Errorf("%s 的 sha256 与清单不一致：\n  清单=%s\n  实际=%s\n更新库文件后请同步 manifest.json", l.File, l.SHA256, sum)
		}
	}
}

// TestLibrariesRequireable 确认清单中每个 require 类库都能被 require 加载。
func TestLibrariesRequireable(t *testing.T) {
	libs, err := Libraries()
	if err != nil {
		t.Fatalf("解析清单失败: %v", err)
	}
	e := New()
	for _, l := range libs {
		if l.Require == "" { // global 类无 require
			continue
		}
		script := "require('" + l.Require + "'); true;"
		res := e.Run(script, Options{Phase: PhasePreRequest, Stores: newTestStores(nil)})
		if res.Error != "" {
			t.Errorf("require('%s') 失败: %s", l.Require, res.Error)
		}
	}
}

func sha256Sum(b []byte) []byte {
	h := sha256.Sum256(b)
	return h[:]
}
