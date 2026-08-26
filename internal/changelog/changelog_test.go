package changelog_test

import (
	"os"
	"testing"

	"PostPigeon/internal/changelog"
)

const sample = `# 变更日志

本文件记录值得使用者关注的变更。

## [未发布]

### 新增

- 还没发布的东西

## [1.2.0] - 2026-08-26

### 新增

- **集合运行器**：批量运行接口，支持多轮、请求间隔，
  实时进度与断言汇总
- cURL 双向互转

### 修复

- 连接现在可跨请求复用

## [1.1.0] - 2026-07-01

### 变更

- 错误改为结构化形式

## [1.0.0] - 2026-06-01

- 首个正式版本

[1.2.0]: https://example.com/compare/v1.1.0...v1.2.0
`

func TestParseStructure(t *testing.T) {
	entries := changelog.Parse(sample)
	if len(entries) != 4 {
		t.Fatalf("版本小节数 = %d，期望 4：%+v", len(entries), entries)
	}

	if entries[0].Version != "未发布" {
		t.Errorf("第一个小节版本 = %q，期望「未发布」", entries[0].Version)
	}

	v120 := entries[1]
	if v120.Version != "1.2.0" || v120.Date != "2026-08-26" {
		t.Errorf("1.2.0 小节解析错误：version=%q date=%q", v120.Version, v120.Date)
	}
	if len(v120.Sections) != 2 {
		t.Fatalf("1.2.0 分类数 = %d，期望 2", len(v120.Sections))
	}
	if v120.Sections[0].Title != "新增" || len(v120.Sections[0].Items) != 2 {
		t.Errorf("新增分类解析错误：%+v", v120.Sections[0])
	}
	// 续行应并入同一条，而不是拆成两条
	want := "**集合运行器**：批量运行接口，支持多轮、请求间隔， 实时进度与断言汇总"
	if got := v120.Sections[0].Items[0]; got != want {
		t.Errorf("续行未合并：\n got=%q\nwant=%q", got, want)
	}
}

func TestParseItemsWithoutSection(t *testing.T) {
	entries := changelog.Parse(sample)
	v100 := changelog.Find(entries, "1.0.0")
	if v100 == nil {
		t.Fatal("未找到 1.0.0")
	}
	if len(v100.Sections) != 1 || v100.Sections[0].Title != "" {
		t.Fatalf("没有 ### 标题时应落到无标题分类：%+v", v100.Sections)
	}
	if len(v100.Sections[0].Items) != 1 {
		t.Errorf("条目数 = %d，期望 1", len(v100.Sections[0].Items))
	}
}

func TestBetweenIsHalfOpen(t *testing.T) {
	entries := changelog.Parse(sample)

	// (1.0.0, 1.2.0]：包含 1.1.0 与 1.2.0，不含用户已在运行的 1.0.0
	got := changelog.Between(entries, "1.0.0", "1.2.0")
	if len(got) != 2 {
		t.Fatalf("区间条目数 = %d，期望 2：%+v", len(got), got)
	}
	if got[0].Version != "1.2.0" || got[1].Version != "1.1.0" {
		t.Errorf("应按版本从新到旧排序，实际 %q, %q", got[0].Version, got[1].Version)
	}
}

func TestBetweenExcludesUnreleased(t *testing.T) {
	entries := changelog.Parse(sample)
	for _, e := range changelog.Between(entries, "", "") {
		if !changelog.Valid(e.Version) {
			t.Errorf("「未发布」不应出现在结果里：%q", e.Version)
		}
	}
}

// 定版后的形态：一个空的「未发布」压在最新正式版上面。这是
// scripts/prepare_release.py 的产物，解析器与筛选都必须能正常处理。
func TestParseEmptyUnreleased(t *testing.T) {
	const md = `# 变更日志

## [未发布]

## [1.2.0] - 2026-08-26

### 修复

- 修了个 bug
`
	entries := changelog.Parse(md)
	if len(entries) != 2 {
		t.Fatalf("版本小节数 = %d，期望 2：%+v", len(entries), entries)
	}
	if entries[0].Version != "未发布" || len(entries[0].Sections) != 0 {
		t.Errorf("空的「未发布」应解析为零条目的小节：%+v", entries[0])
	}
	// 空的「未发布」不该影响正式版本的筛选
	released := changelog.Releases(entries)
	if len(released) != 1 || released[0].Version != "1.2.0" {
		t.Errorf("Releases 应只返回 1.2.0，实际 %+v", released)
	}
	if len(released[0].Sections) != 1 {
		t.Errorf("1.2.0 的条目丢失：%+v", released[0])
	}
}

