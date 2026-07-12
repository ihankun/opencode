import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react'
import {
  getSessions,
  createSession as apiCreateSession,
  archiveSession as apiArchiveSession,
  subscribeToEvents,
  isScheduledTaskSession,
  type ApiSession,
  type SessionListParams,
} from '../api'
import { todoStore } from '../store/todoStore'
import { serverStore } from '../store/serverStore'
import { pinnedSessionsStore } from '../store/pinnedSessionsStore'
import { useDirectory } from './useDirectory'
import { sessionErrorHandler, normalizeToForwardSlash, isSameDirectory, autoDetectPathStyle } from '../utils'
import { clearSessionRuntimeState } from '../utils/sessionLifecycle'
import { SessionContext, type SessionContextValue } from './SessionContext.shared'

export function SessionProvider({ children }: { children: ReactNode }) {
  const { currentDirectory, pathInfo } = useDirectory()

  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')

  const requestIdRef = useRef(0)
  const searchTimerRef = useRef<number | null>(null)
  const searchRef = useRef(search)
  const isLoadingMoreRef = useRef(false) // 防止并发 loadMore
  const isFetchingRef = useRef(false) // 防止 onReconnected 密集触发时重复请求
  const queuedReconnectRefreshRef = useRef(false)
  const retryTimerRef = useRef<number | null>(null)
  const scheduledSessionIdsRef = useRef(new Set<string>())
  const effectiveDirectoryRef = useRef<string | undefined>(undefined)
  const fetchSessionsRef = useRef<
    (params?: SessionListParams & { append?: boolean; retryAttempt?: number }) => Promise<void>
  >(() => Promise.resolve())
  const currentLimitRef = useRef(30) // 当前 limit，loadMore 时递增
  const effectiveDirectory = useMemo(
    () => normalizeToForwardSlash(currentDirectory || pathInfo?.directory) || undefined,
    [currentDirectory, pathInfo?.directory],
  )

  useEffect(() => {
    effectiveDirectoryRef.current = effectiveDirectory
  }, [effectiveDirectory])

  useEffect(() => {
    searchRef.current = search
  }, [search])

  // 核心获取逻辑
  // 注意：directory 传给 getSessions 时使用正斜杠格式
  // http 层的 fetchWithBothSlashesAndMerge 会处理两种斜杠格式的兼容
  const fetchSessions = useCallback(
    async (params: SessionListParams & { append?: boolean; retryAttempt?: number } = {}) => {
      const { append = false, retryAttempt = 0, ...queryParams } = params
      const requestId = ++requestIdRef.current
      isFetchingRef.current = true

      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        // 使用正斜杠格式传给 API（http 层会处理兼容）
        const targetDir = effectiveDirectory

        if (!targetDir) {
          if (!append) {
            setSessions([])
            setHasMore(false)
          }
          return
        }

        const [sessionData, taskRuns] = await Promise.all([
          getSessions({
            roots: true,
            limit: currentLimitRef.current,
            directory: targetDir,
            search: search || undefined,
            ...queryParams,
          }),
          typeof window.customOpenCode?.listTaskRuns === 'function' ? window.customOpenCode.listTaskRuns() : Promise.resolve([]),
        ])
        scheduledSessionIdsRef.current = new Set(taskRuns.map(run => run.sessionID))
        const data = sessionData.filter(session => !isScheduledTaskSession(session) && !scheduledSessionIdsRef.current.has(session.id))

        if (requestId !== requestIdRef.current) return

        // 自动检测路径风格（从后端返回的 directory 字段）
        if (data.length > 0 && data[0].directory) {
          autoDetectPathStyle(data[0].directory)
        }

        if (append) {
          // 去重：过滤掉已存在的 session
          setSessions(prev => {
            const existingIds = new Set(prev.map(s => s.id))
            const newSessions = data.filter(s => !existingIds.has(s.id))
            return [...prev, ...newSessions]
          })
        } else {
          setSessions(data)
        }
        setHasMore(sessionData.length >= currentLimitRef.current)
      } catch (e) {
        if (requestId === requestIdRef.current && !append) {
          if (retryAttempt < 3) {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
            retryTimerRef.current = window.setTimeout(() => {
              if (requestId !== requestIdRef.current) return
              void fetchSessions({ ...queryParams, retryAttempt: retryAttempt + 1 })
            }, [500, 1500, 3000][retryAttempt])
          } else {
            setSessions([])
            setHasMore(false)
          }
        }
        sessionErrorHandler('fetch sessions', e)
      } finally {
        if (requestId === requestIdRef.current) {
          isFetchingRef.current = false
          setIsLoading(false)
          setIsLoadingMore(false)
          if (queuedReconnectRefreshRef.current) {
            queuedReconnectRefreshRef.current = false
            setSessions([])
            void fetchSessionsRef.current({ search: searchRef.current || undefined })
          }
        }
      }
    },
    [effectiveDirectory, search],
  )

  // 保持 fetchSessions ref 同步（用于 SSE onReconnected 回调）
  fetchSessionsRef.current = fetchSessions

  const matchesCurrentDirectory = useCallback((session: ApiSession) => {
    return !!effectiveDirectoryRef.current && isSameDirectory(effectiveDirectoryRef.current, session.directory)
  }, [])

  // 监听 directory 和 search 变化
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    // 切换目录或搜索时重置 limit
    currentLimitRef.current = 30

    searchTimerRef.current = window.setTimeout(
      () => {
        fetchSessions()
      },
      search ? 300 : 0,
    )

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [fetchSessions, search, effectiveDirectory])

  // 订阅 SSE 事件，实时更新 session 列表
  useEffect(() => {
    const unsubscribe = subscribeToEvents({
      onSessionCreated: session => {
        if (isScheduledTaskSession(session) || scheduledSessionIdsRef.current.has(session.id)) return
        // 忽略子 session（有 parentID 的是子 agent 创建的）
        if (session.parentID) return

        if (!matchesCurrentDirectory(session)) return

        // 搜索态下交给服务端重新给出结果，避免本地过滤和服务端逻辑不一致
        if (searchRef.current) {
          fetchSessionsRef.current()
          return
        }

        setSessions(prev => {
          if (prev.some(s => s.id === session.id)) return prev
          return [session, ...prev]
        })
      },
      onSessionUpdated: session => {
        if (isScheduledTaskSession(session) || scheduledSessionIdsRef.current.has(session.id)) {
          if (typeof window.customOpenCode?.setTaskRunArchived === 'function') void window.customOpenCode.setTaskRunArchived(session.id, Boolean(session.time.archived))
          setSessions(prev => prev.filter(item => item.id !== session.id))
          return
        }
        if (session.parentID) return
        if (session.time.archived) {
          setSessions(prev => prev.filter(item => item.id !== session.id))
          return
        }

        if (searchRef.current) {
          if (matchesCurrentDirectory(session)) {
            fetchSessionsRef.current()
          } else {
            setSessions(prev => prev.filter(s => s.id !== session.id))
          }
          return
        }

        setSessions(prev => {
          const index = prev.findIndex(s => s.id === session.id)

          if (!matchesCurrentDirectory(session)) {
            return index === -1 ? prev : prev.filter(s => s.id !== session.id)
          }

          if (index === -1) {
            return [session, ...prev]
          }

          const updated = prev.filter(s => s.id !== session.id)
          return [session, ...updated]
        })
      },
      onTodoUpdated: data => {
        // 更新 todoStore
        todoStore.setTodos(data.sessionID, data.todos)
      },
      onSessionDeleted: sessionId => {
        if (scheduledSessionIdsRef.current.has(sessionId) && typeof window.customOpenCode?.setTaskRunArchived === 'function') void window.customOpenCode.setTaskRunArchived(sessionId, true)
        clearSessionRuntimeState(sessionId)
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      },
      onReconnected: reason => {
        if (reason === 'server-switch') return
        if (isFetchingRef.current) {
          queuedReconnectRefreshRef.current = true
          return
        }
        setSessions([])
        fetchSessionsRef.current()
      },
    })

    return unsubscribe
  }, [matchesCurrentDirectory])

  useEffect(() => {
    if (typeof window.customOpenCode?.listTaskRuns !== 'function') return
    const refreshScheduledSessions = () => void window.customOpenCode.listTaskRuns().then(runs => {
      scheduledSessionIdsRef.current = new Set(runs.map(run => run.sessionID))
      setSessions(prev => prev.filter(session => !scheduledSessionIdsRef.current.has(session.id)))
    })
    refreshScheduledSessions()
    return window.customOpenCode.onTasksChanged(refreshScheduledSessions)
  }, [])

  useEffect(() => {
    return serverStore.onServerChange(() => {
      currentLimitRef.current = 30
      setSessions([])
      void fetchSessionsRef.current()
    })
  }, [])

  // Actions
  const refresh = useCallback(() => fetchSessions(), [fetchSessions])

  const loadMore = useCallback(async () => {
    // 使用 ref 检查，防止并发请求
    if (isLoadingMoreRef.current || !hasMore || sessions.length === 0) return
    isLoadingMoreRef.current = true

    try {
      // 跟官方 webui 一样，递增 limit 重新请求整个列表
      currentLimitRef.current += 15
      setIsLoadingMore(true)
      await fetchSessions()
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [hasMore, sessions, fetchSessions])

  const createSession = useCallback(
    async (title?: string) => {
      // 使用正斜杠格式传给后端
      const targetDir = effectiveDirectory

      const newSession = await apiCreateSession({
        title,
        directory: targetDir,
      })
      return newSession
    },
    [effectiveDirectory],
  )

  const deleteSession = useCallback(
    async (id: string) => {
      const targetDir = effectiveDirectory
      await apiArchiveSession(id, targetDir)
      if (typeof window.customOpenCode?.setTaskRunArchived === 'function') await window.customOpenCode.setTaskRunArchived(id, true)
      pinnedSessionsStore.unpin(id)
      clearSessionRuntimeState(id)
      setSessions(prev => prev.filter(s => s.id !== id))
    },
    [effectiveDirectory],
  )

  // 稳定化 Provider value，避免每次渲染创建新对象导致子组件不必要重渲染
  const value = useMemo<SessionContextValue>(
    () => ({
      sessions,
      isLoading,
      isLoadingMore,
      hasMore,
      search,
      setSearch,
      refresh,
      loadMore,
      createSession,
      deleteSession,
    }),
    [sessions, isLoading, isLoadingMore, hasMore, search, refresh, loadMore, createSession, deleteSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
