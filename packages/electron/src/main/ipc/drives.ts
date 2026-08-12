import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerDrivesIpc(input: { assertSender: AssertIpcSender }) {
  ipcMain.handle("drives:list", async (event) => {
    input.assertSender(event)
    if (process.platform !== "win32") return []
    const { execSync } = await import("node:child_process")
    try {
      const output = execSync("wmic logicaldisk get name", { encoding: "utf-8", timeout: 5000 })
      return output.split("\n").flatMap((line) => {
        const match = line.trim().match(/^([A-Z]:)$/)
        return match ? [match[1]] : []
      })
    } catch {
      return []
    }
  })
}
