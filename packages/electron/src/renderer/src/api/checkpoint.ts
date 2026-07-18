import { apiFetchJson } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'

function checkpointPath(path: string, directory?: string) {
  const formatted = formatPathForApi(directory)
  if (!formatted) return path
  return `${path}?${new URLSearchParams({ directory: formatted }).toString()}`
}

export interface WorkspaceCheckpoint {
  id: string
  snapshot: string
  sessionID: string
  directory: string
  label: string
  createdAt: number
}

export async function listWorkspaceCheckpoints(sessionID: string, directory?: string) {
  const formatted = formatPathForApi(directory)
  const params = new URLSearchParams({ sessionID })
  if (formatted) params.set('directory', formatted)
  return apiFetchJson<WorkspaceCheckpoint[]>(`/experimental/checkpoint?${params.toString()}`)
}

export async function createWorkspaceCheckpoint(sessionID: string, label: string, directory?: string) {
  return apiFetchJson<WorkspaceCheckpoint>(checkpointPath('/experimental/checkpoint', directory), {
    method: 'POST',
    body: JSON.stringify({ sessionID, label }),
  })
}

export async function restoreWorkspaceCheckpoint(id: string, directory?: string) {
  return apiFetchJson<{ backupID: string }>(checkpointPath('/experimental/checkpoint/restore', directory), {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function deleteWorkspaceCheckpoint(id: string, directory?: string) {
  return apiFetchJson<boolean>(checkpointPath(`/experimental/checkpoint/${encodeURIComponent(id)}`, directory), { method: 'DELETE' })
}

export async function getWorkspaceCheckpointDiff(id: string, directory?: string) {
  return apiFetchJson<string>(checkpointPath(`/experimental/checkpoint/${encodeURIComponent(id)}/diff`, directory))
}
