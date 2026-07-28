import { ipcMain } from "electron"
import type { SidecarHandle } from "../server"
import type { AssertIpcSender } from "./shared"

type ServerState =
  | { status: "online"; server: SidecarHandle["state"] }
  | { status: "starting"; error?: string }

export function registerServerIpc(input: {
  assertSender: AssertIpcSender
  current: () => ServerState
  restart: () => Promise<ServerState>
}) {
  ipcMain.handle("server:get", input.current)
  ipcMain.handle("server:restart", (event) => {
    input.assertSender(event)
    return input.restart()
  })
}
