import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"
import type { AutoUpdaterHandle } from "../updater"

export function registerUpdaterIpc(input: { assertSender: AssertIpcSender; updater: AutoUpdaterHandle }) {
  ipcMain.handle("updater:get-state", (event) => {
    input.assertSender(event)
    return input.updater.state()
  })
  ipcMain.handle("updater:check", (event) => {
    input.assertSender(event)
    return input.updater.check()
  })
  ipcMain.handle("updater:install", (event) => {
    input.assertSender(event)
    input.updater.install()
  })
}
