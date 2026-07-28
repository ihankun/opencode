import { ipcMain, nativeTheme } from "electron"
import type { BrowserWindow } from "electron"

export function registerWindowIpc(input: { getWindow: () => BrowserWindow | undefined }) {
  ipcMain.handle("window:minimize", () => {
    input.getWindow()?.minimize()
  })

  ipcMain.handle("window:maximize", () => {
    const window = input.getWindow()
    if (window?.isMaximized()) {
      window.unmaximize()
      return
    }
    window?.maximize()
  })

  ipcMain.handle("window:close", () => {
    input.getWindow()?.close()
  })

  ipcMain.handle("window:is-maximized", () => {
    return input.getWindow()?.isMaximized() ?? false
  })

  ipcMain.handle("window:set-theme", (_event, value: unknown) => {
    if (value !== "system" && value !== "light" && value !== "dark") return
    if (nativeTheme.themeSource === value) return
    nativeTheme.themeSource = value
  })
}
