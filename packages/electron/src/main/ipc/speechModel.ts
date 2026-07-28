import { ipcMain } from "electron"
import type { SpeechModelService } from "../speechModel"
import type { AssertIpcSender } from "./shared"

export function registerSpeechModelIpc(input: {
  assertSender: AssertIpcSender
  ready: () => Promise<void>
  service: SpeechModelService
}) {
  ipcMain.handle("speech-model:config-get", async (event) => {
    input.assertSender(event)
    await input.ready()
    return input.service.config()
  })

  ipcMain.handle("speech-model:config-set", async (event, value: unknown) => {
    input.assertSender(event)
    await input.ready()
    return input.service.save(value)
  })

  ipcMain.handle("speech-model:models", async (event, value: unknown) => {
    input.assertSender(event)
    await input.ready()
    return input.service.models(value)
  })

  ipcMain.handle("speech-model:transcribe", async (event, value: unknown) => {
    input.assertSender(event)
    await input.ready()
    return input.service.transcribe(value)
  })
}
