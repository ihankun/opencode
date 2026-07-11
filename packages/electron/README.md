# Custom OpenCode Electron

Independent Electron frontend for the local opencode server.

## Development

```bash
bun electron:install
bun electron:dev
```

`electron:install` downloads the Electron runtime binary used by `electron-vite`.
The app builds and starts its own opencode server sidecar on a random localhost port. It does not reuse port `4096`, so the TUI and the official desktop app can still start their own servers.
The Electron renderer dev server starts from port `46237` instead of Vite's common `5173`.

macOS native notifications require a signed app bundle. The `electron:dev` runtime is not a normal signed `OpenCodex.app`, so test system notifications from a packaged build.

## Build

```bash
bun electron:build
bun electron:package
```

This repository currently requires `bun@^1.3.14` for the opencode server build scripts.

## Skill marketplace

The skill marketplace uses SkillHub's public API for anonymous search and file downloads. It requires no account, token, or proxy service. Set `SKILLHUB_URL` only when developing against a compatible self-hosted SkillHub instance.
