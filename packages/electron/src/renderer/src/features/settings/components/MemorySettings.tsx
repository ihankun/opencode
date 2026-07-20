import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { captureMemory, listMemorySources, updateMemorySource } from '../../../api/memory'
import type { MemorySource } from '../../../api/memory'
import { useDirectory } from '../../../contexts/useDirectory'
import { Button } from '../../../components/ui/Button'
import { SettingsCard } from './SettingsUI'
import { serverStore } from '../../../store/serverStore'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useMessageStore } from '../../../store'

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
  const [savedDraft, setSavedDraft] = useState('')
  const [capture, setCapture] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingSource, setPendingSource] = useState<MemorySource | null>(null)
  const { sessionId, messages } = useMessageStore()
  const [proposal, setProposal] = useState('')
  const [proposalStatus, setProposalStatus] = useState<'idle' | 'approved' | 'discarded'>('idle')
  const supported = serverStore.supports('memory')

  const load = async () => {
    if (!supported) return
    const next = await listMemorySources(currentDirectory)
    setSources(next)
    const active = next.find(source => source.id === selected) ?? next[0]
    if (active) {
      setSelected(active.id)
      setDraft(active.content)
      setSavedDraft(active.content)
    }
  }

  useEffect(() => {
    void load().catch(cause => setError(cause instanceof Error ? cause.message : t('memory.loadFailed')))
  }, [currentDirectory, supported])
  useEffect(() => {
    if (!sessionId || proposalStatus !== 'idle' || proposal) return
    const candidates = messages.flatMap(message => message.parts.flatMap(part => part.type === 'text' && 'text' in part && typeof part.text === 'string' ? [part.text.trim()] : [])).filter(text => /\b(always|never|prefer|convention|must)\b|总是|不要|偏好|约定|规范|必须/i.test(text)).slice(-8)
    if (candidates.length === 0) return
    setProposal(['## Proposed memory', '', ...candidates.map(text => `- ${text.replace(/\s+/g, ' ').slice(0, 500)}`)].join('\n'))
  }, [messages, proposal, proposalStatus, sessionId])

  const select = (source: MemorySource) => {
    if (draft !== savedDraft) {
      setPendingSource(source)
      return
    }
    setSelected(source.id)
    setDraft(source.content)
    setSavedDraft(source.content)
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await updateMemorySource(selected, draft, currentDirectory)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('memory.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const saveCapture = async () => {
    if (!capture.trim()) return
    setBusy(true)
    setError('')
    try {
      await captureMemory(capture, currentDirectory)
      setCapture('')
      setSelected('workspace')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('memory.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (!supported) return <div className="rounded-lg border border-border-200 p-4 text-[length:var(--fs-sm)] text-text-400">{t('memory.unsupported')}</div>
  return <div className="space-y-4">
    <SettingsCard title={t('memory.sources')} description={t('memory.sourcesDesc')}>
      <div className="mb-3 flex gap-1 rounded-lg bg-bg-200/40 p-1">{sources.map(source => <button key={source.id} onClick={() => select(source)} className={`flex-1 rounded-md px-2 py-1.5 text-[length:var(--fs-xs)] ${selected === source.id ? 'bg-bg-100 text-text-100 shadow-sm' : 'text-text-400'}`}>{source.name}<span className="ml-1 text-text-500">P{source.priority}</span></button>)}</div>
      <div className="mb-2 truncate font-mono text-[length:var(--fs-xxs)] text-text-500">{sources.find(source => source.id === selected)?.path}</div>
      <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={16} className="w-full resize-y rounded-lg border border-border-200 bg-bg-000 p-3 font-mono text-[length:var(--fs-xs)] leading-5 text-text-100 outline-none focus:border-accent-main-100" />
      <div className="mt-2 text-right text-[length:var(--fs-xxs)] text-text-500">{new TextEncoder().encode(draft).byteLength.toLocaleString()} bytes</div>
      <div className="mt-3 flex justify-between"><Button variant="ghost" size="sm" onClick={() => setDraft(TEMPLATE)}>{t('memory.useTemplate')}</Button><Button size="sm" disabled={draft === savedDraft} isLoading={busy} onClick={() => void save()}>{t('common:save')}</Button></div>
    </SettingsCard>
    <SettingsCard title={t('memory.capture')} description={t('memory.captureDesc')}>
      <textarea value={capture} onChange={event => setCapture(event.target.value)} rows={5} placeholder={t('memory.capturePlaceholder')} className="w-full resize-y rounded-lg border border-border-200 bg-bg-000 p-3 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100" />
      <div className="mt-3 flex justify-end"><Button size="sm" disabled={!capture.trim()} isLoading={busy} onClick={() => void saveCapture()}>{t('memory.saveToWorkspace')}</Button></div>
    </SettingsCard>
    <SettingsCard title={t('memory.proposals')} description={t('memory.proposalsDesc')}>
      {proposal ? <div className="space-y-3"><div className="flex items-center justify-between"><span className="rounded-full bg-warning-100/10 px-2 py-1 text-[length:var(--fs-xxs)] text-warning-100">{t('memory.needsReview')}</span><span className="font-mono text-[length:var(--fs-xxs)] text-text-500">{sessionId}</span></div><textarea value={proposal} onChange={event => setProposal(event.target.value)} rows={7} className="w-full resize-y rounded-lg border border-border-200 bg-bg-000 p-3 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100" /><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => { setProposal(''); setProposalStatus('discarded') }}>{t('memory.discardProposal')}</Button><Button size="sm" isLoading={busy} onClick={() => { setBusy(true); void captureMemory(proposal, currentDirectory).then(async () => { setProposal(''); setProposalStatus('approved'); await load() }, cause => setError(cause instanceof Error ? cause.message : String(cause))).finally(() => setBusy(false)) }}>{t('memory.approveProposal')}</Button></div></div> : <div className="rounded-lg border border-dashed border-border-200 px-3 py-6 text-center text-[length:var(--fs-xs)] text-text-500">{proposalStatus === 'approved' ? t('memory.proposalApproved') : proposalStatus === 'discarded' ? t('memory.proposalDiscarded') : t('memory.noProposal')}</div>}
    </SettingsCard>
    {error ? <div className="rounded-lg bg-danger-100/10 p-3 text-[length:var(--fs-sm)] text-danger-100">{error}</div> : null}
    <ConfirmDialog isOpen={pendingSource !== null} onClose={() => setPendingSource(null)} onConfirm={() => {
      if (!pendingSource) return
      setSelected(pendingSource.id)
      setDraft(pendingSource.content)
      setSavedDraft(pendingSource.content)
      setPendingSource(null)
    }} title={t('memory.discardTitle')} description={t('memory.discardDescription')} confirmText={t('memory.discard')} variant="warning" />
  </div>
}
