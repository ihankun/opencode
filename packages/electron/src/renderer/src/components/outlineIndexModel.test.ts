import { describe, expect, test } from 'bun:test'
import { findActiveOutlineIndex, rankOutlineVisibleMessageIds } from './outlineIndexModel'

describe('outline visibility ranking', () => {
  test('uses the message crossing the stable activation line as the active item', () => {
    expect(
      rankOutlineVisibleMessageIds(
        [
          { messageId: 'turn-4', top: 0, bottom: 260 },
          { messageId: 'turn-5', top: 260, bottom: 520 },
        ],
        100,
        500,
      ),
    ).toEqual(['turn-4', 'turn-5'])
  })

  test('does not depend on IntersectionObserver entry order', () => {
    const ranked = rankOutlineVisibleMessageIds(
      [
        { messageId: 'turn-5-answer', top: 360, bottom: 620 },
        { messageId: 'turn-4-answer', top: 40, bottom: 360 },
      ],
      100,
      600,
    )
    const ownerByMessageId = new Map([
      ['turn-4-answer', 'turn-4'],
      ['turn-5-answer', 'turn-5'],
    ])

    expect(ranked).toEqual(['turn-4-answer', 'turn-5-answer'])
    expect(
      findActiveOutlineIndex(
        [
          { messageId: 'turn-4' },
          { messageId: 'turn-5' },
        ],
        ranked,
        ownerByMessageId,
      ),
    ).toBe(0)
  })
})
