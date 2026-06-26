// 响应体格式化与编码解码工具

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
