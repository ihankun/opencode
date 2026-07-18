import { Schema } from "effect"
import path from "node:path"
import { mkdir } from "node:fs/promises"

export const Event = Schema.Literals(["automation.before", "automation.after", "git.before", "git.after", "notification"])
export type Event = typeof Event.Type

export const Definition = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  event: Event,
  command: Schema.String,
  enabled: Schema.Boolean,
  timeoutSeconds: Schema.Number,
})
export type Definition = typeof Definition.Type

export const Run = Schema.Struct({
  id: Schema.String,
  hookID: Schema.String,
  hookName: Schema.String,
  event: Event,
  status: Schema.Literals(["completed", "failed", "timed_out"]),
  output: Schema.String,
  startedAt: Schema.Number,
  completedAt: Schema.Number,
})
export type Run = typeof Run.Type

export const State = Schema.Struct({ hooks: Schema.Array(Definition), runs: Schema.Array(Run) })
export const UpdatePayload = Schema.Struct({ hooks: Schema.Array(Definition) })
export const RunPayload = Schema.Struct({ event: Event })

function configFile(directory: string) {
  return path.join(directory, ".opencode", "hooks.json")
}

function runsFile(directory: string) {
  return path.join(directory, ".opencode", "hook-runs.json")
}

export async function read(directory: string) {
  const [hooks, runs] = await Promise.all([
    Bun.file(configFile(directory)).json().catch(() => []),
    Bun.file(runsFile(directory)).json().catch(() => []),
  ])
  return {
    hooks: Array.isArray(hooks) ? hooks.flatMap(normalizeDefinition) : [],
    runs: Array.isArray(runs) ? runs.flatMap(normalizeRun).slice(0, 200) : [],
  }
}

export async function write(directory: string, hooks: Definition[]) {
  const normalized = hooks.map(requireDefinition)
  await mkdir(path.dirname(configFile(directory)), { recursive: true })
  await Bun.write(configFile(directory), `${JSON.stringify(normalized, null, 2)}\n`)
  return { ...(await read(directory)), hooks: normalized }
}

export async function execute(directory: string, event: Event) {
  const state = await read(directory)
  const runs: Run[] = []
  for (const hook of state.hooks.filter((item) => item.enabled && item.event === event)) {
    const startedAt = Date.now()
    const child = Bun.spawn(
      processCommand(hook.command),
      {
        cwd: directory,
        env: {
          PATH: process.env.PATH ?? "",
          HOME: process.env.HOME ?? "",
          OPENCODE_HOOK_EVENT: event,
          OPENCODE_WORKSPACE: directory,
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    )
    const timeout = setTimeout(() => child.kill(), hook.timeoutSeconds * 1000)
    const exitCode = await child.exited
    clearTimeout(timeout)
    const output = `${await new Response(child.stdout).text()}${await new Response(child.stderr).text()}`.slice(0, 200_000)
    const completedAt = Date.now()
    runs.push({
      id: crypto.randomUUID(),
      hookID: hook.id,
      hookName: hook.name,
      event,
      status: completedAt - startedAt >= hook.timeoutSeconds * 1000 ? "timed_out" : exitCode === 0 ? "completed" : "failed",
      output,
      startedAt,
      completedAt,
    })
  }
  await mkdir(path.dirname(runsFile(directory)), { recursive: true })
  await Bun.write(runsFile(directory), `${JSON.stringify([...runs.toReversed(), ...state.runs].slice(0, 200), null, 2)}\n`)
  return runs
}

function processCommand(command: string) {
  if (process.platform === "win32") return ["cmd.exe", "/d", "/s", "/c", command]
  return ["/bin/sh", "-lc", command]
}

function requireDefinition(value: Definition) {
  const name = value.name.trim()
  const command = value.command.trim()
  if (!name || !command || command.length > 2_000 || command.includes("\0")) throw new Error("Hook name and command are required")
  const timeoutSeconds = Math.max(1, Math.min(120, Math.floor(value.timeoutSeconds)))
  return { ...value, id: value.id || crypto.randomUUID(), name, command, timeoutSeconds }
}

function normalizeDefinition(value: unknown): Definition[] {
  if (!value || typeof value !== "object") return []
  if (!("id" in value) || typeof value.id !== "string") return []
  if (!("name" in value) || typeof value.name !== "string") return []
  if (!("command" in value) || typeof value.command !== "string") return []
  if (!("enabled" in value) || typeof value.enabled !== "boolean") return []
  if (!("timeoutSeconds" in value) || typeof value.timeoutSeconds !== "number") return []
  if (!("event" in value) || !["automation.before", "automation.after", "git.before", "git.after", "notification"].includes(String(value.event))) return []
  return [requireDefinition(value as Definition)]
}

function normalizeRun(value: unknown): Run[] {
  if (!value || typeof value !== "object") return []
  if (!("id" in value) || typeof value.id !== "string") return []
  if (!("hookID" in value) || typeof value.hookID !== "string") return []
  if (!("hookName" in value) || typeof value.hookName !== "string") return []
  if (!("event" in value) || !["automation.before", "automation.after", "git.before", "git.after", "notification"].includes(String(value.event))) return []
  if (!("status" in value) || !["completed", "failed", "timed_out"].includes(String(value.status))) return []
  if (!("output" in value) || typeof value.output !== "string") return []
  if (!("startedAt" in value) || typeof value.startedAt !== "number") return []
  if (!("completedAt" in value) || typeof value.completedAt !== "number") return []
  return [value as Run]
}
