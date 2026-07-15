import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, nativeTheme, Notification, protocol, session, shell } from "electron"
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { spawn } from "node:child_process"
import windowState from "electron-window-state"
import { applyEdits, modify, parse as parseJsonc, printParseErrorCode } from "jsonc-parser"
import type { ParseError } from "jsonc-parser"
import { exportDebugLogs, initLogging, writeLog } from "./logging"
import { spawnServer } from "./server"
import type { SidecarHandle } from "./server"
import { TaskScheduler } from "./scheduler"

let mainWindow: BrowserWindow | undefined
let server: SidecarHandle | undefined
let serverError: string | undefined
let tray: Tray | undefined
let isQuitting = false
let isStoppingForQuit = false
const activeNotifications = new Set<Notification>()
const consoleLoginWaits = new Map<string, Promise<ConsoleLoginResult>>()
const appId = "com.hankun.opencodex"
const taskScheduler = new TaskScheduler(() => server?.state, notifyTasksChanged)

type SecurityConfig = {
  sandbox: {
    enabled: boolean
    denyRead: string[]
    allowRead: string[]
    allowWrite: string[]
    denyWrite: string[]
    allowedDomains: string[]
    deniedDomains: string[]
    allowUnixSockets: string[]
    allowAllUnixSockets: boolean
    allowLocalBinding: boolean
  }
  audit: {
    enabled: boolean
    directory: string
  }
}

// Window control IPC handlers
ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize()
})

ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle("window:close", () => {
  mainWindow?.close()
})

ipcMain.handle("window:is-maximized", () => {
  return mainWindow?.isMaximized() ?? false
})

ipcMain.handle("window:set-theme", (_event, value: unknown) => {
  if (value !== "system" && value !== "light" && value !== "dark") return
  if (nativeTheme.themeSource === value) return
  nativeTheme.themeSource = value
})

type PluginInstallTarget = {
  kind: "server" | "tui"
  opts?: Record<string, unknown>
}

type NpmPackageManifest = {
  name?: string
  version?: string
  description?: string
  keywords?: string[]
  exports?: unknown
  main?: string
  "oc-themes"?: unknown
}

type NpmSearchPackage = {
  name?: string
  version?: string
  description?: string
  keywords?: string[]
  date?: string
  publisher?: {
    username?: string
  }
  links?: { npm?: string; homepage?: string; repository?: string }
}

type NpmSearchResponse = {
  objects?: Array<{
    package?: NpmSearchPackage
  }>
}

type SkillFileInput = {
  path: string
  content: string
}

type NativeNotificationInput = {
  title?: string
  body?: string
  sessionId?: string
  directory?: string
}

type ConsoleLoginStart = {
  code?: string
  user?: string
  url?: string
  server?: string
  expiresInMs?: number
  intervalMs?: number
}

type ConsoleLoginResult = {
  status: "success" | "pending" | "slow" | "expired" | "denied" | "error"
  email?: string
  message?: string
}

function rendererUrl() {
  if (process.env.ELECTRON_RENDERER_URL) return process.env.ELECTRON_RENDERER_URL
  return `file://${join(__dirname, "../renderer/index.html")}`
}

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    showWindow()
    return
  }

  const url = rendererUrl()
  writeLog("main", "creating window", { url })

  const isMac = process.platform === "darwin"
  const isWin = process.platform === "win32"
  const state = windowState({
    file: "window-state.json",
    defaultWidth: 1180,
    defaultHeight: 760,
  })

  mainWindow = new BrowserWindow({
    title: "",
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 900,
    minHeight: 580,
    show: false,
    icon: iconPath(isMac ? "icon.icns" : "icon.ico"),
    backgroundColor: isMac ? "#00000000" : "#0f1115",
    transparent: isMac,
    vibrancy: isMac ? "sidebar" : undefined,
    visualEffectState: isMac ? "active" : undefined,
    titleBarStyle: isMac ? "hidden" : isWin ? "hidden" : "default",
    trafficLightPosition: isMac ? { x: 20, y: 18 } : undefined,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })
  state.manage(mainWindow)

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault()
    mainWindow?.setTitle("")
  })
  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send("window:maximize-change", true)
  })
  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send("window:maximize-change", false)
  })
  mainWindow.on("close", (event) => {
    if (isQuitting) return
    event.preventDefault()
    mainWindow?.hide()
  })
  mainWindow.once("ready-to-show", () => {
    writeLog("main", "window ready-to-show")
    mainWindow?.show()
  })
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    writeLog("main", "window did-fail-load", { errorCode, errorDescription, validatedURL })
    mainWindow?.show()
  })
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level < 2) return
    writeLog("renderer", "console-message", { level, message, line, sourceId })
  })
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    writeLog("renderer", "render-process-gone", details)
  })
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    void openExternalUrl(target).catch((error) => writeLog("security", "blocked window open", { target, error }))
    return { action: "deny" }
  })
  mainWindow.webContents.on("will-navigate", (event, target) => {
    if (target === url) return
    event.preventDefault()
    writeLog("security", "blocked renderer navigation", { target })
  })
  setTimeout(() => {
    if (!mainWindow || mainWindow.isVisible()) return
    writeLog("main", "forcing window show after timeout")
    mainWindow.show()
  }, 2_000)

  void mainWindow.loadURL(url).catch((error: unknown) => {
    writeLog("main", "window loadURL failed", error)
    mainWindow?.show()
  })
  void startServer(url)
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    void createWindow()
    return
  }

  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createTray() {
  if (tray) return

  const image = nativeImage.createFromPath(iconPath("generated/opencode-trayTemplate.png"))
  if (process.platform === "darwin") image.setTemplateImage(true)

  tray = new Tray(image)
  tray.setToolTip("OpenCodex")
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "打开 OpenCodex", click: showWindow },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on("click", showWindow)
}

