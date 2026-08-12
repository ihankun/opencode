import { $ } from "bun"
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Glob } from "bun"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const cacheDir = join(__dirname, "..", ".models-cache")
const cacheFile = join(cacheDir, "api.json")

const repoRoot = join(__dirname, "..", "..", "..")
const opencodeDir = join(__dirname, "..", "..", "opencode")
const testFixture = join(opencodeDir, "test", "tool", "fixtures", "models-api.json")

const isBuild = process.env.npm_lifecycle_event?.includes("build") ?? false

// 增量编译：daemon 二进制比源码（含 workspace 依赖与 bun.lock）新则跳过，
// 避免 dev 每次启动都重编译导致 daemon 每次重启
const SOURCE_ROOTS = [
  opencodeDir,
  join(__dirname, "..", "..", "core"),
  join(__dirname, "..", "..", "effect-sqlite-node"),
  join(__dirname, "..", "..", "effect-drizzle-sqlite"),
  join(__dirname, "..", "daemon"),
]

async function latestSourceMtime(): Promise<number> {
  let latest = 0
  for (const root of SOURCE_ROOTS) {
    const glob = new Glob("**/*.{ts,tsx,json,toml,mjs,cjs}")
    for (const file of glob.scanSync({ cwd: root })) {
      if (file.includes("node_modules") || file.startsWith("dist/") || file.startsWith("out/") || file.startsWith(".verify")) {
        continue
      }
      const stat = statSync(join(root, file))
      if (stat.mtimeMs > latest) latest = stat.mtimeMs
    }
  }
  const bunLock = join(repoRoot, "bun.lock")
  if (existsSync(bunLock)) {
    const stat = statSync(bunLock)
    if (stat.mtimeMs > latest) latest = stat.mtimeMs
  }
  return latest
}

function isUpToDate(output: string, sourcesLatest: number): boolean {
  return existsSync(output) && statSync(output).mtimeMs >= sourcesLatest
}

async function resolveModelsJson(): Promise<string | undefined> {
  if (isBuild) {
    try {
      const res = await fetch("https://models.dev/api.json")
      if (res.ok) {
        mkdirSync(cacheDir, { recursive: true })
        writeFileSync(cacheFile, await res.text())
        return cacheFile
      }
    } catch {}
  } else {
    if (existsSync(cacheFile)) return cacheFile
    try {
      const res = await fetch("https://models.dev/api.json")
      if (res.ok) {
        mkdirSync(cacheDir, { recursive: true })
        writeFileSync(cacheFile, await res.text())
        return cacheFile
      }
    } catch {}
  }

  if (existsSync(testFixture)) return testFixture
  return undefined
}

const modelsJson = await resolveModelsJson()
if (modelsJson) process.env.MODELS_DEV_API_JSON = modelsJson

// ── 编译常驻 daemon 二进制（内置 Bun 运行时，替代 33MB JS bundle）──
const electronDir = join(__dirname, "..")
const daemonOutDir = join(electronDir, "out", "daemon")
mkdirSync(daemonOutDir, { recursive: true })
const daemonEntry = join(electronDir, "daemon", "entry.ts")
const daemonTarget =
  process.env.OPENCODE_DAEMON_TARGET ??
  (process.platform === "darwin"
    ? process.arch === "arm64" ? "bun-darwin-arm64" : "bun-darwin-x64"
    : process.platform === "win32"
      ? process.arch === "arm64" ? "bun-windows-arm64" : "bun-windows-x64"
      : process.arch === "arm64" ? "bun-linux-arm64" : "bun-linux-x64")
const daemonOut = join(daemonOutDir, process.platform === "win32" ? "opencode-server-bin.exe" : "opencode-server-bin")
const serverDistDir = join(opencodeDir, "dist", "node")
const nodeBundle = join(serverDistDir, "node.js")
const sourcesLatest = await latestSourceMtime()
if (isUpToDate(daemonOut, sourcesLatest) && isUpToDate(nodeBundle, sourcesLatest)) {
  console.log("Daemon up to date, skipping compile")
} else {
  await $`cd ../opencode && OPENCODE_CHANNEL=opencodex bun script/build-node.ts`
  await $`bun build --compile ${daemonEntry} --outfile ${daemonOut} --target=${daemonTarget} --external "opencode-web-ui.gen.ts"`.cwd(electronDir)
  console.log(`Daemon built: ${daemonOut}`)
}
// wasm 放二进制旁边：photon/tree-sitter 运行时按 import.meta.url 相对加载
if (existsSync(serverDistDir)) {
  for (const file of readdirSync(serverDistDir)) {
    if (!file.endsWith(".wasm")) continue
    copyFileSync(join(serverDistDir, file), join(daemonOutDir, file))
  }
}
