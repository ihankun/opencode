import { ipcMain } from "electron"

export function registerDesktopIntegrationIpc(input: {
  capturePreview: (rect: unknown) => unknown
  discoverPreviewPorts: (host: string) => unknown
  listLocationApps: () => unknown
  openLocation: (value: unknown) => unknown
  waitConsoleLogin: (value: unknown) => unknown
}) {
  ipcMain.handle("preview:discover", (_event, host: unknown) => input.discoverPreviewPorts(String(host ?? "")))
  ipcMain.handle("preview:capture", (_event, rect: unknown) => input.capturePreview(rect))
  ipcMain.handle("location:apps", () => input.listLocationApps())
  ipcMain.handle("location:open", (_event, value: unknown) => input.openLocation(value))
  ipcMain.handle("console:login-wait", (_event, value: unknown) => input.waitConsoleLogin(value))
}
