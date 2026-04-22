// 通用类型定义

/** HTTP 请求方法 */
export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

/** 请求体类型 */
export type BodyType = "none" | "form-data" | "x-www-form-urlencoded" | "json" | "text"

/** 认证类型 */
export type AuthType = "none" | "basic" | "bearer"

/** 主题模式 */
export type ThemeMode = "light" | "dark" | "system"

/** 预设主题色 */
export type ThemeAccent = "teal" | "blue" | "violet" | "rose" | "orange"

/** 支持的语言 */
export type Language = "zh-CN" | "en"

/** 主题色配置映射 */
export const ACCENT_COLORS: Record<ThemeAccent, { primary: string; hover: string; muted: string }> = {
  teal: { primary: "#0ea5a4", hover: "#0b7f7f", muted: "rgba(14, 165, 164, 0.14)" },
  blue: { primary: "#3b82f6", hover: "#2563eb", muted: "rgba(59, 130, 246, 0.14)" },
  violet: { primary: "#8b5cf6", hover: "#7c3aed", muted: "rgba(139, 92, 246, 0.14)" },
  rose: { primary: "#f43f5e", hover: "#e11d48", muted: "rgba(244, 63, 94, 0.14)" },
  orange: { primary: "#f97316", hover: "#ea580c", muted: "rgba(249, 115, 22, 0.14)" },
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

/** 格式化请求耗时 */
export function formatTiming(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}
