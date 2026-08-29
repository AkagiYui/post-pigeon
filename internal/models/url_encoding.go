package models

import "strings"

// URL 自动编码：对接口路径与查询参数里的中文等特殊字符自动做百分号编码。
//
// 层级与代理 / TLS 一致，只是这里三层都只选一个档位，没有额外的配置材料：
// 接口(inherit) → 项目(inherit) → 全局。哪一层选了具体档位，就从那一层生效。
//
// 三个档位抄自 Apifox 的同名设置（isDefaultUrlEncoding）：
//   - rfc3986：编码得最狠，除「字母数字 - _ . ~」与路径里合法的保留字符外一律转义。
//     这是默认档位，行为与本功能上线前逐字节相同。
//   - whatwg：在 rfc3986 的基础上放过 < > " ` { } | \ ^ ' 这几个字符——
//     它们在浏览器地址栏里也是原样发出去的，有些服务端的签名算法依赖这一点。
//   - off：不编码，中文与手写的 %XX 都原样发出。只有「留着就会让请求本身不合法、
//     或者会把 URL 拆错」的字符仍然转义（空格、控制字符、路径里的 ? #、
//     查询串里的 & = + #），否则请求根本发不出去。
type URLEncodingMode string

const (
	// URLEncodingInherit 跟随上一层（接口 → 项目 → 全局）。全局层不接受该值。
	URLEncodingInherit URLEncodingMode = "inherit"
	// URLEncodingRFC3986 遵循 RFC 3986。
	URLEncodingRFC3986 URLEncodingMode = "rfc3986"
	// URLEncodingWHATWG 遵循 WHATWG。
	URLEncodingWHATWG URLEncodingMode = "whatwg"
	// URLEncodingOff 关闭自动编码。
	URLEncodingOff URLEncodingMode = "off"
)

// DefaultURLEncoding 全局层未设置时使用的档位。
const DefaultURLEncoding = URLEncodingRFC3986

// NormalizeURLEncoding 规整某一层存下来的档位取值：
// 空串与不认识的值（比如降级回旧版本前由新版写入的档位）都按 inherit 处理。
func NormalizeURLEncoding(v string) URLEncodingMode {
	switch URLEncodingMode(strings.TrimSpace(v)) {
	case URLEncodingRFC3986:
		return URLEncodingRFC3986
	case URLEncodingWHATWG:
		return URLEncodingWHATWG
	case URLEncodingOff:
		return URLEncodingOff
	default:
		return URLEncodingInherit
	}
}

// NormalizeGlobalURLEncoding 规整全局层的档位：全局没有上一层可继承，
// inherit 与非法值一律收敛到默认档位。
func NormalizeGlobalURLEncoding(v string) URLEncodingMode {
	if mode := NormalizeURLEncoding(v); mode != URLEncodingInherit {
		return mode
	}
	return DefaultURLEncoding
}
