import type { Configuration } from "electron-builder"

const config: Configuration = {
  appId: "com.hankun.opencode.custom",
  productName: "OpenCode",
  directories: {
    output: "release",
  },
  files: ["out/**/*", "assets/**/*", "package.json"],
  asarUnpack: ["out/main/chunks/*.wasm"],
  mac: {
    icon: "assets/icon.icns",
    target: ["dmg", "zip"],
    category: "public.app-category.developer-tools",
  },
}

export default config
