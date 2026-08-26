// 响应体格式化与编码解码工具

/** 根据响应的 Content-Type 推断格式化方案（json / xml / html）；无法识别时返回 null */
export function formatFromContentType(contentType: string | undefined | null): string | null {
  if (!contentType) return null
  // 去掉参数（charset 等）并小写
  const mime = contentType.split(";")[0].trim().toLowerCase()
  if (!mime) return null
  // +json / +xml 等结构化后缀（如 application/vnd.api+json、image/svg+xml）
  if (mime === "application/json" || mime.endsWith("+json") || mime.endsWith("/json")) return "json"
  if (mime === "text/html" || mime === "application/xhtml+xml") return "html"
  if (mime === "text/xml" || mime === "application/xml" || mime.endsWith("+xml") || mime.endsWith("/xml")) return "xml"
  return null
}

/** 按指定格式美化响应体；失败时原样返回 */
export function formatBody(body: string, format: string): string {
  if (!body) return body
  if (format === "json") {
    try {
      return JSON.stringify(JSON.parse(body), null, 2)
    } catch {
      return body
    }
  }
  if (format === "xml" || format === "html") {
    return formatMarkup(body)
  }
  return body
}

/** 简单的标签缩进美化，适用于 XML / HTML */
function formatMarkup(input: string): string {
  const PAD = "  "
  // 在相邻标签之间插入换行
  const withBreaks = input.replace(/>\s*</g, ">\n<").trim()
  let depth = 0
  const out: string[] = []
  for (const raw of withBreaks.split("\n")) {
    const line = raw.trim()
    if (!line) continue
    const isClosing = /^<\//.test(line)
    const isSelfContained = /^<[^>]+\/>$/.test(line) || /^<([\w:-]+)[^>]*>.*<\/\1>$/.test(line)
    const isOpening = /^<[^/!?][^>]*[^/]?>$/.test(line) && !isSelfContained
    const isDeclaration = /^<[!?]/.test(line)
    if (isClosing) depth = Math.max(depth - 1, 0)
    out.push(PAD.repeat(depth) + line)
    if (isOpening && !isDeclaration) depth++
  }
  return out.join("\n")
}

/** 用指定字符集解码 base64 原始响应字节；失败时返回 null（由调用方回退） */
export function decodeRawBody(rawBodyBase64: string, encoding: string): string | null {
  if (!rawBodyBase64) return null
  try {
    const binary = atob(rawBodyBase64)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    // TextDecoder 在不支持的标签下会抛错，由 catch 回退
    return new TextDecoder(encoding).decode(bytes)
  } catch {
    return null
  }
}

/** 把字节数格式化为易读的大小（B / KB / MB） */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** 绝对时间：本地化的完整日期时间 */
export function formatAbsoluteTime(date: Date | string): string {
  return new Date(date).toLocaleString()
}

/**
 * 把 ISO 8601 时间戳格式化为「2026/08/26 15:52:59 GMT+8」；无法解析时返回 null。
 *
 * 时区必须显式标出来：构建时间由 CI 以 UTC 记录，展示时会转成本地时区，
 * 不标时区就没法判断这个时间到底是哪儿的——排查「我装的是哪个包」时这一点
 * 很要命。
 *
 * 时区名不能直接写进 toLocaleString 的选项里：zh-CN 的排版会把它塞到日期和
 * 时间中间（`2026/08/26 GMT+8 15:52:59`），只能分开格式化再拼。时区那部分固定
 * 用 en 取，好拿到 `GMT+8` 这种稳定写法，而不是「新加坡标准时间」。
 */
export function formatBuildTime(timeStr: string): string | null {
  const date = new Date(timeStr)
  if (Number.isNaN(date.getTime())) return null

  const datetime = date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const zone = new Intl.DateTimeFormat("en", { timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value

  return zone ? `${datetime} ${zone}` : datetime
}
