import { useEffect, useState } from 'react'
import type { ImBridgeConfig, ImBridgeState } from '../../../../../shared/imBridge'

export const IMBRIDGE_PLATFORM_IDS = ['feishu', 'qq', 'telegram', 'discord', 'wechat', 'dingtalk'] as const
export type ImBridgePlatformId = (typeof IMBRIDGE_PLATFORM_IDS)[number]

export type ImBridgePlatformStatus = 'connected' | 'connecting' | 'failed'

export interface ImBridgePlatformInfo {
  enabled: boolean
  status: ImBridgePlatformStatus
}

export interface ImBridgeData {
  available: boolean
  config?: ImBridgeConfig
  state: ImBridgeState
  message: string
  busy: boolean
  setConfig: (config: ImBridgeConfig) => void
  setMessage: (message: string) => void
  setBusy: (busy: boolean) => void
}

export function useImBridgeData(options?: { refreshConfigOnEvent?: boolean }): ImBridgeData {
  const [config, setConfig] = useState<ImBridgeConfig>()
  const [state, setState] = useState<ImBridgeState>({ status: 'stopped', logs: [] })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const available = typeof window.customOpenCode?.imBridgeConfig === 'function'

  useEffect(() => {
    if (!available) return
    let disposed = false
    const refreshConfig = () => {
      void window.customOpenCode.imBridgeConfig()
        .then(nextConfig => {
          if (!disposed) setConfig(nextConfig)
        })
        .catch(error => {
          if (!disposed) setMessage(error instanceof Error ? error.message : String(error))
        })
    }
    // 初始加载。config 可能在挂载后才被保存（例如应用启动时尚未配置），
    // 因此 footer 每次桥接状态变化时会重新拉取 config，避免弹窗显示过期的未启用状态。
    void window.customOpenCode.imBridgeState()
      .then(nextState => {
        if (!disposed) setState(nextState)
      })
      .catch(error => {
        if (!disposed) setMessage(error instanceof Error ? error.message : String(error))
      })
    refreshConfig()
    return window.customOpenCode.onImBridgeStateChanged(nextState => {
      setState(nextState)
      if (options?.refreshConfigOnEvent) refreshConfig()
    })
  }, [available])

  return { available, config, state, message, busy, setConfig, setMessage, setBusy }
}

// 从侧车日志中解析各平台连接状态：
// "Channel feishu started" -> 已连接；"Channel feishu failed to start" -> 连接失败。
// 启用了但还没有成功/失败日志的平台视为连接中。
export function imBridgePlatformInfos(config: ImBridgeConfig | undefined, logs: string[]): Record<ImBridgePlatformId, ImBridgePlatformInfo> {
  const result = {} as Record<ImBridgePlatformId, ImBridgePlatformInfo>
  for (const id of IMBRIDGE_PLATFORM_IDS) {
    let status: ImBridgePlatformStatus = 'connecting'
    for (const line of logs) {
      if (line.includes(`Channel ${id} started`)) status = 'connected'
      else if (line.includes(`Channel ${id} failed to start`)) status = 'failed'
    }
    result[id] = { enabled: config?.[id]?.enabled ?? false, status }
  }
  return result
}
