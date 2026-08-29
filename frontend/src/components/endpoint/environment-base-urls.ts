import type { EnvironmentBaseURLOption } from "./editor-types"

interface EnvironmentLike {
  id: string
  name: string
}

interface ModuleBaseURLLike {
  environmentId: string
  baseUrl: string
}

export interface EnvironmentBaseURLState {
  currentBaseUrl: string
  options: EnvironmentBaseURLOption[]
}

/**
 * 将项目环境与模块 Base URL 做左连接。
 *
 * 环境列表才是选择器的完整数据源；新建环境尚未配置 Base URL 时，后端不会有
 * ModuleBaseURL 记录，但仍应出现在选择器里，并以空地址展示。
 */
export function resolveEnvironmentBaseURLs(
  environments: readonly EnvironmentLike[],
  baseUrls: readonly ModuleBaseURLLike[],
  currentEnvironmentId: string,
): EnvironmentBaseURLState {
  const baseUrlByEnvironment = new Map(
    baseUrls.map(item => [item.environmentId, item.baseUrl] as const),
  )

  return {
    currentBaseUrl: baseUrlByEnvironment.get(currentEnvironmentId) ?? "",
    options: environments.map(environment => ({
      environmentId: environment.id,
      environmentName: environment.name,
      baseUrl: baseUrlByEnvironment.get(environment.id) ?? "",
    })),
  }
}
