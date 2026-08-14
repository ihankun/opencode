import { useTranslation } from 'react-i18next'
import { SettingsCard } from './SettingsUI'
import { useImBridgeData } from './imBotShared'

export function ImBotLogsSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const { available, state } = useImBridgeData()

  if (!available) {
    return <SettingsCard title={t('imBot.title')} description={t('imBot.desktopOnly')}><div /></SettingsCard>
  }

  return (
    <SettingsCard title={t('imBot.logsTitle')} description={t('imBot.logsDescription')}>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-bg-000 p-3 font-mono text-[length:var(--fs-xs)] leading-relaxed text-text-300">{state.logs.length ? state.logs.join('\n') : t('imBot.noLogs')}</pre>
    </SettingsCard>
  )
}
