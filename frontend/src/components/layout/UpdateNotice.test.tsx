import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { UpdateInfo } from "@/../bindings/PostPigeon/internal/services"
import { refreshUpdateInfo, skipAvailableVersion, updateInfo, updateState } from "@/stores/updater"

import { UpdateNotice } from "./UpdateNotice"

const mocks = vi.hoisted(() => ({
  listeners: new Map<string, () => void>(),
  getInfo: vi.fn(),
  skip: vi.fn(),
  setSettingsTab: vi.fn(),
  setSettingsOpen: vi.fn(),
}))

vi.mock("@wailsio/runtime", () => ({
  Events: { On: (name: string, callback: () => void) => mocks.listeners.set(name, callback) },
  Updater: {
    Events: {
      CheckStarted: "check-started", NoUpdate: "no-update", UpdateAvailable: "available",
      DownloadStarted: "download-started", DownloadProgress: "download-progress",
      Verifying: "verifying", Installing: "installing", UpdateReady: "ready", Error: "error",
    },
  },
}))

vi.mock("@/../bindings/PostPigeon/internal/services", () => ({
  UpdaterService: {
    GetUpdateInfo: mocks.getInfo,
    SkipAvailableVersion: mocks.skip,
    GetPendingChangelog: vi.fn().mockResolvedValue({ entries: [], fallback: "" }),
  },
}))

vi.mock("@/stores/app", () => ({
  setSettingsOpen: mocks.setSettingsOpen,
  setSettingsTab: mocks.setSettingsTab,
}))

const snapshot = (state = "idle", version?: string): UpdateInfo => ({
  state, currentVersion: "1.0.0", enabled: true, canSelfUpdate: true, blockedReason: "",
  releasesUrl: "https://example.test/releases",
  settings: { autoCheck: true, includePrerelease: false, skippedVersion: "" },
  available: version
    ? { version, name: version, notes: "", publishedAt: "", size: 1, filename: "app.zip", url: "https://example.test/release" }
    : null,
})

beforeEach(async () => {
  vi.clearAllMocks()
  mocks.getInfo.mockResolvedValue(snapshot())
  await refreshUpdateInfo()
})

afterEach(cleanup)

describe("全局更新提示与状态同步", () => {
  it("不打开设置也会同步启动前的检查结果，并可直达更新设置", async () => {
    mocks.getInfo.mockResolvedValue(snapshot("available", "2.0.0"))
    render(() => <UpdateNotice />)

    expect(await screen.findByRole("status")).toHaveTextContent("发现新版本 2.0.0")
    fireEvent.click(screen.getByRole("button", { name: "查看更新" }))
    expect(mocks.setSettingsTab).toHaveBeenCalledWith("update")
    expect(mocks.setSettingsOpen).toHaveBeenCalledWith(true)
  })

  it("后台发现更新时等待管理器保存结果后再刷新，不读取旧快照", async () => {
    render(() => <UpdateNotice />)
    await waitFor(() => expect(mocks.getInfo).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    mocks.getInfo.mockClear()

    mocks.listeners.get("available")!()
    expect(mocks.getInfo).not.toHaveBeenCalled()
    mocks.getInfo.mockResolvedValue(snapshot("available", "2.1.0"))
    mocks.listeners.get("app:update-checked")!()

    expect(await screen.findByRole("status")).toHaveTextContent("2.1.0")
  })

  it("没有更新或开发构建时不显示通知", async () => {
    mocks.getInfo.mockResolvedValue({ ...snapshot("unconfigured"), enabled: false })
    render(() => <UpdateNotice />)
    await waitFor(() => expect(updateState()).toBe("unconfigured"))
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("跳过版本后立即移除全局提示", async () => {
    mocks.getInfo.mockResolvedValue(snapshot("available", "2.0.0"))
    render(() => <UpdateNotice />)
    await screen.findByRole("status")
    mocks.getInfo.mockResolvedValue(snapshot("up-to-date"))
    await skipAvailableVersion()
    expect(mocks.skip).toHaveBeenCalledOnce()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("新检查确认没有更新时清除上次可用版本", async () => {
    mocks.getInfo.mockResolvedValue(snapshot("available", "2.0.0"))
    render(() => <UpdateNotice />)
    await screen.findByRole("status")
    mocks.getInfo.mockResolvedValue(snapshot("up-to-date"))
    mocks.listeners.get("no-update")!()
    mocks.listeners.get("app:update-checked")!()
    await waitFor(() => expect(updateInfo()?.available).toBeNull())
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("较早的快照不能覆盖已经到达的更新就绪事件", async () => {
    let finish!: (value: UpdateInfo) => void
    mocks.getInfo.mockReturnValueOnce(new Promise<UpdateInfo>((resolve) => { finish = resolve }))
    render(() => <UpdateNotice />)
    mocks.listeners.get("ready")!()
    finish(snapshot())
    await Promise.resolve()
    expect(updateState()).toBe("ready")
    expect(screen.getByRole("status")).toHaveTextContent("更新已就绪")
  })

  it("较早的读取不能覆盖新一轮已保存的检查结果", async () => {
    let finish!: (value: UpdateInfo) => void
    mocks.getInfo.mockReturnValueOnce(new Promise<UpdateInfo>((resolve) => { finish = resolve }))
    const oldRead = refreshUpdateInfo()
    mocks.getInfo.mockResolvedValue(snapshot("available", "3.0.0"))
    await refreshUpdateInfo()
    finish(snapshot())
    await oldRead
    expect(updateInfo()?.available?.version).toBe("3.0.0")
  })
})
