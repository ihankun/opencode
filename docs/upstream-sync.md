# Upstream synchronization

OpenCodex vendors upstream source when local product or security changes are expected. Do not replace these directories with npm dependencies.

As of 2026-08-28, the Electron renderer (`packages/electron/src/renderer`, from `lehhair/OpenCodeUI`) and the IM bridge (`packages/electron/vendor/opencode-im-bridge`, from `ET06731/opencode-im-bridge`) are no longer tracked upstream and are maintained in-tree. Only `sandbox-runtime` remains tracked below.

The machine-readable source list is [`packages/electron/upstream-sources.json`](../packages/electron/upstream-sources.json). Run the following command to check for new upstream releases or commits:

```sh
bun --cwd packages/electron upstream:check
```

`GITHUB_TOKEN` is optional and only increases the GitHub API rate limit.

## Update workflow

1. Create a short-lived branch from `dev`.
2. Update one upstream source at a time in a temporary directory outside the repository.
3. Compare the pinned source with the new release and write the candidate changes into an explicit migration list.
4. Copy selected files into the tracked local path. Never overwrite OpenCodex-specific security, credential storage, Runner routing, settings navigation, or localization without reviewing the local behavior.
5. Update the matching `pinned` value in `upstream-sources.json`. For sandbox-runtime, also update `package.json#opencodex.upstreamCommit`.
6. Run the source-specific tests, Electron verification, and production build.
7. Record rejected upstream changes and the reason in the pull request so the next synchronization does not repeat the investigation.

## Required checks

- Electron: `bun --cwd packages/electron verify` and `bun electron:build`
- Sandbox runtime: `bun --cwd packages/sandbox-runtime test` and `bun --cwd packages/sandbox-runtime typecheck`
- IM bridge changes: run its focused tests from `packages/electron/vendor/opencode-im-bridge`
- Manually verify local/remote Runner switching, secure credentials, sandbox network policy, settings navigation, and a new task

The source manifest is an inventory, not permission to merge upstream wholesale. Local product behavior remains authoritative.
