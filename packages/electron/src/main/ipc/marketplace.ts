import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export function registerMarketplaceIpc(input: {
  assertSender: AssertIpcSender
  expertKitSkillSources: () => unknown
  inspectPlugins: (value: unknown) => unknown
  installExpertKit: (id: string, force: boolean) => unknown
  installPlugin: (spec: string) => unknown
  mcpSources: (value: unknown) => unknown
  removeExpertKit: (id: string, force: boolean) => unknown
  searchExpertKits: (query: string) => unknown
  searchMcpServers: (value: unknown) => unknown
  searchPlugins: (query: string) => unknown
  setMcpMarketplaceSource: (value: unknown) => unknown
}) {
  ipcMain.handle("plugin:search", (_event, query: unknown) => input.searchPlugins(String(query ?? "")))
  ipcMain.handle("plugin:inspect", (_event, specs: unknown) => input.inspectPlugins(specs))
  ipcMain.handle("mcp:search", (_event, value: unknown) => input.searchMcpServers(value))
  ipcMain.handle("mcp:source-set", (_event, value: unknown) => input.setMcpMarketplaceSource(value))
  ipcMain.handle("mcp:source-list", (_event, value: unknown) => input.mcpSources(value))
  ipcMain.handle("expert-kit:search", (_event, query: unknown) => input.searchExpertKits(String(query ?? "")))
  ipcMain.handle("expert-kit:skill-sources", () => input.expertKitSkillSources())
  ipcMain.handle("expert-kit:install", (_event, id: unknown, force: unknown) =>
    input.installExpertKit(String(id ?? ""), Boolean(force)),
  )
  ipcMain.handle("expert-kit:remove", (_event, id: unknown, force: unknown) =>
    input.removeExpertKit(String(id ?? ""), Boolean(force)),
  )
  ipcMain.handle("plugin:install", (event, spec: unknown) => {
    input.assertSender(event)
    return input.installPlugin(String(spec ?? ""))
  })
}
