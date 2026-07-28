import { ipcMain } from "electron"
import type { TaskScheduler } from "../scheduler"

export function registerTaskIpc(input: {
  scheduler: TaskScheduler
  ensureReady: () => Promise<void>
  notifyChanged: () => void
}) {
  ipcMain.handle("task:list", async () => {
    await input.ensureReady()
    return input.scheduler.list()
  })

  ipcMain.handle("task:run-list", async (_event, taskID: unknown) => {
    await input.ensureReady()
    return input.scheduler.listRuns(typeof taskID === "string" && taskID ? taskID : undefined)
  })

  ipcMain.handle("task:settings", async () => {
    await input.ensureReady()
    return input.scheduler.settings()
  })

  ipcMain.handle("task:settings-update", async (_event, value: Parameters<TaskScheduler["updateSettings"]>[0]) => {
    await input.ensureReady()
    const settings = input.scheduler.updateSettings(value)
    input.notifyChanged()
    return settings
  })

  ipcMain.handle("task:run-archive", async (_event, sessionID: unknown, archived: unknown) => {
    await input.ensureReady()
    input.scheduler.setRunArchived(String(sessionID), Boolean(archived))
    input.notifyChanged()
  })

  ipcMain.handle("task:create", async (_event, value: Parameters<TaskScheduler["create"]>[0]) => {
    await input.ensureReady()
    const task = input.scheduler.create(value)
    input.notifyChanged()
    return task
  })

  ipcMain.handle(
    "task:update",
    async (_event, id: unknown, value: Parameters<TaskScheduler["update"]>[1]) => {
      await input.ensureReady()
      const task = input.scheduler.update(String(id), value)
      input.notifyChanged()
      return task
    },
  )

  ipcMain.handle("task:remove", async (_event, id: unknown) => {
    await input.ensureReady()
    const removed = input.scheduler.remove(String(id))
    input.notifyChanged()
    return removed
  })

  ipcMain.handle("task:run", async (_event, id: unknown) => {
    await input.ensureReady()
    const task = await input.scheduler.run(String(id))
    input.notifyChanged()
    return task
  })

  ipcMain.handle("task:cancel", async (_event, id: unknown) => {
    await input.ensureReady()
    const task = await input.scheduler.cancelTask(String(id))
    input.notifyChanged()
    return task
  })

  ipcMain.handle("task:run-cancel", async (_event, id: unknown) => {
    await input.ensureReady()
    const run = await input.scheduler.cancelRun(String(id))
    input.notifyChanged()
    return run
  })
}
