import { useCallback, useMemo, useState, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SessionList } from '../../sessions'
import { FolderRecentList } from './FolderRecentList'
import { getProjectGroupIdentity } from './projectGrouping'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { ActiveSessionItem } from './ActiveSessionItem'
import { NotificationItem } from './NotificationItem'
import { SidebarFooter } from './SidebarFooter'
import { SessionSearchDialog } from './SessionSearchDialog'
import { buildActiveSessionTree } from './activeSessionTree'
import {
  FolderIcon,
  GlobeIcon,
  PlusIcon,
  TrashIcon,
  SearchIcon,
  PencilIcon,
  CheckIcon,
  CloseIcon,
  SpinnerIcon,
  ChevronRightIcon,
  TeachIcon,
  PlugIcon,
} from '../../../components/Icons'
import { useDirectory, useSessionStats, useKeybindingLabel, useGitWorkspaceCatalog, useVcsInfo } from '../../../hooks'
import { useSessionContext } from '../../../contexts/useSessionContext'
import { useLayoutStore, useMessageStore, childSessionStore } from '../../../store'
import { useBusySessions, useBusyCount } from '../../../store/activeSessionStore'
import { notificationStore, useNotifications, useUnreadNotificationCount } from '../../../store/notificationStore'
import { pinnedSessionsStore } from '../../../store/pinnedSessionsStore'
import type { NotificationEntry } from '../../../store/notificationStore'
import {
  updateSession,
  deleteSession as apiDeleteSession,
  getSession,
  getSessions,
  subscribeToConnectionState,
  type ApiSession,
  type ConnectionInfo,
} from '../../../api'
import { getDirectoryName, isSameDirectory, normalizeToForwardSlash } from '../../../utils'
import { uiErrorHandler } from '../../../utils'

// 侧边栏设计模式：
// - 按钮结构统一，不因 expanded/collapsed 改变 DOM
// - 按钮内容使用 -translate-x-2 让图标在收起时居中
// - 文字用 opacity 过渡，不改变布局
// - 收起宽度 49px，展开宽度 288px

interface SidePanelProps {
  onNewSession: () => void
  onSelectSession: (session: ApiSession) => void
  onCloseMobile?: () => void
  selectedSessionId: string | null
  onAddProject: () => void
  onOpenSkills?: () => void
  onOpenMcp?: () => void
  isMobile?: boolean
  isExpanded?: boolean
  contextLimit?: number
  onOpenSettings?: () => void
}

interface ProjectItem {
  id: string
  worktree: string
  name: string
  canReorder?: boolean
  memberDirectories?: string[]
  reorderPath?: string
  workspaceDirectories?: string[]
  sectionKind?: 'project' | 'workspace'
}

function getSelectionRange(visibleIds: string[], anchorId: string, targetId: string) {
  const startIndex = visibleIds.indexOf(anchorId)
  const endIndex = visibleIds.indexOf(targetId)

  if (startIndex === -1 || endIndex === -1) return null

  const from = Math.min(startIndex, endIndex)
  const to = Math.max(startIndex, endIndex)
  return visibleIds.slice(from, to + 1)
}

function findProjectGroupForDirectory(projects: ProjectItem[], directory: string) {
  return projects.find(project => {
    if (isSameDirectory(project.id, directory) || isSameDirectory(project.worktree, directory)) {
      return true
    }

    if (project.workspaceDirectories?.some(workspace => isSameDirectory(workspace, directory))) {
      return true
    }

    if (project.memberDirectories?.some(memberDirectory => isSameDirectory(memberDirectory, directory))) {
      return true
    }

    return false
  })
}

function areSessionListsSame(a: ApiSession[], b: ApiSession[]) {
  if (a.length !== b.length) return false
  return a.every((session, index) => session.id === b[index]?.id && session.title === b[index]?.title)
}

