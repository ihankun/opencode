import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { parseOpenCodeGoDashboard, queryProviderQuotas } from "./quota/index.ts"

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

test("OpenCode Go parser reads all SolidJS usage windows in either field order", () => {
  const parsed = parseOpenCodeGoDashboard(`
    rollingUsage:$R[1]={usagePercent:12.5,resetInSec:7200}
    weeklyUsage:$R[2]={resetInSec:345600,usagePercent:36}
    monthlyUsage:$R[3]={usagePercent:64,resetInSec:1728000}
  `)
  assert.deepEqual(parsed, {
    rolling: { usagePercent: 12.5, resetInSec: 7200 },
    weekly: { usagePercent: 36, resetInSec: 345600 },
    monthly: { usagePercent: 64, resetInSec: 1728000 },
  })
})

test("OpenCode Go parser falls back to data-slot dashboard markup", () => {
  const parsed = parseOpenCodeGoDashboard(`
    <div data-slot="usage-item">
      <span data-slot="usage-label">Rolling Usage</span>
      <span data-slot="usage-value">18.5% used</span>
      <span data-slot="reset-time">Resets in 1 hour 30 minutes</span>
    </div>
    <div data-slot="usage-item">
      <span data-slot="usage-label">Weekly Usage</span>
      <span data-slot="usage-value">42% used</span>
      <span data-slot="reset-now">Reset now</span>
    </div>
    <div data-slot="usage-item">
      <span data-slot="usage-label">Monthly Usage</span>
      <span data-slot="usage-value">73% used</span>
      <span data-slot="reset-time">Resets in 6 days 2 hours</span>
    </div>
  `)
  assert.deepEqual(parsed, {
    rolling: { usagePercent: 18.5, resetInSec: 5400 },
    weekly: { usagePercent: 42, resetInSec: 0 },
    monthly: { usagePercent: 73, resetInSec: 525600 },
  })
})
