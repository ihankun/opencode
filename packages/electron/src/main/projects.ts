import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import {
  emptyProjectState,
  normalizeProjectState,
  normalizeProjectsFile,
  type ProjectState,
  type ProjectsFile,
} from "../shared/projects.ts"

export class ProjectsStore {
  private writes: Promise<void> = Promise.resolve()

  constructor(private readonly file: string) {}

  async get(serverId: string) {
    await this.writes
    return cloneProjectState((await this.read()).servers[requireServerId(serverId)] ?? emptyProjectState())
  }

  setDirectories(serverId: string, directories: unknown) {
    return this.update(serverId, state => ({
      ...state,
      directories: normalizeProjectState({ directories }).directories,
    }))
  }

  setRecentProjects(serverId: string, recentProjects: unknown) {
    return this.update(serverId, state => ({
      ...state,
      recentProjects: normalizeProjectState({ recentProjects }).recentProjects,
    }))
  }

  private update(serverId: string, update: (state: ProjectState) => ProjectState) {
    const operation = this.writes.then(async () => {
      const projects = await this.read()
      const id = requireServerId(serverId)
      const state = normalizeProjectState(update(projects.servers[id] ?? emptyProjectState()))
      await this.write({
        ...projects,
        servers: {
          ...projects.servers,
          [id]: state,
        },
      })
      return cloneProjectState(state)
    })
    this.writes = operation.then(() => undefined, () => undefined)
    return operation
  }

  private read() {
    return readFile(this.file, "utf8")
      .then(content => normalizeProjectsFile(JSON.parse(content)))
      .catch(() => normalizeProjectsFile(undefined))
  }

  private async write(projects: ProjectsFile) {
    await mkdir(dirname(this.file), { recursive: true })
    const temporary = `${this.file}.${process.pid}.tmp`
    await writeFile(temporary, `${JSON.stringify(projects, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary, this.file)
  }
}

function requireServerId(value: string) {
  const serverId = value.trim()
  if (!serverId) throw new Error("Project server ID is required")
  return serverId
}

function cloneProjectState(state: ProjectState): ProjectState {
  return {
    directories: state.directories.map(directory => ({ ...directory })),
    recentProjects: { ...state.recentProjects },
  }
}
