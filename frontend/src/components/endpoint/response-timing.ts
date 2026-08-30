import type { TimingData } from "./editor-types"

export type TimingPhaseKey = "socket" | "dns" | "tcp" | "tls" | "wait" | "download"

export interface TimingWaterfallPhase {
  key: TimingPhaseKey
  value: number
  offsetPercent: number
  widthPercent: number
}

export interface TimingWaterfall {
  total: number
  prepare: number
  network: number
  process: number
  preparePercent: number
  networkPercent: number
  processPercent: number
  phases: TimingWaterfallPhase[]
}

function duration(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value || 0) : 0
}

function percent(value: number, total: number): number {
  return total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0
}

/** 把后端的连续时间段转换为三段式累计瀑布布局。 */
export function buildTimingWaterfall(timing: TimingData): TimingWaterfall {
  const prepare = duration(timing.prepare)
  const process = duration(timing.process)
  const rawPhases: Array<Omit<TimingWaterfallPhase, "offsetPercent" | "widthPercent">> = [
    { key: "socket", value: duration(timing.socket) },
    { key: "dns", value: duration(timing.dnsLookup) },
    { key: "tcp", value: duration(timing.tcpConnect) },
    ...(timing.tlsUsed ? [{ key: "tls" as const, value: duration(timing.tlsHandshake) }] : []),
    { key: "wait", value: duration(timing.wait) },
    { key: "download", value: duration(timing.download) },
  ]
  const phaseTotal = rawPhases.reduce((sum, phase) => sum + phase.value, 0)
  const reportedTotal = duration(timing.total)
  const network = Math.max(phaseTotal, reportedTotal - prepare - process, 0)
  const total = reportedTotal || prepare + network + process
  let offset = 0
  const phases = rawPhases.map((phase) => {
    const result = {
      ...phase,
      offsetPercent: percent(offset, network),
      widthPercent: percent(phase.value, network),
    }
    offset += phase.value
    return result
  })

  return {
    total,
    prepare,
    network,
    process,
    preparePercent: percent(prepare, total),
    networkPercent: percent(network, total),
    processPercent: percent(process, total),
    phases,
  }
}

/** 响应栏入口：毫秒保留必要精度，超过一秒改用秒。 */
export function formatTimingTrigger(value: number): string {
  const milliseconds = duration(value)
  if (milliseconds > 1000) return `${(milliseconds / 1000).toFixed(2)}s`
  return `${Number(milliseconds.toFixed(2))}ms`
}

/** 耗时弹层：与时间轴刻度一致，始终使用两位小数毫秒。 */
export function formatTimingDetail(value: number): string {
  return `${duration(value).toFixed(2)}ms`
}
