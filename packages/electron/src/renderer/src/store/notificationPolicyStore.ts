import { useSyncExternalStore } from 'react'

export interface NotificationPolicy {
  quietEnabled: boolean
  quietStart: string
  quietEnd: string
  maxPerMinute: number
  groupBySession: boolean
  channels: { system: boolean; inApp: boolean; sound: boolean }
}

const STORAGE_KEY = 'opencodex:notification-policy'
const defaults: NotificationPolicy = {
  quietEnabled: false,
  quietStart: '22:00',
  quietEnd: '08:00',
  maxPerMinute: 8,
  groupBySession: true,
  channels: { system: true, inApp: true, sound: true },
}

function loadPolicy(): NotificationPolicy {
  try {
    return normalizeNotificationPolicy(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'))
  } catch {
    return defaults
  }
}

class NotificationPolicyStore {
  private state = loadPolicy()
  private subscribers = new Set<() => void>()
  private deliveries: number[] = []

  subscribe = (callback: () => void) => {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }
  getSnapshot = () => this.state
  set(value: Partial<NotificationPolicy>) {
    this.state = { ...this.state, ...value, channels: { ...this.state.channels, ...value.channels } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    this.subscribers.forEach(callback => callback())
  }
  canDeliver(channel: keyof NotificationPolicy['channels'], options?: { bypassQuiet?: boolean }) {
    if (!this.state.channels[channel]) return false
    if (!options?.bypassQuiet && this.state.quietEnabled && isQuietAt(this.state, new Date())) return false
    const now = Date.now()
    this.deliveries = this.deliveries.filter(timestamp => now - timestamp < 60_000)
    if (this.deliveries.length >= this.state.maxPerMinute) return false
    this.deliveries.push(now)
    return true
  }
}

export function normalizeNotificationPolicy(value: Partial<NotificationPolicy>): NotificationPolicy {
  return {
    ...defaults,
    ...value,
    maxPerMinute: Math.max(1, Math.min(60, Number(value.maxPerMinute) || defaults.maxPerMinute)),
    channels: { ...defaults.channels, ...value.channels },
  }
}

export function isQuietAt(policy: NotificationPolicy, at: Date) {
  const minutes = at.getHours() * 60 + at.getMinutes()
  const parse = (value: string) => {
    const [hour, minute] = value.split(':').map(Number)
    return hour * 60 + minute
  }
  const start = parse(policy.quietStart)
  const end = parse(policy.quietEnd)
  if (start === end) return true
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end
}

export const notificationPolicyStore = new NotificationPolicyStore()

export function useNotificationPolicy() {
  return useSyncExternalStore(notificationPolicyStore.subscribe, notificationPolicyStore.getSnapshot)
}
