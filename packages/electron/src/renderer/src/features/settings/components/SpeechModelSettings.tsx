import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SpeechModelConfig } from '../../../../../shared/speechModel'
import { Button } from '../../../components/ui/Button'
import { SettingsCard, SettingsSection } from './SettingsUI'

const inputClass = 'h-9 w-full rounded-lg border border-border-200 bg-bg-000 px-3 text-[length:var(--fs-sm)] text-text-100 outline-none placeholder:text-text-400 transition-colors hover:border-border-300 focus:border-accent-main-100/60 focus:ring-1 focus:ring-accent-main-100/20'

export function SpeechModelSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const [config, setConfig] = useState<SpeechModelConfig>()
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string }>()
  const available = typeof window.customOpenCode?.speechModelConfig === 'function'

  useEffect(() => {
    if (!available) return
    void window.customOpenCode.speechModelConfig()
      .then(setConfig)
      .catch(error => setMessage({ type: 'error', text: error instanceof Error ? error.message : String(error) }))
  }, [available])

  if (!available) return <SettingsCard title={t('speechModel.title')} description={t('speechModel.desktopOnly')}><div /></SettingsCard>
  if (!config) return <div className="text-[length:var(--fs-sm)] text-text-400">{t('common:loading')}</div>

  const save = async () => {
    setBusy(true)
    setMessage(undefined)
    try {
      const next = await window.customOpenCode.updateSpeechModelConfig({
        baseUrl: config.baseUrl,
        model: config.model,
        language: config.language,
        apiKey: apiKey.trim() || undefined,
      })
      setConfig(next)
      setApiKey('')
      setMessage({ type: 'success', text: t('speechModel.saved') })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  const clearApiKey = async () => {
    setBusy(true)
    setMessage(undefined)
    try {
      const next = await window.customOpenCode.updateSpeechModelConfig({
        baseUrl: config.baseUrl,
        model: config.model,
        language: config.language,
        clearApiKey: true,
      })
      setConfig(next)
      setApiKey('')
      setMessage({ type: 'success', text: t('speechModel.apiKeyCleared') })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsSection title={t('speechModel.title')}>
      <p className="text-[length:var(--fs-sm)] leading-relaxed text-text-400">{t('speechModel.description')}</p>
      <SettingsCard title={t('speechModel.openAiCompatible')} description={t('speechModel.openAiCompatibleDesc')}>
        <div className="space-y-4">
          <label className="block space-y-1.5" data-setting-label={t('speechModel.baseUrl')}>
            <span className="text-[length:var(--fs-sm)] font-medium text-text-200">{t('speechModel.baseUrl')}</span>
            <input
              type="url"
              value={config.baseUrl}
              onChange={event => setConfig({ ...config, baseUrl: event.target.value })}
              placeholder="https://api.openai.com/v1"
              spellCheck={false}
              className={inputClass}
            />
            <span className="block text-[length:var(--fs-xs)] text-text-500">{t('speechModel.baseUrlHint')}</span>
          </label>

          <label className="block space-y-1.5" data-setting-label={t('speechModel.model')}>
            <span className="text-[length:var(--fs-sm)] font-medium text-text-200">{t('speechModel.model')}</span>
            <input
              value={config.model}
              onChange={event => setConfig({ ...config, model: event.target.value })}
              placeholder="whisper-1"
              spellCheck={false}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5" data-setting-label={t('speechModel.language')}>
            <span className="text-[length:var(--fs-sm)] font-medium text-text-200">{t('speechModel.language')}</span>
            <input
              value={config.language}
              onChange={event => setConfig({ ...config, language: event.target.value })}
              placeholder={t('speechModel.languagePlaceholder')}
              spellCheck={false}
              className={inputClass}
            />
            <span className="block text-[length:var(--fs-xs)] text-text-500">{t('speechModel.languageHint')}</span>
          </label>

          <label className="block space-y-1.5" data-setting-label={t('speechModel.apiKey')}>
            <span className="flex items-center justify-between gap-3 text-[length:var(--fs-sm)] font-medium text-text-200">
              <span>{t('speechModel.apiKey')}</span>
              <span className={config.hasApiKey ? 'text-success-100' : 'text-text-500'}>
                {t(config.hasApiKey ? 'speechModel.configured' : 'speechModel.notConfigured')}
              </span>
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={event => setApiKey(event.target.value)}
              placeholder={config.hasApiKey ? t('speechModel.apiKeyPreserved') : t('speechModel.apiKeyPlaceholder')}
              autoComplete="off"
              className={inputClass}
            />
            <span className="block text-[length:var(--fs-xs)] text-text-500">{t('speechModel.apiKeyHint')}</span>
          </label>

          {message && (
            <div className={`rounded-lg border px-3 py-2 text-[length:var(--fs-xs)] ${
              message.type === 'success'
                ? 'border-success-100/25 bg-success-100/5 text-success-100'
                : 'border-danger-100/25 bg-danger-100/5 text-danger-100'
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {config.hasApiKey && (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void clearApiKey()}>
                {t('speechModel.clearApiKey')}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              isLoading={busy}
              disabled={!config.baseUrl.trim() || !config.model.trim()}
              onClick={() => void save()}
            >
              {t('common:save')}
            </Button>
          </div>
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}
