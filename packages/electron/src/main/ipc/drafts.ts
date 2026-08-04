import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"
import type { DesktopDraftStore } from "../draft-store"

export function registerDraftsIpc(input: {
  assertSender: AssertIpcSender
  drafts: DesktopDraftStore
}) {
  ipcMain.handle("draft-get", (event, key: unknown) => {
    input.assertSender(event)
    return input.drafts.get(String(key ?? ""))
  })
  ipcMain.handle("draft-keys", (event) => {
    input.assertSender(event)
    return input.drafts.keys()
  })
  ipcMain.handle("draft-set", (event, key: unknown, value: unknown) => {
    input.assertSender(event)
    input.drafts.set(String(key ?? ""), typeof value === "string" ? value : null)
  })
  ipcMain.handle("draft-blob-put", (event, data: unknown) => {
    input.assertSender(event)
    if (!(data instanceof ArrayBuffer)) throw new Error("draft blob must be an ArrayBuffer")
    return input.drafts.putBlob(new Uint8Array(data))
  })
  ipcMain.handle("draft-blob-get", (event, id: unknown) => {
    input.assertSender(event)
    const data = input.drafts.getBlob(String(id ?? ""))
    if (!data) return null
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  })
}
