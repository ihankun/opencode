import { describe, expect, test } from 'bun:test'
import {
  buildChatPages,
  computeExpandedPageRange,
  EXPANDED_PAGE_RADIUS,
  PAGE_MESSAGE_COUNT,
  retainNearbyPageSelection,
  resolveAtBottomState,
  type ChatPage,
} from './chatPageModel'

function page(key: string, height = 100): ChatPage {
  return {
    key,
    rows: [],
    messageIds: [key],
    estimatedHeight: height,
  }
}

describe('chat page virtualization', () => {
  test('uses smaller pages and keeps one neighboring page mounted', () => {
    expect(PAGE_MESSAGE_COUNT).toBe(12)
    expect(EXPANDED_PAGE_RADIUS).toBe(1)

    expect(
      computeExpandedPageRange({
        pages: [page('a'), page('b'), page('c'), page('d')],
        measuredPageHeights: {},
        scrollOffsetFromBottom: 110,
        viewportHeight: 40,
      }),
    ).toEqual({ startIndex: 0, endIndex: 2 })
  })

  test('does not reattach to the bottom after a layout-only scroll clamp', () => {
    expect(
      resolveAtBottomState({
        previous: false,
        distanceFromBottom: 0,
        threshold: 60,
        allowReattach: false,
      }),
    ).toBe(false)

    expect(
      resolveAtBottomState({
        previous: false,
        distanceFromBottom: 0,
        threshold: 60,
        allowReattach: true,
      }),
    ).toBe(true)
  })

  test('keeps only the immediately adjacent previous page mounted while the range settles', () => {
    expect(Array.from(retainNearbyPageSelection(new Set([4, 5, 6]), new Set([2, 3, 4, 5])))).toEqual([4, 5, 6, 3])
  })

  test('estimates long assistant text from content instead of only counting parts', () => {
    const message = {
      info: {
        id: 'assistant',
        sessionID: 'session',
        role: 'assistant' as const,
        time: { created: 1, completed: 2 },
        parentID: 'user',
        modelID: 'model',
        providerID: 'provider',
        mode: 'build',
        agent: 'build',
        path: { cwd: '/tmp', root: '/tmp' },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      },
      parts: [
        {
          id: 'text',
          sessionID: 'session',
          messageID: 'assistant',
          type: 'text' as const,
          text: Array.from({ length: 80 }, (_, index) => `Long markdown line ${index}`).join('\n'),
        },
      ],
    }

    expect(buildChatPages([message])[0].estimatedHeight).toBeGreaterThan(1000)
  })
})
