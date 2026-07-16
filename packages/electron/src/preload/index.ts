import { contextBridge, ipcRenderer } from "electron"

export type CustomOpenCodeServerState = {
    status: "online"
    server: {
      url: string
      username: string
      password: string
    }
  } | {
    status: "starting"
    error?: string
  }

export type CustomOpenCodePluginSearchResult = {
  name: string
  version: string
  description: string
  keywords: string[]
  publisher: string
  date: string
  source: string
  downloads: number
  url: string
  compatibility: "supported" | "unsupported" | "unknown"
}

export type CustomOpenCodePluginMetadata = {
  spec: string
  packageName: string
  configuredVersion: string
  latestVersion: string
  source: 'npm' | 'local'
  url: string
  updateAvailable: boolean
}

export type CustomOpenCodeMcpSearchResult = {
  provider: "official" | "netease"
  name: string
  version: string
  description: string
  source: string
  sourceUrl: string
  downloads: number
  publishedAt: string
  requiredEnvironment: string[]
  category: string
  tags: string[]
  config: { type: "local"; command: string[] } | { type: "remote"; url: string }
}

export type CustomOpenCodeMcpSearchPage = {
  data: CustomOpenCodeMcpSearchResult[]
  nextCursor: string | null
  categories: Array<{ id: string; nameZh: string; nameEn: string }>
}

export type CustomOpenCodeExpertKit = {
  id: string
  name: string
  description: string
  icon: string
  author: string
  version: string
  downloadCount: number
  tryAsking: string[]
  skills: Array<{ id: string; name: string; description: string }>
  installed: boolean
  updateAvailable: boolean
}

export type CustomOpenCodePluginInstallResult = {
  ok: true
  spec: string
  packageName: string
  version: string
  configDir: string
  cacheDir: string
  items: Array<{
    kind: "server" | "tui"
    mode: "add" | "replace"
    file: string
  }>
}

export type CustomOpenCodeSkillWriteResult = {
  ok: true
  root: string
  count: number
}

export type CustomOpenCodeSkillEnsureRootResult = {
  changed: boolean
  file: string
}

export type CustomOpenCodeSkillDeleteResult = {
  ok: true
  root: string
}

export type CustomOpenCodeNotificationPermission = "default" | "granted" | "denied"

export type CustomOpenCodeNotificationSendResult = {
  ok: boolean
  permission: CustomOpenCodeNotificationPermission
  error?: string
}

export type CustomOpenCodeConsoleLoginStart = {
  code: string
  user: string
  url: string
  server: string
  expiresInMs: number
  intervalMs: number
}

export type CustomOpenCodeConsoleLoginResult = {
  status: "success" | "pending" | "slow" | "expired" | "denied" | "error"
  email?: string
  message?: string
}

export type CustomOpenCodeLocationApp = { id: string; name: string; icon?: string }

export type CustomOpenCodeScheduledTask = {
  id: string
  title: string
  prompt: string
  cron: string
  timezone: string
  directory: string
  modelProviderID: string
  modelID: string
  variant: string
  enabled: boolean
  status: "enabled" | "paused" | "running" | "error"
  lastRunAt: number | null
  nextRunAt: number | null
  lastError: string | null
  createdAt: number
  updatedAt: number
}

export type CustomOpenCodeScheduledTaskInput = Pick<CustomOpenCodeScheduledTask, "title" | "prompt" | "cron" | "timezone" | "directory" | "modelProviderID" | "modelID" | "variant" | "enabled">

export type CustomOpenCodeScheduledTaskRun = {
  id: string
  taskID: string
  taskTitle: string
  prompt: string
  sessionID: string
  directory: string
  modelProviderID: string
  modelID: string
  variant: string
  status: "running" | "submitted" | "failed"
  error: string | null
  createdAt: number
}

