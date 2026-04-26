// 项目工作区索引路由 - 默认显示接口管理页面
import { createFileRoute } from "@tanstack/solid-router"

import { ProjectWorkspace } from "@/components/project/ProjectWorkspace"

export const Route = createFileRoute("/project/$id/")({
  component: ProjectWorkspacePage,
})

/**
 * Renders the project workspace page.
 *
 * @returns A JSX element that renders the ProjectWorkspace UI
 */
function ProjectWorkspacePage() {
  return <ProjectWorkspace />
}