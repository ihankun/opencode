export const PROJECT_SESSION_PREVIEW_LIMIT = 5

export function projectSessionsForDisplay<T>(sessions: T[], expanded: boolean, searching: boolean) {
  if (expanded || searching) return sessions
  return sessions.slice(0, PROJECT_SESSION_PREVIEW_LIMIT)
}

export function collapsedProjectSessionPreviews(expandedPreviewIds: readonly string[], expandedProjectIds: readonly string[]) {
  return expandedPreviewIds.filter(id => expandedProjectIds.includes(id))
}
