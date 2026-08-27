// 轻量 Markdown 渲染器。覆盖常见语法：标题、加粗/斜体、行内代码、代码块、列表、
// 引用、链接、图片、分割线、段落。非完整实现，够用即可。
//
// 渲染结果是要塞进 innerHTML 的，而喂进来的内容不一定可信——接口文档是同事写的、
// 从别处导入的，更新日志更是从网络上下载回来的 CHANGELOG.md。所以两件事必须做死：
//   1. 所有文本先经 escapeHtml，**包括引号**：链接与图片会把内容拼进 HTML 属性，
//      少转义一个双引号就能闭合属性写出 onerror=。
//   2. URL 只放行白名单协议：javascript: / data:text/html 这类点一下就执行的协议
//      一律拒绝，退化成纯文本。

/** 允许出现在链接里的协议 */
const ALLOWED_SCHEMES = new Set(["http", "https", "mailto"])

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * 校验并返回可安全放进 href/src 的 URL；不安全时返回 null。
 *
 * 判协议之前先剔掉所有控制字符与空白：浏览器解析 URL 时会忽略它们，
 * `java\tscript:` 照样能执行，正则却匹配不上。
 */
function safeUrl(raw: string, allowDataImage = false): string | null {
  const url = raw.trim()
  const probe = url.replace(/[\u0000-\u0020]+/g, "").toLowerCase()

  if (allowDataImage && probe.startsWith("data:image/")) return url

  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(probe)
  if (!scheme) return url // 相对路径与页内锚点
  return ALLOWED_SCHEMES.has(scheme[1]) ? url : null
}

/**
 * URL 进入 HTML 属性前的最后一道转义。
 *
 * 只处理引号与尖括号，不碰 `&`：调用方送进来的文本已经过一遍 escapeHtml，
 * 再转一次 `&` 会把 `?a=1&b=2` 这种正常链接毁成 `&amp;amp;`。
 * 即便将来有人拿未转义的文本调用 inline，这一层也仍然堵住了闭合属性的路。
 */
function escapeAttr(v: string): string {
  return v.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function inline(s: string): string {
  return s
    // 图片：URL 不安全时退化成 alt 文本
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, src: string) => {
      const safe = safeUrl(src, true)
      return safe === null ? alt : `<img alt="${alt}" src="${escapeAttr(safe)}" style="max-width:100%">`
    })
    // 链接：URL 不安全时退化成纯文本
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, href: string) => {
      const safe = safeUrl(href)
      return safe === null ? text : `<a href="${escapeAttr(safe)}" target="_blank" rel="noreferrer">${text}</a>`
    })
    // 加粗
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    // 斜体
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    // 行内代码
    .replace(/`([^`]+)`/g, "<code>$1</code>")
}

/**
 * 渲染单行 Markdown 的行内语法（加粗、行内代码、链接……），不产生块级元素。
 * 用于变更日志这种「一条就是一行」的场景。
 */
export function renderMarkdownInline(md: string): string {
  return inline(escapeHtml(md || ""))
}

/** 将 Markdown 文本渲染为 HTML 字符串 */
export function renderMarkdown(md: string): string {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n")
  const out: string[] = []
  let inCode = false
  let codeBuf: string[] = []
  let listType: "ul" | "ol" | null = null

  const closeList = () => {
    if (listType) { out.push(`</${listType}>`); listType = null }
  }

  for (const raw of lines) {
    // 代码块围栏
    if (/^```/.test(raw)) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`)
        codeBuf = []
        inCode = false
      } else {
        closeList()
        inCode = true
      }
      continue
    }
    if (inCode) { codeBuf.push(raw); continue }

    const line = raw.trimEnd()
    if (line.trim() === "") { closeList(); continue }

    // 标题
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) { closeList(); const lv = h[1].length; out.push(`<h${lv}>${inline(escapeHtml(h[2]))}</h${lv}>`); continue }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { closeList(); out.push("<hr>"); continue }

    // 引用
    if (/^>\s?/.test(line)) { closeList(); out.push(`<blockquote>${inline(escapeHtml(line.replace(/^>\s?/, "")))}</blockquote>`); continue }

    // 有序列表
    const ol = /^\d+\.\s+(.*)$/.exec(line)
    if (ol) {
      if (listType !== "ol") { closeList(); out.push("<ol>"); listType = "ol" }
      out.push(`<li>${inline(escapeHtml(ol[1]))}</li>`)
      continue
    }
    // 无序列表
    const ul = /^[-*+]\s+(.*)$/.exec(line)
    if (ul) {
      if (listType !== "ul") { closeList(); out.push("<ul>"); listType = "ul" }
      out.push(`<li>${inline(escapeHtml(ul[1]))}</li>`)
      continue
    }

    // 普通段落
    closeList()
    out.push(`<p>${inline(escapeHtml(line))}</p>`)
  }
  if (inCode) out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`)
  closeList()
  return out.join("\n")
}
