import { describe, expect, it } from "vitest"

import { renderMarkdown, renderMarkdownInline } from "./markdown"

/** 把渲染结果丢进真实 DOM，列出所有 on* 事件处理属性 */
function eventAttributesOf(html: string): string[] {
  const host = document.createElement("div")
  host.innerHTML = html
  const found: string[] = []
  host.querySelectorAll("*").forEach((el) => {
    for (const attr of el.attributes) {
      if (attr.name.startsWith("on")) found.push(`${el.tagName}.${attr.name}`)
    }
  })
  return found
}

describe("renderMarkdownInline", () => {
  it("渲染常见的行内语法", () => {
    expect(renderMarkdownInline("**加粗**与 `代码`"))
      .toBe("<strong>加粗</strong>与 <code>代码</code>")
  })

  it("不产生块级元素", () => {
    expect(renderMarkdownInline("一句话")).toBe("一句话")
  })

  it("正常链接照常渲染", () => {
    expect(renderMarkdownInline("[主页](https://example.com)"))
      .toContain('<a href="https://example.com" target="_blank" rel="noreferrer">主页</a>')
  })

  it("链接里的查询参数不会被二次转义", () => {
    // ?a=1&b=2 经 escapeHtml 变成 &amp;，属性里再转一次就成了 &amp;amp;
    const html = renderMarkdownInline("[x](https://example.com/?a=1&b=2)")
    expect(html).toContain("https://example.com/?a=1&amp;b=2")
    expect(html).not.toContain("&amp;amp;")
  })
})

describe("Markdown 的 XSS 防线", () => {
  it("原样的 HTML 标签会被转义", () => {
    const html = renderMarkdown("<img src=x onerror=alert(1)>")
    expect(html).not.toContain("<img")
    expect(html).toContain("&lt;img")
  })

  it("链接里的双引号不能闭合属性", () => {
    // 少转义一个双引号，这里就能写出 onmouseover=。用真实 DOM 断言：
    // 关键不是字符串长什么样，而是浏览器解析完之后有没有多出事件处理属性
    expect(eventAttributesOf(renderMarkdownInline('[x](" onmouseover="alert(1))'))).toEqual([])
  })

  it("图片 alt 里的双引号不能闭合属性", () => {
    const html = renderMarkdownInline('![" onerror="alert(1)](https://example.com/a.png)')
    expect(eventAttributesOf(html)).toEqual([])
  })

  it("javascript: 链接退化成纯文本", () => {
    const html = renderMarkdownInline("[点我](javascript:alert(1))")
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("<a")
    expect(html).toContain("点我")
  })

  it("协议里夹控制字符也拦得住", () => {
    const html = renderMarkdownInline("[点我](java\tscript:alert(1))")
    expect(html).not.toContain("<a")
  })

  it("data:text/html 链接被拒绝", () => {
    const html = renderMarkdownInline("[x](data:text/html;base64,PHNjcmlwdD4=)")
    expect(html).not.toContain("<a")
  })

  it("data:image 图片仍然允许", () => {
    const html = renderMarkdownInline("![p](data:image/png;base64,iVBORw0KGgo=)")
    expect(html).toContain("<img")
    expect(html).toContain("data:image/png")
  })

  it("相对路径与锚点不受影响", () => {
    expect(renderMarkdownInline("[a](./docs/a.md)")).toContain('href="./docs/a.md"')
    expect(renderMarkdownInline("[b](#section)")).toContain('href="#section"')
  })

  it("代码块里的 HTML 只是文本", () => {
    const html = renderMarkdown("```\n<script>alert(1)</script>\n```")
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })
})
