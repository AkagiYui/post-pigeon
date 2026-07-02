// 轻量 Markdown 渲染器（用于文档预览）。覆盖常见语法：标题、加粗/斜体、
// 行内代码、代码块、列表、引用、链接、图片、分割线、段落。非完整实现，够用即可。

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function inline(s: string): string {
  return s
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%">')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    // 加粗
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    // 斜体
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    // 行内代码
    .replace(/`([^`]+)`/g, "<code>$1</code>")
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
