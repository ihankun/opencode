import { describe, expect, test } from 'bun:test'
import { completeOnboarding, resetOnboarding, shouldShowOnboarding } from './onboardingStore'

describe('onboarding state', () => {
  test('is temporarily disabled until the guide is redesigned', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    expect(shouldShowOnboarding(storage)).toBe(false)
    completeOnboarding(storage)
    expect(shouldShowOnboarding(storage)).toBe(false)
    resetOnboarding(storage)
    expect(shouldShowOnboarding(storage)).toBe(false)
  })
})
