import { render, screen } from "@solidjs/testing-library"
import { describe, expect, it, vi } from "vitest"

import { HeadersEditor, systemContentType } from "./HeadersEditor"

describe("HeadersEditor 系统请求头", () => {
  it("按 Body 类型推导 Content-Type，form-data 的边界由发送端生成", () => {
    expect(systemContentType("json", "")).toBe("application/json")
    expect(systemContentType("json", "application/problem+json")).toBe("application/problem+json")
    expect(systemContentType("form-data", "application/json")).toBe("multipart/form-data; boundary=<auto>")
    expect(systemContentType("x-www-form-urlencoded", "stale/type")).toBe("application/x-www-form-urlencoded")
    expect(systemContentType("none", "stale/type")).toBe("")
  })

  it("展示不计入用户行的系统 Content-Type，并提供 Header 名称建议", () => {
    render(() => <HeadersEditor value={[]} bodyType="json" contentType="" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue("Content-Type")).toBeInTheDocument()
    expect(screen.getByDisplayValue("application/json")).toBeInTheDocument()
    const options = [...document.querySelectorAll("datalist option")].map(option => option.getAttribute("value"))
    expect(options).toContain("Authorization")
    expect(options).toContain("X-Request-ID")
  })
})
