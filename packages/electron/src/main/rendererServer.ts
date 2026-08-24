import { createServer, type Server } from "node:http"
import { extname, join, normalize } from "node:path"
import { readFile, stat } from "node:fs/promises"
import { writeLog } from "./logging"

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".map": "application/json; charset=utf-8",
}

export type RendererServerHandle = {
  url: string
  stop: () => Promise<void>
}

// 在打包模式下从本地 HTTP 端口提供 renderer 静态文件，使浏览器 origin 变为
// http://127.0.0.1:<port> 而非 file:// 的 "null"，从而让 engineer 5099 等
// 严格校验 CORS 的上游服务放行 SSE / fetch 请求。
export async function startRendererServer(root: string): Promise<RendererServerHandle> {
  return new Promise<RendererServerHandle>((resolve, reject) => {
    const server: Server = createServer(async (req, res) => {
      try {
        const parsed = new URL(req.url ?? "/", "http://localhost")
        const pathname = decodeURIComponent(parsed.pathname)
        if (pathname.includes("..")) {
          res.writeHead(403).end()
          return
        }
        const relative = normalize(pathname).replace(/^[/\\]+/, "")
        let filePath = join(root, relative)
        let fileStat = await stat(filePath).catch(() => null)
        if (!fileStat || !fileStat.isFile()) {
          // SPA fallback：未命中的路径交给前端路由处理
          filePath = join(root, "index.html")
          fileStat = await stat(filePath).catch(() => null)
        }
        if (!fileStat || !fileStat.isFile()) {
          res.writeHead(404).end()
          return
        }
        const data = await readFile(filePath)
        res.writeHead(200, {
          "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
        })
        res.end(data)
      } catch (error) {
        writeLog("renderer-server", "request failed", error)
        if (!res.headersSent) res.writeHead(500).end()
      }
    })
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address()
      const port = typeof addr === "object" && addr ? addr.port : 0
      const url = `http://127.0.0.1:${port}`
      writeLog("startup", "renderer static server started", { url })
      resolve({
        url,
        stop: () =>
          new Promise<void>((r) => {
            server.close(() => r())
          }),
      })
    })
  })
}
