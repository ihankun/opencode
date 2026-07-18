import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { Effect, Layer, Context, Schema, Scope } from "effect"
import { formatPatch, structuredPatch } from "diff"
import { InstanceState } from "@/effect/instance-state"
import { Watcher } from "@opencode-ai/core/filesystem/watcher"
import { Git } from "@/git"
import { EventV2Bridge } from "@/event-v2-bridge"
import { EventV2 } from "@opencode-ai/core/event"
import { VcsEvent } from "@opencode-ai/schema/vcs-event"

const PATCH_CONTEXT_LINES = 2_147_483_647
const MAX_PATCH_BYTES = 10_000_000
const MAX_TOTAL_PATCH_BYTES = 10_000_000
type DiffOptions = {
  readonly context?: number
}

const emptyPatch = (file: string) => formatPatch(structuredPatch(file, file, "", "", "", "", { context: 0 }))

const nums = (list: Git.Stat[]) =>
  new Map(list.map((item) => [item.file, { additions: item.additions, deletions: item.deletions }] as const))

const merge = (...lists: Git.Item[][]) => {
  const out = new Map<string, Git.Item>()
  lists.flat().forEach((item) => {
    if (!out.has(item.file)) out.set(item.file, item)
  })
  return [...out.values()]
}

const emptyBatch = () => ({ patches: new Map<string, string>(), capped: false })

const parseQuotedPath = (value: string) => {
  let out = ""
  for (let idx = 1; idx < value.length; idx++) {
    const char = value[idx]
    if (char === '"') return { value: out, end: idx + 1 }
    if (char !== "\\") {
      out += char
      continue
    }

    const next = value[++idx]
    if (next === "t") out += "\t"
    else if (next === "n") out += "\n"
    else if (next === "r") out += "\r"
    else if (next === '"' || next === "\\") out += next
    else out += next ?? ""
  }
}

const parsePathToken = (value: string) => {
  if (!value.startsWith('"')) return value.split("\t")[0]
  return parseQuotedPath(value)?.value ?? value
}

const fileFromDiffPath = (value: string | undefined) => {
  if (!value || value === "/dev/null") return
  const file = parsePathToken(value)
  if (file.startsWith("a/") || file.startsWith("b/")) return file.slice(2)
  return file
}

const fileFromGitHeader = (header: string) => {
  if (header.startsWith('"')) {
    const first = parseQuotedPath(header)
    const second = first ? header.slice(first.end).trimStart() : undefined
    if (!second) return
    if (!second.startsWith('"')) return fileFromDiffPath(second)
    return fileFromDiffPath(parseQuotedPath(second)?.value)
  }

  const separator = header.indexOf(" b/")
  if (separator === -1) return
  return fileFromDiffPath(header.slice(separator + 1))
}

const fileFromPatchChunk = (chunk: string) => {
  const next = /^\+\+\+ (.+)$/m.exec(chunk)?.[1]
  const before = /^--- (.+)$/m.exec(chunk)?.[1]
  const file = fileFromDiffPath(next) ?? fileFromDiffPath(before)
  if (file) return file

  const header = /^diff --git (.+)$/m.exec(chunk)?.[1]
  return fileFromGitHeader(header ?? "")
}

const splitGitPatch = (patch: Git.Patch) => {
  const starts = [...patch.text.matchAll(/(?:^|\n)diff --git /g)].map((match) =>
    match[0].startsWith("\n") ? match.index + 1 : match.index,
  )
  const chunks = starts.map((start, index) => patch.text.slice(start, starts[index + 1] ?? patch.text.length))
  if (!patch.truncated) return chunks
  return chunks.slice(0, -1)
}

const batchPatches = Effect.fnUntraced(function* (
  git: Git.Interface,
  cwd: string,
  ref: string,
  list: Git.Item[],
  options?: DiffOptions,
) {
  if (list.length === 0) return { patches: new Map<string, string>(), capped: false }

  const result = yield* git.patchAll(cwd, ref, {
    context: options?.context ?? PATCH_CONTEXT_LINES,
    maxOutputBytes: MAX_TOTAL_PATCH_BYTES,
  })

  return {
    patches: splitGitPatch(result).reduce((acc, patch, index) => {
      const file = fileFromPatchChunk(patch) ?? list[index]?.file
      if (!file) return acc
      acc.set(file, (acc.get(file) ?? "") + patch)
      return acc
    }, new Map<string, string>()),
    capped: result.truncated,
  }
})

