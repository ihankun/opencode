import { ipcMain } from "electron"
import type { CustomOpenCodeDeepLink } from "../../shared/deepLinks"
import type { AssertIpcSender } from "./shared"

export function registerDeepLinkIpc(input: {
  assertSender: AssertIpcSender
  consumeInitial: () => CustomOpenCodeDeepLink[]
}) {
  ipcMain.handle("deep-link:consume-initial", (event) => {
    input.assertSender(event)
    return input.consumeInitial()
  })
}