function iconPath(filename: string) {
  return join(__dirname, "../../assets", filename)
}

function setDockIcon() {
  if (process.platform !== "darwin") return

  try {
    const image = nativeImage.createFromPath(iconPath("icon.icns"))
    if (image.isEmpty()) {
      writeLog("main", "dock icon skipped because image is empty", { path: iconPath("icon.icns") })
      return
    }
    app.dock?.setIcon(image)
  } catch (error) {
    writeLog("main", "dock icon failed", error)
  }
}

async function startServer(url: string) {
  try {
    serverError = undefined
    server = await spawnServer(app.getPath("userData"), allowedOrigins(url))
    mainWindow?.webContents.send("server:updated", currentServerState())
  } catch (error) {
    serverError = error instanceof Error ? error.message : String(error)
    writeLog("main", "failed to start opencode server", error)
    mainWindow?.webContents.send("server:updated", currentServerState())
  }
}

async function stopServer() {
  const current = server
  server = undefined
  await current?.stop()
}

async function restartServer() {
  writeLog("main", "restarting opencode server")
  serverError = undefined
  await stopServer()
  mainWindow?.webContents.send("server:updated", currentServerState())
  await startServer(rendererUrl())
  return currentServerState()
}

function allowedOrigins(url: string) {
  const defaults = ["opencodex://renderer", "http://localhost:46237", "http://127.0.0.1:46237"]
  try {
    const origin = new URL(url).origin
    if (origin === "null") return defaults
    return [...new Set([...defaults, origin])]
  } catch {
    return defaults
  }
}

if (process.platform === "darwin") {
  app.commandLine.appendSwitch("use-mock-keychain")
}
app.setName("OpenCodex")
app.setAppUserModelId(appId)
app.setPath("userData", userDataRoot())
initLogging()
writeLog("main", "app boot", { userData: app.getPath("userData") })

process.on("uncaughtException", (error) => {
  writeLog("main", "uncaughtException", error)
})

process.on("unhandledRejection", (error) => {
  writeLog("main", "unhandledRejection", error)
})

