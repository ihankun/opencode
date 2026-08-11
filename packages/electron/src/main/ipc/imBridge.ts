import { ipcMain } from "electron"
import type { ImBridgeService } from "../imBridge"
import type { AssertIpcSender } from "./shared"

export function registerImBridgeIpc(input: {
  assertSender: AssertIpcSender
  getServerUrl: () => string | undefined
  service: ImBridgeService
}) {
  ipcMain.handle("im-bridge:config-get", (event) => {
    input.assertSender(event)
    return input.service.config()
  })
  ipcMain.handle("im-bridge:config-set", (event, config: unknown) => {
    input.assertSender(event)
    return input.service.save(config)
  })
  ipcMain.handle("im-bridge:state", (event) => {
    input.assertSender(event)
    return input.service.state()
  })
  ipcMain.handle("im-bridge:start", (event) => {
    input.assertSender(event)
    return input.service.start(input.getServerUrl())
  })
  ipcMain.handle("im-bridge:stop", (event) => {
    input.assertSender(event)
    return input.service.stop()
  })
  ipcMain.handle("im-bridge:restart", (event) => {
    input.assertSender(event)
    return input.service.restart(input.getServerUrl())
  })
}
