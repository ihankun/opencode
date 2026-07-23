import { useEffect, useSyncExternalStore } from 'react'
import {
  DEFAULT_DESKTOP_PREFERENCES,
  normalizeDesktopPreferences,
  type DesktopPreferences,
} from '../../../shared/desktopPreferences'

let preferences = { ...DEFAULT_DESKTOP_PREFERENCES }
let loading: Promise<DesktopPreferences> | undefined
const listeners = new Set<() => void>()

function publish(next: DesktopPreferences) {
  preferences = next
  listeners.forEach(listener => listener())
  return preferences
}

export const desktopPreferencesStore = {
  getSnapshot() {
    return preferences
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  load() {
    if (!window.customOpenCode?.desktopPreferences) return Promise.resolve(preferences)
    if (loading) return loading
    loading = window.customOpenCode.desktopPreferences()
      .then(value => publish(normalizeDesktopPreferences(value)))
      .finally(() => {
        loading = undefined
      })
    return loading
  },
  async update(patch: Partial<DesktopPreferences>) {
    const previous = preferences
    const next = publish(normalizeDesktopPreferences({ ...preferences, ...patch }))
    if (!window.customOpenCode?.updateDesktopPreferences) return next
    return window.customOpenCode.updateDesktopPreferences(next)
      .then(value => publish(normalizeDesktopPreferences(value)))
      .catch(error => {
        publish(previous)
        throw error
      })
  },
}

export function useDesktopPreferences() {
  const snapshot = useSyncExternalStore(
    desktopPreferencesStore.subscribe,
    desktopPreferencesStore.getSnapshot,
    desktopPreferencesStore.getSnapshot,
  )

  useEffect(() => {
    void desktopPreferencesStore.load()
  }, [])

  return snapshot
}
