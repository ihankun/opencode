import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { RendererSettingsStore } from "./rendererSettings.ts"

test("renderer settings persist as versioned JSON and serialize writes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencodex-renderer-settings-"))
  const file = join(directory, "renderer-settings.json")

  try {
    const store = new RendererSettingsStore(file)
    assert.deepEqual(await store.current(), {})

    await Promise.all([
      store.save({ "theme-mode": "dark" }),
      store.save({ "theme-mode": "light", "srv:local:selected-model-key": "openai:gpt-5" }),
    ])

    assert.deepEqual(await store.current(), {
      "theme-mode": "light",
      "srv:local:selected-model-key": "openai:gpt-5",
    })
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), {
      version: 1,
      settings: {
        "theme-mode": "light",
        "srv:local:selected-model-key": "openai:gpt-5",
      },
    })
    assert.deepEqual(await new RendererSettingsStore(file).current(), {
      "theme-mode": "light",
      "srv:local:selected-model-key": "openai:gpt-5",
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("renderer settings recover the previous snapshot from backup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencodex-renderer-settings-backup-"))
  const file = join(directory, "renderer-settings.json")

  try {
    const store = new RendererSettingsStore(file)
    await store.save({ "theme-mode": "dark" })
    await store.save({ "theme-mode": "light" })
    await writeFile(file, "{")

    assert.deepEqual(await new RendererSettingsStore(file).current(), {
      "theme-mode": "dark",
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("renderer settings reject non-string values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencodex-renderer-settings-invalid-"))

  try {
    const store = new RendererSettingsStore(join(directory, "renderer-settings.json"))
    await store.current()
    assert.throws(() => store.save({ "theme-mode": true }), /Invalid renderer setting/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("renderer settings do not replace an unreadable snapshot with defaults", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencodex-renderer-settings-corrupt-"))
  const file = join(directory, "renderer-settings.json")

  try {
    await writeFile(file, "{")
    await assert.rejects(new RendererSettingsStore(file).current(), /JSON/)
    assert.equal(await readFile(file, "utf8"), "{")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
