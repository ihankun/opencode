/**
 * opencodex 常驻 daemon 入口。
 *
 * 由 scripts/build-server.ts 用 `bun build --compile` 编译为原生二进制
 * （内置 Bun 运行时），由主进程 detached 常驻启动。
 * 端口 / cors 通过环境变量传入；SIGTERM/SIGINT 优雅退出。
 */

import { Server } from "../../opencode/src/node.ts"

const hostname = process.env.OPENCODE_HOST ?? "127.0.0.1"
const port = Number(process.env.OPENCODE_PORT ?? 45210)
const cors = (() => {
  try {
    const raw = JSON.parse(process.env.OPENCODE_CORS ?? "[]") as unknown
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
})()

const listener = await Server.listen({ hostname, port, cors })
console.log(`opencode daemon listening at ${listener.url}`)

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void listener.stop(true).finally(() => process.exit(0))
  })
}
