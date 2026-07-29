import { $ } from "bun"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const cacheDir = join(__dirname, "..", ".models-cache")
const cacheFile = join(cacheDir, "api.json")

const opencodeDir = join(__dirname, "..", "..", "opencode")
const testFixture = join(opencodeDir, "test", "tool", "fixtures", "models-api.json")

async function resolveModelsJson(): Promise<string | undefined> {
  if (existsSync(cacheFile)) return cacheFile

  try {
    const res = await fetch("https://models.dev/api.json")
    if (res.ok) {
      mkdirSync(cacheDir, { recursive: true })
      writeFileSync(cacheFile, await res.text())
      return cacheFile
    }
  } catch {}

  if (existsSync(testFixture)) return testFixture
  return undefined
}

const modelsJson = await resolveModelsJson()
if (modelsJson) process.env.MODELS_DEV_API_JSON = modelsJson

await $`cd ../opencode && OPENCODE_CHANNEL=opencodex bun script/build-node.ts`
