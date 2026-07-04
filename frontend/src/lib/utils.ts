// 类名合并工具，结合 clsx 和 tailwind-merge
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 Tailwind CSS 类名，智能处理冲突
 * 使用 clsx 处理条件类名，使用 twMerge 处理 Tailwind 类名冲突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 判断路径是否已带协议头（http:// https:// ws:// wss:// 等）。
 * 带协议头时视为绝对地址，不应再附加环境前置 URL。
 */
export function hasURLScheme(path: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test((path || "").trim())
}

/**
 * 从接口路径中提取 path 参数名（形如 {id}、{postId}），按出现顺序去重。
 * 与后端 applyPathParams 的 {name} 占位符约定一致。
 */
export function extractPathParams(path: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const re = /\{([^}/]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(path || "")) !== null) {
    const name = m[1].trim()
    if (name && !seen.has(name)) {
      seen.add(name)
      out.push(name)
    }
  }
  return out
}

/** 计算字符串的 UTF-8 字节长度（用于估算请求/响应头与体的大小）。 */
export function byteLength(s: string): number {
  return new TextEncoder().encode(s || "").length
}
