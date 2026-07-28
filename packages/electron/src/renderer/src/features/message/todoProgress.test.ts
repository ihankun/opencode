import { describe, expect, test } from 'bun:test'
import { summarizeTodoItems } from './todoProgress'

describe('turn todo progress', () => {
  test('keeps task content and selects the active task', () => {
    expect(summarizeTodoItems([
      { content: 'Inspect the component', status: 'completed' },
      { content: 'Add the hover card', status: 'in_progress' },
      { content: 'Verify the interaction', status: 'pending' },
    ])).toEqual({
      current: 2,
      total: 3,
      items: [
        { content: 'Inspect the component', status: 'completed' },
        { content: 'Add the hover card', status: 'in_progress' },
        { content: 'Verify the interaction', status: 'pending' },
      ],
    })
  })

  test('falls forward to the first pending task', () => {
    expect(summarizeTodoItems([
      { content: 'Done', status: 'completed' },
      { content: 'Next', status: 'pending' },
      { content: 'Later', status: 'pending' },
    ]).current).toBe(2)
  })
})