protocol.registerSchemesAsPrivileged([
  {
    scheme: "opencodex",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

function currentServerState() {
  if (server) return { status: "online" as const, server: server.state }
  return { status: "starting" as const, error: serverError }
}

function notifyTasksChanged() {
  BrowserWindow.getAllWindows().forEach((window) => window.webContents.send("task:changed"))
}

ipcMain.handle("server:get", currentServerState)
ipcMain.handle("server:restart", restartServer)
ipcMain.handle("security:get", readSecurityConfig)
ipcMain.handle("security:set", async (_event, value: unknown) => {
  const config = normalizeSecurityConfig(value)
  await writeSecurityConfig(config)
  await restartServer()
  return config
})
ipcMain.handle("plugin:search", (_event, query: unknown) => searchPlugins(String(query ?? "")))
ipcMain.handle("plugin:inspect", (_event, specs: unknown) => inspectPlugins(specs))
ipcMain.handle("mcp:search", (_event, query: unknown) => searchMcpServers(String(query ?? "")))
ipcMain.handle("plugin:install", (_event, spec: unknown) => installPlugin(String(spec ?? "")))
ipcMain.handle("task:list", () => taskScheduler.list())
ipcMain.handle("task:run-list", (_event, taskID: unknown) => taskScheduler.listRuns(typeof taskID === "string" && taskID ? taskID : undefined))
ipcMain.handle("task:run-archive", (_event, sessionID: unknown, archived: unknown) => {
  taskScheduler.setRunArchived(String(sessionID), Boolean(archived))
  notifyTasksChanged()
})
ipcMain.handle("task:create", (_event, input: Parameters<TaskScheduler["create"]>[0]) => {
  const task = taskScheduler.create(input)
  notifyTasksChanged()
  return task
})
ipcMain.handle("task:update", (_event, id: unknown, input: Parameters<TaskScheduler["update"]>[1]) => {
  const task = taskScheduler.update(String(id), input)
  notifyTasksChanged()
  return task
})
ipcMain.handle("task:remove", (_event, id: unknown) => {
  const removed = taskScheduler.remove(String(id))
  notifyTasksChanged()
  return removed
})
ipcMain.handle("task:run", async (_event, id: unknown) => {
  const task = await taskScheduler.run(String(id))
  notifyTasksChanged()
  return task
})
ipcMain.handle("skill:write-files", (_event, root: unknown, files: unknown) => writeSkillFiles(String(root ?? ""), files))
ipcMain.handle("skill:ensure-root", ensureSkillRootConfig)
ipcMain.handle("skill:delete", (_event, location: unknown) => deleteSkill(String(location ?? "")))
ipcMain.handle("browser:open-external", (_event, url: unknown) => openExternalUrl(String(url ?? "")))
ipcMain.handle("location:apps", locationApps)
ipcMain.handle("location:open", (_event, input: unknown) => openLocation(input))
ipcMain.handle("console:login-wait", (_event, login: unknown) => waitConsoleLogin(login))
ipcMain.handle("notification:permission", notificationPermission)
ipcMain.handle("notification:send", (_event, input: unknown) => sendNativeNotification(input))
ipcMain.handle("logging:export", exportDebugLogs)

// Windows 盘符列表
ipcMain.handle("drives:list", async () => {
  if (process.platform !== "win32") return []
  const { execSync } = await import("node:child_process")
  try {
    const output = execSync("wmic logicaldisk get name", { encoding: "utf-8", timeout: 5000 })
    const drives: string[] = []
    for (const line of output.split("\n")) {
      const match = line.trim().match(/^([A-Z]:)$/)
      if (match) drives.push(match[1])
    }
    return drives
  } catch {
    return []
  }
})

app.on("before-quit", (event) => {
  if (isStoppingForQuit) return
  event.preventDefault()
  isQuitting = true
  isStoppingForQuit = true
  taskScheduler.stop()
  void stopServer().finally(() => app.exit(0))
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") return
})

void app.whenReady().then(async () => {
  writeLog("main", "app ready")
  await ensureSecurityIntegration().catch((error) => writeLog("security", "failed to initialize security plugins", error))
  configureNotificationPermissionHandler()
  createTray()
  setDockIcon()
  taskScheduler.start()
  return createWindow()
}).catch((error: unknown) => {
  writeLog("main", "startup failed", error)
})

app.on("activate", () => {
  showWindow()
})

async function searchPlugins(raw: string) {
  const query = raw.trim()
  if (!query) return []

  const url = new URL("https://registry.npmjs.org/-/v1/search")
  url.searchParams.set("text", `${query} opencode plugin`)
  url.searchParams.set("size", "20")
  url.searchParams.set("quality", "0.65")
  url.searchParams.set("popularity", "0.2")
  url.searchParams.set("maintenance", "0.15")

  const response = await fetch(url)
  if (!response.ok) throw new Error(`npm search failed with ${response.status}`)

  const data = (await response.json()) as NpmSearchResponse
  const exact = await readNpmManifest(query).catch(() => undefined)
  const results = (data.objects ?? []).flatMap((item) => {
    const pkg = item.package
    if (!pkg?.name) return []
    return [
      {
        name: pkg.name,
        version: pkg.version ?? "",
        description: pkg.description ?? "",
        keywords: Array.isArray(pkg.keywords) ? pkg.keywords.filter((keyword) => typeof keyword === "string") : [],
        publisher: pkg.publisher?.username ?? "",
        date: pkg.date ?? "",
      },
    ]
  })

  const withExact = exact?.name
    ? [
        {
          name: exact.name,
          version: exact.version ?? "",
          description: exact.description ?? "",
          keywords: Array.isArray(exact.keywords) ? exact.keywords : [],
          publisher: "",
          date: "",
        },
        ...results,
      ]
    : results

  const seen = new Set<string>()
  const unique = withExact.filter((item) => {
    if (seen.has(item.name)) return false
    seen.add(item.name)
    return true
  })
  return Promise.all(unique.map(async (item) => ({
    ...item,
    source: "npm",
    url: `https://www.npmjs.com/package/${item.name}`,
    downloads: await npmDownloads(item.name),
  })))
}

async function inspectPlugins(value: unknown) {
  const specs = Array.isArray(value) ? value.filter(isString).slice(0, 50) : []
  return Promise.all(specs.map(async (spec) => {
    if (isPathPluginSpec(spec)) {
      return {
        spec,
        packageName: spec,
        configuredVersion: "",
        latestVersion: "",
        source: "local" as const,
        url: "",
        updateAvailable: false,
      }
    }

    const parsed = parseNpmSpecifier(spec)
    const latest = await readNpmManifest(parsed.name).catch(() => undefined)
    const configuredVersion = parsed.version === "latest" ? "" : parsed.version
    const latestVersion = latest?.version ?? ""
    return {
      spec,
      packageName: parsed.name,
      configuredVersion,
      latestVersion,
      source: "npm" as const,
      url: `https://www.npmjs.com/package/${parsed.name}`,
      updateAvailable: Boolean(configuredVersion && latestVersion && configuredVersion !== latestVersion),
    }
  }))
}

async function npmDownloads(name: string) {
  const response = await fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(name).replace("%2F", "%2f")}`).catch(() => undefined)
  if (!response?.ok) return 0
  const value = await response.json() as { downloads?: number }
  return value.downloads ?? 0
}

async function searchMcpServers(raw: string) {
  const query = raw.trim()
  if (!query) return []
  const url = new URL("https://registry.modelcontextprotocol.io/v0.1/servers")
  url.searchParams.set("search", query)
  url.searchParams.set("version", "latest")
  url.searchParams.set("limit", "30")
  const response = await fetch(url)
  if (!response.ok) throw new Error(`MCP Registry search failed with ${response.status}`)
  const data = await response.json() as { servers?: Array<{ server?: Record<string, unknown>; _meta?: Record<string, unknown> }> }
  return Promise.all((data.servers ?? []).flatMap((entry) => {
    const item = entry.server
    if (!item || typeof item.name !== "string") return []
    const packages = Array.isArray(item.packages) ? item.packages.filter(isRecord) : []
    const npm = packages.find((pkg) => pkg.registryType === "npm" && typeof pkg.identifier === "string")
    const remotes = Array.isArray(item.remotes) ? item.remotes.filter(isRecord) : []
    const remote = remotes.find((value) => typeof value.url === "string")
    const config = npm
      ? { type: "local" as const, command: ["npx", "-y", `${String(npm.identifier)}@${String(npm.version ?? item.version ?? "latest")}`] }
      : remote
        ? { type: "remote" as const, url: String(remote.url) }
        : undefined
    if (!config) return []
    const repository = isRecord(item.repository) ? item.repository : undefined
    const environment = npm && Array.isArray(npm.environmentVariables) ? npm.environmentVariables.filter(isRecord) : []
    const official = isRecord(entry._meta?.["io.modelcontextprotocol.registry/official"])
      ? entry._meta?.["io.modelcontextprotocol.registry/official"] as Record<string, unknown>
      : undefined
    return [{ item, npm, repository, environment, official, config }]
  }).map(async ({ item, npm, repository, environment, official, config }) => ({
    name: String(item.name),
    version: String(item.version ?? ""),
    description: typeof item.description === "string" ? item.description : "",
    source: repository?.source ? String(repository.source) : "Official MCP Registry",
    sourceUrl: repository?.url ? String(repository.url) : "https://registry.modelcontextprotocol.io/",
    downloads: npm ? await npmDownloads(String(npm.identifier)) : 0,
    publishedAt: official?.publishedAt ? String(official.publishedAt) : "",
    requiredEnvironment: environment.filter((value) => value.isRequired === true && typeof value.name === "string").map((value) => String(value.name)),
    config,
  })))
}

async function installPlugin(raw: string) {
  const spec = raw.trim()
  if (!spec) throw new Error("Plugin package name is required")
  if (isPathPluginSpec(spec)) throw new Error("One-click install only supports npm packages")

  const manifest = await readNpmManifest(spec)
  const targets = pluginTargets(manifest)
  if (!targets.length) {
    throw new Error(`${manifest.name ?? spec} does not expose opencode plugin entrypoints`)
  }

  const configDir = pluginConfigDir()
  await mkdir(configDir, { recursive: true })
  await mkdir(pluginCacheDir(), { recursive: true })

  const items = await Promise.all(targets.map((target) => patchPluginConfig(configDir, target, spec)))
  return {
    ok: true,
    spec,
    packageName: manifest.name ?? parseNpmSpecifier(spec).name,
    version: manifest.version ?? "",
    configDir,
    cacheDir: pluginCacheDir(),
    items,
  }
}

function pluginConfigDir() {
  return join(app.getPath("userData"), "config", "opencode")
}

function securityConfigFile() {
  return join(app.getPath("userData"), "security.json")
}

function defaultSecurityConfig(): SecurityConfig {
  return {
    sandbox: {
      enabled: true,
      denyRead: ["~/.ssh", "~/.gnupg", "~/.aws/credentials", "~/.azure", "~/.config/gcloud", "~/.config/gh", "~/.kube", "~/.docker/config.json", "~/.npmrc", "~/.netrc", "~/.env"],
      allowRead: [],
      allowWrite: [],
      denyWrite: [],
      allowedDomains: ["registry.npmjs.org", "*.npmjs.org", "registry.yarnpkg.com", "pypi.org", "*.pypi.org", "crates.io", "*.crates.io", "github.com", "*.github.com", "gitlab.com", "*.gitlab.com", "bitbucket.org", "*.bitbucket.org", "api.openai.com", "api.anthropic.com", "generativelanguage.googleapis.com", "*.googleapis.com"],
      deniedDomains: [],
      allowUnixSockets: [],
      allowAllUnixSockets: false,
      allowLocalBinding: false,
    },
    audit: {
      enabled: false,
      directory: join(app.getPath("userData"), "audit"),
    },
  }
}

async function readSecurityConfig() {
  const value = await readFile(securityConfigFile(), "utf8").then(JSON.parse, () => undefined)
  return normalizeSecurityConfig(value)
}

function normalizeSecurityConfig(value: unknown): SecurityConfig {
  const defaults = defaultSecurityConfig()
  if (!isRecord(value)) return defaults
  const sandbox = isRecord(value.sandbox) ? value.sandbox : {}
  const audit = isRecord(value.audit) ? value.audit : {}
  const strings = (input: unknown, fallback: string[]) => Array.isArray(input) ? input.filter(isString) : fallback
  return {
    sandbox: {
      enabled: typeof sandbox.enabled === "boolean" ? sandbox.enabled : defaults.sandbox.enabled,
      denyRead: strings(sandbox.denyRead, defaults.sandbox.denyRead),
      allowRead: strings(sandbox.allowRead, defaults.sandbox.allowRead),
      allowWrite: strings(sandbox.allowWrite, defaults.sandbox.allowWrite),
      denyWrite: strings(sandbox.denyWrite, defaults.sandbox.denyWrite),
      allowedDomains: strings(sandbox.allowedDomains, defaults.sandbox.allowedDomains),
      deniedDomains: strings(sandbox.deniedDomains, defaults.sandbox.deniedDomains),
      allowUnixSockets: strings(sandbox.allowUnixSockets, defaults.sandbox.allowUnixSockets),
      allowAllUnixSockets: typeof sandbox.allowAllUnixSockets === "boolean" ? sandbox.allowAllUnixSockets : defaults.sandbox.allowAllUnixSockets,
      allowLocalBinding: typeof sandbox.allowLocalBinding === "boolean" ? sandbox.allowLocalBinding : defaults.sandbox.allowLocalBinding,
    },
    audit: {
      enabled: typeof audit.enabled === "boolean" ? audit.enabled : defaults.audit.enabled,
      directory: typeof audit.directory === "string" && audit.directory.trim() ? resolve(audit.directory) : defaults.audit.directory,
    },
  }
}

async function ensureSecurityIntegration() {
  const config = await readSecurityConfig()
  await removeLegacySecurityPlugins()
  await rm(join(pluginConfigDir(), "logger.json"), { force: true })
  await rm(join(app.getPath("userData"), "config", "opencode-sandbox"), { recursive: true, force: true })
  await writeSecurityConfig(config)
}

async function removeLegacySecurityPlugins() {
  const file = await pluginConfigFile(pluginConfigDir(), "server")
  const text = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return
    throw error
  })
  if (!text) return
  const errors: ParseError[] = []
  const parsed = parseJsonc(text, errors, { allowTrailingComma: true }) as { plugin?: unknown[] }
  if (errors.length || !Array.isArray(parsed.plugin)) return
  const plugins = parsed.plugin.filter((item) => {
    const spec = pluginEntrySpec(item)
    return spec !== "opencode-sandbox" && spec !== "@frankhommers/opencode-plugin-logger"
  })
  if (plugins.length === parsed.plugin.length) return
  await writeFile(file, applyEdits(text, modify(text, ["plugin"], plugins, { formattingOptions: { insertSpaces: true, tabSize: 2 } })))
}

async function writeSecurityConfig(config: SecurityConfig) {
  await mkdir(dirname(securityConfigFile()), { recursive: true })
  await writeFile(securityConfigFile(), JSON.stringify(config, null, 2))
}

function pluginCacheDir() {
  return join(app.getPath("userData"), "cache", "opencode", "packages")
}

async function readNpmManifest(spec: string): Promise<NpmPackageManifest> {
  const parsed = parseNpmSpecifier(spec)
  const version = parsed.version || "latest"
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(parsed.name).replace("%2F", "%2f")}/${version}`)
  if (!response.ok) throw new Error(`npm package lookup failed with ${response.status}`)
  return (await response.json()) as NpmPackageManifest
}

function parseNpmSpecifier(spec: string) {
  if (spec.startsWith("@")) {
    const slash = spec.indexOf("/")
    const versionAt = slash >= 0 ? spec.indexOf("@", slash) : -1
    if (versionAt > 0) return { name: spec.slice(0, versionAt), version: spec.slice(versionAt + 1) }
    return { name: spec, version: "latest" }
  }

  const versionAt = spec.indexOf("@")
  if (versionAt > 0) return { name: spec.slice(0, versionAt), version: spec.slice(versionAt + 1) }
  return { name: spec, version: "latest" }
}

function isPathPluginSpec(spec: string) {
  return spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("file:")
}

function pluginTargets(pkg: NpmPackageManifest) {
  const targets: PluginInstallTarget[] = []
  const server = exportTarget(pkg.exports, "server")
  if (server) {
    targets.push({ kind: "server", opts: server.opts })
  } else if (typeof pkg.main === "string" && pkg.main.trim()) {
    targets.push({ kind: "server" })
  }

  const tui = exportTarget(pkg.exports, "tui")
  if (tui) targets.push({ kind: "tui", opts: tui.opts })
  if (!targets.some((target) => target.kind === "tui") && hasThemeTargets(pkg["oc-themes"])) {
    targets.push({ kind: "tui" })
  }

  return targets
}

function exportTarget(exports: unknown, kind: "server" | "tui") {
  if (!isRecord(exports)) return
  const value = exports[`./${kind}`]
  if (!exportValue(value)) return
  return {
    opts: exportOptions(value),
  }
}

function exportValue(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined
  if (!isRecord(value)) return
  for (const key of ["import", "default"]) {
    const next = value[key]
    if (typeof next === "string" && next.trim()) return next.trim()
  }
}

function exportOptions(value: unknown) {
  if (!isRecord(value)) return
  const config = value.config
  if (!isRecord(config)) return
  return config
}

function hasThemeTargets(value: unknown) {
  return Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim() && !item.startsWith("/") && !item.startsWith("file:"))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

async function patchPluginConfig(dir: string, target: PluginInstallTarget, spec: string) {
  const file = await pluginConfigFile(dir, target.kind)
  const text = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "{}"
    throw error
  })
  const source = text.trim() || "{}"
  const errors: ParseError[] = []
  const config = parseJsonc(source, errors, { allowTrailingComma: true }) as { plugin?: unknown[] }
  if (errors.length) {
    const error = errors[0]
    throw new Error(`Invalid JSON in ${file}: ${printParseErrorCode(error.error)}`)
  }
  const plugins = Array.isArray(config.plugin) ? config.plugin : []
  const entry = target.opts && Object.keys(target.opts).length ? [spec, target.opts] : spec
  const next = upsertPluginEntry(plugins, spec, entry)

  await writeFile(
    file,
    applyEdits(
      source,
      modify(source, ["plugin"], next.plugins, {
        formattingOptions: {
          insertSpaces: true,
          tabSize: 2,
        },
      }),
    ),
  )
  return {
    kind: target.kind,
    mode: next.mode,
    file,
  }
}