const nativePatch = Effect.fnUntraced(function* (
  git: Git.Interface,
  cwd: string,
  ref: string | undefined,
  item: Git.Item,
  options?: DiffOptions,
) {
  const result =
    item.code === "??" || !ref
      ? yield* git.patchUntracked(cwd, item.file, {
          context: options?.context ?? PATCH_CONTEXT_LINES,
          maxOutputBytes: MAX_PATCH_BYTES,
        })
      : yield* git.patch(cwd, ref, item.file, {
          context: options?.context ?? PATCH_CONTEXT_LINES,
          maxOutputBytes: MAX_PATCH_BYTES,
        })
  if (!result.truncated && result.text) return result.text

  return emptyPatch(item.file)
})

const totalPatch = (file: string, patch: string, total: number) => {
  if (total + Buffer.byteLength(patch) <= MAX_TOTAL_PATCH_BYTES) return { patch, capped: false }
  return { patch: emptyPatch(file), capped: true }
}

const patchForItem = Effect.fnUntraced(function* (
  git: Git.Interface,
  cwd: string,
  ref: string | undefined,
  item: Git.Item,
  batch: { patches: Map<string, string>; capped: boolean },
  capped: boolean,
  options?: DiffOptions,
) {
  if (capped) return emptyPatch(item.file)

  const batched = batch.patches.get(item.file)
  if (batched !== undefined) return batched
  if (item.code !== "??" && batch.capped) return emptyPatch(item.file)
  return yield* nativePatch(git, cwd, ref, item, options)
})

const files = Effect.fnUntraced(function* (
  git: Git.Interface,
  cwd: string,
  ref: string | undefined,
  list: Git.Item[],
  map: Map<string, { additions: number; deletions: number }>,
  batch: { patches: Map<string, string>; capped: boolean },
  options?: DiffOptions,
) {
  const next: FileDiff[] = []
  let total = 0
  let capped = false

  for (const item of list.toSorted((a, b) => a.file.localeCompare(b.file))) {
    const stat = map.get(item.file) ?? (item.status === "added" ? yield* git.statUntracked(cwd, item.file) : undefined)
    const patch = yield* patchForItem(git, cwd, ref, item, batch, capped, options)
    const result: { patch: string; capped: boolean } = capped
      ? { patch, capped: true }
      : totalPatch(item.file, patch, total)
    capped = capped || result.capped
    if (!capped) {
      total += Buffer.byteLength(result.patch)
      capped = total >= MAX_TOTAL_PATCH_BYTES
    }
    next.push({
      file: item.file,
      patch: result.patch,
      additions: stat?.additions ?? 0,
      deletions: stat?.deletions ?? 0,
      status: item.status,
    })
  }

  return next
})

const diffAgainstRef = Effect.fnUntraced(function* (
  git: Git.Interface,
  cwd: string,
  ref: string,
  options?: DiffOptions,
) {
  const [list, stats, extra] = yield* Effect.all([git.diff(cwd, ref), git.stats(cwd, ref), git.status(cwd)], {
    concurrency: 3,
  })
  return yield* files(
    git,
    cwd,
    ref,
    merge(
      list,
      extra.filter((item) => item.code === "??"),
    ),
    nums(stats),
    yield* batchPatches(git, cwd, ref, list, options),
    options,
  )
})

const track = Effect.fnUntraced(function* (
  git: Git.Interface,
  cwd: string,
  ref: string | undefined,
  options?: DiffOptions,
) {
  if (!ref) return yield* files(git, cwd, ref, yield* git.status(cwd), new Map(), emptyBatch(), options)
  return yield* diffAgainstRef(git, cwd, ref, options)
})

