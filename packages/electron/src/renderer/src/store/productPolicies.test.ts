import { describe, expect, test } from 'bun:test'
import { isQuietAt, normalizeNotificationPolicy } from './notificationPolicyStore'
import { normalizeProjectDirectory, parseProjectProfiles } from './projectProfileStore'

describe('product policy stores', () => {
  test('normalizes project paths and rejects malformed profiles', () => {
    expect(normalizeProjectDirectory('C:\\Work\\Demo\\')).toBe('c:/work/demo')
    expect(parseProjectProfiles({ profiles: { broken: { directory: 3 } } })).toEqual({})
  })

  test('clamps notification rate and merges channel defaults', () => {
    const policy = normalizeNotificationPolicy({ maxPerMinute: 999, channels: { system: false } as never })
    expect(policy.maxPerMinute).toBe(60)
    expect(policy.channels).toEqual({ system: false, inApp: true, sound: true })
  })

  test('supports quiet hours spanning midnight', () => {
    const policy = normalizeNotificationPolicy({ quietEnabled: true, quietStart: '22:00', quietEnd: '08:00' })
    expect(isQuietAt(policy, new Date(2026, 0, 1, 23, 30))).toBe(true)
    expect(isQuietAt(policy, new Date(2026, 0, 1, 12, 0))).toBe(false)
  })
})
