export type ImBridgeChannelConfig = {
  enabled: boolean
}

export type ImBridgeConfig = {
  autoStart: boolean
  serverId: string
  serverUrl: string
  directory: string
  defaultAgent: string
  messageDebounceMs: number
  feishu: ImBridgeChannelConfig & {
    appId: string
    appSecret: string
    verificationToken: string
    webhookPort: number
    encryptKey: string
  }
  qq: ImBridgeChannelConfig & {
    appId: string
    secret: string
    sandbox: boolean
  }
  telegram: ImBridgeChannelConfig & {
    botToken: string
    allowedChatIds: string[]
  }
  discord: ImBridgeChannelConfig & {
    botToken: string
    allowedChannelIds: string[]
  }
  wechat: ImBridgeChannelConfig & {
    sessionFile: string
    baseUrl: string
    token: string
  }
  dingtalk: ImBridgeChannelConfig & {
    appKey: string
    appSecret: string
    agentId: string
    botName: string
  }
}

export type ImBridgeStatus = "stopped" | "starting" | "running" | "error"

export type ImBridgeState = {
  status: ImBridgeStatus
  pid?: number
  error?: string
  startedAt?: number
  logs: string[]
}
