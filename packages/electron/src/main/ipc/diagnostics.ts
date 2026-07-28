import { ipcMain } from "electron"

export function registerDiagnosticsIpc(input: {
  exportLogs: () => unknown
  getDiagnostics: () => unknown
}) {
  ipcMain.handle("logging:export", () => input.exportLogs())
  ipcMain.handle("diagnostics:get", () => input.getDiagnostics())
}
