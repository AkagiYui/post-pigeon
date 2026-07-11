package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
)

// pngPixel 1x1 透明 PNG，用于测试图片响应预览。
var pngPixel = mustB64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII=")

func mustB64(s string) []byte {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		panic(err)
	}
	return b
}

// minimalPDF 一个包含正确 xref 偏移的最小可渲染 PDF，用于测试 PDF 响应预览。
var minimalPDF = buildMinimalPDF()

func buildMinimalPDF() []byte {
	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
		"<< /Length 58 >>\nstream\nBT /F1 24 Tf 30 90 Td (PostPigeon Test PDF) Tj ET\nendstream",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	}

	var buf bytes.Buffer
	buf.WriteString("%PDF-1.4\n")
	offsets := make([]int, len(objects)+1)
	for i, obj := range objects {
		offsets[i+1] = buf.Len()
		fmt.Fprintf(&buf, "%d 0 obj\n%s\nendobj\n", i+1, obj)
	}
	xrefPos := buf.Len()
	fmt.Fprintf(&buf, "xref\n0 %d\n", len(objects)+1)
	buf.WriteString("0000000000 65535 f \n")
	for i := 1; i <= len(objects); i++ {
		fmt.Fprintf(&buf, "%010d 00000 n \n", offsets[i])
	}
	fmt.Fprintf(&buf, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF", len(objects)+1, xrefPos)
	return buf.Bytes()
}

// indexHTML 首页，列出可用测试接口。
const indexHTML = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>PostPigeon 测试服务器</title>
<style>
body{font-family:system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 16px;color:#222;line-height:1.6}
h1{font-size:22px} h2{font-size:16px;margin-top:24px;border-bottom:1px solid #eee;padding-bottom:4px}
code{background:#f4f4f5;padding:1px 5px;border-radius:4px;font-size:13px}
.m{display:inline-block;width:56px;font-weight:600;color:#0a7} li{margin:2px 0}
a{color:#0a7}
</style></head>
<body>
<h1>🐦 PostPigeon 测试服务器</h1>
<p>将 <a href="/openapi.json">/openapi.json</a> 导入 PostPigeon 即可批量测试。</p>
<h2>HTTP 方法</h2>
<ul>
<li><span class="m">GET</span><code>/api/ping</code></li>
<li><span class="m">GET</span><code>/api/users</code> · <code>/api/users/:id</code></li>
<li><span class="m">POST</span><code>/api/users</code> (JSON)</li>
<li><span class="m">PUT</span><code>/api/users/:id</code></li>
<li><span class="m">PATCH</span><code>/api/users/:id</code></li>
<li><span class="m">DELETE</span><code>/api/users/:id</code></li>
<li><span class="m">HEAD</span><code>/api/users</code></li>
</ul>
<h2>请求体</h2>
<ul>
<li><span class="m">POST</span><code>/api/form</code> (x-www-form-urlencoded)</li>
<li><span class="m">POST</span><code>/api/upload</code> (multipart 文件)</li>
<li><span class="m">POST</span><code>/api/xml</code> (XML)</li>
<li><span class="m">POST</span><code>/api/echo-body</code> (纯文本)</li>
<li><span class="m">POST</span><code>/api/echo-binary</code> (二进制)</li>
</ul>
<h2>响应类型</h2>
<ul>
<li><code>/api/content/json</code> · <code>/xml</code> · <code>/html</code> · <code>/text</code> · <code>/image</code> · <code>/pdf</code></li>
<li><code>/api/status/:code</code> · <code>/api/delay/:seconds</code> · <code>/api/redirect</code></li>
</ul>
<h2>认证</h2>
<ul>
<li><code>/api/auth/basic</code> (admin/secret) · <code>/api/auth/bearer</code> (test-token) · <code>/api/auth/apikey</code> (test-key)</li>
</ul>
<h2>其它协议</h2>
<ul>
<li><code>ws://localhost:9900/ws</code> (WebSocket 回声)</li>
<li><code>/sse</code> (SSE 流)</li>
</ul>
</body></html>`
