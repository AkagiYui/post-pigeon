import { describe, expect, it } from "vitest"

import type { HTTPRequestSnapshot } from "@/../bindings/PostPigeon/internal/models"

import {
  diffRequestSnapshots,
  generateRequestCode,
  REQUEST_CODE_GENERATORS,
  serializeHeaders,
  serializeRequest,
  visibleURL,
} from "./actual-request"

function snapshot(overrides: Partial<HTTPRequestSnapshot> = {}): HTTPRequestSnapshot {
  return {
    method: "POST",
    url: "https://example.test/items?q=1",
    requestTarget: "/items?q=1",
    authority: "example.test",
    protocol: "HTTP/2.0",
    headers: [
      { name: "X-Trace", value: "one" },
      { name: "X-Trace", value: "two" },
      { name: "Authorization", value: "Bearer live-token", sensitive: true },
    ],
    body: { kind: "json", mediaType: "application/json", size: 11, preview: "{\"ok\":true}", previewCodec: "utf8", captured: true },
    contentLength: 11,
    captureLevel: "transport_boundary",
    ...overrides,
  } as HTTPRequestSnapshot
}

describe("actual request operations", () => {
  it("preserves duplicate headers while hiding sensitive values by default", () => {
    const request = snapshot()
    expect(serializeHeaders(request, false)).toContain("X-Trace: one\nX-Trace: two")
    expect(serializeRequest(request, false)).toContain("Authorization: ••••••")
    expect(serializeRequest(request, false)).not.toContain("live-token")
    expect(serializeRequest(request, true)).toContain("Bearer live-token")
  })

  it("generates code from the selected sent snapshot", () => {
    const request = snapshot()
    const curl = generateRequestCode(request, "curl", false)
    expect(curl.match(/-H 'X-Trace:/g)).toHaveLength(2)
    expect(curl).toContain("Authorization: ••••••")
    expect(curl).not.toContain("\n+")
    expect(generateRequestCode(request, "javascript", true)).toContain("Bearer live-token")
    expect(generateRequestCode(request, "python", false)).toContain("connection.putheader")
    expect(generateRequestCode(request, "go", false)).toContain("req.Header.Add")
  })

  it("keeps the generator registry unique and every template usable", () => {
    const request = snapshot()
    const languages = REQUEST_CODE_GENERATORS.map((generator) => generator.value)
    expect(new Set(languages).size).toBe(languages.length)
    expect(languages).toHaveLength(17)

    for (const language of languages) {
      const hidden = generateRequestCode(request, language, false)
      const revealed = generateRequestCode(request, language, true)
      expect(hidden, language).not.toBe("")
      expect(hidden, language).not.toContain("live-token")
      expect(revealed, language).toContain("live-token")
      expect(revealed, language).toContain("example.test/items?q=1")
    }
  })

  it("decodes captured binary bodies in every generated target", () => {
    const request = snapshot({
      body: {
        kind: "binary",
        mediaType: "application/octet-stream",
        size: 3,
        preview: "AP8Q",
        previewCodec: "base64",
        captured: true,
      },
    })

    for (const { value } of REQUEST_CODE_GENERATORS) {
      const code = generateRequestCode(request, value, false)
      expect(code, value).toContain("AP8Q")
    }
  })

  it("reports transport additions and request mutations", () => {
    const prepared = snapshot({
      url: "https://example.test/start",
      headers: [{ name: "X-Trace", value: "one" }],
    })
    const sent = snapshot({
      headers: [{ name: "X-Trace", value: "one" }, { name: "Cookie", value: "sid=secret", sensitive: true }],
    })
    const configured = snapshot({
      url: "https://example.test/items/{{id}}",
      headers: [],
    })
    const diff = diffRequestSnapshots(configured, prepared, sent, false)
    expect(diff).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "URL", kind: "changed" }),
      expect.objectContaining({ field: "Header · cookie", kind: "added", sent: "••••••" }),
    ]))
  })

  it("redacts sensitive query values until explicitly revealed", () => {
    const request = snapshot({ url: "https://example.test/items?access_token=live&q=public", urlSensitive: true })
    expect(visibleURL(request, false)).not.toContain("live")
    expect(visibleURL(request, false)).not.toContain("public")
    expect(visibleURL(request, true)).toContain("access_token=live")
  })
})
