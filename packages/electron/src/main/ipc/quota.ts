import { ipcMain } from "electron"
import {
  getOpenCodeGoQuotaConfig,
  queryProviderQuotas,
  updateOpenCodeGoQuotaConfig,
} from "../quota/index.ts"
import type { OpenCodeGoLoginResult, OpenCodeGoQuotaConfigUpdate, QuotaQueryInput } from "../../shared/quota.ts"
import type { AssertIpcSender } from "./shared"

export function registerQuotaIpc(input: {
  assertSender: AssertIpcSender
  clearBrowserAuth: () => Promise<void>
  login: (force: boolean) => Promise<OpenCodeGoLoginResult>
  userDataPath: string
}) {
  ipcMain.handle("quota:query", (event, value: unknown) => {
    input.assertSender(event)
    if (!isRecord(value) || !Array.isArray(value.providerIds) || typeof value.localServer !== "boolean") {
      throw new Error("Invalid quota query")
    }
    if (!value.providerIds.every(id => typeof id === "string")) throw new Error("Invalid quota provider ids")
    return queryProviderQuotas(input.userDataPath, {
      providerIds: value.providerIds,
      localServer: value.localServer,
    } satisfies QuotaQueryInput)
  })

  ipcMain.handle("quota:opencode-go-config", (event) => {
    input.assertSender(event)
    return getOpenCodeGoQuotaConfig(input.userDataPath)
  })

  ipcMain.handle("quota:opencode-go-config-set", async (event, value: unknown) => {
    input.assertSender(event)
    if (!isRecord(value) || typeof value.workspaceId !== "string") {
      throw new Error("Invalid OpenCode Go quota config")
    }
    if (value.authCookie !== undefined && typeof value.authCookie !== "string") {
      throw new Error("Invalid OpenCode Go auth cookie")
    }
    if (value.clearAuthCookie !== undefined && typeof value.clearAuthCookie !== "boolean") {
      throw new Error("Invalid OpenCode Go auth cookie action")
    }
    if (value.clearAuthCookie === true) await input.clearBrowserAuth()
    return updateOpenCodeGoQuotaConfig(input.userDataPath, {
      workspaceId: value.workspaceId,
      ...(typeof value.authCookie === "string" ? { authCookie: value.authCookie } : {}),
      ...(value.clearAuthCookie === true ? { clearAuthCookie: true } : {}),
    } satisfies OpenCodeGoQuotaConfigUpdate)
  })

  ipcMain.handle("quota:opencode-go-login", (event, value: unknown) => {
    input.assertSender(event)
    if (value !== undefined && !isRecord(value)) throw new Error("Invalid OpenCode Go login options")
    if (isRecord(value) && value.force !== undefined && typeof value.force !== "boolean") {
      throw new Error("Invalid OpenCode Go login mode")
    }
    return input.login(isRecord(value) && value.force === true)
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