export function SidePanel({
  onNewSession,
  onSelectSession,
  onCloseMobile,
  selectedSessionId,
  onAddProject,
  onOpenSkills,
  onOpenMcp,
  isMobile = false,
  isExpanded = true,
  contextLimit = 200000,
  onOpenSettings,
}: SidePanelProps) {
  const { t } = useTranslation(['chat', 'common'])
  const {
    currentDirectory,
    savedDirectories,
    setCurrentDirectory,
    removeDirectory,
    addDirectory,
    reorderDirectories,
    recentProjects,
    pathInfo,
  } = useDirectory()
  const catalogDirectories = useMemo(
    () =>
      Array.from(
        new Set(
          savedDirectories
            .map(directory => normalizeToForwardSlash(directory.path))
            .concat(currentDirectory ? [normalizeToForwardSlash(currentDirectory)] : []),
        ),
      ),
    [savedDirectories, currentDirectory],
  )
  const { catalog: gitWorkspaceCatalog, isLoading: isGitWorkspaceCatalogLoading } =
    useGitWorkspaceCatalog(catalogDirectories)
  const { vcsInfo: currentDirectoryVcsInfo, isLoading: isCurrentDirectoryVcsLoading } = useVcsInfo(currentDirectory)
  const { sidebarFolderRecents, sidebarShowChildSessions } = useLayoutStore()
  const normalizedCurrentDirectory = useMemo(
    () => (currentDirectory ? normalizeToForwardSlash(currentDirectory) : undefined),
    [currentDirectory],
  )
  const [connectionState, setConnectionState] = useState<ConnectionInfo | null>(null)
  const [projectDeleteConfirm, setProjectDeleteConfirm] = useState<{ isOpen: boolean; projectId: string | null }>({
    isOpen: false,
    projectId: null,
  })
  const [sidebarTab, setSidebarTab] = useState<'recents' | 'active'>('recents')
  const [expandedRecentProjectIds, setExpandedRecentProjectIds] = useState<string[]>([])
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([])
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)

  // ---- 编辑模式状态 ----
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set())
  const sessionSelectionAnchorIdRef = useRef<string | null>(null)
  const projectSelectionAnchorIdRef = useRef<string | null>(null)
  const recentsSelectionRootRef = useRef<HTMLDivElement>(null)
  const projectsDropdownRef = useRef<HTMLDivElement>(null)
  // 批量删除确认弹窗
  const [batchDeleteSessionConfirm, setBatchDeleteSessionConfirm] = useState(false)
  const [batchRemoveProjectConfirm, setBatchRemoveProjectConfirm] = useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  const getVisibleSelectionIds = useCallback((kind: 'session' | 'project') => {
    const root = recentsSelectionRootRef.current
    if (!root) return []

    return Array.from(root.querySelectorAll<HTMLElement>(`[data-selection-kind="${kind}"]`))
      .filter(element => element.getClientRects().length > 0)
      .map(element => element.dataset.selectionId)
      .filter((id): id is string => Boolean(id))
  }, [])

  const toggleSessionSelection = useCallback(
    (sessionId: string, options?: { shiftKey?: boolean }) => {
      const anchorId = sessionSelectionAnchorIdRef.current
      const visibleIds = getVisibleSelectionIds('session')

      setSelectedSessionIds(prev => {
        if (options?.shiftKey && anchorId) {
          const range = getSelectionRange(visibleIds, anchorId, sessionId)
          if (range) {
            const next = new Set(prev)
            for (const id of range) next.add(id)
            return next
          }
        }

        const next = new Set(prev)
        if (next.has(sessionId)) next.delete(sessionId)
        else next.add(sessionId)
        return next
      })
      sessionSelectionAnchorIdRef.current = sessionId
    },
    [getVisibleSelectionIds],
  )

  const toggleProjectSelection = useCallback(
    (projectId: string, options?: { shiftKey?: boolean }) => {
      const anchorId = projectSelectionAnchorIdRef.current
      const visibleIds = getVisibleSelectionIds('project')

      setSelectedProjectIds(prev => {
        if (options?.shiftKey && anchorId) {
          const range = getSelectionRange(visibleIds, anchorId, projectId)
          if (range) {
            const next = new Set(prev)
            for (const id of range) next.add(id)
            return next
          }
        }

        const next = new Set(prev)
        if (next.has(projectId)) next.delete(projectId)
        else next.add(projectId)
        return next
      })
      projectSelectionAnchorIdRef.current = projectId
    },
    [getVisibleSelectionIds],
  )

  const exitEditMode = useCallback(() => {
    setIsEditMode(false)
    setSelectedSessionIds(new Set())
    setSelectedProjectIds(new Set())
    sessionSelectionAnchorIdRef.current = null
    projectSelectionAnchorIdRef.current = null
  }, [])

  const enterEditMode = useCallback(() => {
    setIsEditMode(true)
    sessionSelectionAnchorIdRef.current = null
    projectSelectionAnchorIdRef.current = null
  }, [])

  const showLabels = isExpanded || isMobile
  const newChatShortcut = useKeybindingLabel('newSession')

  // Session stats
  const { messages } = useMessageStore()
  const stats = useSessionStats(contextLimit)
  const hasMessages = messages.length > 0

  // Active sessions
  const busySessions = useBusySessions()
  const busyCount = useBusyCount()
  useSyncExternalStore(
    childSessionStore.subscribe.bind(childSessionStore),
    childSessionStore.getVersion,
    childSessionStore.getVersion,
  )
  // Notification history
  const notifications = useNotifications()
  const unreadNotificationCount = useUnreadNotificationCount()
  const attentionCount = busyCount + unreadNotificationCount

  useEffect(() => {
    return subscribeToConnectionState(setConnectionState)
  }, [])

  const { sessions, isLoading, isLoadingMore, hasMore, search, setSearch, loadMore, deleteSession, refresh } =
    useSessionContext()

  const pinnedEntries = useSyncExternalStore(
    pinnedSessionsStore.subscribe,
    pinnedSessionsStore.getSnapshot,
    pinnedSessionsStore.getSnapshot,
  )
  // 缓存通过 API 拉取的 session 数据（sessions 列表中不存在的）
  const [fetchedSessions, setFetchedSessions] = useState<Record<string, ApiSession>>({})
  const [defaultSessions, setDefaultSessions] = useState<{ sessions: ApiSession[]; isLoading: boolean }>({
    sessions: [],
    isLoading: false,
  })
  const [projectSessions, setProjectSessions] = useState<
    Record<string, { sessions: ApiSession[]; isLoading: boolean }>
  >({})
  const [unavailablePinnedSessionIds, setUnavailablePinnedSessionIds] = useState<Set<string>>(() => new Set())

  // 为 active sessions 构建 sessionId -> ApiSession 的查找表
  const sessionLookup = useMemo(() => {
    const map = new Map<string, ApiSession>()
    for (const s of sessions) {
      map.set(s.id, s)
    }
    for (const s of defaultSessions.sessions) {
      map.set(s.id, s)
    }
    // fetchedSessions 作为补充（其他项目的 session）
    for (const [id, s] of Object.entries(fetchedSessions)) {
      if (!map.has(id)) {
        map.set(id, s)
      }
    }
    return map
  }, [sessions, defaultSessions.sessions, fetchedSessions])

  const orderedSessions = useMemo(() => {
    const pinnedSet = new Set(pinnedEntries.map(e => e.sessionId))
    const pinned = pinnedEntries
      .map(entry => sessionLookup.get(entry.sessionId))
      .filter((session): session is ApiSession => Boolean(session))
    const rest = sessions.filter(s => !pinnedSet.has(s.id))
    return [...pinned, ...rest]
  }, [pinnedEntries, sessionLookup, sessions])
  const pinnedDividerAfterIds = useMemo(() => {
    const lastPinned = pinnedEntries
      .map(entry => sessionLookup.get(entry.sessionId))
      .filter((session): session is ApiSession => Boolean(session))
      .at(-1)
    if (!lastPinned) return undefined
    const pinnedSet = new Set(pinnedEntries.map(e => e.sessionId))
    return sessions.some(s => !pinnedSet.has(s.id)) ? new Set([lastPinned.id]) : undefined
  }, [pinnedEntries, sessionLookup, sessions])
  const resolvedPinnedSessions = useMemo(
    () =>
      pinnedEntries
        .map(entry => sessionLookup.get(entry.sessionId))
        .filter((session): session is ApiSession => Boolean(session)),
    [pinnedEntries, sessionLookup],
  )
  const unavailablePinnedEntries = useMemo(
    () =>
      pinnedEntries.filter(
        entry => unavailablePinnedSessionIds.has(entry.sessionId) && !sessionLookup.has(entry.sessionId),
      ),
    [pinnedEntries, sessionLookup, unavailablePinnedSessionIds],
  )

  // 异步拉取不在 lookup 中的 active/notification/pinned/selected session
  useEffect(() => {
    const allNeeded: Array<{ sessionId: string; directory?: string; pinned?: boolean }> = [
      ...busySessions.map(e => ({ sessionId: e.sessionId, directory: e.directory })),
      ...notifications.map(e => ({ sessionId: e.sessionId, directory: e.directory })),
      ...pinnedEntries.map(e => ({ sessionId: e.sessionId, directory: e.directory, pinned: true })),
    ]
    if (selectedSessionId && !sessionLookup.has(selectedSessionId)) {
      allNeeded.push({ sessionId: selectedSessionId, directory: currentDirectory || pathInfo?.directory || '' })
    }

    setUnavailablePinnedSessionIds(prev => {
      if (prev.size === 0) return prev
      let changed = false
      const next = new Set(prev)
      for (const entry of pinnedEntries) {
        if (sessionLookup.has(entry.sessionId) && next.delete(entry.sessionId)) changed = true
      }
      return changed ? next : prev
    })

    const missing = allNeeded.filter(entry => !sessionLookup.has(entry.sessionId))
    if (missing.length === 0) return

    let cancelled = false
    const fetchMissing = async () => {
      const results: Record<string, ApiSession> = {}
      await Promise.allSettled(
        missing.map(async entry => {
          try {
            const session = await getSession(entry.sessionId, entry.directory)
            if (!cancelled) {
              results[session.id] = session
              if (entry.pinned) {
                pinnedSessionsStore.update(session.id, {
                  directory: session.directory || entry.directory,
                  title: session.title || session.id.slice(0, 12) + '...',
                })
                setUnavailablePinnedSessionIds(prev => {
                  if (!prev.has(session.id)) return prev
                  const next = new Set(prev)
                  next.delete(session.id)
                  return next
                })
              }
            }
          } catch {
            if (!cancelled && entry.pinned) {
              setUnavailablePinnedSessionIds(prev => {
                if (prev.has(entry.sessionId)) return prev
                return new Set(prev).add(entry.sessionId)
              })
            }
          }
        }),
      )
      if (!cancelled && Object.keys(results).length > 0) {
        setFetchedSessions(prev => ({ ...prev, ...results }))
      }
    }
    fetchMissing()
    return () => {
      cancelled = true
    }
  }, [busySessions, notifications, pinnedEntries, sessionLookup, selectedSessionId, currentDirectory, pathInfo?.directory])

  // ---- 子 session 展示数据 ----
  const rootSessionIds = useMemo(() => new Set(sessions.map(s => s.id)), [sessions])

  const findParentId = useCallback(
    (id: string) => {
      const s = sessionLookup.get(id)
      if (s?.parentID) return s.parentID
      return childSessionStore.getSessionInfo(id)?.parentID
    },
    [sessionLookup],
  )

  // 开关开 → 拉 /children 全量：选中的 root 或选中子 session 时保持其父展开
  const expandedChildSessionIds = useMemo(() => {
    if (search || !sidebarShowChildSessions || !selectedSessionId) return undefined
    if (rootSessionIds.has(selectedSessionId)) return new Set([selectedSessionId])
    const pid = findParentId(selectedSessionId)
    if (pid && rootSessionIds.has(pid)) return new Set([pid])
    return undefined
  }, [search, sidebarShowChildSessions, selectedSessionId, rootSessionIds, findParentId])

  // 开关关 → 只挂活跃的 + 选中的子 session
  const inlineChildSessions = useMemo(() => {
    if (search) return undefined
    const map = new Map<string, ApiSession[]>()
    const add = (parentId: string, session: ApiSession) => {
      if (expandedChildSessionIds?.has(parentId)) return
      let arr = map.get(parentId)
      if (!arr) {
        arr = []
        map.set(parentId, arr)
      }
      if (!arr.some(s => s.id === session.id)) arr.push(session)
    }
    for (const entry of busySessions) {
      const pid = findParentId(entry.sessionId)
      if (pid && rootSessionIds.has(pid)) {
        const s = sessionLookup.get(entry.sessionId)
        if (s) add(pid, s)
      }
    }
    if (!sidebarShowChildSessions && selectedSessionId && !rootSessionIds.has(selectedSessionId)) {
      const pid = findParentId(selectedSessionId)
      if (pid && rootSessionIds.has(pid)) {
        const s = sessionLookup.get(selectedSessionId)
        if (s) add(pid, s)
      }
    }
    return map.size > 0 ? map : undefined
  }, [
    search,
    busySessions,
    selectedSessionId,
    sidebarShowChildSessions,
    rootSessionIds,
    expandedChildSessionIds,
    sessionLookup,
    findParentId,
  ])

  const activeSessionTree = useMemo(
    () => buildActiveSessionTree(busySessions, findParentId),
    [busySessions, findParentId],
  )

  const buildProjectGroups = useCallback(
    (directories: typeof savedDirectories): ProjectItem[] => {
      const savedNameByPath = new Map(
        directories.map(directory => [normalizeToForwardSlash(directory.path), directory.name]),
      )
      const groups = new Map<string, ProjectItem>()

      for (const directory of directories) {
        const normalizedDirectory = normalizeToForwardSlash(directory.path)
        const meta = gitWorkspaceCatalog.get(normalizedDirectory)
        const { projectId, workspaceDirectories } = getProjectGroupIdentity(normalizedDirectory, meta)
        const existing = groups.get(projectId)

        if (existing) {
          groups.set(projectId, {
            ...existing,
            memberDirectories: [...(existing.memberDirectories ?? []), directory.path],
            reorderPath: existing.reorderPath ?? directory.path,
          })
          continue
        }

        groups.set(projectId, {
          id: projectId,
          worktree: projectId,
          name: savedNameByPath.get(projectId) ?? getDirectoryName(projectId),
          canReorder: true,
          memberDirectories: [directory.path],
          reorderPath: directory.path,
          workspaceDirectories,
        })
      }

      return Array.from(groups.values()).map(project => {
        if (!project.workspaceDirectories?.length) return project

        const savedWorkspaceDirectories = (project.memberDirectories ?? [])
          .map(directory => normalizeToForwardSlash(directory))
          .filter(directory => project.workspaceDirectories?.some(workspace => isSameDirectory(workspace, directory)))

        const remainingWorkspaceDirectories = project.workspaceDirectories.filter(
          workspace => !savedWorkspaceDirectories.some(directory => isSameDirectory(directory, workspace)),
        )

        return {
          ...project,
          workspaceDirectories: [...savedWorkspaceDirectories, ...remainingWorkspaceDirectories],
        }
      })
    },
    [gitWorkspaceCatalog],
  )

  const folderProjectGroups = useMemo<ProjectItem[]>(() => {
    return buildProjectGroups(savedDirectories)
  }, [buildProjectGroups, savedDirectories])

  const selectorProjectGroups = useMemo<ProjectItem[]>(() => {
    const sortedDirectories = [...savedDirectories].sort((a, b) => {
      const aTime = recentProjects[a.path] || a.addedAt
      const bTime = recentProjects[b.path] || b.addedAt
      return bTime - aTime
    })

    return buildProjectGroups(sortedDirectories)
  }, [buildProjectGroups, recentProjects, savedDirectories])

  const globalProject = useMemo<ProjectItem>(
    () => ({
      id: 'global',
      worktree: t('sidebar.allProjects'),
      name: t('sidebar.global'),
    }),
    [t],
  )

  const projects = useMemo<ProjectItem[]>(() => {
    return selectorProjectGroups
  }, [selectorProjectGroups])

  const currentProject = useMemo<ProjectItem>(() => {
    if (!currentDirectory) return globalProject

    const groupedProject = findProjectGroupForDirectory(folderProjectGroups, normalizedCurrentDirectory!)
    if (groupedProject) return groupedProject

    const meta = gitWorkspaceCatalog.get(normalizedCurrentDirectory!)
    const { projectId, workspaceDirectories } = getProjectGroupIdentity(normalizedCurrentDirectory!, meta)
    const found = findProjectGroupForDirectory(folderProjectGroups, projectId)
    if (found) return found

    return {
      id: projectId,
      worktree: projectId,
      name: getDirectoryName(projectId),
      canReorder: false,
      memberDirectories: [],
      workspaceDirectories,
    }
  }, [currentDirectory, folderProjectGroups, gitWorkspaceCatalog, globalProject, normalizedCurrentDirectory])

  useEffect(() => {
    if (currentProject.id === 'global') return
    setExpandedProjectIds(prev => (prev.includes(currentProject.id) ? prev : [...prev, currentProject.id]))
  }, [currentProject.id])

  const currentProjectLabel = useMemo(() => {
    const baseLabel = currentProject?.name || t('sidebar.global')
    if (!currentDirectory || currentProject?.id === 'global') return baseLabel

    const branchLabel = currentDirectoryVcsInfo?.branch ?? (isCurrentDirectoryVcsLoading ? '...' : undefined)
    return branchLabel ? `${baseLabel} · ${branchLabel}` : baseLabel
  }, [
    currentDirectory,
    currentDirectoryVcsInfo?.branch,
    currentProject?.id,
    currentProject?.name,
    isCurrentDirectoryVcsLoading,
    t,
  ])

  const displayedProjects = useMemo(() => {
    if (currentProject.id === 'global') return projects
    if (projects.some(project => isSameDirectory(project.id, currentProject.id))) return projects
    return [...projects, { ...currentProject, canReorder: false }]
  }, [currentProject, projects])

  const expandedProjects = useMemo(
    () =>
      displayedProjects.filter(project => project.id !== 'global' && expandedProjectIds.includes(project.id)),
    [displayedProjects, expandedProjectIds],
  )

  useEffect(() => {
    if (currentProject.id !== 'global') return
    setDefaultSessions(prev => {
      if (!prev.isLoading && areSessionListsSame(prev.sessions, orderedSessions)) return prev
      return { sessions: orderedSessions, isLoading: false }
    })
  }, [currentProject.id, orderedSessions])

  useEffect(() => {
    if (currentProject.id === 'global' || !pathInfo?.directory) return

    let cancelled = false
    setDefaultSessions(prev => {
      if (prev.isLoading) return prev
      return { ...prev, isLoading: true }
    })

    getSessions({
      roots: true,
      limit: 30,
      directory: normalizeToForwardSlash(pathInfo.directory) || pathInfo.directory,
      search: search || undefined,
    })
      .then(data => {
        if (cancelled) return
        setDefaultSessions(prev => {
          if (!prev.isLoading && areSessionListsSame(prev.sessions, data)) return prev
          return { sessions: data, isLoading: false }
        })
        setFetchedSessions(prev => ({
          ...prev,
          ...Object.fromEntries(data.map(session => [session.id, session])),
        }))
      })
      .catch(() => {
        if (cancelled) return
        setDefaultSessions(prev => {
          if (!prev.isLoading) return prev
          return { ...prev, isLoading: false }
        })
      })

    return () => {
      cancelled = true
    }
  }, [currentProject.id, pathInfo?.directory, search])

  useEffect(() => {
    if (expandedProjects.length === 0) return

    let cancelled = false
    const loadingProjects = expandedProjects.filter(project => {
      if (currentDirectory && isSameDirectory(currentDirectory, project.worktree)) return false
      return true
    })

    if (loadingProjects.length === 0) return

    setProjectSessions(prev => ({
      ...prev,
      ...Object.fromEntries(
        loadingProjects.map(project => [
          project.id,
          {
            sessions: prev[project.id]?.sessions ?? [],
            isLoading: true,
          },
        ]),
      ),
    }))

    Promise.allSettled(
      loadingProjects.map(async project => ({
        project,
        sessions: await getSessions({
          roots: true,
          limit: 30,
          directory: normalizeToForwardSlash(project.worktree) || project.worktree,
          search: search || undefined,
        }),
      })),
    ).then(results => {
      if (cancelled) return

      setProjectSessions(prev => ({
        ...prev,
        ...Object.fromEntries(
          results.map((result, index) => {
            const project = loadingProjects[index]
            if (result.status === 'fulfilled') {
              return [
                result.value.project.id,
                {
                  sessions: result.value.sessions,
                  isLoading: false,
                },
              ]
            }

            return [
              project.id,
              {
                sessions: prev[project.id]?.sessions ?? [],
                isLoading: false,
              },
            ]
          }),
        ),
      }))

      setFetchedSessions(prev => ({
        ...prev,
        ...Object.fromEntries(
          results.flatMap(result => {
            if (result.status !== 'fulfilled') return []
            return result.value.sessions.map(session => [session.id, session])
          }),
        ),
      }))
    })

    return () => {
      cancelled = true
    }
  }, [currentDirectory, expandedProjects, search])

  const folderProjects = useMemo<ProjectItem[]>(() => {
    const list = [...folderProjectGroups]

    if (currentDirectory && !list.some(project => isSameDirectory(project.worktree, currentProject.worktree))) {
      list.push({ ...currentProject, canReorder: false })
    }

    return list
  }, [folderProjectGroups, currentDirectory, currentProject])
  const canShowFolderRecents = sidebarFolderRecents && !search && folderProjects.length > 0

  const workspaceDirectoriesByProjectId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const project of folderProjects) {
      if (project.workspaceDirectories && project.workspaceDirectories.length > 1) {
        map.set(project.id, project.workspaceDirectories)
      }
    }
    return map
  }, [folderProjects])

  const currentProjectWorkspaceDirectories = useMemo(
    () => currentProject.workspaceDirectories ?? [],
    [currentProject.workspaceDirectories],
  )
  const shouldRenderWorkspaceTreeOnly =
    !search && currentProjectWorkspaceDirectories.length > 1 && currentProject.id !== 'global'
  const shouldWaitForWorkspaceResolution =
    !sidebarFolderRecents &&
    !search &&
    !!currentDirectory &&
    isGitWorkspaceCatalogLoading &&
    currentProjectWorkspaceDirectories.length <= 1 &&
    !!normalizedCurrentDirectory &&
    !gitWorkspaceCatalog.has(normalizedCurrentDirectory)

  const currentProjectTreeProjects = useMemo<ProjectItem[]>(() => {
    if (!shouldRenderWorkspaceTreeOnly || currentProject.id === 'global') return []

    const draggableWorkspaceSet = new Set(
      (currentProject.memberDirectories ?? []).map(directory => normalizeToForwardSlash(directory)),
    )

    return currentProjectWorkspaceDirectories.map(workspaceDirectory => {
      const isSavedWorkspace = draggableWorkspaceSet.has(normalizeToForwardSlash(workspaceDirectory))

      return {
        id: workspaceDirectory,
        worktree: workspaceDirectory,
        name: getDirectoryName(workspaceDirectory),
        canReorder: isSavedWorkspace,
        memberDirectories: isSavedWorkspace ? [workspaceDirectory] : [],
        reorderPath: isSavedWorkspace ? workspaceDirectory : undefined,
        sectionKind: 'workspace' as const,
      }
    })
  }, [currentProject, currentProjectWorkspaceDirectories, shouldRenderWorkspaceTreeOnly])

  const allDisplayedProjects = useMemo(() => {
    return [...folderProjects, ...currentProjectTreeProjects]
  }, [folderProjects, currentProjectTreeProjects])

  const handleSelectFolderProject = useCallback(
    (project: ProjectItem) => {
      if (currentDirectory && isSameDirectory(currentDirectory, project.worktree)) return
      setCurrentDirectory(project.worktree)
    },
    [currentDirectory, setCurrentDirectory],
  )

  const getProjectDirectoriesToRemove = useCallback(
    (projectId: string) => {
      const project = allDisplayedProjects.find(item => isSameDirectory(item.id, projectId))
      return project?.memberDirectories?.length ? project.memberDirectories : [projectId]
    },
    [allDisplayedProjects],
  )

  const handleSelectProject = useCallback(
    (projectId: string) => {
      if (projectId === 'global') {
        setCurrentDirectory(undefined)
      } else {
        setCurrentDirectory(projectId)
      }
    },
    [setCurrentDirectory],
  )

  const handleToggleProject = useCallback((projectId: string) => {
    setExpandedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(item => item !== projectId) : [...prev, projectId],
    )
  }, [])

  const handleRemoveProject = useCallback(
    (projectId: string) => {
      getProjectDirectoriesToRemove(projectId).forEach(directory => removeDirectory(directory))
    },
    [getProjectDirectoriesToRemove, removeDirectory],
  )

  const handleReorderProjectGroup = useCallback(
    (draggedPath: string, targetPath: string) => {
      const draggedProject = folderProjects.find(project => isSameDirectory(project.id, draggedPath))
      const targetProject = folderProjects.find(project => isSameDirectory(project.id, targetPath))
      const draggedReorderPath = draggedProject?.reorderPath
      const targetReorderPath = targetProject?.reorderPath
      if (!draggedReorderPath || !targetReorderPath) return
      reorderDirectories(draggedReorderPath, targetReorderPath)
    },
    [folderProjects, reorderDirectories],
  )

  const handleSelect = useCallback(
    (session: ApiSession) => {
      const isDefaultDirectorySession =
        pathInfo?.directory && session.directory && isSameDirectory(pathInfo.directory, session.directory)

      if (!currentDirectory && session.directory && !isDefaultDirectorySession) {
        addDirectory(session.directory)
      }
      onSelectSession(session)
      if (window.innerWidth < 768 && onCloseMobile) {
        onCloseMobile()
      }
    },
    [currentDirectory, pathInfo?.directory, addDirectory, onSelectSession, onCloseMobile],
  )

  // Active tab 专用：跨目录的 session 需要确保目录在项目列表中
  const handleSelectActive = useCallback(
    (session: ApiSession) => {
      if (session.directory) {
        addDirectory(session.directory)
      }
      onSelectSession(session)
      if (window.innerWidth < 768 && onCloseMobile) {
        onCloseMobile()
      }
    },
    [addDirectory, onSelectSession, onCloseMobile],
  )

  const renderActiveSessionNode = useCallback(
    function renderActiveSessionNode(entry: (typeof busySessions)[number], level = 0): ReactNode {
      const resolvedSession = sessionLookup.get(entry.sessionId)
      const childEntries = activeSessionTree.childrenByParent.get(entry.sessionId) ?? []

      return (
        <div key={entry.sessionId} style={level > 0 ? { marginLeft: level * 12 } : undefined}>
          <ActiveSessionItem
            entry={entry}
            resolvedSession={resolvedSession}
            isSelected={entry.sessionId === selectedSessionId}
            onSelect={handleSelectActive}
          />
          {childEntries.map(childEntry => renderActiveSessionNode(childEntry, level + 1))}
        </div>
      )
    },
    [activeSessionTree.childrenByParent, handleSelectActive, selectedSessionId, sessionLookup],
  )

  const handleRename = useCallback(
    async (sessionId: string, newTitle: string) => {
      try {
        await updateSession(sessionId, { title: newTitle }, currentDirectory || pathInfo?.directory)
        pinnedSessionsStore.update(sessionId, { title: newTitle })
        refresh()
      } catch (e) {
        uiErrorHandler('rename session', e)
      }
    },
    [currentDirectory, pathInfo?.directory, refresh],
  )

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId)

      if (selectedSessionId === sessionId) {
        onNewSession()
      }
    },
    [deleteSession, onNewSession, selectedSessionId],
  )

  const handleRenameListedSession = useCallback(
    async (sessionId: string, newTitle: string) => {
      const session = sessionLookup.get(sessionId)
      try {
        await updateSession(sessionId, { title: newTitle }, session?.directory || currentDirectory || pathInfo?.directory)
        pinnedSessionsStore.update(sessionId, { title: newTitle })
        setProjectSessions(prev =>
          Object.fromEntries(
            Object.entries(prev).map(([projectId, value]) => [
              projectId,
              {
                ...value,
                sessions: value.sessions.map(item => (item.id === sessionId ? { ...item, title: newTitle } : item)),
              },
            ]),
          ),
        )
        setDefaultSessions(prev => ({
          ...prev,
          sessions: prev.sessions.map(item => (item.id === sessionId ? { ...item, title: newTitle } : item)),
        }))
        await refresh()
      } catch (e) {
        uiErrorHandler('rename session', e)
      }
    },
    [currentDirectory, pathInfo?.directory, refresh, sessionLookup],
  )

  const handleDeleteListedSession = useCallback(
    async (sessionId: string) => {
      const session = sessionLookup.get(sessionId)
      if (!session) {
        await handleDeleteSession(sessionId)
        return
      }

      await apiDeleteSession(sessionId, session.directory)
      pinnedSessionsStore.unpin(sessionId)
      clearSessionRuntimeState(sessionId)
      setProjectSessions(prev =>
        Object.fromEntries(
          Object.entries(prev).map(([projectId, value]) => [
            projectId,
            {
              ...value,
              sessions: value.sessions.filter(item => item.id !== sessionId),
            },
          ]),
        ),
      )
      setDefaultSessions(prev => ({
        ...prev,
        sessions: prev.sessions.filter(item => item.id !== sessionId),
      }))
      await refresh()

      if (selectedSessionId === sessionId) {
        onNewSession()
      }
    },
    [handleDeleteSession, onNewSession, refresh, selectedSessionId, sessionLookup],
  )

  const handleRenameFolderSession = useCallback(
    async (session: ApiSession, newTitle: string) => {
      try {
        await updateSession(session.id, { title: newTitle }, session.directory)
        pinnedSessionsStore.update(session.id, { title: newTitle })
        if (!currentDirectory || isSameDirectory(currentDirectory, session.directory)) {
          await refresh()
        }
      } catch (e) {
        uiErrorHandler('rename session', e)
      }
    },
    [currentDirectory, refresh],
  )

  const handleDeleteFolderSession = useCallback(
    async (session: ApiSession) => {
      await apiDeleteSession(session.id, session.directory)
      pinnedSessionsStore.unpin(session.id)

      if (!currentDirectory || isSameDirectory(currentDirectory, session.directory)) {
        await refresh()
      }

      if (selectedSessionId === session.id) {
        onNewSession()
      }
    },
    [currentDirectory, onNewSession, refresh, selectedSessionId],
  )

  // ---- 批量删除 session ----
  const handleBatchDeleteSessions = useCallback(async () => {
    if (selectedSessionIds.size === 0) return
    setIsBatchDeleting(true)

    const needSwitchSession = selectedSessionId && selectedSessionIds.has(selectedSessionId)

    // 文件夹模式下可能跨目录，需要按 session 逐个调用
    // 普通模式下也用 sessionLookup 获取目录信息
    const ids = Array.from(selectedSessionIds)
    await Promise.allSettled(
      ids.map(async id => {
        try {
          const s = sessionLookup.get(id)
          if (s) {
            await apiDeleteSession(id, s.directory)
          } else {
            await apiDeleteSession(id, currentDirectory || pathInfo?.directory)
          }
          pinnedSessionsStore.unpin(id)
        } catch (e) {
          uiErrorHandler('batch delete session', e)
        }
      }),
    )

    await refresh()
    setSelectedSessionIds(new Set())
    sessionSelectionAnchorIdRef.current = null
    setBatchDeleteSessionConfirm(false)
    setIsBatchDeleting(false)

    if (needSwitchSession) {
      onNewSession()
    }
  }, [selectedSessionIds, selectedSessionId, sessionLookup, currentDirectory, pathInfo?.directory, refresh, onNewSession])

  // ---- 批量移除项目 ----
  const handleBatchRemoveProjects = useCallback(() => {
    if (selectedProjectIds.size === 0) return
    for (const projectId of selectedProjectIds) {
      getProjectDirectoriesToRemove(projectId).forEach(directory => removeDirectory(directory))
    }
    setSelectedProjectIds(new Set())
    projectSelectionAnchorIdRef.current = null
    setBatchRemoveProjectConfirm(false)
  }, [getProjectDirectoriesToRemove, selectedProjectIds, removeDirectory])

  const commonFolderRecentListProps = {
    currentDirectory,
    selectedSessionId,
    expandedProjectIds: expandedRecentProjectIds,
    onExpandedProjectIdsChange: setExpandedRecentProjectIds,
    onSelectProject: handleSelectFolderProject,
    onSelectSession: handleSelectActive,
    onRenameSession: handleRenameFolderSession,
    onDeleteSession: handleDeleteFolderSession,
    expandedChildSessionIds,
    inlineChildSessions,
    onSelectChildSession: handleSelectActive,
    isEditMode,
    selectedSessionIds,
    selectedProjectIds,
    onToggleSessionSelection: toggleSessionSelection,
    onToggleProjectSelection: toggleProjectSelection,
  }

  const defaultConversationSource =
    currentProject.id === 'global'
      ? {
          sessions: orderedSessions,
          isLoading: isLoading || shouldWaitForWorkspaceResolution,
          isLoadingMore,
          hasMore,
          onLoadMore: loadMore,
        }
      : {
          sessions: defaultSessions.sessions,
          isLoading: defaultSessions.isLoading,
          isLoadingMore: false,
          hasMore: false,
          onLoadMore: () => {},
        }

  // 统一的结构，通过 CSS 控制显示/隐藏
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ===== Header ===== */}
      <div className="mobile-safe-topbar-14 window-drag-region shrink-0" />

      {/* ===== Navigation - 图标位置固定 ===== */}
      <div className="flex flex-col gap-0.5 mx-2">
        {/* New Chat - 图标始终在 padding-left: 6px 位置，收起时刚好居中 */}
        <button
          type="button"
          onClick={onNewSession}
          aria-label={t('sidebar.newChat')}
          className="h-8 flex items-center rounded-lg text-text-300 hover:text-text-100 hover:bg-bg-200 active:scale-[0.98] transition-all duration-300 group overflow-hidden"
          style={{
            width: showLabels ? '100%' : 32,
            paddingLeft: 6,
            paddingRight: 6,
          }}
          title={t('sidebar.newChat')}
        >
          <span className="size-5 flex items-center justify-center shrink-0">
            <PlusIcon size={16} />
          </span>
          <span
            className="ml-2 text-[length:var(--fs-base)] whitespace-nowrap transition-opacity duration-300"
            style={{ opacity: showLabels ? 1 : 0 }}
          >
            {t('sidebar.newChat')}
          </span>
          <span
            className="ml-auto text-[length:var(--fs-xxs)] text-text-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            style={{ opacity: showLabels ? undefined : 0 }}
          >
            {newChatShortcut}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSearchDialogOpen(true)}
          aria-label={t('sidebar.search')}
          className="h-8 flex items-center rounded-lg text-text-300 hover:text-text-100 hover:bg-bg-200 active:scale-[0.98] transition-all duration-300 overflow-hidden"
          style={{
            width: showLabels ? '100%' : 32,
            paddingLeft: 6,
            paddingRight: 6,
          }}
          title={t('sidebar.search')}
        >
          <span className="size-5 flex items-center justify-center shrink-0">
            <SearchIcon size={16} />
          </span>
          <span
            className="ml-2 text-[length:var(--fs-base)] whitespace-nowrap transition-opacity duration-300"
            style={{ opacity: showLabels ? 1 : 0 }}
          >
            {t('sidebar.search')}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSkills}
          aria-label={t('sidebar.skills')}
          className="h-8 flex items-center rounded-lg text-text-300 hover:text-text-100 hover:bg-bg-200 active:scale-[0.98] transition-all duration-300 overflow-hidden"
          style={{
            width: showLabels ? '100%' : 32,
            paddingLeft: 6,
            paddingRight: 6,
          }}
          title={t('sidebar.skills')}
        >
          <span className="size-5 flex items-center justify-center shrink-0">
            <TeachIcon size={16} />
          </span>
          <span
            className="ml-2 text-[length:var(--fs-base)] whitespace-nowrap transition-opacity duration-300"
            style={{ opacity: showLabels ? 1 : 0 }}
          >
            {t('sidebar.skills')}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenMcp}
          aria-label={t('sidebar.mcpServers')}
          className="h-8 flex items-center rounded-lg text-text-300 hover:text-text-100 hover:bg-bg-200 active:scale-[0.98] transition-all duration-300 overflow-hidden"
          style={{
            width: showLabels ? '100%' : 32,
            paddingLeft: 6,
            paddingRight: 6,
          }}
          title={t('sidebar.mcpServers')}
        >
          <span className="size-5 flex items-center justify-center shrink-0">
            <PlugIcon size={16} />
          </span>
          <span
            className="ml-2 text-[length:var(--fs-base)] whitespace-nowrap transition-opacity duration-300"
            style={{ opacity: showLabels ? 1 : 0 }}
          >
            {t('sidebar.mcpServers')}
          </span>
        </button>

        {showLabels && (
          <section className="mt-3">
            <div className="mb-1 flex items-center px-[6px] text-[length:var(--fs-sm)] text-text-500">
              <span>{t('sidebar.projects')}</span>
              <button
                type="button"
                onClick={onAddProject}
                className="ml-auto rounded-md p-1 text-text-500 transition-colors hover:bg-bg-200/60 hover:text-text-200"
                aria-label={t('sidebar.addProject')}
                title={t('sidebar.addProject')}
              >
                <PlusIcon size={13} />
              </button>
            </div>
            <div ref={projectsDropdownRef} className="overflow-y-auto custom-scrollbar">
              {displayedProjects.map(project => {
                const isGlobal = project.id === 'global'
                const isActive = currentProject?.id === project.id
                const isExpanded = expandedProjectIds.includes(project.id)
                const usesActiveSessionSource = Boolean(
                  isActive && currentDirectory && isSameDirectory(currentProject.worktree, project.worktree),
                )
                const projectSessionSource = usesActiveSessionSource
                  ? {
                      sessions: orderedSessions,
                      isLoading: isLoading || shouldWaitForWorkspaceResolution,
                      isLoadingMore,
                      hasMore,
                      onLoadMore: loadMore,
                    }
                  : {
                      sessions: projectSessions[project.id]?.sessions ?? [],
                      isLoading: projectSessions[project.id]?.isLoading ?? false,
                      isLoadingMore: false,
                      hasMore: false,
                      onLoadMore: () => {},
                    }
                const itemLabel =
                  isActive && !isGlobal
                    ? currentProjectLabel
                    : project.name || (isGlobal ? t('sidebar.global') : project.worktree)
                return (
                  <div key={project.id}>
                    <div
                      onClick={() => handleSelectProject(project.id)}
                      className={`group w-full flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors ${
                        isActive
                          ? 'sidebar-selected-row text-text-100'
                          : 'text-text-300 hover:text-text-100 hover:bg-bg-200/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          handleSelectProject(project.id)
                        }}
                        aria-current={isActive ? 'true' : undefined}
                        className="min-w-0 flex flex-1 items-center gap-2 text-left bg-transparent border-none p-0"
                        title={project.worktree}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center">
                          {isGlobal ? (
                            <GlobeIcon size={14} className="text-accent-main-100" />
                          ) : (
                            <FolderIcon size={14} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[length:var(--fs-sm)]">{itemLabel}</span>
                      </button>
                      {!isGlobal && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            handleToggleProject(project.id)
                          }}
                          aria-label={isExpanded ? '折叠项目' : '展开项目'}
                          aria-expanded={isExpanded}
                          className="flex size-6 shrink-0 items-center justify-center rounded text-text-500 transition-colors hover:bg-bg-200/70 hover:text-text-200"
                          title={isExpanded ? '折叠项目' : '展开项目'}
                        >
                          <ChevronRightIcon
                            size={14}
                            className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                      )}
                      {!isGlobal && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            setProjectDeleteConfirm({ isOpen: true, projectId: project.id })
                          }}
                          aria-label={t('sidebar.removeProject')}
                          className="rounded p-1 text-text-400 transition-all hover:bg-danger-100/10 hover:text-danger-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100"
                          title={t('common:remove')}
                        >
                          <TrashIcon size={12} />
                        </button>
                      )}
                    </div>
                    {!isGlobal &&
                      isExpanded &&
                      sidebarTab === 'recents' &&
                      (projectSessionSource.sessions.length > 0 || projectSessionSource.isLoading || search) && (
                        <div className="ml-7 mt-0.5 mb-1">
                          <SessionList
                            sessions={projectSessionSource.sessions}
                            selectedId={selectedSessionId}
                            isLoading={projectSessionSource.isLoading}
                            isLoadingMore={projectSessionSource.isLoadingMore}
                            hasMore={projectSessionSource.hasMore}
                            search={search}
                            onSearchChange={setSearch}
                            onSelect={handleSelect}
                            onDelete={handleDeleteListedSession}
                            onRename={handleRenameListedSession}
                            onLoadMore={projectSessionSource.onLoadMore}
                            onNewChat={onNewSession}
                            showHeader={false}
                            grouped={false}
                            density="minimal"
                            showStats={false}
                            showDirectory={false}
                            expandedChildSessionIds={expandedChildSessionIds}
                            inlineChildSessions={inlineChildSessions}
                            onSelectChildSession={handleSelectActive}
                            pinnedDividerAfterIds={pinnedDividerAfterIds}
                            embedded
                            isEditMode={isEditMode}
                            selectedSessionIds={selectedSessionIds}
                            onToggleSessionSelection={toggleSessionSelection}
                          />
                        </div>
                      )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* ===== Main Content ===== */}
      <div
        className="flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-300 ease-out"
        style={{
          opacity: showLabels ? 1 : 0,
          visibility: showLabels ? 'visible' : 'hidden',
        }}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="mx-2 flex shrink-0 items-center gap-1">
            <div className="pl-[6px] py-1.5 text-left text-[length:var(--fs-sm)] text-text-500">
              {t('sidebar.conversations')}
            </div>
            {attentionCount > 0 && (
              <span
                className={`inline-flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-full px-1 text-[length:var(--fs-xxs)] font-medium leading-none ${
                  attentionCount > busyCount
                    ? 'bg-accent-main-100/10 text-accent-main-100'
                    : 'bg-success-100/10 text-success-100'
                }`}
                title={t('sidebar.active')}
              >
                {attentionCount}
              </span>
            )}
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={isEditMode ? exitEditMode : enterEditMode}
              aria-label={isEditMode ? t('common:done') : t('common:edit')}
              className={`ml-auto p-1 rounded-md transition-colors duration-150 ${
                isEditMode
                  ? 'text-accent-main-100 hover:bg-accent-main-100/10'
                  : 'text-text-500 hover:text-text-300 hover:bg-bg-200/50'
              }`}
              title={isEditMode ? t('common:done') : t('common:edit')}
            >
              {isEditMode ? <CheckIcon size={14} /> : <PencilIcon size={14} />}
            </button>
          </div>

          {/* 编辑模式批量操作条 */}
          {isEditMode && sidebarTab === 'recents' && (
            <div className="shrink-0 px-3 py-1.5 flex items-center gap-1.5 border-b border-border-200/30">
              <span className="text-[length:var(--fs-xxs)] text-text-400 flex-1 min-w-0 truncate">
                {selectedSessionIds.size > 0 && t('sidebar.selectedSessions', { count: selectedSessionIds.size })}
                {selectedSessionIds.size > 0 && selectedProjectIds.size > 0 && ' / '}
                {selectedProjectIds.size > 0 && t('sidebar.selectedProjects', { count: selectedProjectIds.size })}
                {selectedSessionIds.size === 0 && selectedProjectIds.size === 0 && t('sidebar.selectItems')}
              </span>
              {selectedSessionIds.size > 0 && (
                <button
                  onClick={() => setBatchDeleteSessionConfirm(true)}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[length:var(--fs-xxs)] font-medium text-danger-100 bg-danger-100/10 hover:bg-danger-100/20 transition-colors"
                >
                  <TrashIcon size={11} />
                  {t('sidebar.deleteSessions', { count: selectedSessionIds.size })}
                </button>
              )}
              {selectedProjectIds.size > 0 && (
                <button
                  onClick={() => setBatchRemoveProjectConfirm(true)}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[length:var(--fs-xxs)] font-medium text-warning-100 bg-warning-100/10 hover:bg-warning-100/20 transition-colors"
                >
                  <CloseIcon size={11} />
                  {t('sidebar.removeProjects', { count: selectedProjectIds.size })}
                </button>
              )}
            </div>
          )}

          {/* Recents Tab */}
          {sidebarTab === 'recents' && (
            <div ref={recentsSelectionRootRef} className="flex-1 overflow-hidden">
              <SessionList
                sessions={defaultConversationSource.sessions}
                selectedId={selectedSessionId}
                isLoading={defaultConversationSource.isLoading}
                isLoadingMore={defaultConversationSource.isLoadingMore}
                hasMore={defaultConversationSource.hasMore}
                search={search}
                onSearchChange={setSearch}
                onSelect={handleSelect}
                onDelete={handleDeleteListedSession}
                onRename={handleRenameListedSession}
                onLoadMore={defaultConversationSource.onLoadMore}
                onNewChat={onNewSession}
                showHeader={false}
                grouped={false}
                density="minimal"
                showStats={false}
                showDirectory={false}
                expandedChildSessionIds={expandedChildSessionIds}
                inlineChildSessions={inlineChildSessions}
                onSelectChildSession={handleSelectActive}
                pinnedDividerAfterIds={pinnedDividerAfterIds}
                isEditMode={isEditMode}
                selectedSessionIds={selectedSessionIds}
                onToggleSessionSelection={toggleSessionSelection}
              />
            </div>
          )}

          {/* Active Sessions Tab */}
          {sidebarTab === 'active' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
              {busySessions.length === 0 && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-400 opacity-60">
                  <p className="text-[length:var(--fs-sm)]">{t('sidebar.noActiveSessions')}</p>
                </div>
              ) : (
                <div className="mt-1 space-y-0.5">
                  {/* Busy sessions — 子 session 挂在父下面 */}
                  {activeSessionTree.rootEntries.map(entry => renderActiveSessionNode(entry))}

                  {/* Divider + actions between busy and notifications */}
                  {notifications.length > 0 && (
                    <div
                      className={`flex items-center justify-between gap-2 ${busySessions.length > 0 ? 'mt-2 pt-2 border-t border-border-200/30' : ''}`}
                    >
                      <span className="text-[length:var(--fs-xxs)] font-medium text-text-400 uppercase tracking-wider pl-[6px]">
                        {t('sidebar.notifications')}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {notifications.some((n: NotificationEntry) => !n.read) && (
                          <button
                            className="text-[length:var(--fs-xxs)] text-text-400 hover:text-text-200 px-1.5 py-0.5 rounded-md hover:bg-bg-200 transition-all duration-150 active:scale-95"
                            onClick={() => notificationStore.markAllRead()}
                          >
                            {t('sidebar.readAll')}
                          </button>
                        )}
                        <button
                          className="text-[length:var(--fs-xxs)] text-text-400 hover:text-text-200 px-1.5 py-0.5 rounded-md hover:bg-bg-200 transition-all duration-150 active:scale-95"
                          onClick={() => notificationStore.clearAll()}
                        >
                          {t('common:clear')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notification history */}
                  {notifications.map((entry: NotificationEntry) => {
                    const resolvedSession = sessionLookup.get(entry.sessionId)
                    return (
                      <NotificationItem
                        key={entry.id}
                        entry={entry}
                        resolvedSession={resolvedSession}
                        onSelect={handleSelectActive}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Spacer for collapsed */}
      {!showLabels && <div className="flex-1" />}

      {/* ===== Footer ===== */}
      <SidebarFooter
        showLabels={showLabels}
        connectionState={connectionState?.state || 'disconnected'}
        stats={stats}
        hasMessages={hasMessages}
        onOpenSettings={onOpenSettings}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={projectDeleteConfirm.isOpen}
        onClose={() => setProjectDeleteConfirm({ isOpen: false, projectId: null })}
        onConfirm={() => {
          if (projectDeleteConfirm.projectId) {
            handleRemoveProject(projectDeleteConfirm.projectId)
          }
          setProjectDeleteConfirm({ isOpen: false, projectId: null })
        }}
        title={t('sidebar.removeProject')}
        description={t('sidebar.removeProjectConfirm')}
        confirmText={t('common:remove')}
        variant="danger"
      />

      {/* 批量删除会话确认弹窗 */}
      <ConfirmDialog
        isOpen={batchDeleteSessionConfirm}
        onClose={() => setBatchDeleteSessionConfirm(false)}
        onConfirm={handleBatchDeleteSessions}
        title={t('sidebar.batchDeleteSessions', { count: selectedSessionIds.size })}
        description={
          <>
            {t('sidebar.batchDeleteSessionsConfirm', { count: selectedSessionIds.size })}
            {selectedSessionId && selectedSessionIds.has(selectedSessionId) && (
              <div className="mt-2 text-[length:var(--fs-sm)] text-warning-100">
                {t('sidebar.batchDeleteIncludesCurrent')}
              </div>
            )}
          </>
        }
        confirmText={t('common:delete')}
        variant="danger"
        isLoading={isBatchDeleting}
      />

      {/* 批量移除项目确认弹窗 */}
      <ConfirmDialog
        isOpen={batchRemoveProjectConfirm}
        onClose={() => setBatchRemoveProjectConfirm(false)}
        onConfirm={handleBatchRemoveProjects}
        title={t('sidebar.batchRemoveProjects', { count: selectedProjectIds.size })}
        description={t('sidebar.batchRemoveProjectsConfirm', { count: selectedProjectIds.size })}
        confirmText={t('common:remove')}
        variant="warning"
      />

      <SessionSearchDialog
        isOpen={searchDialogOpen}
        directory={currentDirectory}
        onClose={() => setSearchDialogOpen(false)}
        onSelectSession={handleSelect}
      />
    </div>
  )
}
