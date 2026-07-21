import { describe, expect, test } from 'bun:test'
import { completeOnboarding, resetOnboarding, shouldShowOnboarding } from './onboardingStore'

describe('onboarding state', () => {
  test('shows until completed and can be restarted', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    expect(shouldShowOnboarding(storage)).toBe(true)
    completeOnboarding(storage)
    expect(shouldShowOnboarding(storage)).toBe(false)
    resetOnboarding(storage)
    expect(shouldShowOnboarding(storage)).toBe(true)
  })
})
