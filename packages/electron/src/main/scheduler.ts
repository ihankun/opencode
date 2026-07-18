import { app } from "electron"
import { DatabaseSync } from "node:sqlite"
import { join } from "node:path"
import { Cron } from "croner"
import { migrateScheduledTaskDatabase } from "./schedulerDatabase"

type ExecutionMode = "current" | "worktree"
type PermissionProfile = "ask" | "writes" | "risk" | "full"
type RunStatus = "running" | "submitted" | "completed" | "failed" | "timed_out"

export type ScheduledTask = {
  id: string
  title: string
  prompt: string
  cron: string
  timezone: string
  serverId: string
  serverName: string
  serverUrl: string
  directory: string
  executionMode: ExecutionMode
  branch: string
  permissionProfile: PermissionProfile
  retryCount: number
  retryDelaySeconds: number
  completionTimeoutMinutes: number
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
  serverId: string
  serverName: string
  serverUrl: string
  directory: string
  executionDirectory: string
  executionMode: ExecutionMode
  branch: string
  permissionProfile: PermissionProfile
  attempt: number
  modelProviderID: string
  modelID: string
  variant: string
  status: RunStatus
  error: string | null
  createdAt: number
  completedAt: number | null
}

type TaskInput = Pick<
  ScheduledTask,
  | "title"
  | "prompt"
  | "cron"
  | "timezone"
  | "serverId"
  | "serverName"
  | "serverUrl"
  | "directory"
  | "executionMode"
  | "branch"
  | "permissionProfile"
  | "retryCount"
  | "retryDelaySeconds"
  | "completionTimeoutMinutes"
  | "modelProviderID"
  | "modelID"
  | "variant"
  | "enabled"
>

type ServerState = { url: string; username?: string; password?: string }
type AttemptResult = { ok: true } | { ok: false; message: string; retryable: boolean }

export class TaskScheduler {
  private database?: DatabaseSync
  private jobs = new Map<string, Cron>()
  private running = new Set<string>()

  constructor(
    private readonly resolveServer: (task: ScheduledTask) => Promise<ServerState | undefined>,
    private readonly onChanged: () => void,
  ) {}

  start() {
    this.database = new DatabaseSync(join(app.getPath("userData"), "scheduled-tasks.sqlite"))
    migrateScheduledTaskDatabase(this.database)
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
      serverId: String(row.server_id),
      serverName: String(row.server_name),
      serverUrl: String(row.server_url),
      directory: String(row.directory),
      executionDirectory: String(row.execution_directory || row.directory),
      executionMode: normalizeExecutionMode(row.execution_mode),
      branch: String(row.branch),
      permissionProfile: normalizePermissionProfile(row.permission_profile),
      attempt: Number(row.attempt),
      modelProviderID: String(row.model_provider_id),
      modelID: String(row.model_id),
      variant: String(row.variant),
      status: String(row.status) as RunStatus,
      error: typeof row.error === "string" ? row.error : null,
      createdAt: Number(row.created_at),
      completedAt: typeof row.completed_at === "number" ? row.completed_at : null,
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
      INSERT INTO scheduled_task (
        id, title, prompt, cron, timezone, server_id, server_name, server_url, directory,
        execution_mode, branch, permission_profile, retry_count, retry_delay_seconds,
        completion_timeout_minutes, model_provider_id, model_id, variant, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, input.title.trim(), input.prompt.trim(), input.cron.trim(), input.timezone,
      input.serverId, input.serverName.trim(), normalizeServerUrl(input.serverUrl), input.directory.trim(),
      input.executionMode, input.branch.trim(), input.permissionProfile, input.retryCount, input.retryDelaySeconds,
      input.completionTimeoutMinutes, input.modelProviderID, input.modelID, input.variant, Number(input.enabled), now, now,
    )
    const task = this.get(id)
    if (task.enabled) this.register(task)
    return task
  }

