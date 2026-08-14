import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { SettingsCard, Toggle } from './SettingsUI'
import { useImBridgeData } from './imBotShared'

export function ImBotServiceSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const { available, config, state, message, busy, setConfig, setMessage, setBusy } = useImBridgeData()

  if (!available) {
    return <SettingsCard title={t('imBot.title')} description={t('imBot.desktopOnly')}><div /></SettingsCard>
  }
  if (!config) return <div className="text-[length:var(--fs-sm)] text-text-400">{t('common:loading')}</div>

  const changeState = async (action: 'start' | 'stop' | 'restart') => {
    setBusy(true)
    setMessage('')
    try {
      await window.customOpenCode.updateImBridgeConfig(config)
      await (action === 'start'
        ? window.customOpenCode.startImBridge()
        : action === 'stop'
          ? window.customOpenCode.stopImBridge()
          : window.customOpenCode.restartImBridge())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const statusClass = state.status === 'running' ? 'text-success-100' : state.status === 'error' ? 'text-danger-100' : state.status === 'starting' ? 'text-warning-100' : 'text-text-400'

  return (
    <div className="space-y-4">
      <SettingsCard
        title={t('imBot.serviceTitle')}
        description={t('imBot.serviceDescription')}
        actions={<span className={`text-[length:var(--fs-xs)] font-medium ${statusClass}`}>{t(`imBot.status.${state.status}`)}{state.pid ? ` · PID ${state.pid}` : ''}</span>}
      >
        <div className="flex flex-wrap items-center gap-2">
          {state.status === 'running' || state.status === 'starting'
            ? <Button size="sm" variant="danger" disabled={busy} onClick={() => void changeState('stop')}>{t('imBot.stop')}</Button>
            : <Button size="sm" disabled={busy} onClick={() => void changeState('start')}>{t('imBot.start')}</Button>}
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void changeState('restart')}>{t('imBot.restart')}</Button>
          <label className="ml-auto flex items-center gap-2 text-[length:var(--fs-xs)] text-text-300">
            {t('imBot.autoStart')}
            <Toggle enabled={config.autoStart} onChange={() => setConfig({ ...config, autoStart: !config.autoStart })} />
          </label>
        </div>
        {state.error ? <p className="mt-2 text-[length:var(--fs-xs)] text-danger-100">{state.error}</p> : null}
        {message ? <p className="mt-2 text-[length:var(--fs-xs)] text-text-300">{message}</p> : null}
      </SettingsCard>
    </div>
  )
}
