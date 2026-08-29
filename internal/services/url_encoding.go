package services

import (
	"maps"
	"net/url"
	"slices"
	"strings"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// URL 自动编码：把接口路径与查询参数里的中文等特殊字符转成百分号编码。
//
// 档位沿「接口 → 项目 → 全局」三层解析，每层都可以选 inherit 交给上一层，
// 与代理 / TLS 的层级模型一致。三个档位的差别只在「哪些字符要转义」：
//
//	                        rfc3986  whatwg  off
//	非 ASCII、控制字符          转义     转义   转义(控制字符)/原样(非 ASCII)
//	空格                       转义     转义    转义
//	< > " ` { } | \ ^ '        转义     原样    原样
//	其它 ASCII 保留字符         转义     转义    原样
//
// rfc3986 是默认档位，其转义结果与 net/url 的标准转义逐字节相同——
// 也就是本功能上线前的行为，老项目升级后发出的 URL 不会有任何变化。

// urlEncodingKeepExtra 是 whatwg 档位相对 rfc3986 额外放行（不转义）的字符。
// 取自 Apifox 对两个档位差异的说明。其中没有空格：裸空格会把 HTTP 请求行拆断，
// 任何档位都必须转义它。
const urlEncodingKeepExtra = "<>\"`{}|\\^'"

const upperHex = "0123456789ABCDEF"

// shouldEscapePathByte 判断路径里的某个字节是否需要转义。
// 只有 whatwg / off 档位会走到这里：rfc3986 档位的路径直接沿用标准库的转义结果。
func shouldEscapePathByte(c byte, mode models.URLEncodingMode) bool {
	if mode == models.URLEncodingOff {
		// 关闭编码也得守住底线：这些字符留着会让请求行不合法或把 URL 拆错。
		// 落单的 % 也要转义——成对的 %XX 在调用方就已原样放行了。
		return c == ' ' || c == '?' || c == '#' || c == '%' || c < 0x20 || c == 0x7f
	}
	switch {
	case 'a' <= c && c <= 'z', 'A' <= c && c <= 'Z', '0' <= c && c <= '9':
		return false
	}
	switch c {
	case '-', '_', '.', '~': // 未保留字符
		return false
	case '$', '&', '+', ',', '/', ':', ';', '=', '@': // 路径里合法的保留字符
		return false
	case '!', '\'', '(', ')', '*': // 子分隔符，net/url 也会原样保留
		return false
	}
	if mode == models.URLEncodingWHATWG && strings.IndexByte(urlEncodingKeepExtra, c) >= 0 {
		return false
	}
	return true
}

// shouldEscapeQueryByte 判断查询串的键或值里的某个字节是否需要转义。
//
// rfc3986 档位的放行集合与标准库 url.QueryEscape 一致（只放行字母数字与 -_.~）。
func shouldEscapeQueryByte(c byte, mode models.URLEncodingMode) bool {
	if mode == models.URLEncodingOff {
		// 关闭编码时仍要转义会改变查询串结构的字符：& = # 会把参数拆错，
		// + 会被服务端解回空格。% 故意放行，好让手写的 %XX 原样发出去。
		return c == ' ' || c == '&' || c == '=' || c == '#' || c == '+' || c < 0x20 || c == 0x7f
	}
	switch {
	case 'a' <= c && c <= 'z', 'A' <= c && c <= 'Z', '0' <= c && c <= '9':
		return false
	}
	switch c {
	case '-', '_', '.', '~':
		return false
	}
	if mode == models.URLEncodingWHATWG && strings.IndexByte(urlEncodingKeepExtra, c) >= 0 {
		return false
	}
	return true
}

// escapeURLPath 按档位转义路径。
//
// 已经写成 %XX 的部分原样保留，不做二次编码：手写 %E4%B8%AD 的人要的就是这串字节，
// 再编一次会变成 %25E4...，任何档位下都是错的。
func escapeURLPath(s string, mode models.URLEncodingMode) string {
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		if c := s[i]; c == '%' && i+2 < len(s) && isHex(s[i+1]) && isHex(s[i+2]) {
			b.WriteString(s[i : i+3])
			i += 2
			continue
		}
		writeURLByte(&b, s[i], shouldEscapePathByte(s[i], mode))
	}
	return b.String()
}

// escapeQueryComponent 按档位转义查询串里的一个键或值。
//
// 空格在两个编码档位下写成 +（沿用标准库 url.QueryEscape 与表单惯例），
// 关闭编码时写成 %20——那时用户要的是「字节不被改写」，+ 会被服务端解回空格，
// %20 才是那个空格本身。
func escapeQueryComponent(s string, mode models.URLEncodingMode) string {
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == ' ' && mode != models.URLEncodingOff {
			b.WriteByte('+')
			continue
		}
		writeURLByte(&b, c, shouldEscapeQueryByte(c, mode))
	}
	return b.String()
}

// writeURLByte 写入一个字节：需要转义时写成 %XX。
func writeURLByte(b *strings.Builder, c byte, escape bool) {
	if !escape {
		b.WriteByte(c)
		return
	}
	b.WriteByte('%')
	b.WriteByte(upperHex[c>>4])
	b.WriteByte(upperHex[c&0x0f])
}

func isHex(c byte) bool {
	return '0' <= c && c <= '9' || 'a' <= c && c <= 'f' || 'A' <= c && c <= 'F'
}

