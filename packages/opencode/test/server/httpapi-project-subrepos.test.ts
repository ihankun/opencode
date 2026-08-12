import { afterEach, describe, expect } from "bun:test"
import path from "path"
import { mkdir } from "node:fs/promises"
import { Server } from "../../src/server/server"
import { Effect } from "effect"
import { resetDatabase } from "../fixture/db"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"
import { it } from "../lib/effect"

function app() {
  return Server.Default().app
}

const tmpdirEffect = (options: Parameters<typeof tmpdir>[0]) =>
  Effect.acquireRelease(
    Effect.promise(() => tmpdir(options)),
    (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
  )

async function initGitRepo(repoDir: string) {
  const { $ } = await import("bun")
  await mkdir(repoDir, { recursive: true })
  await $`git init --quiet`.cwd(repoDir)
  await $`git config user.email test@opencode.test`.cwd(repoDir)
  await $`git config user.name Test`.cwd(repoDir)
  await Bun.write(path.join(repoDir, "README.md"), "readme")
  await $`git add -A`.cwd(repoDir)
  await $`git commit -m init --quiet`.cwd(repoDir)
}

afterEach(async () => {
  await disposeAllInstances()
  await resetDatabase()
})

describe("project subrepos HttpApi", () => {
  it.live(
    "discovers git repositories inside subdirectories of a non-git directory",
    Effect.gen(function* () {
      const tmp = yield* tmpdirEffect({
        init: async (dir) => {
          for (const repo of ["frontend", "backend", "mobile"]) {
            await initGitRepo(path.join(dir, repo))
          }
          await mkdir(path.join(dir, "plain"), { recursive: true })
        },
      })

      const response = yield* Effect.promise(() =>
        Promise.resolve(
          app().request("/project/subrepos", {
            headers: {
              "x-opencode-directory": tmp.path,
            },
          }),
        ),
      )

      expect(response.status).toBe(200)
      const data = (yield* Effect.promise(() => response.json())) as { directory: string; repos: { worktree: string }[] }
      expect(data.repos.map((repo) => path.basename(repo.worktree)).sort()).toEqual(["backend", "frontend", "mobile"])
    }),
  )

  it.live(
    "returns an empty list when the directory itself is a git repository",
    Effect.gen(function* () {
      const tmp = yield* tmpdirEffect({
        git: true,
        init: async (dir) => {
          await initGitRepo(path.join(dir, "frontend"))
        },
      })

      const response = yield* Effect.promise(() =>
        Promise.resolve(
          app().request("/project/subrepos", {
            headers: {
              "x-opencode-directory": tmp.path,
            },
          }),
        ),
      )

      expect(response.status).toBe(200)
      const data = (yield* Effect.promise(() => response.json())) as { directory: string; repos: { worktree: string }[] }
      expect(data.repos).toEqual([])
    }),
  )

  it.live(
    "returns an empty list when no subdirectory is a git repository",
    Effect.gen(function* () {
      const tmp = yield* tmpdirEffect({
        init: async (dir) => {
          await mkdir(path.join(dir, "plain"), { recursive: true })
        },
      })

      const response = yield* Effect.promise(() =>
        Promise.resolve(
          app().request("/project/subrepos", {
            headers: {
              "x-opencode-directory": tmp.path,
            },
          }),
        ),
      )

      expect(response.status).toBe(200)
      const data = (yield* Effect.promise(() => response.json())) as { directory: string; repos: { worktree: string }[] }
      expect(data.repos).toEqual([])
    }),
  )
})
