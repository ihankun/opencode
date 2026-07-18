export type ExecutionMode = 'current' | 'worktree'

export type ExecutionTarget = {
  serverId: string
  directory: string
  sourceDirectory?: string
  projectId?: string
  executionMode: ExecutionMode
  branch?: string
  worktreeId?: string
  permissionProfile?: string
}

export function executionTargetSessionKey(serverId: string, sessionId: string) {
  return `${encodeURIComponent(serverId)}:${encodeURIComponent(sessionId)}`
}
