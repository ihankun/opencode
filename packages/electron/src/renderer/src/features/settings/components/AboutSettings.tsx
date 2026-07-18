import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { DownloadIcon, ExternalLinkIcon, RetryIcon, UploadIcon } from '../../../components/Icons'
import { hasUpdateAvailable, RELEASES_PAGE_URL, updateStore, useUpdateStore } from '../../../store/updateStore'
import { saveData } from '../../../utils/downloadUtils'
import { exportSettingsBackup, importSettingsBackup, previewBackupMeta } from '../../../utils/settingsBackup'
import { openUrl } from '../../../utils/browserOpen'
import { SettingsCard, SettingsSection } from './SettingsUI'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'

export function AboutSettings() {
  const { i18n, t } = useTranslation(['settings'])
  const updateState = useUpdateStore()
  const latestRelease = updateState.latestRelease
  const updateAvailable = hasUpdateAvailable(updateState)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [backupBusy, setBackupBusy] = useState<'export' | 'import' | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [logBusy, setLogBusy] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [pendingBackup, setPendingBackup] = useState<{ file: File; createdAt?: string } | null>(null)

  useEffect(() => {
    void updateStore.checkForUpdates()
  }, [])

  const handleCheckForUpdates = useCallback(() => {
    void updateStore.checkForUpdates({ force: true })
  }, [])

  const handleOpenRelease = useCallback((url: string) => {
    void openUrl(url, 'system')
  }, [])

  const handleExportBackup = useCallback(async () => {
    setBackupError(null)
    setBackupBusy('export')
    try {
      const { fileName, data } = await exportSettingsBackup()
      saveData(data, fileName, 'application/json;charset=utf-8')
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : t('about.backupExportFailed'))
    } finally {
      setBackupBusy(null)
    }
  }, [t])

  const handleImportClick = useCallback(() => {
    setBackupError(null)
    fileInputRef.current?.click()
  }, [])

  const handleImportBackup = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      setBackupError(null)
      setBackupBusy('import')

      try {
        const { createdAt } = await previewBackupMeta(file)
        setPendingBackup({ file, createdAt: createdAt ?? undefined })
      } catch (error) {
        setBackupError(error instanceof Error ? error.message : t('about.backupImportFailed'))
      } finally {
        setBackupBusy(null)
      }
    },
    [t],
  )

  const confirmImportBackup = useCallback(async () => {
    if (!pendingBackup) return
    setBackupBusy('import')
    setBackupError(null)
    try {
      await importSettingsBackup(pendingBackup.file)
      window.location.reload()
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : t('about.backupImportFailed'))
      setPendingBackup(null)
    } finally {
      setBackupBusy(null)
    }
  }, [pendingBackup, t])

  const handleExportLogs = useCallback(async () => {
    setLogError(null)
    setLogBusy(true)
    try {
      await window.customOpenCode.exportDebugLogs()
    } catch (error) {
      setLogError(error instanceof Error ? error.message : t('about.logExportFailed'))
    } finally {
      setLogBusy(false)
    }
  }, [t])

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

        <SettingsCard title={t('about.backupCardTitle')} description={t('about.backupCardDesc')}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportBackup}
            className="hidden"
          />
          <div className="space-y-4">
            <div className="rounded-lg border border-border-200/50 bg-bg-100/35 px-3 py-3 text-[length:var(--fs-sm)] text-text-300 leading-relaxed">
              {t('about.backupWarning')}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" isLoading={backupBusy === 'export'} onClick={handleExportBackup}>
                {backupBusy !== 'export' && <DownloadIcon size={12} />}
                {t('about.exportBackup')}
              </Button>
              <Button size="sm" variant="ghost" isLoading={backupBusy === 'import'} onClick={handleImportClick}>
                {backupBusy !== 'import' && <UploadIcon size={12} />}
                {t('about.importBackup')}
              </Button>
            </div>

            {backupError && (
              <div className="rounded-lg border border-danger-100/20 bg-danger-100/10 px-3 py-2 text-[length:var(--fs-sm)] text-danger-100 leading-relaxed">
                {backupError}
              </div>
            )}
          </div>
        </SettingsCard>

        <SettingsCard title={t('about.debugLogsCardTitle')} description={t('about.debugLogsCardDesc')}>
          <div className="space-y-3">
            <div className="rounded-lg border border-border-200/50 bg-bg-100/35 px-3 py-3 text-[length:var(--fs-sm)] text-text-300 leading-relaxed">
              {t('about.debugLogsWarning')}
            </div>
            <Button size="sm" variant="secondary" isLoading={logBusy} onClick={handleExportLogs}>
              {!logBusy && <DownloadIcon size={12} />}
              {t('about.exportDebugLogs')}
            </Button>
            {logError && (
              <div className="rounded-lg border border-danger-100/20 bg-danger-100/10 px-3 py-2 text-[length:var(--fs-sm)] text-danger-100 leading-relaxed">
                {logError}
              </div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>
      <ConfirmDialog isOpen={pendingBackup !== null} onClose={() => setPendingBackup(null)} onConfirm={() => void confirmImportBackup()} title={t('about.importBackup')} description={pendingBackup?.createdAt ? t('about.backupImportConfirmWithDate', { date: new Date(pendingBackup.createdAt).toLocaleString() }) : t('about.backupImportConfirm')} confirmText={t('about.importBackup')} variant="warning" isLoading={backupBusy === 'import'} />
    </div>
  )
}
