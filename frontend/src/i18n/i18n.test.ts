import { describe, expect, it } from "vitest"

import en from "./en.json"
import zhCN from "./zh-CN.json"

const zhKeys = Object.keys(zhCN as Record<string, string>)
const enKeys = Object.keys(en as Record<string, string>)

/** 取出文案里的 {placeholder} 占位符集合 */
function placeholders(text: string): Set<string> {
  return new Set(Array.from(text.matchAll(/\{(\w+)\}/g), (m) => m[1]))
}

describe("i18n 词条完整性", () => {
  it("两种语言的键集合完全一致", () => {
    expect(enKeys.filter((k) => !zhKeys.includes(k))).toEqual([])
    expect(zhKeys.filter((k) => !enKeys.includes(k))).toEqual([])
  })

  it("没有空文案", () => {
    const empty = [...zhKeys, ...enKeys].filter((key) => {
      const dict = zhKeys.includes(key) ? (zhCN as Record<string, string>) : (en as Record<string, string>)
      return !String(dict[key] ?? "").trim()
    })
    expect(empty).toEqual([])
  })

  it("同一条词条在两种语言下的占位符一致", () => {
    const mismatched = zhKeys.filter((key) => {
      const a = placeholders((zhCN as Record<string, string>)[key])
      const b = placeholders((en as Record<string, string>)[key] ?? "")
      return a.size !== b.size || [...a].some((p) => !b.has(p))
    })
    expect(mismatched).toEqual([])
  })
})
