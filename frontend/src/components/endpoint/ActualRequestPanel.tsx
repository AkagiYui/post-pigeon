import { createEffect, createMemo, createSignal, For, type JSX, Show } from "solid-js"

import type {
  HTTPBodyPart,
  HTTPBodySnapshot,
  HTTPHeaderSnapshot,
  HTTPRequestSnapshot,
  RequestAttempt,
  RequestRun,
} from "@/../bindings/PostPigeon/internal/models"
import { CodeEditor, type CodeLanguage } from "@/components/ui/code-editor"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import {
  diffRequestSnapshots,
  generateRequestCode,
  REQUEST_CODE_GENERATORS,
  type RequestCodeLanguage,
  serializeHeaders,
  serializeRequest,
  visibleBodyPreview,
  visibleHeaderValue,
  visibleRequestTarget,
  visibleURL,
} from "@/lib/actual-request"
import { copyText } from "@/lib/clipboard"
import { formatSize } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toastError, toastSuccess } from "@/stores/toast"

export interface ActualRequestPanelProps {
  run?: RequestRun | null
  legacyRequest?: { method: string; url: string; headers: Record<string, string | undefined>; body: string } | null
}

const causeKey: Record<string, string> = {
  initial: "actualRequest.cause.initial",
  redirect: "actualRequest.cause.redirect",
  digest: "actualRequest.cause.digest",
  retry: "actualRequest.cause.retry",
  "sse_reconnect": "actualRequest.cause.sseReconnect",
  "websocket_handshake": "actualRequest.cause.websocketHandshake",
}

function causeLabel(cause: string) {
  return t(causeKey[cause] || "actualRequest.cause.unknown", { cause })
}

function requestLanguage(body: HTTPBodySnapshot): CodeLanguage {
  switch (body.kind) {
    case "json": return "json"
    case "xml": return "xml"
    default: return "text"
  }
}

function visiblePartPreview(part: HTTPBodyPart, body: HTTPBodySnapshot, revealSensitive: boolean) {
  const hasSpecificSensitivePart = body.parts?.some((item) => item.sensitive)
  const hidden = part.sensitive || (body.sensitive && !hasSpecificSensitivePart)
  return hidden && !revealSensitive ? "••••••" : (part.preview || "")
}

function durationMs(attempt: RequestAttempt) {
  if (!attempt.completedAt) return null
  const start = Date.parse(attempt.startedAt)
  const end = Date.parse(attempt.completedAt)
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : null
}

function legacySnapshot(props: ActualRequestPanelProps): HTTPRequestSnapshot | null {
  const legacy = props.legacyRequest
  if (!legacy) return null
  return {
    method: legacy.method,
    url: legacy.url,
    requestTarget: "",
    authority: "",
    protocol: "",
    headers: Object.entries(legacy.headers || {}).map(([name, value]) => ({ name, value: value || "", source: "legacy" })),
    body: {
      kind: legacy.body ? "text" : "empty",
      mediaType: "",
      charset: "",
      size: new TextEncoder().encode(legacy.body || "").length,
      sha256: "",
      preview: legacy.body || "",
      previewCodec: "utf8",
      truncated: false,
      captured: true,
      parts: [],
    },
    contentLength: -1,
    transferEncoding: [],
    captureLevel: "legacy",
  }
}

