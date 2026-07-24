import { describe, expect, test } from 'bun:test'
import {
  computeExpandedPageRange,
  EXPANDED_PAGE_RADIUS,
  PAGE_MESSAGE_COUNT,
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
})
