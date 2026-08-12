import assert from "node:assert/strict"
import { test } from "node:test"
import { assertBrowserTarget, isLocalPreviewHost, isPrivateIpAddress } from "./browserNetworkPolicy.ts"

test("blocks private and reserved IP addresses", () => {
  assert.equal(isPrivateIpAddress("10.0.0.1"), true)
  assert.equal(isPrivateIpAddress("192.168.1.10"), true)
  assert.equal(isPrivateIpAddress("169.254.169.254"), true)
  assert.equal(isPrivateIpAddress("::1"), true)
  assert.equal(isPrivateIpAddress("fc00::1"), true)
  assert.equal(isPrivateIpAddress("::ffff:127.0.0.1"), true)
  assert.equal(isPrivateIpAddress("8.8.8.8"), false)
})

test("allows loopback hosts only as local preview targets", () => {
  assert.equal(isLocalPreviewHost("localhost"), true)
  assert.equal(isLocalPreviewHost("127.0.0.1"), true)
  assert.equal(isLocalPreviewHost("::1"), true)
  assert.equal(isLocalPreviewHost("192.168.1.10"), false)
})

test("validates browser URL targets", async () => {
  await assert.doesNotReject(assertBrowserTarget("http://localhost:3000"))
  await assert.doesNotReject(assertBrowserTarget("https://8.8.8.8"))
  await assert.rejects(assertBrowserTarget("http://127.0.0.1:3000", false), /Local preview addresses are only allowed/)
  await assert.rejects(assertBrowserTarget("http://169.254.169.254"), /Private and local network addresses are blocked/)
  await assert.rejects(assertBrowserTarget("file:///tmp/example"), /Only HTTP\(S\) URLs can be opened/)
})
