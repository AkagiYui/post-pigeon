// 通用类型定义

/** HTTP 请求方法（支持自定义方法） */
export type HTTPMethod = string

/** 请求体类型 */
export type BodyType = "none" | "form-data" | "x-www-form-urlencoded" | "json" | "text" | "xml" | "binary"

/** 认证类型 */
export type AuthType = "none" | "basic" | "bearer" | "apikey" | "inherit"

/** 参数位置 */
export type ParamLocation = "query" | "path" | "cookie"

/** 端点类型 */
export type EndpointType = "http" | "doc" | "websocket" | "sse"

/** 操作阶段 */
export type OperationStage = "pre" | "post"

/** 操作类型 */
export type OperationType = "script" | "libraryScript" | "assert" | "extractVar" | "wait"

/** 主题模式 */
export type ThemeMode = "light" | "dark" | "system"

/** 预设主题色 */
export type ThemeAccent = "purple" | "blue" | "blue2" | "cerulean" | "gold" | "green" | "orange" | "pink" | "red" | "silver"

/** 支持的语言 */
export type Language = "zh-CN" | "en"

/** 主题色配置映射 */
export const ACCENT_COLORS: Record<ThemeAccent, { primary: string; hover: string; muted: string }> = {
  purple: { primary: "#9373ee", hover: "#b19af3", muted: "rgba(147, 115, 238, 0.14)" },
  blue: { primary: "#587df1", hover: "#87a1f5", muted: "rgba(88, 125, 241, 0.14)" },
  blue2: { primary: "#00c3ee", hover: "#47d4f3", muted: "rgba(0, 195, 238, 0.14)" },
  cerulean: { primary: "#5f80e9", hover: "#8ca4ef", muted: "rgba(95, 128, 233, 0.14)" },
  gold: { primary: "#9a7d56", hover: "#b6a185", muted: "rgba(154, 125, 86, 0.14)" },
  green: { primary: "#039e74", hover: "#4ab99b", muted: "rgba(3, 158, 116, 0.14)" },
  orange: { primary: "#fa8c16", hover: "#fbac57", muted: "rgba(250, 140, 22, 0.14)" },
  pink: { primary: "#e86ca4", hover: "#ee95bd", muted: "rgba(232, 108, 164, 0.14)" },
  red: { primary: "#fd6874", hover: "#fe929b", muted: "rgba(253, 104, 116, 0.14)" },
  silver: { primary: "#8e8374", hover: "#aea69b", muted: "rgba(142, 131, 116, 0.14)" },
}

/** HTTP 方法对应的颜色标签 */
export const METHOD_COLORS: Record<string, string> = {
  GET: "text-green-600 dark:text-green-400",
  POST: "text-amber-600 dark:text-amber-400",
  PUT: "text-blue-600 dark:text-blue-400",
  DELETE: "text-red-600 dark:text-red-400",
  PATCH: "text-purple-600 dark:text-purple-400",
  HEAD: "text-cyan-600 dark:text-cyan-400",
  OPTIONS: "text-gray-600 dark:text-gray-400",
}

/** 常见的内容类型 */
export const CONTENT_TYPES = [
  "application/json",
  "application/xml",
  "text/plain",
  "text/html",
  "text/xml",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "application/octet-stream",
]

/** HTTP 状态码颜色 */
export function getStatusColor(code: number): string {
  if (code >= 200 && code < 300) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  if (code >= 300 && code < 400) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  if (code >= 400 && code < 500) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
  if (code >= 500) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
}

/** 格式化文件大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 格式化请求耗时（支持亚毫秒精度，整数不带小数） */
export function formatTiming(ms: number): string {
  if (ms < 1000) return `${Number.isInteger(ms) ? ms : Number(ms.toFixed(2))} ms`
  return `${(ms / 1000).toFixed(2)} s`
}