export function ActualRequestPanel(props: ActualRequestPanelProps) {
  const [selectedAttemptId, setSelectedAttemptId] = createSignal("")
  const [view, setView] = createSignal<"details" | "compare" | "code">("details")
  const [codeLanguage, setCodeLanguage] = createSignal<RequestCodeLanguage>("curl")
  const [revealSensitive, setRevealSensitive] = createSignal(false)
  const attempts = createMemo(() => props.run?.attempts || [])

  createEffect(() => {
    const run = props.run
    const available = run?.attempts || []
    const preferred = run?.selectedAttemptId
    if (preferred && available.some((attempt) => attempt.id === preferred)) {
      setSelectedAttemptId(preferred)
    } else {
      setSelectedAttemptId(available.at(-1)?.id || "")
    }
  })

  const selectedAttempt = createMemo(() =>
    attempts().find((attempt) => attempt.id === selectedAttemptId()) || attempts().at(-1) || null,
  )
  const request = createMemo(() => selectedAttempt()?.request || props.run?.preparedRequest || legacySnapshot(props))
  const body = createMemo(() => request()?.body)
  const hasSensitive = createMemo(() => {
    const snapshot = request()
    return !!snapshot && (snapshot.urlSensitive || snapshot.body.sensitive || snapshot.headers.some((header) => header.sensitive))
  })
  const requestDiff = createMemo(() => diffRequestSnapshots(
    props.run?.configuredRequest,
    props.run?.preparedRequest,
    selectedAttempt()?.request,
    revealSensitive(),
  ))
  const generatedCode = createMemo(() => {
    const snapshot = request()
    return snapshot ? generateRequestCode(snapshot, codeLanguage(), revealSensitive()) : ""
  })

  const copy = async (value: string) => {
    try {
      await copyText(value)
      toastSuccess(t("common.copied"))
    } catch (error) {
      toastError(error, "error.op.clipboardFailed")
    }
  }

  return (
    <div class="flex h-full min-h-0 flex-col">
      <Show when={props.run}>
        {(run) => (
          <div class="shrink-0 border-b border-border bg-surface-alt px-3 py-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                run().outcome === "completed" ? "bg-green-500/15 text-green-600 dark:text-green-400" :
                  run().outcome === "streaming" || run().outcome === "running" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
                    run().outcome === "skipped" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      "bg-red-500/15 text-red-600 dark:text-red-400",
              )}>
                {t(`actualRequest.outcome.${run().outcome}`)}
              </span>
              <span class="text-xs text-muted-foreground">
                {t("actualRequest.attemptCount", { count: run().attempts.length })}
              </span>
              <Show when={run().error?.message}>
                <span class="min-w-0 break-all text-xs text-red-600 dark:text-red-400">{run().error?.message}</span>
              </Show>
            </div>
          </div>
        )}
      </Show>

      <Show when={attempts().length > 0}>
        <div class="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-3 py-2" role="tablist">
          <For each={attempts()}>
            {(attempt) => (
              <button
                type="button"
                role="tab"
                aria-selected={selectedAttemptId() === attempt.id}
                class={cn(
                  "shrink-0 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                  selectedAttemptId() === attempt.id
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setSelectedAttemptId(attempt.id)}
              >
                <span class="font-medium">#{attempt.sequence + 1} {causeLabel(attempt.cause)}</span>
                <span class="ml-2 tabular-nums opacity-80">
                  {attempt.response?.statusCode || (attempt.error ? t("response.failed") : "…")}
                </span>
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show when={request()}>
        {(snapshot) => (
          <div class="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-3 py-1.5">
            <ToolButton active={view() === "details"} onClick={() => setView("details")}>{t("actualRequest.details")}</ToolButton>
            <ToolButton active={view() === "compare"} disabled={!props.run?.configuredRequest || !props.run?.preparedRequest || !selectedAttempt()} onClick={() => setView("compare")}>{t("actualRequest.compare")}</ToolButton>
            <ToolButton active={view() === "code"} onClick={() => setView("code")}>{t("actualRequest.code")}</ToolButton>
            <span class="mx-1 h-4 border-l border-border" />
            <ToolButton onClick={() => void copy(visibleURL(snapshot(), revealSensitive()))}>{t("actualRequest.copyUrl")}</ToolButton>
            <ToolButton onClick={() => void copy(serializeRequest(snapshot(), revealSensitive()))}>{t("actualRequest.copyRequest")}</ToolButton>
            <Show when={hasSensitive()}>
              <ToolButton active={revealSensitive()} onClick={() => setRevealSensitive((value) => !value)}>
                {revealSensitive() ? t("actualRequest.hideSensitive") : t("actualRequest.revealSensitive")}
              </ToolButton>
            </Show>
          </div>
        )}
      </Show>

      <div class="flex-1 overflow-auto">
        <Show
          when={request()}
          fallback={<div class="p-4 text-sm text-muted-foreground">{t("actualRequest.notCaptured")}</div>}
        >
          {(snapshot) => (
            <Show
              when={view() === "details"}
              fallback={
                <Show when={view() === "compare"} fallback={
                  <CodeGeneration
                    language={codeLanguage()}
                    onLanguageChange={setCodeLanguage}
                    code={generatedCode()}
                    sensitiveHidden={hasSensitive() && !revealSensitive()}
                    truncated={!!snapshot().body.truncated}
                    bodyUnavailable={!snapshot().body.captured}
                    onCopy={() => void copy(generatedCode())}
                  />
                }>
                  <RequestComparison rows={requestDiff()} />
                </Show>
              }
            >
              <div class="flex flex-col gap-4 p-3">
                <Show when={attempts().length === 0 && props.run?.outcome === "skipped"}>
                  <div class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    {t("actualRequest.preparedNotSent")}
                  </div>
                </Show>

                <section class="overflow-hidden rounded-md border border-border">
                  <div class="flex items-start gap-2 bg-surface-alt px-3 py-2">
                    <span class="shrink-0 rounded bg-accent-muted px-2 py-0.5 text-xs font-bold text-accent">
                      {snapshot().method || "—"}
                    </span>
                    <code class={cn("min-w-0 flex-1 break-all text-sm text-foreground", snapshot().urlSensitive && !revealSensitive() && "italic text-muted-foreground")}>{visibleURL(snapshot(), revealSensitive()) || "—"}</code>
                  </div>
                  <div class="grid gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-xs sm:grid-cols-2">
                    <Meta label={t("actualRequest.requestTarget")} value={visibleRequestTarget(snapshot(), revealSensitive())} mono />
                    <Meta label={t("actualRequest.authority")} value={snapshot().authority} mono />
                    <Meta label={t("actualRequest.protocol")} value={snapshot().protocol} />
                    <Meta label={t("actualRequest.captureLevel")} value={snapshot().captureLevel} />
                  </div>
                </section>

                <Section
                  title={t("actualRequest.headers")}
                  count={snapshot().headers.length}
                  action={<ToolButton onClick={() => void copy(serializeHeaders(snapshot(), revealSensitive()))}>{t("common.copy")}</ToolButton>}
                >
                  <Table
                    columns={[
                      { header: t("common.name"), render: (header: HTTPHeaderSnapshot) => <code class="text-xs">{header.name}</code> },
                      { header: t("common.value"), render: (header: HTTPHeaderSnapshot) => (
                        <div class="flex min-w-0 items-center gap-2">
                          <code class={cn("break-all text-xs", (header.redacted || (header.sensitive && !revealSensitive())) && "italic text-muted-foreground")}>{visibleHeaderValue(header, revealSensitive())}</code>
                          <Show when={header.sensitive}><span class="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">{t("actualRequest.sensitive")}</span></Show>
                        </div>
                      ) },
                      { header: t("actualRequest.source"), render: (header: HTTPHeaderSnapshot) => <span class="text-xs text-muted-foreground">{header.source || "—"}</span> },
                    ]}
                    data={snapshot().headers}
                    compact
                    emptyText={t("actualRequest.noHeaders")}
                  />
                </Section>

                <Show when={body()}>
                  {(requestBody) => (
                    <Section
                      title={t("actualRequest.body")}
                      action={<ToolButton onClick={() => void copy(visibleBodyPreview(snapshot(), revealSensitive()))}>{t("common.copy")}</ToolButton>}
                    >
                      <div class="flex flex-wrap gap-x-4 gap-y-1 border-b border-border px-3 py-2 text-xs text-muted-foreground">
                        <span>{requestBody().kind}</span>
                        <Show when={requestBody().mediaType}><span>{requestBody().mediaType}</span></Show>
                        <Show when={requestBody().charset}><span>{requestBody().charset}</span></Show>
                        <span>{formatSize(requestBody().size)}</span>
                        <Show when={requestBody().sha256}><span class="font-mono">SHA-256 {requestBody().sha256}</span></Show>
                        <Show when={requestBody().truncated}><span class="text-amber-600 dark:text-amber-400">{t("actualRequest.previewTruncated")}</span></Show>
                        <Show when={!requestBody().captured}><span class="text-amber-600 dark:text-amber-400">{t("actualRequest.bodyNotCaptured")}</span></Show>
                      </div>
                      <Show
                        when={(requestBody().parts?.length || 0) > 0}
                        fallback={
                          <Show
                            when={requestBody().preview}
                            fallback={<div class="px-3 py-4 text-sm text-muted-foreground">{t("actualRequest.emptyBody")}</div>}
                          >
                            <div class="h-48 min-h-24">
                              <CodeEditor
                                value={visibleBodyPreview(snapshot(), revealSensitive())}
                                language={requestBody().previewCodec === "base64" ? "text" : requestLanguage(requestBody())}
                                readOnly
                                class="h-full rounded-none border-0 bg-transparent"
                              />
                            </div>
                            <Show when={requestBody().previewCodec === "base64"}>
                              <div class="border-t border-border px-3 py-1 text-[11px] text-muted-foreground">{t("actualRequest.base64Preview")}</div>
                            </Show>
                          </Show>
                        }
                      >
                        <Table
                          columns={[
                            { header: t("common.name"), render: (part: HTTPBodyPart) => <code class="text-xs">{part.name}</code> },
                            { header: t("actualRequest.file"), render: (part: HTTPBodyPart) => <span class="text-xs">{part.fileName || "—"}</span> },
                            { header: t("actualRequest.contentType"), render: (part: HTTPBodyPart) => <span class="text-xs text-muted-foreground">{part.contentType || "—"}</span> },
                            { header: t("response.size"), render: (part: HTTPBodyPart) => <span class="text-xs tabular-nums">{formatSize(part.size)}</span> },
                            { header: t("common.value"), render: (part: HTTPBodyPart) => (
                              <code class={cn("break-all text-xs", part.sensitive && !revealSensitive() && "italic text-muted-foreground")}>
                                {visiblePartPreview(part, requestBody(), revealSensitive())}
                              </code>
                            ) },
                          ]}
                          data={requestBody().parts || []}
                          compact
                        />
                      </Show>
                    </Section>
                  )}
                </Show>

                <Show when={selectedAttempt()}>
                  {(attempt) => (
                    <>
                      <Section title={t("actualRequest.result")}>
                        <div class="grid gap-x-4 gap-y-1 px-3 py-2 text-xs sm:grid-cols-2">
                          <Meta label={t("actualRequest.cause")} value={causeLabel(attempt().cause)} />
                          <Meta label={t("actualRequest.duration")} value={durationMs(attempt()) === null ? "—" : `${durationMs(attempt())} ms`} />
                          <Meta label={t("response.status")} value={attempt().response?.status || (attempt().error?.message ?? "—")} />
                          <Meta label={t("actualRequest.protocol")} value={attempt().response?.protocol} />
                        </div>
                      </Section>
                      <Section title={t("actualRequest.transport")}>
                        <div class="grid gap-x-4 gap-y-1 px-3 py-2 text-xs sm:grid-cols-2">
                          <Meta label={t("actualRequest.localAddress")} value={attempt().transport.localAddress} mono />
                          <Meta label={t("actualRequest.remoteAddress")} value={attempt().transport.remoteAddress} mono />
                          <Meta label={t("actualRequest.connection")} value={attempt().transport.reused ? t("actualRequest.reused") : t("actualRequest.newConnection")} />
                          <Meta label="TLS" value={[attempt().transport.tlsVersion, attempt().transport.tlsCipher].filter(Boolean).join(" / ")} />
                          <Meta label="SNI" value={attempt().transport.serverName} mono />
                        </div>
                      </Section>
                    </>
                  )}
                </Show>
              </div>
            </Show>
          )}
        </Show>
      </div>
    </div>
  )
}

function Section(props: { title: string; count?: number; action?: JSX.Element; children: JSX.Element }) {
  return (
    <section class="overflow-hidden rounded-md border border-border">
      <div class="flex items-center gap-2 border-b border-border bg-surface-alt px-3 py-1.5 text-xs font-semibold text-foreground">
        <span>{props.title}</span>
        <Show when={props.count !== undefined}><span class="font-normal text-muted-foreground">{props.count}</span></Show>
        <Show when={props.action}><span class="ml-auto">{props.action}</span></Show>
      </div>
      {props.children}
    </section>
  )
}

function ToolButton(props: { active?: boolean; disabled?: boolean; onClick: () => void; children: JSX.Element }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      class={cn(
        "rounded-md px-2 py-1 text-xs transition-colors",
        props.active ? "bg-accent-muted text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        props.disabled && "cursor-not-allowed opacity-40",
      )}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

function RequestComparison(props: { rows: ReturnType<typeof diffRequestSnapshots> }) {
  return (
    <div class="p-3">
      <Show
        when={props.rows.length > 0}
        fallback={<div class="rounded-md border border-border px-3 py-6 text-center text-sm text-muted-foreground">{t("actualRequest.noDifferences")}</div>}
      >
        <div class="mb-2 text-xs text-muted-foreground">{t("actualRequest.compareHint")}</div>
        <Table
          columns={[
            { header: t("actualRequest.field"), field: "field" },
            { header: t("actualRequest.configured"), render: (row) => <pre class="max-w-md whitespace-pre-wrap break-all font-mono text-xs">{row.configured || "—"}</pre> },
            { header: t("actualRequest.prepared"), render: (row) => <pre class="max-w-md whitespace-pre-wrap break-all font-mono text-xs">{row.prepared || "—"}</pre> },
            { header: t("actualRequest.sent"), render: (row) => <pre class="max-w-md whitespace-pre-wrap break-all font-mono text-xs">{row.sent || "—"}</pre> },
          ]}
          data={props.rows}
          compact
        />
      </Show>
    </div>
  )
}

function CodeGeneration(props: {
  language: RequestCodeLanguage
  onLanguageChange: (language: RequestCodeLanguage) => void
  code: string
  sensitiveHidden: boolean
  truncated: boolean
  bodyUnavailable: boolean
  onCopy: () => void
}) {
  return (
    <div class="flex h-full min-h-0 flex-col">
      <div class="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-3 py-2">
        <Select
          value={props.language}
          onChange={(value) => props.onLanguageChange(value as RequestCodeLanguage)}
          options={REQUEST_CODE_GENERATORS.map(generator => ({
            value: generator.value,
            label: `${generator.group} · ${generator.label}`,
          }))}
          size="sm"
          class="w-52"
          aria-label={t("actualRequest.code")}
        />
        <span class="ml-auto"><ToolButton onClick={props.onCopy}>{t("actualRequest.copyCode")}</ToolButton></span>
      </div>
      <Show when={props.sensitiveHidden || props.truncated || props.bodyUnavailable}>
        <div class="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          <Show when={props.sensitiveHidden}><span>{t("actualRequest.codegenRedacted")}</span></Show>
          <Show when={props.sensitiveHidden && props.truncated}><span> · </span></Show>
          <Show when={props.truncated}><span>{t("actualRequest.codegenTruncated")}</span></Show>
          <Show when={(props.sensitiveHidden || props.truncated) && props.bodyUnavailable}><span> · </span></Show>
          <Show when={props.bodyUnavailable}><span>{t("actualRequest.codegenBodyUnavailable")}</span></Show>
        </div>
      </Show>
      <div class="flex-1 min-h-0">
        <CodeEditor value={props.code} language={codeLanguageForGenerator(props.language)} readOnly class="h-full rounded-none border-0 bg-transparent" />
      </div>
    </div>
  )
}

function codeLanguageForGenerator(language: RequestCodeLanguage): CodeLanguage {
  if (["javascript", "javascript-axios", "node"].includes(language)) return "javascript"
  return "text"
}

function Meta(props: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div class="flex min-w-0 gap-2">
      <span class="shrink-0 text-muted-foreground">{props.label}</span>
      <span class={cn("min-w-0 break-all text-foreground", props.mono && "font-mono")}>{props.value || "—"}</span>
    </div>
  )
}
