package services

import (
	"encoding/json"
	"strings"

	"github.com/tailscale/hujson"
)

// JSONC（社区里也叫 JWCC：JSON With Commas and Comments）兼容：允许在 JSON 请求体里写
// 行注释 `//`、块注释 `/* */` 与尾随逗号，发送与导出 cURL 之前再把它们去掉。
//
// 两条设计约束：
//
//  1. **只做文本删除，不做「解析后重新序列化」**。后者会把 9007199254740993 这类超出
//     float64 精度的整数改掉、把对象的键重新排序、把字符串转义规范化——对一个 API 调试
//     工具来说，发出去的字节必须是用户写的那些。hujson 的 Standardize 是原地把注释与
//     尾逗号替换成等长空格，其余字节一个不动。
//
//  2. **只在「原文不是合法 JSON、且改写结果是合法 JSON」时才替换**，其余一律回退原文。
//     这条守卫让开关可以默认打开：它只可能把本来发不出去的请求体变成发得出去的，
//     不可能改变一个本来就正确的请求。

// normalizeJSONC 把带注释、尾随逗号的 JSON 改写成严格 JSON；无法改写时原样返回。
func normalizeJSONC(raw string) string {
	if strings.TrimSpace(raw) == "" {
		return raw
	}
	if json.Valid([]byte(raw)) {
		return raw
	}
	value, err := hujson.Parse([]byte(raw))
	if err != nil {
		// 连 JSONC 都解析不了（例如 {{var}} 没解析出来、裸露在字符串之外）：
		// 原样发出去让服务端报错，而不是在这里猜用户想写什么
		return raw
	}
	value.Standardize()
	out := dropCommentLeftovers(raw, string(value.Pack()))
	if !json.Valid([]byte(out)) {
		return raw
	}
	return out
}

// normalizeJSONCIf 仅在开关打开时做 JSONC 规范化，便于调用点保持一行。
func normalizeJSONCIf(enabled bool, raw string) string {
	if !enabled {
		return raw
	}
	return normalizeJSONC(raw)
}

// dropCommentLeftovers 清理 Standardize 留下的空白。
//
// 注释被原地换成了等长空格，直接发出去虽然合法，但「实际请求」里会看到大片空白、
// Content-Length 也白白变大。因为替换是原地进行的，改写前后行数一定相同，于是可以逐行比对：
// 原本有内容、改写后只剩空白的整行（独占一行的注释）连同换行一起删掉，其余行只去掉行尾空白。
// 用户自己写的空行会被保留——那是他自己的排版。
func dropCommentLeftovers(before, after string) string {
	src := strings.Split(before, "\n")
	dst := strings.Split(after, "\n")
	if len(src) != len(dst) {
		return after // 行数对不上（理论上不会发生）：不美化，直接用改写结果
	}
	kept := make([]string, 0, len(dst))
	for i, line := range dst {
		if strings.TrimSpace(line) == "" && strings.TrimSpace(src[i]) != "" {
			continue
		}
		kept = append(kept, trimTrailingSpace(line))
	}
	return strings.Join(kept, "\n")
}

// trimTrailingSpace 去掉行尾空白，但保留 CRLF 的 \r，不改用户的换行风格。
func trimTrailingSpace(line string) string {
	hasCR := strings.HasSuffix(line, "\r")
	if hasCR {
		line = line[:len(line)-1]
	}
	line = strings.TrimRight(line, " \t")
	if hasCR {
		line += "\r"
	}
	return line
}