async function pluginConfigFile(dir: string, kind: "server" | "tui") {
  const name = kind === "server" ? "opencode" : "tui"
  const json = join(dir, `${name}.json`)
  const jsonc = join(dir, `${name}.jsonc`)
  const existingJsonc = await readFile(jsonc, "utf8").then(
    () => true,
    () => false,
  )
  if (existingJsonc) return jsonc
  return json
}

function upsertPluginEntry(plugins: unknown[], spec: string, entry: unknown) {
  const pkg = parseNpmSpecifier(spec).name
  const index = plugins.findIndex((item) => {
    const current = pluginEntrySpec(item)
    if (!current || current.startsWith("file:")) return false
    return parseNpmSpecifier(current).name === pkg
  })
  if (index < 0) return { mode: "add" as const, plugins: [...plugins, entry] }

  const next = [...plugins]
  next[index] = entry
  return { mode: "replace" as const, plugins: next }
}

function pluginEntrySpec(value: unknown) {
  if (typeof value === "string") return value
  if (!Array.isArray(value)) return
  if (typeof value[0] !== "string") return
  return value[0]
}

async function writeSkillFiles(rawRoot: string, rawFiles: unknown) {
  const root = resolve(rawRoot)
  const allowedRoot = resolve(app.getPath("userData"), "skills")
  if (!containsPath(allowedRoot, root)) throw new Error("Skill path must stay inside the OpenCodex skills directory")
  if (!Array.isArray(rawFiles)) throw new Error("Skill files are required")

  const files = rawFiles.flatMap((item): SkillFileInput[] => {
    if (!isRecord(item) || typeof item.path !== "string" || typeof item.content !== "string") return []
    return [{ path: item.path, content: item.content }]
  })
  if (!files.length) throw new Error("Skill files are required")

  await mkdir(root, { recursive: true })
  for (const file of files) {
    const normalized = normalizeSkillRelativePath(file.path)
    const destination = resolve(root, normalized)
    if (!containsPath(root, destination)) throw new Error("Skill file path is outside the skill directory")
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, file.content)
  }

  await ensureSkillRootConfig()
  return { ok: true as const, root, count: files.length }
}

