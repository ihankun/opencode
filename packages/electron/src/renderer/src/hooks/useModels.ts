import { useSyncExternalStore, useCallback } from 'react'
import { getActiveModels, type ModelInfo } from '../api'
import { getSDKClientAsync } from '../api/sdk'
import { serverStore } from '../store/serverStore'

// ============================================
// Global singleton so every ChatPane shares one models array.
// Prevents duplicate API requests and the race condition where a
// late-mounting pane sees an empty models list, falls back to
// models[0], and overwrites the persisted model selection.
// ============================================

interface ModelsState {
  models: ModelInfo[]
  isLoading: boolean
  error: Error | null
}

type Listener = () => void

let _state: ModelsState = { models: [], isLoading: true, error: null }
let _fetchPromise: Promise<void> | null = null
let _fetchGeneration = 0
const _listeners = new Set<Listener>()
const FETCH_RETRY_DELAYS = [0, 500, 1500]

function _notify() {
  for (const fn of _listeners) fn()
}

function _setState(patch: Partial<ModelsState>) {
  _state = { ..._state, ...patch }
  _notify()
}

async function _fetchModels(force = false) {
  if (_fetchPromise && !force) return _fetchPromise

  const generation = ++_fetchGeneration

  _fetchPromise = (async () => {
    _setState({ isLoading: true, error: null })

    try {
      for (const [index, delay] of FETCH_RETRY_DELAYS.entries()) {
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
        if (generation !== _fetchGeneration) return

        try {
          await getSDKClientAsync()
          const data = await getActiveModels()
          if (data.length === 0) throw new Error('Server returned no active models')
          if (generation === _fetchGeneration) {
            _setState({ models: data, isLoading: false })
          }
          return
        } catch (error) {
          if (generation !== _fetchGeneration) return
          const normalizedError = error instanceof Error ? error : new Error('Failed to fetch models')
          const finalAttempt = index === FETCH_RETRY_DELAYS.length - 1
          if (finalAttempt) {
            console.error('[models] Failed to fetch models after retries:', normalizedError)
            _setState({ error: normalizedError, isLoading: false })
            return
          }
          console.warn(`[models] Failed to fetch models, retrying (${index + 1}/${FETCH_RETRY_DELAYS.length}):`, normalizedError)
        }
      }
    } finally {
      if (generation === _fetchGeneration) {
        _fetchPromise = null
      }
    }
  })()

  return _fetchPromise
}

export function refreshModels() {
  return _fetchModels(true)
}

export function initializeModels() {
  return _fetchModels()
}

serverStore.onServerChange(() => {
  // Other server-change listeners abort stale requests and invalidate the SDK client.
  // Start the model refresh after all synchronous listeners have completed.
  queueMicrotask(() => void refreshModels())
})

function _subscribe(listener: Listener) {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

function _getSnapshot(): ModelsState {
  return _state
}

// ============================================
// Hook — drop-in replacement, same return type
// ============================================

interface UseModelsResult {
  models: ModelInfo[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useModels(): UseModelsResult {
  const state = useSyncExternalStore(_subscribe, _getSnapshot)
  const refetch = useCallback(() => refreshModels(), [])

  return {
    models: state.models,
    isLoading: state.isLoading,
    error: state.error,
    refetch,
  }
}
