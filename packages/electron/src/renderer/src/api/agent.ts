// ============================================
// Agent API Functions
// 基于 @opencode-ai/sdk: /agent 相关接口
// ============================================

import { getSDKClient, unwrap } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'
import { disposeInstance } from './global'
import { serverStore } from '../store/serverStore'
import type { ApiAgent } from './types'

const changeListeners = new Set<() => void>()

export function onAgentsChanged(listener: () => void) {
  changeListeners.add(listener)
  return () => {
    changeListeners.delete(listener)
  }
}

export function notifyAgentsChanged() {
  changeListeners.forEach(listener => listener())
}

/**
 * 获取 agent 列表
 */
export async function getAgents(directory?: string): Promise<ApiAgent[]> {
  const sdk = getSDKClient()
  return unwrap(await sdk.app.agents({ directory: formatPathForApi(directory) }))
}

/**
 * 获取可选择的 agent 列表（过滤掉 hidden 的）
 */
export async function getSelectableAgents(directory?: string): Promise<ApiAgent[]> {
  const agents = await getAgents(directory)
  return agents.filter(agent => !agent.hidden)
}

/**
 * 删除 agent 配置（直接从全局或项目配置文件中移除条目）。
 */
export async function removeAgent(input: { scope: 'global' | 'project'; directory?: string; name: string }): Promise<{ changed: boolean; file: string }> {
  const result = await window.customOpenCode.removeAgentConfig(input)
  if (!result.changed) return result
  if (input.scope === 'project') {
    await disposeInstance(input.directory)
  } else {
    // 全局配置在服务器端有独立缓存（cachedGlobal），主进程直接改文件后需重启服务器重建缓存
    const state = await window.customOpenCode.restartServer()
    if (state.status === 'online') serverStore.setLocalServerRuntimeUrl(state.server.url)
  }
  notifyAgentsChanged()
  return result
}
