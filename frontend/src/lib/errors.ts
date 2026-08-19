// 后端错误的解析与本地化。
//
// Wails 只把 error 以字符串形式传到前端，因此后端（internal/apperr）把
// 「错误码 + 插值参数 + 原始原因」编码成一段 JSON 作为错误消息。这里负责解析它，
// 用错误码查 i18n 词条渲染本地化文案；解析不出结构时退回展示原始文本。
import { t } from "@/hooks/useI18n"

/** 后端 apperr 编码时写入的固定标记，用于判定这是结构化错误 */
const APP_ERROR_MARKER = "post-pigeon/error"

/** 解析后的结构化错误 */
export interface AppError {
  /** 错误码，形如 "http.send_request" */
  code: string
  /** i18n 插值参数 */
  params: Record<string, string>
  /** 原始错误文本，用于「详情」展示与排查 */
  cause: string
}

interface RawAppError {
  $kind?: string
  code?: string
  params?: Record<string, string>
  cause?: string
}

/** 从任意抛出物中取出可读的原始文本 */
function rawMessage(error: unknown): string {
  if (error == null) return ""
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  if (typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message ?? "")
  }
  return String(error)
}

/**
 * 尝试把任意错误解析为结构化的 AppError。
 * 不是后端结构化错误时返回 null。
 */
export function parseAppError(error: unknown): AppError | null {
  const message = rawMessage(error).trim()
  if (!message.startsWith("{") || !message.includes(APP_ERROR_MARKER)) return null
  try {
    const parsed = JSON.parse(message) as RawAppError
    if (parsed.$kind !== APP_ERROR_MARKER || !parsed.code) return null
    return { code: parsed.code, params: parsed.params ?? {}, cause: parsed.cause ?? "" }
  } catch {
    return null
  }
}

/**
 * 把任意错误转成给用户看的一句话。
 *
 * 优先级：错误码对应的 i18n 词条 → 后端给的原始原因 → 原始文本 → 兜底词条。
 * fallbackKey 用于「这一处操作失败了」这类上下文文案（如 endpoint.saveFailed）。
 */
export function errorMessage(error: unknown, fallbackKey?: string): string {
  const app = parseAppError(error)
  if (app) {
    const key = `error.${app.code}`
    const translated = t(key, app.params)
    // t() 在词条缺失时回退为键本身，此时说明这个错误码还没配词条
    if (translated !== key) return translated
    if (app.cause) return app.cause
  }

  const raw = rawMessage(error)
  if (fallbackKey) {
    const translated = t(fallbackKey)
    return raw ? `${translated}：${raw}` : translated
  }
  return raw || t("error.unknown")
}

/** 取错误码；非结构化错误返回空串 */
export function errorCode(error: unknown): string {
  return parseAppError(error)?.code ?? ""
}

/** 判断错误是否为「用户主动取消请求」——这类错误不需要弹提示打扰用户 */
export function isCanceled(error: unknown): boolean {
  return errorCode(error) === "http.canceled"
}
