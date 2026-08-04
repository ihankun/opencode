// ============================================
// NotificationStore - Toast + 通知历史
// ============================================
//
// 统一管理所有通知：
// 1. Toast 弹窗（右上角，8 秒自动消失，悬停暂停）
// 2. 通知历史（持久化到 localStorage，显示在 Active tab 的 Notifications 区域）
//
// 由 useGlobalEvents 统一推送，不再由 activeSessionStore 管通知

import { useSyncExternalStore } from 'react'
import { notificationPolicyStore } from './notificationPolicyStore'

// ============================================
// Types
// ============================================

export type NotificationType = 'permission' | 'question' | 'completed' | 'error'

/** push 后的回调，用于声音播放等扩展 */
export type NotificationPushListener = (type: NotificationType) => void

export interface NotificationEntry {
  id: string
  type: NotificationType
  title: string
  body: string
  sessionId: string
  directory?: string
  timestamp: number
  read: boolean
}

export interface ToastItem {
  notification: NotificationEntry
  exiting: boolean
}

export interface NotificationPreferencesBackup {
  toastEnabled: boolean
}

interface NotificationState {
  toasts: ToastItem[]
  notifications: NotificationEntry[]
}

type Subscriber = () => void

// ============================================
// Constants
// ============================================

const TOAST_DURATION = 8000
const MAX_TOASTS = 3
const EXIT_ANIMATION_MS = 200
const TOAST_ENABLED_KEY = 'opencode:toast-enabled'
const MAX_NOTIFICATIONS = 50
const LEGACY_STORAGE_KEY = 'opencode:notifications'

// ============================================
// 历史数据 helpers
// ============================================

function loadLegacyNotifications(): NotificationEntry[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as NotificationEntry[]).slice(0, MAX_NOTIFICATIONS)
  } catch {
    return []
  }
}

function normalizeNotification(value: unknown): NotificationEntry | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || typeof item.title !== 'string') return null
  return {
    id: item.id,
    type: (item.type as NotificationType) || 'completed',
    title: item.title,
    body: typeof item.body === 'string' ? item.body : '',
    sessionId: typeof item.sessionId === 'string' ? item.sessionId : '',
    directory: typeof item.directory === 'string' ? item.directory : undefined,
    timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
    read: item.read === true,
  }
}

// ============================================
// Store
// ============================================

class NotificationStore {
  private state: NotificationState = {
    toasts: [],
    notifications: [],
  }
  private subscribers = new Set<Subscriber>()
  private toastTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private pushListeners = new Set<NotificationPushListener>()
  private initialized = false

  /** toast 弹窗总开关 */
  toastEnabled: boolean = (() => {
    try {
      return localStorage.getItem(TOAST_ENABLED_KEY) !== 'false'
    } catch {
      return true
    }
  })()

  subscribe = (callback: Subscriber): (() => void) => {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  private notify() {
    this.subscribers.forEach(cb => cb())
  }

  private persist() {
    try {
      window.customOpenCode?.notificationHistoryReplaceAll(this.state.notifications)?.catch(() => undefined)
    } catch {
      // ignore persistence failures
    }
  }

  /** 从 SQLite 加载历史（启动时调用一次），并迁移旧 localStorage 数据 */
  async init() {
    if (this.initialized) return
    this.initialized = true
    try {
      const stored = await window.customOpenCode?.notificationHistoryList()
      const entries = Array.isArray(stored)
        ? stored.map(normalizeNotification).filter((entry): entry is NotificationEntry => entry !== null)
        : []

      // SQLite 为空时迁移旧的 localStorage 数据（一次性，迁移后清除旧 key）
      if (entries.length === 0) {
        const legacy = loadLegacyNotifications()
        if (legacy.length > 0) {
          this.state = { ...this.state, notifications: legacy }
          this.persist()
          this.notify()
        }
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch {
          // ignore
        }
        return
      }

      const byId = new Map(this.state.notifications.map(entry => [entry.id, entry]))
      for (const entry of entries) {
        if (!byId.has(entry.id)) byId.set(entry.id, entry)
      }
      const notifications = [...byId.values()]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_NOTIFICATIONS)
      this.state = { ...this.state, notifications }
      this.notify()
    } catch {
      // ignore load failures
    }
  }

  getSnapshot = (): NotificationState => this.state

  setToastEnabled(enabled: boolean) {
    this.toastEnabled = enabled
    try {
      localStorage.setItem(TOAST_ENABLED_KEY, String(enabled))
    } catch {
      // Ignore storage write failures.
    }
    // 关闭时清掉当前所有 toast
    if (!enabled) this.dismissAllToasts()
  }

  /** 注册 push 后回调（声音播放等） */
  onPush(listener: NotificationPushListener): () => void {
    this.pushListeners.add(listener)
    return () => this.pushListeners.delete(listener)
  }

  // ============================================
  // 推送通知（加历史 + 弹 toast）
  // ============================================

  push(type: NotificationType, title: string, body: string, sessionId: string, directory?: string) {
    const entry: NotificationEntry = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      body,
      sessionId,
      directory,
      timestamp: Date.now(),
      read: false,
    }

