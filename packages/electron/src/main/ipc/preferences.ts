import { ipcMain } from "electron"
import type { DesktopPreferences } from "../../shared/desktopPreferences"

export function registerDesktopPreferencesIpc(input: {
  current: () => DesktopPreferences
  save: (value: unknown) => Promise<DesktopPreferences>
}) {
  ipcMain.handle("desktop-preferences:get", input.current)
  ipcMain.handle("desktop-preferences:set", (_event, value: unknown) => input.save(value))
}
