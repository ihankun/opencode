import { ipcMain } from "electron"
import {
  getOpenCodeGoQuotaConfig,
  queryProviderQuotas,
  updateOpenCodeGoQuotaConfig,
} from "../quota/index.ts"
import type { OpenCodeGoQuotaConfigUpdate, QuotaQueryInput } from "../../shared/quota.ts"
import type { AssertIpcSender } from "./shared"

export function registerQuotaIpc(input: {
  assertSender: AssertIpcSender
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
    if (!isRecord(value)) {
      throw new Error("Invalid OpenCode Go quota config")
    }
    if (value.apiKey !== undefined && typeof value.apiKey !== "string") {
      throw new Error("Invalid OpenCode Go API key")
    }
    if (value.clearApiKey !== undefined && typeof value.clearApiKey !== "boolean") {
      throw new Error("Invalid OpenCode Go API key action")
    }
    return updateOpenCodeGoQuotaConfig(input.userDataPath, {
      ...(typeof value.apiKey === "string" ? { apiKey: value.apiKey } : {}),
      ...(value.clearApiKey === true ? { clearApiKey: true } : {}),
    } satisfies OpenCodeGoQuotaConfigUpdate)
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
