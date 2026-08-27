import { describe, expect, it } from "vitest"

import { type BulkEntry, mergeBulkEntries, parseBulkText, serializeBulkText } from "./param-bulk"

/** 测试用的行工厂（模拟 ParamRow 的扩展字段） */
interface Row {
  id: string
  name: string
  value: string
  enabled: boolean
  description: string
}
let seq = 0
const makeRow = (): Row => ({ id: `new-${++seq}`, name: "", value: "", enabled: true, description: "" })

describe("parseBulkText", () => {
  it("按 name: value 解析并忽略空行", () => {
    expect(parseBulkText("a: 1\n\n b : 2 \n")).toEqual([
      { name: "a", value: "1", enabled: true },
      { name: "b", value: "2", enabled: true },
    ])
  })

  it("行首 // 表示停用", () => {
    expect(parseBulkText("// a: 1")).toEqual([{ name: "a", value: "1", enabled: false }])
  })

  it("等号也能作为分隔符，且取更靠前的那个", () => {
    expect(parseBulkText("a=1")).toEqual([{ name: "a", value: "1", enabled: true }])
    expect(parseBulkText("a=b:c")).toEqual([{ name: "a", value: "b:c", enabled: true }])
  })

  it("值里含冒号（URL）不会被二次切分", () => {
    expect(parseBulkText("url: https://x.dev/a")).toEqual([
      { name: "url", value: "https://x.dev/a", enabled: true },
    ])
  })

  it("没有分隔符的行整行作为参数名", () => {
    expect(parseBulkText("token")).toEqual([{ name: "token", value: "", enabled: true }])
  })

  it("只有 // 的行被丢弃", () => {
    expect(parseBulkText("//\n//  ")).toEqual([])
  })
})

describe("serializeBulkText", () => {
  it("停用行加 // 前缀，完全空白的行不输出", () => {
    const text = serializeBulkText([
      { name: "a", value: "1", enabled: true },
      { name: "b", value: "2", enabled: false },
      { name: "", value: "", enabled: true },
    ])
    expect(text).toBe("a: 1\n// b: 2")
  })

  it("与 parseBulkText 往返一致", () => {
    const rows = [
      { name: "a", value: "1", enabled: true },
      { name: "b", value: "", enabled: false },
    ]
    expect(parseBulkText(serializeBulkText(rows))).toEqual(rows)
  })
})

describe("mergeBulkEntries", () => {
  it("同名行沿用原 id 与描述等表格独有字段", () => {
    const existing: Row[] = [{ id: "r1", name: "a", value: "1", enabled: true, description: "说明" }]
    const entries: BulkEntry[] = [{ name: "a", value: "2", enabled: false }]
    expect(mergeBulkEntries(entries, existing, makeRow)).toEqual([
      { id: "r1", name: "a", value: "2", enabled: false, description: "说明" },
    ])
  })

  it("新参数名生成新行", () => {
    const merged = mergeBulkEntries([{ name: "b", value: "2", enabled: true }], [], makeRow)
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ name: "b", value: "2", enabled: true, description: "" })
  })

  it("同名多行按出现顺序一一配对，不会都复用同一行", () => {
    const existing: Row[] = [
      { id: "r1", name: "a", value: "1", enabled: true, description: "一" },
      { id: "r2", name: "a", value: "2", enabled: true, description: "二" },
    ]
    const merged = mergeBulkEntries(
      [{ name: "a", value: "x", enabled: true }, { name: "a", value: "y", enabled: true }],
      existing,
      makeRow,
    )
    expect(merged.map(r => r.id)).toEqual(["r1", "r2"])
    expect(merged.map(r => r.description)).toEqual(["一", "二"])
  })

  it("删掉的行不会被保留", () => {
    const existing: Row[] = [
      { id: "r1", name: "a", value: "1", enabled: true, description: "" },
      { id: "r2", name: "b", value: "2", enabled: true, description: "" },
    ]
    const merged = mergeBulkEntries([{ name: "b", value: "2", enabled: true }], existing, makeRow)
    expect(merged.map(r => r.name)).toEqual(["b"])
  })
})
