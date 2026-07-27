import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyIcon, DownloadIcon } from '../../../components/Icons'
import { Button } from '../../../components/ui/Button'
import { serverStore } from '../../../store/serverStore'
import { saveData } from '../../../utils/downloadUtils'
import { SettingsCard, SettingsSection } from './SettingsUI'

export function LogsSettings() {
  const { t } = useTranslation(['settings'])
  const [logBusy, setLogBusy] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [diagnosticBusy, setDiagnosticBusy] = useState(false)
  const [diagnosticStatus, setDiagnosticStatus] = useState<string | null>(null)

  const handleExportLogs = useCallback(async () => {
    setLogError(null)
    setLogBusy(true)
    try {
      await window.customOpenCode.exportDebugLogs()
    } catch (error) {
      setLogError(error instanceof Error ? error.message : t('logs.logExportFailed'))
    } finally {
      setLogBusy(false)
    }
  }, [t])

  const diagnosticReport = useCallback(async () => {
    const native = await window.customOpenCode.diagnostics()
    return {
      ...native,
      servers: serverStore.getServers().map(server => ({
        id: server.id,
        name: server.name,
        transport: new URL(server.url).protocol.replace(':', ''),
        status: serverStore.getHealth(server.id)?.status ?? 'unknown',
        authenticationConfigured: Boolean(server.auth),
      })),
      activeServerId: serverStore.getActiveServerId(),
    }
  }, [])

  const handleCopyDiagnostics = useCallback(async () => {
    setDiagnosticBusy(true)
    setDiagnosticStatus(null)
    try {
      await navigator.clipboard.writeText(JSON.stringify(await diagnosticReport(), null, 2))
      setDiagnosticStatus(t('logs.diagnosticsCopied'))
    } catch (error) {
      setDiagnosticStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setDiagnosticBusy(false)
    }
  }, [diagnosticReport, t])

  const handleDownloadDiagnostics = useCallback(async () => {
    setDiagnosticBusy(true)
    setDiagnosticStatus(null)
    try {
      const report = JSON.stringify(await diagnosticReport(), null, 2)
      saveData(
        new TextEncoder().encode(report),
        `opencodex-diagnostics-${new Date().toISOString().slice(0, 10)}.json`,
        'application/json',
      )
      setDiagnosticStatus(t('logs.diagnosticsExported'))
    } catch (error) {
      setDiagnosticStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setDiagnosticBusy(false)
    }
  }, [diagnosticReport, t])

  return (
    <div className="space-y-7">
      <SettingsSection title={t('logs.title')}>
        <SettingsCard title={t('logs.debugLogsCardTitle')} description={t('logs.debugLogsCardDesc')}>
          <div className="space-y-3">
            <div className="rounded-lg border border-border-200/50 bg-bg-100/35 px-3 py-3 text-[length:var(--fs-sm)] leading-relaxed text-text-300">
              {t('logs.debugLogsWarning')}
            </div>
            <Button size="sm" variant="secondary" isLoading={logBusy} onClick={handleExportLogs}>
              {!logBusy && <DownloadIcon size={12} />}
              {t('logs.exportDebugLogs')}
            </Button>
            {logError && (
              <div className="rounded-lg border border-danger-100/20 bg-danger-100/10 px-3 py-2 text-[length:var(--fs-sm)] leading-relaxed text-danger-100">
                {logError}
              </div>
            )}
          </div>
        </SettingsCard>

        <SettingsCard title={t('logs.diagnosticsCardTitle')} description={t('logs.diagnosticsCardDesc')}>
          <div className="space-y-3">
            <div className="rounded-lg border border-border-200/50 bg-bg-100/35 px-3 py-3 text-[length:var(--fs-sm)] leading-relaxed text-text-300">
              {t('logs.diagnosticsSafe')}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                isLoading={diagnosticBusy}
                onClick={() => void handleCopyDiagnostics()}
              >
                {!diagnosticBusy && <CopyIcon size={12} />}
                {t('logs.copyDiagnostics')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={diagnosticBusy}
                onClick={() => void handleDownloadDiagnostics()}
              >
                <DownloadIcon size={12} />
                {t('logs.exportJson')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={diagnosticBusy}
                onClick={() => window.dispatchEvent(new Event('onboarding:restart'))}
              >
                {t('logs.restartOnboarding')}
              </Button>
            </div>
            {diagnosticStatus && (
              <div className="text-[length:var(--fs-xs)] text-text-400" role="status">
                {diagnosticStatus}
              </div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
