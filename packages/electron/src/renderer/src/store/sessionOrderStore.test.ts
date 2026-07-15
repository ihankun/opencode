import { describe, expect, test } from 'bun:test'
import { applySessionOrder, mergeSessionOrder } from './sessionOrderStore'

describe('session order helpers', () => {
  test('applies saved order and appends new sessions in source order', () => {
    expect(applySessionOrder([{ id: 'new' }, { id: 'b' }, { id: 'a' }], ['a', 'b'])).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'new' },
    ])
  })

  test('keeps unloaded session ids when saving a visible reorder', () => {
    expect(mergeSessionOrder(['a', 'b', 'c', 'd'], ['c', 'a', 'b'])).toEqual(['c', 'a', 'b', 'd'])
  })
})
