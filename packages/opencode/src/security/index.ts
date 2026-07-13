import { appendFile, mkdir, readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { SandboxManager, type SandboxRuntimeConfig } from "@anthropic-ai/sandbox-runtime"

type Config = {
  sandbox: {
    enabled: boolean
    denyRead: string[]
    allowRead: string[]
    allowWrite: string[]
    denyWrite: string[]
    allowedDomains: string[]
    deniedDomains: string[]
    allowUnixSockets: string[]
    allowAllUnixSockets: boolean
    allowLocalBinding: boolean
  }
  audit: {
    enabled: boolean
    directory: string
  }
}

let config: Promise<Config> | undefined
let initialized: Promise<boolean> | undefined
let auditWrite = Promise.resolve()
const auditedMessages = new Set<string>()

export async function sandboxCommand(command: string, cwd: string, worktree: string, shell: string, bypass: boolean) {
  const current = await load()
  if (!current.sandbox.enabled || bypass) return { command, sandboxed: false, unavailable: false }
  if (!(await initialize(current))) return { command, sandboxed: false, unavailable: true }
  return SandboxManager.wrapWithSandbox(command, shell, runtime(current, cwd, worktree))
    .then((wrapped) => ({ command: wrapped, sandboxed: true, unavailable: false }))
    .catch((error) => {
      console.error("[security:sandbox] failed to wrap command", error)
      return { command, sandboxed: false, unavailable: true }
    })
}

export async function sandboxRisks(command: string) {
  const current = await load()
  if (!current.sandbox.enabled) return []
  const expanded = (value: string) => path.resolve(value.replace(/^~(?=$|[/\\])/, os.homedir()))
  const deniedPaths = [...current.sandbox.denyRead, ...current.sandbox.denyWrite]
    .map(expanded)
    .filter((item) => command.includes(item) || command.includes(item.replace(os.homedir(), "~")))
  const hosts = [...command.matchAll(/https?:\/\/([^\s/'"`]+)/gi)].map((match) => match[1].split(":")[0].toLowerCase())
  const deniedHosts = hosts.filter((host) =>
    current.sandbox.deniedDomains.some((pattern) => matches(host, pattern)) ||
    !current.sandbox.allowedDomains.some((pattern) => matches(host, pattern)),
  )
  return [
    ...deniedPaths.map((item) => `filesystem:${item}`),
    ...deniedHosts.map((item) => `network:${item}`),
  ]
}

export function auditTool(input: {
  event: "tool_execute_before" | "tool_execute_after" | "tool_execute_error"
  sessionID: string
  callID: string
  tool: string
  data: unknown
}) {
  return writeAudit(input.sessionID, { ts: new Date().toISOString(), ...input })
}

export function auditMessage(input: {
  sessionID: string
  messageID: string
  role: "user" | "assistant"
  data: unknown
}) {
  if (auditedMessages.has(input.messageID)) return Promise.resolve()
  auditedMessages.add(input.messageID)
  return writeAudit(input.sessionID, {
    ts: new Date().toISOString(),
    event: "chat_message",
    sessionID: input.sessionID,
    messageID: input.messageID,
    role: input.role,
    data: input.data,
  })
}

function writeAudit(sessionID: string, event: unknown) {
  auditWrite = auditWrite.then(async () => {
    const current = await load()
    if (!current.audit.enabled) return
    await mkdir(current.audit.directory, { recursive: true })
    await appendFile(
      path.join(current.audit.directory, `${safe(sessionID)}.jsonl`),
      JSON.stringify(event) + "\n",
      { mode: 0o600 },
    )
  }).catch((error) => console.error("[security:audit] failed to write audit event", error))
  return auditWrite
}

async function load() {
  config ??= readFile(process.env.OPENCODE_SECURITY_CONFIG ?? "", "utf8")
    .then((value) => JSON.parse(value) as Config)
    .catch(() => ({
      sandbox: {
        enabled: false,
        denyRead: [],
        allowRead: [],
        allowWrite: [],
        denyWrite: [],
        allowedDomains: [],
        deniedDomains: [],
        allowUnixSockets: [],
        allowAllUnixSockets: false,
        allowLocalBinding: false,
      },
      audit: { enabled: false, directory: "" },
    }))
  return config
}

function runtime(current: Config, cwd: string, worktree: string): Partial<SandboxRuntimeConfig> {
  return {
    filesystem: {
      denyRead: current.sandbox.denyRead,
      allowRead: current.sandbox.allowRead,
      allowWrite: current.sandbox.allowWrite.length ? current.sandbox.allowWrite : [...new Set([cwd, worktree, os.tmpdir()])],
      denyWrite: current.sandbox.denyWrite,
    },
    network: {
      allowedDomains: current.sandbox.allowedDomains,
      deniedDomains: current.sandbox.deniedDomains,
      allowUnixSockets: current.sandbox.allowUnixSockets,
      allowAllUnixSockets: current.sandbox.allowAllUnixSockets,
      allowLocalBinding: current.sandbox.allowLocalBinding,
    },
  }
}

function initialize(current: Config) {
  initialized ??= SandboxManager.initialize(runtime(current, os.tmpdir(), os.tmpdir()) as SandboxRuntimeConfig)
    .then(() => true)
    .catch((error) => {
      console.error("[security:sandbox] initialization failed", error)
      return false
    })
  return initialized
}

function matches(host: string, pattern: string) {
  const normalized = pattern.toLowerCase()
  if (normalized.startsWith("*.")) return host === normalized.slice(2) || host.endsWith(normalized.slice(1))
  return host === normalized
}

function safe(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_")
}
