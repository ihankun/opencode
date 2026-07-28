import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

const maxEntries = 2_000
const maxKeyBytes = 1_024
const maxValueBytes = 5 * 1024 * 1024
const maxTotalBytes = 10 * 1024 * 1024

type RendererSettingsFile = {
  version: 1
  settings: Record<string, string>
}

export class RendererSettingsStore {
  private readonly file: string
  private settings: Record<string, string> = {}
  private readonly ready: Promise<void>
  private writes = Promise.resolve()

  constructor(file: string) {
    this.file = file
    this.ready = this.load()
  }

  async current() {
    await this.ready
    await this.writes
    return { ...this.settings }
  }

  save(value: unknown) {
    const settings = normalizeRendererSettings(value)
    const operation = this.writes.then(async () => {
      await this.ready
      await this.write(settings)
      this.settings = settings
      return { ...this.settings }
    })
    this.writes = operation.then(() => undefined, () => undefined)
    return operation
  }

  private async load() {
    try {
      this.settings = await readRendererSettingsFile(this.file)
      return
    } catch (error) {
      try {
        this.settings = await readRendererSettingsFile(`${this.file}.bak`)
        return
      } catch (backupError) {
        if (isMissingFile(error) && isMissingFile(backupError)) {
          await this.write({})
          return
        }
        throw error
      }
    }
  }

  private async write(settings: Record<string, string>) {
    await mkdir(dirname(this.file), { recursive: true })
    const temporary = `${this.file}.${process.pid}.tmp`
    await writeFile(temporary, `${JSON.stringify({ version: 1, settings }, null, 2)}\n`, { mode: 0o600 })
    await copyFile(this.file, `${this.file}.bak`).catch(() => undefined)
    await rename(temporary, this.file)
  }
}

async function readRendererSettingsFile(file: string) {
  const value: unknown = JSON.parse(await readFile(file, "utf8"))
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid renderer settings file")
  const input = value as Partial<RendererSettingsFile>
  if (input.version !== 1) throw new Error("Unsupported renderer settings version")
  return normalizeRendererSettings(input.settings)
}

function normalizeRendererSettings(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid renderer settings")
  }
  const entries = Object.entries(value)
  if (entries.length > maxEntries) throw new Error("Renderer settings contain too many entries")
  const totalBytes = entries.reduce((total, [key, entry]) => {
    if (!key || typeof entry !== "string") throw new Error("Invalid renderer setting")
    const keyBytes = Buffer.byteLength(key)
    const valueBytes = Buffer.byteLength(entry)
    if (keyBytes > maxKeyBytes) throw new Error("Renderer setting key is too large")
    if (valueBytes > maxValueBytes) throw new Error(`Renderer setting "${key}" is too large`)
    return total + keyBytes + valueBytes
  }, 0)
  if (totalBytes > maxTotalBytes) throw new Error("Renderer settings are too large")
  return Object.fromEntries(entries) as Record<string, string>
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}
