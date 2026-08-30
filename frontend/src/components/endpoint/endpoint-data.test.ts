import { describe, expect, it } from "vitest"

import { EndpointAuth, EndpointBodyField, Operation } from "@/../bindings/PostPigeon/internal/models"

import { emptyAuth } from "./editor-types"
import {
  authDataToState,
  authStateToData,
  countParams,
  deriveScriptFromOps,
  fromAuthModel,
  fromBodyFieldModels,
  fromOperationModels,
  hasEffectiveAuth,
  parseStringArray,
  safeParseJSON,
  toAuthModel,
  toBodyFieldModels,
  toOperationModels,
  toTimingData,
} from "./endpoint-data"
import { proxyJSONFromKey, tlsJSONFromMode, urlEncodingFromMode } from "./EndpointSettingsEditor"

describe("parseStringArray", () => {
  it("解析合法的字符串数组", () => {
    expect(parseStringArray('["a","b"]')).toEqual(["a", "b"])
  })

  it("过滤非字符串项", () => {
    expect(parseStringArray('["a",1,null]')).toEqual(["a"])
  })

  it("非法或空输入返回空数组", () => {
    expect(parseStringArray("not json")).toEqual([])
    expect(parseStringArray("")).toEqual([])
    expect(parseStringArray(null)).toEqual([])
    expect(parseStringArray(undefined)).toEqual([])
  })
})

describe("safeParseJSON", () => {
  it("解析 JSON 字符串", () => {
    expect(safeParseJSON<{ a: number }>('{"a":1}', { a: 0 })).toEqual({ a: 1 })
  })

  it("已是对象时原样返回", () => {
    const value = { a: 1 }
    expect(safeParseJSON(value, {})).toBe(value)
  })

  it("空值与非法 JSON 回退", () => {
    expect(safeParseJSON("", "fallback")).toBe("fallback")
    expect(safeParseJSON("{oops", "fallback")).toBe("fallback")
    expect(safeParseJSON(null, "fallback")).toBe("fallback")
  })
})

describe("toTimingData", () => {
  it("缺省字段补零", () => {
    expect(toTimingData({ total: 12 })).toEqual({
      total: 12, dnsLookup: 0, tlsHandshake: 0, tcpConnect: 0,
      ttfb: 0, stalled: 0, wait: 0, download: 0, reused: false,
    })
  })

  it("接受 null / undefined", () => {
    expect(toTimingData(null).total).toBe(0)
    expect(toTimingData(undefined).reused).toBe(false)
  })
})

describe("认证转换", () => {
  it("认证标签只表示是否存在一组生效认证", () => {
    expect(hasEffectiveAuth({ type: "bearer" })).toBe(true)
    expect(hasEffectiveAuth({ type: "oauth2" })).toBe(true)
    expect(hasEffectiveAuth({ type: "none" }, true)).toBe(false)
    expect(hasEffectiveAuth({ type: "inherit" }, true)).toBe(true)
    expect(hasEffectiveAuth({ type: "inherit" }, false)).toBe(false)
    expect(hasEffectiveAuth(undefined, true)).toBe(true)
  })

  it("basic 往返无损", () => {
    const state = { ...emptyAuth(), type: "basic" as const, username: "u", password: "p" }
    const restored = authDataToState("basic", authStateToData(state))
    expect(restored.type).toBe("basic")
    expect(restored.username).toBe("u")
    expect(restored.password).toBe("p")
  })

  it("digest 与 basic 共用凭据字段", () => {
    const state = { ...emptyAuth(), type: "digest" as const, username: "u", password: "p" }
    const restored = authDataToState("digest", authStateToData(state))
    expect(restored.type).toBe("digest")
    expect(restored.username).toBe("u")
  })

  it("oauth2 往返保留全部配置", () => {
    const state = {
      ...emptyAuth(),
      type: "oauth2" as const,
      oauthGrantType: "password",
      oauthTokenUrl: "https://auth/token",
      oauthClientId: "cid",
      oauthClientSecret: "secret",
      oauthScope: "read",
      oauthClientAuth: "basic",
      username: "u",
      password: "p",
    }
    const restored = authDataToState("oauth2", authStateToData(state))
    expect(restored).toMatchObject({
      type: "oauth2",
      oauthGrantType: "password",
      oauthTokenUrl: "https://auth/token",
      oauthClientId: "cid",
      oauthClientSecret: "secret",
      oauthScope: "read",
      oauthClientAuth: "basic",
      username: "u",
      password: "p",
    })
  })

  it("apikey 默认位置为 header", () => {
    const restored = authDataToState("apikey", JSON.stringify({ key: "k", value: "v" }))
    expect(restored.apiKeyIn).toBe("header")
  })

  it("未知类型退回 none，非法 JSON 不抛异常", () => {
    expect(authDataToState("whatever", "{}").type).toBe("none")
    expect(authDataToState("basic", "{oops").username).toBe("")
    expect(authDataToState(null, null)).toEqual(emptyAuth())
  })

  it("none 与 inherit 都产生显式模型，只有缺少编辑态时返回 null", () => {
    expect(toAuthModel(emptyAuth())?.type).toBe("none")
    expect(toAuthModel({ ...emptyAuth(), type: "inherit" })?.type).toBe("inherit")
    const model = toAuthModel({ ...emptyAuth(), type: "bearer", token: "t" })
    expect(model?.type).toBe("bearer")
    expect(fromAuthModel(model).token).toBe("t")
    expect(fromAuthModel(new EndpointAuth({ type: "none", data: "" }))).toEqual(emptyAuth())
    expect(fromAuthModel(null).type).toBe("inherit")
  })
})

