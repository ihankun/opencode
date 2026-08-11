import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerNotificationIpc(input: {
  assertSender: AssertIpcSender
  microphonePermission: () => unknown
  notificationPermission: () => unknown
  sendNotification: (value: unknown) => unknown
}) {
  ipcMain.handle("notification:permission", (event) => {
    input.assertSender(event)
    return input.notificationPermission()
  })
  ipcMain.handle("notification:send", (event, value: unknown) => {
    input.assertSender(event)
    return input.sendNotification(value)
  })
  ipcMain.handle("microphone:permission", (event) => {
    input.assertSender(event)
    return input.microphonePermission()
  })
}
