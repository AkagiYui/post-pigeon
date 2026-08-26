import { describe, expect, it } from "vitest"

import { formatBytes } from "./data-format"

describe("formatBytes", () => {
  it("非正数与非法值一律显示 0 B", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(-1)).toBe("0 B")
    expect(formatBytes(Number.NaN)).toBe("0 B")
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0 B")
  })

  it("字节不带小数", () => {
    expect(formatBytes(1)).toBe("1 B")
    expect(formatBytes(1023)).toBe("1023 B")
  })

  it("按 1024 进制逐级换算", () => {
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB")
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB")
    expect(formatBytes(5 * 1024 * 1024 * 1024 * 1024)).toBe("5.0 TB")
  })

  it("超过 100 的数值省掉小数位", () => {
    expect(formatBytes(512 * 1024 * 1024)).toBe("512 MB")
    expect(formatBytes(99.5 * 1024 * 1024)).toBe("99.5 MB")
  })

  it("超出最大单位时不再进位", () => {
    expect(formatBytes(4096 * 1024 * 1024 * 1024 * 1024)).toBe("4096 TB")
  })
})
