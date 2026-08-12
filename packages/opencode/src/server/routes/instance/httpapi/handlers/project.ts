import * as InstanceState from "@/effect/instance-state"
import { Project } from "@/project/project"
import { ProjectV2 } from "@opencode-ai/core/project"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Git } from "@/git"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import path from "path"
import { InstanceHttpApi } from "../api"
import { ProjectNotFoundError } from "../errors"
import { markInstanceForReload } from "../lifecycle"

export const projectHandlers = HttpApiBuilder.group(InstanceHttpApi, "project", (handlers) =>
  Effect.gen(function* () {
    const svc = yield* Project.Service
    const project = yield* ProjectV2.Service

    const list = Effect.fn("ProjectHttpApi.list")(function* () {
      return yield* svc.list()
    })

    const current = Effect.fn("ProjectHttpApi.current")(function* () {
      return (yield* InstanceState.context).project
    })

    const initGit = Effect.fn("ProjectHttpApi.initGit")(function* () {
      const ctx = yield* InstanceState.context
      const next = yield* svc.initGit({ directory: ctx.directory, project: ctx.project })
      if (next.id === ctx.project.id && next.vcs === ctx.project.vcs && next.worktree === ctx.project.worktree)
        return next
      yield* markInstanceForReload(ctx, {
        directory: ctx.directory,
        worktree: ctx.directory,
        project: next,
      })
      return next
    })

    const update = Effect.fn("ProjectHttpApi.update")(function* (ctx: {
      params: { projectID: ProjectV2.ID }
      payload: Project.UpdatePayload
    }) {
      return yield* svc.update({ ...ctx.payload, projectID: ctx.params.projectID }).pipe(
        Effect.catchTag("Project.NotFoundError", (error) =>
          Effect.fail(
            new ProjectNotFoundError({
              projectID: error.projectID,
              message: `Project not found: ${error.projectID}`,
            }),
          ),
        ),
      )
    })

    const directories = Effect.fn("ProjectHttpApi.directories")((ctx: { params: { projectID: ProjectV2.ID } }) =>
      project.directories({ projectID: ctx.params.projectID }),
    )

    const subrepos = Effect.fn("ProjectHttpApi.subrepos")(function* () {
      const ctx = yield* InstanceState.context
      if (ctx.project.vcs === "git") return { directory: ctx.directory, repos: [] }

      const fs = yield* FSUtil.Service
      const git = yield* Git.Service
      const rootReal = yield* fs.resolve(ctx.directory).pipe(Effect.catch(() => Effect.succeed(ctx.directory)))
      const entries = yield* fs.readDirectoryEntries(ctx.directory).pipe(Effect.catch(() => Effect.succeed([])))
      const discovered = yield* Effect.forEach(
        entries.filter((entry) => entry.type === "directory"),
        (entry) =>
          Effect.gen(function* () {
            const sub = path.join(ctx.directory, entry.name)
            const dotgit = yield* fs.existsSafe(path.join(sub, ".git"))
            if (!dotgit) return undefined
            const result = yield* git.run(["rev-parse", "--show-toplevel"], { cwd: sub })
            if (result.exitCode !== 0) return undefined
            const worktree = result.text().trim()
            if (!worktree || !FSUtil.contains(rootReal, worktree)) return undefined
            return { worktree }
          }),
        { concurrency: "unbounded" },
      )
      return {
        directory: ctx.directory,
        repos: discovered.filter((repo): repo is { worktree: string } => repo !== undefined),
      }
    })

    return handlers
      .handle("list", list)
      .handle("current", current)
      .handle("initGit", initGit)
      .handle("update", update)
      .handle("directories", directories)
      .handle("subrepos", subrepos)
  }),
)
