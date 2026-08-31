// 接口标签会话只存于当前进程的路由缓存，不把明文草稿或响应写入浏览器持久存储。
import { createStore } from "solid-js/store"

import type { EndpointSaveData } from "@/../bindings/PostPigeon/internal/services"
import type { EndpointType, HTTPMethod } from "@/lib/types"

import type { EndpointData, EnvironmentBaseURLOption, ResponseData } from "./editor-types"
import { toAuthModel, toBodyFieldModels, toHeaderModels, toOperationModels, toOperationOverrideModels, toParamModels } from "./endpoint-data"

export interface RequestTab {
  id: string
  key: string
  name: string
  method: HTTPMethod
  type: EndpointType
  path: string
  state: "preview" | "resident" | "pinned"
  saved: boolean
  dirty: boolean
}

export interface RequestSession {
  /** 标签/组件/连接的稳定身份；新建请求保存后也不改变。 */
  key: string
  draft: EndpointData
  baseline: string
  response: ResponseData | null
  moduleId: string
  environmentBaseUrls: EnvironmentBaseURLOption[]
  globalQueryParams: { name: string; value: string }[]
  inheritedOpCounts: { pre: number; post: number }
  contextId: string
  inheritanceId: string
  loadId: string
  loading: boolean
  loadError: boolean
  requestId: string
  requestCancelled: boolean
  saving: boolean
}

export function snapshotEndpoint(data: EndpointData): EndpointData {
  // Solid store 是代理，不能直接 structuredClone；JSON 快照也会去掉模型方法。
  return JSON.parse(JSON.stringify(data)) as EndpointData
}

/** 保存和 dirty 判定共享完整的可编辑字段；环境派生值/继承结果不算用户修改。 */
export function endpointSaveData(ep: EndpointData): EndpointSaveData {
  return {
    id: ep.id, name: ep.name, method: ep.method, path: ep.path, serverId: ep.serverId || "",
    bodyType: ep.bodyType, bodyContent: ep.bodyContent, contentType: ep.contentType,
    timeout: ep.timeout, timeoutMode: ep.timeoutMode, followRedirects: ep.followRedirects,
    sendNoCacheHeaders: ep.sendNoCacheHeaders,
    preRequestScript: ep.preRequestScript, postResponseScript: ep.postResponseScript,
    type: ep.type, docContent: ep.docContent, status: ep.status, tags: ep.tags,
    description: ep.description, inheritOperations: ep.inheritOperations,
    disabledGlobalParams: JSON.stringify(ep.disabledGlobalParams || []),
    proxyConfig: ep.proxyConfig,
    tlsConfig: ep.tlsConfig,
    urlEncoding: ep.urlEncoding,
    wsProtocolConversion: ep.wsProtocolConversion,
    streamViewMode: ep.streamViewMode,
    streamCompletionFormat: ep.streamCompletionFormat,
    streamJSONPath: ep.streamJSONPath,
    streamRenderMarkdown: ep.streamRenderMarkdown,
    params: toParamModels(ep.params), bodyFields: toBodyFieldModels(ep.bodyFields),
    headers: toHeaderModels(ep.headers), auth: toAuthModel(ep.auth),
    operations: toOperationModels(ep.operations),
    operationOverrides: toOperationOverrideModels(ep.operationOverrides),
    examples: ep.examples || [], schemas: ep.schemas || [],
  }
}

export function endpointFingerprint(ep: EndpointData): string {
  return JSON.stringify(endpointSaveData(ep))
}

export function createRequestSession(draft: EndpointData, key = crypto.randomUUID()): RequestSession {
  return {
    key, draft: snapshotEndpoint(draft), baseline: endpointFingerprint(draft), response: null,
    moduleId: "", environmentBaseUrls: [], globalQueryParams: [], inheritedOpCounts: { pre: 0, post: 0 },
    contextId: "", inheritanceId: "", loadId: "", loading: false, loadError: false, requestId: "", requestCancelled: false, saving: false,
  }
}

/** 路由缓存保留同一个活的 store；离开页面时后台请求仍写回原标签会话。 */
export function createRequestWorkspaceState() {
  const [state, setState] = createStore<{
    tabs: RequestTab[]
    activeTabId: string | null
    sessions: Record<string, RequestSession | undefined>
  }>({ tabs: [], activeTabId: null, sessions: {} })
  return {
    state,
    setTabs(value: RequestTab[] | ((tabs: RequestTab[]) => RequestTab[])) {
      setState("tabs", typeof value === "function" ? value(state.tabs) : value)
    },
    setActive(id: string | null) { setState("activeTabId", id) },
    setSession(id: string, session: RequestSession | undefined) { setState("sessions", id, session) },
    patchSession(id: string, patch: Partial<RequestSession>) {
      if (state.sessions[id]) setState("sessions", id, patch)
    },
  }
}
