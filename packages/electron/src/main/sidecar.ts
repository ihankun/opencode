import { join } from "node:path"
import { getCACertificates, setDefaultCACertificates } from "node:tls"

type StartCommand = {
  type: "start"
  hostname: string
  port: number
  password?: string
  userDataPath: string
  cors: string[]
}

type StopCommand = { type: "stop" }
type SidecarCommand = StartCommand | StopCommand

type ParentPort = {
  postMessage(message: SidecarMessage): void
  on(event: "message", listener: (event: { data: unknown }) => void): void
}

type SidecarMessage =
  | { type: "ready"; url: string }
  | { type: "stopped" }
  | { type: "error"; error: { message: string; stack?: string } }

type Listener = {
  url: URL
  stop(close?: boolean): Promise<void> | void
}

type ServerModule = {
  Server: {
    listen(options: {
      hostname: string
      port: number
      cors: string[]
      username?: string
      password?: string
    }): Promise<Listener> | Listener
  }
}

const parentPort = requireParentPort()
let listener: Listener | undefined

parentPort.on("message", (event) => {
  const command = parseCommand(event.data)
  if (!command) return
  if (command.type === "stop") {
    void stop()
    return
  }
  void start(command)
})

async function start(command: StartCommand) {
  try {
    prepareEnv(command)
    useSystemCertificates()
    const serverModule = await importServerModule()

    listener = await serverModule.Server.listen({
      hostname: command.hostname,
      port: command.port,
      cors: command.cors,
      ...(command.password ? { username: "opencode", password: command.password } : {}),
    })
    parentPort.postMessage({ type: "ready", url: listener.url.toString() })
  } catch (error) {
    parentPort.postMessage({ type: "error", error: serializeError(error) })
    setImmediate(() => process.exit(1))
  }
}

async function stop() {
  try {
    await listener?.stop(true)
  } finally {
    listener = undefined
    parentPort.postMessage({ type: "stopped" })
    setImmediate(() => process.exit(0))
  }
}

async function importServerModule() {
  const serverModule = process.env.OPENCODE_SERVER_MODULE
  if (!serverModule) throw new Error("OPENCODE_SERVER_MODULE is not configured")
  return (await import(serverModule)) as ServerModule
}

function prepareEnv(command: StartCommand) {
  const xdgRoot = join(command.userDataPath, "xdg")

  Object.assign(process.env, {
    OPENCODE_CLIENT: "opencodex-electron",
    OPENCODE_DISABLE_EMBEDDED_WEB_UI: "true",
    OPENCODE_EXPERIMENTAL_FILEWATCHER: "true",
    XDG_CACHE_HOME: join(xdgRoot, "cache"),
    XDG_CONFIG_HOME: join(xdgRoot, "config"),
    XDG_DATA_HOME: join(xdgRoot, "data"),
    XDG_STATE_HOME: join(xdgRoot, "state"),
  })

  if (command.password) {
    process.env.OPENCODE_SERVER_USERNAME = "opencode"
    process.env.OPENCODE_SERVER_PASSWORD = command.password
    return
  }

  delete process.env.OPENCODE_SERVER_USERNAME
  delete process.env.OPENCODE_SERVER_PASSWORD
}

function useSystemCertificates() {
  try {
    setDefaultCACertificates([...new Set([...getCACertificates("default"), ...getCACertificates("system")])])
  } catch (error) {
    console.warn("failed to load system certificates", error)
  }
}

function parseCommand(value: unknown): SidecarCommand | undefined {
  if (!value || typeof value !== "object") return
  const command = value as Partial<StartCommand | StopCommand>
  if (command.type === "stop") return { type: "stop" }
  if (command.type !== "start") return
  if (typeof command.hostname !== "string") return
  if (typeof command.port !== "number") return
  if (command.password !== undefined && typeof command.password !== "string") return
  if (typeof command.userDataPath !== "string") return
  if (!Array.isArray(command.cors) || !command.cors.every((item) => typeof item === "string")) return
  return {
    type: "start",
    hostname: command.hostname,
    port: command.port,
    password: command.password,
    userDataPath: command.userDataPath,
    cors: command.cors,
  }
}

function serializeError(error: unknown) {
  if (error instanceof Error) return { message: error.message, stack: error.stack }
  return { message: String(error) }
}

function requireParentPort() {
  const port = process.parentPort as ParentPort | undefined
  if (!port) throw new Error("Sidecar parent port unavailable")
  return port
}
