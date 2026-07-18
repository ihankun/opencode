import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { app, shell } from "electron"

let logFile: string | undefined
let writesSinceSizeCheck = 0
const maxLogSize = 10 * 1024 * 1024

export function initLogging() {
  const dir = join(app.getPath("userData"), "logs")
  mkdirSync(dir, { recursive: true })
  logFile = join(dir, "main.log")
  rotateLogIfNeeded()
  writeLog("main", "logging initialized", { logFile })
  return logFile
}

export function writeLog(scope: string, message: string, meta?: unknown) {
  const line = redact(`${new Date().toISOString()} [${scope}] ${message}${meta === undefined ? "" : ` ${format(meta)}`}\n`)
  process.stdout.write(line)
  if (!logFile) return
  appendFileSync(logFile, line)
  writesSinceSizeCheck++
  if (writesSinceSizeCheck >= 100) rotateLogIfNeeded()
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
    userData: "[APP_DATA]",
    logFile: "[APP_DATA]/logs/main.log",
  }
  writeFileSync(output, redact(`${JSON.stringify(manifest, null, 2)}\n\n${readFileSync(logFile, "utf8")}`))
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

function rotateLogIfNeeded() {
  writesSinceSizeCheck = 0
  if (!logFile || !existsSync(logFile) || statSync(logFile).size < maxLogSize) return
  const previous = `${logFile}.1`
  rmSync(previous, { force: true })
  renameSync(logFile, previous)
}

function redact(value: string) {
  return value
    .replaceAll(homedir(), "~")
    .replace(/(authorization["'\s:=]+(?:bearer|basic)\s+)[^\s"']+/gi, "$1[REDACTED]")
    .replace(/((?:api[_-]?key|token|secret|password|private[_-]?token)["'\s:=]+)[^\s,"'}]+/gi, "$1[REDACTED]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{20,})\b/g, "[REDACTED]")
    .replace(/(https?:\/\/[^\s/:@]+:)[^\s@]+@/gi, "$1[REDACTED]@")
}
