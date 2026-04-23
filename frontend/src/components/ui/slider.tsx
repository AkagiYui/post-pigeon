// Slider 滑块组件
import { splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export interface SliderMark {
  /** 刻度值 */
  value: number
  /** 刻度标签（可选） */
  label?: string
}

export interface SliderProps {
  /** 当前值 */
  value: number
  /** 最小值 */
  min: number
  /** 最大值 */
  max: number
  /** 步进值 */
  step?: number
  /** 变更回调 */
  onChange: (value: number) => void
  /** 自定义类名 */
  class?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 格式化显示值 */
  formatValue?: (value: number) => string
  /** 自定义刻度点 */
  marks?: readonly SliderMark[]
}

/**
 * Slider 滑块组件
 */
export function Slider(props: SliderProps) {
  const [local] = splitProps(props, ["value", "min", "max", "step", "onChange", "class", "disabled", "formatValue", "marks"])

  // 生成默认刻度（如果没有提供）
  const marks = () => {
    if (local.marks) return local.marks
    // 默认生成主要刻度点
    const result: SliderMark[] = []
    const step = local.step || 1
    for (let v = local.min; v <= local.max; v += step) {
      result.push({ value: v })
    }
    return result
  }

  // 计算滑块位置百分比
  const percentage = () => {
    const range = local.max - local.min
    return ((local.value - local.min) / range) * 100
  }

  // 计算刻度位置百分比
  const markPercentage = (value: number) => {
    const range = local.max - local.min
    return ((value - local.min) / range) * 100
  }

  // 处理滑块变化
  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    local.onChange(parseFloat(target.value))
  }

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent) => {
    if (local.disabled) return

    const step = local.step || 1
    let newValue = local.value

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        newValue = Math.max(local.min, local.value - step)
        e.preventDefault()
        break
      case "ArrowRight":
      case "ArrowUp":
        newValue = Math.min(local.max, local.value + step)
        e.preventDefault()
        break
      case "Home":
        newValue = local.min
        e.preventDefault()
        break
      case "End":
        newValue = local.max
        e.preventDefault()
        break
    }

    if (newValue !== local.value) {
      local.onChange(newValue)
    }
  }

  return (
    <div class={cn("flex flex-col", local.class)}>
      {/* 滑块轨道和刻度点 */}
      <div class="relative h-5 flex items-center">
        {/* 轨道背景 */}
        <div class="absolute inset-x-0 h-1 bg-muted rounded-full" />

        {/* 已填充部分 */}
        <div
          class="absolute h-1 bg-accent rounded-full pointer-events-none"
          style={{ width: `${percentage()}%` }}
        />

        {/* 刻度点（在轨道上，垂直居中） */}
        {marks().map((mark) => (
          <div
            class="absolute top-1/2 -translate-y-1/2 transform -translate-x-1/2 pointer-events-none"
            style={{ left: `${markPercentage(mark.value)}%` }}
          >
            <div
              class={cn(
                "w-1.5 h-1.5 rounded-full",
                mark.value <= local.value ? "bg-accent" : "bg-muted-foreground/40",
              )}
            />
          </div>
        ))}

        {/* 高亮点指示当前值 */}
        <div
          class="absolute w-3 h-3 bg-accent rounded-full shadow-sm pointer-events-none transform -translate-x-1/2 transition-all"
          style={{ left: `${percentage()}%` }}
        />

        {/* 滑块输入（透明，用于交互） */}
        <input
          type="range"
          min={local.min}
          max={local.max}
          step={local.step || 1}
          value={local.value}
          onInput={handleChange}
          onKeyDown={handleKeyDown}
          disabled={local.disabled}
          class={cn(
            "absolute inset-x-0 w-full h-5 appearance-none bg-transparent cursor-pointer",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent",
            "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-transparent [&::-moz-range-thumb]:border-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          )}
        />
      </div>

      {/* 刻度标签（在下方） */}
      <div class="relative h-4 mt-1">
        {marks().map((mark) => (
          mark.label && (
            <div
              class="absolute transform -translate-x-1/2"
              style={{ left: `${markPercentage(mark.value)}%` }}
            >
              <span class="text-[10px] text-muted-foreground whitespace-nowrap">
                {mark.label}
              </span>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
