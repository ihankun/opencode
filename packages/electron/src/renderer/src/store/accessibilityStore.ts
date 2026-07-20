import { useSyncExternalStore } from 'react'

export interface AccessibilitySettings {
  reducedMotion: boolean
  highContrast: boolean
  largeTargets: boolean
  visibleFocus: boolean
}

const STORAGE_KEY = 'opencodex:accessibility'
const defaults: AccessibilitySettings = {
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  highContrast: matchMedia('(prefers-contrast: more)').matches,
  largeTargets: false,
  visibleFocus: true,
}

function load(): AccessibilitySettings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } } catch { return defaults }
}

class AccessibilityStore {
  private state = load()
  private listeners = new Set<() => void>()
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  getSnapshot = () => this.state
  init() { this.apply() }
  set(value: Partial<AccessibilitySettings>) {
    this.state = { ...this.state, ...value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    this.apply()
    this.listeners.forEach(listener => listener())
  }
  private apply() {
    const root = document.documentElement
    root.toggleAttribute('data-reduced-motion', this.state.reducedMotion)
    root.toggleAttribute('data-high-contrast', this.state.highContrast)
    root.toggleAttribute('data-large-targets', this.state.largeTargets)
    root.toggleAttribute('data-visible-focus', this.state.visibleFocus)
  }
}

export const accessibilityStore = new AccessibilityStore()
export function useAccessibilitySettings() { return useSyncExternalStore(accessibilityStore.subscribe, accessibilityStore.getSnapshot) }
