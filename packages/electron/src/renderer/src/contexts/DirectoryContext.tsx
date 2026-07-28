// ============================================
// DirectoryContext - 管理当前工作目录
// ============================================

import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { getCurrentProject, getPath, type ApiPath } from '../api'
import { useRouter } from '../hooks/useRouter'
import { handleError, normalizeToForwardSlash, getDirectoryName, isMissingDirectoryError, isSameDirectory } from '../utils'
import { layoutStore, useLayoutStore } from '../store/layoutStore'
import { serverStore } from '../store/serverStore'
import { DirectoryContext, type DirectoryContextValue, type SavedDirectory } from './DirectoryContext.shared'
import { reorderDirectoryGroup, updatePinnedDirectories } from './directoryOrdering'

// 最近使用记录: { [path]: lastUsedAt }
type RecentProjects = Record<string, number>

export function DirectoryProvider({ children }: { children: ReactNode }) {
  // 从 URL 获取 directory（替代 localStorage）
  const { directory: urlDirectory, setDirectory: setUrlDirectory } = useRouter()

  // 从 layoutStore 获取 sidebarExpanded
  const { sidebarExpanded } = useLayoutStore()

  const [savedDirectories, setSavedDirectories] = useState<SavedDirectory[]>([])

  const [recentProjects, setRecentProjects] = useState<RecentProjects>({})

  const [pathInfo, setPathInfo] = useState<ApiPath | null>(null)
  const loadedServerIdRef = useRef<string | undefined>(undefined)

  // 项目列表由 Electron 主进程统一保存到 ~/.opencodex/projects.json。
  useEffect(() => {
    let loadSequence = 0
    const load = (resetDirectory: boolean) => {
      const sequence = ++loadSequence
      const serverId = serverStore.getActiveServerId()
      loadedServerIdRef.current = undefined
      setSavedDirectories([])
      setRecentProjects({})
      if (resetDirectory) setUrlDirectory(undefined)

      void window.customOpenCode.projectState(serverId).then(state => {
        if (sequence !== loadSequence || serverStore.getActiveServerId() !== serverId) return
        loadedServerIdRef.current = serverId
        setSavedDirectories(state.directories)
        setRecentProjects(state.recentProjects)
      }).catch(handleError('load projects', 'file'))
    }

    load(false)
    const unsubscribe = serverStore.onServerChange((_, reason) => {
      if (reason === 'server-switch') {
        load(true)
      }
      setPathInfo(null)
      getPath().then(setPathInfo).catch(handleError('get path info', 'api'))
    })

    return () => {
      loadSequence += 1
      unsubscribe()
    }
  }, [setUrlDirectory])

  // 加载路径信息
  useEffect(() => {
    getPath().then(setPathInfo).catch(handleError('get path info', 'api'))
  }, [])

  // 分开写入目录和最近使用记录，避免两个状态同时变化时互相覆盖。
  useEffect(() => {
    const serverId = loadedServerIdRef.current
    if (!serverId) return
    void window.customOpenCode.updateProjectDirectories(serverId, savedDirectories)
      .catch(handleError('save projects', 'file'))
  }, [savedDirectories])

  useEffect(() => {
    const serverId = loadedServerIdRef.current
    if (!serverId) return
    void window.customOpenCode.updateRecentProjects(serverId, recentProjects)
      .catch(handleError('save recent projects', 'file'))
  }, [recentProjects])

  // 设置当前目录（更新 URL + 记录最近使用）
  const setCurrentDirectory = useCallback(
    (directory: string | undefined) => {
      setUrlDirectory(directory)
      if (directory) {
        setRecentProjects(prev => ({ ...prev, [directory]: Date.now() }))
      }
    },
    [setUrlDirectory],
  )

  // 项目可能在应用关闭期间被移动或删除。只移除明确不存在的目录，网络或服务端异常则保留，
  // 避免远程 Server 短暂离线时误删用户的项目列表。
  useEffect(() => {
    if (savedDirectories.length === 0) return

    let disposed = false
    const directories = savedDirectories.map(directory => directory.path)

    void Promise.all(
      directories.map(async directory => {
        try {
          await getCurrentProject(directory)
          return directory
        } catch (error) {
          return isMissingDirectoryError(error) ? undefined : directory
        }
      }),
    ).then(validDirectories => {
      if (disposed) return
      const valid = validDirectories.filter((directory): directory is string => !!directory)
      if (valid.length === directories.length) return

      const isValid = (directory: string) => valid.some(item => isSameDirectory(item, directory))
      setSavedDirectories(current => current.filter(directory => isValid(directory.path)))
      setRecentProjects(current => Object.fromEntries(Object.entries(current).filter(([directory]) => isValid(directory))))
      if (urlDirectory && !isValid(urlDirectory)) setCurrentDirectory(undefined)
    })

    return () => {
      disposed = true
    }
  }, [savedDirectories, urlDirectory, setCurrentDirectory])

  // 添加目录
  const addDirectory = useCallback(
    (path: string, options?: { select?: boolean }) => {
      let normalized = normalizeToForwardSlash(path)

      // normalizeToForwardSlash 会去掉尾斜杠，导致根路径 "/" → "" 和 "C:/" → "C:"
      // 需要修正：如果原始路径是根路径，恢复正确的值
      const trimmed = path.replace(/\\/g, '/').replace(/\/+$/, '/')
      if (!normalized && (trimmed === '/' || /^[a-zA-Z]:\/$/.test(trimmed))) {
        normalized = trimmed.slice(0, -1) || '/'
      }

      // 验证路径非空（只阻止空字符串和 "."）
      if (!normalized || normalized === '.') return

      // 使用 isSameDirectory 检查是否已存在（处理大小写和斜杠差异）
      if (savedDirectories.some(d => isSameDirectory(d.path, normalized))) {
        if (options?.select !== false) setCurrentDirectory(normalized)
        return
      }

      const newDir: SavedDirectory = {
        path: normalized,
        name: getDirectoryName(normalized) || normalized,
        addedAt: Date.now(),
      }

      setSavedDirectories(prev => {
        if (prev.some(directory => isSameDirectory(directory.path, normalized))) return prev
        return [...prev, newDir]
      })
      if (options?.select !== false) setCurrentDirectory(normalized)
    },
    [savedDirectories, setCurrentDirectory],
  )

  // 移除目录
  const removeDirectory = useCallback(
    (path: string) => {
      const normalized = normalizeToForwardSlash(path)
      setSavedDirectories(prev => prev.filter(d => !isSameDirectory(d.path, normalized)))
      if (isSameDirectory(urlDirectory, normalized)) {
        setCurrentDirectory(undefined)
      }
    },
    [urlDirectory, setCurrentDirectory],
  )

  const reorderDirectories = useCallback((draggedPaths: string[], targetPaths: string[], position: 'before' | 'after' = 'before') => {
    const normalizedDragged = draggedPaths.map(normalizeToForwardSlash).filter(Boolean)
    const normalizedTarget = targetPaths.map(normalizeToForwardSlash).filter(Boolean)

    if (
      normalizedDragged.length === 0 ||
      normalizedTarget.length === 0 ||
      normalizedDragged.some(dragged => normalizedTarget.some(target => isSameDirectory(dragged, target)))
    ) {
      return
    }

    setSavedDirectories(prev => {
      return reorderDirectoryGroup(prev, normalizedDragged, normalizedTarget, position)
    })
  }, [])

  const setDirectoriesPinned = useCallback((paths: string[], pinned: boolean) => {
    setSavedDirectories(prev => updatePinnedDirectories(prev, paths, pinned ? Date.now() : undefined))
  }, [])

  // 设置侧边栏展开 - 委托给 layoutStore
  const setSidebarExpanded = useCallback((expanded: boolean) => {
    layoutStore.setSidebarExpanded(expanded)
  }, [])

  // 稳定化 Provider value，避免每次渲染创建新对象导致子组件不必要重渲染
  const value = useMemo<DirectoryContextValue>(
    () => ({
      currentDirectory: urlDirectory,
      setCurrentDirectory,
      savedDirectories,
      addDirectory,
      removeDirectory,
      reorderDirectories,
      setDirectoriesPinned,
      pathInfo,
      sidebarExpanded,
      setSidebarExpanded,
      recentProjects,
    }),
    [
      urlDirectory,
      setCurrentDirectory,
      savedDirectories,
      addDirectory,
      removeDirectory,
      reorderDirectories,
      setDirectoriesPinned,
      pathInfo,
      sidebarExpanded,
      setSidebarExpanded,
      recentProjects,
    ],
  )

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>
}
