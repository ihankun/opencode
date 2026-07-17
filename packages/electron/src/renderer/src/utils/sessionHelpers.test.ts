import { describe, expect, test } from 'bun:test'
import type { ApiSession } from '../api'
import { areSessionListsSame } from './sessionHelpers'

function session(id: string, updated: number): ApiSession {
  return {
    id,
    slug: id,
    projectID: 'project',
    directory: '/workspace',
    title: `Session ${id}`,
    version: '1',
    time: { created: 1, updated },
  }
}

describe('session list equality', () => {
  test('treats separately parsed unchanged sessions as equal', () => {
    expect(areSessionListsSame([session('a', 2)], [session('a', 2)])).toBe(true)
  })

  test('detects changes that affect the sidebar', () => {
    expect(areSessionListsSame([session('a', 2)], [session('a', 3)])).toBe(false)
    expect(areSessionListsSame([session('a', 2)], [session('b', 2)])).toBe(false)
  })
})
