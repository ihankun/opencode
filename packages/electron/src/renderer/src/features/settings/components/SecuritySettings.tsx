import { useEffect, useState } from 'react'
import type { CustomOpenCodeSecurityConfig, CustomOpenCodeWindowsSandboxStatus } from '../../../../../preload'
import { SegmentedControl, SettingRow, SettingsSection, Toggle } from './SettingsUI'
import { useTranslation } from 'react-i18next'
import { evaluateNetworkTarget, isValidDomainRule, isValidIPRule } from '../../../utils/networkPolicy'

const fieldClass = 'w-full min-h-20 resize-y rounded-lg border border-border-200 bg-bg-000 px-3 py-2 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100'

export function SecuritySettings() {
  const { t } = useTranslation('settings')
  const [config, setConfig] = useState<CustomOpenCodeSecurityConfig>()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [windowsSandbox, setWindowsSandbox] = useState<CustomOpenCodeWindowsSandboxStatus>()
  const [windowsSandboxBusy, setWindowsSandboxBusy] = useState(false)
  const [testTarget, setTestTarget] = useState('https://github.com')
  const [auditLines, setAuditLines] = useState<Array<{ file: string; line: string }>>([])

  useEffect(() => {
    void window.customOpenCode.security().then(setConfig)
    void window.customOpenCode.windowsSandboxStatus().then(setWindowsSandbox)
  }, [])

  if (!config) return <div className="text-sm text-text-400">{t('security.loading')}</div>
  const invalidDomains = [...config.sandbox.allowedDomains.filter(rule => !isValidDomainRule(rule)), ...config.sandbox.deniedDomains.filter(rule => !isValidDomainRule(rule, true))]
  const invalidIPs = [...config.sandbox.allowedIPs.filter(rule => !isValidIPRule(rule)), ...config.sandbox.deniedIPs.filter(rule => !isValidIPRule(rule, true))]
  const test = evaluateNetworkTarget(testTarget, config)

  const setSandbox = (value: Partial<CustomOpenCodeSecurityConfig['sandbox']>) => {
    setConfig({ ...config, sandbox: { ...config.sandbox, ...value } })
    setStatus('idle')
    setSaveError('')
  }
  const setAudit = (value: Partial<CustomOpenCodeSecurityConfig['audit']>) => {
    setConfig({ ...config, audit: { ...config.audit, ...value } })
    setStatus('idle')
    setSaveError('')
  }
  const listField = (label: string, description: string, value: string[], onChange: (value: string[]) => void) => (
    <label className="flex flex-col gap-2">
      <span className="text-[length:var(--fs-md)] font-medium text-text-100">{label}</span>
      <span className="text-[length:var(--fs-sm)] text-text-400">{description}</span>
      <textarea
        aria-label={label}
        className={fieldClass}
        value={value.join('\n')}
        onChange={event => onChange(event.target.value.split(/\n|,/).map(item => item.trim()).filter(Boolean))}
      />
    </label>
  )

  return (
    <div>
      <SettingsSection title={t('security.sandbox')}>
        <SettingRow label={t('security.enableSandbox')} description={t('security.enableSandboxDescription')}>
          <Toggle enabled={config.sandbox.enabled} onChange={() => setSandbox({ enabled: !config.sandbox.enabled })} />
        </SettingRow>
        <div className="rounded-lg border border-border-200/60 bg-bg-050 px-3 py-2 text-[length:var(--fs-sm)] text-text-300">
          {t(config.sandbox.enabled ? 'security.enabledDescription' : 'security.disabledDescription')}
        </div>
        <div className="rounded-lg border border-accent-main-100/25 bg-accent-main-100/5 px-3 py-2 text-[length:var(--fs-sm)] text-text-300">
          {t('security.permissionDescription')}
        </div>
        {windowsSandbox?.supported && (
          <>
            <SettingRow
              label={t('security.windowsRuntime')}
              description={t(
                windowsSandbox.installed
                  ? 'security.windowsRuntimeReady'
                  : windowsSandbox.available
                    ? 'security.windowsRuntimeNeedsInstall'
                    : 'security.windowsRuntimeMissing',
              )}
            >
              <button
                type="button"
                disabled={windowsSandboxBusy || !windowsSandbox.available}
                className="rounded-lg border border-border-200 bg-bg-000 px-3 py-1.5 text-[length:var(--fs-sm)] font-medium text-text-100 hover:bg-bg-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  setWindowsSandboxBusy(true)
                  void window.customOpenCode.installWindowsSandbox().then(value => {
                    setWindowsSandbox(value)
                    setWindowsSandboxBusy(false)
                  }, error => {
                    setWindowsSandbox({
                      ...windowsSandbox,
                      error: error instanceof Error ? error.message : String(error),
                    })
                    setWindowsSandboxBusy(false)
                  })
                }}
              >
                {t(
                  windowsSandboxBusy
                    ? 'security.windowsRuntimeInstalling'
                    : windowsSandbox.installed
                      ? 'security.windowsRuntimeRepair'
                      : 'security.windowsRuntimeInstall',
                )}
              </button>
            </SettingRow>
            {(windowsSandbox.error || windowsSandbox.cancelled) && (
              <div className="rounded-lg border border-danger-100/25 bg-danger-100/5 px-3 py-2 text-[length:var(--fs-sm)] text-danger-100">
                {windowsSandbox.cancelled ? t('security.windowsRuntimeCancelled') : windowsSandbox.error}
              </div>
            )}
          </>
        )}
        {listField(t('security.denyRead'), t('security.denyReadDescription'), config.sandbox.denyRead, denyRead => setSandbox({ denyRead }))}
        {listField(t('security.allowRead'), t('security.allowReadDescription'), config.sandbox.allowRead, allowRead => setSandbox({ allowRead }))}
        {listField(t('security.allowWrite'), t('security.allowWriteDescription'), config.sandbox.allowWrite, allowWrite => setSandbox({ allowWrite }))}
        {listField(t('security.denyWrite'), t('security.denyWriteDescription'), config.sandbox.denyWrite, denyWrite => setSandbox({ denyWrite }))}
        <div className="rounded-lg border border-accent-main-100/25 bg-accent-main-100/5 px-3 py-2 text-[length:var(--fs-sm)] text-text-300">
          {t('security.strictNetworkDescription')}
        </div>
        {listField(t('security.allowedDomains'), t('security.allowedDomainsDescription'), config.sandbox.allowedDomains, allowedDomains => setSandbox({ allowedDomains }))}
        {listField(t('security.deniedDomains'), t('security.deniedDomainsDescription'), config.sandbox.deniedDomains, deniedDomains => setSandbox({ deniedDomains }))}
        {listField(t('security.allowedIPs'), t('security.allowedIPsDescription'), config.sandbox.allowedIPs, allowedIPs => setSandbox({ allowedIPs }))}
        {listField(t('security.deniedIPs'), t('security.deniedIPsDescription'), config.sandbox.deniedIPs, deniedIPs => setSandbox({ deniedIPs }))}
        <SettingRow label={t('security.blockPrivateNetworks')} description={t('security.blockPrivateNetworksDescription')}>
          <Toggle enabled={config.sandbox.blockPrivateNetworks} onChange={() => setSandbox({ blockPrivateNetworks: !config.sandbox.blockPrivateNetworks })} />
        </SettingRow>
        {listField(t('security.unixSockets'), t('security.unixSocketsDescription'), config.sandbox.allowUnixSockets, allowUnixSockets => setSandbox({ allowUnixSockets }))}
        <SettingRow label={t('security.allUnixSockets')} description={t('security.allUnixSocketsDescription')}>
          <Toggle enabled={config.sandbox.allowAllUnixSockets} onChange={() => setSandbox({ allowAllUnixSockets: !config.sandbox.allowAllUnixSockets })} />
        </SettingRow>
        <SettingRow label={t('security.localBinding')} description={t('security.localBindingDescription')}>
          <Toggle enabled={config.sandbox.allowLocalBinding} onChange={() => setSandbox({ allowLocalBinding: !config.sandbox.allowLocalBinding })} />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t('security.policyTester')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('security.policyTesterDescription')}</p>
        <div className="flex gap-2"><input value={testTarget} onChange={event => setTestTarget(event.target.value)} className={`${fieldClass} !min-h-0 flex-1`} placeholder="https://api.example.com / 10.0.0.1" /><div className={`flex min-w-28 items-center justify-center rounded-lg border px-3 text-[length:var(--fs-sm)] font-medium ${test.allowed ? 'border-success-100/30 bg-success-100/5 text-success-100' : 'border-danger-100/30 bg-danger-100/5 text-danger-100'}`}>{test.allowed ? t('security.testAllowed') : t('security.testDenied')}</div></div>
        <div className="rounded-lg bg-bg-050 px-3 py-2 font-mono text-[length:var(--fs-xs)] text-text-300">{test.reason}</div>
        {(invalidDomains.length > 0 || invalidIPs.length > 0) && <div className="rounded-lg border border-danger-100/30 bg-danger-100/5 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">{t('security.invalidRules')}: {[...invalidDomains, ...invalidIPs].join(', ')}</div>}
      </SettingsSection>

      <SettingsSection title={t('security.audit')}>
        <SettingRow label={t('security.auditActivity')} description={t('security.auditActivityDescription')}>
          <Toggle enabled={config.audit.enabled} onChange={() => setAudit({ enabled: !config.audit.enabled })} />
        </SettingRow>
        <SettingRow label={t('security.storageFormat')} description={t('security.storageFormatDescription')}>
          <div className="w-32"><SegmentedControl value="jsonl" options={[{ value: 'jsonl', label: 'JSONL' }]} onChange={() => undefined} /></div>
        </SettingRow>
        <label className="flex flex-col gap-2">
          <span className="text-[length:var(--fs-md)] font-medium text-text-100">{t('security.logDirectory')}</span>
          <input aria-label={t('security.logDirectory')} className={`${fieldClass} !min-h-0`} value={config.audit.directory} onChange={event => setAudit({ directory: event.target.value })} />
        </label>
        <div className="flex justify-end"><button type="button" onClick={() => void window.customOpenCode.securityAudit().then(setAuditLines)} className="rounded-lg border border-border-200 bg-bg-000 px-3 py-1.5 text-[length:var(--fs-sm)] text-text-200 hover:bg-bg-100">{t('security.refreshAudit')}</button></div>
        <div className="max-h-72 overflow-auto rounded-lg border border-border-200/60 bg-bg-000 p-2">{auditLines.length === 0 ? <div className="py-8 text-center text-[length:var(--fs-xs)] text-text-500">{t('security.noAudit')}</div> : auditLines.map((entry, index) => <details key={`${entry.file}:${index}`} className="border-b border-border-200/30 py-1"><summary className="cursor-pointer truncate font-mono text-[length:var(--fs-xxs)] text-text-400">{entry.file} · {entry.line.slice(0, 160)}</summary><pre className="mt-1 whitespace-pre-wrap break-all rounded bg-bg-100 p-2 font-mono text-[length:var(--fs-xxs)] text-text-300">{formatAuditLine(entry.line)}</pre></details>)}</div>
      </SettingsSection>

      <div className="flex items-center justify-end gap-3">
        <span className={`text-sm ${status === 'error' ? 'text-danger-100' : 'text-text-400'}`}>
          {status === 'error' && saveError ? saveError : t(`security.status_${status}`)}
        </span>
        <button
          type="button"
          disabled={status === 'saving'}
          className="rounded-lg bg-accent-main-100 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => {
            setStatus('saving')
            setSaveError('')
            void window.customOpenCode.updateSecurity(config).then(value => {
              setConfig(value)
              setStatus('saved')
            }, error => {
              setSaveError(error instanceof Error ? error.message : String(error))
              setStatus('error')
            })
          }}
        >
          {t('security.save')}
        </button>
      </div>
    </div>
  )
}

function formatAuditLine(line: string) {
  try { return JSON.stringify(JSON.parse(line), null, 2) } catch { return line }
}
