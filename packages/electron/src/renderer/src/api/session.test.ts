import { describe, expect, test } from 'bun:test'
import { isExternalChannelSession, isScheduledTaskSession } from './session'

describe('automation session detection', () => {
  test('recognizes current and legacy automation titles', () => {
    expect(isScheduledTaskSession({ title: '[自动化] Daily summary' })).toBe(true)
    expect(isScheduledTaskSession({ title: '[定时任务] Daily summary' })).toBe(true)
    expect(isScheduledTaskSession({ title: 'Daily summary' })).toBe(false)
  })
})

describe('external channel session detection', () => {
  test('recognizes sessions tagged by the IM bridge', () => {
    expect(isExternalChannelSession({ metadata: { 'opencodex.externalChannels': ['feishu'] } })).toBe(true)
    expect(isExternalChannelSession({ metadata: { 'opencodex.externalChannels': ['qq', 'feishu'] } })).toBe(true)
    expect(isExternalChannelSession({ metadata: { 'opencodex.externalChannels': [] } })).toBe(false)
    expect(isExternalChannelSession({ metadata: {} })).toBe(false)
    expect(isExternalChannelSession({})).toBe(false)
  })
})
