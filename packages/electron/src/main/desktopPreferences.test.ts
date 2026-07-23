import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { DesktopPreferencesStore } from "./desktopPreferences.ts"

test("desktop preferences use requested defaults and persist normalized values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencodex-desktop-preferences-"))
  const file = join(directory, "preferences.json")

  try {
    const store = new DesktopPreferencesStore(file)
    assert.deepEqual(await store.load(), {
      defaultLocationApp: "",
      showMenuBarIcon: true,
      hideDockOnClose: false,
      backgroundSubagents: false,
    })

    assert.deepEqual(await store.save({
      defaultLocationApp: "cursor",
      showMenuBarIcon: false,
      hideDockOnClose: true,
      backgroundSubagents: true,
    }), {
      defaultLocationApp: "cursor",
      showMenuBarIcon: false,
      hideDockOnClose: true,
      backgroundSubagents: true,
    })

    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), {
      defaultLocationApp: "cursor",
      showMenuBarIcon: false,
      hideDockOnClose: true,
      backgroundSubagents: true,
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
