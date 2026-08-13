import { app } from "electron"
import pkg from "electron-updater"
import type { UpdateInfo } from "electron-updater"

const { autoUpdater } = pkg
import type { UpdaterState } from "../shared/updater"

const MIN_CHECK_INTERVAL_MS = 10_000

export interface AutoUpdaterHandle {
  state(): UpdaterState
  check(): Promise<void>
  install(): void
}

export function createAutoUpdater(emit: (state: UpdaterState) => void): AutoUpdaterHandle {
  // 仅打包后的 Windows NSIS 安装版与 macOS 应用支持自动更新；Windows portable 与开发模式不启用
  const supported = app.isPackaged && (process.platform === "win32" || process.platform === "darwin") && !process.env.PORTABLE_EXECUTABLE_DIR
  let state: UpdaterState = {
    supported,
    status: "idle",
    version: null,
    releaseName: null,
    releaseNotes: null,
    progress: null,
    error: null,
  }
  let checking = false
  let lastCheckAt = 0

  const setState = (patch: Partial<UpdaterState>) => {
    state = { ...state, ...patch }
    emit(state)
  }

  if (supported) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on("checking-for-update", () => setState({ status: "checking", error: null }))
    autoUpdater.on("update-available", (info) =>
      setState({
        status: "available",
        version: info.version,
        releaseName: info.releaseName ?? null,
        releaseNotes: extractReleaseNotes(info),
        error: null,
      }),
    )
    autoUpdater.on("update-not-available", () => setState({ status: "not-available", error: null }))
    autoUpdater.on("download-progress", (progress) =>
      setState({
        status: "downloading",
        progress: { percent: progress.percent, transferred: progress.transferred, total: progress.total },
      }),
    )
    autoUpdater.on("update-downloaded", (info) =>
      setState({
        status: "downloaded",
        version: info.version,
        releaseName: info.releaseName ?? null,
        releaseNotes: extractReleaseNotes(info),
        progress: null,
        error: null,
      }),
    )
    autoUpdater.on("error", (error) => setState({ status: "error", error: error instanceof Error ? error.message : String(error) }))
  }

  return {
    state: () => state,
    check: async () => {
      if (!supported || checking) return
      const now = Date.now()
      if (now - lastCheckAt < MIN_CHECK_INTERVAL_MS) return
      lastCheckAt = now
      checking = true
      try {
        await autoUpdater.checkForUpdates()
      } catch (error) {
        setState({ status: "error", error: error instanceof Error ? error.message : String(error) })
      } finally {
        checking = false
      }
    },
    install: () => {
      if (state.status !== "downloaded") return
      autoUpdater.quitAndInstall()
    },
  }
}

function extractReleaseNotes(info: UpdateInfo): string | null {
  const notes = info.releaseNotes
  if (typeof notes === "string") return notes
  if (Array.isArray(notes)) {
    const note = notes.find((item) => item.version === info.version) ?? notes[notes.length - 1]
    return note?.note ?? null
  }
  return null
}
