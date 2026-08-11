import { ipcMain } from "electron"

export function registerBadgeIpc(input: { updateBadge: (count: number) => void }) {
  ipcMain.handle("badge:set-count", (_event, count: unknown) => {
    const value = typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
    input.updateBadge(value)
  })
}
