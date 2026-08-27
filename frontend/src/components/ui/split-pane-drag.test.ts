import { describe, expect, it } from "vitest"

import { dragDisplaySize, resolveDragEnd, willCollapse } from "./split-pane-drag"

const MIN = 150
const MAX = 500
const THRESHOLD = 60

describe("dragDisplaySize", () => {
  it("正常区间内跟手", () => {
    expect(dragDisplaySize(300, MIN, MAX)).toBe(300)
  })

  it("低于最小宽度时停在最小宽度，不继续变窄", () => {
    expect(dragDisplaySize(120, MIN, MAX)).toBe(MIN)
    expect(dragDisplaySize(-50, MIN, MAX)).toBe(MIN)
  })

  it("不超过最大宽度", () => {
    expect(dragDisplaySize(900, MIN, MAX)).toBe(MAX)
  })
})

describe("willCollapse", () => {
  it("刚到最小宽度时不收起", () => {
    expect(willCollapse(MIN, MIN, THRESHOLD)).toBe(false)
  })

  it("差一像素也不收起", () => {
    expect(willCollapse(MIN - THRESHOLD + 1, MIN, THRESHOLD)).toBe(false)
  })

  it("正好拖够就收起", () => {
    expect(willCollapse(MIN - THRESHOLD, MIN, THRESHOLD)).toBe(true)
  })

  it("拖得更远当然也收起", () => {
    expect(willCollapse(-200, MIN, THRESHOLD)).toBe(true)
  })
})

describe("resolveDragEnd", () => {
  it("拖到中间：保持当前宽度", () => {
    expect(resolveDragEnd(320, MIN, MAX, THRESHOLD)).toEqual({ collapsed: false, size: 320 })
  })

  it("拖过头但不够远：弹回最小宽度", () => {
    expect(resolveDragEnd(MIN - 20, MIN, MAX, THRESHOLD)).toEqual({ collapsed: false, size: MIN })
  })

  it("拖够了：整个收起，并记住最小宽度供下次展开", () => {
    expect(resolveDragEnd(MIN - THRESHOLD - 1, MIN, MAX, THRESHOLD)).toEqual({ collapsed: true, size: MIN })
  })

  it("往右拖出上限：停在最大宽度", () => {
    expect(resolveDragEnd(1000, MIN, MAX, THRESHOLD)).toEqual({ collapsed: false, size: MAX })
  })
})
