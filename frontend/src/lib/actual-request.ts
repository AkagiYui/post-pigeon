import type { HTTPHeaderSnapshot, HTTPRequestSnapshot } from "@/../bindings/PostPigeon/internal/models"

export type RequestCodeLanguage =
  | "curl" | "httpie" | "wget" | "powershell"
  | "javascript" | "javascript-axios" | "node"
  | "python" | "python-requests"
  | "go" | "java" | "kotlin" | "csharp" | "php" | "ruby" | "rust" | "swift"

export interface RequestCodeGeneratorMeta {
  value: RequestCodeLanguage
  label: string
  group: string
}

// 展示与生成共用同一份注册表；新增模板只需实现生成函数并登记一次。
export const REQUEST_CODE_GENERATORS: RequestCodeGeneratorMeta[] = [
  { value: "curl", label: "cURL", group: "Shell" },
  { value: "httpie", label: "HTTPie", group: "Shell" },
  { value: "wget", label: "Wget", group: "Shell" },
  { value: "powershell", label: "PowerShell", group: "Shell" },
  { value: "javascript", label: "Fetch", group: "JavaScript" },
  { value: "javascript-axios", label: "Axios", group: "JavaScript" },
  { value: "node", label: "Node.js HTTP", group: "JavaScript" },
  { value: "python", label: "http.client", group: "Python" },
  { value: "python-requests", label: "Requests", group: "Python" },
  { value: "go", label: "net/http", group: "Go" },
  { value: "java", label: "HttpClient", group: "Java" },
  { value: "kotlin", label: "OkHttp", group: "Kotlin" },
  { value: "csharp", label: "HttpClient", group: "C#" },
  { value: "php", label: "cURL", group: "PHP" },
  { value: "ruby", label: "Net::HTTP", group: "Ruby" },
  { value: "rust", label: "Reqwest", group: "Rust" },
  { value: "swift", label: "URLSession", group: "Swift" },
]

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
    case "httpie": return generateHTTPie(request, revealSensitive)
    case "wget": return generateWget(request, revealSensitive)
    case "powershell": return generatePowerShell(request, revealSensitive)
    case "javascript": return generateFetch(request, revealSensitive)
    case "javascript-axios": return generateAxios(request, revealSensitive)
    case "node": return generateNodeHTTP(request, revealSensitive)
    case "python": return generatePython(request, revealSensitive)
    case "python-requests": return generatePythonRequests(request, revealSensitive)
    case "go": return generateGo(request, revealSensitive)
    case "java": return generateJava(request, revealSensitive)
    case "kotlin": return generateKotlin(request, revealSensitive)
    case "csharp": return generateCSharp(request, revealSensitive)
    case "php": return generatePHP(request, revealSensitive)
    case "ruby": return generateRuby(request, revealSensitive)
    case "rust": return generateRust(request, revealSensitive)
    case "swift": return generateSwift(request, revealSensitive)
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

function generateHTTPie(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const args = [`http ${shellWord(request.method)}`, shellQuote(visibleURL(request, revealSensitive))]
  for (const header of request.headers) {
    args.push(shellQuote(`${header.name}:${visibleHeaderValue(header, revealSensitive)}`))
  }
  const body = visibleBodyPreview(request, revealSensitive)
  if (!body) return args.join(" \\\n  ")
  const command = args.join(" \\\n  ")
  if (request.body.previewCodec === "base64") {
    return `printf %s ${shellQuote(body)} | openssl base64 -d -A | ${command}`
  }
  return `printf %s ${shellQuote(body)} | ${command}`
}

function generateWget(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const args = ["wget", `--method=${shellWord(request.method)}`, "-O -"]
  for (const header of request.headers) {
    args.push(`--header=${shellQuote(`${header.name}: ${visibleHeaderValue(header, revealSensitive)}`)}`)
  }
  const body = visibleBodyPreview(request, revealSensitive)
  if (body && request.body.previewCodec !== "base64") args.push(`--body-data=${shellQuote(body)}`)
  args.push(shellQuote(visibleURL(request, revealSensitive)))
  if (body && request.body.previewCodec === "base64") {
    return `request_body=$(mktemp)\nprintf %s ${shellQuote(body)} | openssl base64 -d -A > "$request_body"\n${args.slice(0, -1).join(" \\\n  ")} --body-file="$request_body" ${args.at(-1)}\nrm -f "$request_body"`
  }
  return args.join(" \\\n  ")
}

