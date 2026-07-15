import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { app, shell } from "electron"

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

export function exportDebugLogs() {
  if (!logFile) throw new Error("Logging is not initialized")

  const output = join(app.getPath("downloads"), `opencodex-debug-${stamp()}.log`)
  const manifest = {
    generated: new Date().toISOString(),
    version: app.getVersion(),
    name: app.getName(),
    packaged: app.isPackaged,
    platform: process.platform,
    arch: process.arch,
    versions: process.versions,
    uptime: process.uptime(),
    userData: app.getPath("userData"),
    logFile,
  }
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n\n${readFileSync(logFile, "utf8")}`)
  shell.showItemInFolder(output)
  writeLog("main", "debug logs exported", { output })
  return output
}

function stamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "")
}

function format(value: unknown) {
  if (value instanceof Error) return JSON.stringify({ message: value.message, stack: value.stack })
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
