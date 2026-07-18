import { executionTargetSessionKey } from '../types/executionTarget'
import type { ExecutionTarget } from '../types/executionTarget'

type PersistedExecutionTargets = {
  version: 1
  drafts: Record<string, ExecutionTarget>
  sessions: Record<string, ExecutionTarget>
}

const STORAGE_KEY = 'opencodex-execution-targets'

class ExecutionTargetStore {
  private state = readState()

  getDraft(paneId: string): ExecutionTarget | undefined {
    return this.state.drafts[paneId]
  }

  resolveDraft(paneId: string, fallback: ExecutionTarget): ExecutionTarget {
    const draft = this.getDraft(paneId)
    if (!draft) return fallback
    if (draft.serverId !== fallback.serverId || draft.directory !== fallback.directory) return fallback
    return draft
  }

  updateDraft(paneId: string, target: ExecutionTarget) {
    if (sameTarget(this.state.drafts[paneId], target)) return
    this.state = { ...this.state, drafts: { ...this.state.drafts, [paneId]: target } }
    this.persist()
  }

  clearDraft(paneId: string) {
    if (!this.state.drafts[paneId]) return
    const drafts = { ...this.state.drafts }
    delete drafts[paneId]
    this.state = { ...this.state, drafts }
    this.persist()
  }

  bindSession(sessionId: string, target: ExecutionTarget) {
    const key = executionTargetSessionKey(target.serverId, sessionId)
    this.state = { ...this.state, sessions: { ...this.state.sessions, [key]: target } }
    this.persist()
  }

  getSession(serverId: string, sessionId: string): ExecutionTarget | undefined {
    return this.state.sessions[executionTargetSessionKey(serverId, sessionId)]
  }

  removeSession(serverId: string, sessionId: string) {
    const key = executionTargetSessionKey(serverId, sessionId)
    if (!this.state.sessions[key]) return
    const sessions = { ...this.state.sessions }
    delete sessions[key]
    this.state = { ...this.state, sessions }
    this.persist()
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
  }
}

function sameTarget(left: ExecutionTarget | undefined, right: ExecutionTarget) {
  return !!left &&
    left.serverId === right.serverId &&
    left.directory === right.directory &&
    left.sourceDirectory === right.sourceDirectory &&
    left.projectId === right.projectId &&
    left.executionMode === right.executionMode &&
    left.branch === right.branch &&
    left.worktreeId === right.worktreeId &&
    left.permissionProfile === right.permissionProfile
}

function readState(): PersistedExecutionTargets {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown
    if (!parsed || typeof parsed !== 'object') return emptyState()
    const value = parsed as Partial<PersistedExecutionTargets>
    return {
      version: 1,
      drafts: normalizeTargets(value.drafts),
      sessions: normalizeTargets(value.sessions),
    }
  } catch {
    return emptyState()
  }
}

function emptyState(): PersistedExecutionTargets {
  return { version: 1, drafts: {}, sessions: {} }
}

function normalizeTargets(value: unknown): Record<string, ExecutionTarget> {
  if (!value || typeof value !== 'object') return {}
  return Object.entries(value).reduce<Record<string, ExecutionTarget>>((result, [key, target]) => {
    if (!target || typeof target !== 'object') return result
    const item = target as Partial<ExecutionTarget>
    if (typeof item.serverId !== 'string' || typeof item.directory !== 'string') return result
    if (item.executionMode !== 'current' && item.executionMode !== 'worktree') return result
    result[key] = {
      serverId: item.serverId,
      directory: item.directory,
      sourceDirectory: typeof item.sourceDirectory === 'string' ? item.sourceDirectory : undefined,
      executionMode: item.executionMode,
      projectId: typeof item.projectId === 'string' ? item.projectId : undefined,
      branch: typeof item.branch === 'string' ? item.branch : undefined,
      worktreeId: typeof item.worktreeId === 'string' ? item.worktreeId : undefined,
      permissionProfile: typeof item.permissionProfile === 'string' ? item.permissionProfile : undefined,
    }
    return result
  }, {})
}

export const executionTargetStore = new ExecutionTargetStore()
