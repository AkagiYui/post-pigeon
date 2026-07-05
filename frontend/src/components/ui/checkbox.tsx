// Checkbox / Radio 基础组件
// 包装原生 <input>，统一尺寸、圆角、边框与品牌强调色（accent-color），
// 同时完整保留原生无障碍行为：键盘操作、焦点、indeterminate、屏幕阅读器。
// 通过展开 rest 透传所有原生属性（checked、onChange、disabled、name、ref 等），
// 因此 indeterminate 场景可继续使用 ref 回调设置 el.indeterminate。
import { type JSX, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export type CheckboxProps = JSX.InputHTMLAttributes<HTMLInputElement>

const baseClass = cn(
  "size-4 shrink-0 cursor-pointer border-border accent-[var(--color-accent)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
  "disabled:cursor-not-allowed disabled:opacity-50",
)

/** 复选框 */
export function Checkbox(props: CheckboxProps) {
  const [local, rest] = splitProps(props, ["class"])
  return <input type="checkbox" class={cn(baseClass, "rounded", local.class)} {...rest} />
}

/** 单选框 */
export function Radio(props: CheckboxProps) {
  const [local, rest] = splitProps(props, ["class"])
  return <input type="radio" class={cn(baseClass, "rounded-full", local.class)} {...rest} />
}
