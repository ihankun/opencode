import { useState, useRef, useEffect, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PanelRightIcon,
  PanelBottomIcon,
  ChevronDownIcon,
  SidebarIcon,
  SplitHorizontalIcon,
  MaximizeIcon,
  MinimizeIcon,
  ArchiveIcon,
  PinIcon,
  PencilIcon,
  GitWorktreeIcon,
  GitCommitIcon,
  RestoreIcon,
} from '../../components/Icons'
import { IconButton } from '../../components/ui'
import { messageStore, useMessageStore } from '../../store'
import { useLayoutStore, layoutStore } from '../../store/layoutStore'
import { useSessionContext } from '../../contexts/useSessionContext'
import { archiveSession, moveSession, updateSession } from '../../api'
import { useDirectory } from '../../contexts/useDirectory'
import { isSameDirectory, uiErrorHandler } from '../../utils'
import { useChatViewport } from './chatViewport'
import { pinnedSessionsStore } from '../../store/pinnedSessionsStore'
import { executionTargetStore } from '../../store/executionTargetStore'
import { serverStore } from '../../store/serverStore'
import { checkpointStore, type WorkspaceCheckpoint } from '../../store/checkpointStore'
import { createWorkspaceCheckpoint, restoreWorkspaceCheckpoint } from '../../api/checkpoint'
import { useRouter } from '../../hooks/useRouter'
import vscodeIcon from '../../../../../assets/app-vscode.png'
import finderIcon from '../../../../../assets/app-finder.png'
import terminalIcon from '../../../../../assets/app-terminal.png'
import intellijIdeaIcon from '../../../../../assets/app-intellij-idea.png'
import cursorIcon from '../../../../../assets/app-cursor.png'

type LocationApp = { id: string; name: string; icon?: string }

const locationAppIcons: Record<string, string> = {
  vscode: vscodeIcon,
  intellij: intellijIdeaIcon,
  cursor: cursorIcon,
  terminal: terminalIcon,
}

function LocationAppIcon({ app, className }: { app: LocationApp; className: string }) {
  const icon = app.name === 'Finder' ? finderIcon : locationAppIcons[app.id] ?? app.icon
  if (!icon) return null
  return <img src={icon} alt="" aria-hidden="true" className={className} />
}

interface HeaderProps {
  onOpenSidebar?: () => void
  onToggleRightPanel?: () => void
  onSplitPane?: () => void
  isPaneFullscreen?: boolean
  onTogglePaneFullscreen?: () => void
  onArchiveSession?: () => Promise<void> | void
}

interface SessionTitleControlProps {
  compact: boolean
  isEditingTitle: boolean
  editTitle: string
  sessionTitle: string
  titleInputRef: React.RefObject<HTMLInputElement | null>
  setEditTitle: (value: string) => void
  setIsEditingTitle: (value: boolean) => void
  handleRename: () => void
  handleStartEdit: () => void
  sessionId: string | null
  sessionMenuOpen: boolean
  onToggleSessionMenu: () => void
  onPin: () => void
  onArchive: () => void
  onHandoff?: () => void
  checkpoints: WorkspaceCheckpoint[]
  checkpointBusy: boolean
  onCreateCheckpoint: () => void
  onRestoreCheckpoint: (checkpoint: WorkspaceCheckpoint) => void
  clickToRenameTitle: string
  sessionActionsTitle: string
  pinTitle: string
  renameTitle: string
  archiveTitle: string
  handoffTitle: string
  createCheckpointTitle: string
  restoreCheckpointTitle: string
  menuRef: RefObject<HTMLDivElement | null>
}

