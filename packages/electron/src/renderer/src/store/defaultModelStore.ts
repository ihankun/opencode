import { useSyncExternalStore } from 'react'
import { STORAGE_KEY_DEFAULT_MODEL } from '../constants'
import { serverStorage } from '../utils/perServerStorage'
import { serverStore } from './serverStore'

type Listener = () => void

function loadDefaultModelKey() {
  return serverStorage.get(STORAGE_KEY_DEFAULT_MODEL)
}

class DefaultModelStore {
  private modelKey = loadDefaultModelKey()
  private listeners = new Set<Listener>()

  constructor() {
    serverStore.onServerChange(() => {
      this.modelKey = loadDefaultModelKey()
      this.notify()
    })
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.modelKey

  set(modelKey: string | null) {
    if (this.modelKey === modelKey) return
    this.modelKey = modelKey
    if (modelKey) {
      serverStorage.set(STORAGE_KEY_DEFAULT_MODEL, modelKey)
    } else {
      serverStorage.remove(STORAGE_KEY_DEFAULT_MODEL)
    }
    this.notify()
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }
}

export const defaultModelStore = new DefaultModelStore()

export function useDefaultModelKey() {
  return useSyncExternalStore(defaultModelStore.subscribe, defaultModelStore.getSnapshot)
}