async function ensureSkillRootConfig() {
  const configDir = pluginConfigDir()
  await mkdir(configDir, { recursive: true })
  const file = await pluginConfigFile(configDir, "server")
  const text = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "{}"
    throw error
  })
  const source = text.trim() || "{}"
  const errors: ParseError[] = []
  const config = parseJsonc(source, errors, { allowTrailingComma: true }) as { skills?: { paths?: unknown } }
  if (errors.length) {
    const error = errors[0]
    throw new Error(`Invalid JSON in ${file}: ${printParseErrorCode(error.error)}`)
  }

  const paths = Array.isArray(config.skills?.paths) ? config.skills.paths.filter(isString) : []
  if (paths.includes("~/.opencodex/skills")) return { changed: false as const, file }
  await writeFile(
    file,
    applyEdits(
      source,
      modify(source, ["skills", "paths"], [...paths, "~/.opencodex/skills"], {
        formattingOptions: {
          insertSpaces: true,
          tabSize: 2,
        },
      }),
    ),
  )
  return { changed: true as const, file }
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function configureNotificationPermissionHandler() {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission !== "notifications") {
      callback(false)
      return
    }
    writeLog("main", "notification permission requested")
    callback(true)
  })
}

async function deleteSkill(rawLocation: string) {
  const location = resolve(rawLocation)
  const allowedRoot = resolve(app.getPath("userData"), "skills")
  if (!containsPath(allowedRoot, location)) throw new Error("Only user skills can be deleted")
  if (location === allowedRoot) throw new Error("Select a skill to delete")

  const root = location.replace(/\\/g, "/").toLowerCase().endsWith("/skill.md") ? dirname(location) : location
  if (!containsPath(allowedRoot, root) || root === allowedRoot) throw new Error("Only user skills can be deleted")
  await rm(root, { recursive: true, force: true })
  return { ok: true as const, root }
}

