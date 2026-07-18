import { serverStore } from './serverStore'

export interface WorkspaceCheckpoint {
  id: string
  serverId: string
  sessionId: string
  directory: string
  snapshot: string
  label: string
  createdAt: number
}

const STORAGE_KEY = 'opencodex-workspace-checkpoints'
const MAX_PER_SESSION = 20

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is WorkspaceCheckpoint =>
      !!item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.serverId === 'string' &&
      typeof item.sessionId === 'string' &&
      typeof item.directory === 'string' &&
      typeof item.snapshot === 'string' &&
      typeof item.label === 'string' &&
      typeof item.createdAt === 'number',
    )
  } catch {
    return []
  }
}

function write(entries: WorkspaceCheckpoint[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export const checkpointStore = {
  list(sessionId: string) {
    const serverId = serverStore.getActiveServerId()
    return read()
      .filter(entry => entry.serverId === serverId && entry.sessionId === sessionId)
      .sort((left, right) => right.createdAt - left.createdAt)
  },
  add(input: Omit<WorkspaceCheckpoint, 'id' | 'serverId' | 'createdAt'>) {
    const entry: WorkspaceCheckpoint = {
      ...input,
      id: crypto.randomUUID(),
      serverId: serverStore.getActiveServerId(),
      createdAt: Date.now(),
    }
    const entries = read()
    const matching = entries.filter(item => item.serverId === entry.serverId && item.sessionId === entry.sessionId)
    const remove = new Set(matching.sort((left, right) => right.createdAt - left.createdAt).slice(MAX_PER_SESSION - 1).map(item => item.id))
    write([entry, ...entries.filter(item => !remove.has(item.id))])
    return entry
  },
  remove(id: string) {
    write(read().filter(entry => entry.id !== id))
  },
}
