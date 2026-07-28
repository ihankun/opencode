import { apiFetchJson } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'

export type MemorySourceID = 'global' | 'project' | 'workspace'
export interface MemorySource {
  id: MemorySourceID
  name: string
  path: string
  scope: MemorySourceID
  exists: boolean
  content: string
}

function memoryPath(path: string, directory?: string) {
  const formatted = formatPathForApi(directory)
  return formatted ? `${path}?${new URLSearchParams({ directory: formatted }).toString()}` : path
}

export function getMemorySource(id: MemorySourceID, directory?: string) {
  return apiFetchJson<MemorySource>(memoryPath(`/experimental/memory/${id}`, directory))
}

export function updateMemorySource(id: MemorySourceID, content: string, directory?: string) {
  return apiFetchJson<MemorySource>(memoryPath(`/experimental/memory/${id}`, directory), {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })
}

export function captureMemory(content: string, directory?: string) {
  return apiFetchJson<MemorySource>(memoryPath('/experimental/memory/capture', directory), {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}
