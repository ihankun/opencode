export interface ComposerDraftInsertion {
  sessionId: string
  text: string
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
