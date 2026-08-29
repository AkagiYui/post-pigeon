// 编辑态 ⇄ 后端模型的相互转换，以及构造端点数据用的默认值与小工具。
//
// 这些函数没有任何组件状态依赖，从 ApiManagement 拆出来后既能独立测试，
// 也让主组件回到「只管编排」的职责上。
import {
  EndpointAuth,
  EndpointBodyField,
  EndpointHeader,
  EndpointParam,
  Operation,
  ResponseExample,
  ResponseSchema,
} from "@/../bindings/PostPigeon/internal/models"
import {
  type AuthState,
  type BodyFieldRow,
  emptyAuth,
  type HeaderRow,
  type OperationRow,
  type ParamRow,
  type TimingData,
} from "@/components/endpoint/editor-types"
import { type EndpointType, type OperationStage, type OperationType, type ParamLocation } from "@/lib/types"
import { extractPathParams } from "@/lib/utils"

/** 端点默认字段（新字段的默认值集中在此，供各处构造 EndpointData 时展开使用） */
export const endpointDefaults = {
  type: "http" as EndpointType,
  timeoutMode: "inherit",
  sendNoCacheHeaders: null as boolean | null,
  docContent: "", status: "", tags: "", description: "",
  inheritOperations: true, operations: [] as OperationRow[],
  disabledGlobalParams: [] as string[],
  proxyConfig: "",
  tlsConfig: "",
  urlEncoding: "",
  wsProtocolConversion: "",
  streamViewMode: "timeline" as const,
  streamCompletionFormat: "auto" as const,
  streamJSONPath: "",
  streamRenderMarkdown: false,
  inheritedWsProtocolConversion: true,
  examples: [] as ResponseExample[], schemas: [] as ResponseSchema[],
}

