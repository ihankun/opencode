import { ipcMain } from "electron"
import type { RendererSettingsStore } from "../rendererSettings"
import type { AssertIpcSender } from "./shared"

export function registerRendererSettingsIpc(input: {
  assertSender: AssertIpcSender
  store: RendererSettingsStore
}) {
  ipcMain.handle("renderer-settings:get", (event) => {
    input.assertSender(event)
    return input.store.current()
  })
  ipcMain.handle("renderer-settings:set", (event, settings: unknown) => {
    input.assertSender(event)
    return input.store.save(settings)
  })
}
