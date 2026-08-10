// ============================================
// SettingsStore - 设置页 tab 状态（离开设置页后保留）
// ============================================

import { useSyncExternalStore } from 'react'
import type { SettingsTab } from '../features/settings/SettingsDialog'

let tab: SettingsTab = 'servers'
const listeners = new Set<() => void>()

function getTab() {
  return tab
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setSettingsTab(next: SettingsTab) {
  if (next === tab) return
  tab = next
  for (const listener of listeners) listener()
}

export function useSettingsTab() {
  return useSyncExternalStore(subscribe, getTab, getTab)
}
