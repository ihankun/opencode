/**
 * 常驻 daemon 管理（对齐官方 desktop 的 service daemon 语义）
 *
 * 关键约束：
 * - 只复用我们自己启动的 daemon：以 userData/daemon.json 身份文件为准 + 健康探测，
 *   绝不盲连 4096（官方 CLI 默认端口，可能是官方服务）
 * - daemon 使用专用端口段（45210+），与官方习惯端口隔离
 * - app 退出不杀 daemon；二进制指纹变化（升级）或健康探测失败时才重启
 */

import { spawn } from "node:child_process"
import { existsSync, mkdirSync, openSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { createConnection } from "node:net"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { app } from "electron"
import { writeLog } from "./logging"
import type { SidecarHandle } from "./server"

/** daemon 专用端口段起点：避开 4096（官方 CLI 默认端口，避免误连官方服务） */
const DAEMON_PORT_START = 45210
const DAEMON_PORT_COUNT = 10
const DAEMON_READY_TIMEOUT = 30_000
const DAEMON_HEALTH_CHECK_INTERVAL = 100
/**
 * daemon 启动参数版本：spawn 的 cwd/env 等影响 server 行为（如 /path 的默认目录）。
 * 主进程调整启动参数时必须递增此版本，否则旧 daemon 会被复用而继续使用旧参数。
 */
const DAEMON_LAUNCH_VERSION = 1

type DaemonIdentity = {
  url: string
  pid: number
  startedAt: number
  binaryFingerprint: string
  launchVersion?: number
}

export function daemonBinaryPath(): string | undefined {
  const name = process.platform === "win32" ? "OpenCodex Server.exe" : "OpenCodex Server"
  if (app.isPackaged) {
    const bundled = join(process.resourcesPath, name)
    return existsSync(bundled) ? bundled : undefined
  }
  const dev = join(dirname(fileURLToPath(import.meta.url)), "../daemon", name)
  return existsSync(dev) ? dev : undefined
}

export async function startDaemon(options: {
  userDataPath: string
  cors: string[]
  secureEnvironment: Record<string, string>
}): Promise<SidecarHandle> {
  const binaryPath = daemonBinaryPath()
  if (!binaryPath) throw new Error("opencode daemon binary not found")

  const fingerprint = binaryFingerprint(binaryPath)
  const existing = readIdentity(options.userDataPath)
  if (
    existing &&
    existing.launchVersion === DAEMON_LAUNCH_VERSION &&
    existing.binaryFingerprint === fingerprint &&
    (await isServerHealthy(existing.url))
  ) {
    writeLog("server", "reusing existing opencode daemon", { url: existing.url, pid: existing.pid })
    return daemonHandle(existing)
  }

  if (existing) {
    writeLog("server", "opencode daemon is stale, stopping it", { pid: existing.pid, url: existing.url })
    killDaemon(existing.pid)
  }

  writeLog("server", "starting opencode daemon", { binaryPath, fingerprint })
  const { url, pid } = await spawnDaemon({
    userDataPath: options.userDataPath,
    binaryPath,
    cors: options.cors,
    secureEnvironment: options.secureEnvironment,
  })
  const identity: DaemonIdentity = { url, pid, startedAt: Date.now(), binaryFingerprint: fingerprint, launchVersion: DAEMON_LAUNCH_VERSION }
  writeIdentity(options.userDataPath, identity)
  writeLog("server", "opencode daemon ready", { url, pid })
  return daemonHandle(identity)
}

export async function isServerHealthy(url: string): Promise<boolean> {
  try {
    const res = await fetch(new URL("/api/health", url), { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

function daemonHandle(identity: DaemonIdentity): SidecarHandle {
  return {
    state: { url: identity.url, username: "opencode", password: "" },
    stop: async () => killDaemon(identity.pid),
  }
}

async function spawnDaemon(options: {
  userDataPath: string
  binaryPath: string
  cors: string[]
  secureEnvironment: Record<string, string>
}): Promise<{ url: string; pid: number }> {
  const port = await findFreePort(DAEMON_PORT_START, DAEMON_PORT_COUNT)
  const logsDir = join(options.userDataPath, "logs")
  mkdirSync(logsDir, { recursive: true })
  // 工作目录必须与旧 sidecar 一致（userData/workspace）：
  // server 的 /path 默认目录基于 cwd，UI 未选项目时的会话列表按它过滤
  const workspacePath = join(options.userDataPath, "workspace")
  mkdirSync(workspacePath, { recursive: true })
  const logFd = openSync(join(logsDir, "server.log"), "a")
  const env = {
    ...process.env,
    OPENCODE_CLIENT: "opencodex",
    OPENCODE_DISABLE_EMBEDDED_WEB_UI: "true",
    OPENCODE_EXPERIMENTAL_FILEWATCHER: "true",
    OPENCODE_PORT: String(port),
    OPENCODE_CORS: JSON.stringify(options.cors),
    XDG_CACHE_HOME: join(options.userDataPath, "cache"),
    XDG_CONFIG_HOME: join(options.userDataPath, "config"),
    XDG_DATA_HOME: join(options.userDataPath, "data"),
    XDG_STATE_HOME: join(options.userDataPath, "state"),
    ...options.secureEnvironment,
  }
  const child = spawn(options.binaryPath, [], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env,
    cwd: workspacePath,
  })
  child.on("error", (error) => writeLog("server", "opencode daemon spawn failed", error))
  child.unref()
  const url = `http://127.0.0.1:${port}`
  const deadline = Date.now() + DAEMON_READY_TIMEOUT
  while (Date.now() < deadline) {
    if (await isServerHealthy(url)) return { url, pid: child.pid ?? -1 }
    await delay(DAEMON_HEALTH_CHECK_INTERVAL)
  }
  try {
    child.kill()
  } catch {
    /* already gone */
  }
  throw new Error(`opencode daemon did not become ready within ${DAEMON_READY_TIMEOUT}ms`)
}

function killDaemon(pid: number) {
  try {
    process.kill(pid)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
      writeLog("server", "failed to stop opencode daemon", { pid, error })
    }
  }
}

async function findFreePort(start: number, count: number): Promise<number> {
  for (let port = start; port < start + count; port++) {
    if (await isPortFree(port)) return port
  }
  throw new Error(`no free port in range ${start}-${start + count - 1}`)
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port, timeout: 500 })
    socket.once("connect", () => {
      socket.destroy()
      resolve(false)
    })
    socket.once("error", () => resolve(true))
    socket.once("timeout", () => {
      socket.destroy()
      resolve(true)
    })
  })
}

function identityPath(userDataPath: string) {
  return join(userDataPath, "daemon.json")
}

function readIdentity(userDataPath: string): DaemonIdentity | undefined {
  try {
    const raw = JSON.parse(readFileSync(identityPath(userDataPath), "utf8")) as Record<string, unknown>
    if (typeof raw.url !== "string" || typeof raw.pid !== "number" || typeof raw.binaryFingerprint !== "string") {
      return undefined
    }
    return {
      url: raw.url,
      pid: raw.pid,
      startedAt: typeof raw.startedAt === "number" ? raw.startedAt : Date.now(),
      binaryFingerprint: raw.binaryFingerprint,
    }
  } catch {
    return undefined
  }
}

function writeIdentity(userDataPath: string, identity: DaemonIdentity) {
  try {
    writeFileSync(identityPath(userDataPath), `${JSON.stringify(identity, null, 2)}\n`)
  } catch (error) {
    writeLog("server", "failed to write opencode daemon identity", error)
  }
}

function binaryFingerprint(binaryPath: string) {
  const stat = statSync(binaryPath)
  return `${stat.size}-${Math.floor(stat.mtimeMs)}`
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
