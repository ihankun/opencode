import { apiFetchJson } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'

function checkpointPath(path: string, directory?: string) {
  const formatted = formatPathForApi(directory)
  if (!formatted) return path
  return `${path}?${new URLSearchParams({ directory: formatted }).toString()}`
}

export async function createWorkspaceCheckpoint(directory?: string) {
  return apiFetchJson<{ snapshot: string }>(checkpointPath('/experimental/checkpoint', directory), {
    method: 'POST',
    body: '{}',
  })
}

export async function restoreWorkspaceCheckpoint(snapshot: string, directory?: string) {
  return apiFetchJson<boolean>(checkpointPath('/experimental/checkpoint/restore', directory), {
    method: 'POST',
    body: JSON.stringify({ snapshot }),
  })
}
