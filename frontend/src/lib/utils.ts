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
