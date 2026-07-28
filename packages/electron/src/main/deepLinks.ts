import { isAbsolute } from "node:path"
import type { CustomOpenCodeDeepLink } from "../shared/deepLinks"

const MAX_URL_LENGTH = 32_768
const MAX_DIRECTORY_LENGTH = 4_096
const MAX_PROMPT_LENGTH = 16_384

export function parseDeepLink(input: string): CustomOpenCodeDeepLink | undefined {
  if (!input.startsWith("opencodex://") || input.length > MAX_URL_LENGTH) return

  const url = URL.parse(input)
  if (!url || url.protocol !== "opencodex:" || url.username || url.password || url.port || url.hash) return
  if (url.pathname && url.pathname !== "/") return

  const action = url.hostname.toLowerCase()
  if (action !== "open-project" && action !== "new-session") return

  const allowed = action === "new-session" ? new Set(["directory", "prompt"]) : new Set(["directory"])
  if ([...url.searchParams.keys()].some((key) => !allowed.has(key))) return
  if (url.searchParams.getAll("directory").length !== 1) return
  if (url.searchParams.getAll("prompt").length > 1) return

  const directory = url.searchParams.get("directory")
  if (
    !directory ||
    !directory.trim() ||
    directory.length > MAX_DIRECTORY_LENGTH ||
    directory.includes("\0") ||
    !isAbsolute(directory)
  ) {
    return
  }

  if (action === "open-project") return { action, directory }

  const prompt = url.searchParams.get("prompt") || undefined
  if (prompt && (prompt.length > MAX_PROMPT_LENGTH || prompt.includes("\0"))) return
  return { action, directory, ...(prompt ? { prompt } : {}) }
}

export function deepLinkUrlsFromArgv(argv: readonly string[]) {
  return argv.filter((argument) => argument.startsWith("opencodex://"))
}
