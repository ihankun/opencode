const STORAGE_KEY = 'opencodex:onboarding-completed'

export function shouldShowOnboarding(storage: Pick<Storage, 'getItem'> = localStorage) {
  return storage.getItem(STORAGE_KEY) !== 'true'
}

export function completeOnboarding(storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(STORAGE_KEY, 'true')
}

export function resetOnboarding(storage: Pick<Storage, 'removeItem'> = localStorage) {
  storage.removeItem(STORAGE_KEY)
}
