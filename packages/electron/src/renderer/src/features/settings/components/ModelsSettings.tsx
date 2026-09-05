import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloseIcon, SearchIcon } from '../../../components/Icons'
import { useModels } from '../../../hooks'
import {
  defaultModelStore,
  modelVisibilityStore,
  useDefaultModelKey,
  useHiddenModelKeys,
} from '../../../store'
import { groupModelsByProvider, getModelKey } from '../../../utils/modelUtils'
import { refreshProviders } from '../../../api/provider'
import { settingsSearchInputClass, SettingsSection, Toggle } from './SettingsUI'

function formatContext(limit: number): string {
  if (!limit) return ''
  const k = Math.round(limit / 1000)
  if (k >= 1000) return `${(k / 1000).toFixed(0)}M`
  return `${k}k`
}

export function ModelsSettings() {
  const { t } = useTranslation('settings')
  const { models, isLoading, refetch } = useModels()
  const hiddenModelKeys = useHiddenModelKeys()
  const defaultModelKey = useDefaultModelKey()
  const [query, setQuery] = useState('')
  const [enabledOnly, setEnabledOnly] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const hiddenModelKeySet = useMemo(() => new Set(hiddenModelKeys), [hiddenModelKeys])

  const refreshCatalog = async () => {
    setRefreshing(true)
    setRefreshError(null)
    try {
      await refreshProviders()
    } catch (error) {
      setRefreshError(t('models.refreshFailed', { error: error instanceof Error ? error.message : String(error) }))
    } finally {
      await refetch()
      setRefreshing(false)
    }
  }

  const visibleCount = useMemo(
    () => models.reduce((count, model) => (hiddenModelKeySet.has(getModelKey(model)) ? count : count + 1), 0),
    [models, hiddenModelKeySet],
  )

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const normalize = (value: unknown) => (typeof value === 'string' ? value.toLowerCase() : '')
    return models.filter(model => {
      if (enabledOnly && hiddenModelKeySet.has(getModelKey(model))) return false
      if (!normalizedQuery) return true
      return (
        normalize(model.name).includes(normalizedQuery) ||
        normalize(model.id).includes(normalizedQuery) ||
        normalize(model.family).includes(normalizedQuery) ||
        normalize(model.providerName).includes(normalizedQuery)
      )
    })
  }, [enabledOnly, hiddenModelKeySet, models, query])

  const groups = useMemo(() => groupModelsByProvider(filteredModels), [filteredModels])

  return (
    <div>
      <SettingsSection title={t('models.visibility')}>
        <p className="text-[length:var(--fs-sm)] text-text-400 leading-relaxed">{t('models.visibilityDesc')}</p>

        <div className="relative">
          <SearchIcon size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('models.searchPlaceholder')}
            spellCheck={false}
            autoCorrect="off"
            autoComplete="off"
            autoCapitalize="off"
            className={settingsSearchInputClass}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-text-400 transition-colors hover:bg-bg-200/60 hover:text-text-100"
              aria-label={t('models.clearSearch')}
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[length:var(--fs-xs)] text-text-400">
            {refreshError ?? t('models.keepOneEnabled')}
          </p>
          <button
            type="button"
            onClick={() => void refreshCatalog()}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-2 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100 disabled:opacity-40"
          >
            {refreshing ? t('models.refreshing') : t('models.refreshCatalog')}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border-200/45 bg-bg-100/35 px-3 py-2">
          <div className="min-w-0">
            <div className="text-[length:var(--fs-sm)] font-medium text-text-200">{t('models.enabledOnly')}</div>
            <div className="text-[length:var(--fs-xs)] text-text-500">{t('models.enabledOnlyDesc')}</div>
          </div>
          <Toggle
            enabled={enabledOnly}
            onChange={() => setEnabledOnly(value => !value)}
            ariaLabel={t('models.enabledOnly')}
          />
        </div>

        <div className="space-y-5">
          {isLoading ? (
            <div className="py-8 text-[length:var(--fs-sm)] text-text-400">{t('models.loading')}</div>
          ) : groups.length === 0 ? (
            <div className="py-8 text-[length:var(--fs-sm)] text-text-400">
              {query || enabledOnly ? t('models.noResults') : t('models.empty')}
            </div>
          ) : (
            groups.map(group => {
              const providerModels = models.filter(model => model.providerName === group.providerName)
              const providerVisibleCount = providerModels.filter(
                model => !hiddenModelKeySet.has(getModelKey(model)),
              ).length
              const providerVisible = providerVisibleCount > 0

              return (
                <div
                  key={group.providerName}
                  className="rounded-xl border border-border-200/55 bg-bg-050/55 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border-200/50 bg-bg-100/35">
                    <div className="min-w-0">
                      <div className="text-[length:var(--fs-md)] font-semibold text-text-100 truncate">
                        {group.providerName}
                      </div>
                      <div className="text-[length:var(--fs-xs)] text-text-400 mt-0.5">
                        {t('models.providerCount', { count: providerModels.length })}
                      </div>
                    </div>
                    <Toggle
                      enabled={providerVisible}
                      ariaLabel={`${t('models.visibility')}: ${group.providerName}`}
                      onChange={() => {
                        const nextVisible = !providerVisible
                        if (!nextVisible && providerVisibleCount >= visibleCount) return
                        if (
                          !nextVisible &&
                          defaultModelKey &&
                          providerModels.some(model => getModelKey(model) === defaultModelKey)
                        ) {
                          defaultModelStore.set(null)
                        }
                        modelVisibilityStore.setManyVisible(providerModels, nextVisible)
                      }}
                    />
                  </div>

                  <div className="divide-y divide-border-200/40">
                    {group.models.map(model => {
                      const key = getModelKey(model)
                      const enabled = !hiddenModelKeySet.has(key)
                      const isDefault = defaultModelKey === key
                      const context = formatContext(model.contextLimit)

                      return (
                        <div
                          key={key}
                          onClick={() => {
                            if (enabled && visibleCount <= 1) return
                            if (enabled && isDefault) defaultModelStore.set(null)
                            modelVisibilityStore.setVisible(model, !enabled)
                          }}
                          className="w-full flex items-center justify-between gap-4 px-4 py-3 hover:bg-bg-100/35 transition-colors"
                        >
                          <button
                            type="button"
                            aria-pressed={enabled}
                            onClick={e => {
                              e.stopPropagation()
                              if (enabled && visibleCount <= 1) return
                              if (enabled && isDefault) defaultModelStore.set(null)
                              modelVisibilityStore.setVisible(model, !enabled)
                            }}
                            className="min-w-0 flex-1 text-left outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent-main-100 rounded-md"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-[length:var(--fs-md)] font-medium text-text-100">
                                {model.name}
                              </span>
                              {isDefault && (
                                <span className="shrink-0 rounded bg-success-100/10 px-1.5 py-0.5 text-[length:var(--fs-xxs)] font-medium text-success-100">
                                  {t('models.defaultTag')}
                                </span>
                              )}
                            </div>
                            <div className="text-[length:var(--fs-xs)] text-text-400 mt-0.5 truncate">
                              {model.id}
                              {context ? ` · ${context}` : ''}
                            </div>
                          </button>
                          <div className="flex shrink-0 items-center gap-2">
                            <Toggle
                              enabled={enabled}
                              ariaLabel={`${t('models.visibility')}: ${model.name}`}
                              onChange={() => {
                                if (enabled && visibleCount <= 1) return
                                if (enabled && isDefault) defaultModelStore.set(null)
                                modelVisibilityStore.setVisible(model, !enabled)
                              }}
                            />
                            {enabled && (
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation()
                                  defaultModelStore.set(isDefault ? null : key)
                                }}
                                className={`min-w-[72px] rounded-md border px-2 py-1 text-[length:var(--fs-xs)] font-medium transition-colors ${
                                  isDefault
                                    ? 'border-success-100/30 bg-success-100/10 text-success-100 hover:bg-success-100/15'
                                    : 'border-border-200/70 text-text-300 hover:bg-bg-200/60 hover:text-text-100'
                                }`}
                              >
                                {t(isDefault ? 'models.cancelDefault' : 'models.setDefault')}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </SettingsSection>
    </div>
  )
}
