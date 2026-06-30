import type { Configuration } from "electron-builder"

const config: Configuration = {
  appId: "com.hankun.opencode.custom",
  productName: "Custom OpenCode",
  directories: {
    output: "release",
  },
  files: ["out/**/*", "package.json"],
  asarUnpack: ["out/main/chunks/*.wasm"],
  mac: {
    target: ["dmg", "zip"],
    category: "public.app-category.developer-tools",
  },
}

export default config
