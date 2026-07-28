import { describe, expect, test } from 'bun:test'
import { applyComposerDraftInsertion, matchesComposerDraftInsertion } from './composerDraft'

describe('composer draft insertion', () => {
  test('targets either a session or an empty pane', () => {
    expect(matchesComposerDraftInsertion(
      { sessionId: 'session-1', text: 'review this' },
      { sessionId: 'session-1', paneId: 'pane-1' },
    )).toBe(true)
    expect(matchesComposerDraftInsertion(
      { paneId: 'pane-1', text: 'start here' },
      { sessionId: null, paneId: 'pane-1' },
    )).toBe(true)
    expect(matchesComposerDraftInsertion(
      { paneId: 'pane-2', text: 'wrong pane' },
      { sessionId: null, paneId: 'pane-1' },
    )).toBe(false)
  })

  test('replaces deep-link prompts without changing append behavior', () => {
    expect(applyComposerDraftInsertion('existing draft', {
      paneId: 'pane-1',
      text: 'deep-link prompt',
      mode: 'replace',
    })).toBe('deep-link prompt')
    expect(applyComposerDraftInsertion('existing draft', {
      sessionId: 'session-1',
      text: 'review note',
    })).toBe('existing draft\n\nreview note')
  })
})
