const STORAGE_KEY = 'opencodex:questionAutoContinue'
const FIVE_MINUTES_MS = 5 * 60 * 1000

/** 助手提问后自动继续的等待时长：超时未作答则自动 reject 让助手继续 */
export const QUESTION_AUTO_CONTINUE_TIMEOUT_MS = FIVE_MINUTES_MS

function loadInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

let enabled = loadInitial()
const listeners = new Set<() => void>()

function publish(next: boolean) {
  enabled = next
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    // 持久化失败不影响内存状态
  }
  listeners.forEach(listener => listener())
}

export const questionAutoContinueStore = {
  get enabled() {
    return enabled
  },
  getSnapshot() {
    return enabled
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  setEnabled(next: boolean) {
    if (next === enabled) return
    publish(next)
  },
}