async function openExternalUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP(S) URLs can be opened")
  await shell.openExternal(url.toString())
  return true
}

type LocationApp = { id: string; name: string; icon?: string; exe?: string; appPath?: string }

function sortLocationApps(apps: LocationApp[]) {
  const priority = ["vscode", "intellij", "cursor", "terminal", "default"]
  return apps.sort((left, right) => {
    const leftIndex = left.id === "default" ? priority.length + 1 : priority.indexOf(left.id)
    const rightIndex = right.id === "default" ? priority.length + 1 : priority.indexOf(right.id)
    return (leftIndex < 0 ? priority.length : leftIndex) - (rightIndex < 0 ? priority.length : rightIndex)
  })
}

async function locationApps(): Promise<LocationApp[]> {
  if (process.platform === "darwin") {
    return locationAppsMac()
  }
  if (process.platform === "win32") {
    return locationAppsWin()
  }
  return [{ id: "default", name: "默认应用" }]
}

async function locationAppsMac(): Promise<LocationApp[]> {
  const candidates = [
    { id: "vscode", name: "VS Code", paths: [join("/Applications", "Visual Studio Code.app"), join(homedir(), "Applications", "Visual Studio Code.app")] },
    { id: "intellij", name: "IntelliJ IDEA", paths: [join("/Applications", "IntelliJ IDEA.app"), join("/Applications", "IntelliJ IDEA CE.app"), join(homedir(), "Applications", "IntelliJ IDEA.app"), join(homedir(), "Applications", "IntelliJ IDEA CE.app")] },
    { id: "cursor", name: "Cursor", paths: [join("/Applications", "Cursor.app"), join(homedir(), "Applications", "Cursor.app")] },
    { id: "terminal", name: "Terminal", paths: ["/System/Applications/Utilities/Terminal.app", "/Applications/Utilities/Terminal.app"] },
    { id: "default", name: "Finder", paths: ["/System/Library/CoreServices/Finder.app"] },
  ]
  const installed = await Promise.all(
    candidates.map(async ({ id, name, paths }) => {
      try {
        const location = await Promise.any(
          paths.map(async candidate => {
            await access(candidate)
            return candidate
          }),
        )
        const icon = (await app.getFileIcon(location, { size: "small" })).toDataURL()
        return { id, name, icon, appPath: location }
      } catch {
        return undefined
      }
    }),
  )
  return sortLocationApps(installed.flatMap(item => item ? [item] : []))
}