export type CustomOpenCodeSecurityConfig = {
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

export type CustomOpenCodeApi = {
  server(): Promise<CustomOpenCodeServerState>
  restartServer(): Promise<CustomOpenCodeServerState>
  security(): Promise<CustomOpenCodeSecurityConfig>
  updateSecurity(config: CustomOpenCodeSecurityConfig): Promise<CustomOpenCodeSecurityConfig>
  onServerUpdated(callback: (state: CustomOpenCodeServerState) => void): () => void
  searchPlugins(query: string): Promise<CustomOpenCodePluginSearchResult[]>
  inspectPlugins(specs: string[]): Promise<CustomOpenCodePluginMetadata[]>
  searchMcpServers(input: { provider: "official" | "netease"; query: string; category?: string; cursor?: string }): Promise<CustomOpenCodeMcpSearchPage>
  setMcpMarketplaceSource(input: { directory?: string; name: string; provider: "official" | "netease" | null }): Promise<void>
  searchExpertKits(query: string): Promise<CustomOpenCodeExpertKit[]>
  installExpertKit(id: string, force?: boolean): Promise<void>
  removeExpertKit(id: string, force?: boolean): Promise<void>
  installPlugin(spec: string): Promise<CustomOpenCodePluginInstallResult>
  listTasks(): Promise<CustomOpenCodeScheduledTask[]>
  listTaskRuns(taskID?: string): Promise<CustomOpenCodeScheduledTaskRun[]>
  setTaskRunArchived(sessionID: string, archived: boolean): Promise<void>
  createTask(input: CustomOpenCodeScheduledTaskInput): Promise<CustomOpenCodeScheduledTask>
  updateTask(id: string, input: CustomOpenCodeScheduledTaskInput): Promise<CustomOpenCodeScheduledTask>
  removeTask(id: string): Promise<boolean>
  runTask(id: string): Promise<CustomOpenCodeScheduledTask>
  onTasksChanged(callback: () => void): () => void
  writeSkillFiles(root: string, files: Array<{ path: string; content: string }>): Promise<CustomOpenCodeSkillWriteResult>
  ensureSkillRoot(): Promise<CustomOpenCodeSkillEnsureRootResult>
  deleteSkill(location: string): Promise<CustomOpenCodeSkillDeleteResult>
  openExternalUrl(url: string): Promise<boolean>
  locationApps(): Promise<CustomOpenCodeLocationApp[]>
  openLocation(input: { path: string; appId: string }): Promise<boolean>
  waitConsoleLogin(login: CustomOpenCodeConsoleLoginStart): Promise<CustomOpenCodeConsoleLoginResult>
  notificationPermission(): Promise<CustomOpenCodeNotificationPermission>
  sendNotification(input: {
    title: string
    body?: string
    sessionId?: string
    directory?: string
  }): Promise<CustomOpenCodeNotificationSendResult>
  onNotificationClicked(callback: (data: { sessionId?: string; directory?: string }) => void): () => void
  exportDebugLogs(): Promise<string>
  listDrives(): Promise<string[]>
  // Window controls
  windowMinimize(): Promise<void>
  windowMaximize(): Promise<void>
  windowClose(): Promise<void>
  windowIsMaximized(): Promise<boolean>
  windowSetTheme(theme: "system" | "light" | "dark"): Promise<void>
  onWindowMaximizeChange(callback: (isMaximized: boolean) => void): () => void
}

const api: CustomOpenCodeApi = {
  server: () => ipcRenderer.invoke("server:get"),
  restartServer: () => ipcRenderer.invoke("server:restart"),
  security: () => ipcRenderer.invoke("security:get"),
  updateSecurity: (config) => ipcRenderer.invoke("security:set", config),
  onServerUpdated(callback) {
    const listener = (_event: unknown, state: CustomOpenCodeServerState) => callback(state)
    ipcRenderer.on("server:updated", listener)
    return () => ipcRenderer.removeListener("server:updated", listener)
  },
  searchPlugins: (query) => ipcRenderer.invoke("plugin:search", query),
  inspectPlugins: (specs) => ipcRenderer.invoke("plugin:inspect", specs),
  searchMcpServers: (input) => ipcRenderer.invoke("mcp:search", input),
  setMcpMarketplaceSource: (input) => ipcRenderer.invoke("mcp:source-set", input),
  searchExpertKits: (query) => ipcRenderer.invoke("expert-kit:search", query),
  installExpertKit: (id, force) => ipcRenderer.invoke("expert-kit:install", id, force),
  removeExpertKit: (id, force) => ipcRenderer.invoke("expert-kit:remove", id, force),
  installPlugin: (spec) => ipcRenderer.invoke("plugin:install", spec),
  listTasks: () => ipcRenderer.invoke("task:list"),
  listTaskRuns: (taskID) => ipcRenderer.invoke("task:run-list", taskID),
  setTaskRunArchived: (sessionID, archived) => ipcRenderer.invoke("task:run-archive", sessionID, archived),
  createTask: (input) => ipcRenderer.invoke("task:create", input),
  updateTask: (id, input) => ipcRenderer.invoke("task:update", id, input),
  removeTask: (id) => ipcRenderer.invoke("task:remove", id),
  runTask: (id) => ipcRenderer.invoke("task:run", id),
  onTasksChanged(callback) {
    const listener = () => callback()
    ipcRenderer.on("task:changed", listener)
    return () => ipcRenderer.removeListener("task:changed", listener)
  },
  writeSkillFiles: (root, files) => ipcRenderer.invoke("skill:write-files", root, files),
  ensureSkillRoot: () => ipcRenderer.invoke("skill:ensure-root"),
  deleteSkill: (location) => ipcRenderer.invoke("skill:delete", location),
  openExternalUrl: (url) => ipcRenderer.invoke("browser:open-external", url),
  locationApps: () => ipcRenderer.invoke("location:apps"),
  openLocation: (input) => ipcRenderer.invoke("location:open", input),
  waitConsoleLogin: (login) => ipcRenderer.invoke("console:login-wait", login),
  notificationPermission: () => ipcRenderer.invoke("notification:permission"),
  sendNotification: (input) => ipcRenderer.invoke("notification:send", input),
  onNotificationClicked(callback) {
    const listener = (_event: unknown, data: { sessionId?: string; directory?: string }) => callback(data)
    ipcRenderer.on("notification:clicked", listener)
    return () => ipcRenderer.removeListener("notification:clicked", listener)
  },
  exportDebugLogs: () => ipcRenderer.invoke("logging:export"),
  listDrives: () => ipcRenderer.invoke("drives:list"),
  // Window controls
  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowMaximize: () => ipcRenderer.invoke("window:maximize"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowIsMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  windowSetTheme: (theme) => ipcRenderer.invoke("window:set-theme", theme),
  onWindowMaximizeChange(callback) {
    const listener = (_event: unknown, isMaximized: boolean) => callback(isMaximized)
    ipcRenderer.on("window:maximize-change", listener)
    return () => ipcRenderer.removeListener("window:maximize-change", listener)
  },
}

contextBridge.exposeInMainWorld("customOpenCode", api)
