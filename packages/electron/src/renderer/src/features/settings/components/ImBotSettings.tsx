import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { useDirectory, useModels, useServerStore } from '../../../hooks'
import type { ImBridgeConfig, ImBridgeState } from '../../../../../shared/imBridge'
import { SettingsCard, Toggle } from './SettingsUI'

const inputClass = 'h-8 w-full rounded-md border border-border-200 bg-bg-000 px-2.5 text-[length:var(--fs-sm)] text-text-100 outline-none placeholder:text-text-400 focus:border-accent-main-100/60 focus:ring-1 focus:ring-accent-main-100/20'

export function ImBotSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const { servers } = useServerStore()
  const { currentDirectory } = useDirectory()
  const [config, setConfig] = useState<ImBridgeConfig>()
  const [state, setState] = useState<ImBridgeState>({ status: 'stopped', logs: [] })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const available = typeof window.customOpenCode?.imBridgeConfig === 'function'
  const { models, isLoading: modelsLoading, error: modelsError } = useModels(config?.serverId)

  useEffect(() => {
    if (!available) return
    void Promise.all([window.customOpenCode.imBridgeConfig(), window.customOpenCode.imBridgeState()])
      .then(([nextConfig, nextState]) => {
        setConfig(nextConfig)
        setState(nextState)
      })
      .catch(error => setMessage(error instanceof Error ? error.message : String(error)))
    return window.customOpenCode.onImBridgeStateChanged(setState)
  }, [available])

  if (!available) {
    return <SettingsCard title={t('imBot.title')} description={t('imBot.desktopOnly')}><div /></SettingsCard>
  }
  if (!config) return <div className="text-[length:var(--fs-sm)] text-text-400">{t('common:loading')}</div>

  const save = async (restart: boolean) => {
    setBusy(true)
    setMessage('')
    try {
      const saved = await window.customOpenCode.updateImBridgeConfig(config)
      setConfig(saved)
      if (restart) setState(await window.customOpenCode.restartImBridge())
      setMessage(t(restart ? 'imBot.savedAndRestarted' : 'imBot.saved'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const changeState = async (action: 'start' | 'stop' | 'restart') => {
    setBusy(true)
    setMessage('')
    try {
      await window.customOpenCode.updateImBridgeConfig(config)
      const next = action === 'start'
        ? await window.customOpenCode.startImBridge()
        : action === 'stop'
          ? await window.customOpenCode.stopImBridge()
          : await window.customOpenCode.restartImBridge()
      setState(next)
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
            <Toggle enabled={config.autoStart} onChange={() => setConfig(current => current && ({ ...current, autoStart: !current.autoStart }))} />
          </label>
        </div>
        {state.error ? <p className="mt-2 text-[length:var(--fs-xs)] text-danger-100">{state.error}</p> : null}
      </SettingsCard>

      <SettingsCard title={t('imBot.connectionTitle')} description={t('imBot.connectionDescription')}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label={t('imBot.server')}>
            <select
              className={inputClass}
              value={config.serverId}
              onChange={event => {
                const selected = servers.find(server => server.id === event.target.value)
                if (!selected) return
                setConfig({ ...config, serverId: selected.id, serverUrl: selected.url, defaultModel: '' })
              }}
            >
              {servers.map(server => <option key={server.id} value={server.id}>{server.name} · {server.url}</option>)}
            </select>
          </Field>
          <Field label={t('imBot.agent')}>
            <input className={inputClass} value={config.defaultAgent} onChange={event => setConfig({ ...config, defaultAgent: event.target.value })} placeholder="build" />
          </Field>
          <Field label={t('imBot.defaultModel')}>
            <select
              className={inputClass}
              value={config.defaultModel}
              disabled={modelsLoading}
              onChange={event => setConfig({ ...config, defaultModel: event.target.value })}
            >
              <option value="">{modelsLoading ? t('imBot.modelsLoading') : t('imBot.automaticModel')}</option>
              {models.map(model => (
                <option key={`${model.providerId}/${model.id}`} value={`${model.providerId}/${model.id}`}>
                  {model.name} · {model.providerName}
                </option>
              ))}
            </select>
            {modelsError ? <span className="mt-1 block text-danger-100">{t('imBot.modelsLoadFailed')}</span> : null}
          </Field>
          <Field label={t('imBot.debounce')}>
            <input type="number" min={0} className={inputClass} value={config.messageDebounceMs} onChange={event => setConfig({ ...config, messageDebounceMs: Math.max(0, Number(event.target.value)) })} />
          </Field>
          <Field label={t('imBot.directory')} className="md:col-span-2">
            <div className="flex gap-2">
              <input className={inputClass} value={config.directory} onChange={event => setConfig({ ...config, directory: event.target.value })} />
              {currentDirectory ? <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setConfig({ ...config, directory: currentDirectory })}>{t('imBot.useCurrentProject')}</Button> : null}
            </div>
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title={t('imBot.channelsTitle')} description={t('imBot.channelsDescription')}>
        <div className="space-y-3">
          <ChannelCard title="飞书 / Lark" enabled={config.feishu.enabled} onToggle={() => setConfig({ ...config, feishu: { ...config.feishu, enabled: !config.feishu.enabled } })}>
            <Field label="App ID"><input className={inputClass} value={config.feishu.appId} onChange={event => setConfig({ ...config, feishu: { ...config.feishu, appId: event.target.value } })} /></Field>
            <Field label="App Secret"><Secret value={config.feishu.appSecret} onChange={value => setConfig({ ...config, feishu: { ...config.feishu, appSecret: value } })} /></Field>
            <Field label={t('imBot.verificationToken')}><Secret value={config.feishu.verificationToken} onChange={value => setConfig({ ...config, feishu: { ...config.feishu, verificationToken: value } })} /></Field>
            <Field label={t('imBot.webhookPort')}><input type="number" min={1} className={inputClass} value={config.feishu.webhookPort} onChange={event => setConfig({ ...config, feishu: { ...config.feishu, webhookPort: Number(event.target.value) } })} /></Field>
            <Field label="Encrypt Key"><Secret value={config.feishu.encryptKey} onChange={value => setConfig({ ...config, feishu: { ...config.feishu, encryptKey: value } })} /></Field>
          </ChannelCard>

          <ChannelCard title="QQ Bot" enabled={config.qq.enabled} onToggle={() => setConfig({ ...config, qq: { ...config.qq, enabled: !config.qq.enabled } })}>
            <Field label="App ID"><input className={inputClass} value={config.qq.appId} onChange={event => setConfig({ ...config, qq: { ...config.qq, appId: event.target.value } })} /></Field>
            <Field label="Secret"><Secret value={config.qq.secret} onChange={value => setConfig({ ...config, qq: { ...config.qq, secret: value } })} /></Field>
            <label className="flex items-center justify-between text-[length:var(--fs-sm)] text-text-200">Sandbox <Toggle enabled={config.qq.sandbox} onChange={() => setConfig({ ...config, qq: { ...config.qq, sandbox: !config.qq.sandbox } })} /></label>
          </ChannelCard>

          <ChannelCard title="Telegram" enabled={config.telegram.enabled} onToggle={() => setConfig({ ...config, telegram: { ...config.telegram, enabled: !config.telegram.enabled } })}>
            <Field label="Bot Token"><Secret value={config.telegram.botToken} onChange={value => setConfig({ ...config, telegram: { ...config.telegram, botToken: value } })} /></Field>
            <Field label={t('imBot.allowedChatIds')}><input className={inputClass} value={config.telegram.allowedChatIds.join(', ')} onChange={event => setConfig({ ...config, telegram: { ...config.telegram, allowedChatIds: splitList(event.target.value) } })} placeholder="12345678, 87654321" /></Field>
          </ChannelCard>

          <ChannelCard title="Discord" enabled={config.discord.enabled} onToggle={() => setConfig({ ...config, discord: { ...config.discord, enabled: !config.discord.enabled } })}>
            <Field label="Bot Token"><Secret value={config.discord.botToken} onChange={value => setConfig({ ...config, discord: { ...config.discord, botToken: value } })} /></Field>
            <Field label={t('imBot.allowedChannelIds')}><input className={inputClass} value={config.discord.allowedChannelIds.join(', ')} onChange={event => setConfig({ ...config, discord: { ...config.discord, allowedChannelIds: splitList(event.target.value) } })} /></Field>
          </ChannelCard>

          <ChannelCard title="微信 / WeChat" enabled={config.wechat.enabled} onToggle={() => setConfig({ ...config, wechat: { ...config.wechat, enabled: !config.wechat.enabled } })}>
            <Field label={t('imBot.sessionFile')}><input className={inputClass} value={config.wechat.sessionFile} onChange={event => setConfig({ ...config, wechat: { ...config.wechat, sessionFile: event.target.value } })} /></Field>
            <Field label="Base URL"><input className={inputClass} value={config.wechat.baseUrl} onChange={event => setConfig({ ...config, wechat: { ...config.wechat, baseUrl: event.target.value } })} /></Field>
            <Field label="Token"><Secret value={config.wechat.token} onChange={value => setConfig({ ...config, wechat: { ...config.wechat, token: value } })} /></Field>
          </ChannelCard>

          <ChannelCard title="钉钉 / DingTalk" enabled={config.dingtalk.enabled} onToggle={() => setConfig({ ...config, dingtalk: { ...config.dingtalk, enabled: !config.dingtalk.enabled } })}>
            <Field label="App Key"><input className={inputClass} value={config.dingtalk.appKey} onChange={event => setConfig({ ...config, dingtalk: { ...config.dingtalk, appKey: event.target.value } })} /></Field>
            <Field label="App Secret"><Secret value={config.dingtalk.appSecret} onChange={value => setConfig({ ...config, dingtalk: { ...config.dingtalk, appSecret: value } })} /></Field>
            <Field label="Agent ID"><input className={inputClass} value={config.dingtalk.agentId} onChange={event => setConfig({ ...config, dingtalk: { ...config.dingtalk, agentId: event.target.value } })} /></Field>
            <Field label={t('imBot.botName')}><input className={inputClass} value={config.dingtalk.botName} onChange={event => setConfig({ ...config, dingtalk: { ...config.dingtalk, botName: event.target.value } })} /></Field>
          </ChannelCard>
        </div>
        <p className="mt-3 text-[length:var(--fs-xs)] leading-relaxed text-warning-100">{t('imBot.securityWarning')}</p>
      </SettingsCard>

      <SettingsCard title={t('imBot.logsTitle')} description={t('imBot.logsDescription')}>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-bg-000 p-3 font-mono text-[length:var(--fs-xs)] leading-relaxed text-text-300">{state.logs.length ? state.logs.join('\n') : t('imBot.noLogs')}</pre>
      </SettingsCard>

      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border-200/60 bg-bg-000/90 py-3 backdrop-blur">
        {message ? <span className="mr-auto text-[length:var(--fs-xs)] text-text-300">{message}</span> : null}
        <Button variant="secondary" disabled={busy} onClick={() => void save(false)}>{t('common:save')}</Button>
        <Button disabled={busy} onClick={() => void save(true)}>{t('imBot.saveRestart')}</Button>
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block min-w-0 text-[length:var(--fs-xs)] text-text-300 ${className}`}><span className="mb-1 block font-medium">{label}</span>{children}</label>
}

function Secret({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input type="password" autoComplete="new-password" className={inputClass} value={value} onChange={event => onChange(event.target.value)} />
}

function ChannelCard({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <details open={enabled} className="rounded-lg border border-border-200/50 bg-bg-000/40">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[length:var(--fs-sm)] font-medium text-text-100">
        {title}
        <Toggle enabled={enabled} onChange={onToggle} ariaLabel={title} />
      </summary>
      <div className="grid grid-cols-1 gap-3 border-t border-border-200/40 p-3 md:grid-cols-2">{children}</div>
    </details>
  )
}

function splitList(value: string) {
  return value.split(/[\s,]+/).map(item => item.trim()).filter(Boolean)
}
