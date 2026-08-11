import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerBadgeIpc(input: { assertSender: AssertIpcSender; updateBadge: (count: number) => void }) {
  ipcMain.handle("badge:set-count", (event, count: unknown) => {
    input.assertSender(event)
    const value = typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
    input.updateBadge(value)
  })
}
