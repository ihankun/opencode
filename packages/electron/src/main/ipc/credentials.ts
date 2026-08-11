import { ipcMain } from "electron"
import { createHash } from "node:crypto"
import {
  getServerCredential,
  listServerCredentialIDs,
  setSecureCredential,
  setServerCredential,
} from "../credentials"
import type { ServerCredential } from "../credentials"
import type { AssertIpcSender } from "./shared"

export function registerCredentialsIpc(input: {
  assertSender: AssertIpcSender
  createPullRequest: (value: unknown) => Promise<unknown>
}) {
  ipcMain.handle("credential:get", (event, id: unknown) => {
    input.assertSender(event)
    if (typeof id !== "string") throw new Error("Invalid server credential id")
    return getServerCredential(id)
  })

  ipcMain.handle("credential:set", (event, id: unknown, rawCredential: unknown) => {
    input.assertSender(event)
    if (typeof id !== "string") throw new Error("Invalid server credential id")
    if (rawCredential === null) return setServerCredential(id, null)
    if (!rawCredential || typeof rawCredential !== "object") throw new Error("Invalid server credential")
    const credential = rawCredential as Partial<ServerCredential>
    if (typeof credential.username !== "string" || typeof credential.password !== "string") {
      throw new Error("Invalid server credential")
    }
    return setServerCredential(id, { username: credential.username, password: credential.password })
  })

  ipcMain.handle("secure-environment:set", (event, scope: unknown, rawValues: unknown) => {
    input.assertSender(event)
    if (typeof scope !== "string" || !scope.trim() || scope.length > 500) {
      throw new Error("Invalid secure environment scope")
    }
    const id = `environment.${createHash("sha256").update(scope).digest("hex").slice(0, 24)}`
    if (rawValues === null) return setSecureCredential(id, null)
    if (!isRecord(rawValues)) throw new Error("Invalid secure environment values")
    const values = Object.entries(rawValues).reduce<Record<string, string>>((result, [key, value]) => {
      if (!/^[A-Z_][A-Z0-9_]{0,127}$/.test(key) || typeof value !== "string") {
        throw new Error("Invalid secure environment entry")
      }
      result[key] = value
      return result
    }, {})
    return setSecureCredential(id, Object.keys(values).length ? values : null)
  })

  ipcMain.handle("hosting:credentials", async (event) => {
    input.assertSender(event)
    const ids = new Set(await listServerCredentialIDs())
    return Object.fromEntries(
      ["github", "gitlab", "bitbucket"].map(provider => [provider, ids.has(`hosting.${provider}`)]),
    )
  })

  ipcMain.handle("hosting:credential-set", (event, provider: unknown, rawCredential: unknown) => {
    input.assertSender(event)
    const name = normalizeHostingProvider(provider)
    if (rawCredential === null) return setServerCredential(`hosting.${name}`, null)
    if (
      !isRecord(rawCredential) ||
      typeof rawCredential.username !== "string" ||
      typeof rawCredential.password !== "string"
    ) {
      throw new Error("Invalid hosting credential")
    }
    return setServerCredential(`hosting.${name}`, {
      username: rawCredential.username,
      password: rawCredential.password,
    })
  })

  ipcMain.handle("hosting:pr-create", (event, value: unknown) => {
    input.assertSender(event)
    return input.createPullRequest(value)
  })
}

function normalizeHostingProvider(value: unknown) {
  if (value === "github" || value === "gitlab" || value === "bitbucket") return value
  throw new Error("Unsupported Git hosting provider")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
