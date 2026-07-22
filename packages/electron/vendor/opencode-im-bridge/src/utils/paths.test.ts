import { describe, expect, it } from "bun:test"
import { homedir } from "node:os"
import { resolve } from "node:path"
import { getAttachmentsDir, getChannelWorkingDirectory } from "./paths.js"

describe("getAttachmentsDir", () => {
  it("keeps IM attachments outside the selected project", () => {
    expect(getAttachmentsDir()).toBe(
      resolve(homedir(), ".opencodex", ".opencode-lark", "attachments"),
    )
  })

  it("creates a stable project path for each IM channel", () => {
    expect(getChannelWorkingDirectory("feishu")).toBe(
      resolve(homedir(), ".opencode", "im", "feishu[im]"),
    )
    expect(getChannelWorkingDirectory("QQ")).toBe(
      resolve(homedir(), ".opencode", "im", "qq[im]"),
    )
    expect(getChannelWorkingDirectory("../../Unsafe Channel")).toBe(
      resolve(homedir(), ".opencode", "im", "unsafe-channel[im]"),
    )
  })
})
