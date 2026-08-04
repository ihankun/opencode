import { fileURLToPath } from "node:url"
import { shell } from "electron"

/** 允许用系统默认应用打开的外部链接协议（http/https/mailto）。 */
export function resolveExternalURL(value: string): string | undefined {
  if (!URL.canParse(value)) return undefined
  const url = new URL(value)
  if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") return url.href
  return undefined
}

/** 将 file: URL（无 hostname）解析为本地文件路径。 */
export function resolveLocalFilePath(value: string): string | undefined {
  if (!URL.canParse(value)) return undefined
  const url = new URL(value)
  if (url.protocol !== "file:" || url.hostname) return undefined
  try {
    return fileURLToPath(url)
  } catch {
    return undefined
  }
}

/** 在系统默认应用中打开 http/https/mailto 链接。 */
export function openExternalURL(rawUrl: string) {
  const url = resolveExternalURL(rawUrl)
  if (!url) throw new Error("Only HTTP(S) and mailto URLs can be opened")
  return shell.openExternal(url)
}

/** 用系统默认应用打开本地文件路径对应的 file: URL。 */
export function openLocalFileURL(rawUrl: string) {
  const path = resolveLocalFilePath(rawUrl)
  if (!path) throw new Error("Only local file URLs without a host can be opened")
  return shell.openPath(path).then((error) => {
    if (error) throw new Error(error)
  })
}
