import { defineConfig } from "electron-vite"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
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
        name: "custom-electron:copy-opencode-server",
        async writeBundle() {
          await mkdir("./out/main/chunks", { recursive: true })
          await writeFile(
            "./out/main/chunks/opencode-server.js",
            (await readFile(`${OPENCODE_SERVER_DIST}/node.js`, "utf8")).replace(
              /(["'])@lydell\/node-pty\1/g,
              JSON.stringify(nodePtyPkg),
            ),
          )
          await writeFile(
            "./out/main/chunks/opencode-server.js.map",
            await readFile(`${OPENCODE_SERVER_DIST}/node.js.map`),
          )
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
