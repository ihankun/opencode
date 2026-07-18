import { describe, expect, test } from 'bun:test'
import { isScheduledTaskSession } from './session'

describe('automation session detection', () => {
  test('recognizes current and legacy automation titles', () => {
    expect(isScheduledTaskSession({ title: '[自动化] Daily summary' })).toBe(true)
    expect(isScheduledTaskSession({ title: '[定时任务] Daily summary' })).toBe(true)
    expect(isScheduledTaskSession({ title: 'Daily summary' })).toBe(false)
  })
})
