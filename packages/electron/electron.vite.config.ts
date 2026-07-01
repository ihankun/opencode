import { defineConfig } from "electron-vite"
import { readdir, readFile, writeFile } from "node:fs/promises"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import packageJson from "./package.json" with { type: "json" }
import opencodePackageJson from "../opencode/package.json" with { type: "json" }

const OPENCODE_SERVER_DIST = "../opencode/dist/node"
const nodePtyPkg = `@lydell/node-pty-${process.platform}-${process.arch}`

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: "src/main/index.ts",
          sidecar: "src/main/sidecar.ts",
        },
      },
      externalizeDeps: {
        include: [nodePtyPkg],
      },
    },
    plugins: [
      {
        name: "custom-electron:node-pty-narrower",
        enforce: "pre",
        resolveId(source) {
          if (source === "@lydell/node-pty") return nodePtyPkg
        },
      },
      {
        name: "custom-electron:opencode-server",
        enforce: "pre",
        resolveId(id) {
          if (id === "virtual:opencode-server") return this.resolve(`${OPENCODE_SERVER_DIST}/node.js`)
        },
      },
      {
        name: "custom-electron:copy-server-assets",
        async writeBundle() {
          for (const file of await readdir(OPENCODE_SERVER_DIST)) {
            if (!file.endsWith(".wasm")) continue
            await writeFile(`./out/main/chunks/${file}`, await readFile(`${OPENCODE_SERVER_DIST}/${file}`))
          }
        },
      },
    ],
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: "src/preload/index.ts",
        },
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
        },
      },
    },
  },
  renderer: {
    root: "src/renderer",
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __OPENCODE_VERSION__: JSON.stringify(opencodePackageJson.version),
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: 46237,
      strictPort: false,
    },
    build: {
      rollupOptions: {
        input: {
          main: "src/renderer/index.html",
        },
      },
    },
  },
})
