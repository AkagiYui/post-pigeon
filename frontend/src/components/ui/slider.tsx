// Slider 滑块组件，封装 Ark UI Slider
// Ark UI 提供 role="slider"、aria-valuenow/min/max、方向键与 Home/End 键盘交互等无障碍能力。
// 刻度点/标签沿用旧实现的自定义叠加渲染，以保持一致外观。
import { Slider as ArkSlider } from "@ark-ui/solid/slider"
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
    const result: SliderMark[] = []
    const step = local.step || 1
    for (let v = local.min; v <= local.max; v += step) {
      result.push({ value: v })
    }
    return result
  }

  // 计算刻度位置百分比
  const markPercentage = (value: number) => {
    const range = local.max - local.min
    return ((value - local.min) / range) * 100
  }

  return (
    <ArkSlider.Root
      class={cn("flex flex-col", local.class)}
      value={[local.value]}
      min={local.min}
      max={local.max}
      step={local.step || 1}
      disabled={local.disabled}
      onValueChange={(details) => local.onChange(details.value[0])}
    >
      {/* 滑块轨道和刻度点 */}
      <ArkSlider.Control class="relative h-5 flex items-center">
        {/* 轨道背景 */}
        <ArkSlider.Track class="absolute inset-x-0 h-1 bg-muted rounded-full">
          {/* 已填充部分 */}
          <ArkSlider.Range class="h-1 bg-accent rounded-full" />
        </ArkSlider.Track>

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

        {/* 拖拽手柄 */}
        <ArkSlider.Thumb
          index={0}
          class={cn(
            "block w-3 h-3 bg-accent rounded-full shadow-sm transition-shadow",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <ArkSlider.HiddenInput />
        </ArkSlider.Thumb>
      </ArkSlider.Control>

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
    </ArkSlider.Root>
  )
}
