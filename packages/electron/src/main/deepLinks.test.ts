import assert from "node:assert/strict"
import { test } from "node:test"
import { deepLinkUrlsFromArgv, parseDeepLink } from "./deepLinks.ts"

test("parses the supported project deep links", () => {
  assert.deepEqual(parseDeepLink("opencodex://open-project?directory=%2Ftmp%2Fdemo"), {
    action: "open-project",
    directory: "/tmp/demo",
  })
  assert.deepEqual(
    parseDeepLink("opencodex://new-session?directory=%2Ftmp%2Fdemo&prompt=fix%20the%20tests"),
    {
      action: "new-session",
      directory: "/tmp/demo",
      prompt: "fix the tests",
    },
  )
})

test("rejects unsupported or ambiguous deep links", () => {
  assert.equal(parseDeepLink("https://example.com"), undefined)
  assert.equal(parseDeepLink("opencodex://run-command?directory=%2Ftmp%2Fdemo"), undefined)
  assert.equal(parseDeepLink("opencodex://user@open-project?directory=%2Ftmp"), undefined)
  assert.equal(parseDeepLink("opencodex://open-project?directory=relative"), undefined)
  assert.equal(parseDeepLink("opencodex://open-project?directory=%2Ftmp&directory=%2Fother"), undefined)
  assert.equal(parseDeepLink("opencodex://open-project?directory=%2Ftmp&prompt=ignored"), undefined)
  assert.equal(parseDeepLink("opencodex://new-session/path?directory=%2Ftmp"), undefined)
  assert.equal(parseDeepLink("opencodex://new-session?directory=%2Ftmp&prompt=%00"), undefined)
  assert.equal(parseDeepLink(`opencodex://open-project?directory=/${"a".repeat(4_096)}`), undefined)
  assert.equal(parseDeepLink(`opencodex://new-session?directory=%2Ftmp&prompt=${"a".repeat(16_385)}`), undefined)
  assert.equal(parseDeepLink(`opencodex://open-project?directory=%2Ftmp&padding=${"a".repeat(32_768)}`), undefined)
})

test("extracts only deep links from process arguments", () => {
  assert.deepEqual(
    deepLinkUrlsFromArgv(["OpenCodex", "--flag", "opencodex://open-project?directory=%2Ftmp"]),
    ["opencodex://open-project?directory=%2Ftmp"],
  )
})
