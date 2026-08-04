import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerFilesIpc(input: {
  assertSender: AssertIpcSender
  writeFile: (directory: string, path: string, content: string) => unknown
}) {
  ipcMain.handle("file:write", (event, directory: unknown, path: unknown, content: unknown) => {
    input.assertSender(event)
    return input.writeFile(String(directory ?? ""), String(path ?? ""), String(content ?? ""))
  })
}
