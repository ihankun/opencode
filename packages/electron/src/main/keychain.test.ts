import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldUseMockKeychain } from "./keychain.ts"

test("uses mock keychain for ad-hoc signed macOS builds", () => {
  assert.equal(shouldUseMockKeychain({
    platform: "darwin",
    signature: { status: 0, details: "Signature=adhoc\nTeamIdentifier=not set" },
  }), true)
})

test("uses system keychain for stable signed macOS builds", () => {
  assert.equal(shouldUseMockKeychain({
    platform: "darwin",
    signature: { status: 0, details: "Authority=Developer ID Application: Example\nTeamIdentifier=ABCDE12345" },
  }), false)
})

test("supports explicit keychain overrides and ignores non-macOS builds", () => {
  assert.equal(shouldUseMockKeychain({ platform: "darwin", override: "1" }), true)
  assert.equal(shouldUseMockKeychain({ platform: "darwin", override: "0" }), false)
  assert.equal(shouldUseMockKeychain({ platform: "win32", override: "1" }), false)
})
