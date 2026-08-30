import { describe, expect, it } from "vitest"

import type { TimingData } from "./editor-types"
import { buildTimingWaterfall, formatTimingDetail, formatTimingTrigger } from "./response-timing"

function timing(patch: Partial<TimingData> = {}): TimingData {
  return {
    total: 100, prepare: 10, socket: 5, dnsLookup: 5, tcpConnect: 10,
    tlsHandshake: 10, ttfb: 70, stalled: 5, wait: 30, download: 10,
    process: 20, reused: false, tlsUsed: true, ...patch,
  }
}

describe("buildTimingWaterfall", () => {
  it("按准备、网络和处理三段生成累计偏移", () => {
    const result = buildTimingWaterfall(timing())
    expect(result).toMatchObject({
      total: 100, prepare: 10, network: 70, process: 20,
      preparePercent: 10, networkPercent: 70, processPercent: 20,
    })
    expect(result.phases.map(phase => [phase.key, phase.offsetPercent, phase.widthPercent])).toEqual([
      ["socket", 0, 5 / 70 * 100],
      ["dns", 5 / 70 * 100, 5 / 70 * 100],
      ["tcp", 10 / 70 * 100, 10 / 70 * 100],
      ["tls", 20 / 70 * 100, 10 / 70 * 100],
      ["wait", 30 / 70 * 100, 30 / 70 * 100],
      ["download", 60 / 70 * 100, 10 / 70 * 100],
    ])
  })

  it("非 TLS 请求省略握手阶段", () => {
    expect(buildTimingWaterfall(timing({ tlsUsed: false, tlsHandshake: 0, total: 90 })).phases.map(p => p.key))
      .toEqual(["socket", "dns", "tcp", "wait", "download"])
  })

  it("旧数据阶段和报告总值不一致时保留阶段真实宽度", () => {
    const result = buildTimingWaterfall(timing({ total: 20, prepare: 0, process: 0 }))
    expect(result.network).toBe(70)
    expect(result.phases.at(-1)?.offsetPercent).toBeCloseTo(60 / 70 * 100)
  })
})

describe("response timing formatting", () => {
  it("入口按阈值切换毫秒和秒", () => {
    expect(formatTimingTrigger(9.876)).toBe("9.88ms")
    expect(formatTimingTrigger(1000)).toBe("1000ms")
    expect(formatTimingTrigger(1001)).toBe("1.00s")
  })

  it("弹层始终使用两位小数毫秒", () => {
    expect(formatTimingDetail(9.8)).toBe("9.80ms")
    expect(formatTimingDetail(1500)).toBe("1500.00ms")
  })
})
