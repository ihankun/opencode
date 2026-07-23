// ============================================
// SkillPanel - Skill 管理面板
// 显示所有可用 Skill，支持查看详情
// ============================================

import { memo, useState, useEffect, useCallback, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TeachIcon,
  RetryIcon,
  SpinnerIcon,
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
  PlusIcon,
  PackagePlusIcon,
  DownloadIcon,
  CloseIcon,
  TrashIcon,
  PencilIcon,
} from './Icons'
import {
  getMarketplaceDetail,
  getMarketplaceInstalled,
  getSkills,
  installMarketplaceSkill,
  removeMarketplaceSkill,
  searchMarketplaceSkills,
  type MarketplaceDetail,
  type MarketplaceInstallation,
  type MarketplaceProvider,
  type MarketplaceScope,
  type MarketplaceSort,
  type MarketplaceSummary,
} from '../api/skill'
import { reconnectSSE } from '../api/events'
import { abortInFlightApiRequests, invalidateSDKClient } from '../api/sdk'
import { notificationStore } from '../store'
import type { Skill } from '../types/api/skill'
import { useDirectory } from '../hooks'
import { apiErrorHandler, getDirectoryName } from '../utils'
import { ConfirmDialog } from './ui/ConfirmDialog'

// ============================================
// SkillPanel Component
// ============================================

interface SkillPanelProps {
  isResizing?: boolean
  showHeader?: boolean
  windowDraggableHeader?: boolean
}

