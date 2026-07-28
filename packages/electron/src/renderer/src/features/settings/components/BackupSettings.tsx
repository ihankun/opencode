import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadIcon, UploadIcon } from '../../../components/Icons'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { saveData } from '../../../utils/downloadUtils'
import { exportSettingsBackup, importSettingsBackup, previewBackupMeta } from '../../../utils/settingsBackup'
import { SettingsCard, SettingsSection } from './SettingsUI'

export function BackupSettings() {
  const { t } = useTranslation(['settings'])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [backupBusy, setBackupBusy] = useState<'export' | 'import' | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [pendingBackup, setPendingBackup] = useState<{ file: File; createdAt?: string } | null>(null)

  const handleExportBackup = useCallback(async () => {
    setBackupError(null)
    setBackupBusy('export')
    try {
      const { fileName, data } = await exportSettingsBackup()
      saveData(data, fileName, 'application/json;charset=utf-8')
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : t('backup.exportFailed'))
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
        setBackupError(error instanceof Error ? error.message : t('backup.importFailed'))
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
      setBackupError(error instanceof Error ? error.message : t('backup.importFailed'))
      setPendingBackup(null)
    } finally {
      setBackupBusy(null)
    }
  }, [pendingBackup, t])

  return (
    <div className="space-y-7">
      <SettingsSection title={t('backup.title')}>
        <SettingsCard title={t('backup.cardTitle')} description={t('backup.cardDesc')}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportBackup}
            className="hidden"
          />
          <div className="space-y-4">
            <div className="rounded-lg border border-border-200/50 bg-bg-100/35 px-3 py-3 text-[length:var(--fs-sm)] text-text-300 leading-relaxed">
              {t('backup.warning')}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-success-100/25 bg-success-100/5 px-3 py-3">
                <div className="mb-2 text-[length:var(--fs-xs)] font-semibold text-success-100">
                  {t('backup.included')}
                </div>
                <ul className="space-y-1 text-[length:var(--fs-xs)] text-text-300">
                  <li>• {t('backup.includedPreferences')}</li>
                  <li>• {t('backup.includedServers')}</li>
                  <li>• {t('backup.includedServerPreferences')}</li>
                </ul>
              </div>
              <div className="rounded-lg border border-warning-100/25 bg-warning-100/5 px-3 py-3">
                <div className="mb-2 text-[length:var(--fs-xs)] font-semibold text-warning-100">
                  {t('backup.excluded')}
                </div>
                <ul className="space-y-1 text-[length:var(--fs-xs)] text-text-300">
                  <li>• {t('backup.excludedCredentials')}</li>
                  <li>• {t('backup.excludedRuntime')}</li>
                  <li>• {t('backup.excludedConfiguration')}</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" isLoading={backupBusy === 'export'} onClick={handleExportBackup}>
                {backupBusy !== 'export' && <DownloadIcon size={12} />}
                {t('backup.export')}
              </Button>
              <Button size="sm" variant="ghost" isLoading={backupBusy === 'import'} onClick={handleImportClick}>
                {backupBusy !== 'import' && <UploadIcon size={12} />}
                {t('backup.import')}
              </Button>
            </div>

            {backupError && (
              <div className="rounded-lg border border-danger-100/20 bg-danger-100/10 px-3 py-2 text-[length:var(--fs-sm)] text-danger-100 leading-relaxed">
                {backupError}
              </div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>
      <ConfirmDialog
        isOpen={pendingBackup !== null}
        onClose={() => setPendingBackup(null)}
        onConfirm={() => void confirmImportBackup()}
        title={t('backup.import')}
        description={
          pendingBackup?.createdAt
            ? t('backup.importConfirmWithDate', {
                date: new Date(pendingBackup.createdAt).toLocaleString(),
              })
            : t('backup.importConfirm')
        }
        confirmText={t('backup.import')}
        variant="warning"
        isLoading={backupBusy === 'import'}
      />
    </div>
  )
}
