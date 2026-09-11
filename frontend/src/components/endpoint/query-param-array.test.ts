import { describe, expect, it } from "vitest"

import { parseQueryArrayValue, queryParamValueForTypeChange, serializeQueryArrayValue } from "./query-param-array"

describe("Query 数组值存储", () => {
  it("JSON 数组解析为逐项文本并可无损写回", () => {
    expect(parseQueryArrayValue('["red","a,b",2,true,null]')).toEqual(["red", "a,b", "2", "true", ""])
    expect(serializeQueryArrayValue(["red", "a,b"])).toBe('["red","a,b"]')
  })

  it("旧的标量值按一个数组项兼容", () => {
    expect(parseQueryArrayValue("legacy")).toEqual(["legacy"])
    expect(parseQueryArrayValue("")).toEqual([])
  })

  it("切换类型时保留已有值", () => {
    expect(queryParamValueForTypeChange("red", "string", "array")).toBe('["red"]')
    expect(queryParamValueForTypeChange('["red","blue"]', "array", "string")).toBe("red")
    expect(queryParamValueForTypeChange("", "string", "array")).toBe("[]")
  })
})
