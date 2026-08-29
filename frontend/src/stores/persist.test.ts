import { describe, expect, it } from "vitest"

import {
  decodeStored,
  encodeStored,
  isBoolean,
  isNullableString,
  isStringArray,
  isStringRecord,
  loadFromStorage,
  oneOf,
  saveToStorage,
  STORAGE_PREFIX,
  STORAGE_VERSION,
} from "./persist"

describe("decodeStored", () => {
  it("没存过时返回 undefined", () => {
    expect(decodeStored(null, isStringArray)).toBeUndefined()
  })

  it("坏 JSON 不抛异常", () => {
    expect(decodeStored("{不是 JSON", isStringArray)).toBeUndefined()
  })

  it("读回自己写的信封", () => {
    expect(decodeStored(encodeStored(["a", "b"]), isStringArray)).toEqual(["a", "b"])
  })

  it("版本不一致时整体丢弃", () => {
    const stale = JSON.stringify({ v: STORAGE_VERSION + 1, data: ["a"] })
    expect(decodeStored(stale, isStringArray)).toBeUndefined()
  })

  it("信封里的形状不符也丢弃", () => {
    const wrong = JSON.stringify({ v: STORAGE_VERSION, data: [1, 2, 3] })
    expect(decodeStored(wrong, isStringArray)).toBeUndefined()
  })

  it("兼容信封机制之前写下的裸值", () => {
    expect(decodeStored(JSON.stringify(["a"]), isStringArray)).toEqual(["a"])
    expect(decodeStored(JSON.stringify(null), isNullableString)).toBeNull()
  })

  it("裸值形状不符时回退，而不是把错误往后传", () => {
    // 旧版本存的是 string[]，新版本期望 Record<string, string> —— 正是跨版本升级的样子
    expect(decodeStored(JSON.stringify(["a"]), isStringRecord)).toBeUndefined()
    expect(decodeStored(JSON.stringify({ a: 1 }), isStringRecord)).toBeUndefined()
    expect(decodeStored(JSON.stringify("bottom"), isStringArray)).toBeUndefined()
  })
})

describe("守卫", () => {
  it("isBoolean", () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
    expect(isBoolean("true")).toBe(false)
    expect(isBoolean(1)).toBe(false)
  })

  it("isStringArray", () => {
    expect(isStringArray([])).toBe(true)
    expect(isStringArray(["a"])).toBe(true)
    expect(isStringArray(["a", 1])).toBe(false)
    expect(isStringArray({ 0: "a" })).toBe(false)
  })

  it("isStringRecord 不接受数组", () => {
    expect(isStringRecord({})).toBe(true)
    expect(isStringRecord({ a: "b" })).toBe(true)
    expect(isStringRecord({ a: null })).toBe(false)
    expect(isStringRecord([])).toBe(false)
    expect(isStringRecord(null)).toBe(false)
  })

  it("isNullableString", () => {
    expect(isNullableString(null)).toBe(true)
    expect(isNullableString("x")).toBe(true)
    expect(isNullableString(0)).toBe(false)
    expect(isNullableString(undefined)).toBe(false)
  })

  it("oneOf 只放行给定字面量", () => {
    const guard = oneOf("bottom", "right")
    expect(guard("bottom")).toBe(true)
    expect(guard("right")).toBe(true)
    expect(guard("left")).toBe(false)
    expect(guard(1)).toBe(false)
  })
})

describe("loadFromStorage / saveToStorage", () => {
  it("写进去能读回来", () => {
    localStorage.clear()
    saveToStorage("openProjectIds", ["p1", "p2"])
    expect(loadFromStorage("openProjectIds", [], isStringArray)).toEqual(["p1", "p2"])
  })

  it("写入的是带版本号的信封", () => {
    localStorage.clear()
    saveToStorage("responseLayout", "right")
    const raw = localStorage.getItem(`${STORAGE_PREFIX}responseLayout`)
    expect(JSON.parse(raw!)).toEqual({ v: STORAGE_VERSION, data: "right" })
  })

  it("存量的脏数据不会污染状态", () => {
    localStorage.clear()
    localStorage.setItem(`${STORAGE_PREFIX}projectNames`, JSON.stringify(["旧结构"]))
    expect(loadFromStorage("projectNames", {}, isStringRecord)).toEqual({})
  })

  it("localStorage 本身不可用时回退默认值", () => {
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem() { throw new Error("被策略禁用") },
        setItem() { throw new Error("被策略禁用") },
      },
    })
    try {
      expect(loadFromStorage("openProjectIds", ["兜底"], isStringArray)).toEqual(["兜底"])
      expect(() => saveToStorage("openProjectIds", ["x"])).not.toThrow()
    } finally {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original })
    }
  })
})
