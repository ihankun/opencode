import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const { default: sharp } = await import("sharp")
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const assets = join(root, "assets")
const generated = join(assets, "generated")
const traySource = join(assets, "opencode-tray.png")
const iconSource = join(assets, "opencode-icon.png")

if (!existsSync(traySource)) throw new Error(`Missing tray icon: ${traySource}`)
if (!existsSync(iconSource)) throw new Error(`Missing app icon: ${iconSource}`)

mkdirSync(generated, { recursive: true })
rmSync(join(generated, "opencode-app-icon.png"), { force: true })
rmSync(join(generated, "opencode-app-icon-body.png"), { force: true })
rmSync(join(assets, "icon.ico"), { force: true })

await writeTrayTemplate(22, "opencode-trayTemplate.png")
await writeTrayTemplate(44, "opencode-trayTemplate@2x.png")
await writeIco()

async function writeTrayTemplate(size: number, filename: string) {
  await sharp(traySource)
    .resize(size, size, { fit: "contain" })
    .ensureAlpha()
    .tint({ r: 0, g: 0, b: 0 })
    .png()
    .toFile(join(generated, filename))
}

async function writeIco() {
  const sizes = [16, 24, 32, 48, 64, 128, 256]

  // Get raw BGRA pixel data for each size (sharp outputs RGBA, ICO needs BGRA)
  const rawDataList = await Promise.all(
    sizes.map(async size => {
      const { data } = await sharp(iconSource)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      // Convert RGBA → BGRA
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        data[i] = data[i + 2]     // B → R position
        data[i + 2] = r           // R → B position
      }
      return { size, data }
    })
  )

  // Build ICO using BMP format (required by resedit/electron-builder)
  const icoHeader = Buffer.alloc(6)
  icoHeader.writeUInt16LE(0, 0)
  icoHeader.writeUInt16LE(1, 2) // type: ICO
  icoHeader.writeUInt16LE(sizes.length, 4)

  const dirEntries: Buffer[] = []
  const imageDataBuffers: Buffer[] = []
  let offset = 6 + sizes.length * 16

  for (const { size, data } of rawDataList) {
    // AND mask: 1 bit per pixel, rows padded to 4-byte boundary
    const andMaskRowBytes = Math.ceil(size / 32) * 4
    const andMaskSize = andMaskRowBytes * size
    const andMask = Buffer.alloc(andMaskSize, 0) // all zeros — alpha channel handles transparency

    // XOR mask: raw BGRA pixel data
    const xorMaskSize = size * size * 4

    // BITMAPINFOHEADER (40 bytes)
    const bmpHeader = Buffer.alloc(40)
    bmpHeader.writeUInt32LE(40, 0) // header size
    bmpHeader.writeInt32LE(size, 4) // width
    bmpHeader.writeInt32LE(size * 2, 8) // height (doubled for ICO)
    bmpHeader.writeUInt16LE(1, 12) // planes
    bmpHeader.writeUInt16LE(32, 14) // bits per pixel
    bmpHeader.writeUInt32LE(0, 16) // compression (BI_RGB)
    bmpHeader.writeUInt32LE(xorMaskSize + andMaskSize, 20) // image data size
    bmpHeader.writeUInt32LE(0, 24) // pixels per meter X
    bmpHeader.writeUInt32LE(0, 28) // pixels per meter Y
    bmpHeader.writeUInt32LE(0, 32) // colors used
    bmpHeader.writeUInt32LE(0, 36) // important colors

    const imageData = Buffer.concat([bmpHeader, data, andMask])

    // Directory entry (16 bytes)
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size < 256 ? size : 0, 0) // width
    entry.writeUInt8(size < 256 ? size : 0, 1) // height
    entry.writeUInt8(0, 2) // color count
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(imageData.length, 8) // image data size
    entry.writeUInt32LE(offset, 12) // offset

    dirEntries.push(entry)
    imageDataBuffers.push(imageData)
    offset += imageData.length
  }

  const icoBuffer = Buffer.concat([icoHeader, ...dirEntries, ...imageDataBuffers])
  const icoPath = join(assets, "icon.ico")
  writeFileSync(icoPath, icoBuffer)
  console.log(`Generated icon.ico (${icoBuffer.length} bytes, ${sizes.length} sizes: ${sizes.join(", ")})`)

  // Also save 256x256 PNG for reference
  await sharp(iconSource)
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png()
    .toFile(join(generated, "icon-256.png"))
}
