import { fireEvent, render, screen, within } from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"

import { BodyEditor } from "./BodyEditor"
import type { BodyFieldRow } from "./editor-types"

const field = (): BodyFieldRow => ({
  id: "field-1", name: "tags", value: '["a","b"]', fieldType: "text", enabled: true,
  dataType: "array", description: "", required: false, contentType: "application/json",
  schema: "", style: "form", explode: null, sortOrder: 0,
})

describe("BodyEditor 字段高级设置", () => {
  it("可以编辑 required 与 JSON Schema", () => {
    const [fields, setFields] = createSignal([field()])
    render(() => (
      <BodyEditor
        bodyType="form-data"
        bodyContent=""
        contentType=""
        fields={fields()}
        onChange={patch => patch.bodyFields && setFields(patch.bodyFields)}
      />
    ))

    fireEvent.click(screen.getByRole("button", { name: "字段高级设置" }))
    const panel = screen.getByText(/字段高级设置:/).closest("section")!
    const required = within(panel).getByRole("checkbox")
    fireEvent.click(required)
    const schema = within(panel).getByPlaceholderText('{"type":"array","items":{"type":"string"}}')
    fireEvent.input(schema, { target: { value: '{"type":"array"}' } })

    expect(fields()[0]).toMatchObject({ required: true, schema: '{"type":"array"}' })
  })
})
