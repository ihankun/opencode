import { useSyncExternalStore } from 'react'

export type ProjectProfile = {
  directory: string
  defaultServerId?: string
  defaultAgent?: string
  defaultModelKey?: string
  defaultBranch?: string
  executionMode: 'current' | 'worktree'
  permissionProfile?: string
  sandboxProfile?: string
  setupCommands: string[]
  enabledSkills: string[]
  enabledMcp: string[]
  updatedAt: number
}

const STORAGE_KEY = 'opencodex-project-profiles'

class ProjectProfileStore {
  private profiles = readProfiles()
  private listeners = new Set<() => void>()

  get(directory?: string) {
    if (!directory) return
    return this.profiles[normalizeProjectDirectory(directory)]
  }

  list() {
    return Object.values(this.profiles).toSorted((left, right) => right.updatedAt - left.updatedAt)
  }

  save(profile: Omit<ProjectProfile, 'updatedAt'>) {
    this.profiles = { ...this.profiles, [normalizeProjectDirectory(profile.directory)]: { ...profile, updatedAt: Date.now() } }
    this.persist()
  }

  remove(directory: string) {
    const profiles = { ...this.profiles }
    delete profiles[normalizeProjectDirectory(directory)]
    this.profiles = profiles
    this.persist()
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  snapshot = () => this.profiles

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, profiles: this.profiles }))
    this.listeners.forEach(listener => listener())
  }
}

export function normalizeProjectDirectory(directory: string) {
  return directory.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

function readProfiles(): Record<string, ProjectProfile> {
  try {
    return parseProjectProfiles(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return {}
  }
}

export function parseProjectProfiles(raw: unknown): Record<string, ProjectProfile> {
  if (!raw || typeof raw !== 'object' || !('profiles' in raw) || !raw.profiles || typeof raw.profiles !== 'object') return {}
  return Object.entries(raw.profiles).reduce<Record<string, ProjectProfile>>((result, [key, value]) => {
      if (!value || typeof value !== 'object') return result
      const profile = value as Partial<ProjectProfile>
      if (typeof profile.directory !== 'string') return result
      result[key] = {
        directory: profile.directory,
        defaultServerId: typeof profile.defaultServerId === 'string' ? profile.defaultServerId : undefined,
        defaultAgent: typeof profile.defaultAgent === 'string' ? profile.defaultAgent : undefined,
        defaultModelKey: typeof profile.defaultModelKey === 'string' ? profile.defaultModelKey : undefined,
        defaultBranch: typeof profile.defaultBranch === 'string' ? profile.defaultBranch : undefined,
        executionMode: profile.executionMode === 'worktree' ? 'worktree' : 'current',
        permissionProfile: typeof profile.permissionProfile === 'string' ? profile.permissionProfile : undefined,
        sandboxProfile: typeof profile.sandboxProfile === 'string' ? profile.sandboxProfile : undefined,
        setupCommands: Array.isArray(profile.setupCommands) ? profile.setupCommands.filter((item): item is string => typeof item === 'string') : [],
        enabledSkills: Array.isArray(profile.enabledSkills) ? profile.enabledSkills.filter((item): item is string => typeof item === 'string') : [],
        enabledMcp: Array.isArray(profile.enabledMcp) ? profile.enabledMcp.filter((item): item is string => typeof item === 'string') : [],
        updatedAt: typeof profile.updatedAt === 'number' ? profile.updatedAt : 0,
      }
      return result
  }, {})
}

export const projectProfileStore = new ProjectProfileStore()

export function useProjectProfiles() {
  return useSyncExternalStore(projectProfileStore.subscribe, projectProfileStore.snapshot, projectProfileStore.snapshot)
}
