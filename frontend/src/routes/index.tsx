import { createFileRoute } from "@tanstack/solid-router"

import { ProjectListPage } from "@/components/project/ProjectList"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  return <ProjectListPage />
}
