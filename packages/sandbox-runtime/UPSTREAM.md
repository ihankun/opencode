# Upstream source

This package vendors the complete source of [`anthropic-experimental/sandbox-runtime`](https://github.com/anthropic-experimental/sandbox-runtime).

- Upstream tag: `v0.0.64`
- Upstream commit: `168dd958be371edf4cd883cc0cc3a551524d78d7`
- Imported: 2026-07-20
- License: Apache-2.0 (see `LICENSE`)

The TypeScript source, tests, Linux seccomp C source, and Windows Rust helper source are kept in-tree so OpenCodex can customize sandbox behavior. Prebuilt Linux and Windows helpers are copied from the official `0.0.64` npm release because the Git tag intentionally contains their build sources but not generated release binaries.

OpenCodex integration changes are intentionally limited to the local workspace entrypoint in `package.json`, native helper lookup, and two Node type-compatibility adaptations for Buffer and Web Streams. Sandbox policy remains in `packages/opencode/src/security`.
