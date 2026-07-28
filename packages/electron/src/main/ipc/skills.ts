import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerSkillsIpc(input: {
  assertSender: AssertIpcSender
  deleteSkill: (location: string) => unknown
  ensureRoot: () => unknown
  writeFiles: (root: string, files: unknown) => unknown
}) {
  ipcMain.handle("skill:write-files", (event, root: unknown, files: unknown) => {
    input.assertSender(event)
    return input.writeFiles(String(root ?? ""), files)
  })
  ipcMain.handle("skill:ensure-root", () => input.ensureRoot())
  ipcMain.handle("skill:delete", (event, location: unknown) => {
    input.assertSender(event)
    return input.deleteSkill(String(location ?? ""))
  })
}
