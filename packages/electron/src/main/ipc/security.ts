import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerSecurityIpc(input: {
  assertSender: AssertIpcSender
  audit: () => unknown
  get: () => unknown
  installWindowsSandbox: () => unknown
  set: (value: unknown) => unknown
  windowsSandboxStatus: () => unknown
}) {
  ipcMain.handle("security:get", input.get)
  ipcMain.handle("security:audit", input.audit)
  ipcMain.handle("security:set", (event, value: unknown) => {
    input.assertSender(event)
    return input.set(value)
  })
  ipcMain.handle("security:windows-sandbox-status", input.windowsSandboxStatus)
  ipcMain.handle("security:windows-sandbox-install", (event) => {
    input.assertSender(event)
    return input.installWindowsSandbox()
  })
}