describe("接口设置的显式继承值", () => {
  it("代理、TLS 与 URL 编码都不会把 inherit 压成空串", () => {
    expect(JSON.parse(proxyJSONFromKey("inherit"))).toEqual({ mode: "inherit" })
    expect(JSON.parse(tlsJSONFromMode("inherit"))).toEqual({ mode: "inherit" })
    expect(urlEncodingFromMode("inherit")).toBe("inherit")
  })
})

describe("操作转换", () => {
  it("script 操作往返无损", () => {
    const rows = fromOperationModels([
      new Operation({ stage: "pre", phase: "afterVariables", type: "script", name: "n", enabled: true, data: JSON.stringify({ script: "console.log(1)" }) }),
    ])
    expect(rows[0]).toMatchObject({ stage: "pre", phase: "afterVariables", type: "script", name: "n", enabled: true, script: "console.log(1)" })

    const models = toOperationModels(rows)
    expect(JSON.parse(models[0].data)).toEqual({ script: "console.log(1)" })
    expect(models[0].sortOrder).toBe(0)
    expect(models[0].phase).toBe("afterVariables")
  })

  it("assert 与 wait 的字段各自落位", () => {
    const rows = fromOperationModels([
      new Operation({ stage: "post", type: "assert", enabled: true, data: JSON.stringify({ source: "responseJson", expression: "$.a", comparison: "eq", target: "1" }) }),
      new Operation({ stage: "pre", type: "wait", enabled: true, data: JSON.stringify({ milliseconds: 500 }) }),
    ])
    expect(rows[0]).toMatchObject({ assertExpression: "$.a", assertComparison: "eq", assertTarget: "1" })
    expect(rows[1].waitMs).toBe(500)
  })

  it("data 非法时用默认值兜底", () => {
    const rows = fromOperationModels([new Operation({ stage: "pre", type: "wait", enabled: true, data: "{oops" })])
    expect(rows[0].waitMs).toBe(1000)
  })
})

