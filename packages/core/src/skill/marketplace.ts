export * as SkillMarketplace from "./marketplace"

import path from "path"
import { createHash } from "node:crypto"
import { Context, Effect, Layer, Schedule, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { SkillMarketplace as Marketplace } from "@opencode-ai/schema/skill-marketplace"
import { makeLocationNode } from "../effect/app-node"
import { httpClient } from "../effect/app-node-platform"
import { FSUtil } from "../fs-util"
import { Global } from "../global"
import { Location } from "../location"

const baseUrl = (process.env.SKILLHUB_URL ?? "https://skills.palebluedot.live").replace(/\/+$/, "")
const manifestFile = ".opencodex-marketplace.json"
const maxFileBytes = 1024 * 1024
const maxTotalBytes = 5 * 1024 * 1024

const RemoteSearch = Schema.Struct({
  skills: Schema.Array(Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    description: Schema.NullOr(Schema.String),
    githubOwner: Schema.String,
    githubRepo: Schema.String,
    githubStars: Schema.Number,
    downloadCount: Schema.Number,
    isVerified: Schema.Boolean,
    securityScore: Schema.NullOr(Schema.Number),
    securityStatus: Schema.NullOr(Schema.String),
    aiScore: Schema.NullOr(Schema.Number),
    reviewStatus: Schema.NullOr(Schema.String),
  })),
  pagination: Schema.Struct({
    page: Schema.Number,
    limit: Schema.Number,
    total: Schema.Number,
  }),
})

const RemoteDetail = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  githubOwner: Schema.String,
  githubRepo: Schema.String,
  githubStars: Schema.Number,
  downloadCount: Schema.Number,
  isVerified: Schema.Boolean,
  isFeatured: Schema.Boolean,
  securityScore: Schema.NullOr(Schema.Number),
  securityStatus: Schema.NullOr(Schema.String),
  qualityScore: Schema.NullOr(Schema.Number),
  aiScore: Schema.NullOr(Schema.Number),
  reviewStatus: Schema.NullOr(Schema.String),
  license: Schema.NullOr(Schema.String),
  isMalicious: Schema.optional(Schema.Boolean),
  isBlocked: Schema.optional(Schema.Boolean),
})

const RemoteFiles = Schema.Struct({
  skillId: Schema.String,
  files: Schema.Array(Schema.Struct({
    path: Schema.String,
    type: Schema.String,
    content: Schema.NullOr(Schema.String),
  })),
})

export class Error extends Schema.TaggedErrorClass<Error>()("SkillMarketplace.Error", {
  message: Schema.String,
  conflict: Schema.optional(Schema.Boolean),
}) {}

export interface Interface {
  readonly search: (input: { query: string; limit: number; page: number }) => Effect.Effect<typeof Marketplace.Page.Type, Error>
  readonly detail: (id: string) => Effect.Effect<typeof Marketplace.Detail.Type, Error>
  readonly installed: () => Effect.Effect<Marketplace.Installation[], Error>
  readonly install: (input: Marketplace.InstallInput) => Effect.Effect<Marketplace.Installation, Error>
  readonly remove: (input: Marketplace.RemoveInput) => Effect.Effect<void, Error>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SkillMarketplace") {}

export function safePath(value: string) {
  const parts = value.split("/")
  return (
    value.length > 0 &&
    !value.includes("\\") &&
    !value.includes("\0") &&
    !path.posix.isAbsolute(value) &&
    !path.win32.isAbsolute(value) &&
    parts.every((part) => part.length > 0 && part !== "." && part !== "..")
  )
}

export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const global = yield* Global.Service
    const location = yield* Location.Service
    const http = (yield* HttpClient.HttpClient).pipe(
      HttpClient.retryTransient({
        retryOn: "errors-and-responses",
        times: 2,
        schedule: Schedule.exponential(200).pipe(Schedule.jittered),
      }),
      HttpClient.filterStatusOk,
    )

