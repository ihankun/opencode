const STORAGE_KEY = 'opencodex:onboarding-completed'

// 暂时禁用首次启动的引导弹窗，等引导功能重新设计后再启用
const ONBOARDING_DISABLED = true

export function shouldShowOnboarding(storage: Pick<Storage, 'getItem'> = localStorage) {
  if (ONBOARDING_DISABLED) return false
  return storage.getItem(STORAGE_KEY) !== 'true'
}

export function completeOnboarding(storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(STORAGE_KEY, 'true')
}

export function resetOnboarding(storage: Pick<Storage, 'removeItem'> = localStorage) {
  storage.removeItem(STORAGE_KEY)
}
