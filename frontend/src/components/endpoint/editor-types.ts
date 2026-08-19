// 接口编辑器的纯数据类型：编辑态行结构、响应数据、脚本结果等。
//
// 这些类型此前和 EndpointDetail 组件写在一个文件里，任何只想用类型的模块
// （包括单元测试）都会顺带把整棵组件树连同图标库一起拉进来。抽出来后，
// 数据层可以脱离渲染层单独引用与测试。
import type { ActualRequestInfo, CookieInfo, ResponseExample, ResponseSchema } from "@/../bindings/PostPigeon/internal/models"
import type { AuthType, BodyType, EndpointType, HTTPMethod, OperationStage, OperationType, ParamLocation } from "@/lib/types"

export interface EndpointData {
  id: string
  name: string
  /** 端点类型：http / doc / websocket / sse */
  type: EndpointType
  method: HTTPMethod
  path: string
  bodyType: BodyType
  bodyContent: string
  contentType: string
  timeout: number
  followRedirects: boolean
  baseUrl: string
  params: ParamRow[]
  headers: HeaderRow[]
  bodyFields: BodyFieldRow[]
  auth: AuthState
  /** 前置脚本（请求发送前执行） */
  preRequestScript: string
  /** 后置脚本（响应返回后执行） */
  postResponseScript: string
  /** 文档正文（type=doc 时的 Markdown） */
  docContent: string
  /** 接口状态：developing / released / deprecated */
  status: string
  /** 标签（JSON 字符串数组） */
  tags: string
  /** 接口描述 */
  description: string
  /** 是否继承上级前置/后置操作 */
  inheritOperations: boolean
  /** 本接口禁用的全局(模块) query 参数名列表（仅影响本接口） */
  disabledGlobalParams: string[]
  /** 接口级代理选择（EndpointProxy 的 JSON，空表示 inherit 跟随项目） */
  proxyConfig: string
  /** 接口级 TLS 选择（EndpointTLS 的 JSON，空表示 inherit 跟随项目） */
  tlsConfig: string
  /** 前置/后置操作列表 */
  operations: OperationRow[]
  /** 响应示例（不在此编辑，仅透传保存以免丢失） */
  examples: ResponseExample[]
  /** 响应定义（不在此编辑，仅透传保存以免丢失） */
  schemas: ResponseSchema[]
}

/** 查询参数行（前端编辑态，id 仅用于列表 key，不入库） */
export interface ParamRow {
  id: string
  /** 参数位置：query / path / cookie */
  type: ParamLocation
  name: string
  value: string
  description: string
  enabled: boolean
  /** 值类型：string / integer / number / boolean / ... */
  dataType: string
  /** 是否必填 */
  required: boolean
  /** 示例值 */
  example: string
}

/** 请求头行 */
export interface HeaderRow {
  id: string
  name: string
  value: string
  description: string
  enabled: boolean
  required: boolean
  example: string
}

/** 前置/后置操作行 */
export interface OperationRow {
  id: string
  stage: OperationStage
  type: OperationType
  name: string
  enabled: boolean
  // script / libraryScript
  script: string
  libraryId: string
  // assert
  assertSource: string
  assertExpression: string
  assertComparison: string
  assertTarget: string
  // extractVar
  varName: string
  varScope: string
  varSource: string
  varExpression: string
  // wait
  waitMs: number
}

/** 创建一个空操作行 */
export function emptyOperation(stage: OperationStage, type: OperationType = "script"): OperationRow {
  return {
    id: crypto.randomUUID(), stage, type, name: "", enabled: true,
    script: "", libraryId: "",
    assertSource: "responseJson", assertExpression: "", assertComparison: "eq", assertTarget: "",
    varName: "", varScope: "environment", varSource: "responseJson", varExpression: "",
    waitMs: 1000,
  }
}

