import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerBrowserIpc(input: {
  assertSender: AssertIpcSender
  openExternal: (url: string) => unknown
  openInternal: (url: string) => unknown
}) {
  ipcMain.handle("browser:open-external", (event, url: unknown) => {
    input.assertSender(event)
    return input.openExternal(String(url ?? ""))
  })
  ipcMain.handle("browser:open-internal", (event, url: unknown) => {
    input.assertSender(event)
    return input.openInternal(String(url ?? ""))
  })
}
