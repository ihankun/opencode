import { app, safeStorage } from "electron"
import { chmod, copyFile, readFile, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"

export type ServerCredential = {
  username: string
  password: string
}

type CredentialFile = {
  version: 1
  credentials: Record<string, string>
}

let writeQueue = Promise.resolve()

export async function getServerCredential(id: string): Promise<ServerCredential | undefined> {
  if (!isCredentialID(id)) return
  const encrypted = (await readCredentialFile()).credentials[id]
  if (!encrypted || !safeStorage.isEncryptionAvailable()) return
  return decryptCredential(encrypted)
}

export async function listServerCredentialIDs(): Promise<string[]> {
  return Object.keys((await readCredentialFile()).credentials)
}

export function setServerCredential(id: string, credential: ServerCredential | null): Promise<void> {
  if (!isCredentialID(id)) return Promise.reject(new Error("Invalid server credential id"))
  const operation = writeQueue.then(async () => {
    const stored = await readCredentialFile()
    if (!credential && !stored.credentials[id]) return
    if (!credential) delete stored.credentials[id]
    if (credential) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error("Secure credential storage is unavailable")
      stored.credentials[id] = safeStorage.encryptString(JSON.stringify(credential)).toString("base64")
    }
    const file = credentialFilePath()
    const temporary = `${file}.tmp`
    await writeFile(temporary, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 })
    await copyFile(file, `${file}.bak`).then(() => chmod(`${file}.bak`, 0o600)).catch(() => undefined)
    await rename(temporary, file)
  })
  writeQueue = operation.catch(() => undefined)
  return operation
}

function isCredentialID(id: string) {
  return /^[a-zA-Z0-9._-]{1,200}$/.test(id)
}

function credentialFilePath() {
  return join(app.getPath("userData"), "server-credentials.json")
}

function readCredentialFile(): Promise<CredentialFile> {
  const file = credentialFilePath()
  return readFile(file, "utf8")
    .then(text => normalizeCredentialFile(JSON.parse(text)))
    .catch(() => readFile(`${file}.bak`, "utf8").then(text => normalizeCredentialFile(JSON.parse(text))))
    .catch(() => ({ version: 1, credentials: {} }))
}

function normalizeCredentialFile(value: unknown): CredentialFile {
  if (!value || typeof value !== "object") return { version: 1, credentials: {} }
  const credentials = "credentials" in value && value.credentials && typeof value.credentials === "object"
    ? Object.entries(value.credentials).reduce<Record<string, string>>((result, [id, encrypted]) => {
        if (typeof encrypted === "string") result[id] = encrypted
        return result
      }, {})
    : {}
  return { version: 1, credentials }
}

function decryptCredential(encrypted: string): ServerCredential | undefined {
  try {
    const value = JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, "base64"))) as unknown
    if (!value || typeof value !== "object") return
    if (!("username" in value) || typeof value.username !== "string") return
    if (!("password" in value) || typeof value.password !== "string") return
    return { username: value.username, password: value.password }
  } catch {
    return
  }
}
