// 参数「批量编辑」的纯文本互转。
//
// 格式抄自 Apifox：一行一个参数，`name: value`；行首加 `//` 表示停用该参数。
// 这样整段 query string / 一列参数名都能直接粘进来，不用一行行点「添加」。
// 与渲染无关，放在这里以便单测。

/** 批量文本里的一条参数 */
export interface BulkEntry {
  name: string
  value: string
  enabled: boolean
}

/** 参与批量编辑的行需要具备的字段 */
export interface BulkRowLike {
  name: string
  value: string
  enabled: boolean
}

/** 名值分隔符：取 `:` 与 `=` 中更靠前的一个（`url: http://x` 与 `a=1` 都能正确切分） */
function splitAt(line: string): number {
  const colon = line.indexOf(":")
  const equal = line.indexOf("=")
  if (colon < 0) return equal
  if (equal < 0) return colon
  return Math.min(colon, equal)
}

/** 文本 → 参数条目（空行忽略；无分隔符的行整行视为参数名） */
export function parseBulkText(text: string): BulkEntry[] {
  const entries: BulkEntry[] = []
  for (const raw of text.split("\n")) {
    let line = raw.trim()
    if (!line) continue
    let enabled = true
    if (line.startsWith("//")) {
      enabled = false
      line = line.slice(2).trim()
      if (!line) continue
    }
    const at = splitAt(line)
    const name = (at < 0 ? line : line.slice(0, at)).trim()
    const value = at < 0 ? "" : line.slice(at + 1).trim()
    if (!name && !value) continue
    entries.push({ name, value, enabled })
  }
  return entries
}

/** 参数行 → 文本（完全空白的行不参与序列化） */
export function serializeBulkText(rows: BulkRowLike[]): string {
  return rows
    .filter(row => row.name.trim() || row.value.trim())
    .map(row => `${row.enabled ? "" : "// "}${row.name}: ${row.value}`)
    .join("\n")
}

/**
 * 把批量文本解析出的条目合并回完整行。
 *
 * 批量文本只承载「名 / 值 / 启用」，描述、示例、必填、数据类型等字段在文本里没有位置。
 * 按参数名与原有行配对（同名多行按出现顺序一一对应），配对上的行沿用其 id 与其余字段，
 * 这样在批量模式里改个值不会把描述清空、也不会让行 id 全部翻新。
 */
export function mergeBulkEntries<T extends BulkRowLike>(
  entries: BulkEntry[],
  existing: readonly T[],
  makeRow: () => T,
): T[] {
  const pool = [...existing]
  return entries.map((entry) => {
    const index = pool.findIndex(row => row.name === entry.name)
    const base = index >= 0 ? pool.splice(index, 1)[0] : makeRow()
    return { ...base, name: entry.name, value: entry.value, enabled: entry.enabled }
  })
}
