import { describe, expect, it } from "vitest"

import { resolveEnvironmentBaseURLs } from "./environment-base-urls"

describe("resolveEnvironmentBaseURLs", () => {
  const environments = [
    { id: "dev", name: "开发环境" },
    { id: "prod", name: "正式环境" },
  ]

  it("首次加载时同时返回当前 Base URL 和完整选择器选项", () => {
    const state = resolveEnvironmentBaseURLs(
      environments,
      [
        { environmentId: "dev", baseUrl: "https://dev.example.com" },
        { environmentId: "prod", baseUrl: "https://api.example.com" },
      ],
      "dev",
    )

    expect(state.currentBaseUrl).toBe("https://dev.example.com")
    expect(state.options).toEqual([
      { environmentId: "dev", environmentName: "开发环境", baseUrl: "https://dev.example.com" },
      { environmentId: "prod", environmentName: "正式环境", baseUrl: "https://api.example.com" },
    ])
  })

  it("尚未配置 Base URL 的环境也保留在选择器中", () => {
    const state = resolveEnvironmentBaseURLs(
      environments,
      [{ environmentId: "prod", baseUrl: "https://api.example.com" }],
      "dev",
    )

    expect(state.currentBaseUrl).toBe("")
    expect(state.options[0]).toEqual({
      environmentId: "dev",
      environmentName: "开发环境",
      baseUrl: "",
    })
  })
})