    const grouped = notificationPolicyStore.getSnapshot().groupBySession && sessionId
      ? this.state.notifications.find(item => item.sessionId === sessionId && item.type === type && Date.now() - item.timestamp < 120_000)
      : undefined
    const notifications = grouped
      ? [{ ...grouped, title, body, timestamp: Date.now(), read: false }, ...this.state.notifications.filter(item => item.id !== grouped.id)].slice(0, MAX_NOTIFICATIONS)
      : [entry, ...this.state.notifications].slice(0, MAX_NOTIFICATIONS)

    // 弹 toast（仅开关打开时）
    const showToast = this.toastEnabled && notificationPolicyStore.canDeliver('inApp')
    if (showToast) {
      const toasts = [...this.state.toasts]
      if (toasts.length >= MAX_TOASTS) {
        const oldest = toasts.pop()
        if (oldest) this.clearToastTimer(oldest.notification.id)
      }
      toasts.unshift({ notification: grouped ? notifications[0] : entry, exiting: false })
      this.state = { ...this.state, toasts, notifications }
      this.persist()
      this.notify()
      this.scheduleToastDismiss(grouped ? notifications[0].id : entry.id)
    } else {
      this.state = { ...this.state, notifications }
      this.persist()
      this.notify()
    }

    // 触发 push 后回调（声音播放等）
    if (notificationPolicyStore.canDeliver('sound')) this.pushListeners.forEach(fn => {
      try {
        fn(type)
      } catch {
        // 回调异常不影响通知流程
      }
    })
  }

  // ============================================
  // 用户交互（通知历史）
  // ============================================

  markRead(id: string) {
    const notifications = this.state.notifications.map(n => (n.id === id && !n.read ? { ...n, read: true } : n))
    this.state = { ...this.state, notifications }
    this.persist()
    this.notify()
  }

  markAllRead() {
    const notifications = this.state.notifications.map(n => (n.read ? n : { ...n, read: true }))
    this.state = { ...this.state, notifications }
    this.persist()
    this.notify()
  }

  markSessionNotificationsRead(sessionId: string, type?: NotificationType) {
    let changed = false
    const notifications = this.state.notifications.map(n => {
      if (n.sessionId !== sessionId) return n
      if (type && n.type !== type) return n
      if (n.read) return n
      changed = true
      return { ...n, read: true }
    })
    if (!changed) return
    this.state = { ...this.state, notifications }
    this.persist()
    this.notify()
  }

  dismiss(id: string) {
    const notifications = this.state.notifications.filter(n => n.id !== id)
    this.state = { ...this.state, notifications }
    this.persist()
    this.notify()
  }

  clearAll() {
    this.state = { ...this.state, notifications: [] }
    this.persist()
    this.notify()
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  // ============================================
  // Toast 管理
  // ============================================

  private scheduleToastDismiss(id: string) {
    this.clearToastTimer(id)
    const timer = setTimeout(() => this.dismissToast(id), TOAST_DURATION)
    this.toastTimers.set(id, timer)
  }

  private clearToastTimer(id: string) {
    const timer = this.toastTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.toastTimers.delete(id)
    }
  }

  pauseToast(id: string) {
    this.clearToastTimer(id)
  }

  resumeToast(id: string) {
    const exists = this.state.toasts.some(t => t.notification.id === id && !t.exiting)
    if (exists) {
      this.scheduleToastDismiss(id)
    }
  }

  dismissToast(id: string) {
    this.clearToastTimer(id)
    const toasts = this.state.toasts.map(t => (t.notification.id === id ? { ...t, exiting: true } : t))
    this.state = { ...this.state, toasts }
    this.notify()

    setTimeout(() => {
      this.state = {
        ...this.state,
        toasts: this.state.toasts.filter(t => t.notification.id !== id),
      }
      this.notify()
    }, EXIT_ANIMATION_MS)
  }

  dismissAllToasts() {
    this.toastTimers.forEach(timer => clearTimeout(timer))
    this.toastTimers.clear()
    this.state = { ...this.state, toasts: [] }
    this.notify()
  }
}

// ============================================
// 单例 & React Hooks
// ============================================

export const notificationStore = new NotificationStore()

void notificationStore.init()

export function exportNotificationPreferencesBackup(): NotificationPreferencesBackup {
  return {
    toastEnabled: notificationStore.toastEnabled,
  }
}

export function importNotificationPreferencesBackup(raw: unknown): void {
  const parsed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : undefined
  const toastEnabled = typeof parsed?.toastEnabled === 'boolean' ? parsed.toastEnabled : true
  notificationStore.setToastEnabled(toastEnabled)
}

export function useNotificationStore() {
  return useSyncExternalStore(notificationStore.subscribe, notificationStore.getSnapshot)
}

/** 通知历史列表 */
export function useNotifications(): NotificationEntry[] {
  const state = useNotificationStore()
  return state.notifications
}

/** 未读通知数 */
export function useUnreadNotificationCount(): number {
  const state = useNotificationStore()
  return state.notifications.filter(n => !n.read).length
}

/** 未读 completed 通知对应的 sessionId 集合 */
export function useUnreadCompletedSessionIds(): Set<string> {
  const state = useNotificationStore()
  return new Set(state.notifications.filter(n => n.type === 'completed' && !n.read).map(n => n.sessionId))
}

/** 某个 session 是否有未读 completed 通知 */
export function useHasUnreadCompletedNotification(sessionId: string): boolean {
  const unreadCompletedSessionIds = useUnreadCompletedSessionIds()
  return unreadCompletedSessionIds.has(sessionId)
}
