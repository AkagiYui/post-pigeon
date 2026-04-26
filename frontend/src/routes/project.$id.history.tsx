// 项目请求历史路由
import { createFileRoute } from "@tanstack/solid-router"

import { RequestHistoryPage } from "@/components/history/RequestHistoryPage"

export const Route = createFileRoute("/project/$id/history")({
  component: RequestHistoryPageComponent,
})

/**
 * Renders the request history page for a project.
 *
 * @returns The JSX element for the request history page.
 */
function RequestHistoryPageComponent() {
  return <RequestHistoryPage />
}
