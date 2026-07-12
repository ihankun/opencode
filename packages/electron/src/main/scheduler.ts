import { app } from "electron"
import { DatabaseSync } from "node:sqlite"
import { join } from "node:path"
import { Cron } from "croner"

export type ScheduledTask = {
  id: string
  title: string
  prompt: string
  cron: string
  timezone: string
  directory: string
  modelProviderID: string
  modelID: string
  variant: string
  enabled: boolean
  status: "enabled" | "paused" | "running" | "error"
  lastRunAt: number | null
  nextRunAt: number | null
  lastError: string | null
  createdAt: number
  updatedAt: number
}

export type ScheduledTaskRun = {
  id: string
  taskID: string
  taskTitle: string
  prompt: string
  sessionID: string
  directory: string
  modelProviderID: string
  modelID: string
  variant: string
  status: "running" | "submitted" | "failed"
  error: string | null
  createdAt: number
}

type TaskInput = Pick<ScheduledTask, "title" | "prompt" | "cron" | "timezone" | "directory" | "modelProviderID" | "modelID" | "variant" | "enabled">
type ServerState = { url: string; username: string; password: string }

export class TaskScheduler {
  private database?: DatabaseSync
  private jobs = new Map<string, Cron>()
  private running = new Set<string>()

  constructor(
    private readonly getServer: () => ServerState | undefined,
    private readonly onChanged: () => void,
  ) {}