export const Mode = Schema.Literals(["git", "branch"])
export type Mode = Schema.Schema.Type<typeof Mode>

export const Event = VcsEvent

export const Info = Schema.Struct({
  branch: Schema.optional(Schema.String),
  default_branch: Schema.optional(Schema.String),
  remote_url: Schema.optional(Schema.String),
}).annotate({ identifier: "VcsInfo" })
export type Info = Schema.Schema.Type<typeof Info>

export const FileDiff = Schema.Struct({
  file: Schema.String,
  // Mirrors Snapshot.FileDiff (see #26574). The current producer always
  // populates patch, but loosening matches the sibling schema so a
  // future code path that omits it can't crash /instance/vcs/diff.
  patch: Schema.optional(Schema.String),
  additions: Schema.Finite,
  deletions: Schema.Finite,
  status: Schema.optional(Schema.Literals(["added", "deleted", "modified"])),
}).annotate({ identifier: "VcsFileDiff" })
export type FileDiff = Schema.Schema.Type<typeof FileDiff>

export const FileStatus = Schema.Struct({
  file: Schema.String,
  additions: Schema.Finite,
  deletions: Schema.Finite,
  status: Schema.Literals(["added", "deleted", "modified"]),
}).annotate({ identifier: "VcsFileStatus" })
export type FileStatus = Schema.Schema.Type<typeof FileStatus>

export const ApplyInput = Schema.Struct({
  patch: Schema.String,
})
export type ApplyInput = Schema.Schema.Type<typeof ApplyInput>

export const ApplyResult = Schema.Struct({
  applied: Schema.Boolean,
})
export type ApplyResult = Schema.Schema.Type<typeof ApplyResult>

export const FilesInput = Schema.Struct({
  files: Schema.Array(Schema.String),
})
export type FilesInput = Schema.Schema.Type<typeof FilesInput>

export const CommitInput = Schema.Struct({
  message: Schema.String,
})
export type CommitInput = Schema.Schema.Type<typeof CommitInput>

export const MutationResult = Schema.Struct({
  output: Schema.String,
})
export type MutationResult = Schema.Schema.Type<typeof MutationResult>

export const OperationInput = Schema.Struct({
  action: Schema.Literals(["fetch", "pull", "stash", "stash-pop", "create-branch", "merge", "merge-abort"]),
  argument: Schema.optional(Schema.String),
})
export type OperationInput = Schema.Schema.Type<typeof OperationInput>

export const HistoryItem = Schema.Struct({
  hash: Schema.String,
  shortHash: Schema.String,
  author: Schema.String,
  timestamp: Schema.Number,
  subject: Schema.String,
})
export type HistoryItem = Schema.Schema.Type<typeof HistoryItem>

export const Branch = Schema.Struct({
  name: Schema.String,
  current: Schema.Boolean,
})
export type Branch = Schema.Schema.Type<typeof Branch>

export const SwitchBranchInput = Schema.Struct({
  branch: Schema.String,
})
export type SwitchBranchInput = Schema.Schema.Type<typeof SwitchBranchInput>

export const SwitchBranchResult = Schema.Struct({
  branch: Schema.String,
})
export type SwitchBranchResult = Schema.Schema.Type<typeof SwitchBranchResult>

export class PatchApplyError extends Schema.TaggedErrorClass<PatchApplyError>()("VcsPatchApplyError", {
  message: Schema.String,
  reason: Schema.Literals(["non-git", "not-clean"]),
}) {}

export class BranchSwitchError extends Schema.TaggedErrorClass<BranchSwitchError>()("VcsBranchSwitchError", {
  message: Schema.String,
  reason: Schema.Literals(["non-git", "not-found", "conflict"]),
}) {}

export class MutationError extends Schema.TaggedErrorClass<MutationError>()("VcsMutationError", {
  message: Schema.String,
  reason: Schema.Literals(["non-git", "invalid-input", "conflict"]),
}) {}

