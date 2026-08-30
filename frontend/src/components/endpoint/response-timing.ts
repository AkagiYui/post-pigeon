import type { TimingData } from "./editor-types"

export type TimingPhaseKey = "socket" | "dns" | "tcp" | "tls" | "wait" | "download"

export interface TimingWaterfallPhase {
  key: TimingPhaseKey
  value: number
  offsetPercent: number
  widthPercent: number
  cacheable: boolean
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
    { key: "socket", value: duration(timing.socket), cacheable: true },
    { key: "dns", value: duration(timing.dnsLookup), cacheable: true },
    { key: "tcp", value: duration(timing.tcpConnect), cacheable: true },
    ...(timing.tlsUsed ? [{ key: "tls" as const, value: duration(timing.tlsHandshake), cacheable: true }] : []),
    { key: "wait", value: duration(timing.wait), cacheable: false },
    { key: "download", value: duration(timing.download), cacheable: false },
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
