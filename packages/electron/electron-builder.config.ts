import type { Configuration } from "electron-builder"

const config: Configuration = {
  appId: "com.hankun.opencodex",
  productName: "OpenCodex",
  directories: {
    output: "release",
  },
  files: ["out/**/*", "assets/**/*", "package.json"],
  asarUnpack: ["out/main/chunks/*.wasm"],
  mac: {
    icon: "assets/icon.icns",
    target: ["dmg", "zip"],
    category: "public.app-category.developer-tools",
    identity: process.env.CSC_IDENTITY ?? "-",
  },
}

export default config
