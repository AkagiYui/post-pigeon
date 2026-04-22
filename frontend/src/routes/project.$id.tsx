// 项目工作区路由 - 打开项目后的主页面
import { createFileRoute } from "@tanstack/solid-router"

import { ProjectWorkspace } from "@/components/project/ProjectWorkspace"

export const Route = createFileRoute("/project/$id")({ component: ProjectWorkspacePage })

function ProjectWorkspacePage() {
  return <ProjectWorkspace />
}