/** 解析 JSON 字符串数组；非法或空时返回空数组 */
export function parseStringArray(s?: string | null): string[] {
  if (!s) return []
  try {
    const arr = JSON.parse(s)
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

/** 安全解析 JSON；非字符串（已是对象）时原样返回，失败或空时返回 fallback。
 *  持久化响应的 headers/cookies/actualRequest/timing 均以 JSON 字符串入库，
 *  需在此解析，否则对字符串做 Object.entries 会逐字符渲染出 0/1/2… 的假数据。 */
export function safeParseJSON<T>(s: unknown, fallback: T): T {
  if (s == null) return fallback
  if (typeof s !== "string") return s as T
  if (s === "") return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

/** 将原始计时对象（后端 TimingInfo 或持久化 JSON）映射为 TimingData，缺省补零。 */
export function toTimingData(raw: Partial<TimingData> | null | undefined): TimingData {
  const t = raw || {}
  return {
    total: t.total || 0, dnsLookup: t.dnsLookup || 0, tlsHandshake: t.tlsHandshake || 0,
    tcpConnect: t.tcpConnect || 0, ttfb: t.ttfb || 0,
    stalled: t.stalled || 0, wait: t.wait || 0, download: t.download || 0, reused: !!t.reused,
  }
}

let tempIdCounter = 0
export function generateTempId(): string {
  tempIdCounter++
  return `__unsaved_${tempIdCounter}_${Date.now()}`
}

/** 从操作列表拼接指定阶段的 script 类型脚本（用于未保存请求的直接发送） */
export function deriveScriptFromOps(ops: OperationRow[], stage: OperationStage, fallback: string): string {
  const scripts = (ops || []).filter(o => o.stage === stage && o.enabled && (o.type === "script" || o.type === "libraryScript") && o.script.trim()).map(o => o.script)
  if (scripts.length === 0) return fallback || ""
  return scripts.join("\n")
}

// ---- 编辑态行类型 ⇄ 后端绑定模型的相互转换 ----

export function toParamModels(rows: ParamRow[]): EndpointParam[] {
  return rows.filter(r => r.name.trim()).map(r => new EndpointParam({
    type: r.type || "query", name: r.name, value: r.value, description: r.description, enabled: r.enabled,
    dataType: r.dataType || "string", required: r.required, example: r.example,
  }))
}

export function toHeaderModels(rows: HeaderRow[]): EndpointHeader[] {
  return rows.filter(r => r.name.trim()).map(r => new EndpointHeader({
    name: r.name, value: r.value, description: r.description, enabled: r.enabled,
    required: r.required, example: r.example,
  }))
}

/** 操作行 -> 后端 Operation 模型（按类型序列化 data） */
export function toOperationModels(rows: OperationRow[]): Operation[] {
  return rows.map((r, i) => {
    let data = "{}"
    switch (r.type) {
      case "script": data = JSON.stringify({ script: r.script }); break
      case "libraryScript": data = JSON.stringify({ libraryId: r.libraryId, script: r.script }); break
      case "assert": data = JSON.stringify({ source: r.assertSource, expression: r.assertExpression, comparison: r.assertComparison, target: r.assertTarget }); break
      case "extractVar": data = JSON.stringify({ variable: r.varName, scope: r.varScope, source: r.varSource, expression: r.varExpression }); break
      case "wait": data = JSON.stringify({ milliseconds: r.waitMs }); break
    }
    return new Operation({ stage: r.stage, type: r.type, name: r.name, enabled: r.enabled, sortOrder: i, data })
  })
}

/** 操作数据的 JSON 载荷形状（各类型共用一个宽松结构） */
export interface OperationDataPayload {
  script?: string
  libraryId?: string
  source?: string
  expression?: string
  comparison?: string
  target?: string
  variable?: string
  scope?: string
  milliseconds?: number
}

/** 单条后端 Operation → 编辑态行 */
export function operationToRow(o: Operation): OperationRow {
  let d: OperationDataPayload = {}
  try { d = o.data ? (JSON.parse(o.data) as OperationDataPayload) : {} } catch { d = {} }
  return {
    id: crypto.randomUUID(),
    stage: (o.stage as OperationStage) || "pre",
    type: (o.type as OperationType) || "script",
    name: o.name || "", enabled: o.enabled,
    script: d.script || "", libraryId: d.libraryId || "",
    assertSource: d.source || "responseJson", assertExpression: d.expression || "",
    assertComparison: d.comparison || "eq", assertTarget: d.target || "",
    varName: d.variable || "", varScope: d.scope || "environment",
    varSource: d.source || "responseJson", varExpression: d.expression || "",
    waitMs: d.milliseconds || 1000,
  }
}

export function fromOperationModels(arr?: Operation[] | null): OperationRow[] {
  return (arr || []).map(operationToRow)
}

/** 参数 tab 数字徽标的输入 */
export interface ParamsCountInput {
  /** 接口自己的参数行（含 query 与其它类型） */
  params: { type: string, name: string, enabled: boolean }[]
  /** 接口路径，用于识别 {id} 这类路径参数 */
  path: string
  /** 本接口禁用掉的全局参数名 */
  disabledGlobalParams?: string[]
  /** 从模块/文件夹继承下来的全局 query 参数 */
  globalQueryParams?: { name: string }[]
}

/**
 * 参数 tab 上的数字：所有 query 参数 + 路径参数 + 本接口启用的全局参数。
 *
 * query 参数不按勾选状态过滤——这里回答的是「这个接口定义了多少参数」，
 * 而不是「这次会发出去几个」；勾掉一个参数不该让它从计数里消失。Apifox 也是这么算的
 * （其参数编辑器里每段的 count 就是数组长度本身，不带 enable 过滤）。
 *
 * 全局参数则相反：它默认对所有接口生效，本接口显式禁用掉的就不该再计进来。
 */
export function countParams(input: ParamsCountInput): number {
  const query = input.params.filter(p => p.type === "query" && p.name.trim()).length
  const pathParams = extractPathParams(input.path).length
  const disabled = new Set(input.disabledGlobalParams ?? [])
  const global = (input.globalQueryParams ?? []).filter(g => !disabled.has(g.name)).length
  return query + pathParams + global
}

/** 把一行文件字段打包成后端约定的 value */
function fileFieldValue(row: BodyFieldRow): string {
  if (row.filePath) {
    return JSON.stringify({ fileName: row.fileName || "", path: row.filePath })
  }
  if (row.fileContent) {
    return JSON.stringify({ fileName: row.fileName || "", content: row.fileContent })
  }
  return JSON.stringify({ fileName: row.fileName || "" })
}

export function toBodyFieldModels(rows: BodyFieldRow[]): EndpointBodyField[] {
  return rows.filter(r => r.name.trim()).map(r => new EndpointBodyField({
    name: r.name,
    fieldType: r.fieldType,
    enabled: r.enabled,
    // 文件字段存的是「本机文件的引用」：{fileName, path}，发送时后端才读盘。
    // 历史数据里内联的 base64 原样保留——重新选过文件才会换成路径，
    // 否则打开一个老接口按下保存就会把附件弄丢
    value: r.fieldType === "file" ? fileFieldValue(r) : r.value,
  }))
}

/** 认证数据的 JSON 载荷形状（各类型共用一个宽松结构） */
export interface AuthDataPayload {
  username?: string
  password?: string
  token?: string
  key?: string
  value?: string
  in?: string
  grantType?: string
  tokenUrl?: string
  clientId?: string
  clientSecret?: string
  scope?: string
  clientAuth?: string
}

/**
 * 认证编辑态 → 存储用的 JSON 字符串。
 * 接口级（EndpointAuth）与模块/文件夹级（auth_type + auth_data）共用这一份逻辑，
 * 否则新增一种认证类型就要在两处各改一遍，很容易漏。
 */
export function authStateToData(a: AuthState): string {
  let data = "{}"
  // digest 与 basic 的凭据形态一致，共用同一组输入
  if (a.type === "basic" || a.type === "digest") data = JSON.stringify({ username: a.username, password: a.password })
  else if (a.type === "bearer") data = JSON.stringify({ token: a.token })
  else if (a.type === "apikey") data = JSON.stringify({ key: a.apiKeyKey, value: a.apiKeyValue, in: a.apiKeyIn || "header" })
  else if (a.type === "oauth2") {
    data = JSON.stringify({
      grantType: a.oauthGrantType || "client_credentials",
      tokenUrl: a.oauthTokenUrl,
      clientId: a.oauthClientId,
      clientSecret: a.oauthClientSecret,
      scope: a.oauthScope,
      clientAuth: a.oauthClientAuth || "body",
      // password 授权复用用户名/密码输入
      username: a.username,
      password: a.password,
    })
  }
  // inherit：无数据
  return data
}

export function toAuthModel(a: AuthState): EndpointAuth | null {
  if (!a) return null
  return new EndpointAuth({ type: a.type, data: authStateToData(a) })
}

export function fromParamModels(arr?: EndpointParam[] | null): ParamRow[] {
  return (arr || []).map(p => ({
    id: crypto.randomUUID(), type: (p.type as ParamLocation) || "query", name: p.name, value: p.value,
    description: p.description, enabled: p.enabled, dataType: p.dataType || "string", required: p.required, example: p.example || "",
  }))
}

export function fromHeaderModels(arr?: EndpointHeader[] | null): HeaderRow[] {
  return (arr || []).map(h => ({
    id: crypto.randomUUID(), name: h.name, value: h.value, description: h.description, enabled: h.enabled,
    required: h.required, example: h.example || "",
  }))
}

export function fromBodyFieldModels(arr?: EndpointBodyField[] | null): BodyFieldRow[] {
  return (arr || []).map(f => {
    const fieldType: "text" | "file" = f.fieldType === "file" ? "file" : "text"
    const row: BodyFieldRow = { id: crypto.randomUUID(), name: f.name, value: f.value, fieldType, enabled: f.enabled }
    if (fieldType === "file") {
      try {
        const parsed = JSON.parse(f.value)
        row.fileName = parsed.fileName || ""
        row.filePath = parsed.path || ""
        row.fileContent = parsed.content || ""
        row.value = ""
      } catch {
        // 兼容旧数据：value 直接是文件名
        row.fileName = f.value
        row.fileContent = ""
      }
    }
    return row
  })
}

/** 认证类型 + JSON 数据 → 编辑态。type 不认识时退回 none。 */
export function authDataToState(type?: string | null, data?: string | null): AuthState {
  if (!type || type === "none") return emptyAuth()
  let d: AuthDataPayload = {}
  try { d = data ? (JSON.parse(data) as AuthDataPayload) : {} } catch { d = {} }
  const validTypes = ["basic", "bearer", "apikey", "digest", "oauth2", "inherit"]
  return {
    ...emptyAuth(),
    type: (validTypes.includes(type) ? type : "none") as AuthState["type"],
    username: d.username || "", password: d.password || "", token: d.token || "",
    apiKeyKey: d.key || "", apiKeyValue: d.value || "", apiKeyIn: d.in || "header",
    oauthGrantType: d.grantType || "client_credentials",
    oauthTokenUrl: d.tokenUrl || "",
    oauthClientId: d.clientId || "",
    oauthClientSecret: d.clientSecret || "",
    oauthScope: d.scope || "",
    oauthClientAuth: d.clientAuth || "body",
  }
}

export function fromAuthModel(a?: EndpointAuth | null): AuthState {
  // 后端以「无记录」表示 inherit；none 是一条显式记录，用来停止上级认证继承。
  return authDataToState(a?.type || "inherit", a?.data)
}
