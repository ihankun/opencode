import { useState, useRef, useEffect } from 'react'
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
  MoreIcon,
  PinIcon,
  PencilIcon,
} from '../../components/Icons'
import { IconButton } from '../../components/ui'
import { ShareDialog } from './ShareDialog'
import { messageStore, useMessageStore } from '../../store'
import { useLayoutStore, layoutStore } from '../../store/layoutStore'
import { useSessionContext } from '../../contexts/useSessionContext'
import { archiveSession, updateSession } from '../../api'
import { useDirectory } from '../../contexts/useDirectory'
import { isSameDirectory, uiErrorHandler } from '../../utils'
import { useChatViewport } from './chatViewport'
import { pinnedSessionsStore } from '../../store/pinnedSessionsStore'

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
  onShare: () => void
  clickToRenameTitle: string
  shareTitle: string
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
  onShare,
  clickToRenameTitle,
  shareTitle,
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
  const shareButtonClass = compact
    ? 'p-1 text-text-400 hover:text-text-100 transition-colors rounded-md hover:bg-bg-300/50 shrink-0'
    : 'p-1 text-text-400 hover:text-text-100 transition-colors rounded-md hover:bg-bg-300/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(any-pointer:coarse)]:opacity-100 shrink-0'

  return (
    <div
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

      {!isEditingTitle && (
        <>
          <div className={dividerClass} />
          <button type="button" className={shareButtonClass} title={shareTitle} aria-label={shareTitle} onClick={onShare}>
            <ChevronDownIcon size={12} />
          </button>
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
  const { currentDirectory, pathInfo } = useDirectory()
  const { presentation, interaction } = useChatViewport()

  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false)
  const [locationMenuOpen, setLocationMenuOpen] = useState(false)
  const [locationApps, setLocationApps] = useState<Array<{ id: string; name: string; icon?: string }>>([])
  const [selectedLocationApp, setSelectedLocationApp] = useState('vscode')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const sessionTitle = currentSessionTitle || t('header.newChat')
  const isCompact = presentation.isCompact
  const projectLocation = sessionDirectory && (!pathInfo?.directory || !isSameDirectory(sessionDirectory, pathInfo.directory))

  useEffect(() => {
    document.title = currentSessionTitle ? `${currentSessionTitle} - OpenCodex` : 'OpenCodex'
    return () => {
      document.title = 'OpenCodex'
    }
  }, [currentSessionTitle])

  useEffect(() => {
    setIsEditingTitle(false)
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
      onShare={() => setShareDialogOpen(true)}
      clickToRenameTitle={t('header.clickToRename')}
      shareTitle={t('header.shareSession')}
    />
  )

  return (
    <div
      data-chat-header="true"
      className={`mobile-safe-topbar-14 window-drag-region flex justify-between items-center z-20 bg-[hsl(var(--chat-bg))] transition-colors duration-200 relative ${isCompact ? 'px-2' : 'px-4'}`}
    >
      <div className="flex items-center gap-2 min-w-0 shrink-1 z-20">
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
        {sessionId && (
          <div className="relative">
            <IconButton aria-label={t('header.sessionActions')} onClick={() => setSessionMenuOpen(open => !open)} className="text-text-400 hover:bg-bg-200/50 hover:text-text-100">
              <MoreIcon size={18} />
            </IconButton>
            {sessionMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-border-200 bg-bg-100 p-1 shadow-lg">
                <button type="button" onClick={handlePin} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-200"><PinIcon size={14} />{t('header.pinSession')}</button>
                <button type="button" onClick={() => { setSessionMenuOpen(false); handleStartEdit() }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-200"><PencilIcon size={14} />{t('header.renameSession')}</button>
                <button type="button" onClick={() => void handleArchive()} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-200"><ArchiveIcon size={14} />{t('header.archiveSession')}</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 pointer-events-auto shrink-0 z-20">
        <div className="flex items-center gap-0.5">
          {projectLocation && (
            <div className="relative">
              <div className="inline-flex h-8 overflow-hidden rounded-lg border border-border-200/80 bg-bg-100 text-text-200 shadow-sm">
                <button type="button" onClick={() => void openSelectedLocation()} className="inline-flex items-center px-2.5 text-[length:var(--fs-sm)] font-medium hover:bg-bg-200/50">
                  {t('header.openLocation')}
                </button>
                <button type="button" onClick={() => void toggleLocationMenu()} aria-label={t('header.selectLocationApp')} className="border-l border-border-200/80 px-2 text-text-400 hover:bg-bg-200/50 hover:text-text-100">
                  <ChevronDownIcon size={16} />
                </button>
              </div>
              {locationMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border-200 bg-bg-100 p-1.5 shadow-lg">
                  {locationApps.map(app => <button key={app.id} type="button" onClick={() => selectLocationApp(app.id)} className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[length:var(--fs-sm)] ${app.id === selectedLocationApp ? 'bg-bg-200 text-text-100' : 'text-text-200 hover:bg-bg-200/70'}`}>{app.name}</button>)}
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

      <ShareDialog isOpen={shareDialogOpen} onClose={() => setShareDialogOpen(false)} />

      <div className="absolute top-full left-0 right-0 h-8 bg-gradient-to-b from-bg-100 to-transparent pointer-events-none z-10" />
    </div>
  )
}
