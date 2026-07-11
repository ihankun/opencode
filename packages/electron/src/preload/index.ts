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
}

export type CustomOpenCodeMcpSearchResult = {
  name: string
  version: string
  description: string
  source: string
  sourceUrl: string
  downloads: number
  publishedAt: string
  requiredEnvironment: string[]
  config: { type: "local"; command: string[] } | { type: "remote"; url: string }
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
  enabled: boolean
  status: "enabled" | "paused" | "running" | "error"
  lastRunAt: number | null
  nextRunAt: number | null
  lastError: string | null
  createdAt: number
  updatedAt: number
}

export type CustomOpenCodeScheduledTaskInput = Pick<CustomOpenCodeScheduledTask, "title" | "prompt" | "cron" | "timezone" | "directory" | "enabled">

export type CustomOpenCodeApi = {
  server(): Promise<CustomOpenCodeServerState>
  restartServer(): Promise<CustomOpenCodeServerState>
  onServerUpdated(callback: (state: CustomOpenCodeServerState) => void): () => void
  searchPlugins(query: string): Promise<CustomOpenCodePluginSearchResult[]>
  searchMcpServers(query: string): Promise<CustomOpenCodeMcpSearchResult[]>
  installPlugin(spec: string): Promise<CustomOpenCodePluginInstallResult>
  listTasks(): Promise<CustomOpenCodeScheduledTask[]>
  createTask(input: CustomOpenCodeScheduledTaskInput): Promise<CustomOpenCodeScheduledTask>
  updateTask(id: string, input: CustomOpenCodeScheduledTaskInput): Promise<CustomOpenCodeScheduledTask>
  removeTask(id: string): Promise<boolean>
  runTask(id: string): Promise<CustomOpenCodeScheduledTask>
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
  listDrives(): Promise<string[]>
  // Window controls
  windowMinimize(): Promise<void>
  windowMaximize(): Promise<void>
  windowClose(): Promise<void>
  windowIsMaximized(): Promise<boolean>
  onWindowMaximizeChange(callback: (isMaximized: boolean) => void): () => void
}

const api: CustomOpenCodeApi = {
  server: () => ipcRenderer.invoke("server:get"),
  restartServer: () => ipcRenderer.invoke("server:restart"),
  onServerUpdated(callback) {
    const listener = (_event: unknown, state: CustomOpenCodeServerState) => callback(state)
    ipcRenderer.on("server:updated", listener)
    return () => ipcRenderer.removeListener("server:updated", listener)
  },
  searchPlugins: (query) => ipcRenderer.invoke("plugin:search", query),
  searchMcpServers: (query) => ipcRenderer.invoke("mcp:search", query),
  installPlugin: (spec) => ipcRenderer.invoke("plugin:install", spec),
  listTasks: () => ipcRenderer.invoke("task:list"),
  createTask: (input) => ipcRenderer.invoke("task:create", input),
  updateTask: (id, input) => ipcRenderer.invoke("task:update", id, input),
  removeTask: (id) => ipcRenderer.invoke("task:remove", id),
  runTask: (id) => ipcRenderer.invoke("task:run", id),
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
  listDrives: () => ipcRenderer.invoke("drives:list"),
  // Window controls
  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowMaximize: () => ipcRenderer.invoke("window:maximize"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowIsMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  onWindowMaximizeChange(callback) {
    const listener = (_event: unknown, isMaximized: boolean) => callback(isMaximized)
    ipcRenderer.on("window:maximize-change", listener)
    return () => ipcRenderer.removeListener("window:maximize-change", listener)
  },
}

contextBridge.exposeInMainWorld("customOpenCode", api)
