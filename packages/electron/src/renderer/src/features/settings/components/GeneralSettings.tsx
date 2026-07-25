import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getProviders } from '../../../api'
import { CheckIcon, ChevronDownIcon, CogIcon, GripVerticalIcon } from '../../../components/Icons'
import { useServerStore } from '../../../hooks'
import { uiErrorHandler } from '../../../utils'
import { desktopPreferencesStore, useDesktopPreferences } from '../../../store/desktopPreferencesStore'
import { LocationAppIcon, type LocationApp } from '../../chat/LocationAppIcon'
import { SettingRow, SettingsSection, Toggle } from './SettingsUI'
import { canonicalQuotaProviderId, supportsQuotaProvider, type OpenCodeGoQuotaConfig } from '../../../../../shared/quota'
import type { Provider } from '@opencode-ai/sdk/v2/client'

export function GeneralSettings() {
  const { t } = useTranslation(['settings'])
  const preferences = useDesktopPreferences()
  const [locationApps, setLocationApps] = useState<LocationApp[]>([])
  const [loadingApps, setLoadingApps] = useState(true)
  const [targetMenuOpen, setTargetMenuOpen] = useState(false)
  const targetMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.customOpenCode?.locationApps) {
      setLoadingApps(false)
      return
    }
    void window.customOpenCode.locationApps()
      .then(setLocationApps)
      .catch(error => uiErrorHandler('load installed applications', error))
      .finally(() => setLoadingApps(false))
  }, [])

  useEffect(() => {
    if (!targetMenuOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !targetMenuRef.current?.contains(event.target)) setTargetMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTargetMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [targetMenuOpen])

  const update = (patch: Parameters<typeof desktopPreferencesStore.update>[0]) => {
    void desktopPreferencesStore.update(patch).catch(error => uiErrorHandler('update desktop preferences', error))
  }

  const selectedLocationApp = locationApps.find(app => app.id === preferences.defaultLocationApp)

  return (
    <>
      <SettingsSection title={t('general.desktopBehavior')}>
      <SettingRow
        label={t('general.defaultFileOpenTarget')}
        description={t('general.defaultFileOpenTargetDesc')}
      >
        <div ref={targetMenuRef} className="relative min-w-56">
          <button
            type="button"
            disabled={loadingApps}
            aria-haspopup="listbox"
            aria-expanded={targetMenuOpen}
            onClick={() => setTargetMenuOpen(open => !open)}
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-border-200 bg-bg-000 px-2.5 text-left text-[length:var(--fs-sm)] text-text-100 outline-none transition-colors hover:border-border-300 focus-visible:border-accent-main-100 disabled:opacity-60"
          >
            {selectedLocationApp
              ? <LocationAppIcon app={selectedLocationApp} className="size-5 shrink-0 object-contain" />
              : <CogIcon size={17} className="shrink-0 text-text-400" />}
            <span className="min-w-0 flex-1 truncate">
              {loadingApps ? t('general.loadingOpenTargets') : selectedLocationApp?.name ?? t('general.automaticOpenTarget')}
            </span>
            <ChevronDownIcon size={13} className={`shrink-0 text-text-400 transition-transform ${targetMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {targetMenuOpen && (
            <div
              role="listbox"
              className="absolute right-0 top-full z-[80] mt-1 w-full min-w-64 rounded-lg border border-border-200 bg-bg-100 p-1 shadow-lg"
            >
              <button
                type="button"
                role="option"
                aria-selected={!preferences.defaultLocationApp}
                onClick={() => {
                  update({ defaultLocationApp: '' })
                  setTargetMenuOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] ${!preferences.defaultLocationApp ? 'bg-bg-200 text-text-100' : 'text-text-200 hover:bg-bg-200'}`}
              >
                <CogIcon size={18} className="shrink-0 text-text-400" />
                <span className="min-w-0 flex-1 truncate">{t('general.automaticOpenTarget')}</span>
                {!preferences.defaultLocationApp && <CheckIcon size={14} className="shrink-0 text-accent-main-100" />}
              </button>
              {locationApps.map(app => (
                <button
                  key={app.id}
                  type="button"
                  role="option"
                  aria-selected={app.id === preferences.defaultLocationApp}
                  onClick={() => {
                    update({ defaultLocationApp: app.id })
                    setTargetMenuOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[length:var(--fs-sm)] ${app.id === preferences.defaultLocationApp ? 'bg-bg-200 text-text-100' : 'text-text-200 hover:bg-bg-200'}`}
                >
                  <LocationAppIcon app={app} className="size-5 shrink-0 object-contain" />
                  <span className="min-w-0 flex-1 truncate">{app.name}</span>
                  {app.id === preferences.defaultLocationApp && <CheckIcon size={14} className="shrink-0 text-accent-main-100" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label={t('general.showMenuBarIcon')}
        description={t('general.showMenuBarIconDesc')}
        onClick={() => update({ showMenuBarIcon: !preferences.showMenuBarIcon })}
      >
        <Toggle
          enabled={preferences.showMenuBarIcon}
          onChange={() => update({ showMenuBarIcon: !preferences.showMenuBarIcon })}
          ariaLabel={t('general.showMenuBarIcon')}
        />
      </SettingRow>

      <SettingRow
        label={t('general.hideDockOnClose')}
        description={t('general.hideDockOnCloseDesc')}
        onClick={() => update({ hideDockOnClose: !preferences.hideDockOnClose })}
      >
        <Toggle
          enabled={preferences.hideDockOnClose}
          onChange={() => update({ hideDockOnClose: !preferences.hideDockOnClose })}
          ariaLabel={t('general.hideDockOnClose')}
        />
      </SettingRow>
      </SettingsSection>
      <QuotaDisplaySettings />
    </>
  )
}

function QuotaDisplaySettings() {
  const { t } = useTranslation(['settings'])
  const preferences = useDesktopPreferences()
  const { activeServer } = useServerStore()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string>()
  const [openCodeGoConfig, setOpenCodeGoConfig] = useState<OpenCodeGoQuotaConfig>()
  const [openCodeGoWorkspaceId, setOpenCodeGoWorkspaceId] = useState('')
  const [openCodeGoAuthCookie, setOpenCodeGoAuthCookie] = useState('')
  const [openCodeGoSaving, setOpenCodeGoSaving] = useState(false)
  const [openCodeGoLoggingIn, setOpenCodeGoLoggingIn] = useState(false)
  const [openCodeGoNotice, setOpenCodeGoNotice] = useState<{ kind: 'success' | 'error'; message: string }>()

  useEffect(() => {
    void getProviders()
      .then(value => {
        const connected = new Set(value.connected)
        setProviders(value.all.filter(provider => connected.has(provider.id)))
      })
      .catch(error => uiErrorHandler('load quota providers', error))
      .finally(() => setLoading(false))
  }, [activeServer?.id])

  useEffect(() => {
    if (!window.customOpenCode?.openCodeGoQuotaConfig) return
    void window.customOpenCode.openCodeGoQuotaConfig()
      .then(config => {
        setOpenCodeGoConfig(config)
        setOpenCodeGoWorkspaceId(config.workspaceId)
      })
      .catch(error => uiErrorHandler('load OpenCode Go quota config', error))
  }, [])

  const ordered = useMemo(() => {
    const positions = new Map(preferences.quotaProviders.map((item, index) => [item.id, index]))
    return providers.toSorted((left, right) => {
      const leftIndex = positions.get(left.id)
      const rightIndex = positions.get(right.id)
      if (leftIndex !== undefined || rightIndex !== undefined) {
        if (leftIndex === undefined) return 1
        if (rightIndex === undefined) return -1
        return leftIndex - rightIndex
      }
      return (left.name || left.id).localeCompare(right.name || right.id, undefined, { numeric: true })
    })
  }, [preferences.quotaProviders, providers])

  const saveVisibleOrder = (visible: Array<{ id: string; enabled: boolean }>) => {
    const visibleIds = new Set(visible.map(item => item.id))
    void desktopPreferencesStore.update({
      quotaProviders: [
        ...visible,
        ...preferences.quotaProviders.filter(item => !visibleIds.has(item.id)),
      ],
    }).catch(error => uiErrorHandler('update quota provider preferences', error))
  }

  const toggle = (providerId: string) => {
    saveVisibleOrder(ordered.map(provider => ({
      id: provider.id,
      enabled: provider.id === providerId
        ? !(preferences.quotaProviders.find(item => item.id === provider.id)?.enabled ?? false)
        : (preferences.quotaProviders.find(item => item.id === provider.id)?.enabled ?? false),
    })))
  }

  const moveBefore = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return
    const next = ordered.map(provider => ({
      id: provider.id,
      enabled: preferences.quotaProviders.find(item => item.id === provider.id)?.enabled ?? false,
    }))
    const sourceIndex = next.findIndex(item => item.id === draggingId)
    const targetIndex = next.findIndex(item => item.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    saveVisibleOrder(next)
  }

  const saveOpenCodeGoConfig = () => {
    if (!window.customOpenCode?.updateOpenCodeGoQuotaConfig) return
    if (!openCodeGoWorkspaceId.trim()) {
      setOpenCodeGoNotice({ kind: 'error', message: t('general.openCodeGoWorkspaceRequired') })
      return
    }
    if (!openCodeGoAuthCookie.trim() && !openCodeGoConfig?.hasAuthCookie) {
      setOpenCodeGoNotice({ kind: 'error', message: t('general.openCodeGoCookieRequired') })
      return
    }
    setOpenCodeGoSaving(true)
    setOpenCodeGoNotice(undefined)
    void window.customOpenCode.updateOpenCodeGoQuotaConfig({
      workspaceId: openCodeGoWorkspaceId,
      ...(openCodeGoAuthCookie.trim() ? { authCookie: openCodeGoAuthCookie } : {}),
    })
      .then(config => {
        setOpenCodeGoConfig(config)
        setOpenCodeGoWorkspaceId(config.workspaceId)
        setOpenCodeGoAuthCookie('')
        setOpenCodeGoNotice({ kind: 'success', message: t('general.openCodeGoSaved') })
      })
      .catch(error => {
        uiErrorHandler('save OpenCode Go quota config', error)
        setOpenCodeGoNotice({ kind: 'error', message: t('general.openCodeGoSaveFailed') })
      })
      .finally(() => setOpenCodeGoSaving(false))
  }

  const loginOpenCodeGo = () => {
    if (!window.customOpenCode?.loginOpenCodeGoQuota) return
    setOpenCodeGoLoggingIn(true)
    setOpenCodeGoNotice(undefined)
    void window.customOpenCode.loginOpenCodeGoQuota({
      force: openCodeGoConfig?.hasAuthCookie === true,
    })
      .then(result => {
        if (result.status === 'cancelled') {
          setOpenCodeGoNotice({ kind: 'error', message: t('general.openCodeGoLoginCancelled') })
          return
        }
        setOpenCodeGoConfig(result.config)
        setOpenCodeGoWorkspaceId(result.config.workspaceId)
        setOpenCodeGoAuthCookie('')
        setOpenCodeGoNotice({ kind: 'success', message: t('general.openCodeGoLoginSuccess') })
      })
      .catch(error => {
        uiErrorHandler('login to OpenCode Go for quota', error)
        setOpenCodeGoNotice({ kind: 'error', message: t('general.openCodeGoLoginFailed') })
      })
      .finally(() => setOpenCodeGoLoggingIn(false))
  }

  const clearOpenCodeGoCookie = () => {
    if (!window.customOpenCode?.updateOpenCodeGoQuotaConfig) return
    setOpenCodeGoSaving(true)
    setOpenCodeGoNotice(undefined)
    void window.customOpenCode.updateOpenCodeGoQuotaConfig({
      workspaceId: openCodeGoWorkspaceId,
      clearAuthCookie: true,
    })
      .then(config => {
        setOpenCodeGoConfig(config)
        setOpenCodeGoAuthCookie('')
        setOpenCodeGoNotice({ kind: 'success', message: t('general.openCodeGoCookieCleared') })
      })
      .catch(error => {
        uiErrorHandler('clear OpenCode Go quota cookie', error)
        setOpenCodeGoNotice({ kind: 'error', message: t('general.openCodeGoSaveFailed') })
      })
      .finally(() => setOpenCodeGoSaving(false))
  }

  const localServer = !activeServer || activeServer.id === 'local'
  const openCodeGoManagedByEnvironment = openCodeGoConfig?.source === 'environment'

  return (
    <SettingsSection title={t('general.quotaDisplay')}>
      <p className="-mt-2 text-[length:var(--fs-sm)] leading-relaxed text-text-400">
        {t('general.quotaDisplayDesc')}
      </p>
      {loading ? (
        <div className="py-3 text-[length:var(--fs-sm)] text-text-400">{t('general.quotaLoading')}</div>
      ) : ordered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-200 px-3 py-5 text-center text-[length:var(--fs-sm)] text-text-400">
          {t('general.quotaEmpty')}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-200/55 bg-bg-050/35">
          {ordered.map(provider => {
            const supported = supportsQuotaProvider(provider.id)
            const enabled = preferences.quotaProviders.find(item => item.id === provider.id)?.enabled ?? false
            const openCodeGo = canonicalQuotaProviderId(provider.id) === 'opencode-go'
            return (
              <div
                key={provider.id}
                onDragOver={event => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                }}
                onDrop={event => {
                  event.preventDefault()
                  moveBefore(provider.id)
                  setDraggingId(undefined)
                }}
                className={`border-b border-border-200/40 last:border-b-0 ${draggingId === provider.id ? 'opacity-45' : ''}`}
              >
                <div className="flex items-center gap-3 px-3 py-3">
                  <span
                    draggable
                    onDragStart={event => {
                      setDraggingId(provider.id)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', provider.id)
                    }}
                    onDragEnd={() => setDraggingId(undefined)}
                    className="shrink-0 cursor-grab text-text-500 active:cursor-grabbing"
                    title={t('general.quotaDrag')}
                  >
                    <GripVerticalIcon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[length:var(--fs-md)] font-medium text-text-100">
                      {provider.name || provider.id}
                    </div>
                    <div className="truncate text-[length:var(--fs-xs)] text-text-500">{provider.id}</div>
                  </div>
                  {supported ? (
                    <div className="flex items-center gap-2.5">
                      <span className="text-[length:var(--fs-xs)] text-text-300">{t('general.showQuota')}</span>
                      <Toggle
                        enabled={enabled}
                        onChange={() => toggle(provider.id)}
                        ariaLabel={`${provider.name || provider.id} ${t('general.showQuota')}`}
                      />
                    </div>
                  ) : (
                    <span className="text-[length:var(--fs-xs)] text-danger-100">
                      {t('general.quotaUnsupported')}
                    </span>
                  )}
                </div>
                {openCodeGo && (
                  <div className="mx-3 mb-3 rounded-lg border border-border-200/45 bg-bg-100/45 p-3">
                    <div className="text-[length:var(--fs-sm)] font-medium text-text-100">
                      {t('general.openCodeGoSetup')}
                    </div>
                    <p className="mt-1 text-[length:var(--fs-xs)] leading-relaxed text-text-400">
                      {t('general.openCodeGoSetupDesc')}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!localServer || openCodeGoManagedByEnvironment || openCodeGoLoggingIn}
                        onClick={loginOpenCodeGo}
                        className="h-8 rounded-lg bg-accent-main-100 px-3 text-[length:var(--fs-xs)] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {openCodeGoLoggingIn
                          ? t('general.openCodeGoWaitingForLogin')
                          : openCodeGoConfig?.hasAuthCookie
                            ? t('general.openCodeGoRelogin')
                            : t('general.openCodeGoLogin')}
                      </button>
                      {openCodeGoConfig?.source === 'secure-storage' && openCodeGoConfig.hasAuthCookie && (
                        <button
                          type="button"
                          disabled={openCodeGoSaving || openCodeGoLoggingIn}
                          onClick={clearOpenCodeGoCookie}
                          className="h-8 rounded-lg border border-border-200 px-3 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('general.openCodeGoDisconnect')}
                        </button>
                      )}
                      {openCodeGoNotice && (
                        <span className={`text-[length:var(--fs-xs)] ${openCodeGoNotice.kind === 'error' ? 'text-danger-100' : 'text-success-100'}`}>
                          {openCodeGoNotice.message}
                        </span>
                      )}
                    </div>
                    {openCodeGoConfig?.hasAuthCookie && openCodeGoConfig.workspaceId && (
                      <p className="mt-2 text-[length:var(--fs-xs)] text-text-400">
                        {t('general.openCodeGoConnectedWorkspace', { workspaceId: openCodeGoConfig.workspaceId })}
                      </p>
                    )}
                    {!openCodeGoManagedByEnvironment && (
                      <details className="mt-3 border-t border-border-200/35 pt-2">
                        <summary className="cursor-pointer select-none text-[length:var(--fs-xs)] text-text-400 hover:text-text-200">
                          {t('general.openCodeGoManualSetup')}
                        </summary>
                        <p className="mt-2 text-[length:var(--fs-xs)] leading-relaxed text-text-500">
                          {t('general.openCodeGoManualSetupDesc')}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="grid gap-1.5 text-[length:var(--fs-xs)] text-text-300">
                            <span>{t('general.openCodeGoWorkspaceId')}</span>
                            <input
                              value={openCodeGoWorkspaceId}
                              disabled={!localServer}
                              onChange={event => {
                                setOpenCodeGoWorkspaceId(event.target.value)
                                setOpenCodeGoNotice(undefined)
                              }}
                              placeholder={t('general.openCodeGoWorkspaceIdPlaceholder')}
                              className="h-9 rounded-lg border border-border-200 bg-bg-000 px-2.5 text-[length:var(--fs-sm)] text-text-100 outline-none placeholder:text-text-500 focus:border-accent-main-100 disabled:cursor-not-allowed disabled:opacity-55"
                            />
                          </label>
                          <label className="grid gap-1.5 text-[length:var(--fs-xs)] text-text-300">
                            <span>{t('general.openCodeGoAuthCookie')}</span>
                            <input
                              type="password"
                              value={openCodeGoAuthCookie}
                              disabled={!localServer}
                              onChange={event => {
                                setOpenCodeGoAuthCookie(event.target.value)
                                setOpenCodeGoNotice(undefined)
                              }}
                              placeholder={openCodeGoConfig?.hasAuthCookie
                                ? t('general.openCodeGoAuthCookieSaved')
                                : t('general.openCodeGoAuthCookiePlaceholder')}
                              className="h-9 rounded-lg border border-border-200 bg-bg-000 px-2.5 text-[length:var(--fs-sm)] text-text-100 outline-none placeholder:text-text-500 focus:border-accent-main-100 disabled:cursor-not-allowed disabled:opacity-55"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          disabled={!localServer || openCodeGoSaving || openCodeGoLoggingIn}
                          onClick={saveOpenCodeGoConfig}
                          className="mt-3 h-8 rounded-lg border border-border-200 px-3 text-[length:var(--fs-xs)] font-medium text-text-200 hover:bg-bg-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {openCodeGoSaving ? t('general.openCodeGoSaving') : t('general.openCodeGoSaveManual')}
                        </button>
                      </details>
                    )}
                    {!localServer && (
                      <p className="mt-2 text-[length:var(--fs-xs)] text-danger-100">
                        {t('general.openCodeGoRemoteUnsupported')}
                      </p>
                    )}
                    {openCodeGoManagedByEnvironment && (
                      <p className="mt-2 text-[length:var(--fs-xs)] text-text-400">
                        {t('general.openCodeGoManagedByEnvironment')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SettingsSection>
  )
}
