import type { Message } from '../types/message'
import { getMessageText, hasRenderableParts, isAbortedMessage, isUserMessage } from '../types/message'

const FULL_TITLE_MAX = 80

export interface OutlineSourceEntry {
  messageId: string
  title: string
}

export interface OutlineVisibleMessageRect {
  messageId: string
  top: number
  bottom: number
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + '\u2026'
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function messageHasContent(msg: Message): boolean {
  const hasRenderable = hasRenderableParts(msg)
  if (msg.info.role === 'assistant' && 'error' in msg.info && msg.info.error) {
    return isAbortedMessage(msg.info) ? hasRenderable : true
  }
  if (msg.parts.length === 0) return true
  return hasRenderable
}

export function truncateOutlineLabel(s: string, max: number): string {
  return truncate(s, max)
}

/**
 * Order visible messages around one stable activation line in the viewport.
 *
 * IntersectionObserver entry order is not visual order and may change while
 * virtual pages mount or resize. Keeping the message nearest the activation
 * line first gives the outline one deterministic owner instead of an
 * oscillating set of "visible" turns.
 */
export function rankOutlineVisibleMessageIds(
  rects: OutlineVisibleMessageRect[],
  viewportTop: number,
  viewportBottom: number,
): string[] {
  const visible = rects.filter(rect => rect.bottom > viewportTop && rect.top < viewportBottom)
  if (visible.length === 0) return []

  const activationY = viewportTop + (viewportBottom - viewportTop) * 0.35
  const distanceToActivationLine = (rect: OutlineVisibleMessageRect) => {
    if (rect.top <= activationY && rect.bottom >= activationY) return 0
    return Math.min(Math.abs(rect.top - activationY), Math.abs(rect.bottom - activationY))
  }
  const byVisualPosition = [...visible].sort((a, b) => a.top - b.top || a.bottom - b.bottom)
  const active = [...visible].sort(
    (a, b) =>
      distanceToActivationLine(a) - distanceToActivationLine(b) ||
      Math.abs(a.top - activationY) - Math.abs(b.top - activationY) ||
      a.top - b.top,
  )[0]

  return [active.messageId, ...byVisualPosition.filter(rect => rect.messageId !== active.messageId).map(rect => rect.messageId)]
}

export function findActiveOutlineIndex(
  entries: ReadonlyArray<{ messageId: string }>,
  rankedVisibleMessageIds: string[],
  ownerByMessageId: Map<string, string>,
): number {
  for (const messageId of rankedVisibleMessageIds) {
    const ownerId = ownerByMessageId.get(messageId)
    if (!ownerId) continue
    const index = entries.findIndex(entry => entry.messageId === ownerId)
    if (index !== -1) return index
  }
  return -1
}

export function buildOutlineSourceEntries(messages: Message[]): OutlineSourceEntry[] {
  const entries: OutlineSourceEntry[] = []
  for (const msg of messages.filter(messageHasContent)) {
    if (!isUserMessage(msg.info)) continue
    const raw =
      msg.info.summary?.title?.trim() ||
      getMessageText(msg)
        .trim()
        .split(/\r?\n/)
        .map(l => l.trim())
        .find(Boolean)
    if (!raw) continue
    const n = normalizeWhitespace(raw)
    entries.push({
      messageId: msg.info.id,
      title: truncate(n, FULL_TITLE_MAX),
    })
  }
  return entries
}