/** 请求体字段行（form-data / x-www-form-urlencoded） */
export interface BodyFieldRow {
  id: string
  name: string
  value: string
  fieldType: "text" | "file"
  enabled: boolean
  /** 文件名（fieldType=file 时有效） */
  fileName?: string
  /** 文件内容 base64（fieldType=file 时有效，不含 data: 前缀） */
  fileContent?: string
}

/** 认证编辑态 */
export interface AuthState {
  type: AuthType
  /** basic 与 digest 共用用户名/密码 */
  username: string
  password: string
  token: string
  /** API Key 认证 */
  apiKeyKey: string
  apiKeyValue: string
  apiKeyIn: string // header / query / cookie
  /** OAuth 2.0（只支持无需浏览器跳转的两种授权） */
  oauthGrantType: string // client_credentials / password
  oauthTokenUrl: string
  oauthClientId: string
  oauthClientSecret: string
  oauthScope: string
  oauthClientAuth: string // body / basic
}

/** 默认空认证 */
export function emptyAuth(): AuthState {
  return {
    type: "none", username: "", password: "", token: "",
    apiKeyKey: "", apiKeyValue: "", apiKeyIn: "header",
    oauthGrantType: "client_credentials", oauthTokenUrl: "",
    oauthClientId: "", oauthClientSecret: "", oauthScope: "", oauthClientAuth: "body",
  }
}

/** 脚本控制台输出 */
export interface ScriptLog {
  level: string
  message: string
}

/** 单条断言结果 */
export interface ScriptTest {
  name: string
  passed: boolean
  error?: string
}

/** 单个脚本（前置或后置）的执行结果 */
export interface ScriptRunResult {
  executed: boolean
  logs: ScriptLog[]
  tests: ScriptTest[]
  error?: string
  duration: number
}

// 下面这些字段的可空性刻意与 Wails 绑定生成的类型一致，
// 否则每个调用点都得写一次 as any 把绑定值塞进来。

/** 前置/后置脚本执行结果集合 */
export interface ScriptResultsData {
  preRequest?: ScriptRunResult | null
  postResponse?: ScriptRunResult | null
}

/** 请求各阶段计时（毫秒，含亚毫秒精度） */
export interface TimingData {
  total: number
  dnsLookup: number
  tlsHandshake: number
  tcpConnect: number
  ttfb: number
  /** 准备/阻塞：请求开始 → 开始建立连接 */
  stalled: number
  /** 等待：请求发出 → 收到首字节 */
  wait: number
  /** 下载内容：首字节 → 读取完成 */
  download: number
  /** 连接是否复用（DNS/TCP/TLS 命中缓存） */
  reused: boolean
}

export interface ResponseData {
  statusCode: number
  timing: TimingData
  size: number
  body: string
  /** 原始响应字节 base64，供按字符集解码（可能缺省，如历史记录） */
  rawBody?: string
  headers: Record<string, string[] | undefined>
  cookies: CookieInfo[]
  contentType: string
  actualRequest: ActualRequestInfo | null
  /** 前置/后置脚本执行结果（无脚本时缺省） */
  scripts?: ScriptResultsData
  /** 请求失败时的错误信息（如协议错误、连接失败等）；有值时展示错误而非正常响应 */
  error?: string
  /** 响应体超过限额被截断，只保留了前 size 字节 */
  truncated?: boolean
  /** 触发截断时的字节上限，用于提示文案 */
  truncatedLimit?: number
  /** 响应过大未回传原始字节，字符集切换不可用 */
  rawBodyOmitted?: boolean
  /** 请求被前置脚本 pm.execution.skipRequest() 跳过，未真正发出 */
  skipped?: boolean
  /** 响应为 SSE 流：以实时事件流展示（Body 为空，事件按 streamId 推送） */
  streaming?: boolean
  /** SSE 流连接标识 */
  streamId?: string
}

/** 环境前置 URL 条目 */
export interface EnvironmentBaseURLOption {
  /** 环境 ID */
  environmentId: string
  /** 环境名称 */
  environmentName: string
  /** 前置 URL */
  baseUrl: string
}

