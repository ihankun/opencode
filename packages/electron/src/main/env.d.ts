declare module "virtual:opencode-server" {
  export const Server: {
    listen(opts: {
      hostname: string
      port: number
      username?: string
      password?: string
      cors?: string[]
    }): Promise<{
      hostname: string
      port: number
      url: URL
      stop(close?: boolean): Promise<void>
    }>
  }
}
