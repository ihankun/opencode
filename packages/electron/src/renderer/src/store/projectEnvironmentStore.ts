import { useSyncExternalStore } from 'react'

export interface ProjectEnvironmentSnapshot {
  id: string
  directory: string
  profileUpdatedAt: number
  serverId?: string
  branch?: string
  dirtyFiles: number
  setupCommands: string[]
  createdAt: number
}

const STORAGE_KEY = 'opencodex:project-environment-snapshots'

class ProjectEnvironmentStore {
  private snapshots = load()
  private listeners = new Set<() => void>()
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  snapshot = () => this.snapshots
  list(directory?: string) { return this.snapshots.filter(item => !directory || normalize(item.directory) === normalize(directory)).toSorted((left, right) => right.createdAt - left.createdAt) }
  isCurrent(directory: string, profileUpdatedAt: number, serverId?: string) { return this.snapshots.some(item => normalize(item.directory) === normalize(directory) && item.profileUpdatedAt === profileUpdatedAt && item.serverId === serverId) }
  capture(snapshot: Omit<ProjectEnvironmentSnapshot, 'id' | 'createdAt'>) {
    this.snapshots = [{ ...snapshot, id: crypto.randomUUID(), createdAt: Date.now() }, ...this.snapshots].slice(0, 100)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshots))
    this.listeners.forEach(listener => listener())
  }
}

function normalize(value: string) { return value.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() }
function load(): ProjectEnvironmentSnapshot[] {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); return Array.isArray(value) ? value.filter(item => item && typeof item.directory === 'string') : [] } catch { return [] }
}

export const projectEnvironmentStore = new ProjectEnvironmentStore()
export function useProjectEnvironmentSnapshots() { return useSyncExternalStore(projectEnvironmentStore.subscribe, projectEnvironmentStore.snapshot, projectEnvironmentStore.snapshot) }
