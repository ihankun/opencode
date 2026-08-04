import { createHash } from "node:crypto"
import { DatabaseSync } from "node:sqlite"

/**
 * Composer 草稿的 SQLite 持久化。
 *
 * - document 表保存草稿 JSON（key -> value），附件中的大体积 data URL 被提取到 blob 表。
 * - blob 表以内容 sha256 为 id 去重，未引用的孤儿 blob 在启动时清理。
 * - 写入走 pending Map + 500ms 防抖批量 flush，避免每次输入都触发磁盘写。
 */
export type DesktopDraftStore = ReturnType<typeof createDesktopDraftStore>

export function createDesktopDraftStore(filename: string) {
  const native = new DatabaseSync(filename)
  native.exec(
    "PRAGMA journal_mode = WAL; " +
      "CREATE TABLE IF NOT EXISTS document (key TEXT PRIMARY KEY, value TEXT NOT NULL); " +
      "CREATE TABLE IF NOT EXISTS blob (id TEXT PRIMARY KEY, data BLOB NOT NULL);",
  )

  const used = new Set<string>()
  const scan = native.prepare("SELECT value FROM document").all() as Array<{ value: string }>
  for (const { value } of scan) {
    JSON.parse(value, (_key, item) => {
      if (item?.blob && typeof item.blob.id === "string") used.add(item.blob.id)
      return item
    })
  }
  const orphanBlobs = native.prepare("SELECT id FROM blob").all() as Array<{ id: string }>
  const deleteBlob = native.prepare("DELETE FROM blob WHERE id = ?")
  for (const { id } of orphanBlobs) {
    if (!used.has(id)) deleteBlob.run(id)
  }

  const pending = new Map<string, string | null>()
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
    const writes = [...pending]
    pending.clear()
    native.exec("BEGIN")
    try {
      for (const [key, value] of writes) {
        if (value === null) native.prepare("DELETE FROM document WHERE key = ?").run(key)
        else
          native
            .prepare("INSERT INTO document (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .run(key, value)
      }
      native.exec("COMMIT")
    } catch (error) {
      native.exec("ROLLBACK")
      throw error
    }
  }
  const schedule = () => {
    if (!timer) timer = setTimeout(flush, 500)
  }

  return {
    get: (key: string) => {
      if (pending.has(key)) return pending.get(key) ?? null
      const row = native.prepare("SELECT value FROM document WHERE key = ?").get(key) as
        | { value: string }
        | undefined
      return row?.value ?? null
    },
    keys: () => {
      const rows = native.prepare("SELECT key FROM document").all() as Array<{ key: string }>
      return rows.map((row) => row.key)
    },
    set(key: string, value: string | null) {
      pending.set(key, value)
      schedule()
    },
    putBlob(data: Uint8Array) {
      const id = createHash("sha256").update(data).digest("hex")
      native.prepare("INSERT OR IGNORE INTO blob (id, data) VALUES (?, ?)").run(id, Buffer.from(data))
      return id
    },
    getBlob(id: string) {
      const row = native.prepare("SELECT data FROM blob WHERE id = ?").get(id) as { data: Uint8Array } | undefined
      return row?.data ?? null
    },
    flush,
    close() {
      flush()
      native.close()
    },
  }
}
