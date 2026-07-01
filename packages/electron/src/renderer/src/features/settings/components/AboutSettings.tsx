import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { DownloadIcon, UploadIcon } from '../../../components/Icons'
import { useUpdateStore } from '../../../store/updateStore'
import { saveData } from '../../../utils/downloadUtils'
import { exportSettingsBackup, importSettingsBackup, previewBackupMeta } from '../../../utils/settingsBackup'
import { SettingsCard, SettingsSection } from './SettingsUI'

export function AboutSettings() {
  const { t } = useTranslation(['settings'])
  const updateState = useUpdateStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [backupBusy, setBackupBusy] = useState<'export' | 'import' | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)

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
        const confirmed = window.confirm(
          createdAt
            ? t('about.backupImportConfirmWithDate', { date: new Date(createdAt).toLocaleString() })
            : t('about.backupImportConfirm'),
        )
        if (!confirmed) return

        await importSettingsBackup(file)
        window.location.reload()
      } catch (error) {
        setBackupError(error instanceof Error ? error.message : t('about.backupImportFailed'))
      } finally {
        setBackupBusy(null)
      }
    },
    [t],
  )

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
                <div className="text-[length:var(--fs-xs)] text-text-400 mb-1">{t('about.opencodeVersion')}</div>
                <div className="text-[length:var(--fs-base)] font-semibold text-text-100 font-mono">
                  v{__OPENCODE_VERSION__}
                </div>
              </div>
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
      </SettingsSection>
    </div>
  )
}
