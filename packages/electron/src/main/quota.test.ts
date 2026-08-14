import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { parseOpenCodeGoUsage, queryProviderQuotas } from "./quota/index.ts"

test("quota query rejects remote credential lookup without querying a provider", async () => {
  const results = await queryProviderQuotas("/unused", {
    providerIds: ["openai"],
    localServer: false,
  })
  assert.equal(results.length, 1)
  assert.equal(results[0]?.status, "unavailable")
  assert.match(results[0]?.error ?? "", /远程 Runner/)
})

test("quota query reports unsupported and missing credentials without network requests", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencodex-quota-"))
  try {
    const results = await queryProviderQuotas(directory, {
      providerIds: ["unsupported-provider", "deepseek"],
      localServer: true,
    })
    assert.deepEqual(results.map(item => item.status), ["unavailable", "error"])
    assert.match(results[0]?.error ?? "", /不支持/)
    assert.match(results[1]?.error ?? "", /API Key/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("OpenCode Go usage parser reads all official usage windows", () => {
  const rows = parseOpenCodeGoUsage({
    usage: {
      rolling: { percent: 12.5, resetsAt: "2026-08-14T12:00:00.000Z" },
      weekly: { percent: 36, resetsAt: "2026-08-16T00:00:00.000Z" },
      monthly: { percent: 64, resetsAt: "2026-09-01T00:00:00.000Z" },
    },
  })
  assert.deepEqual(rows, [
    {
      label: "5小时",
      kind: "percent",
      percentRemaining: 88,
      resetAt: "2026-08-14T12:00:00.000Z",
    },
    {
      label: "1周",
      kind: "percent",
      percentRemaining: 64,
      resetAt: "2026-08-16T00:00:00.000Z",
    },
    {
      label: "1月",
      kind: "percent",
      percentRemaining: 36,
      resetAt: "2026-09-01T00:00:00.000Z",
    },
  ])
})

test("OpenCode Go usage parser skips missing windows and clamps percentages", () => {
  const rows = parseOpenCodeGoUsage({
    usage: {
      rolling: { percent: 120, resetsAt: "2026-08-14T12:00:00.000Z" },
      weekly: { percent: -5 },
      monthly: { resetsAt: "2026-09-01T00:00:00.000Z" },
    },
  })
  assert.deepEqual(rows, [
    { label: "5小时", kind: "percent", percentRemaining: 0, resetAt: "2026-08-14T12:00:00.000Z" },
    { label: "1周", kind: "percent", percentRemaining: 100 },
  ])
})
