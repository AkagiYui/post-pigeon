import { Icon } from "@iconify-icon/solid"
import { Index } from "solid-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

import { parseQueryArrayValue, serializeQueryArrayValue } from "./query-param-array"

export interface QueryArrayInputProps {
  value: string
  onChange: (value: string) => void
}

/**
 * Apifox 风格的表格数组输入：一个参数名只占一行，值在单元格内纵向展开；每个
 * 值都可就地增删。空数组仍展示一个空输入框，但在用户实际输入前保持 `[]`。
 */
export function QueryArrayInput(props: QueryArrayInputProps) {
  let root: HTMLDivElement | undefined
  const storedValues = () => parseQueryArrayValue(props.value)
  const displayValues = () => storedValues().length > 0 ? storedValues() : [""]

  const emit = (values: string[]) => props.onChange(serializeQueryArrayValue(values))
  const update = (index: number, value: string) => {
    const next = [...displayValues()]
    next[index] = value
    emit(next)
  }
  const focusValue = (index: number) => queueMicrotask(() => {
    root?.querySelectorAll<HTMLInputElement>("[data-query-array-value]")[index]?.focus()
  })
  const addAfter = (index: number) => {
    const next = [...displayValues()]
    next.splice(index + 1, 0, "")
    emit(next)
    focusValue(index + 1)
  }
  const remove = (index: number) => {
    const current = displayValues()
    if (current.length <= 1) return
    emit(current.filter((_, itemIndex) => itemIndex !== index))
    focusValue(Math.max(0, index - 1))
  }

  return (
    <div ref={root} class="min-w-48">
      <Index each={displayValues()}>
        {(value, index) => (
          <div class={cn("flex items-center gap-1", index > 0 && "border-t border-divider pt-1 mt-1")}>
            <Input
              data-query-array-value
              aria-label={t("endpoint.param.arrayValue")}
              size="sm"
              value={value()}
              class="min-w-24 flex-1 border-transparent bg-transparent font-mono hover:border-control-border focus-visible:bg-input"
              onInput={event => update(index, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  addAfter(index)
                } else if (event.key === "Backspace" && value() === "" && displayValues().length > 1) {
                  event.preventDefault()
                  remove(index)
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("endpoint.param.arrayAddValue")}
              class="shrink-0 text-muted-foreground"
              onClick={() => addAfter(index)}
            >
              <Icon icon="lucide:plus" class="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("endpoint.param.arrayRemoveValue")}
              disabled={displayValues().length <= 1}
              class={cn("shrink-0 text-muted-foreground", displayValues().length <= 1 && "invisible")}
              onClick={() => remove(index)}
            >
              <Icon icon="lucide:minus" class="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </Index>
    </div>
  )
}
