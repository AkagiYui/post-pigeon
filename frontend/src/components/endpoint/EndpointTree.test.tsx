import { fireEvent, render, screen } from "@solidjs/testing-library"
import { describe, expect, it, vi } from "vitest"

import { EndpointTree, type TreeNode } from "./EndpointTree"

const tree: TreeNode[] = [
  {
    id: "module-1",
    type: "module",
    name: "Users",
    children: [
      { id: "folder-1", type: "folder", name: "Admin" },
      { id: "endpoint-1", type: "endpoint", name: "List users", method: "GET" },
    ],
  },
]

describe("EndpointTree modifier clicks", () => {
  it("Option/Alt + 单击模块直接打开设置且不切换展开状态", () => {
    const onOpenSettings = vi.fn()
    const onExpandedChange = vi.fn()
    render(() => (
      <EndpointTree
        data={tree}
        expandedIds={["module-1"]}
        onExpandedChange={onExpandedChange}
        onOpenSettings={onOpenSettings}
      />
    ))
    onExpandedChange.mockClear()

    fireEvent.click(screen.getByText("Users"), { altKey: true })

    expect(onOpenSettings).toHaveBeenCalledWith(tree[0])
    expect(onExpandedChange).not.toHaveBeenCalled()
  })

  it("Option/Alt + 单击文件夹直接打开设置且不切换展开状态", () => {
    const onOpenSettings = vi.fn()
    const onExpandedChange = vi.fn()
    render(() => (
      <EndpointTree
        data={tree}
        expandedIds={["module-1"]}
        onExpandedChange={onExpandedChange}
        onOpenSettings={onOpenSettings}
      />
    ))
    onExpandedChange.mockClear()

    fireEvent.click(screen.getByText("Admin"), { altKey: true })

    expect(onOpenSettings).toHaveBeenCalledWith(tree[0].children?.[0])
    expect(onExpandedChange).not.toHaveBeenCalled()
  })

  it("Option/Alt + 单击接口打开详情并定位到设置标签", () => {
    const onSelect = vi.fn()
    render(() => <EndpointTree data={tree} expandedIds={["module-1"]} onSelect={onSelect} />)

    fireEvent.click(screen.getByText("List users"), { altKey: true })

    expect(onSelect).toHaveBeenCalledWith(tree[0].children?.[1], { requestTab: "settings" })
  })
})
