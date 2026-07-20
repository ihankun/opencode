# Upstream source

This directory vendors the source of [`ET06731/opencode-im-bridge`](https://github.com/ET06731/opencode-im-bridge).

- Upstream commit: `1558490c5247c9eeebe5d706890e9fb56b72f250`
- Upstream version: `0.46.0`
- Imported: 2026-07-20
- License: MIT (see `LICENSE`)

OpenCodex keeps this source in-tree so the bridge lifecycle and channel behavior can be adapted without depending on the published `opencode-im-bridge` package. Local integration changes include replacing `bun:sqlite` with Electron's `node:sqlite`, accepting an Electron-managed config path, and disabling the interactive setup wizard in embedded mode.
