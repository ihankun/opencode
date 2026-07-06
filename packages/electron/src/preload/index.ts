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

export type CustomOpenCodeApi = {
  server(): Promise<CustomOpenCodeServerState>
  onServerUpdated(callback: (state: CustomOpenCodeServerState) => void): () => void
  searchPlugins(query: string): Promise<CustomOpenCodePluginSearchResult[]>
  installPlugin(spec: string): Promise<CustomOpenCodePluginInstallResult>
}

const api: CustomOpenCodeApi = {
  server: () => ipcRenderer.invoke("server:get"),
  onServerUpdated(callback) {
    const listener = (_event: unknown, state: CustomOpenCodeServerState) => callback(state)
    ipcRenderer.on("server:updated", listener)
    return () => ipcRenderer.removeListener("server:updated", listener)
  },
  searchPlugins: (query) => ipcRenderer.invoke("plugin:search", query),
  installPlugin: (spec) => ipcRenderer.invoke("plugin:install", spec),
}

contextBridge.exposeInMainWorld("customOpenCode", api)
