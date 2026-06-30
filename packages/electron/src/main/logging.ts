import { appendFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { app } from "electron"

let logFile: string | undefined

export function initLogging() {
  const dir = join(app.getPath("userData"), "logs")
  mkdirSync(dir, { recursive: true })
  logFile = join(dir, "main.log")
  writeLog("main", "logging initialized", { logFile })
  return logFile
}

export function writeLog(scope: string, message: string, meta?: unknown) {
  const line = `${new Date().toISOString()} [${scope}] ${message}${meta === undefined ? "" : ` ${format(meta)}`}\n`
  process.stdout.write(line)
  if (!logFile) return
  appendFileSync(logFile, line)
}

function format(value: unknown) {
  if (value instanceof Error) return JSON.stringify({ message: value.message, stack: value.stack })
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