  start() {
    this.database = new DatabaseSync(join(app.getPath("userData"), "scheduled-tasks.sqlite"))
    const version = this.database.prepare("PRAGMA user_version").get() as { user_version: number }
    if (version.user_version < 3) {
      this.database.exec("DROP TABLE IF EXISTS scheduled_task")
      this.database.exec("DROP TABLE IF EXISTS scheduled_task_run")
    }
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_task (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        prompt TEXT NOT NULL,
        cron TEXT NOT NULL,
        timezone TEXT NOT NULL,
        directory TEXT NOT NULL,
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
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_task_run (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        task_title TEXT NOT NULL,
        prompt TEXT NOT NULL,
        session_id TEXT NOT NULL UNIQUE,
        directory TEXT NOT NULL,
        model_provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        error TEXT,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `)
    this.database.exec("PRAGMA user_version = 3")
    this.list().filter((task) => task.enabled).forEach((task) => this.register(task))
  }

  stop() {
    this.jobs.forEach((job) => job.stop())
    this.jobs.clear()
    this.database?.close()
    this.database = undefined
  }

  list(): ScheduledTask[] {
    const rows = this.db().prepare("SELECT * FROM scheduled_task ORDER BY created_at DESC").all() as Array<Record<string, unknown>>
    return rows.map((row) => this.read(row))
  }

  listRuns(taskID?: string): ScheduledTaskRun[] {
    const rows = (taskID
      ? this.db().prepare("SELECT * FROM scheduled_task_run WHERE task_id = ? AND archived = 0 ORDER BY created_at DESC").all(taskID)
      : this.db().prepare("SELECT * FROM scheduled_task_run WHERE archived = 0 ORDER BY created_at DESC").all()) as Array<Record<string, unknown>>
    return rows.map((row) => ({
      id: String(row.id),
      taskID: String(row.task_id),
      taskTitle: String(row.task_title),
      prompt: String(row.prompt),
      sessionID: String(row.session_id),
      directory: String(row.directory),
      modelProviderID: String(row.model_provider_id),
      modelID: String(row.model_id),
      variant: String(row.variant),
      status: String(row.status) as ScheduledTaskRun["status"],
      error: typeof row.error === "string" ? row.error : null,
      createdAt: Number(row.created_at),
    }))
  }

  setRunArchived(sessionID: string, archived: boolean) {
    this.db().prepare("UPDATE scheduled_task_run SET archived = ? WHERE session_id = ?").run(Number(archived), sessionID)
  }

  create(input: TaskInput) {
    this.validate(input)
    const now = Date.now()
    const id = crypto.randomUUID()
    this.db().prepare(`
      INSERT INTO scheduled_task (id, title, prompt, cron, timezone, directory, model_provider_id, model_id, variant, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.title.trim(), input.prompt.trim(), input.cron.trim(), input.timezone, input.directory, input.modelProviderID, input.modelID, input.variant, Number(input.enabled), now, now)
    const task = this.get(id)
    if (task.enabled) this.register(task)
    return this.get(id)
  }

  update(id: string, input: TaskInput) {
    this.validate(input)
    this.require(id)
    this.jobs.get(id)?.stop()
    this.jobs.delete(id)
    this.db().prepare(`
      UPDATE scheduled_task SET title = ?, prompt = ?, cron = ?, timezone = ?, directory = ?, model_provider_id = ?, model_id = ?, variant = ?, enabled = ?, last_error = NULL, updated_at = ?
      WHERE id = ?
    `).run(input.title.trim(), input.prompt.trim(), input.cron.trim(), input.timezone, input.directory, input.modelProviderID, input.modelID, input.variant, Number(input.enabled), Date.now(), id)
    const task = this.get(id)
    if (task.enabled) this.register(task)
    return this.get(id)
  }

  remove(id: string) {
    this.require(id)
    this.jobs.get(id)?.stop()
    this.jobs.delete(id)
    this.db().prepare("DELETE FROM scheduled_task WHERE id = ?").run(id)
    return true
  }

  async run(id: string) {
    const task = this.get(id)
    await this.execute(task)
    return this.get(id)
  }

  private db() {
    if (!this.database) throw new Error("Task scheduler is not started")
    return this.database
  }

  private require(id: string) {
    const row = this.db().prepare("SELECT id FROM scheduled_task WHERE id = ?").get(id)
    if (!row) throw new Error("Scheduled task not found")
  }

  private get(id: string) {
    const row = this.db().prepare("SELECT * FROM scheduled_task WHERE id = ?").get(id) as Record<string, unknown> | undefined
    if (!row) throw new Error("Scheduled task not found")
    return this.read(row)
  }

  private read(row: Record<string, unknown>): ScheduledTask {
    const id = String(row.id)
    const job = this.jobs.get(id)
    return {
      id,
      title: String(row.title),
      prompt: String(row.prompt),
      cron: String(row.cron),
      timezone: String(row.timezone),
      directory: String(row.directory),
      modelProviderID: String(row.model_provider_id),
      modelID: String(row.model_id),
      variant: String(row.variant),
      enabled: Boolean(row.enabled),
      status: this.running.has(id) ? "running" : row.last_error ? "error" : row.enabled ? "enabled" : "paused",
      lastRunAt: typeof row.last_run_at === "number" ? row.last_run_at : null,
      nextRunAt: job?.nextRun()?.getTime() ?? null,
      lastError: typeof row.last_error === "string" ? row.last_error : null,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    }
  }

  private validate(input: TaskInput) {
    if (!input.title.trim()) throw new Error("Task title is required")
    if (!input.prompt.trim()) throw new Error("Task prompt is required")
    if (!input.timezone) throw new Error("Timezone is required")
    if (!input.modelProviderID || !input.modelID) throw new Error("Model is required")
    const job = new Cron(input.cron.trim(), { timezone: input.timezone, paused: true })
    job.stop()
  }

  private register(task: ScheduledTask) {
    const job = new Cron(task.cron, { timezone: task.timezone, protect: true }, () => this.execute(task))
    this.jobs.set(task.id, job)
  }

  private async execute(task: ScheduledTask) {
    this.running.add(task.id)
    try {
      const server = this.getServer()
      if (!server) throw new Error("OpenCodex service is not online")
      const query = task.directory ? `?directory=${encodeURIComponent(task.directory)}` : ""
      const headers = {
        Authorization: `Basic ${Buffer.from(`${server.username}:${server.password}`).toString("base64")}`,
        "Content-Type": "application/json",
      }
      const created = await fetch(`${server.url}/session${query}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title: `[定时任务] ${task.title}` }),
      })
      if (!created.ok) throw new Error(`create session failed (${created.status})`)
      const body = await created.json() as { id?: string; data?: { id?: string } }
      const sessionID = body.id ?? body.data?.id
      if (!sessionID) throw new Error("create session returned no id")
      const runID = crypto.randomUUID()
      this.db().prepare(`
        INSERT INTO scheduled_task_run (id, task_id, task_title, prompt, session_id, directory, model_provider_id, model_id, variant, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'running', ?)
      `).run(runID, task.id, task.title, task.prompt, sessionID, task.directory, task.modelProviderID, task.modelID, task.variant, Date.now())
      const prompted = await fetch(`${server.url}/session/${encodeURIComponent(sessionID)}/prompt_async${query}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            parts: [{ type: "text", text: task.prompt }],
            ...(task.modelProviderID && task.modelID ? { model: { providerID: task.modelProviderID, modelID: task.modelID } } : {}),
            ...(task.variant ? { variant: task.variant } : {}),
          }),
        })
        .catch((error) => {
          this.db().prepare("UPDATE scheduled_task_run SET status = 'failed', error = ? WHERE id = ?").run(error instanceof Error ? error.message : String(error), runID)
          throw error
        })
      if (!prompted.ok) {
        const message = `send prompt failed (${prompted.status})`
        this.db().prepare("UPDATE scheduled_task_run SET status = 'failed', error = ? WHERE id = ?").run(message, runID)
        throw new Error(message)
      }
      this.db().prepare("UPDATE scheduled_task_run SET status = 'submitted', error = NULL WHERE id = ?").run(runID)
      this.db().prepare("UPDATE scheduled_task SET last_run_at = ?, last_error = NULL, updated_at = ? WHERE id = ?")
        .run(Date.now(), Date.now(), task.id)
    } catch (error) {
      this.recordFailure(task.id, error instanceof Error ? error.message : String(error))
    } finally {
      this.running.delete(task.id)
      this.onChanged()
    }
  }

  private recordFailure(id: string, message: string) {
    this.db().prepare("UPDATE scheduled_task SET last_run_at = ?, last_error = ?, updated_at = ? WHERE id = ?")
      .run(Date.now(), message, Date.now(), id)
  }
}
