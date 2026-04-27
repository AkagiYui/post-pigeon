// 项目设置路由
import { createFileRoute } from "@tanstack/solid-router"

import { ProjectSettingsPage } from "@/components/settings/ProjectSettingsPage"

export const Route = createFileRoute("/project/$id/settings")({
  component: ProjectSettingsPageComponent,
})

function ProjectSettingsPageComponent() {
  return <ProjectSettingsPage />
}