function generatePowerShell(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const lines = [
    "Add-Type -AssemblyName System.Net.Http",
    "$client = [System.Net.Http.HttpClient]::new()",
    `$request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new(${powerShellQuote(request.method)}), ${powerShellQuote(visibleURL(request, revealSensitive))})`,
  ]
  if (body) {
    lines.push(request.body.previewCodec === "base64"
      ? `$request.Content = [System.Net.Http.ByteArrayContent]::new([Convert]::FromBase64String(${powerShellQuote(body)}))`
      : `$request.Content = [System.Net.Http.ByteArrayContent]::new([Text.Encoding]::UTF8.GetBytes(${powerShellQuote(body)}))`)
  }
  for (const header of request.headers) {
    const name = powerShellQuote(header.name)
    const value = powerShellQuote(visibleHeaderValue(header, revealSensitive))
    lines.push(`if (-not $request.Headers.TryAddWithoutValidation(${name}, ${value}) -and $null -ne $request.Content) { [void]$request.Content.Headers.TryAddWithoutValidation(${name}, ${value}) }`)
  }
  lines.push("$response = $client.SendAsync($request).GetAwaiter().GetResult()")
  lines.push("[int]$response.StatusCode", "$response.Content.ReadAsStringAsync().GetAwaiter().GetResult()")
  return lines.join("\n")
}

function generateAxios(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const lines = [
    "import axios from \"axios\"",
    "",
    "const headers = new axios.AxiosHeaders()",
    ...request.headers.map(header => `headers.set(${JSON.stringify(header.name)}, ${JSON.stringify(visibleHeaderValue(header, revealSensitive))}, false)`),
    "",
    "const response = await axios.request({",
    `  method: ${JSON.stringify(request.method)},`,
    `  url: ${JSON.stringify(visibleURL(request, revealSensitive))},`,
    "  headers,",
  ]
  if (body) lines.push(`  data: ${jsBodyValue(request, body)},`)
  lines.push("  validateStatus: () => true,", "})", "", "console.log(response.status, response.data)")
  return lines.join("\n")
}