// encodeQueryValues 按档位把查询参数拼成查询串。
//
// 键序与 url.Values.Encode 一样按键名排序：同一个请求每次导出的 URL 都一样，
// 便于 diff，也让请求历史里的 URL 稳定。
func encodeQueryValues(v url.Values, mode models.URLEncodingMode) string {
	if len(v) == 0 {
		return ""
	}
	var b strings.Builder
	for _, key := range slices.Sorted(maps.Keys(v)) {
		escapedKey := escapeQueryComponent(key, mode)
		for _, value := range v[key] {
			if b.Len() > 0 {
				b.WriteByte('&')
			}
			b.WriteString(escapedKey)
			b.WriteByte('=')
			b.WriteString(escapeQueryComponent(value, mode))
		}
	}
	return b.String()
}

// applyURLEncoding 按档位重写 URL 的路径与查询串，返回可直接用于发送的 URL。
//
// 查询串走 RawQuery——标准库对它一个字节都不碰，怎么写就怎么发。
// 路径没这么好办：URL.Path/RawPath 会被 EscapedPath() 按标准规则重新转义，
// whatwg / off 档位想少转义几个字符是塞不进去的，只能挂到 Opaque 上——
// 那是标准库里唯一能原样发出自定义请求路径的口子（见 URL.RequestURI）。
// 因此只有「档位要求的结果确实和标准转义不同」时才动 Opaque，rfc3986 档位永远不会走到。
func applyURLEncoding(u *url.URL, query url.Values, mode models.URLEncodingMode) {
	u.RawQuery = encodeQueryValues(query, mode)
	if mode == models.URLEncodingRFC3986 {
		// 默认档位的路径原样交给标准库：它对「原文已经合法」的路径是逐字节保留、
		// 否则整段严格转义，这套两段式行为很难用一张字符表复刻，也没必要——
		// 它就是本功能上线前的行为。
		return
	}
	if escaped := escapeURLPath(rawURLPath(u), mode); escaped != u.EscapedPath() {
		u.Opaque = escaped
	}
}

// rawURLPath 取「用户写下的那串路径」，用于按档位重新转义。
//
// url.Parse 只在「标准转义结果与原文不同」时才把原文留在 RawPath 里，
// 所以原文写的是裸中文就拿 RawPath，写的已经是 %E4%B8%AD 则 RawPath 为空、
// 从 EscapedPath() 拿回同一串编码——两种写法都能各自原样保住。
func rawURLPath(u *url.URL) string {
	if u.RawPath != "" {
		return u.RawPath
	}
	return u.EscapedPath()
}

// urlWithHost 返回带主机的完整 URL 文本。
//
// 自定义转义时路径挂在 Opaque 上，此时 url.URL.String() 会把主机整段丢掉
// （它认为 opaque URL 没有 authority），展示与导出 cURL 都得用这里拼出来的。
func urlWithHost(u *url.URL) string {
	if u.Opaque == "" {
		return u.String()
	}
	var b strings.Builder
	b.WriteString(u.Scheme)
	b.WriteString("://")
	if u.User != nil {
		b.WriteString(u.User.String())
		b.WriteByte('@')
	}
	b.WriteString(u.Host)
	b.WriteString(u.Opaque)
	if u.RawQuery != "" {
		b.WriteByte('?')
		b.WriteString(u.RawQuery)
	}
	if u.Fragment != "" {
		b.WriteByte('#')
		b.WriteString(u.EscapedFragment())
	}
	return b.String()
}

// ---- 档位解析（接口 → 项目 → 全局）----

// resolveURLEncoding 解析一次请求最终生效的 URL 自动编码档位。
// endpointMode 为接口上存的档位（空或 inherit 表示跟随项目）。
func resolveURLEncoding(db *gorm.DB, moduleID, endpointMode string) models.URLEncodingMode {
	if mode := models.NormalizeURLEncoding(endpointMode); mode != models.URLEncodingInherit {
		return mode
	}
	if db == nil {
		return models.DefaultURLEncoding
	}
	if projectID := projectIDFromModule(db, moduleID); projectID != "" {
		if mode := getProjectURLEncoding(db, projectID); mode != models.URLEncodingInherit {
			return mode
		}
	}
	return models.NormalizeGlobalURLEncoding(getRequestSettings(db).URLEncoding)
}

// endpointURLEncoding 取接口这一层的档位：优先用本次请求带上来的（未保存的编辑态也算数），
// 请求没带就回落到已保存端点上的设置。
func endpointURLEncoding(data SendRequestData, saved *models.Endpoint) string {
	if strings.TrimSpace(data.URLEncoding) != "" {
		return data.URLEncoding
	}
	if saved != nil {
		return saved.URLEncoding
	}
	return ""
}

// savedEndpointURLEncoding 读取已保存端点上的档位，供没有把端点读进内存的调用方
// （比如导出 cURL）使用。端点不存在或未设置时返回空串。
func savedEndpointURLEncoding(db *gorm.DB, endpointID string) string {
	if db == nil || endpointID == "" {
		return ""
	}
	var ep models.Endpoint
	if err := db.Select("url_encoding").Where("id = ?", endpointID).First(&ep).Error; err != nil {
		return ""
	}
	return ep.URLEncoding
}

// getProjectURLEncoding 读取项目级档位；项目不存在或未设置时返回 inherit。
func getProjectURLEncoding(db *gorm.DB, projectID string) models.URLEncodingMode {
	if projectID == "" {
		return models.URLEncodingInherit
	}
	var proj models.Project
	if err := db.Select("url_encoding").Where("id = ?", projectID).First(&proj).Error; err != nil {
		return models.URLEncodingInherit
	}
	return models.NormalizeURLEncoding(proj.URLEncoding)
}
