import { ipcMain } from "electron"
import type { DesktopPreferences } from "../../shared/desktopPreferences"
import type { AssertIpcSender } from "./shared"

export function registerDesktopPreferencesIpc(input: {
  assertSender: AssertIpcSender
  current: () => DesktopPreferences
  save: (value: unknown) => Promise<DesktopPreferences>
}) {
  ipcMain.handle("desktop-preferences:get", (event) => {
    input.assertSender(event)
    return input.current()
  })
  ipcMain.handle("desktop-preferences:set", (event, value: unknown) => {
    input.assertSender(event)
    return input.save(value)
  })
}
