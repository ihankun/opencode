import { BrowserWindow, dialog, ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerDialogIpc(input: { assertSender: AssertIpcSender }) {
  ipcMain.handle("dialog:select-directory", async (event, value: unknown) => {
    input.assertSender(event)
    const defaultPath = typeof value === "string" && value ? value : undefined
    const options: Electron.OpenDialogOptions = {
      title: "Select Folder",
      defaultPath,
      properties: ["openDirectory", "createDirectory"],
      buttonLabel: "Select",
    }
    const owner = BrowserWindow.fromWebContents(event.sender)
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}