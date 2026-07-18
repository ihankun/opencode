import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { captureMemory, listMemorySources, updateMemorySource } from '../../../api/memory'
import type { MemorySource } from '../../../api/memory'
import { useDirectory } from '../../../contexts/useDirectory'
import { Button } from '../../../components/ui/Button'
import { SettingsCard } from './SettingsUI'
import { serverStore } from '../../../store/serverStore'

const TEMPLATE = `# Workspace memory

## Project conventions

- Add durable conventions here.

## User preferences

- Add preferences that should carry into future tasks.
`

export function MemorySettings() {
  const { t } = useTranslation(['settings', 'common'])
  const { currentDirectory } = useDirectory()
  const [sources, setSources] = useState<MemorySource[]>([])
  const [selected, setSelected] = useState<MemorySource['id']>('workspace')
  const [draft, setDraft] = useState('')
  const [capture, setCapture] = useState('')
  const [busy, setBusy] = useState(false)
  const supported = serverStore.supports('memory')

  const load = async () => {
    if (!supported) return
    const next = await listMemorySources(currentDirectory)
    setSources(next)
    const active = next.find(source => source.id === selected) ?? next[0]
    if (active) {
      setSelected(active.id)
      setDraft(active.content)
    }
  }

  useEffect(() => { void load() }, [currentDirectory, supported])

  const select = (source: MemorySource) => {
    setSelected(source.id)
    setDraft(source.content)
  }

  const save = async () => {
    setBusy(true)
    await updateMemorySource(selected, draft, currentDirectory)
    await load()
    setBusy(false)
  }

  const saveCapture = async () => {
    if (!capture.trim()) return
    setBusy(true)
    await captureMemory(capture, currentDirectory)
    setCapture('')
    setSelected('workspace')
    await load()
    setBusy(false)
  }

  if (!supported) return <div className="rounded-lg border border-border-200 p-4 text-[length:var(--fs-sm)] text-text-400">{t('memory.unsupported')}</div>
  return <div className="space-y-4">
    <SettingsCard title={t('memory.sources')} description={t('memory.sourcesDesc')}>
      <div className="mb-3 flex gap-1 rounded-lg bg-bg-200/40 p-1">{sources.map(source => <button key={source.id} onClick={() => select(source)} className={`flex-1 rounded-md px-2 py-1.5 text-[length:var(--fs-xs)] ${selected === source.id ? 'bg-bg-100 text-text-100 shadow-sm' : 'text-text-400'}`}>{source.name}<span className="ml-1 text-text-500">P{source.priority}</span></button>)}</div>
      <div className="mb-2 truncate font-mono text-[length:var(--fs-xxs)] text-text-500">{sources.find(source => source.id === selected)?.path}</div>
      <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={16} className="w-full resize-y rounded-lg border border-border-200 bg-bg-000 p-3 font-mono text-[length:var(--fs-xs)] leading-5 text-text-100 outline-none focus:border-accent-main-100" />
      <div className="mt-3 flex justify-between"><Button variant="ghost" size="sm" onClick={() => setDraft(TEMPLATE)}>{t('memory.useTemplate')}</Button><Button size="sm" isLoading={busy} onClick={() => void save()}>{t('common:save')}</Button></div>
    </SettingsCard>
    <SettingsCard title={t('memory.capture')} description={t('memory.captureDesc')}>
      <textarea value={capture} onChange={event => setCapture(event.target.value)} rows={5} placeholder={t('memory.capturePlaceholder')} className="w-full resize-y rounded-lg border border-border-200 bg-bg-000 p-3 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100" />
      <div className="mt-3 flex justify-end"><Button size="sm" disabled={!capture.trim()} isLoading={busy} onClick={() => void saveCapture()}>{t('memory.saveToWorkspace')}</Button></div>
    </SettingsCard>
  </div>
}
