import { app } from "electron"
import { DatabaseSync } from "node:sqlite"
import { join } from "node:path"
import { Cron } from "croner"
import { migrateScheduledTaskDatabase } from "./schedulerDatabase"

type ExecutionMode = "current" | "worktree"
type WorktreeCleanup = "always" | "on-success" | "never"
type PermissionProfile = "ask" | "writes" | "risk" | "full"
type RunStatus = "running" | "submitted" | "recovering" | "completed" | "failed" | "timed_out" | "cancelled"

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
  worktreeCleanup: WorktreeCleanup
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
  worktreeDirectory: string
  branch: string
  permissionProfile: PermissionProfile
  attempt: number
  modelProviderID: string
  modelID: string
  variant: string
  status: RunStatus
  error: string | null
  log: string
  updatedAt: number
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
  | "worktreeCleanup"
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
type AttemptResult = { ok: true } | { ok: false; message: string; retryable: boolean; cancelled: boolean }

export class TaskScheduler {
  private database?: DatabaseSync
  private jobs = new Map<string, Cron>()
  private running = new Set<string>()
  private cancelledRuns = new Set<string>()
  private capacityWaiters: Array<() => void> = []
  private readonly maxConcurrency = 3

  constructor(
    private readonly resolveServer: (task: ScheduledTask) => Promise<ServerState | undefined>,
    private readonly onChanged: () => void,
    private readonly onFinished?: (run: ScheduledTaskRun) => void,
  ) {}

