import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { test } from "node:test"

test("registers every preload invoke channel exactly once", async () => {
  const preload = await readFile(new URL("../preload/index.ts", import.meta.url), "utf8")
  const registrations = await readdir(new URL("./ipc/", import.meta.url)).then(files =>
    Promise.all(
      files
        .filter(file => file.endsWith(".ts"))
        .map(file => readFile(new URL(`./ipc/${file}`, import.meta.url), "utf8")),
    ),
  )
  const invoked = channels(preload, /ipcRenderer\.invoke\(\s*"([^"]+)"/g)
  const registered = registrations.flatMap(source => channels(source, /ipcMain\.handle\(\s*"([^"]+)"/g))
  const counts = registered.reduce<Map<string, number>>(
    (result, channel) => result.set(channel, (result.get(channel) ?? 0) + 1),
    new Map(),
  )

  assert.deepEqual(invoked.filter(channel => !counts.has(channel)), [])
  assert.deepEqual([...counts].filter(([, count]) => count !== 1), [])
})

function channels(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].map(match => match[1])
}
