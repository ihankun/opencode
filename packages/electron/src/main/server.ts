import { randomBytes } from "node:crypto"
import { createServer } from "node:net"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { app, utilityProcess } from "electron"
import type { Details } from "electron"
import { writeLog } from "./logging"

type SidecarMessage =
  | { type: "ready"; url: string }
  | { type: "stopped" }
  | { type: "error"; error: { message: string; stack?: string } }

export type ServerState = {
  url: string
  username: string
  password: string
}

export type SidecarHandle = {
  state: ServerState
  stop(): Promise<void>
}

const SIDECAR_SERVICE_NAME = "custom opencode server"
const SIDECAR_READY_TIMEOUT = 60_000
const SIDECAR_STOP_TIMEOUT = 6_000

export async function spawnServer(userDataPath: string, cors: string[]): Promise<SidecarHandle> {
  const port = await getRandomPort()
  writeLog("server", "spawning opencode sidecar", { cors, port })
  const password = randomBytes(24).toString("base64url")
  const child = utilityProcess.fork(join(dirname(fileURLToPath(import.meta.url)), "sidecar.js"), [], {
    cwd: process.cwd(),
    env: createEnv(),
    serviceName: SIDECAR_SERVICE_NAME,
    stdio: "pipe",
  })
  let exited = false
  const exit = defer<number>()

  const onProcessGone = (_event: unknown, details: Details) => {
    if (details.type !== "Utility" || details.name !== SIDECAR_SERVICE_NAME) return
    writeLog("server", "opencode sidecar gone", { reason: details.reason, exitCode: details.exitCode })
  }

  app.on("child-process-gone", onProcessGone)
  child.once("exit", (code) => {
    exited = true
    app.off("child-process-gone", onProcessGone)
    writeLog("server", "opencode sidecar exited", { code })
    exit.resolve(code)
  })
  child.stdout?.on("data", (chunk: Buffer) => writeLog("server:stdout", chunk.toString("utf8").trimEnd()))
  child.stderr?.on("data", (chunk: Buffer) => writeLog("server:stderr", chunk.toString("utf8").trimEnd()))

  const url = await new Promise<string>((resolve, reject) => {
    let done = false
    const timeout = setTimeout(() => fail(new Error("opencode server did not become ready")), SIDECAR_READY_TIMEOUT)

    const fail = (error: Error) => {
      if (done) return
      done = true
      cleanup()
      reject(error)
    }
    const succeed = (value: string) => {
      if (done) return
      done = true
      cleanup()
      resolve(value)
    }
    const cleanup = () => {
      clearTimeout(timeout)
      child.off("message", onMessage)
      child.off("exit", onExit)
    }
    const onMessage = (message: SidecarMessage) => {
      if (message.type === "ready") {
        writeLog("server", "opencode sidecar ready", { url: message.url })
        succeed(message.url)
        return
      }
      if (message.type === "error") fail(Object.assign(new Error(message.error.message), { stack: message.error.stack }))
    }
    const onExit = (code: number) => fail(new Error(`opencode sidecar exited before ready with code ${code}`))

    child.on("message", onMessage)
    child.on("exit", onExit)
    child.postMessage({
      type: "start",
      hostname: "127.0.0.1",
      port,
      password,
      userDataPath,
      cors,
    })
  }).catch((error) => {
    if (!exited) child.kill()
    throw error
  })

  let stopping: Promise<void> | undefined
  return {
    state: {
      url,
      username: "opencode",
      password,
    },
    stop() {
      if (stopping) return stopping
      if (exited) return Promise.resolve()
      child.postMessage({ type: "stop" })
      stopping = Promise.race([
        exit.promise.then(() => undefined),
        delay(SIDECAR_STOP_TIMEOUT).then(() => {
          if (!exited) child.kill()
        }),
      ])
      return stopping
    },
  }
}

function createEnv() {
  const env = Object.fromEntries(
    Object.entries(process.env).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])),
  )
  delete env.DEBUG
  if (process.platform === "linux") delete env.LD_PRELOAD
  return env
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function getRandomPort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port)
          return
        }
        reject(new Error("Failed to allocate a random local port"))
      })
    })
  })
}

function defer<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
