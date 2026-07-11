export * as SkillMarketplace from "./skill-marketplace"

import { Schema } from "effect"
import { optional } from "./schema"

export const Scope = Schema.Literals(["global", "project"])
export type Scope = typeof Scope.Type

export const File = Schema.Struct({
  path: Schema.String,
  contents: Schema.String,
}).annotate({ identifier: "SkillMarketplace.File" })
export interface File extends Schema.Schema.Type<typeof File> {}

export const Summary = Schema.Struct({
  id: Schema.String,
  slug: Schema.String,
  name: Schema.String,
  source: Schema.String,
  description: Schema.String,
  url: Schema.String,
  githubStars: Schema.Number,
  downloadCount: Schema.Number,
  isVerified: Schema.Boolean,
  securityScore: Schema.NullOr(Schema.Number),
  securityStatus: Schema.NullOr(Schema.String),
  aiScore: Schema.NullOr(Schema.Number),
  reviewStatus: Schema.NullOr(Schema.String),
}).annotate({ identifier: "SkillMarketplace.Summary" })
export interface Summary extends Schema.Schema.Type<typeof Summary> {}

export const Page = Schema.Struct({
  data: Schema.Array(Summary),
  page: Schema.Number,
  perPage: Schema.Number,
  total: Schema.Number,
}).annotate({ identifier: "SkillMarketplace.Page" })
export interface Page extends Schema.Schema.Type<typeof Page> {}

export const Detail = Schema.Struct({
  id: Schema.String,
  source: Schema.String,
  slug: Schema.String,
  hash: Schema.String,
  files: Schema.Array(File),
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
}).annotate({ identifier: "SkillMarketplace.Detail" })
export interface Detail extends Schema.Schema.Type<typeof Detail> {}

export const Manifest = Schema.Struct({
  id: Schema.String,
  source: Schema.String,
  slug: Schema.String,
  hash: Schema.NullOr(Schema.String),
  scope: Scope,
  installedAt: Schema.String,
  updatedAt: Schema.String,
  files: Schema.Record(Schema.String, Schema.String),
}).annotate({ identifier: "SkillMarketplace.Manifest" })
export interface Manifest extends Schema.Schema.Type<typeof Manifest> {}

export const Installation = Schema.Struct({
  id: Schema.String,
  slug: Schema.String,
  scope: Scope,
  directory: Schema.String,
  manifest: Manifest,
  conflict: Schema.Boolean,
  updateAvailable: Schema.Boolean,
}).annotate({ identifier: "SkillMarketplace.Installation" })
export interface Installation extends Schema.Schema.Type<typeof Installation> {}

export const InstallInput = Schema.Struct({
  id: Schema.String,
  scope: Scope,
  force: Schema.Boolean.pipe(optional),
}).annotate({ identifier: "SkillMarketplace.InstallInput" })
export interface InstallInput extends Schema.Schema.Type<typeof InstallInput> {}

export const RemoveInput = Schema.Struct({
  id: Schema.String,
  scope: Scope,
  force: Schema.Boolean.pipe(optional),
}).annotate({ identifier: "SkillMarketplace.RemoveInput" })
export interface RemoveInput extends Schema.Schema.Type<typeof RemoveInput> {}
