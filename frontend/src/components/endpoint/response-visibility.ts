import type { StreamStatus } from "@/stores/stream"

/**
 * WebSocket 的连接与消息独立于握手响应保存。
 * 切换接口后握手响应可能为空，但只要连接已经产生状态，消息面板仍应可见。
 */
export function shouldShowResponsePanel(
  hasResponse: boolean,
  isWebSocket: boolean,
  webSocketStatus: StreamStatus,
): boolean {
  return hasResponse || (isWebSocket && webSocketStatus !== "idle")
}