export interface Interface {
  readonly init: () => Effect.Effect<void>
  readonly branch: () => Effect.Effect<string | undefined>
  readonly branches: () => Effect.Effect<Branch[]>
  readonly switchBranch: (input: SwitchBranchInput) => Effect.Effect<SwitchBranchResult, BranchSwitchError>
  readonly defaultBranch: () => Effect.Effect<string | undefined>
  readonly remoteUrl: () => Effect.Effect<string | undefined>
  readonly status: () => Effect.Effect<FileStatus[]>
  readonly diff: (mode: Mode, options?: DiffOptions) => Effect.Effect<FileDiff[]>
  readonly diffRaw: () => Effect.Effect<string>
  readonly apply: (input: ApplyInput) => Effect.Effect<ApplyResult, PatchApplyError>
  readonly stage: (input: FilesInput) => Effect.Effect<MutationResult, MutationError>
  readonly unstage: (input: FilesInput) => Effect.Effect<MutationResult, MutationError>
  readonly discard: (input: FilesInput) => Effect.Effect<MutationResult, MutationError>
  readonly commit: (input: CommitInput) => Effect.Effect<MutationResult, MutationError>
  readonly push: () => Effect.Effect<MutationResult, MutationError>
  readonly operation: (input: OperationInput) => Effect.Effect<MutationResult, MutationError>
  readonly history: (limit: number) => Effect.Effect<HistoryItem[], MutationError>
}

interface State {
  current: string | undefined
  root: Git.Base | undefined
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Vcs") {}

const layer: Layer.Layer<Service, never, Git.Service | EventV2Bridge.Service> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const git = yield* Git.Service
    const events = yield* EventV2Bridge.Service
    const scope = yield* Scope.Scope

    const state = yield* InstanceState.make<State>(
      Effect.fn("Vcs.state")(function* (ctx) {
        if (ctx.project.vcs !== "git") {
          return { current: undefined, root: undefined }
        }

        const get = Effect.fnUntraced(function* () {
          return yield* git.branch(ctx.directory)
        })
        const [current, root] = yield* Effect.all([git.branch(ctx.directory), git.defaultBranch(ctx.directory)], {
          concurrency: 2,
        })
        const value = { current, root }

        const unsubscribe = yield* events.listen((event) => {
          if (event.type !== Watcher.Event.Updated.type || event.location?.directory !== ctx.directory)
            return Effect.void
          const data = event.data as EventV2.Data<typeof Watcher.Event.Updated>
          if (!data.file.endsWith("HEAD")) return Effect.void
          return Effect.gen(function* () {
            const next = yield* get()
            if (next !== value.current) {
              value.current = next
              yield* events.publish(Event.BranchUpdated, { branch: next })
            }
          })
        })
        yield* Effect.addFinalizer(() => unsubscribe)

        return value
      }),
    )

    const context = Effect.fnUntraced(function* () {
      const ctx = yield* InstanceState.context
      if (ctx.project.vcs === "git") return ctx
      return yield* new MutationError({
        message: "Git operation can't run because the project is not git-based",
        reason: "non-git",
      })
    })

    const pathspecs = Effect.fnUntraced(function* (input: FilesInput) {
      const ctx = yield* context()
      const changed = new Set((yield* git.status(ctx.directory)).map((item) => item.file))
      const files = [...new Set(input.files.map((file) => file.trim()))]
      if (files.length === 0 || files.some((file) => !file || !changed.has(file))) {
        return yield* new MutationError({
          message: "Select one or more changed files from the current working tree",
          reason: "invalid-input",
        })
      }
      return { ctx, files: files.map((file) => `:(literal)${file}`) }
    })

    const result = Effect.fnUntraced(function* (command: Git.Result, fallback: string) {
      const output = [command.stdout.toString("utf8"), command.stderr.toString("utf8")]
        .map((value) => value.trim())
        .filter(Boolean)
        .join("\n")
      if (command.exitCode === 0) return { output }
      return yield* new MutationError({
        message: output || fallback,
        reason: "conflict",
      })
    })

