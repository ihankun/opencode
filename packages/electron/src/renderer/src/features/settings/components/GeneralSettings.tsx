import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, ChevronDownIcon, CogIcon } from '../../../components/Icons'
import { uiErrorHandler } from '../../../utils'
import { desktopPreferencesStore, useDesktopPreferences } from '../../../store/desktopPreferencesStore'
import { LocationAppIcon, type LocationApp } from '../../chat/LocationAppIcon'
import { getDesktopPlatform } from '../../../utils/platform'
import { SettingRow, SettingsSection, Toggle } from './SettingsUI'

export function GeneralSettings() {
  const { t } = useTranslation(['settings'])
  const preferences = useDesktopPreferences()
  const isMac = getDesktopPlatform() === 'macos'
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

      {isMac && (
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
      )}

      {isMac && (
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
      )}
    </SettingsSection>
  )
}
