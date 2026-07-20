import { describe, expect, test } from "bun:test"
import { HookManager } from "@/hooks"
import { tmpdir } from "../fixture/fixture"

describe("hook manager", () => {
  test("persists hook definitions with durable JSON storage", async () => {
    await using tmp = await tmpdir()
    const hook = {
      id: "hook-test",
      name: "Typecheck",
      event: "automation.before" as const,
      command: "bun typecheck",
      enabled: false,
      approved: false,
      sandbox: true,
      timeoutSeconds: 30,
    }

    expect(await HookManager.read(tmp.path)).toEqual({ hooks: [], runs: [] })
    expect(await HookManager.write(tmp.path, [hook])).toEqual({ hooks: [hook], runs: [] })
    expect(await HookManager.read(tmp.path)).toEqual({ hooks: [hook], runs: [] })
  })
})
