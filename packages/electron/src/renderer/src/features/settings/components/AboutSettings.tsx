import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { ExternalLinkIcon, RetryIcon } from '../../../components/Icons'
import { hasUpdateAvailable, RELEASES_PAGE_URL, updateStore, useUpdateStore } from '../../../store/updateStore'
import { openUrl } from '../../../utils/browserOpen'
import { SettingsCard, SettingsSection } from './SettingsUI'

export function AboutSettings() {
  const { i18n, t } = useTranslation(['settings'])
  const updateState = useUpdateStore()
  const latestRelease = updateState.latestRelease
  const updateAvailable = hasUpdateAvailable(updateState)

  useEffect(() => {
    void updateStore.checkForUpdates()
  }, [])

  const handleCheckForUpdates = useCallback(() => {
    void updateStore.checkForUpdates({ force: true })
  }, [])

  const handleOpenRelease = useCallback((url: string) => {
    void openUrl(url, 'system')
  }, [])

  return (
    <div className="space-y-7">
      <SettingsSection title={t('about.title')}>
        <SettingsCard title={t('about.versionCardTitle')} description={t('about.versionCardDesc')}>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border-200/50 bg-bg-000/35 px-3 py-2.5">
                <div className="text-[length:var(--fs-xs)] text-text-400 mb-1">{t('about.currentVersion')}</div>
                <div className="text-[length:var(--fs-base)] font-semibold text-text-100 font-mono">
                  v{updateState.currentVersion}
                </div>
              </div>
              <div className="rounded-lg border border-border-200/50 bg-bg-000/35 px-3 py-2.5">
                <div className="text-[length:var(--fs-xs)] text-text-400 mb-1">{t('about.kernelVersion')}</div>
                <div className="text-[length:var(--fs-base)] font-semibold text-text-100 font-mono">
                  v{__OPENCODE_VERSION__}
                </div>
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard title={t('about.updateCardTitle')} description={t('about.updateCardDesc')}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-200/50 bg-bg-000/35 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[length:var(--fs-sm)] text-text-200">
                {updateState.checking
                  ? t('about.statusChecking')
                  : updateState.error
                    ? t('about.statusError', { error: updateState.error })
                    : updateAvailable
                      ? t('about.statusUpdateAvailable', { version: latestRelease?.version })
                      : updateState.lastCheckedAt
                        ? t('about.statusUpToDate')
                        : t('about.statusIdle')}
              </div>
              {latestRelease?.publishedAt && (
                <div className="mt-1 text-[length:var(--fs-xs)] text-text-400">
                  {t('about.publishedAt', { date: new Date(latestRelease.publishedAt).toLocaleString(i18n.language) })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" isLoading={updateState.checking} onClick={handleCheckForUpdates}>
                {!updateState.checking && <RetryIcon size={12} />}
                {t('about.checkNow')}
              </Button>
              {updateAvailable && latestRelease && (
                <Button size="sm" onClick={() => handleOpenRelease(latestRelease.url)}>
                  <ExternalLinkIcon size={12} />
                  {t('about.viewUpdate')}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => handleOpenRelease(RELEASES_PAGE_URL)}>
                <ExternalLinkIcon size={12} />
                {t('about.openReleases')}
              </Button>
            </div>
          </div>
        </SettingsCard>

      </SettingsSection>
    </div>
  )
}
