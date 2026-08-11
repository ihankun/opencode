import { ipcMain } from "electron"
import type { TaskScheduler } from "../scheduler"
import type { AssertIpcSender } from "./shared"

export function registerTaskIpc(input: {
  assertSender: AssertIpcSender
  scheduler: TaskScheduler
  ensureReady: () => Promise<void>
  notifyChanged: () => void
}) {
  ipcMain.handle("task:list", async (event) => {
    input.assertSender(event)
    await input.ensureReady()
    return input.scheduler.list()
  })

  ipcMain.handle("task:run-list", async (event, taskID: unknown) => {
    input.assertSender(event)
    await input.ensureReady()
    return input.scheduler.listRuns(typeof taskID === "string" && taskID ? taskID : undefined)
  })

  ipcMain.handle("task:settings", async (event) => {
    input.assertSender(event)
    await input.ensureReady()
    return input.scheduler.settings()
  })

  ipcMain.handle("task:settings-update", async (event, value: Parameters<TaskScheduler["updateSettings"]>[0]) => {
    input.assertSender(event)
    await input.ensureReady()
    const settings = input.scheduler.updateSettings(value)
    input.notifyChanged()
    return settings
  })

  ipcMain.handle("task:run-archive", async (event, sessionID: unknown, archived: unknown) => {
    input.assertSender(event)
    await input.ensureReady()
    input.scheduler.setRunArchived(String(sessionID), Boolean(archived))
    input.notifyChanged()
  })

  ipcMain.handle("task:create", async (event, value: Parameters<TaskScheduler["create"]>[0]) => {
    input.assertSender(event)
    await input.ensureReady()
    const task = input.scheduler.create(value)
    input.notifyChanged()
    return task
  })

  ipcMain.handle(
    "task:update",
    async (event, id: unknown, value: Parameters<TaskScheduler["update"]>[1]) => {
      input.assertSender(event)
      await input.ensureReady()
      const task = input.scheduler.update(String(id), value)
      input.notifyChanged()
      return task
    },
  )

  ipcMain.handle("task:remove", async (event, id: unknown) => {
    input.assertSender(event)
    await input.ensureReady()
    const removed = input.scheduler.remove(String(id))
    input.notifyChanged()
    return removed
  })

  ipcMain.handle("task:run", async (event, id: unknown) => {
    input.assertSender(event)
    await input.ensureReady()
    const task = await input.scheduler.run(String(id))
    input.notifyChanged()
    return task
  })

  ipcMain.handle("task:cancel", async (event, id: unknown) => {
    input.assertSender(event)
    await input.ensureReady()
    const task = await input.scheduler.cancelTask(String(id))
    input.notifyChanged()
    return task
  })

  ipcMain.handle("task:run-cancel", async (event, id: unknown) => {
    input.assertSender(event)
    await input.ensureReady()
    const run = await input.scheduler.cancelRun(String(id))
    input.notifyChanged()
    return run
  })
}
