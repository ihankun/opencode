import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import {
  normalizeCachedSessionList,
  normalizeSessionListCacheFile,
  type CachedSessionList,
  type SessionListCacheFile,
} from "../shared/sessionListCache.ts"

export class SessionListCacheStore {
  private writes: Promise<void> = Promise.resolve()

  constructor(private readonly file: string) {}

  async get(serverId: string, directory?: string) {
    await this.writes
    const server = (await this.read()).servers[requireServerId(serverId)]
    const targetDirectory = directory || server?.lastDirectory
    if (!server || !targetDirectory) return
    return cloneCachedSessionList(server.directories[targetDirectory])
  }

  set(serverId: string, directory: string, sessions: unknown) {
    const operation = this.writes.then(async () => {
      const cache = await this.read()
      const id = requireServerId(serverId)
      const targetDirectory = requireDirectory(directory)
      const state = cloneCachedSessionList(
        normalizeCachedSessionList({
          directory: targetDirectory,
          sessions,
          updatedAt: Date.now(),
        }),
      )
      if (!state) throw new Error("Invalid cached session list")

      const current = cache.servers[id]
      const directories = Object.fromEntries(
        Object.entries({
          ...current?.directories,
          [targetDirectory]: state,
        })
          .toSorted(([, left], [, right]) => right.updatedAt - left.updatedAt)
          .slice(0, 50),
      )
      await this.write({
        ...cache,
        servers: {
          ...cache.servers,
          [id]: {
            lastDirectory: targetDirectory,
            directories,
          },
        },
      })
      return cloneCachedSessionList(state)
    })
    this.writes = operation.then(() => undefined, () => undefined)
    return operation
  }

  private read() {
    return readFile(this.file, "utf8")
      .then(content => normalizeSessionListCacheFile(JSON.parse(content)))
      .catch(() => normalizeSessionListCacheFile(undefined))
  }

  private async write(cache: SessionListCacheFile) {
    await mkdir(dirname(this.file), { recursive: true })
    const temporary = `${this.file}.${process.pid}.tmp`
    await writeFile(temporary, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary, this.file)
  }
}

function requireServerId(value: string) {
  if (!value.trim()) throw new Error("Session cache server ID is required")
  return value
}

function requireDirectory(value: string) {
  if (!value.trim()) throw new Error("Session cache directory is required")
  return value
}

function cloneCachedSessionList(value: CachedSessionList | undefined): CachedSessionList | undefined {
  if (!value) return
  return {
    directory: value.directory,
    sessions: value.sessions.map(session => ({
      ...session,
      time: { ...session.time },
      metadata: session.metadata ? { ...session.metadata } : undefined,
      summary: session.summary
        ? {
            additions: session.summary.additions,
            deletions: session.summary.deletions,
            files: session.summary.files,
          }
        : undefined,
      permission: undefined,
      revert: undefined,
    })),
    updatedAt: value.updatedAt,
  }
}
