import { ipcMain } from "electron"
import type { AssertIpcSender } from "./shared"

export type RemoveAgentConfigInput = { scope: "global" | "project"; directory?: string; name: string }

export function registerAgentsIpc(input: {
  assertSender: AssertIpcSender
  removeAgentConfig: (input: RemoveAgentConfigInput) => Promise<{ changed: boolean; file: string }>
}) {
  ipcMain.handle("agents:remove-config", (event, raw: unknown) => {
    input.assertSender(event)
    return input.removeAgentConfig(parseRemoveAgentInput(raw))
  })
}

function parseRemoveAgentInput(raw: unknown): RemoveAgentConfigInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid remove agent config input")
  const value = raw as Record<string, unknown>
  const scope = value.scope
  const name = value.name
  const directory = value.directory
  if (typeof scope !== "string" || (scope !== "global" && scope !== "project")) {
    throw new Error("scope must be 'global' or 'project'")
  }
  if (typeof name !== "string" || !name.trim()) throw new Error("Agent name is required")
  if (scope === "project" && (typeof directory !== "string" || !directory.trim())) {
    throw new Error("Project directory is required when removing a project agent")
  }
  return {
    scope,
    name: name.trim(),
    ...(scope === "project" && typeof directory === "string" && directory.trim()
      ? { directory: directory.trim() }
      : {}),
  }
}