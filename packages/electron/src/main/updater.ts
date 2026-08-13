import { app, net } from "electron"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { createReadStream, createWriteStream, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import pkg from "electron-updater"
import type { UpdateInfo } from "electron-updater"
import type { UpdaterState } from "../shared/updater"

const { autoUpdater } = pkg

const MIN_CHECK_INTERVAL_MS = 10_000
const RELEASES_API_URL = "https://api.github.com/repos/ihankun/opencodex/releases/latest"
const MAC_UPDATE_CACHE_DIR = "update-cache"

export interface AutoUpdaterHandle {
  state(): UpdaterState
  check(): Promise<void>
  install(): void
}

interface GitHubAsset {
  name: string
  size: number
  digest: string | null
  browserDownloadUrl: string
}

interface GitHubRelease {
  tagName: string
  name: string | null
  body: string | null
  assets: GitHubAsset[]
}

interface MacUpdate {
  version: string
  releaseName: string | null
  releaseNotes: string | null
  assetUrl: string
  assetSize: number
  assetDigest: string | null
  downloadPath: string | null
}

export function createAutoUpdater(emit: (state: UpdaterState) => void): AutoUpdaterHandle {
  // 仅打包后的 Windows NSIS 安装版与 macOS 应用支持自动更新；Windows portable 与开发模式不启用
  const isWindows = process.platform === "win32"
  const supported = app.isPackaged && (isWindows || process.platform === "darwin") && !process.env.PORTABLE_EXECUTABLE_DIR
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
  let macUpdate: MacUpdate | null = null

  const setState = (patch: Partial<UpdaterState>) => {
    state = { ...state, ...patch }
    emit(state)
  }

  if (supported && isWindows) {
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

  const checkMac = async () => {
    const update = await checkForMacUpdate(setState)
    if (!update) return
    macUpdate = update
    const download = async () => {
      const downloadPath = await downloadMacUpdate(update, setState)
      macUpdate = { ...update, downloadPath }
      setState({
        status: "downloaded",
        version: update.version,
        releaseName: update.releaseName,
        releaseNotes: update.releaseNotes,
        progress: null,
        error: null,
      })
    }
    void download().catch((error) => setState({ status: "error", error: error instanceof Error ? error.message : String(error) }))
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
        if (isWindows) await autoUpdater.checkForUpdates()
        else await checkMac()
      } catch (error) {
        setState({ status: "error", error: error instanceof Error ? error.message : String(error) })
      } finally {
        checking = false
      }
    },
    install: () => {
      if (state.status !== "downloaded") return
      if (isWindows) {
        autoUpdater.quitAndInstall()
        return
      }
      installMacUpdate(macUpdate)
    },
  }
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, "").replace(/-.+$/, "")
}

function compareVersions(a: string, b: string): number {
  const toParts = (value: string) =>
    normalizeVersion(value)
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0)
  const left = toParts(a)
  const right = toParts(b)
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function currentArch(): string {
  return process.arch === "arm64" ? "arm64" : "x64"
}

function parseGitHubRelease(payload: unknown): GitHubRelease {
  if (!payload || typeof payload !== "object") throw new Error("Invalid release payload")
  const value = payload as Record<string, unknown>
  const tagName = typeof value.tag_name === "string" ? value.tag_name : ""
  if (!tagName) throw new Error("Missing release tag")
  const assets: GitHubAsset[] = []
  if (Array.isArray(value.assets)) {
    for (const item of value.assets) {
      if (!item || typeof item !== "object") continue
      const asset = item as Record<string, unknown>
      if (typeof asset.name !== "string" || typeof asset.browser_download_url !== "string") continue
      const digest = typeof asset.digest === "string" ? asset.digest.replace(/^sha256:/, "") : null
      assets.push({
        name: asset.name,
        size: typeof asset.size === "number" ? asset.size : 0,
        digest,
        browserDownloadUrl: asset.browser_download_url,
      })
    }
  }
  return {
    tagName,
    name: typeof value.name === "string" ? value.name : null,
    body: typeof value.body === "string" ? value.body : null,
    assets,
  }
}

async function fetchLatestRelease(): Promise<GitHubRelease> {
  const response = await net.fetch(RELEASES_API_URL, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "OpenCodex" },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return parseGitHubRelease(await response.json())
}

