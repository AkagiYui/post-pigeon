/**
 * Query 数组在现有 EndpointParam.value 文本列中的存储格式。
 *
 * 后端模型已经有 dataType，因此数组值只需以 JSON 数组保存在 value 中；这既能
 * 无损承载逗号、空格等字符，也与 Apifox 的批量编辑表示一致。
 */

function arrayItemText(value: unknown): string {
  if (typeof value === "string") return value
  if (value == null) return ""
  if (typeof value === "object") {
    try { return JSON.stringify(value) } catch { return String(value) }
  }
  return String(value)
}

/** 解析存储值；旧数据或变量表达式不是 JSON 数组时，按单个值兼容展示。 */
export function parseQueryArrayValue(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(arrayItemText)
  } catch {
    // 非 JSON 的历史值（包括 {{arrayVariable}}）仍应可见、可编辑。
  }
  return raw === "" ? [] : [raw]
}

/** 数组编辑器的规范存储格式。 */
export function serializeQueryArrayValue(values: readonly string[]): string {
  return JSON.stringify(values)
}

/** 类型切换保留已有输入：标量变成首项，数组退回标量时取首项。 */
export function queryParamValueForTypeChange(value: string, fromType: string, toType: string): string {
  if (toType === "array") {
    return fromType === "array"
      ? serializeQueryArrayValue(parseQueryArrayValue(value))
      : serializeQueryArrayValue(value === "" ? [] : [value])
  }
  if (fromType === "array") return parseQueryArrayValue(value)[0] ?? ""
  return value
}