    return Service.of({
      init: Effect.fn("Vcs.init")(function* () {
        yield* InstanceState.get(state).pipe(Effect.forkIn(scope))
      }),
      branch: Effect.fn("Vcs.branch")(function* () {
        return yield* InstanceState.use(state, (x) => x.current)
      }),
      branches: Effect.fn("Vcs.branches")(function* () {
        const ctx = yield* InstanceState.context
        if (ctx.project.vcs !== "git") return []
        const current = yield* InstanceState.use(state, (value) => value.current)
        return (yield* git.branches(ctx.directory)).map((name) => ({ name, current: name === current }))
      }),
      switchBranch: Effect.fn("Vcs.switchBranch")(function* (input: SwitchBranchInput) {
        const ctx = yield* InstanceState.context
        if (ctx.project.vcs !== "git") {
          return yield* new BranchSwitchError({
            message: "Branch can't be switched because the project is not git-based",
            reason: "non-git",
          })
        }

        const branches = yield* git.branches(ctx.directory)
        if (!branches.includes(input.branch)) {
          return yield* new BranchSwitchError({
            message: `Branch not found: ${input.branch}`,
            reason: "not-found",
          })
        }

        const value = yield* InstanceState.get(state)
        if (value.current === input.branch) return { branch: input.branch }

        const result = yield* git.switchBranch(ctx.directory, input.branch)
        if (result.exitCode !== 0) {
          return yield* new BranchSwitchError({
            message: result.stderr.toString("utf8").trim() || `Failed to switch to branch ${input.branch}`,
            reason: "conflict",
          })
        }

        value.current = input.branch
        yield* events.publish(Event.BranchUpdated, { branch: input.branch })
        return { branch: input.branch }
      }),
      defaultBranch: Effect.fn("Vcs.defaultBranch")(function* () {
        return yield* InstanceState.use(state, (x) => x.root?.name)
      }),
      remoteUrl: Effect.fn("Vcs.remoteUrl")(function* () {
        const ctx = yield* InstanceState.context
        if (ctx.project.vcs !== "git") return
        const remotes = (yield* git.run(["remote"], { cwd: ctx.directory }))
          .text()
          .split(/\r?\n/)
          .map((remote) => remote.trim())
          .filter(Boolean)
        const remote = remotes.includes("origin") ? "origin" : remotes[0]
        if (!remote) return
        const result = yield* git.run(["remote", "get-url", remote], { cwd: ctx.directory })
        if (result.exitCode !== 0) return
        return safeRemoteUrl(result.text().trim())
      }),
      status: Effect.fn("Vcs.status")(function* () {
        const ctx = yield* InstanceState.context
        if (ctx.project.vcs !== "git") return []
        const ref = (yield* git.hasHead(ctx.directory)) ? "HEAD" : undefined
        const [list, stats] = yield* Effect.all(
          [git.status(ctx.directory), ref ? git.stats(ctx.directory, ref) : Effect.succeed([])],
          { concurrency: 2 },
        )
        const map = nums(stats)
        return yield* Effect.forEach(
          list.toSorted((a, b) => a.file.localeCompare(b.file)),
          (item) =>
            Effect.gen(function* () {
              const stat =
                map.get(item.file) ??
                (item.status === "added" ? yield* git.statUntracked(ctx.worktree, item.file) : undefined)
              return {
                file: item.file,
                additions: stat?.additions ?? 0,
                deletions: stat?.deletions ?? 0,
                status: item.status,
              } satisfies FileStatus
            }),
        )
      }),
      diff: Effect.fn("Vcs.diff")(function* (mode: Mode, options?: DiffOptions) {
        const value = yield* InstanceState.get(state)
        const ctx = yield* InstanceState.context
        if (ctx.project.vcs !== "git") return []
        if (mode === "git") {
          return yield* track(git, ctx.directory, (yield* git.hasHead(ctx.directory)) ? "HEAD" : undefined, options)
        }

        if (!value.root) return []
        if (value.current && value.current === value.root.name) return []
        const ref = yield* git.mergeBase(ctx.directory, value.root.ref)
        if (!ref) return []
        return yield* diffAgainstRef(git, ctx.directory, ref, options)
      }),
      diffRaw: Effect.fn("Vcs.diffRaw")(function* () {
        const ctx = yield* InstanceState.context
        if (ctx.project.vcs !== "git") return ""
        const [hasHead, status] = yield* Effect.all([git.hasHead(ctx.directory), git.status(ctx.directory)], {
          concurrency: 2,
        })
        const tracked = hasHead ? (yield* git.patchAll(ctx.directory, "HEAD")).text : ""
        const untracked = yield* Effect.forEach(
          status.filter((item) => item.code === "??"),
          (item) => git.patchUntracked(ctx.directory, item.file).pipe(Effect.map((patch) => patch.text)),
        )
        return [tracked, ...untracked].filter(Boolean).join("\n")
      }),
      apply: Effect.fn("Vcs.apply")(function* (input: ApplyInput) {
        const ctx = yield* InstanceState.context
        if (ctx.project.vcs !== "git") {
          return yield* new PatchApplyError({
            message: "Patch can't be applied because the project is not git-based",
            reason: "non-git",
          })
        }
        const applied = yield* git.applyPatch(ctx.directory, input.patch)
        if (applied.exitCode !== 0) {
          return yield* new PatchApplyError({
            message: "Patch can't be applied",
            reason: "not-clean",
          })
        }
        return { applied: true }
      }),
      stage: Effect.fn("Vcs.stage")(function* (input: FilesInput) {
        const target = yield* pathspecs(input)
        return yield* result(
          yield* git.run(["add", "--all", "--", ...target.files], { cwd: target.ctx.directory }),
          "Failed to stage files",
        )
      }),
      unstage: Effect.fn("Vcs.unstage")(function* (input: FilesInput) {
        const target = yield* pathspecs(input)
        const args = (yield* git.hasHead(target.ctx.directory))
          ? ["reset", "HEAD", "--", ...target.files]
          : ["rm", "--cached", "-r", "--", ...target.files]
        return yield* result(yield* git.run(args, { cwd: target.ctx.directory }), "Failed to unstage files")
      }),
      discard: Effect.fn("Vcs.discard")(function* (input: FilesInput) {
        const target = yield* pathspecs(input)
        const status = yield* git.status(target.ctx.directory)
        const selected = new Set(input.files.map((file) => file.trim()))
        const added = status
          .filter((item) => selected.has(item.file) && item.code[0] === "A")
          .map((item) => `:(literal)${item.file}`)
        const tracked = status
          .filter((item) => selected.has(item.file) && item.code !== "??" && item.code[0] !== "A")
          .map((item) => `:(literal)${item.file}`)
        const untracked = status
          .filter((item) => selected.has(item.file) && item.code === "??")
          .map((item) => `:(literal)${item.file}`)
        const commands = [
          ...(added.length > 0
            ? [git.run(["rm", "--cached", "-f", "--", ...added], { cwd: target.ctx.directory })]
            : []),
          ...(tracked.length > 0
            ? [git.run(["restore", "--source=HEAD", "--staged", "--worktree", "--", ...tracked], { cwd: target.ctx.directory })]
            : []),
          ...(untracked.length > 0 || added.length > 0
            ? [git.run(["clean", "-f", "--", ...untracked, ...added], { cwd: target.ctx.directory })]
            : []),
        ]
        const outputs = yield* Effect.all(commands, { concurrency: 1 })
        for (const command of outputs) yield* result(command, "Failed to discard files")
        return { output: outputs.flatMap((command) => [command.text().trim()]).filter(Boolean).join("\n") }
      }),
      commit: Effect.fn("Vcs.commit")(function* (input: CommitInput) {
        const ctx = yield* context()
        const message = input.message.trim()
        if (!message || message.length > 10_000 || message.includes("\0")) {
          return yield* new MutationError({
            message: "Commit message must contain between 1 and 10,000 characters",
            reason: "invalid-input",
          })
        }
        return yield* result(
          yield* git.run(["commit", "--message", message], { cwd: ctx.directory, maxOutputBytes: 1_000_000 }),
          "Failed to commit staged changes",
        )
      }),
      push: Effect.fn("Vcs.push")(function* () {
        const ctx = yield* context()
        const upstream = yield* git.run(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], {
          cwd: ctx.directory,
        })
        if (upstream.exitCode === 0) {
          return yield* result(
            yield* git.run(["push"], { cwd: ctx.directory, maxOutputBytes: 1_000_000 }),
            "Failed to push the current branch",
          )
        }
        const branch = yield* git.branch(ctx.directory)
        const remotes = (yield* git.run(["remote"], { cwd: ctx.directory }))
          .text()
          .split(/\r?\n/)
          .map((remote) => remote.trim())
          .filter(Boolean)
        const remote = remotes.includes("origin") ? "origin" : remotes[0]
        if (!branch || !remote) {
          return yield* new MutationError({
            message: "Configure a Git remote before pushing this branch",
            reason: "conflict",
          })
        }
        return yield* result(
          yield* git.run(["push", "--set-upstream", remote, branch], {
            cwd: ctx.directory,
            maxOutputBytes: 1_000_000,
          }),
          "Failed to push the current branch",
        )
      }),
      operation: Effect.fn("Vcs.operation")(function* (input: OperationInput) {
        const ctx = yield* context()
        const argument = input.argument?.trim()
        const validRef = (value: string | undefined) =>
          !!value && value.length <= 255 && !value.startsWith("-") && !/[\0\r\n]/.test(value)
        if ((input.action === "create-branch" || input.action === "merge") && !validRef(argument)) {
          return yield* new MutationError({
            message: "A valid branch name is required",
            reason: "invalid-input",
          })
        }
        const args = input.action === "fetch"
          ? ["fetch", "--prune"]
          : input.action === "pull"
            ? ["pull", "--ff-only"]
            : input.action === "stash"
              ? ["stash", "push", "--include-untracked", "--message", argument || "OpenCodex stash"]
              : input.action === "stash-pop"
                ? ["stash", "pop"]
                : input.action === "create-branch"
                  ? ["switch", "--create", argument!]
                  : input.action === "merge"
                    ? ["merge", "--no-edit", argument!]
                    : ["merge", "--abort"]
        return yield* result(
          yield* git.run(args, { cwd: ctx.directory, maxOutputBytes: 1_000_000 }),
          `Git ${input.action} failed`,
        )
      }),
      history: Effect.fn("Vcs.history")(function* (limit: number) {
        const ctx = yield* context()
        const result = yield* git.run(
          ["log", `--max-count=${Math.max(1, Math.min(200, limit))}`, "--pretty=format:%H%x1f%h%x1f%an%x1f%at%x1f%s"],
          { cwd: ctx.directory, maxOutputBytes: 1_000_000 },
        )
        if (result.exitCode !== 0) {
          return yield* new MutationError({
            message: result.text().trim() || "Failed to read Git history",
            reason: "conflict",
          })
        }
        return result.text().split(/\r?\n/).flatMap((line) => {
          const [hash, shortHash, author, timestamp, subject] = line.split("\u001f")
          if (!hash || !shortHash || !author || !timestamp || subject === undefined) return []
          return [{ hash, shortHash, author, timestamp: Number(timestamp) * 1000, subject }]
        })
      }),
    })
  }),
)

export const node = LayerNode.make({ service: Service, layer: layer, deps: [Git.node, EventV2Bridge.node] })

export function safeRemoteUrl(value: string) {
  const scp = /^(?:[^@]+@)?([^:]+):(.+)$/.exec(value)
  if (scp && !value.includes("://")) return browserRemoteUrl(scp[1], scp[2])
  if (!URL.canParse(value)) return
  const remote = new URL(value)
  if (!["http:", "https:", "ssh:", "git:"].includes(remote.protocol)) return
  return browserRemoteUrl(remote.hostname, remote.pathname)
}

function browserRemoteUrl(host: string, pathname: string) {
  const path = pathname.replace(/^\/+/, "").replace(/\.git\/?$/, "").replace(/\/+$/, "")
  if (!host || !path) return
  return `https://${host}/${path}`
}

export * as Vcs from "./vcs"
