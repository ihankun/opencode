type Listener = () => void

interface NavigationEntry {
  utilityPage: string | null
  hash: string
}

let entries: NavigationEntry[] = []
let index = -1
const listeners = new Set<Listener>()

export function initNavigation(hash: string) {
  entries = [{ utilityPage: null, hash }]
  index = 0
}

export function pushNavigation(entry: NavigationEntry) {
  entries = entries.slice(0, index + 1)
  if (entries.length > 0 && entries[entries.length - 1].utilityPage === entry.utilityPage && entries[entries.length - 1].hash === entry.hash) return
  entries.push(entry)
  index = entries.length - 1
  emit()
}

export function goBack(): NavigationEntry | undefined {
  if (index <= 0) return undefined
  index--
  emit()
  return entries[index]
}

export function goForward(): NavigationEntry | undefined {
  if (index >= entries.length - 1) return undefined
  index++
  emit()
  return entries[index]
}

export function canGoBack() {
  return index > 0
}

export function canGoForward() {
  return index < entries.length - 1
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function emit() {
  for (const l of listeners) l()
}
