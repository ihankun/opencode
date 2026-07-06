import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircleIcon,
  CloseIcon,
  CheckIcon,
  DownloadIcon,
  PackagePlusIcon,
  PencilIcon,
  PlusIcon,
  RetryIcon,
  SearchIcon,
  SpinnerIcon,
  TrashIcon,
} from './Icons'
import { getConfig, updateConfig } from '../api/config'
import { useDirectory } from '../hooks'
import { apiErrorHandler } from '../utils'
import type { Config } from '../types/api/config'

type PluginOptions = Record<string, unknown>
type PluginEntry = string | [string, PluginOptions]
type PluginSearchResult = Awaited<ReturnType<typeof window.customOpenCode.searchPlugins>>[number]

type PluginDialog =
  | {
      mode: 'add'
    }
  | {
      mode: 'edit'
      index: number
    }

function readPlugins(config: Config | null) {
  const value = (config as unknown as { plugin?: unknown } | null)?.plugin
  if (!Array.isArray(value)) return []
  return value.filter(isPluginEntry)
}

function isPluginEntry(value: unknown): value is PluginEntry {
  if (typeof value === 'string') return true
  if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'string') return false
  return isPlainObject(value[1])
}

function isPlainObject(value: unknown): value is PluginOptions {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pluginSpec(plugin: PluginEntry) {
  return typeof plugin === 'string' ? plugin : plugin[0]
}

function pluginOptions(plugin: PluginEntry) {
  return typeof plugin === 'string' ? {} : plugin[1]
}

function hasOptions(options: PluginOptions) {
  return Object.keys(options).length > 0
}

function pluginKind(spec: string) {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('file:')) return 'local'
  return 'npm'
}

function withPlugins(config: Config, plugins: PluginEntry[]) {
  return {
    ...(config as unknown as Record<string, unknown>),
    plugin: plugins,
  } as unknown as Config
}