function SessionTitleControl({
  compact,
  isEditingTitle,
  editTitle,
  sessionTitle,
  titleInputRef,
  setEditTitle,
  setIsEditingTitle,
  handleRename,
  handleStartEdit,
  sessionId,
  sessionMenuOpen,
  onToggleSessionMenu,
  onPin,
  onArchive,
  onHandoff,
  checkpoints,
  checkpointBusy,
  onCreateCheckpoint,
  onRestoreCheckpoint,
  clickToRenameTitle,
  sessionActionsTitle,
  pinTitle,
  renameTitle,
  archiveTitle,
  handoffTitle,
  createCheckpointTitle,
  restoreCheckpointTitle,
  menuRef,
}: SessionTitleControlProps) {
  const inputClass = compact
    ? 'px-2 py-1.5 text-[length:var(--fs-base)] font-medium text-text-100 bg-transparent border-none outline-none w-[160px] h-full'
    : 'px-3 py-1.5 text-[length:var(--fs-base)] font-medium text-text-100 bg-transparent border-none outline-none w-[200px] lg:w-[300px] h-full text-center'
  const buttonClass = compact
    ? 'px-2 py-1.5 text-[length:var(--fs-base)] font-medium text-text-200 hover:text-text-100 transition-colors truncate max-w-[200px] cursor-text select-none'
    : 'px-3 py-1.5 text-[length:var(--fs-base)] font-medium text-text-200 hover:text-text-100 transition-colors truncate max-w-[300px] cursor-text select-none text-center'
  const dividerClass = compact
    ? 'w-[1.5px] h-3 bg-border-200/50 mx-0.5 shrink-0'
    : 'w-[1.5px] h-3 bg-border-200/50 mx-0.5 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(any-pointer:coarse)]:opacity-100 transition-opacity'
  const menuButtonClass = compact
    ? 'p-1 text-text-400 hover:text-text-100 transition-colors rounded-md hover:bg-bg-300/50 shrink-0'
    : 'p-1 text-text-400 hover:text-text-100 transition-colors rounded-md hover:bg-bg-300/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(any-pointer:coarse)]:opacity-100 shrink-0'

  return (
    <div
      ref={menuRef}
      className={`flex items-center group ${isEditingTitle ? 'bg-bg-200/50 ring-1 ring-accent-main-100' : 'bg-transparent hover:bg-bg-200/50 border border-transparent hover:border-border-200/50'} rounded-lg transition-all duration-200 p-0.5 min-w-0 shrink`}
    >
      {isEditingTitle ? (
        <input
          ref={titleInputRef}
          type="text"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') setIsEditingTitle(false)
          }}
          className={inputClass}
        />
      ) : (
          <button type="button" onClick={handleStartEdit} className={buttonClass} title={clickToRenameTitle}>
            {sessionTitle}
          </button>
      )}

      {!isEditingTitle && sessionId && (
        <>
          <div className={dividerClass} />
          <div className="relative shrink-0">
            <button type="button" className={menuButtonClass} title={sessionActionsTitle} aria-label={sessionActionsTitle} onClick={onToggleSessionMenu}>
              <ChevronDownIcon size={12} />
            </button>
            {sessionMenuOpen && (
              <div className="absolute left-0 top-full z-[70] mt-1 w-64 rounded-lg border border-border-200 bg-bg-100 p-1 shadow-lg">
                <button type="button" onClick={onPin} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-200"><PinIcon size={14} />{pinTitle}</button>
                <button type="button" onClick={() => { onToggleSessionMenu(); handleStartEdit() }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-200"><PencilIcon size={14} />{renameTitle}</button>
                {onHandoff && <button type="button" onClick={onHandoff} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-200"><GitWorktreeIcon size={14} />{handoffTitle}</button>}
                <button type="button" disabled={checkpointBusy} onClick={onCreateCheckpoint} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-200 disabled:opacity-50"><GitCommitIcon size={14} />{createCheckpointTitle}</button>
                {checkpoints.length > 0 ? (
                  <div className="my-1 border-t border-border-100 pt-1">
                    <div className="px-2.5 py-1 text-[length:var(--fs-xs)] text-text-500">{restoreCheckpointTitle}</div>
                    {checkpoints.slice(0, 5).map(checkpoint => (
                      <button key={checkpoint.id} type="button" disabled={checkpointBusy} onClick={() => onRestoreCheckpoint(checkpoint)} title={checkpoint.directory} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-200 hover:text-text-100 disabled:opacity-50">
                        <RestoreIcon size={13} className="shrink-0" />
                        <span className="truncate">{checkpoint.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <button type="button" onClick={onArchive} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-200"><ArchiveIcon size={14} />{archiveTitle}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function Header({
  onOpenSidebar,
  onToggleRightPanel,
  onSplitPane,
  isPaneFullscreen = false,
  onTogglePaneFullscreen,
  onArchiveSession,
}: HeaderProps) {
  const { t } = useTranslation('chat')
  const { sessionId, sessionDirectory, sessionTitle: currentSessionTitle } = useMessageStore()
  const { rightPanelOpen, bottomPanelOpen } = useLayoutStore()
  const { refresh } = useSessionContext()
  const { currentDirectory, pathInfo, setCurrentDirectory } = useDirectory()
  const { navigateToSession } = useRouter()
  const { presentation, interaction } = useChatViewport()

  const [sessionMenuOpen, setSessionMenuOpen] = useState(false)
  const [locationMenuOpen, setLocationMenuOpen] = useState(false)
  const [locationApps, setLocationApps] = useState<LocationApp[]>([])
  const [selectedLocationApp, setSelectedLocationApp] = useState('vscode')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [checkpoints, setCheckpoints] = useState<WorkspaceCheckpoint[]>([])
  const [checkpointBusy, setCheckpointBusy] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const sessionMenuRef = useRef<HTMLDivElement>(null)
  const locationMenuRef = useRef<HTMLDivElement>(null)

  const sessionTitle = currentSessionTitle || t('header.newChat')
  const isCompact = presentation.isCompact
  const projectLocation = sessionDirectory && (!pathInfo?.directory || !isSameDirectory(sessionDirectory, pathInfo.directory))
  const selectedLocationAppDetails = locationApps.find(app => app.id === selectedLocationApp)
  const executionTarget = sessionId
    ? executionTargetStore.getSession(serverStore.getActiveServerId(), sessionId)
    : undefined

  useEffect(() => {
    document.title = currentSessionTitle ? `${currentSessionTitle} - OpenCodex` : 'OpenCodex'
    return () => {
      document.title = 'OpenCodex'
    }
  }, [currentSessionTitle])

  useEffect(() => {
    setIsEditingTitle(false)
    setCheckpoints(sessionId ? checkpointStore.list(sessionId) : [])
  }, [sessionId])

  useEffect(() => {
    const saved = localStorage.getItem('opencodex.location-app')
    if (saved) setSelectedLocationApp(saved)
  }, [])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    if (!sessionMenuOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !sessionMenuRef.current?.contains(event.target)) setSessionMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSessionMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [sessionMenuOpen])

  useEffect(() => {
    if (!locationMenuOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !locationMenuRef.current?.contains(event.target)) setLocationMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLocationMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [locationMenuOpen])

  const handleStartEdit = () => {
    if (!sessionId) return
    setEditTitle(sessionTitle)
    setIsEditingTitle(true)
  }

  const handleRename = async () => {
    if (!sessionId || !editTitle.trim() || editTitle === sessionTitle) {
      setIsEditingTitle(false)
      return
    }
    try {
      const updated = await updateSession(sessionId, { title: editTitle.trim() }, sessionDirectory || currentDirectory)
      messageStore.updateSessionMetadata(sessionId, { title: updated.title })
      refresh()
    } catch (e) {
      uiErrorHandler('rename session', e)
    } finally {
      setIsEditingTitle(false)
    }
  }

  const handlePin = () => {
    if (!sessionId) return
    const directory = sessionDirectory || currentDirectory
    if (!directory) return
    pinnedSessionsStore.pin({ sessionId, directory, title: sessionTitle })
    setSessionMenuOpen(false)
  }

  const handleArchive = async () => {
    if (!sessionId) return
    try {
      if (onArchiveSession) {
        await onArchiveSession()
      } else {
        await archiveSession(sessionId, sessionDirectory || currentDirectory)
        pinnedSessionsStore.unpin(sessionId)
      }
      await refresh()
      setSessionMenuOpen(false)
    } catch (error) {
      uiErrorHandler('archive session', error)
    }
  }

  const handleHandoff = async () => {
    if (!sessionId || !executionTarget?.sourceDirectory) return
    if (!window.confirm(t('header.handoffConfirm'))) return
    try {
      const destination = executionTarget.sourceDirectory
      await moveSession(sessionId, destination, true)
      executionTargetStore.bindSession(sessionId, {
        ...executionTarget,
        directory: destination,
        sourceDirectory: undefined,
        executionMode: 'current',
        worktreeId: undefined,
      })
      messageStore.updateSessionMetadata(sessionId, { directory: destination })
      setCurrentDirectory(destination)
      navigateToSession(sessionId, destination)
      setSessionMenuOpen(false)
      await refresh()
    } catch (error) {
      uiErrorHandler('handoff session', error)
    }
  }

  const handleCreateCheckpoint = async () => {
    const directory = sessionDirectory || currentDirectory
    if (!sessionId || !directory) return
    setCheckpointBusy(true)
    try {
      const result = await createWorkspaceCheckpoint(directory)
      checkpointStore.add({
        sessionId,
        directory,
        snapshot: result.snapshot,
        label: new Date().toLocaleString(),
      })
      setCheckpoints(checkpointStore.list(sessionId))
    } catch (error) {
      uiErrorHandler('create workspace checkpoint', error)
    } finally {
      setCheckpointBusy(false)
    }
  }

  const handleRestoreCheckpoint = async (checkpoint: WorkspaceCheckpoint) => {
    if (!window.confirm(t('header.restoreCheckpointConfirm', { label: checkpoint.label }))) return
    setCheckpointBusy(true)
    try {
      await restoreWorkspaceCheckpoint(checkpoint.snapshot, checkpoint.directory)
      setSessionMenuOpen(false)
      window.dispatchEvent(new CustomEvent('opencodex:workspace-restored', { detail: checkpoint.directory }))
    } catch (error) {
      uiErrorHandler('restore workspace checkpoint', error)
    } finally {
      setCheckpointBusy(false)
    }
  }

  const loadLocationApps = async () => {
    if (!window.customOpenCode?.locationApps) return []
    try {
      const apps = await window.customOpenCode.locationApps()
      setLocationApps(apps)
      setSelectedLocationApp(current => (apps.some(app => app.id === current) ? current : (apps[0]?.id ?? 'default')))
      return apps
    } catch (error) {
      uiErrorHandler('load installed applications', error)
      return []
    }
  }

  useEffect(() => {
    void loadLocationApps()
  }, [])

  const toggleLocationMenu = async () => {
    const nextOpen = !locationMenuOpen
    setLocationMenuOpen(nextOpen)
    if (nextOpen) await loadLocationApps()
  }

  const openLocation = async (appId: string) => {
    const location = projectLocation ? sessionDirectory : undefined
    if (!location) return
    try {
      await window.customOpenCode.openLocation({ path: location, appId })
      setLocationMenuOpen(false)
    } catch (error) {
      uiErrorHandler('open location', error)
    }
  }

  const openSelectedLocation = async () => {
    const apps = locationApps.length > 0 ? locationApps : await loadLocationApps()
    await openLocation(apps.some(app => app.id === selectedLocationApp) ? selectedLocationApp : (apps[0]?.id ?? 'default'))
  }

  const selectLocationApp = (appId: string) => {
    setSelectedLocationApp(appId)
    localStorage.setItem('opencodex.location-app', appId)
    setLocationMenuOpen(false)
  }

  const titleControl = (
    <SessionTitleControl
      compact={isCompact}
      isEditingTitle={isEditingTitle}
      editTitle={editTitle}
      sessionTitle={sessionTitle}
      titleInputRef={titleInputRef}
      setEditTitle={setEditTitle}
      setIsEditingTitle={setIsEditingTitle}
      handleRename={handleRename}
      handleStartEdit={handleStartEdit}
      sessionId={sessionId}
      sessionMenuOpen={sessionMenuOpen}
      onToggleSessionMenu={() => setSessionMenuOpen(open => !open)}
      onPin={handlePin}
      onArchive={() => void handleArchive()}
      onHandoff={executionTarget?.executionMode === 'worktree' && executionTarget.sourceDirectory ? () => void handleHandoff() : undefined}
      checkpoints={checkpoints}
      checkpointBusy={checkpointBusy}
      onCreateCheckpoint={() => void handleCreateCheckpoint()}
      onRestoreCheckpoint={checkpoint => void handleRestoreCheckpoint(checkpoint)}
      clickToRenameTitle={t('header.clickToRename')}
      sessionActionsTitle={t('header.sessionActions')}
      pinTitle={t('header.pinSession')}
      renameTitle={t('header.renameSession')}
      archiveTitle={t('header.archiveSession')}
      handoffTitle={t('header.handoffSession')}
      createCheckpointTitle={t('header.createCheckpoint')}
      restoreCheckpointTitle={t('header.restoreCheckpoint')}
      menuRef={sessionMenuRef}
    />
  )

  return (
    <div
      data-chat-header="true"
      className={`mobile-safe-topbar-14 window-drag-region flex justify-between items-center z-[60] bg-[hsl(var(--chat-bg))] transition-colors duration-200 relative ${isCompact ? 'px-2' : 'px-4'}`}
    >
      <div className="flex items-center gap-2 min-w-0 shrink-1 z-[60]">
        {interaction.sidebarBehavior === 'overlay' && onOpenSidebar && (
          <IconButton
            aria-label={t('header.openSidebar')}
            onClick={onOpenSidebar}
            className="hover:bg-bg-200/50 text-text-400 hover:text-text-100"
          >
            <SidebarIcon size={18} />
          </IconButton>
        )}

        <div className="min-w-0">{titleControl}</div>
      </div>

      <div className="flex items-center gap-1 pointer-events-auto shrink-0 z-[60]">
        <div className="flex items-center gap-0.5">
          {projectLocation && (
            <div ref={locationMenuRef} className="relative">
              <div className="flex items-center group rounded-lg border border-transparent bg-transparent p-0.5 transition-all duration-200 hover:border-border-200/50 hover:bg-bg-200/50">
                <button type="button" onClick={() => void openSelectedLocation()} className="inline-flex items-center px-2 py-1.5 text-[length:var(--fs-base)] font-medium text-text-200 transition-colors hover:text-text-100">
                  {selectedLocationAppDetails && <LocationAppIcon app={selectedLocationAppDetails} className="mr-1.5 size-4 object-contain" />}
                  {t('header.openLocation')}
                </button>
                <div className="mx-0.5 h-3 w-[1.5px] shrink-0 bg-border-200/50" />
                <button type="button" onClick={() => void toggleLocationMenu()} aria-label={t('header.selectLocationApp')} className="shrink-0 rounded-md p-1 text-text-400 transition-colors hover:bg-bg-300/50 hover:text-text-100">
                  <ChevronDownIcon size={12} />
                </button>
              </div>
              {locationMenuOpen && (
                <div className="absolute right-0 top-full z-[70] mt-1 w-48 rounded-lg border border-border-200 bg-bg-100 p-1 shadow-lg">
                  {locationApps.map(app => (
                    <button key={app.id} type="button" onClick={() => selectLocationApp(app.id)} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] ${app.id === selectedLocationApp ? 'bg-bg-200 text-text-100' : 'text-text-200 hover:bg-bg-200'}`}>
                      <LocationAppIcon app={app} className="size-5 shrink-0 object-contain" />
                      {app.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {onTogglePaneFullscreen && (
            <IconButton
              aria-label={isPaneFullscreen ? 'Exit fullscreen pane' : 'Fullscreen pane'}
              onClick={onTogglePaneFullscreen}
              className={`transition-colors ${
                isPaneFullscreen
                  ? 'text-accent-main-100 bg-bg-200/50'
                  : 'text-text-400 hover:text-text-100 hover:bg-bg-200/50'
              }`}
            >
              {isPaneFullscreen ? <MinimizeIcon size={18} /> : <MaximizeIcon size={18} />}
            </IconButton>
          )}

          {onSplitPane && (
            <IconButton
              aria-label="Split pane"
              onClick={onSplitPane}
              className="transition-colors text-text-400 hover:text-text-100 hover:bg-bg-200/50"
            >
              <SplitHorizontalIcon size={18} />
            </IconButton>
          )}

          <IconButton
            aria-label={bottomPanelOpen ? t('header.closeBottomPanel') : t('header.openBottomPanel')}
            onClick={() => layoutStore.toggleBottomPanel()}
            className={`transition-colors ${bottomPanelOpen ? 'text-accent-main-100 bg-bg-200/50' : 'text-text-400 hover:text-text-100 hover:bg-bg-200/50'}`}
          >
            <PanelBottomIcon size={18} />
          </IconButton>

          <IconButton
            aria-label={rightPanelOpen ? t('header.closePanel') : t('header.openPanel')}
            onClick={onToggleRightPanel ?? (() => layoutStore.toggleRightPanel())}
            className={`transition-colors ${rightPanelOpen ? 'text-accent-main-100 bg-bg-200/50' : 'text-text-400 hover:text-text-100 hover:bg-bg-200/50'}`}
          >
            <PanelRightIcon size={18} />
          </IconButton>
        </div>
      </div>

      <div className="absolute top-full left-0 right-0 h-8 bg-gradient-to-b from-bg-100 to-transparent pointer-events-none z-10" />
    </div>
  )
}
