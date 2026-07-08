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

export type CustomOpenCodeApi = {
  server(): Promise<CustomOpenCodeServerState>
  restartServer(): Promise<CustomOpenCodeServerState>
  onServerUpdated(callback: (state: CustomOpenCodeServerState) => void): () => void
  searchPlugins(query: string): Promise<CustomOpenCodePluginSearchResult[]>
  installPlugin(spec: string): Promise<CustomOpenCodePluginInstallResult>
  writeSkillFiles(root: string, files: Array<{ path: string; content: string }>): Promise<CustomOpenCodeSkillWriteResult>
  ensureSkillRoot(): Promise<CustomOpenCodeSkillEnsureRootResult>
  deleteSkill(location: string): Promise<CustomOpenCodeSkillDeleteResult>
  openExternalUrl(url: string): Promise<boolean>
  waitConsoleLogin(login: CustomOpenCodeConsoleLoginStart): Promise<CustomOpenCodeConsoleLoginResult>
  notificationPermission(): Promise<CustomOpenCodeNotificationPermission>
  sendNotification(input: {
    title: string
    body?: string
    sessionId?: string
    directory?: string
  }): Promise<CustomOpenCodeNotificationSendResult>
  onNotificationClicked(callback: (data: { sessionId?: string; directory?: string }) => void): () => void
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
  installPlugin: (spec) => ipcRenderer.invoke("plugin:install", spec),
  writeSkillFiles: (root, files) => ipcRenderer.invoke("skill:write-files", root, files),
  ensureSkillRoot: () => ipcRenderer.invoke("skill:ensure-root"),
  deleteSkill: (location) => ipcRenderer.invoke("skill:delete", location),
  openExternalUrl: (url) => ipcRenderer.invoke("browser:open-external", url),
  waitConsoleLogin: (login) => ipcRenderer.invoke("console:login-wait", login),
  notificationPermission: () => ipcRenderer.invoke("notification:permission"),
  sendNotification: (input) => ipcRenderer.invoke("notification:send", input),
  onNotificationClicked(callback) {
    const listener = (_event: unknown, data: { sessionId?: string; directory?: string }) => callback(data)
    ipcRenderer.on("notification:clicked", listener)
    return () => ipcRenderer.removeListener("notification:clicked", listener)
  },
}

contextBridge.exposeInMainWorld("customOpenCode", api)
