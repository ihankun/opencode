import { describe, expect, test } from 'bun:test'
import { composerDraftStore } from './composerDraftStore'
import type { Attachment } from '../features/attachment'

describe('composerDraftStore', () => {
  test('saves and restores a draft per paneId', () => {
    composerDraftStore.saveDraft('pane-1', { text: 'hello', attachments: [] })
    expect(composerDraftStore.getDraft('pane-1')).toEqual({ text: 'hello', attachments: [] })
    expect(composerDraftStore.getDraft('pane-2')).toBeUndefined()
  })

  test('overwrites existing draft for the same paneId', () => {
    composerDraftStore.saveDraft('pane-1', { text: 'first', attachments: [] })
    composerDraftStore.saveDraft('pane-1', { text: 'second', attachments: [] })
    expect(composerDraftStore.getDraft('pane-1')?.text).toBe('second')
  })

  test('ignores identical drafts to keep state stable', () => {
    const attachments: Attachment[] = []
    composerDraftStore.saveDraft('pane-1', { text: 'same', attachments })
    const before = composerDraftStore.getDraft('pane-1')
    composerDraftStore.saveDraft('pane-1', { text: 'same', attachments })
    expect(composerDraftStore.getDraft('pane-1')).toBe(before)
  })

  test('stores attachment references', () => {
    const attachment: Attachment = { id: 'a', type: 'file', displayName: 'x.ts', relativePath: 'x.ts' }
    composerDraftStore.saveDraft('pane-1', { text: '', attachments: [attachment] })
    expect(composerDraftStore.getDraft('pane-1')?.attachments).toContain(attachment)
  })

  test('clears a draft', () => {
    composerDraftStore.saveDraft('pane-1', { text: 'hello', attachments: [] })
    composerDraftStore.clearDraft('pane-1')
    expect(composerDraftStore.getDraft('pane-1')).toBeUndefined()
  })

  test('clearDraft is a no-op for unknown paneIds', () => {
    composerDraftStore.clearDraft('pane-missing')
    expect(composerDraftStore.getDraft('pane-missing')).toBeUndefined()
  })
})
