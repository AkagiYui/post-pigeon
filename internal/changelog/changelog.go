// Package changelog 解析 Keep a Changelog 格式的 CHANGELOG.md，并按语义化版本
// 区间筛选版本小节。
//
// 更新提示需要回答的是「从我这个版本到最新版本之间发生了什么」，而 Wails 的
// updater 只会带回最新一条 release 的说明。CHANGELOG.md 天然按版本分节，正好
// 是这个问题需要的形状：解析成结构化数据后，既能喂给更新弹窗做跨版本聚合，
// 也能给「关于 → 更新日志」直接渲染，不必在前端引入 Markdown 渲染器。
package changelog

import (
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// Entry 是变更日志里的一个版本小节。
type Entry struct {
	// Version 版本号，已去掉 v 前缀；「未发布」等非语义化版本原样保留。
	Version string `json:"version"`
	// Date 发布日期，形如 "2026-08-26"；未标注时为空。
	Date string `json:"date"`
	// Sections 该版本下的分类小节，按原文顺序排列。
	Sections []Section `json:"sections"`
}

// Section 是版本小节下的一个分类（「新增」「修复」…）。
type Section struct {
	// Title 分类标题；条目直接挂在版本下（没有 ### 标题）时为空。
	Title string `json:"title"`
	// Items 该分类下的条目，续行已合并进同一条。
	Items []string `json:"items"`
}

var (
	// ## [1.2.0] - 2026-08-26 / ## 1.2.0 / ## [未发布]
	headingRe = regexp.MustCompile(`^##\s+(.+?)\s*$`)
	versionRe = regexp.MustCompile(`^\[?([^\]\s]+)\]?(?:\s*[-–—]\s*(\S+))?`)
	sectionRe = regexp.MustCompile(`^###\s+(.+?)\s*$`)
	bulletRe  = regexp.MustCompile(`^[-*]\s+(.+)$`)
	// 文末的链接引用定义（[1.2.0]: https://...），不是条目
	linkDefRe = regexp.MustCompile(`^\[[^\]]+\]:\s`)
)

// Parse 解析 Markdown 文本，返回其中的版本小节，顺序与原文一致。
// 第一个 `## ` 标题之前的内容（前言、格式说明等）全部忽略。
func Parse(md string) []Entry {
	var (
		entries []Entry
		cur     *Entry
		sec     *Section
		inItem  bool
	)

	// 条目落到当前分类；还没有 ### 标题时补一个无标题分类。
	appendItem := func(text string) {
		if cur == nil {
			return
		}
		if sec == nil {
			cur.Sections = append(cur.Sections, Section{})
			sec = &cur.Sections[len(cur.Sections)-1]
		}
		sec.Items = append(sec.Items, text)
	}

	for _, raw := range strings.Split(md, "\n") {
		line := strings.TrimRight(raw, " \t\r")

		if strings.TrimSpace(line) == "" {
			// 空行结束续行：Keep a Changelog 的多行条目是紧邻的缩进行
			inItem = false
			continue
		}

		if m := headingRe.FindStringSubmatch(line); m != nil {
			version, date := splitHeading(m[1])
			entries = append(entries, Entry{Version: version, Date: date})
			cur = &entries[len(entries)-1]
			sec = nil
			inItem = false
			continue
		}

		if cur == nil {
			continue
		}

		if m := sectionRe.FindStringSubmatch(line); m != nil {
			cur.Sections = append(cur.Sections, Section{Title: m[1]})
			sec = &cur.Sections[len(cur.Sections)-1]
			inItem = false
			continue
		}

		if linkDefRe.MatchString(line) {
			inItem = false
			continue
		}

		if m := bulletRe.FindStringSubmatch(strings.TrimLeft(line, " \t")); m != nil {
			// 顶格的是新条目；缩进的嵌套列表并进上一条，避免层级信息丢失后
			// 变成一堆没有上下文的碎句
			if isIndented(line) && inItem && sec != nil && len(sec.Items) > 0 {
				sec.Items[len(sec.Items)-1] += " " + strings.TrimSpace(m[1])
				continue
			}
			appendItem(strings.TrimSpace(m[1]))
			inItem = true
			continue
		}

		// 缩进续行：并入上一条
		if isIndented(line) && inItem && sec != nil && len(sec.Items) > 0 {
			sec.Items[len(sec.Items)-1] += " " + strings.TrimSpace(line)
			continue
		}

		inItem = false
	}

	return entries
}

// splitHeading 从 `## ` 后面的文本里拆出版本号与日期。
func splitHeading(text string) (version, date string) {
	m := versionRe.FindStringSubmatch(strings.TrimSpace(text))
	if m == nil {
		return strings.TrimSpace(text), ""
	}
	return Normalize(m[1]), m[2]
}

func isIndented(line string) bool {
	return len(line) > 0 && (line[0] == ' ' || line[0] == '\t')
}

// Between 返回版本号落在 (from, to] 区间内的条目，按版本从新到旧排序。
// from 为空表示不设下界，to 为空表示不设上界。版本号不是合法语义化版本的小节
// （「未发布」等）永远不会进入结果。
func Between(entries []Entry, from, to string) []Entry {
	lower, hasLower := parse(from), Valid(from)
	upper, hasUpper := parse(to), Valid(to)

	var out []Entry
	for _, e := range entries {
		v := parse(e.Version)
		if !v.ok {
			continue
		}
		if hasLower && compare(v, lower) <= 0 {
			continue
		}
		if hasUpper && compare(v, upper) > 0 {
			continue
		}
		out = append(out, e)
	}

	sort.SliceStable(out, func(i, j int) bool {
		return Compare(out[i].Version, out[j].Version) > 0
	})
	return out
}

// Releases 返回所有版本号合法的小节，按版本从新到旧排序（滤掉「未发布」）。
func Releases(entries []Entry) []Entry {
	return Between(entries, "", "")
}

// Find 返回指定版本的小节，找不到时返回 nil。
func Find(entries []Entry, version string) *Entry {
	want := Normalize(version)
	for i := range entries {
		if entries[i].Version == want {
			return &entries[i]
		}
	}
	return nil
}

// Normalize 去掉版本号的首尾空白与 v 前缀。
func Normalize(v string) string {
	v = strings.TrimSpace(v)
	if len(v) > 1 && (v[0] == 'v' || v[0] == 'V') {
		v = v[1:]
	}
	return v
}

// Valid 报告 v 是否是可解析的语义化版本。
func Valid(v string) bool { return parse(v).ok }

// IsNewer 报告 a 是否比 b 新；任一无法解析时返回 false。
func IsNewer(a, b string) bool {
	va, vb := parse(a), parse(b)
	if !va.ok || !vb.ok {
		return false
	}
	return compare(va, vb) > 0
}

// Compare 按语义化版本 2.0.0 的优先级比较 a 与 b，返回 -1 / 0 / 1。
// 无法解析的版本排在所有可解析版本之前，两者都无法解析时按字典序比较。
func Compare(a, b string) int {
	va, vb := parse(a), parse(b)
	switch {
	case va.ok && !vb.ok:
		return 1
	case !va.ok && vb.ok:
		return -1
	case !va.ok && !vb.ok:
		return strings.Compare(Normalize(a), Normalize(b))
	}
	return compare(va, vb)
}

// version 是解析后的语义化版本。构建元数据（+ 之后的部分）不参与优先级比较，
// 解析时直接丢弃。
type version struct {
	nums [3]int
	pre  []string
	ok   bool
}

func parse(s string) version {
	s = Normalize(s)
	if s == "" {
		return version{}
	}
	if i := strings.IndexByte(s, '+'); i >= 0 {
		s = s[:i]
	}
	var pre []string
	if i := strings.IndexByte(s, '-'); i >= 0 {
		pre = strings.Split(s[i+1:], ".")
		s = s[:i]
		for _, p := range pre {
			if p == "" {
				return version{}
			}
		}
	}

	parts := strings.Split(s, ".")
	if len(parts) > 3 {
		return version{}
	}
	var v version
	for i, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil || n < 0 {
			return version{}
		}
		v.nums[i] = n
	}
	v.pre = pre
	v.ok = true
	return v
}

func compare(a, b version) int {
	for i := range a.nums {
		if a.nums[i] != b.nums[i] {
			return sign(a.nums[i] - b.nums[i])
		}
	}
	return comparePre(a.pre, b.pre)
}

// comparePre 比较预发布标识符：带预发布标识的版本优先级低于正式版本。
func comparePre(a, b []string) int {
	switch {
	case len(a) == 0 && len(b) == 0:
		return 0
	case len(a) == 0:
		return 1
	case len(b) == 0:
		return -1
	}

	for i := 0; i < len(a) && i < len(b); i++ {
		na, errA := strconv.Atoi(a[i])
		nb, errB := strconv.Atoi(b[i])
		switch {
		case errA == nil && errB == nil:
			if na != nb {
				return sign(na - nb)
			}
		case errA == nil:
			// 纯数字标识符的优先级低于含字母的标识符
			return -1
		case errB == nil:
			return 1
		default:
			if c := strings.Compare(a[i], b[i]); c != 0 {
				return c
			}
		}
	}
	return sign(len(a) - len(b))
}

func sign(n int) int {
	switch {
	case n > 0:
		return 1
	case n < 0:
		return -1
	default:
		return 0
	}
}
