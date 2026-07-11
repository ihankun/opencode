import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon, GoalAgentIcon, PauseIcon, PlayIcon, TrashIcon } from '../../../components/Icons'
import { clearGoal, getGoal, setGoalStatus, type GoalInfo } from '../../../api/goal'
import { getSessionTodos } from '../../../api/session'
import { todoStore, useCurrentTask, useTodoStats } from '../../../store'

interface GoalStatusBarProps {
  sessionId?: string | null
  rootPath?: string
  isStreaming?: boolean
}

function formatElapsed(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h`
}

function shouldShowGoal(goal: GoalInfo | null) {
  return goal?.status === 'active' || goal?.status === 'paused'
}

export function GoalStatusBar({ sessionId, rootPath, isStreaming }: GoalStatusBarProps) {
  const { t } = useTranslation('chat')
  const [goal, setGoal] = useState<GoalInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const stats = useTodoStats(sessionId ?? null)
  const currentTask = useCurrentTask(sessionId ?? null)
  const visible = shouldShowGoal(goal)
  const elapsed = useMemo(() => (goal ? formatElapsed(Date.now() - goal.createdAt * 1000) : ''), [goal, isStreaming])
  const hasTodos = stats.total > 0
  const progressLabel = hasTodos ? t('goalBar.tasks', { done: stats.completed, total: stats.total }) : t('goalBar.step', { step: goal?.step })
  const statusLabel = currentTask?.content || goal?.statusMessage || t('goalBar.noStatus')

  const refreshGoal = useCallback(async () => {
    if (!sessionId) {
      setGoal(null)
      return
    }

    try {
      setGoal(await getGoal(sessionId, rootPath))
    } catch {
      setGoal(null)
    }
  }, [rootPath, sessionId])

  useEffect(() => {
    void refreshGoal()
  }, [refreshGoal])

  useEffect(() => {
    if (!sessionId) return

    void getSessionTodos(sessionId, rootPath)
      .then(todos => todoStore.setTodos(sessionId, todos))
      .catch(() => {})
  }, [rootPath, sessionId])

  useEffect(() => {
    if (!sessionId) return

    const interval = window.setInterval(() => {
      void refreshGoal()
    }, isStreaming ? 1500 : 4000)
    return () => window.clearInterval(interval)
  }, [isStreaming, refreshGoal, sessionId])

  const toggleGoal = useCallback(async () => {
    if (!sessionId || !goal || busy) return

    setBusy(true)
    try {
      setGoal(await setGoalStatus(sessionId, goal.status === 'paused' ? 'active' : 'paused', rootPath))
    } finally {
      setBusy(false)
    }
  }, [busy, goal, rootPath, sessionId])

  const removeGoal = useCallback(async () => {
    if (!sessionId || busy) return

    setBusy(true)
    try {
      await clearGoal(sessionId, rootPath)
      setGoal(null)
      setDetailsOpen(false)
    } finally {
      setBusy(false)
    }
  }, [busy, rootPath, sessionId])

  if (!visible || !goal) return null

  return (
    <div className="pointer-events-auto absolute bottom-full left-0 right-0 z-20 mb-2 flex justify-center px-2">
      <div className="relative flex w-full max-w-[calc(100%-2rem)] items-center gap-2 rounded-2xl border border-border-200/70 bg-bg-000/95 px-3 py-2 text-[length:var(--fs-sm)] shadow-lg backdrop-blur-md">
        <GoalAgentIcon size={15} className="shrink-0 text-orange-500" />
        <span className="shrink-0 font-semibold text-text-100">
          {goal.status === 'paused' ? t('goalBar.paused') : t('goalBar.active')}
        </span>
        <span className="min-w-0 flex-1 truncate text-text-300">{goal.objective}</span>
        <span className="hidden max-w-[18rem] truncate text-text-400 md:inline">{statusLabel}</span>
        <span className="shrink-0 tabular-nums text-text-300">{progressLabel}</span>
        <span className="shrink-0 text-text-400">{elapsed}</span>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-400 transition-colors hover:bg-bg-200 hover:text-text-100 disabled:opacity-50"
          aria-label={goal.status === 'paused' ? t('goalBar.resume') : t('goalBar.pause')}
          disabled={busy}
          onClick={toggleGoal}
        >
          {goal.status === 'paused' ? <PlayIcon size={15} /> : <PauseIcon size={15} />}
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-400 transition-colors hover:bg-bg-200 hover:text-danger-100 disabled:opacity-50"
          aria-label={t('goalBar.clear')}
          disabled={busy}
          onClick={removeGoal}
        >
          <TrashIcon size={15} />
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-400 transition-colors hover:bg-bg-200 hover:text-text-100"
          aria-label={t('goalBar.details')}
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen(value => !value)}
        >
          <ChevronRightIcon size={15} className={detailsOpen ? 'rotate-90 transition-transform' : 'transition-transform'} />
        </button>

        {detailsOpen && (
          <div className="absolute bottom-full right-2 mb-2 w-80 rounded-xl border border-border-200/70 bg-bg-000/98 p-3 text-[length:var(--fs-xs)] shadow-xl backdrop-blur-md">
            <div className="mb-1 font-semibold text-text-100">{goal.objective}</div>
            <div className="text-text-300">
              {statusLabel}
            </div>
            <div className="mt-2 flex items-center justify-between text-text-500">
              <span>{progressLabel}</span>
              <span>{t('goalBar.started', { elapsed })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
