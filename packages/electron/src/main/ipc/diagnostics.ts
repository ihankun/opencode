import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerDiagnosticsIpc(input: {
  assertSender: AssertIpcSender
  exportLogs: () => unknown
  getDiagnostics: () => unknown
}) {
  ipcMain.handle("logging:export", (event) => {
    input.assertSender(event)
    return input.exportLogs()
  })
  ipcMain.handle("diagnostics:get", (event) => {
    input.assertSender(event)
    return input.getDiagnostics()
  })
}
