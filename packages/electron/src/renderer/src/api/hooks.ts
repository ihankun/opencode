import { apiFetchJson } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'

export type HookEvent = 'automation.before' | 'automation.after' | 'git.before' | 'git.after' | 'notification'
export interface HookDefinition { id: string; name: string; event: HookEvent; command: string; enabled: boolean; approved: boolean; sandbox: boolean; timeoutSeconds: number }
export interface HookRun { id: string; hookID: string; hookName: string; event: HookEvent; status: 'completed' | 'failed' | 'timed_out' | 'blocked'; sandboxed: boolean; output: string; startedAt: number; completedAt: number }
export interface HookState { hooks: HookDefinition[]; runs: HookRun[] }

function hooksPath(path: string, directory?: string) {
  const formatted = formatPathForApi(directory)
  return formatted ? `${path}?${new URLSearchParams({ directory: formatted }).toString()}` : path
}

export function getHooks(directory?: string) {
  return apiFetchJson<HookState>(hooksPath('/experimental/hooks', directory))
}

export function updateHooks(hooks: HookDefinition[], directory?: string) {
  return apiFetchJson<HookState>(hooksPath('/experimental/hooks', directory), { method: 'PUT', body: JSON.stringify({ hooks }) })
}

export function runHooks(event: HookEvent, directory?: string) {
  return apiFetchJson<HookRun[]>(hooksPath('/experimental/hooks/run', directory), { method: 'POST', body: JSON.stringify({ event }) })
}
