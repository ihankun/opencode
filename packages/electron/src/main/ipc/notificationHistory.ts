import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerNotificationHistoryIpc(input: {
  assertSender: AssertIpcSender
  list: () => unknown
  replaceAll: (notifications: unknown) => unknown
}) {
  ipcMain.handle("notification-history:list", (event) => {
    input.assertSender(event)
    return input.list()
  })
  ipcMain.handle("notification-history:replace-all", (event, notifications: unknown) => {
    input.assertSender(event)
    return input.replaceAll(notifications)
  })
}