  update(id: string, input: TaskInput) {
    this.validate(input)
    this.require(id)
    this.jobs.get(id)?.stop()
    this.jobs.delete(id)
    this.db().prepare(`
      UPDATE scheduled_task SET
        title = ?, prompt = ?, cron = ?, timezone = ?, server_id = ?, server_name = ?, server_url = ?,
        directory = ?, execution_mode = ?, branch = ?, permission_profile = ?, retry_count = ?,
        retry_delay_seconds = ?, completion_timeout_minutes = ?, model_provider_id = ?, model_id = ?,
        variant = ?, enabled = ?, last_error = NULL, updated_at = ?
      WHERE id = ?
    `).run(
      input.title.trim(), input.prompt.trim(), input.cron.trim(), input.timezone,
      input.serverId, input.serverName.trim(), normalizeServerUrl(input.serverUrl), input.directory.trim(),
      input.executionMode, input.branch.trim(), input.permissionProfile, input.retryCount, input.retryDelaySeconds,
      input.completionTimeoutMinutes, input.modelProviderID, input.modelID, input.variant, Number(input.enabled), Date.now(), id,
    )
    const task = this.get(id)
    if (task.enabled) this.register(task)
    return task
  }

  remove(id: string) {
    this.require(id)
    this.jobs.get(id)?.stop()
    this.jobs.delete(id)
    this.db().prepare("DELETE FROM scheduled_task WHERE id = ?").run(id)
    return true
  }

  async run(id: string) {
    if (this.running.has(id)) throw new Error("Scheduled task is already running")
    await this.execute(this.get(id))
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
      serverId: String(row.server_id),
      serverName: String(row.server_name),
      serverUrl: String(row.server_url),
      directory: String(row.directory),
      executionMode: normalizeExecutionMode(row.execution_mode),
      branch: String(row.branch),
      permissionProfile: normalizePermissionProfile(row.permission_profile),
      retryCount: Number(row.retry_count),
      retryDelaySeconds: Number(row.retry_delay_seconds),
      completionTimeoutMinutes: Number(row.completion_timeout_minutes),
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
    if (!input.serverId || !input.serverName.trim()) throw new Error("Server is required")
    normalizeServerUrl(input.serverUrl)
    if (!input.modelProviderID || !input.modelID) throw new Error("Model is required")
    if (input.executionMode === "worktree" && !input.directory.trim()) throw new Error("Worktree tasks require a project directory")
    if (!Number.isInteger(input.retryCount) || input.retryCount < 0 || input.retryCount > 10) throw new Error("Retry count must be between 0 and 10")
    if (!Number.isInteger(input.retryDelaySeconds) || input.retryDelaySeconds < 1 || input.retryDelaySeconds > 3600) throw new Error("Retry delay must be between 1 and 3600 seconds")
    if (!Number.isInteger(input.completionTimeoutMinutes) || input.completionTimeoutMinutes < 1 || input.completionTimeoutMinutes > 1440) throw new Error("Completion timeout must be between 1 and 1440 minutes")
    const job = new Cron(input.cron.trim(), { timezone: input.timezone, paused: true })
    job.stop()
  }

  private register(task: ScheduledTask) {
    const job = new Cron(task.cron, { timezone: task.timezone, protect: true }, () => this.execute(task))
    this.jobs.set(task.id, job)
  }

  private async execute(task: ScheduledTask) {
    if (this.running.has(task.id)) return
    this.running.add(task.id)
    this.onChanged()
    try {
      const outcome = await this.executeWithRetry(task, 1)
      if (!outcome.ok) {
        this.recordFailure(task.id, outcome.message)
        return
      }
      const now = Date.now()
      this.db().prepare("UPDATE scheduled_task SET last_run_at = ?, last_error = NULL, updated_at = ? WHERE id = ?")
        .run(now, now, task.id)
    } finally {
      this.running.delete(task.id)
      this.onChanged()
    }
  }

  private async executeWithRetry(task: ScheduledTask, attempt: number): Promise<AttemptResult> {
    const outcome = await this.executeAttempt(task, attempt)
    if (outcome.ok || !outcome.retryable || attempt > task.retryCount) return outcome
    await delay(task.retryDelaySeconds * 1000)
    return this.executeWithRetry(task, attempt + 1)
  }