function generateNodeHTTP(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const lines = [
    "import http from \"node:http\"",
    "import https from \"node:https\"",
    "",
    `const url = new URL(${JSON.stringify(visibleURL(request, revealSensitive))})`,
    "const transport = url.protocol === \"https:\" ? https : http",
    `const req = transport.request(url, { method: ${JSON.stringify(request.method)} }, (res) => {`,
    "  const chunks = []",
    "  res.on(\"data\", (chunk) => chunks.push(chunk))",
    "  res.on(\"end\", () => console.log(res.statusCode, Buffer.concat(chunks).toString()))",
    "})",
  ]
  for (const header of request.headers) {
    lines.push(`req.appendHeader(${JSON.stringify(header.name)}, ${JSON.stringify(visibleHeaderValue(header, revealSensitive))})`)
  }
  lines.push("req.on(\"error\", console.error)")
  if (body) lines.push(request.body.previewCodec === "base64" ? `req.write(Buffer.from(${JSON.stringify(body)}, "base64"))` : `req.write(${JSON.stringify(body)})`)
  lines.push("req.end()")
  return lines.join("\n")
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

function generatePythonRequests(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const binary = body && request.body.previewCodec === "base64"
  const lines = ["import requests"]
  if (binary) lines.push("import base64")
  lines.push("", "headers = {}")
  for (const header of request.headers) {
    lines.push(`headers[${JSON.stringify(header.name)}] = ${JSON.stringify(visibleHeaderValue(header, revealSensitive))}`)
  }
  if (body) lines.push(binary ? `body = base64.b64decode(${JSON.stringify(body)})` : `body = ${JSON.stringify(body)}.encode("utf-8")`)
  lines.push(`response = requests.request(${JSON.stringify(request.method)}, ${JSON.stringify(visibleURL(request, revealSensitive))}, headers=headers${body ? ", data=body" : ""})`)
  lines.push("print(response.status_code, response.text)")
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

function generateJava(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const binary = body && request.body.previewCodec === "base64"
  const lines = [
    "import java.net.URI;",
    "import java.net.http.HttpClient;",
    "import java.net.http.HttpRequest;",
    "import java.net.http.HttpResponse;",
  ]
  if (binary) lines.push("import java.util.Base64;")
  lines.push("", "var client = HttpClient.newHttpClient();", `var builder = HttpRequest.newBuilder(URI.create(${javaString(visibleURL(request, revealSensitive))}))`)
  for (const header of request.headers) lines.push(`    .header(${javaString(header.name)}, ${javaString(visibleHeaderValue(header, revealSensitive))})`)
  const publisher = !body ? "HttpRequest.BodyPublishers.noBody()" : binary
    ? `HttpRequest.BodyPublishers.ofByteArray(Base64.getDecoder().decode(${javaString(body)}))`
    : `HttpRequest.BodyPublishers.ofString(${javaString(body)})`
  lines.push(`    .method(${javaString(request.method)}, ${publisher});`, "var response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());", "System.out.println(response.statusCode());", "System.out.println(response.body());")
  return lines.join("\n")
}

function generateKotlin(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const bodyExpression = !body ? "null" : request.body.previewCodec === "base64"
    ? `Base64.getDecoder().decode(${kotlinString(body)}).toRequestBody()`
    : `${kotlinString(body)}.toRequestBody()`
  const lines = [
    "import okhttp3.OkHttpClient",
    "import okhttp3.Request",
    "import okhttp3.RequestBody.Companion.toRequestBody",
  ]
  if (body && request.body.previewCodec === "base64") lines.push("import java.util.Base64")
  lines.push("", "val client = OkHttpClient()", `val builder = Request.Builder().url(${kotlinString(visibleURL(request, revealSensitive))})`)
  for (const header of request.headers) lines.push(`    .addHeader(${kotlinString(header.name)}, ${kotlinString(visibleHeaderValue(header, revealSensitive))})`)
  lines.push(`    .method(${kotlinString(request.method)}, ${bodyExpression})`, "client.newCall(builder.build()).execute().use { response ->", "    println(\"${response.code} ${response.body?.string()}\")", "}")
  return lines.join("\n")
}

function generateCSharp(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const lines = [
    "using System.Net.Http;",
    "using System.Text;",
    "",
    "using var client = new HttpClient();",
    `using var request = new HttpRequestMessage(new HttpMethod(${csharpString(request.method)}), ${csharpString(visibleURL(request, revealSensitive))});`,
  ]
  if (body) lines.push(request.body.previewCodec === "base64"
    ? `request.Content = new ByteArrayContent(Convert.FromBase64String(${csharpString(body)}));`
    : `request.Content = new StringContent(${csharpString(body)}, Encoding.UTF8);`)
  for (const header of request.headers) {
    const name = csharpString(header.name)
    const value = csharpString(visibleHeaderValue(header, revealSensitive))
    lines.push(`if (!request.Headers.TryAddWithoutValidation(${name}, ${value})) request.Content?.Headers.TryAddWithoutValidation(${name}, ${value});`)
  }
  lines.push("using var response = await client.SendAsync(request);", "Console.WriteLine($\"{(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}\");")
  return lines.join("\n")
}

function generatePHP(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const lines = ["<?php", `$ch = curl_init(${phpString(visibleURL(request, revealSensitive))});`, "curl_setopt_array($ch, [", "    CURLOPT_RETURNTRANSFER => true,", `    CURLOPT_CUSTOMREQUEST => ${phpString(request.method)},`]
  if (request.headers.length > 0) lines.push(`    CURLOPT_HTTPHEADER => [${request.headers.map(header => phpString(`${header.name}: ${visibleHeaderValue(header, revealSensitive)}`)).join(", ")}],`)
  if (body) lines.push(`    CURLOPT_POSTFIELDS => ${request.body.previewCodec === "base64" ? `base64_decode(${phpString(body)})` : phpString(body)},`)
  lines.push("]);", "$body = curl_exec($ch);", "$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);", "if ($body === false) { throw new RuntimeException(curl_error($ch)); }", "curl_close($ch);", "echo $status, PHP_EOL, $body;")
  return lines.join("\n")
}

function generateRuby(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const lines = ["require 'net/http'", "require 'uri'"]
  if (body && request.body.previewCodec === "base64") lines.push("require 'base64'")
  lines.push("", `uri = URI(${rubyString(visibleURL(request, revealSensitive))})`, `request = Net::HTTPGenericRequest.new(${rubyString(request.method)}, ${rubyBool(!!body)}, true, uri.request_uri})`)
  for (const header of request.headers) lines.push(`request.add_field(${rubyString(header.name)}, ${rubyString(visibleHeaderValue(header, revealSensitive))})`)
  if (body) lines.push(request.body.previewCodec === "base64" ? `request.body = Base64.decode64(${rubyString(body)})` : `request.body = ${rubyString(body)}`)
  lines.push("response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') { |http| http.request(request) }", "puts \"#{response.code} #{response.body}\"")
  return lines.join("\n")
}

function generateRust(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const lines = ["let client = reqwest::Client::new();", `let mut request = client.request(reqwest::Method::from_bytes(${rustString(request.method)}.as_bytes())?, ${rustString(visibleURL(request, revealSensitive))});`]
  for (const header of request.headers) lines.push(`request = request.header(${rustString(header.name)}, ${rustString(visibleHeaderValue(header, revealSensitive))});`)
  if (body) lines.push(request.body.previewCodec === "base64" ? `request = request.body(base64::decode(${rustString(body)})?);` : `request = request.body(${rustString(body)});`)
  lines.push("let response = request.send().await?;", "println!(\"{} {}\", response.status(), response.text().await?);")
  return lines.join("\n")
}

function generateSwift(request: HTTPRequestSnapshot, revealSensitive: boolean) {
  const body = visibleBodyPreview(request, revealSensitive)
  const lines = ["import Foundation", "", `var request = URLRequest(url: URL(string: ${swiftString(visibleURL(request, revealSensitive))})!)`, `request.httpMethod = ${swiftString(request.method)}`]
  for (const header of request.headers) lines.push(`request.addValue(${swiftString(visibleHeaderValue(header, revealSensitive))}, forHTTPHeaderField: ${swiftString(header.name)})`)
  if (body) lines.push(request.body.previewCodec === "base64" ? `request.httpBody = Data(base64Encoded: ${swiftString(body)})` : `request.httpBody = ${swiftString(body)}.data(using: .utf8)`)
  lines.push("let (data, response) = try await URLSession.shared.data(for: request)", "print((response as? HTTPURLResponse)?.statusCode ?? 0)", "print(String(decoding: data, as: UTF8.self))")
  return lines.join("\n")
}

function jsBodyValue(request: HTTPRequestSnapshot, body: string) {
  return request.body.previewCodec === "base64"
    ? `Uint8Array.from(atob(${JSON.stringify(body)}), (char) => char.charCodeAt(0))`
    : JSON.stringify(body)
}

function powerShellQuote(value: string) { return `'${value.replaceAll("'", "''")}'` }
function javaString(value: string) { return JSON.stringify(value) }
function kotlinString(value: string) { return JSON.stringify(value).replaceAll("$", "\\$") }
function csharpString(value: string) { return `@"${value.replaceAll("\"", "\"\"")}"` }
function phpString(value: string) { return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'` }
function rubyString(value: string) { return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'` }
function rustString(value: string) { return JSON.stringify(value) }
function swiftString(value: string) { return JSON.stringify(value) }
function rubyBool(value: boolean) { return value ? "true" : "false" }

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

function shellWord(value: string) {
  return /^[A-Z]+$/.test(value) ? value : shellQuote(value)
}

function pythonBool(value: boolean) {
  return value ? "True" : "False"
}
