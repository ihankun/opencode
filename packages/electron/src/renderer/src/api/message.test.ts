import { describe, expect, test } from 'bun:test'
import { extractUserMessageContent } from './message'

describe('session reference message recovery', () => {
  test('restores a linked session attachment without exposing hidden transcript text', () => {
    const result = extractUserMessageContent({
      parts: [
        {
          id: 'part_visible',
          sessionID: 'ses_current',
          messageID: 'msg_current',
          type: 'text',
          text: '#架构讨论 总结一下这个会话',
        },
        {
          id: 'part_reference',
          sessionID: 'ses_current',
          messageID: 'msg_current',
          type: 'text',
          text: '<referenced-session>hidden transcript</referenced-session>',
          synthetic: true,
          metadata: {
            'opencodex.sessionReference': {
              id: 'ses_reference',
              title: '架构讨论',
              directory: '/workspace/project',
              text: {
                value: '#架构讨论',
                start: 0,
                end: 5,
              },
            },
          },
        },
      ],
    })

    expect(result.text).toBe('#架构讨论 总结一下这个会话')
    expect(result.text).not.toContain('hidden transcript')
    expect(result.attachments).toEqual([
      expect.objectContaining({
        type: 'session',
        displayName: '架构讨论',
        sessionId: 'ses_reference',
        sessionDirectory: '/workspace/project',
        textRange: {
          value: '#架构讨论',
          start: 0,
          end: 5,
        },
      }),
    ])
  })
})
