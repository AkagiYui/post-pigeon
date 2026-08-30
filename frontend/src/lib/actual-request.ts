import type { HTTPHeaderSnapshot, HTTPRequestSnapshot } from "@/../bindings/PostPigeon/internal/models"

export type RequestCodeLanguage = "curl" | "javascript" | "python" | "go"

export interface RequestDiffRow {
  field: string
  configured: string
  prepared: string
  sent: string
  kind: "added" | "removed" | "changed"
}

export function visibleHeaderValue(header: HTTPHeaderSnapshot, revealSensitive: boolean): string {
  return header.sensitive && !revealSensitive ? "••••••" : header.value
}

export function visibleBodyPreview(request: HTTPRequestSnapshot, revealSensitive: boolean): string {
  const body = request.body
  return body.sensitive && !revealSensitive ? "••••••" : (body.preview || "")
}

export function visibleURL(request: HTTPRequestSnapshot, revealSensitive: boolean): string {
  if (!request.urlSensitive || revealSensitive) return request.url
  try {
    const parsed = new URL(request.url)
    if (parsed.password) parsed.password = "••••••"
    const redacted = new URLSearchParams()
    for (const [key] of parsed.searchParams) redacted.append(key, "••••••")
    parsed.search = redacted.toString()
    return parsed.toString()
  } catch {
    return request.url.replace(/([?&][^=&#]+)=([^&#]*)/g, "$1=••••••")
  }
}

export function visibleRequestTarget(request: HTTPRequestSnapshot, revealSensitive: boolean): string {
  if (!request.urlSensitive || revealSensitive) return request.requestTarget
  return request.requestTarget.replace(/([?&][^=&#]+)=([^&#]*)/g, "$1=••••••")
}

export function serializeHeaders(request: HTTPRequestSnapshot, revealSensitive: boolean): string {
  return request.headers
    .map((header) => `${header.name}: ${visibleHeaderValue(header, revealSensitive)}`)
    .join("\n")
}

// 这是语义化请求摘要，不伪装成 HTTP/1 原始报文（HTTP/2/3 并不存在这样的文本线格式）。
export function serializeRequest(request: HTTPRequestSnapshot, revealSensitive: boolean): string {
  const lines = [`${request.method} ${visibleURL(request, revealSensitive)}`]
  const headers = serializeHeaders(request, revealSensitive)
  if (headers) lines.push(headers)
  const body = visibleBodyPreview(request, revealSensitive)
  if (body) lines.push("", body)
  return lines.join("\n")
}

export function generateRequestCode(
  request: HTTPRequestSnapshot,
  language: RequestCodeLanguage,
  revealSensitive: boolean,
): string {
  switch (language) {
    case "javascript": return generateFetch(request, revealSensitive)
    case "python": return generatePython(request, revealSensitive)
    case "go": return generateGo(request, revealSensitive)
    default: return generateCurl(request, revealSensitive)
  }
}

export function diffRequestSnapshots(
  configured: HTTPRequestSnapshot | null | undefined,
  prepared: HTTPRequestSnapshot | null | undefined,
  sent: HTTPRequestSnapshot | null | undefined,
  revealSensitive: boolean,
): RequestDiffRow[] {
  if (!configured || !prepared || !sent) return []
  const rows: RequestDiffRow[] = []
  addDiff(rows, "Method", configured.method, prepared.method, sent.method)
  addDiff(rows, "URL", visibleURL(configured, revealSensitive), visibleURL(prepared, revealSensitive), visibleURL(sent, revealSensitive))
  addDiff(rows, "Authority", configured.authority, prepared.authority, sent.authority)
  addDiff(rows, "Request target", visibleRequestTarget(configured, revealSensitive), visibleRequestTarget(prepared, revealSensitive), visibleRequestTarget(sent, revealSensitive))

  const configuredHeaders = groupHeaders(configured.headers, revealSensitive)
  const beforeHeaders = groupHeaders(prepared.headers, revealSensitive)
  const afterHeaders = groupHeaders(sent.headers, revealSensitive)
  const names = [...new Set([...configuredHeaders.keys(), ...beforeHeaders.keys(), ...afterHeaders.keys()])].sort()
  for (const name of names) {
    addDiff(rows, `Header · ${name}`, configuredHeaders.get(name) || "", beforeHeaders.get(name) || "", afterHeaders.get(name) || "")
  }
  addDiff(rows, "Body", bodyComparisonValue(configured, revealSensitive), bodyComparisonValue(prepared, revealSensitive), bodyComparisonValue(sent, revealSensitive))
  addDiff(rows, "Content length", String(configured.contentLength), String(prepared.contentLength), String(sent.contentLength))
  return rows
}

function bodyComparisonValue(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const preview = visibleBodyPreview(request, revealSensitive)
  if (preview) return preview
  return (request.body.parts || []).map((part) => {
    const value = part.sensitive && !revealSensitive ? "••••••" : (part.preview || "")
    const file = part.fileName ? ` @${part.fileName}` : ""
    return `${part.name}${file}: ${value}`
  }).join("\n")
}

function addDiff(rows: RequestDiffRow[], field: string, configured: string, prepared: string, sent: string) {
  if (configured === prepared && prepared === sent) return
  rows.push({
    field,
    configured,
    prepared,
    sent,
    kind: !prepared ? "added" : !sent ? "removed" : "changed",
  })
}

function groupHeaders(headers: HTTPHeaderSnapshot[], revealSensitive: boolean) {
  const grouped = new Map<string, string[]>()
  for (const header of headers) {
    const key = header.name.toLowerCase()
    const group = grouped.get(key) || []
    group.push(visibleHeaderValue(header, revealSensitive))
    grouped.set(key, group)
  }
  return new Map([...grouped.entries()].map(([key, values]) => [key, values.join("\n")]))
}

function generateCurl(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const args = [`curl -X ${shellWord(request.method)}`, shellQuote(visibleURL(request, revealSensitive))]
  for (const header of request.headers) {
    args.push(`-H ${shellQuote(`${header.name}: ${visibleHeaderValue(header, revealSensitive)}`)}`)
  }
  const body = visibleBodyPreview(request, revealSensitive)
  if (body) {
    if (request.body.previewCodec === "base64") {
      return `printf %s ${shellQuote(body)} | openssl base64 -d -A | ${args.join(" \\\n  ")} \\\n  --data-binary @-`
    }
    args.push(`--data-binary ${shellQuote(body)}`)
  }
  return args.join(" \\\n  ")
}

function generateFetch(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const headers = request.headers.map((header) => [header.name, visibleHeaderValue(header, revealSensitive)])
  const body = visibleBodyPreview(request, revealSensitive)
  const fields = [
    `  method: ${JSON.stringify(request.method)},`,
    `  headers: ${JSON.stringify(headers, null, 2).replaceAll("\n", "\n  ")},`,
  ]
  if (body) {
    const value = request.body.previewCodec === "base64"
      ? `Uint8Array.from(atob(${JSON.stringify(body)}), (char) => char.charCodeAt(0))`
      : JSON.stringify(body)
    fields.push(`  body: ${value},`)
  }
  return `const response = await fetch(${JSON.stringify(visibleURL(request, revealSensitive))}, {\n${fields.join("\n")}\n})\n\nconsole.log(response.status, await response.text())`
}

function generatePython(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const binary = body && request.body.previewCodec === "base64"
  const imports = ["import http.client", "import urllib.parse"]
  if (binary) imports.push("import base64")
  const hasHost = request.headers.some((header) => header.name.toLowerCase() === "host")
  const hasAcceptEncoding = request.headers.some((header) => header.name.toLowerCase() === "accept-encoding")
  const lines = [
    ...imports,
    "",
    `url = urllib.parse.urlsplit(${JSON.stringify(visibleURL(request, revealSensitive))})`,
    "connection_class = http.client.HTTPSConnection if url.scheme == \"https\" else http.client.HTTPConnection",
    "connection = connection_class(url.hostname, url.port)",
  ]
  if (body) {
    lines.push(binary
      ? `body = base64.b64decode(${JSON.stringify(body)})`
      : `body = ${JSON.stringify(body)}.encode("utf-8")`)
  }
  lines.push(
    `connection.putrequest(${JSON.stringify(request.method)}, urllib.parse.urlunsplit(("", "", url.path or "/", url.query, "")), skip_host=${pythonBool(hasHost)}, skip_accept_encoding=${pythonBool(hasAcceptEncoding)})`,
  )
  for (const header of request.headers) {
    lines.push(`connection.putheader(${JSON.stringify(header.name)}, ${JSON.stringify(visibleHeaderValue(header, revealSensitive))})`)
  }
  lines.push(`connection.endheaders(${body ? "body" : ""})`, "response = connection.getresponse()", "print(response.status, response.read().decode(errors=\"replace\"))")
  return lines.join("\n")
}

function generateGo(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const binary = body && request.body.previewCodec === "base64"
  const imports = ["fmt", "io", "net/http"]
  if (body) imports.push(binary ? "bytes" : "strings")
  if (binary) imports.push("encoding/base64")
  const lines = [
    "package main",
    "",
    "import (",
    ...imports.sort().map((name) => `\t${JSON.stringify(name)}`),
    ")",
    "",
    "func main() {",
  ]
  let reader = "nil"
  if (binary) {
    lines.push(`\tbody, err := base64.StdEncoding.DecodeString(${JSON.stringify(body)})`, "\tif err != nil { panic(err) }")
    reader = "bytes.NewReader(body)"
  } else if (body) {
    reader = `strings.NewReader(${JSON.stringify(body)})`
  }
  lines.push(`\treq, err := http.NewRequest(${JSON.stringify(request.method)}, ${JSON.stringify(visibleURL(request, revealSensitive))}, ${reader})`, "\tif err != nil { panic(err) }")
  for (const header of request.headers) {
    lines.push(`\treq.Header.Add(${JSON.stringify(header.name)}, ${JSON.stringify(visibleHeaderValue(header, revealSensitive))})`)
  }
  lines.push(
    "\tresp, err := http.DefaultClient.Do(req)",
    "\tif err != nil { panic(err) }",
    "\tdefer resp.Body.Close()",
    "\tresponseBody, err := io.ReadAll(resp.Body)",
    "\tif err != nil { panic(err) }",
    "\tfmt.Println(resp.Status, string(responseBody))",
    "}",
  )
  return lines.join("\n")
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

function shellWord(value: string) {
  return /^[A-Z]+$/.test(value) ? value : shellQuote(value)
}

function pythonBool(value: boolean) {
  return value ? "True" : "False"
}
