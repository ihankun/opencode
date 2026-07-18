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

async function fetchModels(serverId: string, force = false) {
  const pending = fetchPromises.get(serverId)
  if (pending && !force) return pending
  const current = stateFor(serverId)
  if (!force && current.models.length > 0 && !current.error) return

  const generation = (fetchGenerations.get(serverId) ?? 0) + 1
  fetchGenerations.set(serverId, generation)
  const promise = (async () => {
    setState(serverId, { isLoading: true, error: null })
    try {
      for (const [index, delay] of FETCH_RETRY_DELAYS.entries()) {
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
        if (generation !== fetchGenerations.get(serverId)) return
        try {
          await getSDKClientAsync(serverId)
          const models = await getActiveModels(undefined, serverId)
          if (models.length === 0) throw new Error('Server returned no active models')
          if (generation === fetchGenerations.get(serverId)) setState(serverId, { models, isLoading: false, error: null })
          return
        } catch (error) {
          if (generation !== fetchGenerations.get(serverId)) return
          const normalized = error instanceof Error ? error : new Error('Failed to fetch models')
          if (index === FETCH_RETRY_DELAYS.length - 1) {
            console.error(`[models:${serverId}] Failed to fetch models after retries:`, normalized)
            setState(serverId, { error: normalized, isLoading: false })
            return
          }
          console.warn(`[models:${serverId}] Failed to fetch models, retrying (${index + 1}/${FETCH_RETRY_DELAYS.length}):`, normalized)
        }
      }
    } finally {
      if (generation === fetchGenerations.get(serverId)) fetchPromises.delete(serverId)
    }
  })()

  fetchPromises.set(serverId, promise)
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
  queueMicrotask(() => void fetchModels(serverId, reason !== 'server-switch'))
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
