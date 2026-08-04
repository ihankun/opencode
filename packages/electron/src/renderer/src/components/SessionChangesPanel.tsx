// ============================================
// SessionChangesPanel - 会话变更查看器
// 布局：上方文件列表 + 下方 Diff 预览（类似 FileExplorer）
// 支持拖拽调整高度，CSS 变量 + requestAnimationFrame 优化
// ============================================

import { memo, useState, useEffect, useCallback, useRef, useMemo, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { RetryIcon, ChevronRightIcon, MaximizeIcon, ClockIcon, GitBranchIcon, GitDiffIcon, LayersIcon, DownloadIcon, GitCommitIcon, UploadIcon, MoreIcon, CheckIcon, CloseIcon } from './Icons'
import { getMaterialIconUrl } from '../utils/materialIcons'
import { DiffViewer, useDiffViewerData, type DiffLineSelection, type ViewMode } from './DiffViewer'
import { ViewModeSwitch } from './FullscreenViewer'
import { getCurrentProject, initGitProject } from '../api/client'
import { getLastTurnDiff, getSessionDiff } from '../api/session'
import { commitVcsChanges, discardVcsFiles, getVcsDiff, getVcsHistory, getVcsInfo, pushVcsBranch, runVcsOperation, stageVcsFiles, unstageVcsFiles } from '../api/vcs'
import type { VcsHistoryItem } from '../api/vcs'
import type { ApiProject, FileDiff, VcsDiffMode, VcsInfo } from '../api/types'
import { detectLanguage } from '../utils/languageUtils'
import { extractContentFromUnifiedDiff } from '../utils/diffUtils'
import { sessionErrorHandler } from '../utils'
import { PreviewTabsBar, type PreviewTabsBarItem } from './PreviewTabsBar'
import { useVerticalSplitResize } from '../hooks/useVerticalSplitResize'
import { Button, Dialog, DropdownMenu } from './ui'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { changeScopeStore, useSessionChangeScope, type ChangeScopeMode } from '../store/changeScopeStore'
import { notificationStore } from '../store'
import { useFullscreenLayer } from '../contexts'
import { openUrl } from '../utils/browserOpen'
import { createPullRequestUrl } from '../utils/pullRequest'
import { insertComposerDraft } from '../utils/composerDraft'
import { serverStore } from '../store/serverStore'
import { saveData } from '../utils/downloadUtils'

// 常量
const MIN_LIST_HEIGHT = 80
const MIN_PREVIEW_HEIGHT = 120

type ChangeMode = ChangeScopeMode

function getDefaultChangeMode(options: ChangeMode[]) {
  if (options.includes('git')) return 'git'
  if (options.includes('branch')) return 'branch'
  if (options.includes('session')) return 'session'
  if (options.includes('turn')) return 'turn'
  return options[0] ?? 'session'
}

function reconcileDiffPreviewState(diffs: FileDiff[], openFiles: string[], activeFile: string | null) {
  const availableFiles = new Set(diffs.map(diff => diff.file))
  const nextOpenFiles = openFiles.filter(file => availableFiles.has(file))

  if (nextOpenFiles.length === 0 && diffs.length > 0) {
    nextOpenFiles.push(diffs[0].file)
  }

  const nextActiveFile = activeFile && nextOpenFiles.includes(activeFile) ? activeFile : (nextOpenFiles[0] ?? null)

  return { nextOpenFiles, nextActiveFile }
}

interface SessionChangesPanelProps {
  sessionId: string
  directory?: string
  isResizing?: boolean
}

export const SessionChangesPanel = memo(function SessionChangesPanel({
  sessionId,
  directory,
  isResizing: isPanelResizing = false,
}: SessionChangesPanelProps) {
  const { t } = useTranslation(['components', 'common'])
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const {
    splitHeight: listHeight,
    isResizing,
    resetSplitHeight,
    handleResizeStart,
    handleTouchResizeStart,
  } = useVerticalSplitResize({
    containerRef,
    primaryRef: listRef,
    cssVariableName: '--list-height',
    minPrimaryHeight: MIN_LIST_HEIGHT,
    minSecondaryHeight: MIN_PREVIEW_HEIGHT,
  })

  const [project, setProject] = useState<ApiProject | null>(null)
  const [vcsInfo, setVcsInfo] = useState<VcsInfo | null>(null)
  const [projectLoading, setProjectLoading] = useState(false)
  const [initializingGit, setInitializingGit] = useState(false)
  const [loadingModes, setLoadingModes] = useState({ git: false, branch: false, session: false, turn: false })
  const [loadedModes, setLoadedModes] = useState({ git: false, branch: false, session: false, turn: false })
  const [gitDiffs, setGitDiffs] = useState<FileDiff[]>([])
  const [branchDiffs, setBranchDiffs] = useState<FileDiff[]>([])
  const [sessionDiffs, setSessionDiffs] = useState<FileDiff[]>([])
  const [turnDiffs, setTurnDiffs] = useState<FileDiff[]>([])
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('unified')
  const [listMode, setListMode] = useState<'flat' | 'tree'>('flat')
  const [changeMenuOpen, setChangeMenuOpen] = useState(false)
  const changeMode = useSessionChangeScope(sessionId)

  // 选中的文件（显示在预览区）
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [openDiffFiles, setOpenDiffFiles] = useState<string[]>([])
  const [mountedPreviewFiles, setMountedPreviewFiles] = useState<Set<string>>(new Set())

  // 展开的目录
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  // 勾选的暂存文件（git 模式）
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set())

  const projectRequestIdRef = useRef(0)
  const diffRequestIdRef = useRef({ git: 0, branch: 0, session: 0, turn: 0 })
  const openDiffFilesRef = useRef<string[]>([])
  const selectedFileRef = useRef<string | null>(null)
  const changeMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const changeMenuRef = useRef<HTMLDivElement>(null)
  const changeMenuOptionRefs = useRef<Partial<Record<ChangeMode, HTMLButtonElement | null>>>({})
  const changeMenuOpenFocusRef = useRef<'selected' | 'first' | 'last'>('selected')
  const changeMenuId = useId()

  const isAnyResizing = isPanelResizing || isResizing
  const setChangeMode = useCallback(
    (mode: ChangeMode) => {
      changeScopeStore.setMode(sessionId, mode)
    },
    [sessionId],
  )
  const changeOptions = useMemo<ChangeMode[]>(() => {
    const options: ChangeMode[] = []
    if (project?.vcs) options.push('turn', 'git')
    if (project?.vcs && vcsInfo?.branch && vcsInfo?.default_branch && vcsInfo.branch !== vcsInfo.default_branch) {
      options.push('branch')
    }
    if (project?.vcs) options.push('session')
    return options
  }, [project?.vcs, vcsInfo?.branch, vcsInfo?.default_branch])
  const preferredChangeMode = useMemo(() => getDefaultChangeMode(changeOptions), [changeOptions])
  const changeModeMeta = useMemo(
    () => ({
      git: {
        label: t('sessionChanges.gitScope'),
        description: t('sessionChanges.gitScopeHint'),
        icon: <GitDiffIcon size={12} />,
      },
      branch: {
        label: t('sessionChanges.branchScope'),
        description: t('sessionChanges.branchScopeHint', { branch: vcsInfo?.default_branch ?? 'main' }),
        icon: <GitBranchIcon size={12} />,
      },
      session: {
        label: t('sessionChanges.sessionScope'),
        description: t('sessionChanges.sessionScopeHint'),
        icon: <LayersIcon size={12} />,
      },
      turn: {
        label: t('sessionChanges.turnScope'),
        description: t('sessionChanges.turnScopeHint'),
        icon: <ClockIcon size={12} />,
      },
    }),
    [t, vcsInfo?.default_branch],
  )
  const diffs = useMemo(
    () =>
      changeMode === 'git'
        ? gitDiffs
        : changeMode === 'branch'
          ? branchDiffs
          : changeMode === 'session'
            ? sessionDiffs
            : turnDiffs,
    [branchDiffs, changeMode, gitDiffs, sessionDiffs, turnDiffs],
  )
  const loading = projectLoading || initializingGit || loadingModes[changeMode]

  const focusChangeMenuOption = useCallback((mode: ChangeMode) => {
    changeMenuOptionRefs.current[mode]?.focus()
  }, [])

  const isVisibleFocusableElement = useCallback((target: EventTarget | null) => {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
    const candidate = element?.closest<HTMLElement>(
      'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (!candidate) return false

    const style = window.getComputedStyle(candidate)
    return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0'
  }, [])

  const focusRelativeToChangeTrigger = useCallback((direction: 1 | -1) => {
    const trigger = changeMenuTriggerRef.current
    if (!trigger) return

    const focusables = Array.from(
      document.body.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(element => !element.closest('[aria-hidden="true"]'))

    const currentIndex = focusables.findIndex(item => item === trigger)
    if (currentIndex === -1) return
    focusables[currentIndex + direction]?.focus()
  }, [])

  useEffect(() => {
    openDiffFilesRef.current = openDiffFiles
  }, [openDiffFiles])

  useEffect(() => {
    setMountedPreviewFiles(prev => {
      const openFiles = new Set(openDiffFiles)
      const next = new Set([...prev].filter(file => openFiles.has(file)))
      if (selectedFile) next.add(selectedFile)
      if (next.size === prev.size && [...next].every(file => prev.has(file))) return prev
      return next
    })
  }, [openDiffFiles, selectedFile])

  useEffect(() => {
    selectedFileRef.current = selectedFile
  }, [selectedFile])

  useEffect(() => {
    if (!changeMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (changeMenuRef.current?.contains(target) || changeMenuTriggerRef.current?.contains(target)) {
        return
      }
      setChangeMenuOpen(false)
      if (!isVisibleFocusableElement(event.target)) {
        changeMenuTriggerRef.current?.focus()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setChangeMenuOpen(false)
        changeMenuTriggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [changeMenuOpen, isVisibleFocusableElement])

  useEffect(() => {
    if (!changeMenuOpen) return

    const targetMode =
      changeMenuOpenFocusRef.current === 'first'
        ? changeOptions[0]
        : changeMenuOpenFocusRef.current === 'last'
          ? changeOptions[changeOptions.length - 1]
          : changeOptions.includes(changeMode)
            ? changeMode
            : preferredChangeMode
    const timerId = window.setTimeout(() => {
      focusChangeMenuOption(targetMode)
    }, 0)

    return () => {
      clearTimeout(timerId)
    }
  }, [changeMenuOpen, changeOptions, changeMode, focusChangeMenuOption, preferredChangeMode])

  const handleChangeMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (changeOptions.length === 0) return

      const currentIndex = changeOptions.findIndex(mode => changeMenuOptionRefs.current[mode] === document.activeElement)
      if (event.key === 'Escape') {
        event.preventDefault()
        setChangeMenuOpen(false)
        changeMenuTriggerRef.current?.focus()
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        setChangeMenuOpen(false)
        window.setTimeout(() => {
          focusRelativeToChangeTrigger(event.shiftKey ? -1 : 1)
        }, 0)
        return
      }

      const focusByIndex = (index: number) => {
        const targetMode = changeOptions[index]
        if (targetMode) focusChangeMenuOption(targetMode)
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % changeOptions.length
        focusByIndex(nextIndex)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        const nextIndex = currentIndex === -1 ? changeOptions.length - 1 : (currentIndex - 1 + changeOptions.length) % changeOptions.length
        focusByIndex(nextIndex)
      } else if (event.key === 'Home') {
        event.preventDefault()
        focusByIndex(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        focusByIndex(changeOptions.length - 1)
      }
    },
    [changeOptions, focusChangeMenuOption, focusRelativeToChangeTrigger],
  )

  const loadProjectState = useCallback(async () => {
    if (!sessionId) return null

    const requestId = ++projectRequestIdRef.current
    setProjectLoading(true)
    setError(null)

    try {
      const nextProject = await getCurrentProject(directory)
      if (requestId !== projectRequestIdRef.current) return null
      setProject(nextProject)
      if (nextProject.vcs) {
        const nextVcsInfo = await getVcsInfo(directory).catch(() => null)
        if (requestId !== projectRequestIdRef.current) return null
        setVcsInfo(nextVcsInfo)
      } else {
        setVcsInfo(null)
      }
      return nextProject
    } catch (err) {
      if (requestId !== projectRequestIdRef.current) return null
      sessionErrorHandler('load current project', err)
      setProject(null)
      setVcsInfo(null)
      setError(t('sessionChanges.failedToLoad'))
      return null
    } finally {
      if (requestId === projectRequestIdRef.current) {
        setProjectLoading(false)
      }
    }
  }, [directory, sessionId, t])

  const loadDiffMode = useCallback(
    async (mode: ChangeMode, options?: { force?: boolean; project?: ApiProject | null }) => {
      const currentProject = options?.project ?? project
      if (!sessionId || !currentProject?.vcs) return
      if (!options?.force && loadedModes[mode]) return

      const requestId = ++diffRequestIdRef.current[mode]
      setLoadingModes(prev => ({ ...prev, [mode]: true }))
      setError(null)

      try {
        let data: FileDiff[]
        if (mode === 'git' || mode === 'branch') {
          data = await getVcsDiff(mode as VcsDiffMode, directory)
        } else if (mode === 'session') {
          data = await getSessionDiff(sessionId, directory)
        } else {
          data = await getLastTurnDiff(sessionId, directory)
        }

        if (requestId !== diffRequestIdRef.current[mode]) return

        if (mode === 'git') {
          setGitDiffs(data)
        } else if (mode === 'branch') {
          setBranchDiffs(data)
        } else if (mode === 'session') {
          setSessionDiffs(data)
        } else {
          setTurnDiffs(data)
        }

        setLoadedModes(prev => ({ ...prev, [mode]: true }))
      } catch (err) {
        if (requestId !== diffRequestIdRef.current[mode]) return
        sessionErrorHandler(`load ${mode} diff`, err)
        setError(t('sessionChanges.failedToLoad'))
      } finally {
        if (requestId === diffRequestIdRef.current[mode]) {
          setLoadingModes(prev => ({ ...prev, [mode]: false }))
        }
      }
    },
    [directory, loadedModes, project, sessionId, t],
  )

  useEffect(() => {
    diffRequestIdRef.current = {
      git: diffRequestIdRef.current.git + 1,
      branch: diffRequestIdRef.current.branch + 1,
      session: diffRequestIdRef.current.session + 1,
      turn: diffRequestIdRef.current.turn + 1,
    }
    setProject(null)
    setVcsInfo(null)
    setGitDiffs([])
    setBranchDiffs([])
    setSessionDiffs([])
    setTurnDiffs([])
    setLoadedModes({ git: false, branch: false, session: false, turn: false })
    setLoadingModes({ git: false, branch: false, session: false, turn: false })
    setError(null)
    setOpenDiffFiles([])
    setSelectedFile(null)
    setMountedPreviewFiles(new Set())
    setExpandedDirs(new Set())
    setChangeMenuOpen(false)
    resetSplitHeight()

    void loadProjectState()
  }, [directory, sessionId, loadProjectState, resetSplitHeight])

  useEffect(() => {
    if (changeOptions.length === 0) return
    if (changeOptions.includes(changeMode)) return
    setChangeMode(preferredChangeMode)
  }, [changeMode, changeOptions, preferredChangeMode, setChangeMode])

  useEffect(() => {
    if (!project?.vcs) return
    if (!changeOptions.includes(changeMode)) return
    void loadDiffMode(changeMode)
  }, [changeMode, changeOptions, loadDiffMode, project?.vcs])

  useEffect(() => {
    setExpandedDirs(collectExpandedDirPaths(buildChangesTree(diffs)))
    const { nextOpenFiles, nextActiveFile } = reconcileDiffPreviewState(
      diffs,
      openDiffFilesRef.current,
      selectedFileRef.current,
    )
    setOpenDiffFiles(nextOpenFiles)
    setSelectedFile(nextActiveFile)
    if (diffs.length === 0) {
      resetSplitHeight()
    }
  }, [diffs, resetSplitHeight])

  // 刷新
  const handleRefresh = useCallback(async () => {
    const nextProject = await loadProjectState()
    if (!nextProject?.vcs) return
    await loadDiffMode(changeMode, { force: true, project: nextProject })
  }, [changeMode, loadDiffMode, loadProjectState])

  const handleInitGit = useCallback(async () => {
    setInitializingGit(true)
    setError(null)

    try {
      const nextProject = await initGitProject(directory)
      setProject(nextProject)
      setVcsInfo(null)
      setGitDiffs([])
      setBranchDiffs([])
      setSessionDiffs([])
      setTurnDiffs([])
      setLoadedModes({ git: false, branch: false, session: false, turn: false })
      setLoadingModes({ git: false, branch: false, session: false, turn: false })
      setChangeMenuOpen(false)
      void loadProjectState()
    } catch (err) {
      sessionErrorHandler('init git project', err)
      setError(t('sessionChanges.failedToInitGit'))
    } finally {
      setInitializingGit(false)
    }
  }, [directory, loadProjectState, t])

  // 选中文件
  const handleSelectFile = useCallback((file: string) => {
    setOpenDiffFiles(prev => (prev.includes(file) ? prev : [...prev, file]))
    setSelectedFile(prev => (prev === file ? prev : file))
  }, [])

  // 勾选文件用于暂存
  const handleToggleFileCheck = useCallback((file: string) => {
    setCheckedFiles(prev => {
      const next = new Set(prev)
      if (next.has(file)) next.delete(file)
      else next.add(file)
      return next
    })
  }, [])

  const handleToggleAllCheck = useCallback(() => {
    setCheckedFiles(prev => {
      const allFiles = diffs.map(diff => diff.file)
      const next = allFiles.every(file => prev.has(file)) ? [] : allFiles
      return new Set(next)
    })
  }, [diffs])

  // diffs 变化时清理失效的勾选
  useEffect(() => {
    setCheckedFiles(prev => {
      const available = new Set(diffs.map(diff => diff.file))
      const next = new Set([...prev].filter(file => available.has(file)))
      if (next.size === prev.size) return prev
      return next
    })
  }, [diffs])

  // 切换目录展开/折叠
  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // 构建树形结构
  const changesTree = useMemo(() => buildChangesTree(diffs), [diffs])

  // 关闭预览
  const handleClosePreview = useCallback(() => {
    setOpenDiffFiles([])
    setSelectedFile(null)
    resetSplitHeight()
  }, [resetSplitHeight])

  const handleActivatePreview = useCallback((file: string) => {
    setSelectedFile(prev => (prev === file ? prev : file))
  }, [])

  const handleClosePreviewTab = useCallback((file: string) => {
    setOpenDiffFiles(prev => {
      const index = prev.indexOf(file)
      if (index === -1) return prev

      const next = prev.filter(item => item !== file)
      setSelectedFile(current => {
        if (current !== file) return current
        return next[Math.min(index, next.length - 1)] ?? null
      })
      return next
    })
  }, [])

  const handleReorderPreviewTabs = useCallback((draggedFile: string, targetFile: string) => {
    setOpenDiffFiles(prev => {
      const draggedIndex = prev.indexOf(draggedFile)
      const targetIndex = prev.indexOf(targetFile)
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return prev

      const next = [...prev]
      const [dragged] = next.splice(draggedIndex, 1)
      next.splice(targetIndex, 0, dragged)
      return next
    })
  }, [])

  // 获取选中的 diff 数据
  const selectedDiff = selectedFile ? diffs.find(d => d.file === selectedFile) : null
  const previewDiffs = useMemo(
    () =>
      openDiffFiles
        .map(file => diffs.find(diff => diff.file === file))
        .filter((diff): diff is FileDiff => Boolean(diff)),
    [diffs, openDiffFiles],
  )
  const mountedPreviewDiffs = useMemo(
    () => previewDiffs.filter(diff => diff.file === selectedFile || mountedPreviewFiles.has(diff.file)),
    [mountedPreviewFiles, previewDiffs, selectedFile],
  )
  const showPreview = !loading && selectedDiff !== null && !(error && diffs.length === 0)

  if (projectLoading && !project) {
    return <div className="p-4 text-center text-text-400 text-[length:var(--fs-sm)]">{t('sessionChanges.loadingChanges')}</div>
  }

  if (!project && error) {
    return <div className="p-4 text-center text-danger-100 text-[length:var(--fs-sm)]">{error}</div>
  }

  if (!project?.vcs) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="max-w-xs text-center space-y-3">
          <div className="space-y-1">
            <div className="text-[length:var(--fs-base)] font-medium text-text-200">{t('sessionChanges.noGit')}</div>
            <div className="text-[length:var(--fs-sm)] text-text-400">{t('sessionChanges.noGitHint')}</div>
          </div>
          <button
            onClick={handleInitGit}
            disabled={initializingGit}
            className="inline-flex items-center justify-center rounded px-3 py-1.5 text-[length:var(--fs-sm)] font-medium bg-accent-main-100 text-white hover:bg-accent-main-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {initializingGit ? t('sessionChanges.initializingGit') : t('sessionChanges.initGit')}
          </button>
          {error && <div className="text-[length:var(--fs-sm)] text-danger-100">{error}</div>}
        </div>
      </div>
    )
  }

  // 总统计
  const totalStats = diffs.reduce(
    (acc, d) => ({
      additions: acc.additions + d.additions,
      deletions: acc.deletions + d.deletions,
    }),
    { additions: 0, deletions: 0 },
  )

  const emptyText =
    changeMode === 'git'
      ? t('sessionChanges.noGitChanges')
      : changeMode === 'branch'
        ? t('sessionChanges.noBranchChanges')
        : changeMode === 'session'
          ? t('sessionChanges.noChanges')
          : t('sessionChanges.noTurnChanges')

  const activeChangeModeMeta = changeModeMeta[changeMode]
  const compactFileCountLabel = t('sessionChanges.fileCountCompact', { count: diffs.length })
  const fullFileCountLabel = t('sessionChanges.fileCount', { count: diffs.length })
  const statFadeMaskStyle = {
    WebkitMaskImage: 'linear-gradient(to right, black 0, black calc(100% - 10px), transparent 100%)',
    maskImage: 'linear-gradient(to right, black 0, black calc(100% - 10px), transparent 100%)',
  } as const

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* 文件列表区 */}
      <div
        ref={listRef}
        className="overflow-hidden flex flex-col shrink-0"
        style={
          {
            '--list-height': listHeight !== null ? `${listHeight}px` : '40%',
            height: showPreview ? 'var(--list-height)' : '100%',
            minHeight: showPreview ? MIN_LIST_HEIGHT : undefined,
          } as React.CSSProperties
        }
      >
        {/* Header */}
        <div className="relative flex h-10 items-center gap-2 px-3 shrink-0 overflow-hidden">
          <div
            className="min-w-0 flex flex-1 overflow-hidden"
            title={`+${totalStats.additions} -${totalStats.deletions} ${fullFileCountLabel}`}
            style={statFadeMaskStyle}
          >
            <div className="inline-flex h-6 min-w-max items-center gap-1.5 whitespace-nowrap text-[length:var(--fs-xxs)] font-mono tabular-nums">
              {changeMode === 'git' && diffs.length > 0 && (
                <input
                  type="checkbox"
                  checked={diffs.every(diff => checkedFiles.has(diff.file))}
                  onChange={handleToggleAllCheck}
                  title={t('sessionChanges.selectAll')}
                  aria-label={t('sessionChanges.selectAll')}
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-accent-main-100"
                />
              )}
              <span className="text-success-100">+{totalStats.additions}</span>
              <span className="text-danger-100">-{totalStats.deletions}</span>
              <span className="text-text-400">{compactFileCountLabel}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={diffs.length === 0}
              onClick={() => {
                const payload = {
                  schemaVersion: 1,
                  exportedAt: new Date().toISOString(),
                  sessionId,
                  directory,
                  scope: changeMode,
                  summary: totalStats,
                  files: diffs.map(diff => ({ file: diff.file, status: getFileStatus(diff), additions: diff.additions, deletions: diff.deletions, patch: diff.patch })),
                }
                saveData(new TextEncoder().encode(JSON.stringify(payload, null, 2)), `review-${sessionId}-${changeMode}.json`, 'application/json')
              }}
              aria-label={t('sessionChanges.exportArtifact')}
              title={t('sessionChanges.exportArtifact')}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-400 transition-colors hover:bg-bg-200/50 hover:text-text-100 disabled:opacity-40"
            >
              <DownloadIcon size={12} />
            </button>
            <button
              ref={changeMenuTriggerRef}
              type="button"
              onClick={() => {
                changeMenuOpenFocusRef.current = 'selected'
                setChangeMenuOpen(open => !open)
              }}
              onKeyDown={event => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  changeMenuOpenFocusRef.current = event.key === 'ArrowUp' ? 'last' : 'first'
                  setChangeMenuOpen(true)
                }
              }}
              aria-label={`${t('sessionChanges.mode')}: ${activeChangeModeMeta.label}`}
              aria-haspopup="menu"
              aria-expanded={changeMenuOpen}
              aria-controls={changeMenuOpen ? changeMenuId : undefined}
              title={activeChangeModeMeta.label}
              className={`
                inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors
                ${changeMenuOpen ? 'bg-bg-200 text-text-100' : 'text-text-400 hover:text-text-100 hover:bg-bg-200/50'}
              `}
            >
              <span className="shrink-0">{activeChangeModeMeta.icon}</span>
            </button>

            <DropdownMenu
              triggerRef={changeMenuTriggerRef}
              isOpen={changeMenuOpen}
              position="bottom"
              align="right"
              minWidth="170px"
              maxWidth="min(220px, calc(100vw - 24px))"
              constrainToRef={containerRef}
              className="!rounded-lg !p-1"
            >
              <div
                id={changeMenuId}
                ref={changeMenuRef}
                role="menu"
                aria-label={t('sessionChanges.mode')}
                onKeyDown={handleChangeMenuKeyDown}
                className="space-y-px"
              >
                {changeOptions.map(mode => {
                  const meta = changeModeMeta[mode]
                  const isSelected = mode === changeMode

                  return (
                    <button
                      key={mode}
                      ref={node => {
                        changeMenuOptionRefs.current[mode] = node
                        const shouldFocusNode =
                          changeMenuOpen &&
                          ((changeMenuOpenFocusRef.current === 'selected' && isSelected) ||
                            (changeMenuOpenFocusRef.current === 'first' && mode === changeOptions[0]) ||
                            (changeMenuOpenFocusRef.current === 'last' && mode === changeOptions[changeOptions.length - 1]))

                        if (node && shouldFocusNode) {
                          node.focus()
                        }
                      }}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      title={meta.description}
                      onClick={() => {
                        setChangeMode(mode)
                        setChangeMenuOpen(false)
                        changeMenuTriggerRef.current?.focus()
                      }}
                      className={`
                        group flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[length:var(--fs-sm)] transition-colors
                        ${
                          isSelected
                            ? 'bg-bg-200/70 text-text-100 font-medium'
                            : 'text-text-200 hover:bg-bg-200/60 hover:text-text-100'
                        }
                      `}
                    >
                      <span className="min-w-0 flex-1 truncate">{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            </DropdownMenu>

            {/* List Mode Toggle */}
            <div className="flex shrink-0 items-center bg-bg-200/50 rounded-md overflow-hidden border border-border-200/50">
              <button
                type="button"
                onClick={() => setListMode('flat')}
                aria-pressed={listMode === 'flat'}
                className={`px-2 py-0.5 text-[length:var(--fs-xxs)] transition-colors ${
                  listMode === 'flat' ? 'bg-bg-000 text-text-100 shadow-sm' : 'text-text-400 hover:text-text-200'
                }`}
                title={t('sessionChanges.flatList')}
              >
                {t('sessionChanges.list')}
              </button>
              <button
                type="button"
                onClick={() => setListMode('tree')}
                aria-pressed={listMode === 'tree'}
                className={`px-2 py-0.5 text-[length:var(--fs-xxs)] transition-colors ${
                  listMode === 'tree' ? 'bg-bg-000 text-text-100 shadow-sm' : 'text-text-400 hover:text-text-200'
                }`}
                title={t('sessionChanges.treeView')}
              >
                {t('sessionChanges.tree')}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex shrink-0 items-center bg-bg-200/50 rounded-md overflow-hidden border border-border-200/50">
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                aria-pressed={viewMode === 'unified'}
                className={`px-2 py-0.5 text-[length:var(--fs-xxs)] transition-colors ${
                  viewMode === 'unified' ? 'bg-bg-000 text-text-100 shadow-sm' : 'text-text-400 hover:text-text-200'
                }`}
              >
                {t('sessionChanges.unified')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                aria-pressed={viewMode === 'split'}
                className={`px-2 py-0.5 text-[length:var(--fs-xxs)] transition-colors ${
                  viewMode === 'split' ? 'bg-bg-000 text-text-100 shadow-sm' : 'text-text-400 hover:text-text-200'
                }`}
              >
                {t('sessionChanges.split')}
              </button>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              aria-label={t('common:refresh')}
              className="inline-flex h-6 w-6 items-center justify-center text-text-400 hover:text-text-100 hover:bg-bg-200/50 rounded-md transition-colors disabled:opacity-50"
              title={t('common:refresh')}
            >
              <RetryIcon size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" />
        </div>

        {changeMode === 'git' && (
          <GitActions
            files={diffs.map(diff => diff.file)}
            checkedFiles={checkedFiles}
            selectedFile={selectedFile}
            directory={directory}
            vcsInfo={vcsInfo}
            containerRef={containerRef}
            onChanged={handleRefresh}
            onError={setError}
          />
        )}

        {/* File List */}
        <div className="flex-1 overflow-auto panel-scrollbar-y">
          {loading ? (
            <div className="p-4 text-center text-text-400 text-[length:var(--fs-sm)]">{t('sessionChanges.loadingChanges')}</div>
          ) : error && diffs.length === 0 ? (
            <div className="p-4 text-center text-danger-100 text-[length:var(--fs-sm)]">{error}</div>
          ) : diffs.length === 0 ? (
            <div className="p-4 text-center text-text-400 text-[length:var(--fs-sm)]">{emptyText}</div>
          ) : (
            <div className="py-0.5">
              {listMode === 'tree'
                ? // Tree view
                  changesTree.map(node => (
                    <ChangesTreeItem
                      key={node.path}
                      node={node}
                      depth={0}
                      expandedDirs={expandedDirs}
                      checkedFiles={checkedFiles}
                      onToggleFileCheck={handleToggleFileCheck}
                      onSelectFile={handleSelectFile}
                      onToggleDir={handleToggleDir}
                    />
                  ))
                : // Flat list view
                  diffs.map(diff => {
                    const fileStatus = getFileStatus(diff)

                    return (
                      <button
                        key={diff.file}
                        onClick={() => handleSelectFile(diff.file)}
                        className={`
                       w-full min-w-0 flex items-center gap-2 px-3 py-1 text-left
                       hover:bg-bg-200/50 transition-colors text-[length:var(--fs-sm)]
                       text-text-300
                     `}
                      >
                        {changeMode === 'git' && (
                          <input
                            type="checkbox"
                            checked={checkedFiles.has(diff.file)}
                            onChange={() => handleToggleFileCheck(diff.file)}
                            onClick={event => event.stopPropagation()}
                            aria-label={t('sessionChanges.selectFile')}
                            className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-accent-main-100"
                          />
                        )}
                        <img
                          src={getMaterialIconUrl(diff.file, 'file')}
                          alt=""
                          width={16}
                          height={16}
                          className="shrink-0"
                          loading="lazy"
                          decoding="async"
                          onError={e => {
                            e.currentTarget.style.visibility = 'hidden'
                          }}
                        />
                        <span className={`flex-1 min-w-0 font-mono truncate ${FILE_STATUS_COLOR[fileStatus]}`}>
                          {diff.file}
                        </span>
                        <div className="flex items-center gap-2 text-[length:var(--fs-xxs)] font-mono shrink-0">
                          {diff.additions > 0 && <span className="text-success-100">+{diff.additions}</span>}
                          {diff.deletions > 0 && <span className="text-danger-100">-{diff.deletions}</span>}
                        </div>
                      </button>
                    )
                  })}
            </div>
          )}
        </div>
      </div>

      {/* Resize Handle - 与标签栏同色 */}
      {showPreview && (
        <div
          className={`
            h-1.5 cursor-row-resize shrink-0 relative
            hover:bg-accent-main-100/50 active:bg-accent-main-100 transition-colors
            ${isResizing ? 'bg-accent-main-100' : 'bg-bg-200/60'}
          `}
          onMouseDown={handleResizeStart}
          onTouchStart={handleTouchResizeStart}
        />
      )}

      {/* Diff 预览区 */}
      {showPreview && selectedDiff && (
        <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: MIN_PREVIEW_HEIGHT }}>
          {mountedPreviewDiffs.map(previewDiff => (
            <div key={previewDiff.file} className={previewDiff.file === selectedFile ? 'h-full min-h-0' : 'hidden'}>
              <DiffPreviewPanel
                sessionId={sessionId}
                diff={previewDiff}
                previewDiffs={previewDiffs}
                viewMode={viewMode}
                isResizing={isAnyResizing}
                onActivatePreview={handleActivatePreview}
                onClosePreview={handleClosePreviewTab}
                onReorderPreview={handleReorderPreviewTabs}
                onClose={handleClosePreview}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

const COMMIT_MESSAGE_KEY = 'opencode-commit-message'

function GitActions({
  files,
  checkedFiles,
  selectedFile,
  directory,
  vcsInfo,
  containerRef,
  onChanged,
  onError,
}: {
  files: string[]
  checkedFiles: Set<string>
  selectedFile: string | null
  directory?: string
  vcsInfo: VcsInfo | null
  containerRef: React.RefObject<HTMLDivElement | null>
  onChanged: () => Promise<void>
  onError: (message: string | null) => void
}) {
  const { t } = useTranslation(['components', 'common'])
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [action, setAction] = useState<string | null>(null)
  const [commitOpen, setCommitOpen] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [commitMessage, setCommitMessage] = useState(() => localStorage.getItem(COMMIT_MESSAGE_KEY) ?? '')
  const [pushOpen, setPushOpen] = useState(false)
  const [pullRequestOpen, setPullRequestOpen] = useState(false)
  const [pullRequestTitle, setPullRequestTitle] = useState('')
  const [pullRequestBody, setPullRequestBody] = useState('')
  const [pullRequestDraft, setPullRequestDraft] = useState(false)
  const [operationDialog, setOperationDialog] = useState<'create-branch' | 'merge' | null>(null)
  const [operationArgument, setOperationArgument] = useState('')
  const [discardFiles, setDiscardFiles] = useState<string[]>([])
  const [history, setHistory] = useState<VcsHistoryItem[] | null>(null)
  const mutationsSupported = serverStore.supports('vcsMutations')
  const advancedSupported = serverStore.supports('advancedVcs')

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const run = useCallback(
    async (name: string, operation: () => Promise<string>, reportError?: (message: string) => void) => {
      setAction(name)
      setIsOpen(false)
      onError(null)
      try {
        const output = await operation()
        await onChanged()
        notificationStore.push('completed', t(`sessionChanges.${name}Complete`), output, '', directory)
        return true
      } catch (error) {
        sessionErrorHandler(`git ${name}`, error)
        const message = error instanceof Error ? error.message : t('sessionChanges.gitActionFailed')
        onError(message)
        reportError?.(message)
        return false
      } finally {
        setAction(null)
      }
    },
    [directory, onChanged, onError, t],
  )

  const menuItemClass = 'flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-200/60 hover:text-text-100 disabled:opacity-40 disabled:cursor-not-allowed'
  const selected = selectedFile ? [selectedFile] : []
  const pullRequestUrl = createPullRequestUrl(vcsInfo?.remote_url, vcsInfo?.branch, vcsInfo?.default_branch)

  const toolbarIconButtonClass =
    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-200/80 bg-bg-200/60 text-text-200 transition-colors hover:bg-bg-300 hover:text-text-100 disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border-200/30 bg-bg-000/40 px-3 py-1.5">
        <button
          type="button"
          onClick={() => void run('stage', () => stageVcsFiles([...checkedFiles], directory))}
          disabled={checkedFiles.size === 0 || action !== null || !mutationsSupported}
          title={t('sessionChanges.stageChecked', { count: checkedFiles.size })}
          aria-label={t('sessionChanges.stageChecked', { count: checkedFiles.size })}
          className={`${toolbarIconButtonClass} ${checkedFiles.size > 0 ? '!border-accent-main-100/60 !bg-accent-main-100/10 !text-accent-main-100' : ''}`}
        >
          <CheckIcon size={13} />
          {checkedFiles.size > 0 && (
            <span className="text-[length:var(--fs-xxs)] font-mono tabular-nums">{checkedFiles.size}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false)
            setCommitError(null)
            setCommitOpen(true)
          }}
          disabled={action !== null || !mutationsSupported}
          title={t('sessionChanges.commit')}
          aria-label={t('sessionChanges.commit')}
          className={toolbarIconButtonClass}
        >
          <GitCommitIcon size={13} className={action === 'commit' ? 'animate-pulse' : ''} />
        </button>
        <div className="h-4 w-px shrink-0 bg-border-200/50" />
        <button
          type="button"
          onClick={() => void run('pull', () => runVcsOperation('pull', undefined, directory))}
          disabled={action !== null || !advancedSupported}
          title={t('sessionChanges.pull')}
          aria-label={t('sessionChanges.pull')}
          className={toolbarIconButtonClass}
        >
          <DownloadIcon size={13} className={action === 'pull' ? 'animate-pulse' : ''} />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false)
            setPushOpen(true)
          }}
          disabled={action !== null || !mutationsSupported}
          title={t('sessionChanges.push')}
          aria-label={t('sessionChanges.push')}
          className={toolbarIconButtonClass}
        >
          <UploadIcon size={13} className={action === 'push' ? 'animate-pulse' : ''} />
        </button>
        <div className="flex-1" />
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(open => !open)}
          disabled={action !== null || !mutationsSupported}
          aria-label={t('sessionChanges.gitActions')}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          title={t('sessionChanges.gitActions')}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-400 hover:text-text-100 hover:bg-bg-200/50 transition-colors disabled:opacity-50"
        >
          <MoreIcon size={13} className={action ? 'animate-pulse' : ''} />
        </button>
      </div>

      <DropdownMenu
        triggerRef={triggerRef}
        isOpen={isOpen}
        position="bottom"
        align="right"
        minWidth="190px"
        constrainToRef={containerRef}
      >
        <div ref={menuRef} role="menu" aria-label={t('sessionChanges.gitActions')} className="space-y-px">
          <button type="button" role="menuitem" disabled={!selectedFile} className={menuItemClass} onClick={() => void run('stage', () => stageVcsFiles(selected, directory))}>
            {t('sessionChanges.stageSelected')}
          </button>
          <button type="button" role="menuitem" disabled={files.length === 0} className={menuItemClass} onClick={() => void run('stage', () => stageVcsFiles(files, directory))}>
            {t('sessionChanges.stageAll')}
          </button>
          <button type="button" role="menuitem" disabled={!selectedFile} className={menuItemClass} onClick={() => void run('unstage', () => unstageVcsFiles(selected, directory))}>
            {t('sessionChanges.unstageSelected')}
          </button>
          <button type="button" role="menuitem" disabled={files.length === 0} className={menuItemClass} onClick={() => void run('unstage', () => unstageVcsFiles(files, directory))}>
            {t('sessionChanges.unstageAll')}
          </button>
          <div className="my-1 h-px bg-border-200/50" />
          <button type="button" role="menuitem" className={menuItemClass} onClick={() => { setIsOpen(false); setCommitError(null); setCommitOpen(true) }}>
            {t('sessionChanges.commit')}
          </button>
          <button type="button" role="menuitem" className={menuItemClass} onClick={() => { setIsOpen(false); setPushOpen(true) }}>
            {t('sessionChanges.push')}
          </button>
          {advancedSupported ? <>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => void run('fetch', () => runVcsOperation('fetch', undefined, directory))}>{t('sessionChanges.fetch')}</button>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => void run('pull', () => runVcsOperation('pull', undefined, directory))}>{t('sessionChanges.pull')}</button>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => void run('stash', () => runVcsOperation('stash', undefined, directory))}>{t('sessionChanges.stash')}</button>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => void run('stashPop', () => runVcsOperation('stash-pop', undefined, directory))}>{t('sessionChanges.stashPop')}</button>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => { setIsOpen(false); setOperationArgument(''); setOperationDialog('create-branch') }}>{t('sessionChanges.createBranch')}</button>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => { setIsOpen(false); setOperationArgument(''); setOperationDialog('merge') }}>{t('sessionChanges.mergeBranch')}</button>
            <button type="button" role="menuitem" className={`${menuItemClass} !text-danger-100`} onClick={() => void run('mergeAbort', () => runVcsOperation('merge-abort', undefined, directory))}>{t('sessionChanges.mergeAbort')}</button>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => { setIsOpen(false); void getVcsHistory(directory).then(setHistory).catch(error => onError(error instanceof Error ? error.message : t('sessionChanges.gitActionFailed'))) }}>{t('sessionChanges.history')}</button>
          </> : null}
          <button
            type="button"
            role="menuitem"
            disabled={!pullRequestUrl || !serverStore.supports('pullRequests')}
            className={menuItemClass}
            title={pullRequestUrl ? undefined : t('sessionChanges.pullRequestUnavailable')}
            onClick={() => {
              setIsOpen(false)
              setPullRequestTitle(vcsInfo?.branch?.replace(/[-_]+/g, ' ') || '')
              setPullRequestOpen(true)
            }}
          >
            {t('sessionChanges.createPullRequest')}
          </button>
          <div className="my-1 h-px bg-border-200/50" />
          <button type="button" role="menuitem" disabled={!selectedFile} className={`${menuItemClass} !text-danger-100`} onClick={() => { setIsOpen(false); setDiscardFiles(selected) }}>
            {t('sessionChanges.discardSelected')}
          </button>
          <button type="button" role="menuitem" disabled={files.length === 0} className={`${menuItemClass} !text-danger-100`} onClick={() => { setIsOpen(false); setDiscardFiles(files) }}>
            {t('sessionChanges.discardAll')}
          </button>
        </div>
      </DropdownMenu>

      <Dialog
        isOpen={commitOpen}
        onClose={() => setCommitOpen(false)}
        title={t('sessionChanges.commitTitle')}
        width={440}
      >
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault()
            if (!commitMessage.trim() || action !== null) return
            setCommitError(null)
            void run('commit', () => commitVcsChanges(commitMessage, directory), setCommitError).then(success => {
              if (!success) return
              localStorage.setItem(COMMIT_MESSAGE_KEY, commitMessage)
              setCommitMessage('')
              setCommitOpen(false)
            })
          }}
        >
          <textarea
            value={commitMessage}
            onChange={event => setCommitMessage(event.target.value)}
            placeholder={t('sessionChanges.commitPlaceholder')}
            rows={4}
            autoFocus
            className="w-full resize-y rounded-lg border border-border-200 bg-bg-100 px-3 py-2 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100"
          />
          {commitError && (
            <div className="rounded-lg border border-danger-100/30 bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100 whitespace-pre-wrap break-words">
              {commitError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCommitOpen(false)} disabled={action !== null}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" disabled={!commitMessage.trim()} isLoading={action === 'commit'}>
              {t('sessionChanges.commit')}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={operationDialog !== null} onClose={() => setOperationDialog(null)} title={t(operationDialog === 'merge' ? 'sessionChanges.mergeBranch' : 'sessionChanges.createBranch')} width={440}>
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault()
          const argument = operationArgument.trim()
          if (!operationDialog || !argument) return
          const label = operationDialog === 'merge' ? 'merge' : 'createBranch'
          void run(label, () => runVcsOperation(operationDialog, argument, directory)).then(success => {
            if (success) setOperationDialog(null)
          })
        }}>
          <label className="block"><span className="mb-1.5 block text-[length:var(--fs-xs)] text-text-300">{t(operationDialog === 'merge' ? 'sessionChanges.mergeBranchPrompt' : 'sessionChanges.branchNamePrompt')}</span><input value={operationArgument} onChange={event => setOperationArgument(event.target.value)} maxLength={255} autoFocus className="h-9 w-full rounded-lg border border-border-200 bg-bg-100 px-3 font-mono text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100" /></label>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOperationDialog(null)}>{t('common:cancel')}</Button><Button type="submit" disabled={!operationArgument.trim()} isLoading={action === 'merge' || action === 'createBranch'}>{t(operationDialog === 'merge' ? 'sessionChanges.mergeBranch' : 'sessionChanges.createBranch')}</Button></div>
        </form>
      </Dialog>

      <Dialog isOpen={pullRequestOpen} onClose={() => setPullRequestOpen(false)} title={t('sessionChanges.pullRequestTitle')} width={520}>
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault()
          if (!pullRequestTitle.trim() || !pullRequestUrl) return
          void run('createPr', async () => {
            const output = await pushVcsBranch(directory)
            if (typeof window.customOpenCode?.createPullRequest !== 'function') {
              await openUrl(pullRequestUrl)
              return output
            }
            const result = await window.customOpenCode.createPullRequest({
              remoteUrl: vcsInfo!.remote_url!,
              sourceBranch: vcsInfo!.branch!,
              targetBranch: vcsInfo!.default_branch!,
              title: pullRequestTitle.trim(),
              body: pullRequestBody.trim(),
              draft: pullRequestDraft,
            })
            await openUrl(result.url)
            return result.url
          }).then(success => {
            if (!success) return
            setPullRequestOpen(false)
            setPullRequestTitle('')
            setPullRequestBody('')
            setPullRequestDraft(false)
          })
        }}>
          <div><label className="mb-1.5 block text-[length:var(--fs-xs)] font-medium text-text-300">{t('sessionChanges.pullRequestTitleLabel')}</label><input value={pullRequestTitle} onChange={event => setPullRequestTitle(event.target.value)} maxLength={500} autoFocus className="h-9 w-full rounded-lg border border-border-200 bg-bg-100 px-3 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100" /></div>
          <div><label className="mb-1.5 block text-[length:var(--fs-xs)] font-medium text-text-300">{t('sessionChanges.pullRequestBodyLabel')}</label><textarea value={pullRequestBody} onChange={event => setPullRequestBody(event.target.value)} rows={7} maxLength={100000} placeholder={t('sessionChanges.pullRequestBodyPlaceholder')} className="w-full resize-y rounded-lg border border-border-200 bg-bg-100 px-3 py-2 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100" /></div>
          <label className="flex items-center gap-2 text-[length:var(--fs-sm)] text-text-300"><input type="checkbox" checked={pullRequestDraft} onChange={event => setPullRequestDraft(event.target.checked)} />{t('sessionChanges.pullRequestDraft')}</label>
          <div className="rounded-lg bg-bg-200/40 px-3 py-2 text-[length:var(--fs-xs)] text-text-400">{vcsInfo?.branch} → {vcsInfo?.default_branch}</div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPullRequestOpen(false)} disabled={action !== null}>{t('common:cancel')}</Button><Button type="submit" disabled={!pullRequestTitle.trim()} isLoading={action === 'createPr'}>{t('sessionChanges.pushAndCreatePullRequest')}</Button></div>
        </form>
      </Dialog>

      <Dialog isOpen={history !== null} onClose={() => setHistory(null)} title={t('sessionChanges.history')} width={560}>
        <div className="max-h-[440px] divide-y divide-border-200/50 overflow-auto">
          {history?.map(item => <div key={item.hash} className="flex gap-3 py-2.5">
            <code className="shrink-0 text-[length:var(--fs-xs)] text-accent-main-100">{item.shortHash}</code>
            <div className="min-w-0 flex-1"><div className="truncate text-[length:var(--fs-sm)] text-text-100">{item.subject}</div><div className="mt-0.5 text-[length:var(--fs-xs)] text-text-500">{item.author} · {new Date(item.timestamp).toLocaleString()}</div></div>
          </div>)}
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={discardFiles.length > 0}
        onClose={() => setDiscardFiles([])}
        onConfirm={() => {
          const selectedFiles = discardFiles
          void run('discard', () => discardVcsFiles(selectedFiles, directory)).then(success => {
            if (success) setDiscardFiles([])
          })
        }}
        title={t('sessionChanges.discardTitle')}
        description={t('sessionChanges.discardConfirm', { count: discardFiles.length })}
        confirmText={t('sessionChanges.discard')}
        variant="danger"
        isLoading={action === 'discard'}
      />

      <PushConfirmDialog
        isOpen={pushOpen}
        directory={directory}
        onClose={() => setPushOpen(false)}
        onConfirm={async () => {
          let pushError: string | undefined
          const success = await run('push', () => pushVcsBranch(directory), message => {
            pushError = message
          })
          return { ok: success, error: pushError }
        }}
      />
    </>
  )
}