function parseOptions(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return {}
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!isPlainObject(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export const PluginPanel = memo(function PluginPanel() {
  const { t } = useTranslation(['components', 'common'])
  const { currentDirectory } = useDirectory()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<PluginDialog | null>(null)
  const [specDraft, setSpecDraft] = useState('')
  const [optionsDraft, setOptionsDraft] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<PluginSearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [installingSpec, setInstallingSpec] = useState<string | null>(null)
  const [installMessage, setInstallMessage] = useState<string | null>(null)

  const plugins = useMemo(() => readPlugins(config), [config])
  const configuredSpecs = useMemo(() => new Set(plugins.map(plugin => pluginSpec(plugin))), [plugins])
  const canUseElectronInstaller = typeof window.customOpenCode?.searchPlugins === 'function'

  const loadPlugins = useCallback(async () => {
    try {
      setError(null)
      setConfig(await getConfig(currentDirectory))
    } catch (err) {
      apiErrorHandler('load plugins config', err)
      setError(t('pluginPanel.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [currentDirectory, t])

  useEffect(() => {
    setLoading(true)
    void loadPlugins()
  }, [loadPlugins])

  const handleRefresh = useCallback(() => {
    setLoading(true)
    void loadPlugins()
  }, [loadPlugins])

  const handleSearch = useCallback(async () => {
    const query = searchDraft.trim()
    if (!query || !canUseElectronInstaller) return
    setSearching(true)
    setSearchError(null)
    setInstallMessage(null)
    try {
      setSearchResults(await window.customOpenCode.searchPlugins(query))
    } catch (err) {
      apiErrorHandler('search npm plugins', err)
      setSearchError(t('pluginPanel.searchFailed'))
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [canUseElectronInstaller, searchDraft, t])

  const openAddDialog = useCallback(() => {
    setDialog({ mode: 'add' })
    setSpecDraft('')
    setOptionsDraft('')
    setFormError(null)
  }, [])

  const openEditDialog = useCallback(
    (index: number) => {
      const plugin = plugins[index]
      if (!plugin) return
      setDialog({ mode: 'edit', index })
      setSpecDraft(pluginSpec(plugin))
      setOptionsDraft(hasOptions(pluginOptions(plugin)) ? JSON.stringify(pluginOptions(plugin), null, 2) : '')
      setFormError(null)
    },
    [plugins],
  )

  const savePlugins = useCallback(
    async (nextPlugins: PluginEntry[]) => {
      if (!config) return
      setSaving(true)
      try {
        const nextConfig = await updateConfig(withPlugins(config, nextPlugins), currentDirectory)
        setConfig(nextConfig)
      } catch (err) {
        apiErrorHandler('save plugin config', err)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [config, currentDirectory],
  )

  const handleSubmit = useCallback(async () => {
    const spec = specDraft.trim()
    if (!spec) {
      setFormError(t('pluginPanel.specRequired'))
      return
    }

    const options = parseOptions(optionsDraft)
    if (options === null) {
      setFormError(t('pluginPanel.invalidOptions'))
      return
    }

    const entry: PluginEntry = hasOptions(options) ? [spec, options] : spec
    const nextPlugins =
      dialog?.mode === 'edit'
        ? plugins.map((plugin, index) => (index === dialog.index ? entry : plugin))
        : [...plugins, entry]

    try {
      await savePlugins(nextPlugins)
      setDialog(null)
      setFormError(null)
    } catch {
      setFormError(t('pluginPanel.failedToSave'))
    }
  }, [dialog, optionsDraft, plugins, savePlugins, specDraft, t])

  const handleRemove = useCallback(
    async (index: number) => {
      try {
        await savePlugins(plugins.filter((_, pluginIndex) => pluginIndex !== index))
      } catch {
        setError(t('pluginPanel.failedToSave'))
      }
    },
    [plugins, savePlugins, t],
  )

  const handleInstallSearchResult = useCallback(
    async (spec: string) => {
      if (!canUseElectronInstaller) return
      setInstallingSpec(spec)
      setSearchError(null)
      setInstallMessage(null)
      try {
        const result = await window.customOpenCode.installPlugin(spec)
        setInstallMessage(t('pluginPanel.installedTo', { dir: result.configDir }))
        setLoading(true)
        await loadPlugins()
      } catch (err) {
        apiErrorHandler('install npm plugin', err)
        setSearchError(err instanceof Error ? err.message : t('pluginPanel.installFailed'))
      } finally {
        setInstallingSpec(null)
        setLoading(false)
      }
    },
    [canUseElectronInstaller, loadPlugins, t],
  )

  return (
    <div className="flex h-full flex-col bg-bg-100">
      <div className="relative flex h-10 items-center justify-between px-3">
        <div className="flex h-6 min-w-0 items-center gap-1.5 text-text-100 text-[length:var(--fs-xs)] font-medium">
          <span>{t('pluginPanel.title')}</span>
          {!loading && <span className="inline-flex h-4 items-center text-[length:var(--fs-xs)] leading-none text-text-400">({plugins.length})</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label={t('common:refresh')}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-300 transition-colors hover:bg-bg-200/50 hover:text-text-100 disabled:opacity-50"
            title={t('common:refresh')}
          >
            <RetryIcon size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={openAddDialog}
            disabled={saving}
            aria-label={t('pluginPanel.addPlugin')}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-300 transition-colors hover:bg-bg-200/50 hover:text-text-100 disabled:opacity-50"
            title={t('pluginPanel.addPlugin')}
          >
            <PlusIcon size={12} />
          </button>
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" />
      </div>

      <div className="flex-1 overflow-auto">
        {canUseElectronInstaller && (
          <div className="border-b border-border-200/50 p-3">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <SearchIcon size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-400" />
                <input
                  value={searchDraft}
                  onChange={event => setSearchDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    void handleSearch()
                  }}
                  placeholder={t('pluginPanel.searchPlaceholder')}
                  className="h-8 w-full rounded-md border border-border-200/60 bg-bg-100 pr-2 pl-8 text-text-100 text-[length:var(--fs-sm)] outline-none transition-colors placeholder:text-text-400 focus:border-border-100"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={searching || !searchDraft.trim()}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-bg-200/70 px-3 text-text-200 text-[length:var(--fs-sm)] transition-colors hover:bg-bg-200 disabled:opacity-50"
              >
                {searching ? <SpinnerIcon size={12} className="animate-spin" /> : <SearchIcon size={12} />}
                {t('pluginPanel.search')}
              </button>
            </div>

            {searchError && <div className="mt-2 text-danger-100 text-[length:var(--fs-xs)]">{searchError}</div>}
            {installMessage && <div className="mt-2 text-success-100 text-[length:var(--fs-xs)]">{installMessage}</div>}

            {searchResults.length > 0 && (
              <div className="mt-3 space-y-1">
                {searchResults.map(result => (
                  <PluginSearchRow
                    key={result.name}
                    result={result}
                    installed={configuredSpecs.has(result.name)}
                    installing={installingSpec === result.name}
                    disabled={Boolean(installingSpec)}
                    onInstall={() => void handleInstallSearchResult(result.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {dialog && (
          <PluginForm
            title={dialog.mode === 'edit' ? t('pluginPanel.editPlugin') : t('pluginPanel.addPlugin')}
            specDraft={specDraft}
            optionsDraft={optionsDraft}
            error={formError}
            saving={saving}
            onSpecChange={setSpecDraft}
            onOptionsChange={setOptionsDraft}
            onCancel={() => setDialog(null)}
            onSubmit={handleSubmit}
          />
        )}

        {loading && plugins.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-text-400 text-[length:var(--fs-base)]">
            <SpinnerIcon size={20} className="animate-spin opacity-50" />
            <span>{t('pluginPanel.loadingPlugins')}</span>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-text-400 text-[length:var(--fs-base)]">
            <AlertCircleIcon size={20} className="text-danger-100" />
            <span>{error}</span>
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-md bg-bg-200/50 px-3 py-1.5 text-text-200 text-[length:var(--fs-sm)] transition-colors hover:bg-bg-200"
            >
              {t('common:retry')}
            </button>
          </div>
        ) : plugins.length === 0 && !dialog ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-text-400 text-[length:var(--fs-base)]">
            <PackagePlusIcon size={24} className="opacity-30" />
            <span>{t('pluginPanel.noPlugins')}</span>
            <button
              type="button"
              onClick={openAddDialog}
              className="rounded-md bg-bg-200/50 px-3 py-1.5 text-text-200 text-[length:var(--fs-sm)] transition-colors hover:bg-bg-200"
            >
              {t('pluginPanel.addPlugin')}
            </button>
          </div>
        ) : (
          <div className="p-3">
            <div className="mb-3 rounded-lg border border-border-200/50 bg-bg-200/30 px-3 py-2 text-text-300 text-[length:var(--fs-sm)]">
              {t('pluginPanel.changesApplyAfterReload')}
            </div>
            <div className="space-y-1">
              {plugins.map((plugin, index) => (
                <PluginRow
                  key={`${pluginSpec(plugin)}-${index}`}
                  plugin={plugin}
                  disabled={saving}
                  onEdit={() => openEditDialog(index)}
                  onRemove={() => void handleRemove(index)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

function PluginSearchRow({
  result,
  installed,
  installing,
  disabled,
  onInstall,
}: {
  result: PluginSearchResult
  installed: boolean
  installing: boolean
  disabled: boolean
  onInstall: () => void
}) {
  const { t } = useTranslation(['components'])

  return (
    <div className="flex min-h-16 items-center gap-3 rounded-lg border border-border-200/40 bg-bg-200/20 px-2.5 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-200 text-text-300">
        <PackagePlusIcon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate font-medium text-text-100 text-[length:var(--fs-sm)]">{result.name}</div>
          {result.version && <div className="shrink-0 text-text-400 text-[length:var(--fs-xs)]">v{result.version}</div>}
        </div>
        <div className="mt-0.5 line-clamp-2 text-text-400 text-[length:var(--fs-xs)]">
          {result.description || t('pluginPanel.noDescription')}
        </div>
      </div>
      <button
        type="button"
        onClick={onInstall}
        disabled={disabled || installed}
        aria-label={installed ? t('pluginPanel.installed') : t('pluginPanel.installPlugin')}
        title={installed ? t('pluginPanel.installed') : t('pluginPanel.installPlugin')}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-300 transition-colors hover:bg-bg-200 hover:text-text-100 disabled:opacity-50"
      >
        {installing ? (
          <SpinnerIcon size={13} className="animate-spin" />
        ) : installed ? (
          <CheckIcon size={13} />
        ) : (
          <DownloadIcon size={13} />
        )}
      </button>
    </div>
  )
}

function PluginRow({
  plugin,
  disabled,
  onEdit,
  onRemove,
}: {
  plugin: PluginEntry
  disabled: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation(['components'])
  const spec = pluginSpec(plugin)
  const options = pluginOptions(plugin)

  return (
    <div className="group flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-bg-200/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-200 text-text-300">
        <PackagePlusIcon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-text-100 text-[length:var(--fs-sm)]">{spec}</div>
        <div className="mt-0.5 flex items-center gap-2 text-text-400 text-[length:var(--fs-xs)]">
          <span>{t(`pluginPanel.${pluginKind(spec) === 'local' ? 'localPlugin' : 'npmPlugin'}`)}</span>
          <span className="h-1 w-1 rounded-full bg-text-400/60" />
          <span>{hasOptions(options) ? t('pluginPanel.optionsEnabled') : t('pluginPanel.noOptions')}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          aria-label={t('pluginPanel.editPlugin')}
          title={t('pluginPanel.editPlugin')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-300 transition-colors hover:bg-bg-200 hover:text-text-100 disabled:opacity-50"
        >
          <PencilIcon size={13} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={t('pluginPanel.removePlugin')}
          title={t('pluginPanel.removePlugin')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-300 transition-colors hover:bg-bg-200 hover:text-danger-100 disabled:opacity-50"
        >
          <TrashIcon size={13} />
        </button>
      </div>
    </div>
  )
}

function PluginForm({
  title,
  specDraft,
  optionsDraft,
  error,
  saving,
  onSpecChange,
  onOptionsChange,
  onCancel,
  onSubmit,
}: {
  title: string
  specDraft: string
  optionsDraft: string
  error: string | null
  saving: boolean
  onSpecChange: (value: string) => void
  onOptionsChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const { t } = useTranslation(['components', 'common'])

  return (
    <div className="border-b border-border-200/50 bg-bg-200/20 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-medium text-text-100 text-[length:var(--fs-sm)]">{title}</div>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label={t('common:close')}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-300 transition-colors hover:bg-bg-200 hover:text-text-100 disabled:opacity-50"
        >
          <CloseIcon size={13} />
        </button>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-text-300 text-[length:var(--fs-xs)]">{t('pluginPanel.pluginSpec')}</span>
        <input
          value={specDraft}
          onChange={event => onSpecChange(event.target.value)}
          disabled={saving}
          placeholder={t('pluginPanel.pluginSpecPlaceholder')}
          className="h-8 w-full rounded-md border border-border-200/60 bg-bg-100 px-2 text-text-100 text-[length:var(--fs-sm)] outline-none transition-colors placeholder:text-text-400 focus:border-border-100 disabled:opacity-50"
        />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-text-300 text-[length:var(--fs-xs)]">{t('pluginPanel.options')}</span>
        <textarea
          value={optionsDraft}
          onChange={event => onOptionsChange(event.target.value)}
          disabled={saving}
          placeholder={t('pluginPanel.optionsPlaceholder')}
          rows={5}
          className="w-full resize-none rounded-md border border-border-200/60 bg-bg-100 px-2 py-1.5 font-mono text-text-100 text-[length:var(--fs-xs)] outline-none transition-colors placeholder:text-text-400 focus:border-border-100 disabled:opacity-50"
        />
      </label>

      {error && <div className="mb-3 text-danger-100 text-[length:var(--fs-xs)]">{error}</div>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-text-300 text-[length:var(--fs-sm)] transition-colors hover:bg-bg-200 hover:text-text-100 disabled:opacity-50"
        >
          {t('common:cancel')}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-100 px-3 py-1.5 text-bg-100 text-[length:var(--fs-sm)] transition-colors hover:bg-accent-200 disabled:opacity-50"
        >
          {saving && <SpinnerIcon size={12} className="animate-spin" />}
          {t('pluginPanel.savePlugin')}
        </button>
      </div>
    </div>
  )
}
