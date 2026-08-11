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
  ipcMain.handle("plugin:search", (event, query: unknown) => {
    input.assertSender(event)
    return input.searchPlugins(String(query ?? ""))
  })
  ipcMain.handle("plugin:inspect", (event, specs: unknown) => {
    input.assertSender(event)
    return input.inspectPlugins(specs)
  })
  ipcMain.handle("mcp:search", (event, value: unknown) => {
    input.assertSender(event)
    return input.searchMcpServers(value)
  })
  ipcMain.handle("mcp:source-set", (event, value: unknown) => {
    input.assertSender(event)
    return input.setMcpMarketplaceSource(value)
  })
  ipcMain.handle("mcp:source-list", (event, value: unknown) => {
    input.assertSender(event)
    return input.mcpSources(value)
  })
  ipcMain.handle("expert-kit:search", (event, query: unknown) => {
    input.assertSender(event)
    return input.searchExpertKits(String(query ?? ""))
  })
  ipcMain.handle("expert-kit:skill-sources", (event) => {
    input.assertSender(event)
    return input.expertKitSkillSources()
  })
  ipcMain.handle("expert-kit:install", (event, id: unknown, force: unknown) => {
    input.assertSender(event)
    return input.installExpertKit(String(id ?? ""), Boolean(force))
  })
  ipcMain.handle("expert-kit:remove", (event, id: unknown, force: unknown) => {
    input.assertSender(event)
    return input.removeExpertKit(String(id ?? ""), Boolean(force))
  })
  ipcMain.handle("plugin:install", (event, spec: unknown) => {
    input.assertSender(event)
    return input.installPlugin(String(spec ?? ""))
  })
}
