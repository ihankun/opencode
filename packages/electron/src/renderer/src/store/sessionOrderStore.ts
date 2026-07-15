import { serverStorage } from '../utils/perServerStorage'
import { serverStore } from './serverStore'

const STORAGE_KEY = 'opencode-session-orders'

type SessionOrders = Record<string, string[]>

function readOrders(): SessionOrders {
  const saved = serverStorage.getJSON<unknown>(STORAGE_KEY)
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {}

  return Object.fromEntries(
    Object.entries(saved).flatMap(([scope, order]) => {
      if (!Array.isArray(order) || !order.every(id => typeof id === 'string')) return []
      return [[scope, order]]
    }),
  )
}

export function mergeSessionOrder(previous: string[], visible: string[]) {
  const visibleSet = new Set(visible)
  return [...visible, ...previous.filter(id => !visibleSet.has(id))]
}

export function applySessionOrder<T extends { id: string }>(items: T[], order: string[]) {
  const itemById = new Map(items.map(item => [item.id, item]))
  const ordered = order.flatMap(id => {
    const item = itemById.get(id)
    if (!item) return []
    itemById.delete(id)
    return [item]
  })
  return [...ordered, ...items.filter(item => itemById.has(item.id))]
}

class SessionOrderStore {
  private orders = readOrders()
  private version = 0
  private listeners = new Set<() => void>()

  constructor() {
    serverStore.onServerChange((_, reason) => {
      if (reason !== 'server-switch') return
      this.orders = readOrders()
      this.emit()
    })
  }

  order<T extends { id: string }>(scope: string, items: T[]) {
    return applySessionOrder(items, this.orders[scope] ?? [])
  }

  set(scope: string, visibleOrder: string[]) {
    const next = mergeSessionOrder(this.orders[scope] ?? [], visibleOrder)
    if (next.length === this.orders[scope]?.length && next.every((id, index) => id === this.orders[scope][index])) {
      return
    }

    this.orders = { ...this.orders, [scope]: next }
    serverStorage.setJSON(STORAGE_KEY, this.orders)
    this.emit()
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getVersion = () => this.version

  private emit() {
    this.version += 1
    this.listeners.forEach(listener => listener())
  }
}

export const sessionOrderStore = new SessionOrderStore()
