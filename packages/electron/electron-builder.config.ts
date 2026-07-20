import type { Configuration } from "electron-builder"

const config: Configuration = {
  appId: "com.hankun.opencodex",
  productName: "OpenCodex",
  directories: {
    output: "release",
  },
  files: ["out/**/*", "assets/**/*", "package.json"],
  extraResources: [
    {
      from: "../sandbox-runtime",
      to: "sandbox-runtime",
      filter: ["LICENSE", "UPSTREAM.md", "vendor/seccomp/**/*", "vendor/srt-win/**/*"],
    },
  ],
  asarUnpack: ["out/main/chunks/*.wasm", "node_modules/@lydell/node-pty-*/**/*"],
  mac: {
    icon: "assets/icon.icns",
    target: ["dmg", "zip"],
    category: "public.app-category.developer-tools",
    identity: process.env.CSC_IDENTITY ?? "-",
  },
  win: {
    icon: "assets/icon.ico",
    target: ["nsis", "portable"],
    artifactName: "${productName}-${version}-${arch}.${ext}",
  },
  nsis: {
    artifactName: "${productName} Setup ${version}.${ext}",
  },
  linux: {
    icon: "assets/opencode-icon.png",
    target: ["AppImage", "deb", "rpm"],
    category: "Development",
  },
}

export default config
