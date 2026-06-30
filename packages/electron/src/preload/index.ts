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

export type CustomOpenCodeApi = {
  server(): Promise<CustomOpenCodeServerState>
  onServerUpdated(callback: (state: CustomOpenCodeServerState) => void): () => void
}

const api: CustomOpenCodeApi = {
  server: () => ipcRenderer.invoke("server:get"),
  onServerUpdated(callback) {
    const listener = (_event: unknown, state: CustomOpenCodeServerState) => callback(state)
    ipcRenderer.on("server:updated", listener)
    return () => ipcRenderer.removeListener("server:updated", listener)
  },
}

contextBridge.exposeInMainWorld("customOpenCode", api)
