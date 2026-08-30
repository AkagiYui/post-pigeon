import { fireEvent, render, screen } from "@solidjs/testing-library"
import { describe, expect, it } from "vitest"

import type { RequestRun } from "@/../bindings/PostPigeon/internal/models"

import { ActualRequestPanel } from "./ActualRequestPanel"

function requestRun(): RequestRun {
  const emptyBody = { kind: "empty", size: 0, captured: true }
  return {
    id: "run-1",
    moduleId: "module-1",
    endpointId: "endpoint-1",
    outcome: "completed",
    preparedRequest: null,
    selectedAttemptId: "attempt-2",
    error: null,
    startedAt: "2026-08-30T00:00:00Z",
    completedAt: "2026-08-30T00:00:00.020Z",
    createdAt: "2026-08-30T00:00:00Z",
    persisted: false,
    attempts: [
      {
        id: "attempt-1", runId: "run-1", sequence: 0, cause: "initial", parentAttemptId: null,
        request: {
          method: "GET", url: "https://example.test/start", requestTarget: "/start", authority: "example.test",
          protocol: "HTTP/1.1", headers: [{ name: "X-Trace", value: "first" }], body: emptyBody,
          contentLength: 0, captureLevel: "transport_boundary",
        },
        response: { statusCode: 302, status: "302 Found", protocol: "HTTP/1.1" },
        transport: {}, error: null, startedAt: "2026-08-30T00:00:00Z", completedAt: "2026-08-30T00:00:00.010Z",
      },
      {
        id: "attempt-2", runId: "run-1", sequence: 1, cause: "redirect", parentAttemptId: "attempt-1",
        request: {
          method: "GET", url: "https://example.test/final", requestTarget: "/final", authority: "example.test",
          protocol: "HTTP/2.0", headers: [
            { name: "Cookie", value: "a=1", source: "cookie", sensitive: true },
            { name: "Cookie", value: "b=2", source: "cookie", sensitive: true },
          ], body: emptyBody, contentLength: 0, captureLevel: "transport_boundary",
        },
        response: { statusCode: 200, status: "200 OK", protocol: "HTTP/2.0" },
        transport: { protocol: "HTTP/2.0", remoteAddress: "127.0.0.1:443", reused: true },
        error: null, startedAt: "2026-08-30T00:00:00.010Z", completedAt: "2026-08-30T00:00:00.020Z",
      },
    ],
  } as unknown as RequestRun
}

describe("ActualRequestPanel", () => {
  it("shows the selected redirect attempt without collapsing duplicate headers", async () => {
    render(() => <ActualRequestPanel run={requestRun()} />)

    expect(screen.getByText("https://example.test/final")).toBeInTheDocument()
    expect(screen.queryByText("a=1")).not.toBeInTheDocument()
    await fireEvent.click(screen.getByRole("button", { name: /显示敏感值|Reveal sensitive values|actualRequest.revealSensitive/ }))
    expect(await screen.findByText("a=1")).toBeInTheDocument()
    expect(screen.getByText("b=2")).toBeInTheDocument()
    expect(screen.getByText("127.0.0.1:443")).toBeInTheDocument()

    await fireEvent.click(screen.getByRole("tab", { name: /#1/ }))
    expect(screen.getByText("https://example.test/start")).toBeInTheDocument()
    expect(await screen.findByText("first")).toBeInTheDocument()
  })
})
