import { apiFetchJson } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'

export interface GoalHistoryEntry {
  type: string
  detail: string
  timestamp: number
}

export interface GoalInfo {
  sessionID: string
  objective: string
  status: 'active' | 'paused' | 'complete' | 'blocked'
  step: number
  statusMessage: string | null
  createdAt: number
  updatedAt: number
  pausedAt: number | null
  completedAt: number | null
  evidence: string | null
  blocker: string | null
  history: GoalHistoryEntry[]
}

function experimentalPath(path: string, directory?: string): string {
  const formatted = formatPathForApi(directory)
  if (!formatted) return path

  const params = new URLSearchParams({ directory: formatted })
  return `${path}?${params.toString()}`
}

function goalPath(sessionId: string, suffix = '') {
  return `/experimental/goal/${encodeURIComponent(sessionId)}${suffix}`
}

export async function getGoal(sessionId: string, directory?: string): Promise<GoalInfo | null> {
  return apiFetchJson<{ goal: GoalInfo | null }>(experimentalPath(goalPath(sessionId), directory)).then(result => result.goal)
}

export async function setGoalStatus(
  sessionId: string,
  status: 'active' | 'paused',
  directory?: string,
): Promise<GoalInfo | null> {
  return apiFetchJson<{ goal: GoalInfo | null }>(experimentalPath(goalPath(sessionId, '/status'), directory), {
    method: 'POST',
    body: JSON.stringify({ status }),
  }).then(result => result.goal)
}

export async function clearGoal(sessionId: string, directory?: string): Promise<boolean> {
  return apiFetchJson<boolean>(experimentalPath(goalPath(sessionId), directory), {
    method: 'DELETE',
  })
}