  start() {
    this.database = new DatabaseSync(join(app.getPath("userData"), "scheduled-tasks.sqlite"))
    migrateScheduledTaskDatabase(this.database)
    this.list().filter((task) => task.enabled).forEach((task) => this.register(task))
    void this.recoverInterruptedRuns()
    void this.cleanupOrphanedWorktrees()
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
      worktreeDirectory: String(row.worktree_directory ?? ""),
      branch: String(row.branch),
      permissionProfile: normalizePermissionProfile(row.permission_profile),
      attempt: Number(row.attempt),
      modelProviderID: String(row.model_provider_id),
      modelID: String(row.model_id),
      variant: String(row.variant),
      status: String(row.status) as RunStatus,
      error: typeof row.error === "string" ? row.error : null,
      log: String(row.log ?? ""),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at || row.created_at),
      completedAt: typeof row.completed_at === "number" ? row.completed_at : null,
    }))
  }

  setRunArchived(sessionID: string, archived: boolean) {
    this.db().prepare("UPDATE scheduled_task_run SET archived = ? WHERE session_id = ?").run(Number(archived), sessionID)
  }

  async cancelRun(id: string) {
    const row = this.db().prepare("SELECT * FROM scheduled_task_run WHERE id = ?").get(id) as Record<string, unknown> | undefined
    if (!row) throw new Error("Scheduled task run not found")
    const status = String(row.status) as RunStatus
    if (!isActiveStatus(status)) return this.readRun(row)
    this.cancelledRuns.add(id)
    const task = this.get(String(row.task_id))
    const server = await this.resolveServer(task)
    const sessionID = String(row.session_id)
    if (server && !sessionID.startsWith("pending:")) {
      const query = row.execution_directory ? `?directory=${encodeURIComponent(String(row.execution_directory))}` : ""
      await this.fetchJson(server, `/session/${encodeURIComponent(sessionID)}/abort${query}`, { method: "POST" }).catch(() => undefined)
    }
    this.finishRun(id, "cancelled", "Cancelled by user")
    return this.getRun(id)
  }

  async cancelTask(id: string) {
    const runs = this.listRuns(id).filter((run) => isActiveStatus(run.status))
    await Promise.all(runs.map((run) => this.cancelRun(run.id)))
    return this.get(id)
  }

  create(input: TaskInput) {
    this.validate(input)
    const now = Date.now()
    const id = crypto.randomUUID()
    this.db().prepare(`
      INSERT INTO scheduled_task (
        id, title, prompt, cron, timezone, server_id, server_name, server_url, directory,
        execution_mode, worktree_cleanup, branch, permission_profile, retry_count, retry_delay_seconds,
        completion_timeout_minutes, model_provider_id, model_id, variant, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, input.title.trim(), input.prompt.trim(), input.cron.trim(), input.timezone,
      input.serverId, input.serverName.trim(), normalizeServerUrl(input.serverUrl), input.directory.trim(),
      input.executionMode, input.worktreeCleanup, input.branch.trim(), input.permissionProfile, input.retryCount, input.retryDelaySeconds,
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
        directory = ?, execution_mode = ?, worktree_cleanup = ?, branch = ?, permission_profile = ?, retry_count = ?,
        retry_delay_seconds = ?, completion_timeout_minutes = ?, model_provider_id = ?, model_id = ?,
        variant = ?, enabled = ?, last_error = NULL, updated_at = ?
      WHERE id = ?
    `).run(
      input.title.trim(), input.prompt.trim(), input.cron.trim(), input.timezone,
      input.serverId, input.serverName.trim(), normalizeServerUrl(input.serverUrl), input.directory.trim(),
      input.executionMode, input.worktreeCleanup, input.branch.trim(), input.permissionProfile, input.retryCount, input.retryDelaySeconds,
      input.completionTimeoutMinutes, input.modelProviderID, input.modelID, input.variant, Number(input.enabled), Date.now(), id,
    )
    const task = this.get(id)
    if (task.enabled) this.register(task)
    return task
  }

  remove(id: string) {
    this.require(id)
    if (this.running.has(id)) throw new Error("Stop the running task before deleting it")
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
      worktreeCleanup: normalizeWorktreeCleanup(row.worktree_cleanup),
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
    if (input.worktreeCleanup !== "always" && input.worktreeCleanup !== "on-success" && input.worktreeCleanup !== "never") throw new Error("Invalid worktree cleanup policy")
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
    await this.acquireCapacity()
    if (this.running.has(task.id)) {
      this.releaseCapacity()
      return
    }
    this.running.add(task.id)
    this.onChanged()
    try {
      const outcome = await this.executeWithRetry(task, 1)
      if (!outcome.ok) {
        if (!outcome.cancelled) this.recordFailure(task.id, outcome.message)
        return
      }
      const now = Date.now()
      this.db().prepare("UPDATE scheduled_task SET last_run_at = ?, last_error = NULL, updated_at = ? WHERE id = ?")
        .run(now, now, task.id)
    } finally {
      this.running.delete(task.id)
      this.releaseCapacity()
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
        execution_directory, execution_mode, worktree_directory, branch, permission_profile, attempt, model_provider_id,
        model_id, variant, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'running', ?)
    `).run(
      runID, task.id, task.title, task.prompt, `pending:${runID}`, task.serverId, task.serverName, task.serverUrl,
      task.directory, task.directory, task.executionMode, task.branch, task.permissionProfile, attempt,
      task.modelProviderID, task.modelID, task.variant, createdAt,
    )
    this.onChanged()
    this.appendRunLog(runID, `Attempt ${attempt} started on ${task.serverName}`)

    let submitted = false
    let hookServer: ServerState | undefined
    try {
      const server = await this.resolveServer(task)
      this.requireNotCancelled(runID)
      if (!server) throw new Error(`Server is unavailable: ${task.serverName}`)
      hookServer = server
      await this.fetchJson(server, "/global/health")
      this.appendRunLog(runID, "Server health check passed")
      await this.runHooks(server, task.directory, "automation.before", runID)
      const execution = await this.prepareExecution(task, server)
      this.requireNotCancelled(runID)
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
      this.db().prepare("UPDATE scheduled_task_run SET session_id = ?, execution_directory = ?, worktree_directory = ?, branch = ? WHERE id = ?")
        .run(session.id, execution.directory, execution.worktreeDirectory, execution.branch, runID)
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
      this.appendRunLog(runID, `Session ${session.id} submitted`)
      this.onChanged()
      await this.waitForCompletion(server, session.id, execution.directory, task.completionTimeoutMinutes, runID)
      this.finishRun(runID, "completed", null)
      await this.runHooks(server, task.directory, "automation.after", runID)
      await this.runHooks(server, task.directory, "notification", runID)
      if (execution.worktreeDirectory && task.worktreeCleanup !== "never") await this.cleanupWorktree(server, task.directory, execution.worktreeDirectory, runID)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const status: RunStatus = error instanceof ScheduledTaskCancelledError
        ? "cancelled"
        : error instanceof ScheduledTaskTimeoutError ? "timed_out" : "failed"
      this.finishRun(runID, status, message)
      if (hookServer) await this.runHooks(hookServer, task.directory, "automation.after", runID)
      if (hookServer) await this.runHooks(hookServer, task.directory, "notification", runID)
      const worktreeDirectory = this.getRun(runID).worktreeDirectory
      if (worktreeDirectory && task.worktreeCleanup === "always") await this.cleanupWorktree(await this.resolveServer(task), task.directory, worktreeDirectory, runID)
      return { ok: false, message, retryable: !submitted && status !== "cancelled", cancelled: status === "cancelled" }
    } finally {
      this.cancelledRuns.delete(runID)
    }
  }

  private async prepareExecution(task: ScheduledTask, server: ServerState) {
    if (task.executionMode === "worktree") {
      const existing = await this.fetchJson<string[]>(server, `/experimental/worktree?directory=${encodeURIComponent(task.directory)}`)
      if (existing.length >= 20) throw new Error("Worktree capacity reached (20). Clean up unused worktrees before running this automation.")
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
      return { directory: worktree.directory, branch: worktree.branch ?? task.branch, worktreeDirectory: worktree.directory }
    }

    if (task.branch && task.directory) {
      await this.fetchJson(server, `/vcs/branch?directory=${encodeURIComponent(task.directory)}`, {
        method: "POST",
        body: JSON.stringify({ branch: task.branch }),
      })
    }
    return { directory: task.directory, branch: task.branch, worktreeDirectory: "" }
  }

  private async waitForCompletion(server: ServerState, sessionID: string, directory: string, timeoutMinutes: number, runID: string) {
    const deadline = Date.now() + timeoutMinutes * 60_000
    const query = directory ? `?directory=${encodeURIComponent(directory)}` : ""
    let idlePolls = 0
    let pollErrors = 0
    await delay(1_000)
    while (Date.now() < deadline) {
      this.requireNotCancelled(runID)
      try {
        const statuses = await this.fetchJson<Record<string, { type?: string }>>(server, `/session/status${query}`)
        pollErrors = 0
        if (statuses[sessionID]) {
          idlePolls = 0
        } else {
          idlePolls++
          if (idlePolls >= 2) {
            await this.requireSuccessfulSession(server, sessionID, query)
            this.appendRunLog(runID, "Session completed successfully")
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

  private async cleanupWorktree(server: ServerState | undefined, sourceDirectory: string, worktreeDirectory: string, runID: string) {
    if (!server) return
    try {
      await this.fetchJson(server, `/experimental/worktree?directory=${encodeURIComponent(sourceDirectory)}`, {
        method: "DELETE",
        body: JSON.stringify({ directory: worktreeDirectory }),
      })
      this.appendRunLog(runID, `Removed owned worktree ${worktreeDirectory}`)
      this.db().prepare("UPDATE scheduled_task_run SET worktree_directory = '' WHERE id = ?").run(runID)
    } catch (error) {
      this.appendRunLog(runID, `Worktree cleanup pending: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async runHooks(server: ServerState, directory: string, event: "automation.before" | "automation.after" | "notification", runID: string) {
    if (!directory) return
    const capabilities = await this.fetchJson<{ hooks?: boolean }>(server, `/experimental/capabilities?directory=${encodeURIComponent(directory)}`).catch(() => ({ hooks: false }))
    if (!capabilities.hooks) return
    const runs = await this.fetchJson<Array<{ hookName?: string; status?: string; output?: string }>>(
      server,
      `/experimental/hooks/run?directory=${encodeURIComponent(directory)}`,
      { method: "POST", body: JSON.stringify({ event }) },
    ).catch((error) => [{ hookName: "hooks", status: "failed", output: error instanceof Error ? error.message : String(error) }])
    runs.forEach((run) => this.appendRunLog(runID, `Hook ${run.hookName ?? "unknown"}: ${run.status ?? "unknown"}${run.output ? `\n${run.output}` : ""}`))
  }

  private getRun(id: string) {
    const row = this.db().prepare("SELECT * FROM scheduled_task_run WHERE id = ?").get(id) as Record<string, unknown> | undefined
    if (!row) throw new Error("Scheduled task run not found")
    return this.readRun(row)
  }

  private readRun(row: Record<string, unknown>): ScheduledTaskRun {
    return this.listRuns().find((run) => run.id === String(row.id)) ?? (() => { throw new Error("Scheduled task run not found") })()
  }

  private appendRunLog(id: string, message: string) {
    const timestamp = new Date().toISOString()
    this.db().prepare("UPDATE scheduled_task_run SET log = log || ?, updated_at = ? WHERE id = ?")
      .run(`${timestamp} ${message}\n`, Date.now(), id)
    this.onChanged()
  }

  private finishRun(id: string, status: RunStatus, error: string | null) {
    const now = Date.now()
    this.db().prepare("UPDATE scheduled_task_run SET status = ?, error = ?, completed_at = ?, updated_at = ? WHERE id = ?")
      .run(status, error, now, now, id)
    this.appendRunLog(id, error ? `${status}: ${error}` : status)
    const run = this.getRun(id)
    this.onChanged()
    this.onFinished?.(run)
  }

  private requireNotCancelled(runID: string) {
    if (this.cancelledRuns.has(runID)) throw new ScheduledTaskCancelledError("Cancelled by user")
  }

  private acquireCapacity() {
    if (this.running.size < this.maxConcurrency) return Promise.resolve()
    return new Promise<void>((resolve) => this.capacityWaiters.push(resolve))
  }

  private releaseCapacity() {
    this.capacityWaiters.shift()?.()
  }

  private async recoverInterruptedRuns() {
    const runs = this.listRuns().filter((run) => isActiveStatus(run.status))
    await Promise.all(runs.map(async (run) => {
      if (run.sessionID.startsWith("pending:")) {
        this.finishRun(run.id, "failed", "Application stopped before the session was submitted")
        return
      }
      const task = this.get(run.taskID)
      const server = await this.resolveServer(task)
      if (!server) {
        this.finishRun(run.id, "failed", `Server is unavailable: ${run.serverName}`)
        return
      }
      this.db().prepare("UPDATE scheduled_task_run SET status = 'recovering', updated_at = ? WHERE id = ?").run(Date.now(), run.id)
      this.appendRunLog(run.id, "Recovering session monitoring after application restart")
      try {
        await this.waitForCompletion(server, run.sessionID, run.executionDirectory, task.completionTimeoutMinutes, run.id)
        this.finishRun(run.id, "completed", null)
        await this.runHooks(server, task.directory, "notification", run.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.finishRun(run.id, error instanceof ScheduledTaskCancelledError ? "cancelled" : error instanceof ScheduledTaskTimeoutError ? "timed_out" : "failed", message)
        await this.runHooks(server, task.directory, "notification", run.id)
      }
    }))
  }

  private async cleanupOrphanedWorktrees() {
    const rows = this.db().prepare(`
      SELECT scheduled_task_run.id, scheduled_task_run.task_id, scheduled_task_run.directory,
        scheduled_task_run.worktree_directory, scheduled_task_run.status
      FROM scheduled_task_run
      JOIN scheduled_task ON scheduled_task.id = scheduled_task_run.task_id
      WHERE scheduled_task_run.worktree_directory != ''
        AND (scheduled_task_run.status = 'completed' OR scheduled_task.worktree_cleanup = 'always')
    `).all() as Array<Record<string, unknown>>
    await Promise.all(rows.map(async (row) => {
      const task = this.get(String(row.task_id))
      await this.cleanupWorktree(
        await this.resolveServer(task),
        String(row.directory),
        String(row.worktree_directory),
        String(row.id),
      )
    }))
  }
}

class ScheduledTaskTimeoutError extends Error {}
class ScheduledTaskCancelledError extends Error {}

function isActiveStatus(status: RunStatus) {
  return status === "running" || status === "submitted" || status === "recovering"
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function normalizeExecutionMode(value: unknown): ExecutionMode {
  return value === "worktree" ? "worktree" : "current"
}

function normalizeWorktreeCleanup(value: unknown): WorktreeCleanup {
  if (value === "always" || value === "never") return value
  return "on-success"
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