async function locationAppsWin(): Promise<LocationApp[]> {
  const { execSync } = await import("node:child_process")
  const { readdir } = await import("node:fs/promises")

  const localAppData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local")

  // Known editors: match by DisplayName in registry
  const knownApps: Array<{ id: string; name: string; patterns: RegExp[]; exeName: string }> = [
    { id: "vscode", name: "VS Code", patterns: [/Visual Studio Code/i], exeName: "Code.exe" },
    { id: "cursor", name: "Cursor", patterns: [/^Cursor$/i, /Cursor Editor/i], exeName: "Cursor.exe" },
    { id: "intellij", name: "IntelliJ IDEA", patterns: [/IntelliJ IDEA/i], exeName: "idea64.exe" },
    { id: "webstorm", name: "WebStorm", patterns: [/^WebStorm$/i], exeName: "ws64.exe" },
  ]

  const found = new Map<string, { name: string; exe: string }>()

  // Single recursive query per registry root — much faster than per-subkey queries
  const regRoots = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ]

  for (const root of regRoots) {
    try {
      const output = execSync(
        `reg query "${root}" /s 2>nul`,
        { encoding: "utf-8", timeout: 8000, windowsHide: true, maxBuffer: 1024 * 1024 },
      )

      let currentDisplayName = ""
      let currentInstallLocation = ""

      const flush = () => {
        if (currentDisplayName && currentInstallLocation) {
          for (const app of knownApps) {
            if (!found.has(app.id) && app.patterns.some(p => p.test(currentDisplayName))) {
              const exePath = join(currentInstallLocation, app.exeName)
              found.set(app.id, { name: app.name, exe: exePath })
            }
          }
        }
        currentDisplayName = ""
        currentInstallLocation = ""
      }

      for (const line of output.split("\n")) {
        // New subkey header resets current state
        if (line.match(/^HK/)) {
          flush()
          continue
        }

        const nameMatch = line.match(/DisplayName\s+REG_SZ\s+(.+)/i)
        if (nameMatch) {
          currentDisplayName = nameMatch[1].trim()
          continue
        }

        const locMatch = line.match(/InstallLocation\s+REG_SZ\s+(.+)/i)
        if (locMatch) {
          currentInstallLocation = locMatch[1].trim().replace(/\\+$/, "")
        }
      }
      flush()
    } catch {
      // registry root not available
    }
  }

  // JetBrains Toolbox fallback
  try {
    const toolboxBase = join(localAppData, "JetBrains", "Toolbox", "apps")
    const toolboxApps = [
      { id: "intellij", name: "IntelliJ IDEA", pattern: /IDEA/i, exe: "idea64.exe" },
      { id: "webstorm", name: "WebStorm", pattern: /WebStorm/i, exe: "ws64.exe" },
    ]
    const categories = await readdir(toolboxBase)
    for (const category of categories) {
      try {
        const apps = await readdir(join(toolboxBase, category))
        for (const appDir of apps) {
          for (const tb of toolboxApps) {
            if (!found.has(tb.id) && tb.pattern.test(appDir)) {
              const exePath = join(toolboxBase, category, appDir, "current", "bin", tb.exe)
              try {
                await access(exePath)
                found.set(tb.id, { name: tb.name, exe: exePath })
              } catch {}
            }
          }
        }
      } catch {}
    }
  } catch {}

  // Build result
  const result: LocationApp[] = []
  for (const [id, { name, exe }] of found) {
    try {
      await access(exe)
      const icon = (await app.getFileIcon(exe, { size: "small" })).toDataURL()
      result.push({ id, name, icon, exe })
    } catch {}
  }

  result.push({ id: "default", name: "文件管理器" })
  writeLog("main", "locationAppsWin: result", { count: result.length, ids: result.map(r => r.id) })
  return sortLocationApps(result)
}

async function openLocation(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid location request")
  const value = input as { path?: unknown; appId?: unknown }
  if (typeof value.path !== "string" || !value.path) throw new Error("A location is required")
  const appId = typeof value.appId === "string" ? value.appId : "default"
  if (appId === "default") {
    await shell.openPath(value.path)
    return true
  }

  if (process.platform === "win32") {
    // Windows: use the exe path directly
    const apps = await locationAppsWin()
    const app = apps.find(item => item.id === appId)
    if (!app?.exe) throw new Error("Selected application is not installed")
    await new Promise<void>((resolveOpen, rejectOpen) => {
      const child = spawn(app.exe!, [value.path], { detached: true, stdio: "ignore" })
      child.unref()
      child.once("error", rejectOpen)
      child.once("exit", code => (code === 0 ? resolveOpen() : rejectOpen(new Error("Failed to open location"))))
    })
    return true
  }

  // macOS
  const apps = await locationAppsMac()
  const app = apps.find(item => item.id === appId)
  if (!app?.appPath) throw new Error("Selected application is not installed")
  await new Promise<void>((resolveOpen, rejectOpen) => {
    const child = spawn("open", [app.appPath, value.path])
    child.once("error", rejectOpen)
    child.once("exit", code => (code === 0 ? resolveOpen() : rejectOpen(new Error("Failed to open location"))))
  })
  return true
}

