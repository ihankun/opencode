export type ProjectDirectory = {
  path: string
  name: string
  addedAt: number
  pinnedAt?: number
}

export type ProjectState = {
  directories: ProjectDirectory[]
  recentProjects: Record<string, number>
}

export type ProjectsFile = {
  version: 1
  servers: Record<string, ProjectState>
}

export function emptyProjectState(): ProjectState {
  return {
    directories: [],
    recentProjects: {},
  }
}

export function normalizeProjectState(value: unknown): ProjectState {
  if (!isRecord(value)) return emptyProjectState()

  return {
    directories: Array.isArray(value.directories)
      ? value.directories.flatMap((item): ProjectDirectory[] => {
          if (!isRecord(item) || typeof item.path !== "string" || !item.path) return []
          return [{
            path: item.path,
            name: typeof item.name === "string" && item.name ? item.name : item.path,
            addedAt: finiteNumber(item.addedAt) ?? Date.now(),
            pinnedAt: finiteNumber(item.pinnedAt),
          }]
        })
      : [],
    recentProjects: isRecord(value.recentProjects)
      ? Object.fromEntries(
          Object.entries(value.recentProjects).flatMap(([path, timestamp]) => {
            const value = finiteNumber(timestamp)
            return value === undefined ? [] : [[path, value]]
          }),
        )
      : {},
  }
}

export function normalizeProjectsFile(value: unknown): ProjectsFile {
  if (!isRecord(value) || !isRecord(value.servers)) {
    return { version: 1, servers: {} }
  }

  return {
    version: 1,
    servers: Object.fromEntries(
      Object.entries(value.servers).map(([serverId, state]) => [serverId, normalizeProjectState(state)]),
    ),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