func TestBetweenOpenBounds(t *testing.T) {
	entries := changelog.Parse(sample)
	if got := changelog.Between(entries, "1.1.0", ""); len(got) != 1 || got[0].Version != "1.2.0" {
		t.Errorf("无上界时应返回全部更新版本，实际 %+v", got)
	}
	if got := changelog.Releases(entries); len(got) != 3 {
		t.Errorf("Releases 应返回 3 个正式版本，实际 %d", len(got))
	}
}

func TestCompare(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"1.2.0", "1.1.9", 1},
		{"1.2.0", "1.2.0", 0},
		{"v1.2.0", "1.2.0", 0},
		{"1.2.0", "1.10.0", -1},
		{"2.0.0", "10.0.0", -1},
		{"1.2", "1.2.0", 0},
		// 预发布版本优先级低于同版本号的正式版
		{"1.2.0-beta.1", "1.2.0", -1},
		{"1.2.0-beta.2", "1.2.0-beta.1", 1},
		{"1.2.0-beta.10", "1.2.0-beta.2", 1},
		{"1.2.0-alpha", "1.2.0-beta", -1},
		{"1.2.0-beta", "1.2.0-beta.1", -1},
		// 构建元数据不参与优先级比较
		{"1.2.0+build.5", "1.2.0", 0},
		// 无法解析的版本排在可解析版本之前
		{"未发布", "1.0.0", -1},
		{"1.0.0", "未发布", 1},
	}
	for _, c := range cases {
		if got := changelog.Compare(c.a, c.b); got != c.want {
			t.Errorf("Compare(%q, %q) = %d，期望 %d", c.a, c.b, got, c.want)
		}
	}
}

func TestIsNewer(t *testing.T) {
	if !changelog.IsNewer("v1.2.0", "1.1.0") {
		t.Error("v1.2.0 应比 1.1.0 新")
	}
	if changelog.IsNewer("1.1.0", "1.1.0") {
		t.Error("同版本不算更新")
	}
	if changelog.IsNewer("未发布", "1.1.0") {
		t.Error("无法解析的版本不应判定为更新")
	}
}

func TestValid(t *testing.T) {
	for _, v := range []string{"1.0.0", "v1.0.0", "1.0", "1.0.0-beta.1", "1.0.0+meta"} {
		if !changelog.Valid(v) {
			t.Errorf("%q 应是合法版本", v)
		}
	}
	for _, v := range []string{"", "未发布", "Unreleased", "1.0.0.0", "1.x.0", "1.0.0-"} {
		if changelog.Valid(v) {
			t.Errorf("%q 不应是合法版本", v)
		}
	}
}

// 仓库自带的 CHANGELOG.md 必须能被解析出已发布的版本小节，否则更新弹窗会拿到
// 空内容。
//
// 只校验正式版本：scripts/prepare_release.py 定版后会新开一个空的「未发布」，
// 那是发版之后的正常状态，不该让测试挂掉。
func TestParseRepositoryChangelog(t *testing.T) {
	md, err := os.ReadFile("../../CHANGELOG.md")
	if err != nil {
		t.Skipf("读取 CHANGELOG.md 失败：%v", err)
	}
	entries := changelog.Parse(string(md))
	if len(entries) == 0 {
		t.Fatal("仓库 CHANGELOG.md 未解析出任何版本小节")
	}

	released := changelog.Releases(entries)
	if len(released) == 0 {
		t.Fatal("仓库 CHANGELOG.md 里没有任何已发布的版本小节")
	}
	for _, e := range released {
		if len(e.Sections) == 0 {
			t.Errorf("版本 %q 没有解析出任何条目", e.Version)
		}
	}
}
