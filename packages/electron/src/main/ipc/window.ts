import { ipcMain, nativeTheme } from "electron"
import type { BrowserWindow } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerWindowIpc(input: { assertSender: AssertIpcSender; getWindow: () => BrowserWindow | undefined }) {
  ipcMain.handle("window:minimize", (event) => {
    input.assertSender(event)
    input.getWindow()?.minimize()
  })

  ipcMain.handle("window:maximize", (event) => {
    input.assertSender(event)
    const window = input.getWindow()
    if (window?.isMaximized()) {
      window.unmaximize()
      return
    }
    window?.maximize()
  })

  ipcMain.handle("window:close", (event) => {
    input.assertSender(event)
    input.getWindow()?.close()
  })

  ipcMain.handle("window:is-maximized", (event) => {
    input.assertSender(event)
    return input.getWindow()?.isMaximized() ?? false
  })

  ipcMain.handle("window:set-theme", (event, value: unknown) => {
    input.assertSender(event)
    if (value !== "system" && value !== "light" && value !== "dark") return
    if (nativeTheme.themeSource === value) return
    nativeTheme.themeSource = value
  })
}
