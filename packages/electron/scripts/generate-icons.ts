import { existsSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"

const { default: sharp } = await import("sharp")
const root = join(import.meta.dir, "..")
const assets = join(root, "assets")
const generated = join(assets, "generated")
const traySource = join(assets, "opencode-tray.png")

if (!existsSync(traySource)) throw new Error(`Missing tray icon: ${traySource}`)

mkdirSync(generated, { recursive: true })
rmSync(join(generated, "opencode-app-icon.png"), { force: true })
rmSync(join(generated, "opencode-app-icon-body.png"), { force: true })

await writeTrayTemplate(22, "opencode-trayTemplate.png")
await writeTrayTemplate(44, "opencode-trayTemplate@2x.png")

async function writeTrayTemplate(size: number, filename: string) {
  await sharp(traySource)
    .resize(size, size, { fit: "contain" })
    .ensureAlpha()
    .tint({ r: 0, g: 0, b: 0 })
    .png()
    .toFile(join(generated, filename))
}
