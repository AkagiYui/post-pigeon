// KeyValueTable 的录入交互：草稿行转正、输入焦点不丢、批量编辑往返
import { fireEvent, render, screen } from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"

import { type KeyValueRow, KeyValueTable } from "./KeyValueTable"

let seq = 0
const makeRow = (): KeyValueRow => ({
  id: `row-${++seq}`, name: "", value: "", description: "",
  enabled: true, required: false, example: "",
})

/** 渲染一个自持状态的表格，返回当前行的读取器 */
function setup(initial: KeyValueRow[] = []) {
  const [rows, setRows] = createSignal<KeyValueRow[]>(initial)
  const utils = render(() => (
    <KeyValueTable rows={rows()} onChange={setRows} makeRow={makeRow} showRequired showExample />
  ))
  return { rows, ...utils }
}

/** 取第 index 行（不含表头）的参数名输入框 */
function nameInputAt(index: number): HTMLInputElement {
  const row = document.querySelectorAll("tbody tr")[index]
  return row.querySelectorAll("input")[1] as HTMLInputElement
}

describe("KeyValueTable 草稿行", () => {
  it("空表也渲染一行草稿行，且不计入数据", () => {
    const { rows } = setup()
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1)
    expect(rows()).toEqual([])
  })

  it("往草稿行打字即新增一行，并补出新的草稿行", () => {
    const { rows } = setup()
    fireEvent.input(nameInputAt(0), { target: { value: "page" } })

    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toMatchObject({ name: "page", enabled: true })
    expect(document.querySelectorAll("tbody tr")).toHaveLength(2)
  })

  it("草稿行转正后输入框实例不变（继续输入不会失焦）", () => {
    const { rows } = setup()
    const input = nameInputAt(0)
    input.focus()
    fireEvent.input(input, { target: { value: "p" } })

    expect(nameInputAt(0)).toBe(input)
    expect(document.activeElement).toBe(input)

    // 第二个字符仍写进同一行，而不是再开一行
    fireEvent.input(input, { target: { value: "pa" } })
    expect(rows()).toHaveLength(1)
    expect(rows()[0].name).toBe("pa")
    expect(document.activeElement).toBe(input)
  })

  it("先填「值」列也能转正，参数名留空", () => {
    const { rows } = setup()
    const row = document.querySelectorAll("tbody tr")[0]
    const valueInput = row.querySelectorAll("input")[2] as HTMLInputElement
    fireEvent.input(valueInput, { target: { value: "1" } })

    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toMatchObject({ name: "", value: "1" })
  })

  it("草稿行的复选框不可勾选", () => {
    setup()
    const checkbox = document.querySelectorAll("tbody tr")[0].querySelectorAll("input")[0] as HTMLInputElement
    expect(checkbox.disabled).toBe(true)
    expect(checkbox.checked).toBe(false)
  })

  it("Enter 把焦点带到下一行同一列", () => {
    setup([{ ...makeRow(), name: "a" }])
    const first = nameInputAt(0)
    first.focus()
    fireEvent.keyDown(first, { key: "Enter" })
    expect(document.activeElement).toBe(nameInputAt(1))
  })

  it("删除按钮移除对应行", () => {
    const { rows } = setup([{ ...makeRow(), name: "a" }, { ...makeRow(), name: "b" }])
    const buttons = screen.getAllByRole("button", { name: "删除" })
    fireEvent.click(buttons[0])
    expect(rows().map(r => r.name)).toEqual(["b"])
  })

  it("表头复选框可以全选和全部停用", () => {
    const { rows } = setup([
      { ...makeRow(), name: "a", enabled: true },
      { ...makeRow(), name: "b", enabled: false },
    ])
    const toggle = document.querySelector("thead input[type=checkbox]") as HTMLInputElement
    fireEvent.click(toggle)
    expect(rows().every(row => row.enabled)).toBe(true)
    fireEvent.click(toggle)
    expect(rows().every(row => !row.enabled)).toBe(true)
  })

  it("拖拽手柄可以调整行顺序", () => {
    const [rows, setRows] = createSignal<KeyValueRow[]>([
      { ...makeRow(), name: "a" },
      { ...makeRow(), name: "b" },
    ])
    render(() => <KeyValueTable rows={rows()} onChange={setRows} makeRow={makeRow} sortable />)
    const handles = screen.getAllByLabelText("拖拽排序")
    fireEvent.dragStart(handles[1])
    fireEvent.dragOver(handles[0])
    fireEvent.drop(handles[0])
    expect(rows().map(row => row.name)).toEqual(["b", "a"])
  })
})

describe("KeyValueTable 批量编辑", () => {
  it("切到批量模式带出现有参数，改文本即回写行", () => {
    const { rows } = setup([{ ...makeRow(), name: "a", value: "1", description: "说明" }])
    fireEvent.click(screen.getByRole("button", { name: /批量编辑/ }))

    const textarea = document.querySelector("textarea") as HTMLTextAreaElement
    expect(textarea.value).toBe("a: 1")

    fireEvent.input(textarea, { target: { value: "a: 2\n// b: 3" } })
    expect(rows()).toHaveLength(2)
    // 同名行沿用原有描述，不因批量编辑而丢失
    expect(rows()[0]).toMatchObject({ name: "a", value: "2", description: "说明" })
    expect(rows()[1]).toMatchObject({ name: "b", value: "3", enabled: false })
  })

  it("切回表格模式后草稿行仍在末尾", () => {
    setup([{ ...makeRow(), name: "a", value: "1" }])
    fireEvent.click(screen.getByRole("button", { name: /批量编辑/ }))
    fireEvent.click(screen.getByRole("button", { name: /表格编辑/ }))
    expect(document.querySelectorAll("tbody tr")).toHaveLength(2)
  })
})
