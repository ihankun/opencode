import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getHooks, runHooks, updateHooks } from '../../../api/hooks'
import type { HookDefinition, HookEvent, HookState } from '../../../api/hooks'
import { useDirectory } from '../../../contexts/useDirectory'
import { serverStore } from '../../../store/serverStore'
import { Button } from '../../../components/ui/Button'
import { SettingsCard } from './SettingsUI'
import { saveData } from '../../../utils/downloadUtils'

const EVENTS: HookEvent[] = ['automation.before', 'automation.after', 'git.before', 'git.after', 'notification']
const TEMPLATES = [
  { name: 'Typecheck before automation', event: 'automation.before' as const, command: 'bun typecheck' },
  { name: 'Notify after automation', event: 'automation.after' as const, command: 'echo "Automation finished"' },
  { name: 'Format before Git operation', event: 'git.before' as const, command: 'bun run format' },
  { name: 'Audit Git completion', event: 'git.after' as const, command: 'git status --short' },
]

export function HooksSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const { currentDirectory } = useDirectory()
  const [state, setState] = useState<HookState>({ hooks: [], runs: [] })
  const [savedHooks, setSavedHooks] = useState<HookDefinition[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [runFilter, setRunFilter] = useState<'all' | 'failed'>('all')
  const importRef = useRef<HTMLInputElement>(null)
  const supported = serverStore.supports('hooks')
  const load = async () => {
    if (!supported) return
    const next = await getHooks(currentDirectory)
    setState(next)
    setSavedHooks(next.hooks)
  }
  useEffect(() => { void load().catch(cause => setError(cause instanceof Error ? cause.message : t('hooks.loadFailed'))) }, [currentDirectory, supported])

  const save = async (hooks: HookDefinition[]) => {
    setBusy(true)
    setError('')
    try {
      const next = await updateHooks(hooks, currentDirectory)
      setState(next)
      setSavedHooks(next.hooks)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('hooks.saveFailed'))
    } finally {
      setBusy(false)
    }
  }
  const add = (template = TEMPLATES[0]) => void save([...state.hooks, { id: crypto.randomUUID(), name: template.name, event: template.event, command: template.command, enabled: false, approved: false, sandbox: true, timeoutSeconds: 30 }])
  const patch = (id: string, value: Partial<HookDefinition>) => setState(current => ({ ...current, hooks: current.hooks.map(hook => hook.id === id ? { ...hook, ...value } : hook) }))

  if (!supported) return <div className="rounded-lg border border-border-200 p-4 text-[length:var(--fs-sm)] text-text-400">{t('hooks.unsupported')}</div>
  return <div className="space-y-4">
    <SettingsCard title={t('hooks.title')} description={t('hooks.description')} actions={<div className="flex flex-wrap gap-1"><input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (!file) return; void file.text().then(text => { const value = JSON.parse(text) as { hooks?: HookDefinition[] }; if (!Array.isArray(value.hooks)) throw new Error('Invalid hooks backup'); return save(value.hooks.map(hook => ({ ...hook, id: hook.id || crypto.randomUUID(), approved: false }))) }).catch(cause => setError(cause instanceof Error ? cause.message : String(cause))) }} /><Button size="sm" variant="ghost" onClick={() => saveData(new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), hooks: state.hooks.map(hook => ({ ...hook, approved: false })) }, null, 2)), 'opencodex-hooks.json', 'application/json')}>{t('hooks.export')}</Button><Button size="sm" variant="ghost" onClick={() => importRef.current?.click()}>{t('hooks.import')}</Button><Button size="sm" variant="ghost" onClick={() => add(TEMPLATES[state.hooks.length % TEMPLATES.length])}>{t('hooks.template')}</Button><Button size="sm" onClick={() => add()}>{t('hooks.add')}</Button></div>}>
      <div className="space-y-3">{state.hooks.map(hook => <div key={hook.id} className="rounded-lg border border-border-200/50 p-3">
        <div className="grid grid-cols-[1fr_160px_auto] gap-2"><input value={hook.name} onChange={event => patch(hook.id, { name: event.target.value })} className="h-8 rounded-md border border-border-200 bg-bg-000 px-2 text-[length:var(--fs-sm)] text-text-100" /><select value={hook.event} onChange={event => patch(hook.id, { event: event.target.value as HookEvent })} className="h-8 rounded-md border border-border-200 bg-bg-000 px-2 text-[length:var(--fs-xs)] text-text-100">{EVENTS.map(event => <option key={event}>{event}</option>)}</select><button onClick={() => void save(state.hooks.filter(item => item.id !== hook.id))} className="px-2 text-danger-100">×</button></div>
        <input value={hook.command} onChange={event => patch(hook.id, { command: event.target.value, approved: event.target.value === hook.command ? hook.approved : false })} className="mt-2 h-8 w-full rounded-md border border-border-200 bg-bg-000 px-2 font-mono text-[length:var(--fs-xs)] text-text-100" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[length:var(--fs-xs)] text-text-400"><label className="flex items-center gap-1"><input type="checkbox" checked={hook.enabled} onChange={event => patch(hook.id, { enabled: event.target.checked })} />{t('hooks.enabled')}</label><label className="flex items-center gap-1"><input type="checkbox" checked={hook.approved} onChange={event => patch(hook.id, { approved: event.target.checked })} />{t('hooks.approved')}</label><label className="flex items-center gap-1"><input type="checkbox" checked={hook.sandbox} onChange={event => patch(hook.id, { sandbox: event.target.checked })} />{t('hooks.requireSandbox')}</label><label>{t('hooks.timeout')} <input type="number" min={1} max={120} value={hook.timeoutSeconds} onChange={event => patch(hook.id, { timeoutSeconds: Number(event.target.value) })} className="ml-1 h-7 w-16 rounded border border-border-200 bg-bg-000 px-1" /></label><Button size="sm" variant="ghost" onClick={() => setState(current => ({ ...current, hooks: [...current.hooks, { ...hook, id: crypto.randomUUID(), name: `${hook.name} copy`, approved: false, enabled: false }] }))}>{t('hooks.duplicate')}</Button><Button size="sm" variant="ghost" onClick={() => void runHooks(hook.event, currentDirectory).then(() => load())}>{t('hooks.testEvent')}</Button></div>
        {!hook.approved ? <p className="mt-2 text-[length:var(--fs-xxs)] text-warning-100">{t('hooks.approvalWarning')}</p> : !hook.sandbox ? <p className="mt-2 text-[length:var(--fs-xxs)] text-warning-100">{t('hooks.unsandboxedWarning')}</p> : null}
      </div>)}</div>
      {error ? <div className="mt-3 rounded-md bg-danger-100/10 p-2 text-[length:var(--fs-xs)] text-danger-100">{error}</div> : null}
      <div className="mt-3 flex justify-end"><Button size="sm" disabled={JSON.stringify(state.hooks) === JSON.stringify(savedHooks)} isLoading={busy} onClick={() => void save(state.hooks)}>{t('common:save')}</Button></div>
    </SettingsCard>
    <SettingsCard title={t('hooks.logs')} description={t('hooks.logsDesc')} actions={<div className="flex rounded-md bg-bg-100 p-0.5"><button onClick={() => setRunFilter('all')} className={`rounded px-2 py-1 text-[length:var(--fs-xs)] ${runFilter === 'all' ? 'bg-bg-000 text-text-100' : 'text-text-400'}`}>{t('hooks.allRuns')}</button><button onClick={() => setRunFilter('failed')} className={`rounded px-2 py-1 text-[length:var(--fs-xs)] ${runFilter === 'failed' ? 'bg-bg-000 text-text-100' : 'text-text-400'}`}>{t('hooks.failedRuns')}</button></div>}>
      <div className="max-h-72 space-y-2 overflow-auto">{state.runs.length === 0 ? <div className="py-8 text-center text-[length:var(--fs-xs)] text-text-500">{t('hooks.noLogs')}</div> : state.runs.filter(run => runFilter === 'all' || run.status !== 'completed').map(run => <details key={run.id} className="rounded border border-border-200/40 px-3 py-2"><summary className="cursor-pointer text-[length:var(--fs-xs)] text-text-300">{run.hookName} · {run.event} · <span className={run.status === 'completed' ? 'text-success-100' : run.status === 'blocked' ? 'text-warning-100' : 'text-danger-100'}>{run.status}</span> · {run.sandboxed ? t('hooks.sandboxed') : t('hooks.notSandboxed')} · {new Date(run.startedAt).toLocaleString()}</summary>{run.output ? <pre className="mt-2 whitespace-pre-wrap font-mono text-[length:var(--fs-xxs)] text-text-400">{run.output}</pre> : null}<div className="mt-2 flex justify-end"><Button size="sm" variant="ghost" onClick={() => void runHooks(run.event, currentDirectory).then(() => load())}>{t('hooks.runAgain')}</Button></div></details>)}</div>
    </SettingsCard>
  </div>
}
