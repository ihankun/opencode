import { ipcMain } from "electron"
import type { ProjectsStore } from "../projects"
import type { SessionListCacheStore } from "../sessionListCache"
import type { AssertIpcSender } from "./shared"

export function registerProjectsIpc(input: {
  assertSender: AssertIpcSender
  projects: ProjectsStore
  sessionListCache: SessionListCacheStore
}) {
  ipcMain.handle("projects:get", (event, serverId: unknown) => {
    input.assertSender(event)
    return input.projects.get(String(serverId ?? ""))
  })

  ipcMain.handle("projects:directories-set", (event, serverId: unknown, directories: unknown) => {
    input.assertSender(event)
    return input.projects.setDirectories(String(serverId ?? ""), directories)
  })

  ipcMain.handle("projects:recent-set", (event, serverId: unknown, recentProjects: unknown) => {
    input.assertSender(event)
    return input.projects.setRecentProjects(String(serverId ?? ""), recentProjects)
  })

  ipcMain.handle("session-list-cache:get", (event, serverId: unknown, directory: unknown) => {
    input.assertSender(event)
    return input.sessionListCache.get(
      String(serverId ?? ""),
      typeof directory === "string" && directory ? directory : undefined,
    )
  })

  ipcMain.handle("session-list-cache:set", (event, serverId: unknown, directory: unknown, sessions: unknown) => {
    input.assertSender(event)
    return input.sessionListCache.set(String(serverId ?? ""), String(directory ?? ""), sessions)
  })
}