async function checkForMacUpdate(setState: (patch: Partial<UpdaterState>) => void): Promise<MacUpdate | null> {
  setState({ status: "checking", error: null })
  const release = await fetchLatestRelease()
  const arch = currentArch()
  const asset = release.assets.find((item) => new RegExp(`^OpenCodex-.*-${arch}\\.zip$`).test(item.name))
  if (!asset) throw new Error(`Update package for ${arch} not found`)
  const version = normalizeVersion(release.tagName)
  if (compareVersions(version, app.getVersion()) <= 0) {
    setState({ status: "not-available", error: null })
    return null
  }
  const update: MacUpdate = {
    version,
    releaseName: release.name,
    releaseNotes: release.body,
    assetUrl: asset.browserDownloadUrl,
    assetSize: asset.size,
    assetDigest: asset.digest,
    downloadPath: null,
  }
  setState({
    status: "available",
    version,
    releaseName: update.releaseName,
    releaseNotes: update.releaseNotes,
    error: null,
  })
  return update
}

function macUpdateDir(): string {
  return path.join(app.getPath("userData"), MAC_UPDATE_CACHE_DIR)
}

function sha256OfFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    const stream = createReadStream(filePath)
    stream.on("error", reject)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
  })
}

async function fileMatchesDigest(filePath: string, digest: string | null, size: number): Promise<boolean> {
  if (statSync(filePath, { throwIfNoEntry: false })?.size !== size) return false
  if (!digest) return true
  return (await sha256OfFile(filePath)) === digest
}

async function downloadMacUpdate(update: MacUpdate, setState: (patch: Partial<UpdaterState>) => void): Promise<string> {
  const destPath = path.join(macUpdateDir(), `OpenCodex-${update.version}-${currentArch()}.zip`)
  if (await fileMatchesDigest(destPath, update.assetDigest, update.assetSize)) return destPath
  mkdirSync(macUpdateDir(), { recursive: true })
  setState({ status: "downloading", progress: { percent: 0, transferred: 0, total: update.assetSize } })
  const response = await net.fetch(update.assetUrl, { headers: { "User-Agent": "OpenCodex" } })
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
  let transferred = 0
  const reader = response.body.getReader()
  const file = createWriteStream(destPath)
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      transferred += value.byteLength
      file.write(value)
      setState({
        status: "downloading",
        progress: { percent: Math.min(100, (transferred / update.assetSize) * 100), transferred, total: update.assetSize },
      })
    }
    await new Promise<void>((resolve, reject) => file.end((error: Error | null) => (error ? reject(error) : resolve())))
    if (!(await fileMatchesDigest(destPath, update.assetDigest, update.assetSize))) {
      throw new Error("Downloaded file failed SHA-256 verification")
    }
  } catch (error) {
    file.destroy()
    rmSync(destPath, { force: true })
    throw error
  }
  return destPath
}

function shQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function installMacUpdate(update: MacUpdate | null): void {
  if (!update?.downloadPath) return
  const appDir = path.resolve(path.dirname(app.getPath("exe")), "..", "..")
  const extractDir = path.join(macUpdateDir(), "extract")
  const scriptPath = path.join(macUpdateDir(), "install.sh")
  const script = [
    "#!/bin/sh",
    "sleep 3",
    `APP_DIR=${shQuote(appDir)}`,
    `ZIP_PATH=${shQuote(update.downloadPath)}`,
    `EXTRACT_DIR=${shQuote(extractDir)}`,
    'rm -rf "$EXTRACT_DIR"',
    'mkdir -p "$EXTRACT_DIR"',
    'if ! ditto -xk "$ZIP_PATH" "$EXTRACT_DIR"; then exit 1; fi',
    'NEW_APP="$EXTRACT_DIR/OpenCodex.app"',
    'if [ ! -d "$NEW_APP" ]; then exit 1; fi',
    'if [ -d "$APP_DIR" ]; then rm -rf "$APP_DIR.bak"; mv "$APP_DIR" "$APP_DIR.bak"; fi',
    'if ! mv "$NEW_APP" "$APP_DIR"; then',
    '  if [ -d "$APP_DIR.bak" ]; then mv "$APP_DIR.bak" "$APP_DIR"; fi',
    '  exit 1',
    'fi',
    'rm -rf "$APP_DIR.bak"',
    'xattr -dr com.apple.quarantine "$APP_DIR" 2>/dev/null || true',
    'open "$APP_DIR"',
  ].join("\n")
  writeFileSync(scriptPath, script, { mode: 0o755 })
  const child = spawn("/bin/sh", [scriptPath], { detached: true, stdio: "ignore" })
  child.unref()
  app.quit()
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
