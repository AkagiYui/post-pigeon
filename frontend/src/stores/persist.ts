// localStorage 持久化：带版本号的信封 + 读时形状校验。
//
// 这些键和数据库一样是「跨版本存活的状态」：结构改了、或者用户在版本之间来回跳，
// 旧数据仍会被新代码读到。此前的写法是 `JSON.parse(raw) as T`——断言不是校验，
// 形状对不上时错误会在某个组件里才炸开，而 store 是在模块初始化阶段读的，
// 抛出的时机比 ErrorBoundary 还早，用户看到的就是白屏。
//
// 因此：写入带版本号，读取先校验；对不上就当作没存过，回退默认值。丢一次标签页
// 布局，远好过打不开应用。

/** 所有键统一的前缀 */
export const STORAGE_PREFIX = "PostPigeon:"

/** 信封版本。存量结构不兼容地改动时 +1，旧数据会被整体丢弃。 */
export const STORAGE_VERSION = 1

/** 类型守卫 */
export type Guard<T> = (value: unknown) => value is T

/** 带版本号的信封 */
interface Envelope {
  v: number
  data: unknown
}

/** 判断解析结果是不是信封 */
function isEnvelope(value: unknown): value is Envelope {
  return typeof value === "object" && value !== null
    && typeof (value as Envelope).v === "number" && "data" in value
}

/**
 * 从原始 JSON 文本里取出通过校验的值；取不出（没存过、坏了、版本不符、形状不符）
 * 一律返回 undefined，由调用方回退默认值。
 */
export function decodeStored<T>(raw: string | null, guard: Guard<T>): T | undefined {
  if (raw === null) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }

  // 信封：版本必须一致
  if (isEnvelope(parsed)) {
    if (parsed.v !== STORAGE_VERSION) return undefined
    return guard(parsed.data) ? parsed.data : undefined
  }

  // 裸值：信封机制之前写下的数据，形状对就接着用，免得升级一次就丢掉已打开的标签页
  return guard(parsed) ? parsed : undefined
}

/** 把值编码成待写入的 JSON 文本 */
export function encodeStored(value: unknown): string {
  return JSON.stringify({ v: STORAGE_VERSION, data: value } satisfies Envelope)
}

/** 读取持久化状态，校验不通过时返回 fallback */
export function loadFromStorage<T>(key: string, fallback: T, guard: Guard<T>): T {
  try {
    const value = decodeStored(localStorage.getItem(STORAGE_PREFIX + key), guard)
    return value === undefined ? fallback : value
  } catch {
    // 读 localStorage 本身也可能抛（隐私模式、被策略禁用）
    return fallback
  }
}

/** 写入持久化状态；失败（配额满、被禁用）时静默忽略 */
export function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, encodeStored(value))
  } catch {
    // 写不进去不影响使用
  }
}

// ---- 常用守卫 ----

export const isString = (v: unknown): v is string => typeof v === "string"

export const isNullableString = (v: unknown): v is string | null => v === null || typeof v === "string"

export const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(isString)

export const isStringRecord = (v: unknown): v is Record<string, string> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
  && Object.values(v).every(isString)

/** 生成「只能是这几个字面量之一」的守卫 */
export function oneOf<const T extends readonly string[]>(...options: T): Guard<T[number]> {
  return (v: unknown): v is T[number] => typeof v === "string" && options.includes(v)
}
