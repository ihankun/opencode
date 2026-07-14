import { Effect } from "effect"
import { sandboxFilesystemRisks, type SandboxFilesystemRequest } from "@/security"
import type { Context } from "./tool"

export const assertSandboxFilesystemEffect = Effect.fn("Tool.assertSandboxFilesystem")(function* (
  ctx: Context,
  requests: SandboxFilesystemRequest[],
  cwd: string,
  worktree: string,
) {
  const risks = yield* Effect.promise(() => sandboxFilesystemRisks(requests, cwd, worktree))
  if (!risks.length) return
  yield* ctx.ask({
    permission: "sandbox",
    patterns: risks,
    always: risks,
    metadata: { risks, requests },
  })
})