describe("deriveScriptFromOps", () => {
  const scriptOp = (stage: "pre" | "post", script: string, enabled = true) => ({
    id: crypto.randomUUID(), stage, phase: "beforeVariables" as const, type: "script" as const, name: "", enabled, script,
    libraryId: "", assertSource: "", assertExpression: "", assertComparison: "", assertTarget: "",
    varName: "", varScope: "", varSource: "", varExpression: "", waitMs: 0,
    databaseDriver: "sqlite", databaseDSN: "", databaseQuery: "", databaseResultVariable: "",
  })

  it("拼接同阶段的启用脚本", () => {
    const result = deriveScriptFromOps([scriptOp("pre", "a"), scriptOp("pre", "b"), scriptOp("post", "c")], "pre", "fallback")
    expect(result).toBe("a\nb")
  })

  it("跳过禁用与空脚本", () => {
    const result = deriveScriptFromOps([scriptOp("pre", "a", false), scriptOp("pre", "   ")], "pre", "fallback")
    expect(result).toBe("fallback")
  })

  it("没有脚本时回退", () => {
    expect(deriveScriptFromOps([], "post", "fb")).toBe("fb")
    expect(deriveScriptFromOps([], "post", "")).toBe("")
  })
})

describe("请求体字段转换", () => {
  it("文件字段存的是路径而不是内容", () => {
    const models = toBodyFieldModels([
      { id: "1", name: "f", value: "", fieldType: "file", enabled: true, fileName: "a.png", filePath: "/tmp/a.png" },
    ])
    expect(JSON.parse(models[0].value)).toEqual({ fileName: "a.png", path: "/tmp/a.png" })

    const rows = fromBodyFieldModels(models)
    expect(rows[0]).toMatchObject({ fieldType: "file", fileName: "a.png", filePath: "/tmp/a.png", value: "" })
  })

  it("重新选过文件后不再带上历史内容", () => {
    const models = toBodyFieldModels([
      { id: "1", name: "f", value: "", fieldType: "file", enabled: true, fileName: "new.png", filePath: "/tmp/new.png", fileContent: "AAA" },
    ])
    expect(JSON.parse(models[0].value)).toEqual({ fileName: "new.png", path: "/tmp/new.png" })
  })

  it("历史数据里内联的内容原样保留（打开老接口按下保存不该弄丢附件）", () => {
    const models = toBodyFieldModels([
      { id: "1", name: "f", value: "", fieldType: "file", enabled: true, fileName: "a.png", fileContent: "AAA" },
    ])
    expect(JSON.parse(models[0].value)).toEqual({ fileName: "a.png", content: "AAA" })

    const rows = fromBodyFieldModels(models)
    expect(rows[0]).toMatchObject({ fieldType: "file", fileName: "a.png", fileContent: "AAA", value: "" })
  })

  it("旧数据里 value 直接是文件名时也能读", () => {
    const rows = fromBodyFieldModels([
      new EndpointBodyField({ name: "f", value: "legacy.png", fieldType: "file", enabled: true }),
    ])
    expect(rows[0].fileName).toBe("legacy.png")
  })

  it("过滤掉没有名字的字段", () => {
    expect(toBodyFieldModels([{ id: "1", name: "  ", value: "v", fieldType: "text", enabled: true }])).toHaveLength(0)
  })
})

describe("参数 tab 的数字", () => {
  const row = (type: string, name: string, enabled = true) => ({ type, name, enabled })

  it("query + 路径参数 + 全局参数相加", () => {
    expect(countParams({
      params: [row("query", "a"), row("query", "b"), row("header", "X-Token")],
      path: "/users/{id}/posts/{postId}",
      globalQueryParams: [{ name: "trace" }],
    })).toBe(2 + 2 + 1)
  })

  it("勾掉的 query 参数照样算进来", () => {
    // 这里回答的是「定义了多少参数」，不是「这次会发几个」——与 Apifox 一致
    expect(countParams({
      params: [row("query", "a"), row("query", "b", false)],
      path: "/x",
    })).toBe(2)
  })

  it("没名字的行不算（参数表末尾常驻一行空草稿）", () => {
    expect(countParams({
      params: [row("query", "a"), row("query", "  ")],
      path: "/x",
    })).toBe(1)
  })

  it("本接口禁用掉的全局参数不算", () => {
    expect(countParams({
      params: [],
      path: "/x",
      globalQueryParams: [{ name: "trace" }, { name: "lang" }],
      disabledGlobalParams: ["lang"],
    })).toBe(1)
  })

  it("非 query 类型的参数不算", () => {
    expect(countParams({
      params: [row("header", "H"), row("cookie", "C"), row("path", "id")],
      path: "/x",
    })).toBe(0)
  })
})
