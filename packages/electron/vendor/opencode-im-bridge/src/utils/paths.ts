import { homedir } from "node:os"
import { resolve } from "node:path"

export function getAttachmentsDir(): string {
  return resolve(homedir(), ".opencodex", ".opencode-lark", "attachments")
}

export function getChannelWorkingDirectory(channelId: string): string {
  const channel = channelId.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "chat"
  return resolve(homedir(), ".opencode", "im", `${channel}[im]`)
}
