import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import {
  DEFAULT_DESKTOP_PREFERENCES,
  normalizeDesktopPreferences,
  type DesktopPreferences,
} from "../shared/desktopPreferences.ts"

export class DesktopPreferencesStore {
  private preferences: DesktopPreferences = { ...DEFAULT_DESKTOP_PREFERENCES }
  private readonly file: string

  constructor(file: string) {
    this.file = file
  }

  current() {
    return { ...this.preferences }
  }

  async load() {
    this.preferences = await readFile(this.file, "utf8")
      .then((content) => {
        const value: unknown = JSON.parse(content)
        return normalizeDesktopPreferences(value)
      })
      .catch(() => ({ ...DEFAULT_DESKTOP_PREFERENCES }))
    return this.current()
  }

  async save(value: unknown) {
    const next = normalizeDesktopPreferences(value)
    await mkdir(dirname(this.file), { recursive: true })
    await writeFile(this.file, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 })
    this.preferences = next
    return this.current()
  }
}
