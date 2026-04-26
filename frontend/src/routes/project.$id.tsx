// 项目工作区路由 - 打开项目后的主页面
import { createFileRoute, Outlet } from "@tanstack/solid-router"

export const Route = createFileRoute("/project/$id")({
  component: ProjectWorkspacePage,
})

/**
 * Layout component that renders nested child route content for the /project/:id route.
 *
 * @returns The JSX element that renders the active child route via an Outlet
 */
function ProjectWorkspacePage() {
  // Outlet 用于渲染子路由内容
  return <Outlet />
}
