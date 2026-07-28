import { ipcMain } from "electron"
import type { ImBridgeService } from "../imBridge"

export function registerImBridgeIpc(input: {
  getServerUrl: () => string | undefined
  service: ImBridgeService
}) {
  ipcMain.handle("im-bridge:config-get", () => input.service.config())
  ipcMain.handle("im-bridge:config-set", (_event, config: unknown) => input.service.save(config))
  ipcMain.handle("im-bridge:state", () => input.service.state())
  ipcMain.handle("im-bridge:start", () => input.service.start(input.getServerUrl()))
  ipcMain.handle("im-bridge:stop", () => input.service.stop())
  ipcMain.handle("im-bridge:restart", () => input.service.restart(input.getServerUrl()))
}