    const execute = <S extends Schema.Top>(url: string, schema: S) =>
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.acceptJson,
        http.execute,
        Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
        Effect.mapError((cause) => new Error({
          message: `SkillHub request failed: ${String(cause)}`,
        })),
      )

    const detail = Effect.fn("SkillMarketplace.detail")(function* (id: string) {
      const encoded = id.split("/").map(encodeURIComponent).join("/")
      const [info, snapshot] = yield* Effect.all([
        execute(`${baseUrl}/api/skills/${encoded}`, RemoteDetail),
        execute(`${baseUrl}/api/skill-files?id=${encodeURIComponent(id)}`, RemoteFiles),
      ], { concurrency: 2 })
      if (info.isMalicious || info.isBlocked) return yield* new Error({ message: "SkillHub has blocked this skill" })
      const files = snapshot.files.flatMap((file) =>
        file.type === "file" && file.content !== null ? [{ path: file.path, contents: file.content }] : [],
      )
      if (files.length === 0) return yield* new Error({ message: "This skill does not have an installable file snapshot" })
      return {
        id: info.id,
        source: `${info.githubOwner}/${info.githubRepo}`,
        slug: info.name,
        hash: hash(files.toSorted((a, b) => a.path.localeCompare(b.path)).map((file) => `${file.path}\0${file.contents}`).join("\0")),
        files,
        githubStars: info.githubStars,
        downloadCount: info.downloadCount,
        isVerified: info.isVerified,
        isFeatured: info.isFeatured,
        securityScore: info.securityScore,
        securityStatus: info.securityStatus,
        qualityScore: info.qualityScore,
        aiScore: info.aiScore,
        reviewStatus: info.reviewStatus,
        license: info.license,
      }
    })

    const root = (scope: Marketplace.Scope) =>
      scope === "global"
        ? path.join(global.home, ".opencodex", "skills")
        : path.join(location.directory, ".opencode", "skills")

    const directory = (scope: Marketplace.Scope, slug: string) => path.resolve(root(scope), slug)

    const manifest = Effect.fn("SkillMarketplace.manifest")(function* (dir: string) {
      const raw = yield* fs.readFileStringSafe(path.join(dir, manifestFile)).pipe(Effect.mapError((cause) => new Error({ message: String(cause) })))
      if (!raw) return undefined
      return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Marketplace.Manifest))(raw).pipe(
        Effect.mapError((cause) => new Error({ message: `Invalid marketplace metadata: ${String(cause)}` })),
      )
    })

    const conflict = Effect.fn("SkillMarketplace.conflict")(function* (dir: string, info?: Marketplace.Manifest) {
      if (!info) return yield* fs.existsSafe(dir)
      if (Object.keys(info.files).some((file) => !safePath(file))) {
        return yield* new Error({ message: "Marketplace metadata contains an unsafe path" })
      }
      const files = yield* fs.glob("**/*", { cwd: dir, include: "file", dot: true }).pipe(
        Effect.mapError((cause) => new Error({ message: String(cause) })),
      )
      if (files.some((file) => file !== manifestFile && !(file in info.files))) return true
      const changed = yield* Effect.forEach(Object.entries(info.files), ([file, expected]) =>
        fs.readFileStringSafe(path.join(dir, file)).pipe(
          Effect.map((content) => content === undefined || hash(content) !== expected),
          Effect.mapError((cause) => new Error({ message: String(cause) })),
        ),
      )
      return changed.some(Boolean)
    })

    const installation = Effect.fn("SkillMarketplace.installation")(function* (
      info: Marketplace.Manifest,
      dir: string,
      remoteHash: string | null,
    ) {
      return {
        id: info.id,
        slug: info.slug,
        scope: info.scope,
        directory: dir,
        manifest: info,
        conflict: yield* conflict(dir, info),
        updateAvailable: remoteHash !== null && remoteHash !== info.hash,
      } satisfies Marketplace.Installation
    })

    const installed = Effect.fn("SkillMarketplace.installed")(function* () {
      const entries = yield* Effect.forEach(["global", "project"] as const, (scope) =>
        fs.glob(`*/${manifestFile}`, { cwd: root(scope), absolute: true, include: "file", dot: true }).pipe(
          Effect.catch(() => Effect.succeed([] as string[])),
          Effect.map((files) => files.map((file) => ({ scope, file }))),
        ),
      )
      return yield* Effect.forEach(entries.flat(), ({ file }) =>
        Effect.gen(function* () {
          const info = yield* manifest(path.dirname(file))
          if (!info) return undefined
          const remote = yield* detail(info.id).pipe(Effect.catch(() => Effect.succeed(undefined)))
          return yield* installation(info, path.dirname(file), remote?.hash ?? info.hash)
        }),
        { concurrency: 4 },
      ).pipe(Effect.map((items) => items.filter((item): item is Marketplace.Installation => item !== undefined)))
    })

    const install = Effect.fn("SkillMarketplace.install")(function* (input: Marketplace.InstallInput) {
      const remote = yield* detail(input.id)
      if (!remote.files.some((file) => file.path === "SKILL.md")) {
        return yield* new Error({ message: "Skill snapshot does not contain SKILL.md" })
      }
      if (remote.files.some((file) => !safePath(file.path))) {
        return yield* new Error({ message: "Skill snapshot contains an unsafe path" })
      }
      const sizes = remote.files.map((file) => Buffer.byteLength(file.contents))
      if (sizes.some((size) => size > maxFileBytes) || sizes.reduce((total, size) => total + size, 0) > maxTotalBytes) {
        return yield* new Error({ message: "Skill snapshot exceeds the installation size limit" })
      }

      const dir = directory(input.scope, remote.slug)
      if (!FSUtil.contains(root(input.scope), dir) || dir === root(input.scope)) {
        return yield* new Error({ message: "Invalid skill installation directory" })
      }
      const current = yield* manifest(dir)
      if ((yield* conflict(dir, current)) && input.force !== true) {
        return yield* new Error({ message: "Local skill files have changes", conflict: true })
      }

      const now = new Date().toISOString()
      const next: Marketplace.Manifest = {
        id: remote.id,
        source: remote.source,
        slug: remote.slug,
        hash: remote.hash,
        scope: input.scope,
        installedAt: current?.installedAt ?? now,
        updatedAt: now,
        files: Object.fromEntries(remote.files.map((file) => [file.path, hash(file.contents)])),
      }
      const token = crypto.randomUUID()
      const staging = `${dir}.tmp-${token}`
      const backup = `${dir}.old-${token}`
      yield* Effect.gen(function* () {
        yield* Effect.forEach(remote.files, (file) => fs.writeWithDirs(path.join(staging, file.path), file.contents), {
          concurrency: 8,
          discard: true,
        })
        yield* fs.writeWithDirs(path.join(staging, manifestFile), JSON.stringify(next, null, 2))
        const exists = yield* fs.existsSafe(dir)
        if (exists) yield* fs.rename(dir, backup)
        yield* fs.rename(staging, dir).pipe(
          Effect.catch((cause) =>
            Effect.gen(function* () {
              if (exists) yield* fs.rename(backup, dir).pipe(Effect.ignore)
              return yield* Effect.fail(cause)
            }),
          ),
        )
        if (exists) yield* fs.remove(backup, { recursive: true, force: true }).pipe(Effect.ignore)
      }).pipe(
        Effect.mapError((cause) => new Error({ message: `Unable to install skill: ${String(cause)}` })),
        Effect.ensuring(fs.remove(staging, { recursive: true, force: true }).pipe(Effect.ignore)),
      )
      return yield* installation(next, dir, remote.hash)
    })

    const remove = Effect.fn("SkillMarketplace.remove")(function* (input: Marketplace.RemoveInput) {
      const matches = (yield* installed()).filter((item) => item.id === input.id && item.scope === input.scope)
      const item = matches[0]
      if (!item) return
      if (item.conflict && input.force !== true) {
        return yield* new Error({ message: "Local skill files have changes", conflict: true })
      }
      yield* fs.remove(item.directory, { recursive: true, force: true }).pipe(
        Effect.mapError((cause) => new Error({ message: `Unable to remove skill: ${String(cause)}` })),
      )
    })

    return Service.of({
      search: Effect.fn("SkillMarketplace.search")(function* (input) {
        const url = new URL(`${baseUrl}/api/skills`)
        url.searchParams.set("q", input.query)
        url.searchParams.set("limit", String(input.limit))
        url.searchParams.set("page", String(input.page))
        const result = yield* execute(url.href, RemoteSearch)
        return {
          data: result.skills.map((skill) => ({
            id: skill.id,
            slug: skill.name,
            name: skill.name,
            source: `${skill.githubOwner}/${skill.githubRepo}`,
            description: skill.description ?? skill.name,
            url: `${baseUrl}/skills/${skill.id.split("/").map(encodeURIComponent).join("/")}`,
            githubStars: skill.githubStars,
            downloadCount: skill.downloadCount,
            isVerified: skill.isVerified,
            securityScore: skill.securityScore,
            securityStatus: skill.securityStatus,
            aiScore: skill.aiScore,
            reviewStatus: skill.reviewStatus,
          })),
          page: result.pagination.page,
          perPage: result.pagination.limit,
          total: result.pagination.total,
        }
      }),
      detail,
      installed,
      install,
      remove,
    })
  }),
)

export const node = makeLocationNode({
  service: Service,
  layer,
  deps: [httpClient, FSUtil.node, Global.node, Location.node],
})
