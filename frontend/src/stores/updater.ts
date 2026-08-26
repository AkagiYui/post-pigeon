// 应用更新的全局状态。
//
// 更新流程跑在 Go 侧（Wails 内置 updater），每一步都会往事件总线广播
// wails:updater:*。这里在模块级订阅一次，把事件收敛成界面能直接读的状态，
// 这样即使设置面板被关掉重开，下载进度也不会丢。
import { Events, Updater } from "@wailsio/runtime"
import { createRoot, createSignal } from "solid-js"

import type { Entry } from "@/../bindings/PostPigeon/internal/changelog"
import type { UpdateSettings } from "@/../bindings/PostPigeon/internal/models"
import type { UpdateChangelog, UpdateInfo } from "@/../bindings/PostPigeon/internal/services"
import { UpdaterService } from "@/../bindings/PostPigeon/internal/services"

/** 下载进度 */
export interface UpdateProgress {
  /** 已下载字节数 */
  written: number
  /** 总字节数，未知时为 0 */
  total: number
  /** 瞬时速率（字节/秒） */
  rate: number
}

const [info, setInfo] = createRoot(() => createSignal<UpdateInfo | null>(null))
const [progress, setProgress] = createRoot(() => createSignal<UpdateProgress | null>(null))
const [errorMessage, setErrorMessage] = createRoot(() => createSignal(""))
const [pending, setPending] = createRoot(() => createSignal<UpdateChangelog | null>(null))
const [history, setHistory] = createRoot(() => createSignal<Entry[] | null>(null))

/** 更新流程所处阶段，取值与 Go 侧 updater.State 一致 */
export type UpdateState =
  | "unconfigured" | "idle" | "checking" | "up-to-date" | "available"
  | "downloading" | "verifying" | "installing" | "ready" | "error"

// 阶段单独用一个信号：事件到达时立刻更新，不必等一次 Go 往返；
// 每次拉取状态时再用后端的值校准，两边不会打架。
const [state, setState] = createRoot(() => createSignal<UpdateState>("idle"))

export {
  errorMessage as updateError,
  history as updateHistory,
  info as updateInfo,
  pending as pendingChangelog,
  progress as updateProgress,
  state as updateState,
}

/** 拉取最新的更新状态 */
export async function refreshUpdateInfo(): Promise<UpdateInfo | null> {
  const next = await UpdaterService.GetUpdateInfo()
  setInfo(next)
  setState(next.state as UpdateState)
  return next
}

/** 主动检查更新；发现新版本时顺带把变更日志也拉回来 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  setErrorMessage("")
  const next = await UpdaterService.CheckForUpdate()
  setInfo(next)
  setState(next.state as UpdateState)
  if (next.available) void loadPendingChangelog()
  return next
}

/** 下载、校验并暂存更新 */
export async function downloadAndInstall(): Promise<void> {
  setErrorMessage("")
  setProgress(null)
  await UpdaterService.DownloadAndInstall()
  await refreshUpdateInfo()
}

/** 重启以应用更新。调用成功后应用会退出，不会有后续返回 */
export async function restartToApply(): Promise<void> {
  await UpdaterService.RestartToApply()
}

/** 跳过当前发现的版本 */
export async function skipAvailableVersion(): Promise<void> {
  await UpdaterService.SkipAvailableVersion()
  setPending(null)
  await refreshUpdateInfo()
}

/** 保存更新设置（立刻生效，不需要重启） */
export async function saveUpdateSettings(settings: UpdateSettings): Promise<void> {
  await UpdaterService.SaveUpdateSettings(settings)
  await refreshUpdateInfo()
}

/** 拉取「当前版本 → 待更新版本」之间的全部变更日志 */
export async function loadPendingChangelog(): Promise<void> {
  try {
    setPending(await UpdaterService.GetPendingChangelog())
  } catch (err) {
    // 变更日志只是锦上添花，拉不到不该挡住更新本身
    console.error("获取变更日志失败", err)
    setPending(null)
  }
}

/** 拉取随应用分发的历史变更日志（惰性，只拉一次） */
export async function loadUpdateHistory(): Promise<void> {
  if (history()) return
  setHistory(await UpdaterService.GetLocalChangelog())
}

// 模块级订阅一次。与 stores/stream.ts 同理：这里在应用挂载前就已执行，
// Toaster 尚未渲染，失败只能进 console。
if (typeof window !== "undefined") {
  try {
    Events.On(Updater.Events.CheckStarted, () => {
      setErrorMessage("")
      setState("checking")
    })
    Events.On(Updater.Events.NoUpdate, () => setState("up-to-date"))
    Events.On(Updater.Events.UpdateAvailable, () => {
      setState("available")
      // 后台定时检查发现的新版本也要能直接在界面上看到内容
      void refreshUpdateInfo().then(() => loadPendingChangelog())
    })
    Events.On(Updater.Events.DownloadStarted, () => {
      setProgress({ written: 0, total: 0, rate: 0 })
      setState("downloading")
    })
    Events.On(Updater.Events.DownloadProgress, (e: { data?: UpdateProgress }) => {
      if (e?.data) setProgress({ written: e.data.written, total: e.data.total, rate: e.data.rate })
    })
    Events.On(Updater.Events.Verifying, () => setState("verifying"))
    Events.On(Updater.Events.Installing, () => setState("installing"))
    Events.On(Updater.Events.UpdateReady, () => {
      setProgress(null)
      setState("ready")
    })
    Events.On(Updater.Events.Error, (e: { data?: { stage?: string; message?: string } }) => {
      setErrorMessage(e?.data?.message ?? "")
      setProgress(null)
      setState("error")
    })
  } catch (err) {
    console.error("订阅更新事件失败", err)
  }
}