// ============================================
// Push Confirm Dialog - 推送前核对变更
// ============================================

function PushConfirmDialog({
  isOpen,
  directory,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  directory?: string
  onClose: () => void
  onConfirm: () => Promise<{ ok: boolean; error?: string }>
}) {
  const { t } = useTranslation(['components', 'common'])
  const [diffs, setDiffs] = useState<FileDiff[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [pushing, setPushing] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setPushError(null)
    getVcsDiff('upstream', directory)
      .then(data => {
        if (cancelled) return
        setDiffs(data)
        setSelectedFile(prev => (data.some(diff => diff.file === prev) ? prev : data[0]?.file ?? null))
      })
      .catch(err => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : t('sessionChanges.gitActionFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [directory, isOpen, t])

  const selectedDiff = selectedFile ? diffs.find(diff => diff.file === selectedFile) : null
  const language = selectedFile ? detectLanguage(selectedFile) : 'text'
  const { before, after, beforeLineNumbers, afterLineNumbers } = useMemo(() => {
    if (!selectedDiff) return { before: '', after: '', beforeLineNumbers: undefined, afterLineNumbers: undefined }
    if (selectedDiff.patch) return extractContentFromUnifiedDiff(selectedDiff.patch)
    if (selectedDiff.before !== undefined && selectedDiff.after !== undefined) {
      return { before: selectedDiff.before, after: selectedDiff.after, beforeLineNumbers: undefined, afterLineNumbers: undefined }
    }
    return { before: '', after: '', beforeLineNumbers: undefined, afterLineNumbers: undefined }
  }, [selectedDiff])
  const diffViewerData = useDiffViewerData(before, after, language, false, true, {
    before: beforeLineNumbers,
    after: afterLineNumbers,
  })

  const handleConfirm = useCallback(async () => {
    setPushing(true)
    const result = await onConfirm()
    setPushing(false)
    if (result.ok) onClose()
    else setPushError(result.error ?? t('sessionChanges.gitActionFailed'))
  }, [onClose, onConfirm, t])

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('sessionChanges.pushConfirmTitle')} width={760} rawContent>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-100/50 px-4 py-2">
          <div className="truncate text-[length:var(--fs-heading-3)] font-semibold text-text-100">
            {t('sessionChanges.pushConfirmTitle')}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common:close')}
            title={t('common:close')}
            className="rounded-md p-1.5 text-text-400 transition-colors hover:bg-bg-100 hover:text-text-200"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-text-400 text-[length:var(--fs-sm)]">
              {t('common:loading')}
            </div>
          ) : loadError ? (
            <div className="flex h-72 items-center justify-center">
              <div className="rounded-lg border border-danger-100/30 bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">
                {loadError}
              </div>
            </div>
          ) : diffs.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-text-400 text-[length:var(--fs-sm)]">
              {t('sessionChanges.pushNoChanges')}
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-2">
              <p className="shrink-0 text-[length:var(--fs-xs)] text-text-400">
                {t('sessionChanges.pushConfirmHint', { count: diffs.length })}
              </p>
              <div className="flex min-h-0 flex-1 gap-3">
                <div className="w-52 shrink-0 overflow-auto rounded-lg border border-border-200/60 bg-bg-100 panel-scrollbar-y">
                  {diffs.map(diff => {
                    const fileStatus = getFileStatus(diff)
                    return (
                      <button
                        key={diff.file}
                        type="button"
                        onClick={() => setSelectedFile(diff.file)}
                        className={`w-full min-w-0 flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors text-[length:var(--fs-sm)] hover:bg-bg-200/50 ${selectedFile === diff.file ? 'bg-bg-200/70' : ''}`}
                      >
                        <img
                          src={getMaterialIconUrl(diff.file, 'file')}
                          alt=""
                          width={14}
                          height={14}
                          className="shrink-0"
                          loading="lazy"
                          decoding="async"
                          onError={e => {
                            e.currentTarget.style.visibility = 'hidden'
                          }}
                        />
                        <span className={`flex-1 min-w-0 font-mono truncate ${FILE_STATUS_COLOR[fileStatus]}`}>{diff.file}</span>
                        <span className="flex shrink-0 items-center gap-1 text-[length:var(--fs-xxs)] font-mono">
                          {diff.additions > 0 && <span className="text-success-100">+{diff.additions}</span>}
                          {diff.deletions > 0 && <span className="text-danger-100">-{diff.deletions}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border-200/60">
                  {selectedDiff ? (
                    <DiffViewer before={before} after={after} language={language} viewMode="unified" data={diffViewerData} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-text-400 text-[length:var(--fs-sm)]">
                      {t('sessionChanges.pushSelectFile')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {pushError && (
            <div className="mt-2 rounded-lg border border-danger-100/30 bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100 whitespace-pre-wrap break-words">
              {pushError}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-100/50 px-4 py-2">
          <Button type="button" size="sm" variant="secondary" onClick={onClose} disabled={pushing}>
            {t('common:cancel')}
          </Button>
          <Button size="sm" onClick={() => void handleConfirm()} disabled={diffs.length === 0 || loading || loadError !== null} isLoading={pushing}>
            {t('sessionChanges.push')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

// ============================================
// Diff Preview Panel - 下方预览区
// ============================================

interface DiffPreviewPanelProps {
  sessionId: string
  diff: FileDiff
  previewDiffs: FileDiff[]
  viewMode: ViewMode
  isResizing: boolean
  onActivatePreview: (file: string) => void
  onClosePreview: (file: string) => void
  onReorderPreview: (draggedFile: string, targetFile: string) => void
  onClose: () => void
}

const DiffPreviewPanel = memo(function DiffPreviewPanel({
  sessionId,
  diff,
  previewDiffs,
  viewMode,
  isResizing,
  onActivatePreview,
  onClosePreview,
  onReorderPreview,
  onClose,
}: DiffPreviewPanelProps) {
  const language = detectLanguage(diff.file) || 'text'
  // 优先用 patch 提取 before/after，回退到直接的 before/after 字段（旧版后端兼容）
  const { before, after, beforeLineNumbers, afterLineNumbers } = useMemo(() => {
    if (diff.patch) return extractContentFromUnifiedDiff(diff.patch)
    if (diff.before !== undefined && diff.after !== undefined) {
      return { before: diff.before, after: diff.after, beforeLineNumbers: undefined, afterLineNumbers: undefined }
    }
    return { before: '', after: '', beforeLineNumbers: undefined, afterLineNumbers: undefined }
  }, [diff.patch, diff.before, diff.after])
  const diffViewerData = useDiffViewerData(
    before,
    after,
    language,
    isResizing,
    true,
    { before: beforeLineNumbers, after: afterLineNumbers },
  )
  const { t } = useTranslation(['components', 'common'])
  const [fullscreenViewMode, setFullscreenViewMode] = useState<ViewMode>(viewMode)
  const [lineSelection, setLineSelection] = useState<DiffLineSelection | null>(null)
  const [feedback, setFeedback] = useState('')
  const handleLineSelect = useCallback((selection: DiffLineSelection) => {
    setLineSelection(selection)
    setFeedback('')
  }, [])
  const fileName = diff.file.split(/[/\\]/).pop() || diff.file
  const fullscreenLayer = useMemo(
    () => ({
      id: `session-change:${diff.file}`,
      title: fileName,
      titleExtra: (
        <div className="flex items-center gap-1.5 text-[length:var(--fs-xs)] font-mono tabular-nums shrink-0">
          {diff.additions > 0 && <span className="text-success-100">+{diff.additions}</span>}
          {diff.deletions > 0 && <span className="text-danger-100">-{diff.deletions}</span>}
        </div>
      ),
      headerRight: <ViewModeSwitch viewMode={fullscreenViewMode} onChange={setFullscreenViewMode} />,
      deferContent: true,
      content: (
        <DiffViewer
          before={before}
          after={after}
          language={language}
          viewMode={fullscreenViewMode}
          data={diffViewerData}
          onLineSelect={handleLineSelect}
        />
      ),
    }),
    [after, before, diff.additions, diff.deletions, diff.file, diffViewerData, fileName, fullscreenViewMode, handleLineSelect, language],
  )
  const { open: openFullscreen } = useFullscreenLayer(fullscreenLayer)
  const previewTabItems = useMemo<PreviewTabsBarItem[]>(
    () =>
      previewDiffs.map(previewDiff => {
        const currentFileName = previewDiff.file.split(/[/\\]/).pop() || previewDiff.file

        return {
          id: previewDiff.file,
          title: previewDiff.file,
          closeTitle: `${t('common:close')} ${currentFileName}`,
          iconPath: previewDiff.file,
          label: (
            <>
              <span className="block whitespace-nowrap text-[length:var(--fs-xs)] font-mono">{currentFileName}</span>
              <span className="shrink-0 text-[length:var(--fs-xxs)] font-mono text-success-100/90">
                {previewDiff.additions > 0 ? `+${previewDiff.additions}` : ''}
              </span>
              <span className="shrink-0 text-[length:var(--fs-xxs)] font-mono text-danger-100/90">
                {previewDiff.deletions > 0 ? `-${previewDiff.deletions}` : ''}
              </span>
            </>
          ),
        }
      }),
    [previewDiffs, t],
  )

  return (
    <>
      <div className="flex flex-col h-full">
      <PreviewTabsBar
        items={previewTabItems}
        activeId={diff.file}
        closeAllTitle={t('common:closeAllTabs')}
        onActivate={onActivatePreview}
        onClose={onClosePreview}
        onCloseAll={onClose}
        onReorder={onReorderPreview}
        tabWidthClassName="w-auto max-w-none min-w-max"
        rightActions={
          <button
            onClick={() => {
              setFullscreenViewMode(viewMode)
              openFullscreen()
            }}
            className="p-1 text-text-400 hover:text-text-100 hover:bg-bg-300/50 rounded transition-colors"
            title={t('contentBlock.fullscreen')}
          >
            <MaximizeIcon size={12} />
          </button>
        }
      />

      {/* Diff Content - DiffViewer 自带滚动 */}
      <div className="flex-1 min-h-0">
        <DiffViewer
          before={before}
          after={after}
          language={language}
          viewMode={viewMode}
          isResizing={isResizing}
          data={diffViewerData}
          onLineSelect={handleLineSelect}
        />
      </div>
      </div>

      <Dialog
        isOpen={lineSelection !== null}
        onClose={() => setLineSelection(null)}
        title={t('sessionChanges.lineFeedbackTitle', { file: fileName, line: lineSelection?.line ?? '' })}
        width={460}
      >
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault()
            if (!lineSelection || !feedback.trim()) return
            const side = lineSelection.side === 'before' ? t('sessionChanges.beforeChange') : t('sessionChanges.afterChange')
            insertComposerDraft({
              sessionId,
              text: t('sessionChanges.lineFeedbackPrompt', {
                file: diff.file,
                line: lineSelection.line,
                side,
                feedback: feedback.trim(),
              }),
            })
            setLineSelection(null)
          }}
        >
          <p className="text-[length:var(--fs-sm)] text-text-400">{t('sessionChanges.lineFeedbackHint')}</p>
          <textarea
            value={feedback}
            onChange={event => setFeedback(event.target.value)}
            placeholder={t('sessionChanges.lineFeedbackPlaceholder')}
            rows={4}
            autoFocus
            className="w-full resize-y rounded-lg border border-border-200 bg-bg-100 px-3 py-2 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLineSelection(null)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" disabled={!feedback.trim()}>
              {t('sessionChanges.addToConversation')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
})

// ============================================
// File Status Helpers
// ============================================

type FileStatus = 'added' | 'modified' | 'deleted'

function getFileStatus(diff: FileDiff): FileStatus {
  if (diff.status) return diff.status as FileStatus
  if (diff.deletions === 0 && diff.additions > 0) return 'added'
  if (diff.additions === 0 && diff.deletions > 0) return 'deleted'
  // 旧版 before/after 兼容
  if (diff.before !== undefined && diff.after !== undefined) {
    if (!diff.before.trim()) return 'added'
    if (!diff.after.trim()) return 'deleted'
  }
  return 'modified'
}

const FILE_STATUS_COLOR: Record<FileStatus, string> = {
  added: 'text-success-100',
  deleted: 'text-danger-100',
  modified: 'text-warning-100',
}

// ============================================
// Changes Tree Data Structure
// ============================================

interface ChangesTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  diff?: FileDiff
  children: ChangesTreeNode[]
  additions: number
  deletions: number
  status?: FileStatus
}

/**
 * 将扁平的 FileDiff[] 转换为树形结构
 */
function buildChangesTree(diffs: FileDiff[]): ChangesTreeNode[] {
  const root: ChangesTreeNode[] = []

  for (const diff of diffs) {
    const parts = diff.file.split(/[/\\]/).filter(Boolean)
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join('/')

      let existing = currentLevel.find(n => n.name === part)

      if (!existing) {
        const status = isFile ? getFileStatus(diff) : undefined
        existing = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          diff: isFile ? diff : undefined,
          children: [],
          additions: isFile ? diff.additions : 0,
          deletions: isFile ? diff.deletions : 0,
          status,
        }
        currentLevel.push(existing)
      }

      if (!isFile) {
        // 累加目录的统计
        existing.additions += diff.additions
        existing.deletions += diff.deletions
        currentLevel = existing.children
      }
    }
  }

  // 递归排序 + 计算目录状态：目录在前，文件在后，同类按名称排序
  const processNodes = (nodes: ChangesTreeNode[]): ChangesTreeNode[] => {
    return nodes
      .map(n => {
        const processedChildren = processNodes(n.children)
        // 计算目录的累积状态
        let dirStatus: FileStatus | undefined = undefined
        if (n.type === 'directory' && processedChildren.length > 0) {
          // 优先级: added > modified > deleted
          const hasAdded = processedChildren.some(c => c.status === 'added')
          const hasModified = processedChildren.some(c => c.status === 'modified')
          const hasDeleted = processedChildren.some(c => c.status === 'deleted')
          if (hasAdded) dirStatus = 'added'
          else if (hasModified) dirStatus = 'modified'
          else if (hasDeleted) dirStatus = 'deleted'
        }
        return {
          ...n,
          children: processedChildren,
          status: n.type === 'directory' ? dirStatus : n.status,
        }
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }

  return processNodes(root)
}

function collectExpandedDirPaths(nodes: ChangesTreeNode[]): Set<string> {
  const allDirPaths = new Set<string>()

  const collectDirs = (entries: ChangesTreeNode[]) => {
    for (const node of entries) {
      if (node.type === 'directory') {
        allDirPaths.add(node.path)
        collectDirs(node.children)
      }
    }
  }

  collectDirs(nodes)
  return allDirPaths
}

// ============================================
// ChangesTreeItem Component
// ============================================

interface ChangesTreeItemProps {
  node: ChangesTreeNode
  depth: number
  expandedDirs: Set<string>
  checkedFiles?: Set<string>
  onToggleFileCheck?: (file: string) => void
  onSelectFile: (path: string) => void
  onToggleDir: (path: string) => void
}

const ChangesTreeItem = memo(function ChangesTreeItem({
  node,
  depth,
  expandedDirs,
  checkedFiles,
  onToggleFileCheck,
  onSelectFile,
  onToggleDir,
}: ChangesTreeItemProps) {
  const { t } = useTranslation(['components', 'common'])
  const isExpanded = expandedDirs.has(node.path)
  const paddingLeft = 8 + depth * 16

  // 状态颜色
  const statusColor = node.status ? FILE_STATUS_COLOR[node.status] : 'text-text-400'

  if (node.type === 'directory') {
    return (
      <>
        <button
          onClick={() => onToggleDir(node.path)}
          className="w-full min-w-0 flex items-center gap-1.5 py-1 hover:bg-bg-200/50 transition-colors text-[length:var(--fs-sm)] text-text-300"
          style={{ paddingLeft }}
        >
          <ChevronRightIcon size={12} className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          <img
            src={getMaterialIconUrl(node.path, 'directory', isExpanded)}
            alt=""
            width={16}
            height={16}
            className="shrink-0"
            loading="lazy"
            decoding="async"
            onError={e => {
              e.currentTarget.style.visibility = 'hidden'
            }}
          />
          <span className={`flex-1 min-w-0 truncate text-left ${node.status ? statusColor : ''}`}>{node.name}</span>
          <div className="flex items-center gap-1.5 text-[length:var(--fs-xxs)] font-mono pr-3 shrink-0">
            {node.additions > 0 && <span className="text-success-100">+{node.additions}</span>}
            {node.deletions > 0 && <span className="text-danger-100">-{node.deletions}</span>}
          </div>
        </button>
        {isExpanded &&
          node.children.map(child => (
            <ChangesTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedDirs={expandedDirs}
              checkedFiles={checkedFiles}
              onToggleFileCheck={onToggleFileCheck}
              onSelectFile={onSelectFile}
              onToggleDir={onToggleDir}
            />
          ))}
      </>
    )
  }

  // File node
  return (
    <button
      onClick={() => node.diff && onSelectFile(node.diff.file)}
      className={`
         w-full min-w-0 flex items-center gap-1.5 py-1 transition-colors text-[length:var(--fs-sm)]
         hover:bg-bg-200/50
         text-text-300
       `}
      style={{ paddingLeft: paddingLeft + 16 }}
    >
      {onToggleFileCheck && (
        <input
          type="checkbox"
          checked={checkedFiles?.has(node.path) ?? false}
          onChange={() => onToggleFileCheck(node.path)}
          onClick={event => event.stopPropagation()}
          aria-label={t('sessionChanges.selectFile')}
          className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-accent-main-100"
        />
      )}
      <img
        src={getMaterialIconUrl(node.name, 'file')}
        alt=""
        width={16}
        height={16}
        className="shrink-0"
        loading="lazy"
        decoding="async"
        onError={e => {
          e.currentTarget.style.visibility = 'hidden'
        }}
      />
      <span
        className={`flex-1 min-w-0 font-mono truncate text-left ${node.status ? FILE_STATUS_COLOR[node.status] : ''}`}
      >
        {node.name}
      </span>
      <div className="flex items-center gap-1.5 text-[length:var(--fs-xxs)] font-mono pr-3 shrink-0">
        {node.additions > 0 && <span className="text-success-100">+{node.additions}</span>}
        {node.deletions > 0 && <span className="text-danger-100">-{node.deletions}</span>}
      </div>
    </button>
  )
})
