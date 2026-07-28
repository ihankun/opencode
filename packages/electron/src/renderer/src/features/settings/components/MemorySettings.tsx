import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getMemorySource, updateMemorySource } from '../../../api/memory'
import { Button } from '../../../components/ui/Button'
import { serverStore } from '../../../store/serverStore'
import { SettingsCard } from './SettingsUI'

const TEMPLATE = `# Global memory

## Response preferences

- Add preferences that should apply to every conversation.

## General working style

- Add durable conventions that are not specific to one project.
`

export function MemorySettings() {
  const { t } = useTranslation(['settings', 'common'])
  const [draft, setDraft] = useState('')
  const [savedDraft, setSavedDraft] = useState('')
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const supported = serverStore.supports('memory')

  const load = async () => {
    if (!supported) return
    const source = await getMemorySource('global')
    setPath(source.path)
    setDraft(source.content)
    setSavedDraft(source.content)
  }

  useEffect(() => {
    void load().catch(cause => setError(cause instanceof Error ? cause.message : t('memory.loadFailed')))
  }, [supported])

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await updateMemorySource('global', draft)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('memory.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (!supported) {
    return <div className="rounded-lg border border-border-200 p-4 text-[length:var(--fs-sm)] text-text-400">{t('memory.unsupported')}</div>
  }

  return (
    <div className="space-y-4">
      <SettingsCard title={t('memory.globalTitle')} description={t('memory.globalDescription')}>
        <div className="mb-2 truncate font-mono text-[length:var(--fs-xxs)] text-text-500" title={path}>
          {path}
        </div>
        <textarea
          value={draft}
          onChange={event => setDraft(event.target.value)}
          rows={16}
          className="w-full resize-y rounded-lg border border-border-200 bg-bg-000 p-3 font-mono text-[length:var(--fs-xs)] leading-5 text-text-100 outline-none focus:border-accent-main-100"
        />
        <div className="mt-2 text-right text-[length:var(--fs-xxs)] text-text-500">
          {new TextEncoder().encode(draft).byteLength.toLocaleString()} bytes
        </div>
        <div className="mt-3 flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => setDraft(TEMPLATE)}>
            {t('memory.useTemplate')}
          </Button>
          <Button size="sm" disabled={draft === savedDraft} isLoading={busy} onClick={() => void save()}>
            {t('common:save')}
          </Button>
        </div>
      </SettingsCard>
      {error ? <div className="rounded-lg bg-danger-100/10 p-3 text-[length:var(--fs-sm)] text-danger-100">{error}</div> : null}
    </div>
  )
}
