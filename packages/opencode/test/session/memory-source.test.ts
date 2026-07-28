import { describe, expect, test } from "bun:test"
import path from "path"
import { memorySourceDefinitions } from "../../src/session/memory-source"

describe("memorySourceDefinitions", () => {
  test("resolves every managed source from the same context", () => {
    const sources = memorySourceDefinitions({
      globalConfig: path.join(path.sep, "global-config"),
      directory: path.join(path.sep, "project", "sandbox"),
      worktree: path.join(path.sep, "project"),
    })

    expect(sources).toEqual([
      {
        id: "global",
        name: "Global memory",
        path: path.join(path.sep, "global-config", "memory.md"),
        scope: "global",
      },
      {
        id: "project",
        name: "Project instructions",
        path: path.join(path.sep, "project", "AGENTS.md"),
        scope: "project",
      },
      {
        id: "workspace",
        name: "Workspace memory",
        path: path.join(path.sep, "project", "sandbox", ".opencode", "memory.md"),
        scope: "workspace",
      },
    ])
  })

  test("uses the active directory for project instructions outside a Git project", () => {
    const sources = memorySourceDefinitions({
      globalConfig: path.join(path.sep, "global-config"),
      directory: path.join(path.sep, "plain-project"),
      worktree: path.parse(path.resolve(path.sep)).root,
    })

    expect(sources.find((source) => source.id === "project")?.path).toBe(
      path.join(path.sep, "plain-project", "AGENTS.md"),
    )
  })
})
