# Main-process IPC

IPC channels are grouped by domain in this directory. Modules export explicit
`register...Ipc()` functions and must not register handlers as an import side
effect.

The main entrypoint owns application lifecycle, windows, and service instances.
It registers IPC only after those dependencies are initialized and passes them
to each domain registrar. IPC modules must not construct duplicate stores,
sidecars, schedulers, or other application services.

## Boundaries

- Keep channel names and payload behavior compatible with the preload API.
- Keep sender authorization explicit through `AssertIpcSender`. Do not broaden
  a main-window-only channel while extracting it.
- Keep input validation at the IPC boundary when it is specific to the channel.
- Pass lifecycle actions such as restarting the server or opening a managed
  window into the registrar instead of importing the main entrypoint.
- Group related channels together. Do not create one file per channel.
- Persist renderer local-storage settings through the main-process
  `RendererSettingsStore`; renderer origins are caches, not the durable source.

## Migration order

Channel registration has been extracted. Business implementations that remain
in `main/index.ts` should move incrementally in this order:

1. Marketplace, plugin, MCP, and expert-kit operations.
2. Security configuration and Windows sandbox integration.
3. Skills and desktop integration operations.
4. Managed browser, login, notification, and diagnostics services.
5. Window and sidecar lifecycle only after the preceding domains no longer
   depend on main-entrypoint state.

Each migration should preserve the injected registrar contract so protocol
changes remain separate from implementation changes.
