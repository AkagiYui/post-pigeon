// 分割面板拖拽的取舍逻辑。抽出来是为了能单测：这类「差一点就收起」的手感
// 全在边界值上，靠手动拖拽验证既慢又容易漏。

/** 松手后的结果 */
export interface DragOutcome {
  /** 是否应当整个收起 */
  collapsed: boolean
  /** 保留的宽度（收起时是下次展开要恢复到的宽度） */
  size: number
}

/**
 * 拖拽过程中面板实际显示的宽度。
 *
 * 低于最小宽度后不再跟手，停在最小宽度上——继续往左拖是「表达收起的意图」，
 * 不是把面板压得更窄；真要收起是松手那一刻才决定的。
 */
export function dragDisplaySize(raw: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, raw))
}

/**
 * 当前是否已经拖过了「松手即收起」的距离。
 * 用来在松手之前就给出视觉预告，免得收起来得莫名其妙。
 */
export function willCollapse(raw: number, min: number, threshold: number): boolean {
  return raw <= min - threshold
}

/**
 * 松手时的结果：拖得不够远就弹回最小宽度，拖够了就整个收起。
 */
export function resolveDragEnd(raw: number, min: number, max: number, threshold: number): DragOutcome {
  if (willCollapse(raw, min, threshold)) {
    // 收起后仍记住最小宽度：下次展开回到最小宽度，而不是一个莫名其妙的窄条
    return { collapsed: true, size: min }
  }
  return { collapsed: false, size: dragDisplaySize(raw, min, max) }
}