  private async executeAttempt(task: ScheduledTask, attempt: number): Promise<AttemptResult> {
    const runID = crypto.randomUUID()
    const createdAt = Date.now()
    this.db().prepare(`
      INSERT INTO scheduled_task_run (
        id, task_id, task_title, prompt, session_id, server_id, server_name, server_url, directory,
        execution_directory, execution_mode, branch, permission_profile, attempt, model_provider_id,
        model_id, variant, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'running', ?)
    `).run(
      runID, task.id, task.title, task.prompt, `pending:${runID}`, task.serverId, task.serverName, task.serverUrl,
      task.directory, task.directory, task.executionMode, task.branch, task.permissionProfile, attempt,
      task.modelProviderID, task.modelID, task.variant, createdAt,
    )
    this.onChanged()

    let submitted = false
    try {
      const server = await this.resolveServer(task)
      if (!server) throw new Error(`Server is unavailable: ${task.serverName}`)
      await this.fetchJson(server, "/global/health")
      const execution = await this.prepareExecution(task, server)
      const query = execution.directory ? `?directory=${encodeURIComponent(execution.directory)}` : ""
      const session = await this.fetchJson<{ id?: string }>(server, `/session${query}`, {
        method: "POST",
        body: JSON.stringify({
          title: `[自动化] ${task.title}`,
          model: { id: task.modelID, providerID: task.modelProviderID, ...(task.variant ? { variant: task.variant } : {}) },
          permission: permissionRules(task.permissionProfile),
          metadata: {
            scheduledTaskID: task.id,
            scheduledTaskRunID: runID,
            serverID: task.serverId,
            sourceDirectory: task.directory,
            executionMode: task.executionMode,
          },
        }),
      })
      if (!session.id) throw new Error("Create session returned no id")
      this.db().prepare("UPDATE scheduled_task_run SET session_id = ?, execution_directory = ?, branch = ? WHERE id = ?")
        .run(session.id, execution.directory, execution.branch, runID)
      await this.fetchJson(server, `/session/${encodeURIComponent(session.id)}/prompt_async${query}`, {
        method: "POST",
        body: JSON.stringify({
          parts: [{ type: "text", text: task.prompt }],
          model: { providerID: task.modelProviderID, modelID: task.modelID },
          ...(task.variant ? { variant: task.variant } : {}),
        }),
      })
      submitted = true
      this.db().prepare("UPDATE scheduled_task_run SET status = 'submitted' WHERE id = ?").run(runID)
      this.onChanged()
      await this.waitForCompletion(server, session.id, execution.directory, task.completionTimeoutMinutes)
      this.db().prepare("UPDATE scheduled_task_run SET status = 'completed', error = NULL, completed_at = ? WHERE id = ?")
        .run(Date.now(), runID)
      this.onChanged()
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const status: RunStatus = error instanceof ScheduledTaskTimeoutError ? "timed_out" : "failed"
      this.db().prepare("UPDATE scheduled_task_run SET status = ?, error = ?, completed_at = ? WHERE id = ?")
        .run(status, message, Date.now(), runID)
      this.onChanged()
      return { ok: false, message, retryable: !submitted }
    }
  }

  private async prepareExecution(task: ScheduledTask, server: ServerState) {
    if (task.executionMode === "worktree") {
      const query = `?directory=${encodeURIComponent(task.directory)}`
      const worktree = await this.fetchJson<{ directory?: string; branch?: string }>(server, `/experimental/worktree${query}`, {
        method: "POST",
        body: JSON.stringify({
          name: `automation-${task.id.slice(0, 8)}-${Date.now().toString(36)}`,
          ...(task.branch ? { baseBranch: task.branch } : {}),
        }),
      })
      if (!worktree.directory) throw new Error("Create worktree returned no directory")
      await delay(500)
      await this.fetchJson(server, `/vcs?directory=${encodeURIComponent(worktree.directory)}`)
      return { directory: worktree.directory, branch: worktree.branch ?? task.branch }
    }

    if (task.branch && task.directory) {
      await this.fetchJson(server, `/vcs/branch?directory=${encodeURIComponent(task.directory)}`, {
        method: "POST",
        body: JSON.stringify({ branch: task.branch }),
      })
    }
    return { directory: task.directory, branch: task.branch }
  }

