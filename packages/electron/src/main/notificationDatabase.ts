import { DatabaseSync } from "node:sqlite"

export type StoredNotification = {
  id: string
  type: string
  title: string
  body: string
  sessionId: string
  directory?: string
  timestamp: number
  read: boolean
}

export type DesktopNotificationDatabase = ReturnType<typeof createNotificationDatabase>

const MAX_NOTIFICATIONS = 50

function mapRow(
  row: Record<string, unknown>,
): StoredNotification {
  return {
    id: String(row.id ?? ""),
    type: String(row.type ?? "completed"),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    sessionId: String(row.session_id ?? ""),
    directory: row.directory ? String(row.directory) : undefined,
    timestamp: Number(row.timestamp ?? 0),
    read: Number(row.read ?? 0) === 1,
  }
}

export function createNotificationDatabase(filename: string) {
  const native = new DatabaseSync(filename)
  native.exec(
    "PRAGMA journal_mode = WAL; " +
      "CREATE TABLE IF NOT EXISTS notification (" +
      "id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, " +
      "session_id TEXT NOT NULL, directory TEXT, timestamp INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0);",
  )

  return {
    list(): StoredNotification[] {
      const rows = native.prepare("SELECT * FROM notification ORDER BY timestamp DESC LIMIT ?").all(MAX_NOTIFICATIONS)
      return rows.map(mapRow)
    },
    replaceAll(notifications: StoredNotification[]): boolean {
      native.exec("BEGIN")
      try {
        native.prepare("DELETE FROM notification").run()
        const insert = native.prepare(
          "INSERT INTO notification (id, type, title, body, session_id, directory, timestamp, read) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        for (const notification of notifications.slice(0, MAX_NOTIFICATIONS)) {
          insert.run(
            notification.id,
            notification.type,
            notification.title,
            notification.body,
            notification.sessionId ?? "",
            notification.directory ?? null,
            notification.timestamp,
            notification.read ? 1 : 0,
          )
        }
        native.exec("COMMIT")
      } catch (error) {
        native.exec("ROLLBACK")
        throw error
      }
      return true
    },
    close() {
      native.close()
    },
  }
}
