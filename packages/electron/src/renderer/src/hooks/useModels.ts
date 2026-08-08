import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { getActiveModels, type ModelInfo } from '../api'
import { getSDKClientAsync } from '../api/sdk'
import { serverStore } from '../store/serverStore'

interface ModelsState {
  models: ModelInfo[]
  isLoading: boolean
  error: Error | null
}

type Listener = () => void

const initialState: ModelsState = { models: [], isLoading: true, error: null }
const states = new Map<string, ModelsState>()
const fetchPromises = new Map<string, Promise<void>>()
const fetchGenerations = new Map<string, number>()
const listeners = new Set<Listener>()
const FETCH_RETRY_DELAYS = [0, 500, 1500]
// 快速重试全部失败后的自动恢复间隔，超过后停止（保留 error，用户可手动刷新）
const RECOVERY_RETRY_DELAYS = [3000, 5000, 10000, 20000, 30000, 60000]
const recoveryTimers = new Map<string, ReturnType<typeof setTimeout>>()
const recoveryAttempts = new Map<string, number>()

function notify() {
  listeners.forEach(listener => listener())
}

function stateFor(serverId: string) {
  return states.get(serverId) ?? initialState
}

function setState(serverId: string, patch: Partial<ModelsState>) {
  states.set(serverId, { ...stateFor(serverId), ...patch })
  notify()
}

function clearRecovery(serverId: string) {
  const timer = recoveryTimers.get(serverId)
  if (timer !== undefined) {
    clearTimeout(timer)
    recoveryTimers.delete(serverId)
  }
}

function clearAllRecoveries() {
  for (const timer of recoveryTimers.values()) clearTimeout(timer)
  recoveryTimers.clear()
  recoveryAttempts.clear()
}

function scheduleRecovery(serverId: string, generation: number) {
  const attempt = recoveryAttempts.get(serverId) ?? 0
  if (attempt >= RECOVERY_RETRY_DELAYS.length) return
  const delay = RECOVERY_RETRY_DELAYS[attempt]
  recoveryAttempts.set(serverId, attempt + 1)
  recoveryTimers.set(
    serverId,
    setTimeout(() => {
      recoveryTimers.delete(serverId)
      if (fetchGenerations.get(serverId) !== generation) return
      void fetchModels(serverId, true, true)
    }, delay),
  )
}

async function fetchModels(serverId: string, force = false, isRecovery = false) {
  if (!isRecovery) recoveryAttempts.delete(serverId)
  const pending = fetchPromises.get(serverId)
  if (pending && !force) return pending
  const current = stateFor(serverId)
  if (!force && current.models.length > 0 && !current.error) return

  const generation = (fetchGenerations.get(serverId) ?? 0) + 1
  fetchGenerations.set(serverId, generation)
  const promise = (async () => {
    setState(serverId, { isLoading: true, error: null })
    for (const [index, delay] of FETCH_RETRY_DELAYS.entries()) {
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
      if (generation !== fetchGenerations.get(serverId)) return
      try {
        await getSDKClientAsync(serverId)
        const models = await getActiveModels(undefined, serverId)
        if (models.length === 0) throw new Error('Server returned no active models')
        if (generation === fetchGenerations.get(serverId)) {
          setState(serverId, { models, isLoading: false, error: null })
          clearRecovery(serverId)
          recoveryAttempts.delete(serverId)
        }
        return
      } catch (error) {
        if (generation !== fetchGenerations.get(serverId)) return
        const normalized = error instanceof Error ? error : new Error('Failed to fetch models')
        if (index === FETCH_RETRY_DELAYS.length - 1) {
          console.error(`[models:${serverId}] Failed to fetch models after retries:`, normalized)
          setState(serverId, { error: normalized, isLoading: false })
          scheduleRecovery(serverId, generation)
          return
        }
        console.warn(`[models:${serverId}] Failed to fetch models, retrying (${index + 1}/${FETCH_RETRY_DELAYS.length}):`, normalized)
      }
    }
  })()

  fetchPromises.set(serverId, promise)
  void promise.finally(() => {
    if (fetchPromises.get(serverId) === promise) fetchPromises.delete(serverId)
  })
  return promise
}

export function refreshModels(serverId = serverStore.getActiveServerId()) {
  return fetchModels(serverId, true)
}

export function initializeModels() {
  return fetchModels(serverStore.getActiveServerId())
}

serverStore.onServerChange((serverId, reason) => {
  if (reason !== 'server-switch') states.delete(serverId)
  if (reason === 'server-switch') clearAllRecoveries()
  else clearRecovery(serverId)
  queueMicrotask(() => void fetchModels(serverId, reason !== 'server-switch'))
})

// 服务器健康状态由非 online 转为 online 时，若模型仍处于失败/空状态，立即重试，
// 避免错过 server:updated 之后服务端尚未就绪导致的重试窗口
let previousHealthStatus = new Map<string, string>()
serverStore.subscribe(() => {
  const activeId = serverStore.getActiveServerId()
  for (const serverId of new Set([...states.keys(), activeId])) {
    const status = serverStore.getHealth(serverId)?.status ?? 'unknown'
    const wasOnline = previousHealthStatus.get(serverId) === 'online'
    previousHealthStatus.set(serverId, status)
    if (status !== 'online' || wasOnline) continue
    const state = stateFor(serverId)
    if (state.error || (!state.isLoading && state.models.length === 0)) {
      void fetchModels(serverId, true)
    }
  }
})

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

interface UseModelsResult {
  models: ModelInfo[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useModels(serverId?: string): UseModelsResult {
  const activeServerId = useSyncExternalStore(
    serverStore.subscribe.bind(serverStore),
    () => serverStore.getActiveServerId(),
    () => serverStore.getActiveServerId(),
  )
  const resolvedServerId = serverId ?? activeServerId
  const state = useSyncExternalStore(subscribe, () => stateFor(resolvedServerId), () => stateFor(resolvedServerId))

  useEffect(() => {
    void fetchModels(resolvedServerId)
  }, [resolvedServerId])

  const refetch = useCallback(() => refreshModels(resolvedServerId), [resolvedServerId])
  return { ...state, refetch }
}
