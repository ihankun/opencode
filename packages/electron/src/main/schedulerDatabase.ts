import type { DatabaseSync } from "node:sqlite"

export function migrateScheduledTaskDatabase(database: DatabaseSync) {
  database.exec("PRAGMA busy_timeout = 5000")
  database.exec("PRAGMA journal_mode = WAL")
  database.exec("PRAGMA synchronous = FULL")
  database.exec("PRAGMA foreign_keys = ON")
  database.exec("BEGIN IMMEDIATE")
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_task (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        prompt TEXT NOT NULL,
        cron TEXT NOT NULL,
        timezone TEXT NOT NULL,
        server_id TEXT NOT NULL DEFAULT 'local',
        server_name TEXT NOT NULL DEFAULT 'Local',
        server_url TEXT NOT NULL DEFAULT '',
        directory TEXT NOT NULL,
        execution_mode TEXT NOT NULL DEFAULT 'current',
        worktree_cleanup TEXT NOT NULL DEFAULT 'on-success',
        branch TEXT NOT NULL DEFAULT '',
        permission_profile TEXT NOT NULL DEFAULT 'risk',
        retry_count INTEGER NOT NULL DEFAULT 0,
        retry_delay_seconds INTEGER NOT NULL DEFAULT 30,
        completion_timeout_minutes INTEGER NOT NULL DEFAULT 60,
        overlap_policy TEXT NOT NULL DEFAULT 'skip',
        max_concurrent_runs INTEGER NOT NULL DEFAULT 1,
        missed_run_policy TEXT NOT NULL DEFAULT 'skip',
        catch_up_window_minutes INTEGER NOT NULL DEFAULT 60,
        trigger_type TEXT NOT NULL DEFAULT 'schedule',
        trigger_task_id TEXT NOT NULL DEFAULT '',
        dependency_task_ids TEXT NOT NULL DEFAULT '[]',
        notification_channels TEXT NOT NULL DEFAULT '["desktop"]',
        notification_webhook_url TEXT NOT NULL DEFAULT '',
        webhook_secret TEXT NOT NULL DEFAULT '',
        model_provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        last_run_at INTEGER,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    database.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_task_run (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        task_title TEXT NOT NULL,
        prompt TEXT NOT NULL,
        session_id TEXT NOT NULL UNIQUE,
        server_id TEXT NOT NULL DEFAULT 'local',
        server_name TEXT NOT NULL DEFAULT 'Local',
        server_url TEXT NOT NULL DEFAULT '',
        directory TEXT NOT NULL,
        execution_directory TEXT NOT NULL DEFAULT '',
        execution_mode TEXT NOT NULL DEFAULT 'current',
        worktree_directory TEXT NOT NULL DEFAULT '',
        branch TEXT NOT NULL DEFAULT '',
        permission_profile TEXT NOT NULL DEFAULT 'risk',
        attempt INTEGER NOT NULL DEFAULT 1,
        model_provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        error TEXT,
        archived INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `)
    database.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_task_setting (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)
    ensureColumn(database, "scheduled_task", "variant", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task", "server_id", "TEXT NOT NULL DEFAULT 'local'")
    ensureColumn(database, "scheduled_task", "server_name", "TEXT NOT NULL DEFAULT 'Local'")
    ensureColumn(database, "scheduled_task", "server_url", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task", "execution_mode", "TEXT NOT NULL DEFAULT 'current'")
    ensureColumn(database, "scheduled_task", "worktree_cleanup", "TEXT NOT NULL DEFAULT 'on-success'")
    ensureColumn(database, "scheduled_task", "branch", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task", "permission_profile", "TEXT NOT NULL DEFAULT 'risk'")
    ensureColumn(database, "scheduled_task", "retry_count", "INTEGER NOT NULL DEFAULT 0")
    ensureColumn(database, "scheduled_task", "retry_delay_seconds", "INTEGER NOT NULL DEFAULT 30")
    ensureColumn(database, "scheduled_task", "completion_timeout_minutes", "INTEGER NOT NULL DEFAULT 60")
    ensureColumn(database, "scheduled_task", "overlap_policy", "TEXT NOT NULL DEFAULT 'skip'")
    ensureColumn(database, "scheduled_task", "max_concurrent_runs", "INTEGER NOT NULL DEFAULT 1")
    ensureColumn(database, "scheduled_task", "missed_run_policy", "TEXT NOT NULL DEFAULT 'skip'")
    ensureColumn(database, "scheduled_task", "catch_up_window_minutes", "INTEGER NOT NULL DEFAULT 60")
    ensureColumn(database, "scheduled_task", "trigger_type", "TEXT NOT NULL DEFAULT 'schedule'")
    ensureColumn(database, "scheduled_task", "trigger_task_id", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task", "dependency_task_ids", "TEXT NOT NULL DEFAULT '[]'")
    ensureColumn(database, "scheduled_task", "notification_channels", "TEXT NOT NULL DEFAULT '[\"desktop\"]'")
    ensureColumn(database, "scheduled_task", "notification_webhook_url", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task", "webhook_secret", "TEXT NOT NULL DEFAULT ''")
    database.exec("UPDATE scheduled_task SET webhook_secret = lower(hex(randomblob(16))) WHERE webhook_secret = ''")
    ensureColumn(database, "scheduled_task", "enabled", "INTEGER NOT NULL DEFAULT 1")
    ensureColumn(database, "scheduled_task", "last_run_at", "INTEGER")
    ensureColumn(database, "scheduled_task", "last_error", "TEXT")
    ensureColumn(database, "scheduled_task", "created_at", "INTEGER NOT NULL DEFAULT 0")
    ensureColumn(database, "scheduled_task", "updated_at", "INTEGER NOT NULL DEFAULT 0")
    ensureColumn(database, "scheduled_task_run", "task_title", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task_run", "prompt", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task_run", "variant", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task_run", "server_id", "TEXT NOT NULL DEFAULT 'local'")
    ensureColumn(database, "scheduled_task_run", "server_name", "TEXT NOT NULL DEFAULT 'Local'")
    ensureColumn(database, "scheduled_task_run", "server_url", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task_run", "execution_directory", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task_run", "execution_mode", "TEXT NOT NULL DEFAULT 'current'")
    ensureColumn(database, "scheduled_task_run", "worktree_directory", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task_run", "branch", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task_run", "permission_profile", "TEXT NOT NULL DEFAULT 'risk'")
    ensureColumn(database, "scheduled_task_run", "attempt", "INTEGER NOT NULL DEFAULT 1")
    ensureColumn(database, "scheduled_task_run", "status", "TEXT NOT NULL DEFAULT 'submitted'")
    ensureColumn(database, "scheduled_task_run", "error", "TEXT")
    ensureColumn(database, "scheduled_task_run", "log", "TEXT NOT NULL DEFAULT ''")
    ensureColumn(database, "scheduled_task_run", "updated_at", "INTEGER NOT NULL DEFAULT 0")
    ensureColumn(database, "scheduled_task_run", "archived", "INTEGER NOT NULL DEFAULT 0")
    ensureColumn(database, "scheduled_task_run", "created_at", "INTEGER NOT NULL DEFAULT 0")
    ensureColumn(database, "scheduled_task_run", "completed_at", "INTEGER")
    database.exec("CREATE INDEX IF NOT EXISTS scheduled_task_run_task_id_idx ON scheduled_task_run(task_id)")
    database.exec("CREATE INDEX IF NOT EXISTS scheduled_task_run_active_idx ON scheduled_task_run(archived, created_at DESC)")
    database.exec("CREATE INDEX IF NOT EXISTS scheduled_task_run_task_active_idx ON scheduled_task_run(task_id, archived, created_at DESC)")
    database.exec("PRAGMA user_version = 10")
    database.exec("COMMIT")
  } catch (error) {
    database.exec("ROLLBACK")
    throw error
  }
}

export function verifyScheduledTaskDatabase(database: DatabaseSync) {
  const result = database.prepare("PRAGMA quick_check").get() as Record<string, unknown> | undefined
  if (result && Object.values(result).some((value) => value === "ok")) return
  throw new Error(`Scheduled task database integrity check failed: ${JSON.stringify(result ?? {})}`)
}

function ensureColumn(database: DatabaseSync, table: "scheduled_task" | "scheduled_task_run", column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (columns.some(item => item.name === column)) return
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}
