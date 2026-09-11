import { fireEvent, render, screen } from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"

import { QueryArrayInput } from "./QueryArrayInput"

function setup(initial = '["red","blue"]') {
  const [value, setValue] = createSignal(initial)
  render(() => <QueryArrayInput value={value()} onChange={setValue} />)
  return { value }
}

describe("QueryArrayInput", () => {
  it("在一个参数单元格内逐项编辑数组", () => {
    const { value } = setup()
    const inputs = screen.getAllByRole("textbox", { name: "数组值" }) as HTMLInputElement[]
    expect(inputs.map(input => input.value)).toEqual(["red", "blue"])

    fireEvent.input(inputs[1], { target: { value: "green" } })
    expect(value()).toBe('["red","green"]')
  })

  it("加减值不会增加同名参数行", async () => {
    const { value } = setup('["red"]')
    fireEvent.click(screen.getByRole("button", { name: "添加数组值" }))
    expect(value()).toBe('["red",""]')
    expect(screen.getAllByRole("textbox", { name: "数组值" })).toHaveLength(2)

    const removeButtons = screen.getAllByRole("button", { name: "删除数组值" })
    fireEvent.click(removeButtons[1])
    expect(value()).toBe('["red"]')
  })

  it("空数组仍给用户一个可直接输入的空白项", () => {
    const { value } = setup("[]")
    const input = screen.getByRole("textbox", { name: "数组值" })
    fireEvent.input(input, { target: { value: "first" } })
    expect(value()).toBe('["first"]')
  })
})
