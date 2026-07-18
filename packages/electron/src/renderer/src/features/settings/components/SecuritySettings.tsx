import { useEffect, useState } from 'react'
import type { CustomOpenCodeSecurityConfig } from '../../../../../preload'
import { SegmentedControl, SettingRow, SettingsSection, Toggle } from './SettingsUI'
import { useTranslation } from 'react-i18next'

const fieldClass = 'w-full min-h-20 resize-y rounded-lg border border-border-200 bg-bg-000 px-3 py-2 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100'

export function SecuritySettings() {
  const { t } = useTranslation('settings')
  const [config, setConfig] = useState<CustomOpenCodeSecurityConfig>()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    void window.customOpenCode.security().then(setConfig)
  }, [])

  if (!config) return <div className="text-sm text-text-400">{t('security.loading')}</div>

  const setSandbox = (value: Partial<CustomOpenCodeSecurityConfig['sandbox']>) => {
    setConfig({ ...config, sandbox: { ...config.sandbox, ...value } })
    setStatus('idle')
  }
  const setAudit = (value: Partial<CustomOpenCodeSecurityConfig['audit']>) => {
    setConfig({ ...config, audit: { ...config.audit, ...value } })
    setStatus('idle')
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
        {listField(t('security.denyRead'), t('security.denyReadDescription'), config.sandbox.denyRead, denyRead => setSandbox({ denyRead }))}
        {listField(t('security.allowRead'), t('security.allowReadDescription'), config.sandbox.allowRead, allowRead => setSandbox({ allowRead }))}
        {listField(t('security.allowWrite'), t('security.allowWriteDescription'), config.sandbox.allowWrite, allowWrite => setSandbox({ allowWrite }))}
        {listField(t('security.denyWrite'), t('security.denyWriteDescription'), config.sandbox.denyWrite, denyWrite => setSandbox({ denyWrite }))}
        {listField(t('security.allowedDomains'), t('security.allowedDomainsDescription'), config.sandbox.allowedDomains, allowedDomains => setSandbox({ allowedDomains }))}
        {listField(t('security.deniedDomains'), t('security.deniedDomainsDescription'), config.sandbox.deniedDomains, deniedDomains => setSandbox({ deniedDomains }))}
        {listField(t('security.unixSockets'), t('security.unixSocketsDescription'), config.sandbox.allowUnixSockets, allowUnixSockets => setSandbox({ allowUnixSockets }))}
        <SettingRow label={t('security.allUnixSockets')} description={t('security.allUnixSocketsDescription')}>
          <Toggle enabled={config.sandbox.allowAllUnixSockets} onChange={() => setSandbox({ allowAllUnixSockets: !config.sandbox.allowAllUnixSockets })} />
        </SettingRow>
        <SettingRow label={t('security.localBinding')} description={t('security.localBindingDescription')}>
          <Toggle enabled={config.sandbox.allowLocalBinding} onChange={() => setSandbox({ allowLocalBinding: !config.sandbox.allowLocalBinding })} />
        </SettingRow>
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
      </SettingsSection>

      <div className="flex items-center justify-end gap-3">
        <span className={`text-sm ${status === 'error' ? 'text-danger-100' : 'text-text-400'}`}>
          {t(`security.status_${status}`)}
        </span>
        <button
          type="button"
          disabled={status === 'saving'}
          className="rounded-lg bg-accent-main-100 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => {
            setStatus('saving')
            void window.customOpenCode.updateSecurity(config).then(value => {
              setConfig(value)
              setStatus('saved')
            }, () => setStatus('error'))
          }}
        >
          {t('security.save')}
        </button>
      </div>
    </div>
  )
}