  private async waitForCompletion(server: ServerState, sessionID: string, directory: string, timeoutMinutes: number) {
    const deadline = Date.now() + timeoutMinutes * 60_000
    const query = directory ? `?directory=${encodeURIComponent(directory)}` : ""
    let idlePolls = 0
    let pollErrors = 0
    await delay(1_000)
    while (Date.now() < deadline) {
      try {
        const statuses = await this.fetchJson<Record<string, { type?: string }>>(server, `/session/status${query}`)
        pollErrors = 0
        if (statuses[sessionID]) {
          idlePolls = 0
        } else {
          idlePolls++
          if (idlePolls >= 2) {
            await this.requireSuccessfulSession(server, sessionID, query)
            return
          }
        }
      } catch (error) {
        pollErrors++
        if (pollErrors >= 3) throw error
      }
      await delay(2_000)
    }
    throw new ScheduledTaskTimeoutError(`Task did not complete within ${timeoutMinutes} minutes`)
  }

  private async requireSuccessfulSession(server: ServerState, sessionID: string, query: string) {
    const messages = await this.fetchJson<Array<{ type?: string; error?: unknown }>>(
      server,
      `/session/${encodeURIComponent(sessionID)}/message${query}`,
    )
    const assistant = messages.findLast((message) => message.type === "assistant")
    if (!assistant?.error) return
    const error = assistant.error
    if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
      throw new Error(error.message)
    }
    throw new Error(`Session failed: ${JSON.stringify(error)}`)
  }

  private async fetchJson<T = unknown>(server: ServerState, path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers)
    headers.set("Accept", "application/json")
    if (init?.body) headers.set("Content-Type", "application/json")
    if (server.password) {
      headers.set("Authorization", `Basic ${Buffer.from(`${server.username ?? "opencode"}:${server.password}`).toString("base64")}`)
    }
    const response = await fetch(new URL(path, `${server.url.replace(/\/+$/, "")}/`), {
      ...init,
      headers,
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 2_000)
      throw new Error(detail ? `HTTP ${response.status}: ${detail}` : `HTTP ${response.status}`)
    }
    const body = await response.json() as T | { data: T }
    if (body && typeof body === "object" && "data" in body) return body.data
    return body
  }

  private recordFailure(id: string, message: string) {
    const now = Date.now()
    this.db().prepare("UPDATE scheduled_task SET last_run_at = ?, last_error = ?, updated_at = ? WHERE id = ?")
      .run(now, message, now, id)
  }
}

class ScheduledTaskTimeoutError extends Error {}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function normalizeExecutionMode(value: unknown): ExecutionMode {
  return value === "worktree" ? "worktree" : "current"
}

function normalizePermissionProfile(value: unknown): PermissionProfile {
  if (value === "ask" || value === "writes" || value === "full") return value
  return "risk"
}

function normalizeServerUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, "")
  if (!URL.canParse(normalized)) throw new Error("Server URL is invalid")
  const url = new URL(normalized)
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Server URL must use HTTP or HTTPS")
  if (url.username || url.password) throw new Error("Server URL must not contain credentials")
  return normalized
}

function permissionRules(profile: PermissionProfile) {
  if (profile === "full") return [{ permission: "*", pattern: "*", action: "allow" }]
  if (profile === "ask") return [{ permission: "*", pattern: "*", action: "ask" }]
  if (profile === "writes") {
    return [
      { permission: "edit", pattern: "*", action: "ask" },
      { permission: "bash", pattern: "*", action: "ask" },
      { permission: "sandbox", pattern: "*", action: "ask" },
    ]
  }
  return [{ permission: "sandbox", pattern: "*", action: "ask" }]
}