async function waitConsoleLogin(rawLogin: unknown): Promise<ConsoleLoginResult> {
  const current = server?.state
  if (!current) throw new Error("OpenCodex server is not ready")

  const login = normalizeConsoleLogin(rawLogin)
  const key = `${login.server}:${login.code}`
  const existing = consoleLoginWaits.get(key)
  if (existing) return existing

  const waiting = performConsoleLoginWait(current, login).finally(() => {
    consoleLoginWaits.delete(key)
  })
  consoleLoginWaits.set(key, waiting)
  return waiting
}

async function performConsoleLoginWait(current: SidecarHandle["state"], login: ReturnType<typeof normalizeConsoleLogin>) {
  writeLog("main", "console login wait started", { server: login.server, intervalMs: login.intervalMs, expiresInMs: login.expiresInMs })

  const response = await fetch(new URL("/experimental/console/login/wait", current.url), {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Basic ${Buffer.from(`${current.username}:${current.password}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(login),
  })
  const text = await response.text()
  if (!response.ok) {
    writeLog("main", "console login wait failed", { status: response.status, body: text })
    throw new Error(text ? `HTTP ${response.status}: ${text}` : `HTTP ${response.status}`)
  }

  const result = parseConsoleLoginResult(text)
  writeLog("main", "console login wait result", result)
  return result
}

async function notificationPermission() {
  const supported = Notification.isSupported()
  writeLog("main", "notification permission checked", { supported })
  if (!supported) return "denied" as const
  return "granted" as const
}

async function sendNativeNotification(input: unknown) {
  if (!Notification.isSupported()) {
    writeLog("main", "native notification unsupported")
    return { ok: false as const, permission: "denied" as const }
  }
  const notificationInput = normalizeNativeNotification(input)
  writeLog("main", "showing native notification", {
    title: notificationInput.title,
    hasBody: Boolean(notificationInput.body),
    hasSessionId: Boolean(notificationInput.sessionId),
  })
  const notification = new Notification({
    title: notificationInput.title,
    body: notificationInput.body,
  })
  activeNotifications.add(notification)
  notification.once("show", () => writeLog("main", "native notification shown"))
  notification.once("failed", (_event, error) => {
    writeLog("main", "native notification failed", { error })
  })
  notification.once("close", () => {
    activeNotifications.delete(notification)
    writeLog("main", "native notification closed")
  })
  notification.on("click", () => {
    showWindow()
    if (!notificationInput.sessionId) return
    mainWindow?.webContents.send("notification:clicked", {
      sessionId: notificationInput.sessionId,
      directory: notificationInput.directory,
    })
  })
  const resultPromise = new Promise<{ ok: true } | { ok: false; error: string }>((resolveResult) => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      resolveResult({ ok: true })
    }, 1_500)
    notification.once("show", () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolveResult({ ok: true })
    })
    notification.once("failed", (_event, error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolveResult({ ok: false, error })
    })
  })
  notification.show()
  const result = await resultPromise
  return { ...result, permission: await notificationPermission() }
}

function normalizeNativeNotification(input: unknown): Required<Pick<NativeNotificationInput, "title" | "body">> &
  Pick<NativeNotificationInput, "sessionId" | "directory"> {
  if (!isRecord(input)) return { title: "OpenCodex", body: "" }
  return {
    title: typeof input.title === "string" && input.title.trim() ? input.title : "OpenCodex",
    body: typeof input.body === "string" ? input.body : "",
    sessionId: typeof input.sessionId === "string" ? input.sessionId : undefined,
    directory: typeof input.directory === "string" ? input.directory : undefined,
  }
}

function normalizeSkillRelativePath(value: string) {
  const file = value.replace(/\\/g, "/").replace(/^\/+/, "")
  if (!file || file.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Skill file path is invalid")
  }
  return file
}

function userDataRoot() {
  return join(homedir(), ".opencodex")
}

function normalizeConsoleLogin(rawLogin: unknown) {
  if (!rawLogin || typeof rawLogin !== "object") throw new Error("Invalid console login payload")
  const login = rawLogin as ConsoleLoginStart
  if (!login.code || !login.user || !login.url || !login.server) throw new Error("Invalid console login payload")
  return {
    code: login.code,
    user: login.user,
    url: login.url,
    server: login.server,
    expiresInMs: Math.max(0, Number(login.expiresInMs ?? 0)),
    intervalMs: Math.max(0, Number(login.intervalMs ?? 0)),
  }
}

function parseConsoleLoginResult(text: string): ConsoleLoginResult {
  const result = JSON.parse(text) as ConsoleLoginResult
  if (
    result.status !== "success" &&
    result.status !== "pending" &&
    result.status !== "slow" &&
    result.status !== "expired" &&
    result.status !== "denied" &&
    result.status !== "error"
  ) {
    throw new Error("Invalid console login result")
  }
  return result
}

function containsPath(parent: string, child: string) {
  const next = relative(parent, child)
  return next === "" || (!next.startsWith("..") && !next.startsWith("/") && !/^[A-Za-z]:/.test(next))
}
