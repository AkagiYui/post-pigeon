export type WSProtocolConversionMode = "inherit" | "on" | "off"

export function normalizeWSProtocolConversion(mode?: string): WSProtocolConversionMode {
  return mode === "on" || mode === "off" ? mode : "inherit"
}

export function effectiveWSProtocolConversion(mode: string | undefined, inherited: boolean): boolean {
  const normalized = normalizeWSProtocolConversion(mode)
  return normalized === "on" || (normalized === "inherit" && inherited)
}

/** 只转换 URL 开头的 HTTP(S) scheme；已经是 WS(S) 或其他协议时保持原样。 */
export function convertHTTPToWSProtocol(url: string, enabled: boolean): string {
  if (!enabled) return url
  if (/^https:\/\//i.test(url)) return `wss://${url.slice("https://".length)}`
  if (/^http:\/\//i.test(url)) return `ws://${url.slice("http://".length)}`
  return url
}

/** 组合 WebSocket URL，并按最终生效的配置转换协议头。 */
export function wsUrl(baseUrl: string, path: string, autoConvert: boolean): string {
  const combined = !baseUrl || /^[a-z]+:\/\//i.test(path)
    ? path
    : `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
  return convertHTTPToWSProtocol(combined, autoConvert)
}
