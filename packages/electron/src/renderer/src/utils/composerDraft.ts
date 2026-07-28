export interface ComposerDraftInsertion {
  sessionId?: string
  paneId?: string
  text: string
  mode?: 'append' | 'replace'
}

const EVENT_NAME = 'opencodex:composer-draft-insert'

export function insertComposerDraft(detail: ComposerDraftInsertion) {
  window.dispatchEvent(new CustomEvent<ComposerDraftInsertion>(EVENT_NAME, { detail }))
}

export function onComposerDraftInsertion(listener: (detail: ComposerDraftInsertion) => void) {
  const handle = (event: Event) => listener((event as CustomEvent<ComposerDraftInsertion>).detail)
  window.addEventListener(EVENT_NAME, handle)
  return () => window.removeEventListener(EVENT_NAME, handle)
}

export function matchesComposerDraftInsertion(
  insertion: ComposerDraftInsertion,
  target: { sessionId?: string | null; paneId: string },
) {
  if (insertion.paneId) return insertion.paneId === target.paneId
  return Boolean(insertion.sessionId && insertion.sessionId === target.sessionId)
}

export function applyComposerDraftInsertion(current: string, insertion: ComposerDraftInsertion) {
  if (insertion.mode === 'replace') return insertion.text
  return current.trim() ? `${current.trimEnd()}\n\n${insertion.text}` : insertion.text
}
