import { spawnSync } from "node:child_process"

type KeychainModeInput = {
  platform?: NodeJS.Platform
  override?: string
  executable?: string
  signature?: {
    status: number | null
    details: string
  }
}

export function shouldUseMockKeychain(input?: KeychainModeInput) {
  if ((input?.platform ?? process.platform) !== "darwin") return false
  if (input?.override === "0") return false
  if (input?.override === "1") return true

  const signature = input?.signature ?? inspectMacSignature(input?.executable ?? process.execPath)
  if (signature.status !== 0) return true
  return /(?:^|\n)Signature=adhoc(?:\n|$)/.test(signature.details) || /(?:^|\n)TeamIdentifier=not set(?:\n|$)/.test(signature.details)
}

function inspectMacSignature(executable: string) {
  const result = spawnSync("/usr/bin/codesign", ["-dv", "--verbose=4", executable], { encoding: "utf8" })
  return {
    status: result.status,
    details: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  }
}
