import type { EnvironmentBaseURLOption } from "./editor-types"

interface EnvironmentLike {
  id: string
  name: string
}

interface ModuleBaseURLLike {
  environmentId: string
  baseUrl: string
}

/**
 * 一次发送/连接/导出固定一个环境 ID，并直接读取该环境的模块地址。
 * 不使用异步刷新的界面缓存；读取失败向上传播，不能带着新环境回退到旧地址。
 * 等待期间继续切换环境，也不会改变已经发起操作的环境快照。
 */
export async function resolveRequestEnvironment(
  moduleId: string,
  environmentId: string,
  standaloneBaseUrl: string,
  loadBaseUrls: (moduleId: string) => Promise<readonly ModuleBaseURLLike[]>,
): Promise<{ environmentId: string; baseUrl: string }> {
  if (!moduleId) return { environmentId, baseUrl: standaloneBaseUrl }
  const baseUrls = await loadBaseUrls(moduleId)
  return { environmentId, baseUrl: baseUrls.find(item => item.environmentId === environmentId)?.baseUrl ?? "" }
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