export const SkillPanel = memo(function SkillPanel({
  isResizing: _isResizing,
  showHeader = true,
  windowDraggableHeader = false,
}: SkillPanelProps) {
  const { t } = useTranslation(['components', 'common'])
  const { currentDirectory, pathInfo, savedDirectories } = useDirectory()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState<'installed' | 'marketplace'>('installed')
  const [marketSkills, setMarketSkills] = useState<ReadonlyArray<MarketplaceSummary>>([])
  const [marketInstalled, setMarketInstalled] = useState<ReadonlyArray<MarketplaceInstallation>>([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [marketDetail, setMarketDetail] = useState<MarketplaceSummary | null>(null)
  const [marketProvider, setMarketProvider] = useState<MarketplaceProvider>('official')
  const [marketSort, setMarketSort] = useState<MarketplaceSort>('recommended')
  const [marketCategory, setMarketCategory] = useState('')
  const [marketCategories, setMarketCategories] = useState<ReadonlyArray<string>>([])
  const [marketPage, setMarketPage] = useState(1)
  const [marketTotal, setMarketTotal] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialog, setDialog] = useState<'create' | 'github' | null>(null)
  const [userSkillRoot, setUserSkillRoot] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const workspaceDirectories = useMemo(
    () => uniqueWorkspaceDirectories([
      currentDirectory ? { path: currentDirectory, name: getDirectoryName(currentDirectory) || currentDirectory } : undefined,
      pathInfo?.directory ? { path: pathInfo.directory, name: getDirectoryName(pathInfo.directory) || pathInfo.directory } : undefined,
      ...savedDirectories.map(directory => ({ path: directory.path, name: directory.name })),
    ]),
    [currentDirectory, pathInfo?.directory, savedDirectories],
  )

  const loadSkills = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      if (typeof window.customOpenCode?.ensureSkillRoot === 'function') {
        const result = await window.customOpenCode.ensureSkillRoot()
        setUserSkillRoot(result.root)
        if (result.changed) await restartElectronServer()
      }
      const results = await Promise.all(
        (workspaceDirectories.length > 0 ? workspaceDirectories : [undefined]).map(async directory => {
          try {
            return await getSkills(directory?.path)
          } catch (err) {
            apiErrorHandler('load skills', err)
            return undefined
          }
        }),
      )
      const data = results.flatMap(result => result ?? [])
      if (results.every(result => result === undefined)) {
        setError(t('skillPanel.failedToLoad'))
      }
      setSkills(dedupeSkills(data))
    } catch (err) {
      apiErrorHandler('load skills', err)
      setError(t('skillPanel.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [t, workspaceDirectories])

  const showToast = useCallback((message: string) => {
    notificationStore.push('completed', message, '', '', currentDirectory || pathInfo?.directory)
  }, [currentDirectory, pathInfo?.directory])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const loadMarketplace = useCallback(async (page = 1, append = false) => {
    try {
      setMarketLoading(true)
      setMarketError(null)
      const directory = currentDirectory || pathInfo?.directory
      const [available, installed] = await Promise.all([
        searchMarketplaceSkills({
          query: filter.trim(),
          provider: marketProvider,
          sort: marketSort,
          category: marketCategory || undefined,
          page,
        }, directory),
        getMarketplaceInstalled(directory),
      ])
      setMarketSkills(current => append ? [...current, ...available.data] : available.data)
      setMarketCategories(available.categories)
      setMarketPage(available.page)
      setMarketTotal(available.total)
      setMarketInstalled(installed)
    } catch (err) {
      apiErrorHandler('load skill marketplace', err)
      setMarketError(t('skillPanel.marketplaceFailed'))
    } finally {
      setMarketLoading(false)
    }
  }, [currentDirectory, filter, marketCategory, marketProvider, marketSort, pathInfo?.directory, t])

  useEffect(() => {
    if (tab !== 'marketplace') return
    const timer = window.setTimeout(() => loadMarketplace(), filter.trim() ? 500 : 0)
    return () => window.clearTimeout(timer)
  }, [loadMarketplace, tab])

  useEffect(() => {
    if (!menuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

  // Filter skills
  const normalizedFilter = filter.toLowerCase()
  const filteredSkills = skills.filter(
    skill =>
      skill.name.toLowerCase().includes(normalizedFilter) ||
      (skill.description ?? '').toLowerCase().includes(normalizedFilter) ||
      skill.location.toLowerCase().includes(normalizedFilter),
  )
  const skillGroups = useMemo(
    () => groupSkills(filteredSkills, {
      homeDirectory: pathInfo?.home,
      userSkillRoot,
      workspaceDirectories,
      systemLabel: t('skillPanel.systemDefaultSkills'),
      projectLabel: t('skillPanel.projectSkillSource'),
      otherLabel: t('skillPanel.otherSkillSource'),
    }),
    [filteredSkills, pathInfo?.home, t, userSkillRoot, workspaceDirectories],
  )

  return (
    <div className="relative flex flex-col h-full bg-bg-100">
      {showHeader && (
        <div className={`relative flex h-10 items-center justify-between px-3 ${windowDraggableHeader ? 'window-drag-region' : ''}`}>
          <div className="flex h-6 min-w-0 items-center gap-1.5 text-text-100 text-[length:var(--fs-xs)] font-medium">
            <span>{t('skillPanel.title')}</span>
            {!loading && <span className="inline-flex h-4 items-center text-[length:var(--fs-xs)] leading-none text-text-400">({skills.length})</span>}
          </div>
          <SkillPanelActions
            loading={loading}
            menuOpen={menuOpen}
            menuRef={menuRef}
            onRefresh={loadSkills}
            onToggleMenu={() => setMenuOpen(open => !open)}
            onCreate={() => {
              setDialog('create')
              setMenuOpen(false)
            }}
            onImport={() => {
              setDialog('github')
              setMenuOpen(false)
            }}
          />
          <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" />
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-1 border-b border-border-200/30 px-3 py-2">
        {(['installed', 'marketplace'] as const).map(item => (
          <button
            key={item}
            type="button"
            onClick={() => { setTab(item); setFilter('') }}
            className={`rounded-md px-2.5 py-1 text-[length:var(--fs-xs)] transition-colors ${tab === item ? 'bg-bg-200 text-text-100' : 'text-text-400 hover:text-text-200'}`}
          >
            {t(`skillPanel.${item}`)}
          </button>
        ))}
      </div>
      {tab === 'marketplace' && <div className="flex flex-wrap items-center gap-2 border-b border-border-200/30 px-3 py-2">
        <span className="text-[length:var(--fs-xs)] text-text-400">{t('skillPanel.provider')}</span>
        <div className="flex rounded-md bg-bg-200/40 p-0.5">
          {(['official', 'netease'] as const).map(provider => <button key={provider} type="button" onClick={() => { setMarketProvider(provider); setMarketCategory(''); setMarketSort('recommended') }} className={`rounded px-2 py-1 text-[length:var(--fs-xs)] ${marketProvider === provider ? 'bg-bg-000 text-text-100 shadow-sm' : 'text-text-400'}`}>{t(`skillPanel.provider_${provider}`)}</button>)}
        </div>
        <select value={marketSort} onChange={event => setMarketSort(event.target.value as MarketplaceSort)} className="h-7 rounded-md border border-border-200/60 bg-bg-100 px-2 text-[length:var(--fs-xs)] text-text-200">
          <option value="recommended">{t('skillPanel.sortRecommended')}</option>
          {marketProvider === 'official' && <><option value="downloads">{t('skillPanel.sortDownloads')}</option><option value="stars">{t('skillPanel.sortStars')}</option><option value="aiScore">{t('skillPanel.sortAi')}</option></>}
          <option value="recent">{t('skillPanel.sortRecent')}</option>
        </select>
        {marketCategories.length > 0 && <select value={marketCategory} onChange={event => setMarketCategory(event.target.value)} className="h-7 max-w-44 rounded-md border border-border-200/60 bg-bg-100 px-2 text-[length:var(--fs-xs)] text-text-200"><option value="">{t('skillPanel.allCategories')}</option>{marketCategories.map(category => <option key={category} value={category}>{category}</option>)}</select>}
      </div>}
      <div className="relative px-3 py-2">
        <div className="relative group">
          <input
            type="text"
            name="skill-filter"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder={t(tab === 'marketplace' ? 'skillPanel.marketplaceSearch' : 'skillPanel.filterPlaceholder')}
            aria-label={t(tab === 'marketplace' ? 'skillPanel.marketplaceSearch' : 'skillPanel.filterPlaceholder')}
            autoComplete="off"
            className="w-full bg-bg-200/40 hover:bg-bg-200/60 focus:bg-bg-000 border border-transparent focus:border-border-200 rounded-md py-1.5 pl-[30px] pr-2 text-[length:var(--fs-sm)] text-text-100 placeholder:text-text-400/70 focus-visible:ring-1 focus-visible:ring-border-200 focus-visible:ring-inset transition-all"
          />
          <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-400 group-focus-within:text-accent-main-100 transition-colors" />
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'marketplace' ? (
          <MarketplaceList
            skills={marketSkills}
            installed={marketInstalled}
            loading={marketLoading}
            error={marketError}
            provider={marketProvider}
            total={marketTotal}
            onRetry={() => loadMarketplace()}
            onLoadMore={() => loadMarketplace(marketPage + 1, true)}
            onSwitchProvider={() => { setMarketProvider(current => current === 'official' ? 'netease' : 'official'); setMarketCategory('') }}
            onSelect={setMarketDetail}
          />
        ) : loading && skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2">
            <SpinnerIcon size={20} className="animate-spin opacity-50" />
            <span>{t('skillPanel.loadingSkills')}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2">
            <AlertCircleIcon size={20} className="text-danger-100" />
            <span>{error}</span>
            <button
              type="button"
              onClick={loadSkills}
              className="px-3 py-1.5 text-[length:var(--fs-sm)] bg-bg-200/50 hover:bg-bg-200 text-text-200 rounded-md transition-colors"
            >
              {t('common:retry')}
            </button>
          </div>
        ) : skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2 px-4 text-center">
            <TeachIcon size={24} className="opacity-30" />
            <span>{t('skillPanel.noSkills')}</span>
          </div>
        ) : (
          <div className="p-1">
            {skillGroups.map(section => (
              <SkillSection
                key={section.id}
                section={section}
                userSkillRoot={userSkillRoot}
                onDeleted={async name => {
                  await loadSkills()
                  showToast(t('skillPanel.deletedSkill', { name }))
                }}
              />
            ))}
          </div>
        )}
      </div>

      {dialog === 'create' && (
        <SkillCreateDialog
          homeDirectory={pathInfo?.home}
          onClose={() => setDialog(null)}
          onDone={async name => {
            await restartElectronServer()
            setFilter('')
            await loadSkills()
            showToast(t('skillPanel.createdSkill', { name }))
            setDialog(null)
          }}
        />
      )}
      {dialog === 'github' && (
        <SkillGithubDialog
          homeDirectory={pathInfo?.home}
          onClose={() => setDialog(null)}
          onDone={async name => {
            await restartElectronServer()
            setFilter('')
            await loadSkills()
            showToast(t('skillPanel.importedSkill', { name }))
            setDialog(null)
          }}
        />
      )}
      {marketDetail && (
        <MarketplaceDetailDialog
          summary={marketDetail}
          directory={currentDirectory || pathInfo?.directory}
          installed={marketInstalled.filter(item => item.id === marketDetail.id && item.provider === marketDetail.provider)}
          onClose={() => setMarketDetail(null)}
          onChanged={async () => {
            await Promise.all([loadMarketplace(), loadSkills()])
          }}
        />
      )}
    </div>
  )
})

function SkillPanelActions(props: {
  loading: boolean
  menuOpen: boolean
  menuRef: RefObject<HTMLDivElement | null>
  onRefresh: () => void
  onToggleMenu: () => void
  onCreate: () => void
  onImport: () => void
}) {
  const { t } = useTranslation(['components', 'common'])

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={props.onRefresh}
        disabled={props.loading}
        aria-label={t('common:refresh')}
        className="inline-flex h-6 w-6 items-center justify-center hover:bg-bg-200/50 rounded-md text-text-300 hover:text-text-100 transition-colors disabled:opacity-50"
        title={t('common:refresh')}
      >
        <RetryIcon size={12} className={props.loading ? 'animate-spin' : ''} />
      </button>
      <div ref={props.menuRef} className="relative">
        <button
          type="button"
          onClick={props.onToggleMenu}
          aria-expanded={props.menuOpen}
          aria-label={t('skillPanel.addSkill')}
          className="inline-flex h-6 w-6 items-center justify-center hover:bg-bg-200/50 rounded-md text-text-300 hover:text-text-100 transition-colors"
          title={t('skillPanel.addSkill')}
        >
          <PlusIcon size={13} />
        </button>
        {props.menuOpen && (
          <div
            data-dropdown-open
            className="absolute right-0 top-7 z-50 w-52 rounded-md border border-border-200/60 bg-bg-000 py-1 shadow-lg"
          >
            <button
              type="button"
              onClick={props.onCreate}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[length:var(--fs-sm)] text-text-100 hover:bg-bg-200/60"
            >
              <PackagePlusIcon size={14} className="text-text-400" />
              <span>{t('skillPanel.createSkill')}</span>
            </button>
            <button
              type="button"
              onClick={props.onImport}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[length:var(--fs-sm)] text-text-100 hover:bg-bg-200/60"
            >
              <DownloadIcon size={14} className="text-text-400" />
              <span>{t('skillPanel.importFromGithub')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MarketplaceList(props: {
  skills: ReadonlyArray<MarketplaceSummary>
  installed: ReadonlyArray<MarketplaceInstallation>
  loading: boolean
  error: string | null
  provider: MarketplaceProvider
  total: number
  onRetry: () => void
  onLoadMore: () => void
  onSwitchProvider: () => void
  onSelect: (skill: MarketplaceSummary) => void
}) {
  const { t } = useTranslation(['components', 'common'])
  if (props.loading && props.skills.length === 0) return <PanelStatus icon={<SpinnerIcon size={20} className="animate-spin" />} text={t('skillPanel.loadingMarketplace')} />
  if (props.error) return <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 text-center text-[length:var(--fs-sm)] text-text-400"><AlertCircleIcon size={20} className="text-danger-100" /><span>{props.error}</span><div className="flex gap-2"><button type="button" onClick={props.onRetry} className="rounded-md bg-bg-200 px-3 py-1.5 text-text-200">{t('common:retry')}</button><button type="button" onClick={props.onSwitchProvider} className="rounded-md border border-border-200 px-3 py-1.5 text-text-200">{t(props.provider === 'official' ? 'skillPanel.switchToNetease' : 'skillPanel.switchToOfficial')}</button></div></div>
  return (
    <div className="p-2">
      {props.loading && <SpinnerIcon size={12} className="mb-2 ml-auto animate-spin text-text-400" />}
      {props.skills.length === 0 ? <PanelStatus icon={<TeachIcon size={22} />} text={t('skillPanel.noMarketplaceSkills')} /> : (
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {props.skills.map(skill => {
            const installed = props.installed.filter(item => item.id === skill.id && item.provider === skill.provider)
            return (
              <button key={`${skill.provider}:${skill.id}`} type="button" onClick={() => props.onSelect(skill)} className="rounded-md border border-border-200/50 bg-bg-000 p-3 text-left hover:border-border-100 hover:bg-bg-200/20">
                <div className="flex items-start gap-2">
                  <TeachIcon size={16} className="mt-0.5 shrink-0 text-accent-main-100" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[length:var(--fs-sm)] font-medium text-text-100">{skill.name || skill.slug}</div>
                    <div className="mt-1 truncate text-[length:var(--fs-xs)] text-text-300">{t(`skillPanel.provider_${skill.provider}`)} · {skill.source}{skill.version ? ` · v${skill.version}` : ''}</div>
                    <div className="mt-2 line-clamp-2 text-[length:var(--fs-xs)] leading-4 text-text-400">{skill.description}</div>
                    <MarketplaceBadges skill={skill} />
                  </div>
                  {installed.length > 0 && <span className="rounded bg-success-100/10 px-1.5 py-0.5 text-[10px] text-success-100">{installed.some(item => item.updateAvailable) ? t('skillPanel.updateAvailable') : t('skillPanel.installed')}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
      {props.skills.length < props.total && <div className="flex justify-center py-3"><button type="button" disabled={props.loading} onClick={props.onLoadMore} className="rounded-md border border-border-200/60 bg-bg-000 px-3 py-1.5 text-[length:var(--fs-xs)] text-text-300 disabled:opacity-50">{t('skillPanel.loadMore')}</button></div>}
    </div>
  )
}

function PanelStatus(props: { icon: ReactNode; text: string; action?: string; onAction?: () => void }) {
  return <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 text-center text-[length:var(--fs-sm)] text-text-400">
    {props.icon}<span>{props.text}</span>
    {props.action && <button type="button" onClick={props.onAction} className="rounded-md bg-bg-200 px-3 py-1.5 text-text-200">{props.action}</button>}
  </div>
}

function MarketplaceDetailDialog(props: {
  summary: MarketplaceSummary
  directory?: string
  installed: ReadonlyArray<MarketplaceInstallation>
  onClose: () => void
  onChanged: () => void | Promise<void>
}) {
  const { t } = useTranslation(['components', 'common'])
  const [detail, setDetail] = useState<MarketplaceDetail | null>(null)
  const [scope, setScope] = useState<MarketplaceScope>(props.directory ? 'project' : 'global')
  const [selectedFile, setSelectedFile] = useState('SKILL.md')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forceAction, setForceAction] = useState<'install' | 'remove' | null>(null)

  useEffect(() => {
    getMarketplaceDetail(props.summary.id, props.summary.provider, props.directory)
      .then(nextDetail => {
        setDetail(nextDetail)
        setSelectedFile(nextDetail.files.find(file => file.path === 'SKILL.md')?.path ?? nextDetail.files[0]?.path ?? '')
      })
      .catch(err => setError(err instanceof Error ? err.message : t('skillPanel.marketplaceFailed')))
      .finally(() => setLoading(false))
  }, [props.directory, props.summary.id, props.summary.provider, t])

  const installed = props.installed.find(item => item.scope === scope)
  const mutate = async (action: 'install' | 'remove', force = false) => {
    try {
      setSubmitting(true)
      setError(null)
      if (action === 'install') await installMarketplaceSkill(props.summary.id, props.summary.provider, scope, props.directory, force)
      else await removeMarketplaceSkill(props.summary.id, props.summary.provider, scope, props.directory, force)
      await restartElectronServer()
      await props.onChanged()
      if (action === 'remove') props.onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!force && /conflict|local skill files have changes/i.test(message)) {
        setForceAction(action)
        return
      }
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <SkillDialogFrame title={props.summary.name || props.summary.slug} onClose={props.onClose}>
      {loading ? <PanelStatus icon={<SpinnerIcon size={18} className="animate-spin" />} text={t('skillPanel.loadingPreview')} /> : detail && (
        <>
          <div className="flex flex-wrap gap-2 text-[length:var(--fs-xs)] text-text-400">
            <span>{t('skillPanel.source')}: {detail.source}</span><span className="font-mono" title={detail.hash}>#{detail.hash.slice(0, 10)}</span>
          </div>
          <MarketplaceBadges skill={detail} />
          {detail.license && <div className="text-[length:var(--fs-xs)] text-text-400">{t('skillPanel.license')}: {detail.license}</div>}
          <div className="rounded-md border border-border-200/50 bg-bg-100">
            <div className="flex max-w-full gap-1 overflow-x-auto border-b border-border-200/50 p-1">
              {detail.files.map(file => <button key={file.path} type="button" onClick={() => setSelectedFile(file.path)} className={`whitespace-nowrap rounded px-2 py-1 text-[10px] ${selectedFile === file.path ? 'bg-bg-200 text-text-100' : 'text-text-400'}`}>{file.path}</button>)}
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 text-[11px] leading-5 text-text-200">{detail.files.find(file => file.path === selectedFile)?.contents}</pre>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[length:var(--fs-xs)] text-text-400">{t('skillPanel.installScope')}</span>
            <select value={scope} onChange={event => setScope(event.target.value as MarketplaceScope)} className="h-8 rounded-md border border-border-200/60 bg-bg-100 px-2 text-[length:var(--fs-xs)] text-text-100">
              <option value="global">{t('skillPanel.globalScope')}</option>
              <option value="project" disabled={!props.directory}>{t('skillPanel.projectScope')}</option>
            </select>
            {installed?.conflict && <span className="text-[length:var(--fs-xs)] text-warning-100">{t('skillPanel.localChanges')}</span>}
          </div>
        </>
      )}
      {error && <div className="rounded-md bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">{error}</div>}
      <div className="flex justify-end gap-2">
        {installed && <button type="button" disabled={submitting} onClick={() => mutate('remove')} className="inline-flex h-8 items-center justify-center rounded-md border border-danger-100/30 bg-danger-100/10 px-3 text-[length:var(--fs-sm)] font-medium text-danger-100 transition-colors hover:border-danger-100/50 hover:bg-danger-100/15 disabled:opacity-60">{t('skillPanel.uninstall')}</button>}
        <button type="button" disabled={submitting || !detail} onClick={() => mutate('install')} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent-main-100 px-3 text-[length:var(--fs-sm)] font-medium text-white disabled:opacity-60">
          {submitting && <SpinnerIcon size={13} className="animate-spin" />}{installed ? t(installed.updateAvailable ? 'skillPanel.update' : 'skillPanel.reinstall') : t('skillPanel.install')}
        </button>
      </div>
    </SkillDialogFrame>
    <ConfirmDialog isOpen={forceAction !== null} onClose={() => setForceAction(null)} onConfirm={() => { const action = forceAction; setForceAction(null); if (action) void mutate(action, true) }} title={t('skillPanel.localChanges')} description={t('skillPanel.forceConflict')} confirmText={t('common:confirm')} variant="danger" isLoading={submitting} />
    </>
  )
}

function MarketplaceBadges(props: { skill: Pick<MarketplaceSummary, 'githubStars' | 'downloadCount' | 'isVerified' | 'securityScore' | 'securityStatus' | 'aiScore' | 'reviewStatus'> & { isFeatured?: boolean; qualityScore?: number | null } }) {
  const { t } = useTranslation(['components'])
  return <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-text-400">
    {props.skill.isVerified && <span className="rounded bg-accent-main-100/10 px-1.5 py-0.5 text-accent-main-100">{t('skillPanel.verified')}</span>}
    {props.skill.isFeatured && <span className="rounded bg-warning-100/10 px-1.5 py-0.5 text-warning-100">{t('skillPanel.featured')}</span>}
    <span title={t('skillPanel.githubStars')}>★ {formatMarketplaceCount(props.skill.githubStars)}</span>
    <span title={t('skillPanel.downloads')}>↓ {formatMarketplaceCount(props.skill.downloadCount)}</span>
    {props.skill.aiScore !== null && <span>{t('skillPanel.aiScore')} {props.skill.aiScore}</span>}
    {props.skill.qualityScore !== undefined && props.skill.qualityScore !== null && <span>{t('skillPanel.qualityScore')} {props.skill.qualityScore}</span>}
    {(props.skill.securityStatus || props.skill.securityScore !== null) && <span className={props.skill.securityStatus === 'pass' ? 'text-success-100' : 'text-text-400'}>{t('skillPanel.security')}: {props.skill.securityStatus ?? props.skill.securityScore}{props.skill.securityStatus && props.skill.securityScore !== null ? ` ${props.skill.securityScore}` : ''}</span>}
    {props.skill.reviewStatus && <span>{t('skillPanel.reviewed')}: {props.skill.reviewStatus}</span>}
  </div>
}

function formatMarketplaceCount(value: number) {
  return Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

async function restartElectronServer() {
  if (typeof window.customOpenCode?.restartServer !== 'function') return
  await window.customOpenCode.restartServer()
  abortInFlightApiRequests('Electron server restarted')
  invalidateSDKClient()
  reconnectSSE()
}

function SkillCreateDialog(props: { homeDirectory?: string; onClose: () => void; onDone: (name: string) => void | Promise<void> }) {
  const { t } = useTranslation(['components', 'common'])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [scaffold, setScaffold] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try {
      setSubmitting(true)
      setError(null)
      const skillName = await createLocalSkill({
        homeDirectory: props.homeDirectory,
        name,
        description,
        content,
        scaffold,
      })
      await props.onDone(skillName)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('skillPanel.failedToCreate'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SkillDialogFrame title={t('skillPanel.createSkill')} onClose={props.onClose}>
      <SkillTextField
        label={t('skillPanel.skillName')}
        value={name}
        onChange={setName}
        placeholder={t('skillPanel.skillNamePlaceholder')}
      />
      <SkillTextField
        label={t('skillPanel.skillDescription')}
        value={description}
        onChange={setDescription}
        placeholder={t('skillPanel.skillDescriptionPlaceholder')}
      />
      <SkillTextArea
        label={t('skillPanel.skillInstructions')}
        value={content}
        onChange={setContent}
        placeholder={t('skillPanel.skillInstructionsPlaceholder')}
      />
      <label className="flex items-start gap-2 rounded-md border border-border-200/50 bg-bg-100/60 px-3 py-2 text-[length:var(--fs-xs)] text-text-300">
        <input type="checkbox" checked={scaffold} onChange={event => setScaffold(event.target.checked)} className="mt-0.5" />
        <span><strong className="block text-text-200">{t('skillPanel.fullScaffold')}</strong>{t('skillPanel.fullScaffoldDesc')}</span>
      </label>
      <SkillDiagnostics name={name} description={description} content={content} />
      <SkillDialogActions
        error={error}
        submitting={submitting}
        submitLabel={t('skillPanel.createSkill')}
        onCancel={props.onClose}
        onSubmit={submit}
      />
    </SkillDialogFrame>
  )
}

function SkillGithubDialog(props: { homeDirectory?: string; onClose: () => void; onDone: (name: string) => void | Promise<void> }) {
  const { t } = useTranslation(['components', 'common'])
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try {
      setSubmitting(true)
      setError(null)
      const skillName = await importGithubSkill({
        homeDirectory: props.homeDirectory,
        url,
        name,
      })
      await props.onDone(skillName)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('skillPanel.failedToImport'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SkillDialogFrame title={t('skillPanel.importFromGithub')} onClose={props.onClose}>
      <SkillTextField
        label={t('skillPanel.githubUrl')}
        value={url}
        onChange={setUrl}
        placeholder={t('skillPanel.githubUrlPlaceholder')}
      />
      <SkillTextField
        label={t('skillPanel.importName')}
        value={name}
        onChange={setName}
        placeholder={t('skillPanel.importNamePlaceholder')}
      />
      <div className="rounded-md bg-bg-200/40 px-3 py-2 text-[length:var(--fs-xs)] leading-5 text-text-400">
        {t('skillPanel.githubImportHint')}
      </div>
      <SkillDialogActions
        error={error}
        submitting={submitting}
        submitLabel={t('skillPanel.importSkill')}
        onCancel={props.onClose}
        onSubmit={submit}
      />
    </SkillDialogFrame>
  )
}

function SkillDialogFrame(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg-100/70 p-3 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-[420px] flex-col rounded-md border border-border-200/70 bg-bg-000 shadow-xl">
        <div className="flex h-10 items-center justify-between border-b border-border-200/50 px-3">
          <div className="min-w-0 text-[length:var(--fs-base)] font-medium text-text-100">{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-400 hover:bg-bg-200/70 hover:text-text-100"
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-auto p-3">{props.children}</div>
      </div>
    </div>
  )
}

function SkillTextField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[length:var(--fs-xs)] font-medium text-text-300">{props.label}</span>
      <input
        value={props.value}
        onChange={event => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="h-8 rounded-md border border-border-200/60 bg-bg-100 px-2 text-[length:var(--fs-sm)] text-text-100 placeholder:text-text-500 focus:border-border-100 focus:outline-none"
      />
    </label>
  )
}

function SkillTextArea(props: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[length:var(--fs-xs)] font-medium text-text-300">{props.label}</span>
      <textarea
        value={props.value}
        onChange={event => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="min-h-32 resize-y rounded-md border border-border-200/60 bg-bg-100 px-2 py-2 text-[length:var(--fs-sm)] leading-5 text-text-100 placeholder:text-text-500 focus:border-border-100 focus:outline-none"
      />
    </label>
  )
}

function SkillDialogActions(props: {
  error: string | null
  submitting: boolean
  submitLabel: string
  onCancel: () => void
  onSubmit: () => void
}) {
  const { t } = useTranslation(['common'])
  return (
    <div className="flex flex-col gap-3">
      {props.error && <div className="rounded-md bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">{props.error}</div>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          className="h-8 rounded-md px-3 text-[length:var(--fs-sm)] text-text-300 hover:bg-bg-200/60 hover:text-text-100"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={props.onSubmit}
          disabled={props.submitting}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent-main-100 px-3 text-[length:var(--fs-sm)] font-medium text-white hover:bg-accent-main-200 disabled:opacity-60"
        >
          {props.submitting && <SpinnerIcon size={13} className="animate-spin" />}
          <span>{props.submitLabel}</span>
        </button>
      </div>
    </div>
  )
}

async function createLocalSkill(input: {
  homeDirectory?: string
  name: string
  description: string
  content: string
  scaffold: boolean
}) {
  const directory = requireHomeDirectory(input.homeDirectory)
  const name = normalizeSkillName(input.name)
  const skillDir = joinPath(directory, '.opencodex', 'skills', name)
  const body = [
    '---',
    `name: ${yamlString(name)}`,
    `description: ${yamlString(input.description.trim() || name)}`,
    '---',
    '',
    input.content.trim() || `Use this skill for ${name}.`,
    '',
  ].join('\n')
  await writeSkillFiles(skillDir, [
    { path: 'SKILL.md', content: body },
    ...(input.scaffold ? [
      { path: 'scripts/example.ts', content: 'export function run(input: string) {\n  return input\n}\n' },
      { path: 'references/README.md', content: '# References\n\nPut focused reference material used by this skill here.\n' },
      { path: 'assets/README.md', content: '# Assets\n\nPlace reusable templates and static assets here.\n' },
    ] : []),
  ])
  return name
}

function SkillDiagnostics(props: { name: string; description: string; content: string }) {
  const { t } = useTranslation(['components'])
  const diagnostics = validateSkillDraft(props)
  return (
    <div className={`rounded-md border px-3 py-2 text-[length:var(--fs-xs)] ${diagnostics.length ? 'border-warning-100/30 bg-warning-100/5 text-warning-100' : 'border-success-100/30 bg-success-100/5 text-success-100'}`}>
      <div className="font-medium">{t('skillPanel.lintResult')}</div>
      <div className="mt-1">{diagnostics.length ? diagnostics.join(' · ') : t('skillPanel.lintPassed')}</div>
    </div>
  )
}

function validateSkillDraft(input: { name: string; description: string; content: string }) {
  return [
    ...(!input.name.trim() ? ['name is required'] : []),
    ...(input.name.trim() && !/^[a-z0-9][a-z0-9._-]*$/.test(input.name.trim().toLowerCase().replace(/\s+/g, '-')) ? ['name is invalid'] : []),
    ...(!input.description.trim() ? ['description is required'] : []),
    ...(input.description.trim().length > 280 ? ['description is too long'] : []),
    ...(!input.content.trim() ? ['instructions are empty'] : []),
    ...(input.content.includes('../') ? ['unsafe relative reference'] : []),
  ]
}

function SkillEditDialog(props: { skill: Skill; onClose: () => void; onDone: () => void | Promise<void> }) {
  const { t } = useTranslation(['components', 'common'])
  const [description, setDescription] = useState(props.skill.description ?? '')
  const [content, setContent] = useState(props.skill.content ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const diagnostics = validateSkillDraft({ name: props.skill.name, description, content })
  const submit = async () => {
    if (diagnostics.length) {
      setError(diagnostics.join(' · '))
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const location = normalizePath(props.skill.location)
      const root = location.toLowerCase().endsWith('/skill.md') ? dirname(location) : location
      await writeSkillFiles(root, [{ path: 'SKILL.md', content: ['---', `name: ${yamlString(props.skill.name)}`, `description: ${yamlString(description.trim())}`, '---', '', content.trim(), ''].join('\n') }])
      await restartElectronServer()
      await props.onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('skillPanel.failedToSave'))
    } finally {
      setSubmitting(false)
    }
  }
  return <SkillDialogFrame title={t('skillPanel.editSkill')} onClose={props.onClose}>
    <SkillTextField label={t('skillPanel.skillName')} value={props.skill.name} onChange={() => undefined} placeholder="" />
    <SkillTextField label={t('skillPanel.skillDescription')} value={description} onChange={setDescription} placeholder={t('skillPanel.skillDescriptionPlaceholder')} />
    <SkillTextArea label={t('skillPanel.skillInstructions')} value={content} onChange={setContent} placeholder={t('skillPanel.skillInstructionsPlaceholder')} />
    <SkillDiagnostics name={props.skill.name} description={description} content={content} />
    <div className="rounded-md bg-bg-200/40 px-3 py-2 font-mono text-[length:var(--fs-xxs)] text-text-500">{props.skill.location}</div>
    <SkillDialogActions error={error} submitting={submitting} submitLabel={t('common:save')} onCancel={props.onClose} onSubmit={() => void submit()} />
  </SkillDialogFrame>
}

function yamlString(value: string) {
  return JSON.stringify(value)
}

async function importGithubSkill(input: { homeDirectory?: string; url: string; name: string }) {
  const directory = requireHomeDirectory(input.homeDirectory)
  const source = parseGithubUrl(input.url)
  const files = await fetchGithubFiles(source)
  const name = normalizeSkillName(input.name.trim() || source.name)
  await writeSkillFiles(joinPath(directory, '.opencodex', 'skills', name), files)
  return name
}

function requireHomeDirectory(homeDirectory?: string) {
  if (!homeDirectory) throw new Error('Home directory is not available.')
  return homeDirectory
}

function normalizeSkillName(value: string) {
  const name = value.trim().toLowerCase().replace(/\s+/g, '-')
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    throw new Error('Use a skill name with letters, numbers, dots, underscores, or hyphens.')
  }
  if (name === '.' || name === '..' || name.includes('/')) {
    throw new Error('Use a simple skill name, not a path.')
  }
  return name
}

async function writeSkillFiles(root: string, files: { path: string; content: string }[]) {
  if (typeof window.customOpenCode?.writeSkillFiles === 'function') {
    await window.customOpenCode.writeSkillFiles(root, files)
    return
  }

  const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs')
  await mkdir(root, { recursive: true })
  for (const file of files) {
    const normalized = normalizeRelativeFile(file.path)
    const destination = joinPath(root, normalized)
    const parent = dirname(destination)
    if (parent !== root) await mkdir(parent, { recursive: true })
    await writeTextFile(destination, file.content)
  }
}

function normalizeRelativeFile(value: string) {
  const file = value.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!file || file.split('/').some(part => part === '..' || part === '.')) {
    throw new Error('GitHub skill contains an unsafe file path.')
  }
  return file
}

type GithubSource = {
  owner: string
  repo: string
  ref: string
  path: string
  name: string
}

function parseGithubUrl(value: string): GithubSource {
  const url = new URL(value.trim())
  if (url.hostname === 'raw.githubusercontent.com') {
    const [owner, repo, ref, ...parts] = url.pathname.split('/').filter(Boolean)
    if (!owner || !repo || !ref || parts.length === 0) throw new Error('Enter a GitHub file or folder URL.')
    return { owner, repo, ref, path: parts.join('/'), name: skillNameFromPath(parts) }
  }
  if (url.hostname !== 'github.com') throw new Error('Enter a github.com URL.')
  const [owner, repo, kind, ref, ...parts] = url.pathname.split('/').filter(Boolean)
  if (!owner || !repo) {
    throw new Error('Enter a GitHub file or folder URL.')
  }
  const repoName = normalizeGithubRepoName(repo)
  if (!kind) return { owner, repo: repoName, ref: '', path: '', name: repoName }
  if (!ref || (kind !== 'tree' && kind !== 'blob')) throw new Error('Enter a GitHub file or folder URL.')
  if (parts.length === 0) return { owner, repo: repoName, ref, path: '', name: repoName }
  return { owner, repo: repoName, ref, path: parts.join('/'), name: skillNameFromPath(parts) }
}

function normalizeGithubRepoName(value: string) {
  return value.replace(/\.git$/i, '')
}

function skillNameFromPath(parts: string[]) {
  const last = parts.at(-1) ?? 'skill'
  if (last.toLowerCase() === 'skill.md' && parts.length > 1) return parts[parts.length - 2]
  return last.replace(/\.md$/i, '')
}

async function fetchGithubFiles(source: GithubSource) {
  const resolved = await resolveGithubSkillSource(source)
  const data = await fetchGithubContents(resolved, resolved.path)
  const files = await collectGithubFiles(data, resolved.path)
  if (!files.some(file => file.path === 'SKILL.md' || file.path.endsWith('/SKILL.md'))) {
    throw new Error('The GitHub source must contain a SKILL.md file.')
  }
  return files
}

async function resolveGithubSkillSource(source: GithubSource): Promise<GithubSource> {
  if (source.path) return source

  const root = await fetchGithubContents(source, '')
  if (Array.isArray(root) && root.some(item => isGithubEntry(item) && item.type === 'file' && item.path === 'SKILL.md')) {
    return source
  }

  const candidatePaths = [
    `.opencode/skills/${source.name}`,
    `.codex/skills/${source.name}`,
    `skills/${source.name}`,
  ]
  const matches = await Promise.all(
    candidatePaths.map(async candidatePath => {
      const data = await fetchGithubContentsOption(source, candidatePath)
      if (!data) return undefined
      const files = await collectGithubFiles(data, candidatePath)
      return files.some(file => file.path === 'SKILL.md' || file.path.endsWith('/SKILL.md'))
        ? { ...source, path: candidatePath, name: skillNameFromPath(candidatePath.split('/')) }
        : undefined
    }),
  )
  const match = matches.find((item): item is GithubSource => Boolean(item))
  if (match) return match

  return source
}

async function fetchGithubContents(source: GithubSource, path: string): Promise<unknown> {
  const data = await fetchGithubContentsOption(source, path)
  if (!data) throw new Error('Unable to read that GitHub URL.')
  return data
}

async function fetchGithubContentsOption(source: GithubSource, path: string): Promise<unknown | undefined> {
  const apiUrl = `https://api.github.com/repos/${source.owner}/${source.repo}/contents/${encodeURIComponentPath(path)}${source.ref ? `?ref=${encodeURIComponent(source.ref)}` : ''}`
  const response = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github+json' } })
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error('Unable to read that GitHub URL.')
  return response.json()
}

async function collectGithubFiles(data: unknown, rootPath: string): Promise<{ path: string; content: string }[]> {
  if (isGithubFile(data)) {
    return [{ path: data.name, content: await fetchText(data.download_url) }]
  }
  if (!Array.isArray(data)) throw new Error('Unsupported GitHub response.')
  const files = await Promise.all(
    data.flatMap(item => {
      if (!isGithubEntry(item)) return []
      if (item.type === 'file' && item.download_url) {
        return fetchText(item.download_url).then(content => ({
          path: relativeGithubPath(rootPath, item.path),
          content,
        }))
      }
      if (item.type === 'dir' && item.url) {
        return fetch(item.url)
          .then(response => {
            if (!response.ok) throw new Error('Unable to read GitHub directory.')
            return response.json() as Promise<unknown>
          })
          .then(next => collectGithubFiles(next, rootPath))
      }
      return []
    }),
  )
  return files.flat()
}

function isGithubFile(value: unknown): value is { type: 'file'; name: string; download_url: string } {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return record.type === 'file' && typeof record.name === 'string' && typeof record.download_url === 'string'
}

function isGithubEntry(value: unknown): value is { type: 'file' | 'dir'; path: string; url?: string; download_url?: string } {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (record.type === 'file' || record.type === 'dir') && typeof record.path === 'string'
}

function relativeGithubPath(rootPath: string, filePath: string) {
  return filePath === rootPath ? filePath.split('/').at(-1) ?? 'SKILL.md' : filePath.slice(rootPath.length).replace(/^\/+/, '')
}

async function fetchText(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to download GitHub file.')
  return response.text()
}

function encodeURIComponentPath(value: string) {
  return value.split('/').map(encodeURIComponent).join('/')
}

function joinPath(...parts: string[]) {
  const separator = parts[0].includes('\\') ? '\\' : '/'
  return parts
    .map((part, index) =>
      index === 0
        ? part.replace(/[\\/]+$/, '')
        : part.replace(/^[\\/]+/, '').replace(/[\\/]+$/, ''),
    )
    .filter(Boolean)
    .join(separator)
}

function dirname(value: string) {
  const normalized = value.replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/')
  if (index <= 0) return value
  const dir = normalized.slice(0, index)
  return value.includes('\\') ? dir.replace(/\//g, '\\') : dir
}

type SkillSectionGroup = {
  id: string
  title: string
  alwaysShow?: boolean
  groups: SkillSourceGroup[]
  projects?: SkillProjectGroup[]
}

type SkillSourceGroup = {
  id: string
  label: string
  detail: string
  displayPath: string
  skills: Skill[]
}

type SkillProjectGroup = {
  id: string
  name: string
  path: string
  displayPath: string
  groups: SkillSourceGroup[]
}

type WorkspaceSkillDirectory = {
  path: string
  name: string
}

type SkillSource = {
  section: string
  id: string
  label: string
  detail: string
  displayPath: string
  project?: {
    id: string
    name: string
    path: string
    displayPath: string
  }
}

function groupSkills(skills: Skill[], options: {
  homeDirectory?: string
  userSkillRoot?: string
  workspaceDirectories: WorkspaceSkillDirectory[]
  systemLabel: string
  projectLabel: string
  otherLabel: string
}) {
  const sections: SkillSectionGroup[] = [
    { id: 'system', title: options.systemLabel, alwaysShow: true, groups: [] },
    { id: 'project', title: options.projectLabel, groups: [] },
    { id: 'other', title: options.otherLabel, groups: [] },
  ]

  skills.forEach(skill => {
    const source = getSkillSource(skill, options)
    const section = sections.find(item => item.id === source.section) ?? sections[2]
    if (source.section === 'project' && source.project) {
      const project = section.projects?.find(item => item.id === source.project?.id)
      if (project) {
        addSkillToSourceGroup(project.groups, source, skill)
        return
      }
      section.projects = [
        ...(section.projects ?? []),
        {
          ...source.project,
          groups: [{
            id: source.id,
            label: source.label,
            detail: source.detail,
            displayPath: source.displayPath,
            skills: [skill],
          }],
        },
      ]
      return
    }
    addSkillToSourceGroup(section.groups, source, skill)
  })

  return sections
    .map(section => ({
      ...section,
      groups: sortSkillSourceGroups(section.groups),
      projects: section.projects
        ?.map(project => ({ ...project, groups: sortSkillSourceGroups(project.groups) }))
        .toSorted((a, b) => a.name.localeCompare(b.name) || a.displayPath.localeCompare(b.displayPath)),
    }))
    .filter(section => section.alwaysShow || section.groups.length > 0 || (section.projects?.length ?? 0) > 0)
}

function addSkillToSourceGroup(groups: SkillSourceGroup[], source: SkillSource, skill: Skill) {
  const existing = groups.find(group => group.id === source.id)
  if (existing) {
    existing.skills.push(skill)
    return
  }
  groups.push({
    id: source.id,
    label: source.label,
    detail: source.detail,
    displayPath: source.displayPath,
    skills: [skill],
  })
}

function sortSkillSourceGroups(groups: SkillSourceGroup[]) {
  return groups
    .map(group => ({ ...group, skills: group.skills.toSorted((a, b) => a.name.localeCompare(b.name)) }))
    .toSorted((a, b) => a.displayPath.localeCompare(b.displayPath))
}

function getSkillSource(skill: Skill, options: {
  homeDirectory?: string
  userSkillRoot?: string
  workspaceDirectories: WorkspaceSkillDirectory[]
  systemLabel: string
  projectLabel: string
  otherLabel: string
}) {
  const sourceDir = getSkillSourceDirectory(skill.location)
  const normalizedSource = normalizePath(sourceDir)
  const normalizedHome = normalizePath(options.homeDirectory)
  const workspace = options.workspaceDirectories.find(directory => isUnderPath(normalizedSource, directory.path))

  if (skill.location === '<built-in>' || isUnderPath(normalizedSource, normalizePath(options.userSkillRoot))) {
    return {
      section: 'system',
      id: 'system-default',
      label: options.systemLabel,
      detail: options.systemLabel,
      displayPath: options.systemLabel,
    }
  }

  if (workspace && isUnderPath(normalizedSource, workspace.path)) {
    const displayPath = formatProjectSkillPath(
      normalizedSource,
      workspace.path,
      options.workspaceDirectories.length > 1,
      normalizedHome,
    )
    return {
      section: 'project',
      id: `project:${normalizedSource}`,
      label: options.projectLabel,
      detail: displayPath,
      displayPath,
      project: {
        id: `project:${workspace.path}`,
        name: workspace.name,
        path: workspace.path,
        displayPath: formatHomePath(workspace.path, normalizedHome),
      },
    }
  }

  const displayPath = formatHomePath(normalizedSource, normalizedHome)
  return {
    section: 'other',
    id: `other:${normalizedSource}`,
    label: options.otherLabel,
    detail: displayPath,
    displayPath,
  }
}

function getSkillSourceDirectory(location: string) {
  const normalized = normalizePath(location)
  if (normalized === '<built-in>') return normalized
  if (!normalized.toLowerCase().endsWith('/skill.md')) return dirname(normalized)
  return dirname(dirname(normalized))
}

function formatProjectSkillPath(sourceDir: string, workspaceDirectory: string, includeWorkspace: boolean, homeDirectory?: string) {
  if (includeWorkspace) return formatHomePath(sourceDir, homeDirectory)
  const relative = sourceDir.slice(workspaceDirectory.length).replace(/^\/+/, '')
  return relative || sourceDir
}

function formatHomePath(value: string, homeDirectory?: string) {
  if (homeDirectory && isUnderPath(value, homeDirectory)) return `~/${value.slice(homeDirectory.length).replace(/^\/+/, '')}`
  return value
}

function normalizePath(value?: string) {
  return (value ?? '').replace(/\\/g, '/').replace(/\/+$/, '')
}

function joinNormalized(...parts: string[]) {
  return normalizePath(parts.filter(Boolean).join('/'))
}

function isUnderPath(value: string, parent: string) {
  if (!value || !parent) return false
  return value === parent || value.startsWith(`${parent}/`)
}

function uniqueWorkspaceDirectories(directories: Array<WorkspaceSkillDirectory | undefined>) {
  return directories.flatMap(directory => {
    const normalized = normalizePath(directory?.path)
    if (!normalized) return []
    return [{ path: normalized, name: directory?.name || getDirectoryName(normalized) || normalized }]
  }).filter((directory, index, list) => list.findIndex(item => isSamePath(item.path, directory.path)) === index)
}

function dedupeSkills(skills: Skill[]) {
  return skills.filter((skill, index, list) => {
    const key = `${normalizePath(skill.location)}:${skill.name}`
    return list.findIndex(item => `${normalizePath(item.location)}:${item.name}` === key) === index
  })
}

function isSamePath(a: string, b: string) {
  return normalizePath(a).toLowerCase() === normalizePath(b).toLowerCase()
}

function SkillSection(props: { section: SkillSectionGroup; userSkillRoot?: string; onDeleted: (name: string) => void | Promise<void> }) {
  const { t } = useTranslation(['components'])
  const [expanded, setExpanded] = useState(true)
  const section = props.section
  const skillCount = section.groups.reduce((total, group) => total + group.skills.length, 0)
    + (section.projects ?? []).reduce(
      (total, project) => total + project.groups.reduce((projectTotal, group) => projectTotal + group.skills.length, 0),
      0,
    )

  return (
    <section className="pb-1">
      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
        className="sticky top-0 z-10 flex h-7 w-full items-center gap-1.5 bg-bg-100/95 px-2 text-left text-[length:var(--fs-xs)] font-medium text-text-400 backdrop-blur-sm transition-colors hover:bg-bg-200/60 hover:text-text-200"
      >
        {expanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
        <span className="min-w-0 truncate">{section.title}</span>
        <span className="ml-auto shrink-0 text-text-500">{skillCount}</span>
      </button>
      {expanded && (
        section.groups.length === 0 ? (
          section.projects && section.projects.length > 0 ? (
            section.projects.map(project => (
              <SkillProject
                key={project.id}
                project={project}
                defaultExpanded={false}
                userSkillRoot={props.userSkillRoot}
                onDeleted={props.onDeleted}
              />
            ))
          ) : (
            <div className="px-2 py-2 text-[length:var(--fs-sm)] text-text-500">{t('skillPanel.noSkillsInGroup')}</div>
          )
        ) : (
          <>
            {section.groups.map(group => (
              <SkillSource
                key={group.id}
                group={group}
                defaultExpanded={section.id === 'system'}
                userSkillRoot={props.userSkillRoot}
                onDeleted={props.onDeleted}
              />
            ))}
            {section.projects?.map(project => (
              <SkillProject
                key={project.id}
                project={project}
                defaultExpanded={false}
                userSkillRoot={props.userSkillRoot}
                onDeleted={props.onDeleted}
              />
            ))}
          </>
        )
      )}
    </section>
  )
}

function SkillProject(props: {
  project: SkillProjectGroup
  defaultExpanded?: boolean
  userSkillRoot?: string
  onDeleted: (name: string) => void | Promise<void>
}) {
  const project = props.project
  const defaultExpanded = props.defaultExpanded ?? true
  const [expanded, setExpanded] = useState(defaultExpanded)
  const skillCount = project.groups.reduce((total, group) => total + group.skills.length, 0)

  return (
    <div className="pb-1">
      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
        className="mx-2 mt-1 flex min-h-8 w-[calc(100%-1rem)] items-center gap-2 rounded-md bg-bg-200/35 px-2 py-1 text-left transition-colors hover:bg-bg-200/60"
      >
        {expanded ? <ChevronDownIcon size={12} className="shrink-0 text-text-500" /> : <ChevronRightIcon size={12} className="shrink-0 text-text-500" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[length:var(--fs-sm)] font-medium text-text-200">{project.name}</span>
          <span className="block truncate font-mono text-[length:var(--fs-xs)] text-text-500" title={project.displayPath}>{project.displayPath}</span>
        </span>
        <span className="shrink-0 text-[length:var(--fs-xs)] text-text-500">{skillCount}</span>
      </button>
      {expanded && (
        <div className="pl-2">
          {project.groups.map(group => (
            <SkillSource
              key={group.id}
              group={group}
              userSkillRoot={props.userSkillRoot}
              onDeleted={props.onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SkillSource(props: {
  group: SkillSourceGroup
  defaultExpanded?: boolean
  userSkillRoot?: string
  onDeleted: (name: string) => void | Promise<void>
}) {
  const group = props.group
  const defaultExpanded = props.defaultExpanded ?? true
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="pb-1">
      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
        className="flex min-h-7 w-full items-center gap-1.5 px-2 text-left text-[length:var(--fs-xs)] text-text-500 transition-colors hover:bg-bg-200/50 hover:text-text-300"
      >
        {expanded ? <ChevronDownIcon size={11} className="shrink-0" /> : <ChevronRightIcon size={11} className="shrink-0" />}
        <span className="shrink-0">{group.label}</span>
        <span className="text-text-600">|</span>
        <span className="min-w-0 flex-1 truncate font-mono" title={group.detail}>{group.detail}</span>
        <span className="shrink-0 text-text-500">{group.skills.length}</span>
      </button>
      {expanded && group.skills.map(skill => (
        <SkillItem
          key={skill.name}
          skill={skill}
          sourcePath={group.displayPath}
          userSkillRoot={props.userSkillRoot}
          onDeleted={props.onDeleted}
        />
      ))}
    </div>
  )
}

// ============================================
// SkillItem Component
// ============================================

const SkillItem = memo(function SkillItem(props: {
  skill: Skill
  sourcePath: string
  userSkillRoot?: string
  onDeleted: (name: string) => void | Promise<void>
}) {
  const { t } = useTranslation(['components', 'common'])
  const skill = props.skill
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [editing, setEditing] = useState(false)
  const canDelete = isUserSkill(skill, props.userSkillRoot) && typeof window.customOpenCode?.deleteSkill === 'function'

  const deleteSkill = async () => {
    if (!canDelete) return
    try {
      setDeleting(true)
      setDeleteError('')
      await window.customOpenCode.deleteSkill(skill.location)
      await restartElectronServer()
      await props.onDeleted(skill.name)
      setDeleteConfirm(false)
    } catch (err) {
      apiErrorHandler('delete skill', err)
      setDeleteError(err instanceof Error ? err.message : t('skillPanel.failedToDelete'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
    <div className="group">
      <div className="flex items-start rounded-md px-2 py-2 hover:bg-bg-200/50 transition-colors">
        <button
          type="button"
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-start gap-2 bg-transparent border-none text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-text-400 shrink-0 mt-0.5">
            {expanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </span>

          <div className="flex-1 min-w-0">
            <div className="text-[length:var(--fs-base)] text-text-100 font-medium">{skill.name}</div>
            <div className="text-[length:var(--fs-xs)] text-text-500 truncate font-mono">{props.sourcePath}</div>
            <div className="text-[length:var(--fs-sm)] text-text-400 truncate">{skill.description ?? ''}</div>
          </div>
        </button>
        {canDelete && <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={t('skillPanel.editSkill')}
          title={t('skillPanel.editSkill')}
          className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-500 opacity-0 transition-all hover:bg-bg-200 hover:text-text-100 group-hover:opacity-100 focus:opacity-100"
        ><PencilIcon size={13} /></button>}
        {canDelete && (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            disabled={deleting}
            aria-label={t('skillPanel.deleteSkill')}
            title={t('skillPanel.deleteSkill')}
            className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-500 opacity-0 transition-all hover:bg-danger-100/10 hover:text-danger-100 disabled:opacity-50 group-hover:opacity-100 focus:opacity-100"
          >
            {deleting ? <SpinnerIcon size={13} className="animate-spin" /> : <TrashIcon size={13} />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mx-2 mb-2 ml-7 rounded-md border border-border-200/40 bg-bg-100/50 px-3 py-2">
          <div className="text-[length:var(--fs-sm)] text-text-500 mb-2 font-mono break-all">{skill.location}</div>
          <div className="bg-bg-200/50 rounded-md p-2 overflow-x-auto">
            <pre className="text-[length:var(--fs-sm)] text-text-200 font-mono whitespace-pre-wrap break-words">{skill.content}</pre>
          </div>
        </div>
      )}
      {deleteError ? <div className="mx-2 mb-2 rounded-md bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">{deleteError}</div> : null}
    </div>
    <ConfirmDialog isOpen={deleteConfirm} onClose={() => setDeleteConfirm(false)} onConfirm={() => void deleteSkill()} title={t('skillPanel.deleteSkill')} description={t('skillPanel.deleteSkillConfirm', { name: skill.name })} confirmText={t('common:delete')} variant="danger" isLoading={deleting} />
    {editing && <SkillEditDialog skill={skill} onClose={() => setEditing(false)} onDone={async () => { setEditing(false); await props.onDeleted(skill.name) }} />}
    </>
  )
})

function isUserSkill(skill: Skill, userSkillRoot?: string) {
  if (skill.location === '<built-in>') return false
  return isUnderPath(normalizePath(skill.location), normalizePath(userSkillRoot))
}
