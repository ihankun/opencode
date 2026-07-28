import type { IpcMainInvokeEvent } from "electron"

export type AssertIpcSender = (event: IpcMainInvokeEvent) => void
