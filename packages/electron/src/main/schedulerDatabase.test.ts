import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { migrateScheduledTaskDatabase } from "./schedulerDatabase.ts"

test("scheduled task migration preserves version 2 data", () => {
  const database = new DatabaseSync(":memory:")
  database.exec(`
    CREATE TABLE scheduled_task (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, prompt TEXT NOT NULL, cron TEXT NOT NULL,
      timezone TEXT NOT NULL, directory TEXT NOT NULL, model_provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL, enabled INTEGER NOT NULL, last_run_at INTEGER, last_error TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE scheduled_task_run (
      id TEXT PRIMARY KEY, task_id TEXT NOT NULL, task_title TEXT NOT NULL, prompt TEXT NOT NULL,
      session_id TEXT NOT NULL UNIQUE, directory TEXT NOT NULL, model_provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL, status TEXT NOT NULL, error TEXT, created_at INTEGER NOT NULL
    );
    INSERT INTO scheduled_task VALUES ('task-1', 'Existing task', 'Prompt', '* * * * *', 'UTC', '/repo', 'openai', 'model', 1, NULL, NULL, 10, 10);
    INSERT INTO scheduled_task_run VALUES ('run-1', 'task-1', 'Existing task', 'Prompt', 'session-1', '/repo', 'openai', 'model', 'submitted', NULL, 11);
    PRAGMA user_version = 2;
  `)

  migrateScheduledTaskDatabase(database)
  migrateScheduledTaskDatabase(database)

  const task = database.prepare("SELECT id, title, variant, server_id, execution_mode, worktree_cleanup, retry_count FROM scheduled_task WHERE id = 'task-1'").get() as Record<string, unknown>
  const run = database.prepare("SELECT id, session_id, variant, archived, server_id, execution_directory, worktree_directory, attempt, updated_at FROM scheduled_task_run WHERE id = 'run-1'").get() as Record<string, unknown>
  const version = database.prepare("PRAGMA user_version").get() as { user_version: number }
  assert.deepEqual({ ...task }, { id: "task-1", title: "Existing task", variant: "", server_id: "local", execution_mode: "current", worktree_cleanup: "on-success", retry_count: 0 })
  assert.deepEqual({ ...run }, { id: "run-1", session_id: "session-1", variant: "", archived: 0, server_id: "local", execution_directory: "", worktree_directory: "", attempt: 1, updated_at: 0 })
  assert.equal(version.user_version, 7)
  database.close()
})
