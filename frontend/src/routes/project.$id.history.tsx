// 项目请求历史路由
import { createFileRoute } from "@tanstack/solid-router"

import { RequestHistoryPage } from "@/components/history/RequestHistoryPage"

export const Route = createFileRoute("/project/$id/history")({
  component: RequestHistoryPageComponent,
})

function RequestHistoryPageComponent() {
  return <RequestHistoryPage />
}
