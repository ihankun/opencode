import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerDesktopIntegrationIpc(input: {
  assertSender: AssertIpcSender
  capturePreview: (rect: unknown) => unknown
  discoverPreviewPorts: (host: string) => unknown
  listLocationApps: () => unknown
  openLocation: (value: unknown) => unknown
  waitConsoleLogin: (value: unknown) => unknown
}) {
  ipcMain.handle("preview:discover", (event, host: unknown) => {
    input.assertSender(event)
    return input.discoverPreviewPorts(String(host ?? ""))
  })
  ipcMain.handle("preview:capture", (event, rect: unknown) => {
    input.assertSender(event)
    return input.capturePreview(rect)
  })
  ipcMain.handle("location:apps", (event) => {
    input.assertSender(event)
    return input.listLocationApps()
  })
  ipcMain.handle("location:open", (event, value: unknown) => {
    input.assertSender(event)
    return input.openLocation(value)
  })
  ipcMain.handle("console:login-wait", (event, value: unknown) => {
    input.assertSender(event)
    return input.waitConsoleLogin(value)
  })
}
