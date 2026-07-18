import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckIcon, ClockIcon, DownloadIcon, MessageSquareIcon, PencilIcon, PlusIcon, RetryIcon, SearchIcon, SpinnerIcon, TrashIcon, UploadIcon } from './Icons'
import { useDirectory, useModels, useServerStore } from '../hooks'
import type { ModelInfo } from '../api'
import { executionTargetStore } from '../store/executionTargetStore'
import { serverStore, type ServerConfig } from '../store/serverStore'
import { saveData } from '../utils/downloadUtils'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Dialog } from './ui/Dialog'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

type Task = Awaited<ReturnType<typeof window.customOpenCode.listTasks>>[number]
type TaskInput = Parameters<typeof window.customOpenCode.createTask>[0]
type TaskRun = Awaited<ReturnType<typeof window.customOpenCode.listTaskRuns>>[number]
type TaskSettings = Awaited<ReturnType<typeof window.customOpenCode.taskSettings>>
type Frequency = 'daily' | 'weekdays' | 'weekly' | 'advanced'

const weekdays = [
  ['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['0', 'Sun'],
] as const

export const TaskPanel = memo(function TaskPanel({ onOpenSession }: { onOpenSession: (sessionID: string, directory: string) => void }) {
  const { t } = useTranslation(['components', 'common'])
  const { currentDirectory, savedDirectories, pathInfo } = useDirectory()
  const { models, isLoading: modelsLoading } = useModels()
  const { servers, activeServer } = useServerStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [runs, setRuns] = useState<TaskRun[]>([])
  const [view, setView] = useState<'tasks' | 'runs'>('tasks')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'enabled' | 'paused'>('all')
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [busy, setBusy] = useState('')
  const [settings, setSettings] = useState<TaskSettings>({ maxConcurrency: 3, historyRetentionDays: 90, maxHistory: 1000 })
  const [deleteTask, setDeleteTask] = useState<Task | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextTasks, nextRuns, nextSettings] = await Promise.all([window.customOpenCode.listTasks(), window.customOpenCode.listTaskRuns(), window.customOpenCode.taskSettings()])
      setTasks(nextTasks)
      setRuns(nextRuns)
      setSettings(nextSettings)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('taskPanel.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
    return window.customOpenCode.onTasksChanged(() => void load())
  }, [load, t])
  const visible = useMemo(() => tasks.filter(task => filter === 'all' || (filter === 'enabled' ? task.enabled : !task.enabled)), [filter, tasks])
  const directories = useMemo(() => Array.from(new Map([
    ...(currentDirectory ? [{ path: currentDirectory, name: savedDirectories.find(item => item.path === currentDirectory)?.name ?? currentDirectory }] : []),
    ...(pathInfo?.directory ? [{ path: pathInfo.directory, name: savedDirectories.find(item => item.path === pathInfo.directory)?.name ?? pathInfo.directory }] : []),
    ...savedDirectories,
  ].map(item => [item.path, item])).values()), [currentDirectory, pathInfo?.directory, savedDirectories])

  const update = useCallback(async (task: Task, input: TaskInput) => {
    setBusy(task.id)
    try {
      await window.customOpenCode.updateTask(task.id, input)
      await load()
    } finally {
      setBusy('')
    }
  }, [load, t])

  const exportTasks = useCallback(() => {
    saveData(new TextEncoder().encode(JSON.stringify({
      format: 'opencodex.automation',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      tasks: tasks.map(taskInputFromTask),
    }, null, 2)), `opencodex-automation-${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8')
  }, [settings, tasks])

  const importTasks = useCallback(async (file: File) => {
    setBusy('import')
    try {
      const value: unknown = JSON.parse(await file.text())
      if (!isTaskExport(value)) throw new Error(t('taskPanel.invalidImport'))
      await Promise.all(value.tasks.map(task => window.customOpenCode.createTask(task)))
      if (value.settings) await window.customOpenCode.updateTaskSettings(value.settings)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? t('taskPanel.importFailedWithError', { error: cause.message }) : t('taskPanel.importFailed'))
    } finally {
      setBusy('')
      if (importInput.current) importInput.current.value = ''
    }
  }, [load])

  return (
    <div className="flex h-full flex-col bg-bg-100">
      <div className="window-drag-region flex h-14 shrink-0 items-center justify-between border-b border-border-200/50 px-6">
        <div>
          <h1 className="text-[length:var(--fs-lg)] font-semibold text-text-100">{t('taskPanel.title')}</h1>
          <p className="text-[length:var(--fs-xs)] text-text-400">{t('taskPanel.subtitle')}</p>
        </div>
        <div className="flex gap-1.5">
          <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void importTasks(file) }} />
          {view === 'tasks' && <button disabled={busy === 'import'} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[length:var(--fs-sm)] text-text-300 hover:bg-bg-200 disabled:opacity-50" onClick={() => importInput.current?.click()} title={t('taskPanel.import')}><UploadIcon size={13} />{t('taskPanel.import')}</button>}
          {view === 'tasks' && <button disabled={!tasks.length} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[length:var(--fs-sm)] text-text-300 hover:bg-bg-200 disabled:opacity-50" onClick={exportTasks} title={t('taskPanel.export')}><DownloadIcon size={13} />{t('taskPanel.export')}</button>}
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200" onClick={() => void load()} title={t('common:refresh')} aria-label={t('common:refresh')}><RetryIcon size={14} className={loading ? 'animate-spin' : ''} /></button>
          {view === 'tasks' && <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-main-100 px-3 text-[length:var(--fs-sm)] text-oncolor-100 transition-colors hover:bg-accent-main-200" onClick={() => setEditing('new')}><PlusIcon size={13} />{t('taskPanel.newTask')}</button>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1 border-b border-border-200/40 px-6 py-2">
        {([['tasks', t('taskPanel.taskList'), tasks.length], ['runs', t('taskPanel.runHistory'), runs.length]] as const).map(item => <button key={item[0]} onClick={() => setView(item[0])} className={`rounded-md px-3 py-1.5 text-[length:var(--fs-sm)] transition-colors ${view === item[0] ? 'bg-bg-200 text-text-100' : 'text-text-400 hover:text-text-200'}`}>{item[1]}<span className="ml-1.5 text-[length:var(--fs-xs)] text-text-500">{item[2]}</span></button>)}
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        {view === 'runs' ? <TaskRunList runs={runs} loading={loading} onOpenSession={onOpenSession} onChanged={load} /> : <>
        <details className="mb-4 rounded-lg border border-border-200/50 bg-bg-200/20 px-3 py-2 text-[length:var(--fs-xs)] text-text-300"><summary className="cursor-pointer select-none">{t('taskPanel.schedulerSettings')}</summary><div className="mt-3 grid grid-cols-3 gap-3"><label>{t('taskPanel.globalConcurrency')}<input type="number" min={1} max={20} value={settings.maxConcurrency} onChange={event => setSettings(current => ({ ...current, maxConcurrency: Number(event.target.value) }))} onBlur={() => void window.customOpenCode.updateTaskSettings(settings).then(setSettings).catch(cause => setError(cause instanceof Error ? cause.message : t('taskPanel.saveFailed')))} className="mt-1 h-8 w-full rounded border border-border-200 bg-bg-100 px-2" /></label><label>{t('taskPanel.retentionDays')}<input type="number" min={1} max={365} value={settings.historyRetentionDays} onChange={event => setSettings(current => ({ ...current, historyRetentionDays: Number(event.target.value) }))} onBlur={() => void window.customOpenCode.updateTaskSettings(settings).then(setSettings).catch(cause => setError(cause instanceof Error ? cause.message : t('taskPanel.saveFailed')))} className="mt-1 h-8 w-full rounded border border-border-200 bg-bg-100 px-2" /></label><label>{t('taskPanel.maxHistory')}<input type="number" min={100} max={10000} value={settings.maxHistory} onChange={event => setSettings(current => ({ ...current, maxHistory: Number(event.target.value) }))} onBlur={() => void window.customOpenCode.updateTaskSettings(settings).then(setSettings).catch(cause => setError(cause instanceof Error ? cause.message : t('taskPanel.saveFailed')))} className="mt-1 h-8 w-full rounded border border-border-200 bg-bg-100 px-2" /></label></div></details>
        <div className="mb-5 flex gap-1 rounded-lg bg-bg-200/50 p-1 w-fit">
          {([['all', t('taskPanel.all')], ['enabled', t('taskPanel.enabled')], ['paused', t('taskPanel.paused')]] as const).map(item => (
            <button key={item[0]} onClick={() => setFilter(item[0])} className={`rounded-md px-3 py-1 text-[length:var(--fs-sm)] ${filter === item[0] ? 'bg-bg-100 text-text-100 shadow-sm' : 'text-text-400'}`}>{item[1]}</button>
          ))}
        </div>
        {error && <div className="mb-3 rounded-lg bg-danger-100/10 p-3 text-danger-100 text-[length:var(--fs-sm)]">{error}</div>}
        {loading && !tasks.length ? <div className="flex justify-center py-20 text-text-400"><SpinnerIcon size={20} className="animate-spin" /></div> : null}
        {!loading && !visible.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-200 py-20 text-text-400">
            <ClockIcon size={28} /><div className="mt-3 text-text-200">{t('taskPanel.empty')}</div><div className="mt-1 text-[length:var(--fs-sm)]">{t('taskPanel.emptyHint')}</div>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(task => (
              <div key={task.id} className="group rounded-xl border border-border-200/60 bg-bg-100 p-4 transition-colors hover:bg-bg-200/20">
                <div className="flex items-start gap-3">
                  <button disabled={busy === task.id} onClick={() => void update(task, { ...task, enabled: !task.enabled })} className={`mt-0.5 inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${task.enabled ? 'bg-success-100' : 'bg-bg-300'}`} title={task.enabled ? t('taskPanel.pause') : t('taskPanel.enable')} aria-label={task.enabled ? t('taskPanel.pause') : t('taskPanel.enable')}><span className={`h-4 w-4 rounded-full bg-white transition-transform ${task.enabled ? 'translate-x-4' : ''}`} /></button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-medium text-text-100">{task.title}</span><Status task={task} /></div>
                    <div className="mt-1 truncate text-[length:var(--fs-sm)] text-text-300">{task.prompt}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--fs-xs)] text-text-400"><span>{describeCron(task.cron, t)}</span><span>{t('taskPanel.serverValue', { name: task.serverName })}</span><span>{t('taskPanel.projectValue', { name: task.directory || t('taskPanel.global') })}</span><span>{task.executionMode === 'worktree' ? t('taskPanel.isolatedWorktree') : t('taskPanel.currentDirectory')}{task.branch ? ` · ${task.branch}` : ''}</span><span>{t('taskPanel.modelValue', { model: `${task.modelProviderID}/${task.modelID}` })}</span><span>{t('taskPanel.permissionValue', { value: permissionLabel(task.permissionProfile, t) })}</span><span>{t('taskPanel.retryValue', { count: task.retryCount })}</span><span>{t('taskPanel.overlapValue', { value: task.overlapPolicy === 'queue' ? t('taskPanel.queued') : task.overlapPolicy === 'parallel' ? t('taskPanel.parallelValue', { count: task.maxConcurrentRuns }) : t('taskPanel.skip') })}</span><span>{t('taskPanel.missedValue', { value: task.missedRunPolicy === 'run-once' ? t('taskPanel.catchUpValue', { count: task.catchUpWindowMinutes }) : t('taskPanel.skip') })}</span><span>{task.timezone}</span>{task.nextRunAt && <span>{t('taskPanel.nextRun', { date: new Date(task.nextRunAt).toLocaleString() })}</span>}{task.lastRunAt && <span>{t('taskPanel.lastRun', { date: new Date(task.lastRunAt).toLocaleString() })}</span>}</div>
                    {task.lastError && <div className="mt-2 text-[length:var(--fs-xs)] text-danger-100">{task.lastError}</div>}
                  </div>
                  <div className="flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    {task.status === 'running' ? <button className="h-7 rounded-md px-2 text-[length:var(--fs-xs)] text-danger-100 hover:bg-danger-100/10" onClick={async () => { setBusy(task.id); await window.customOpenCode.cancelTask(task.id); await load(); setBusy('') }}>{t('taskPanel.stop')}</button> : <button className="h-7 rounded-md px-2 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-200" onClick={async () => { setBusy(task.id); await window.customOpenCode.runTask(task.id); await load(); setBusy('') }}>{t('taskPanel.runNow')}</button>}
                    <button className="h-7 w-7 rounded-md text-text-300 hover:bg-bg-200" onClick={() => setEditing(task)} title={t('taskPanel.editTask')} aria-label={t('taskPanel.editTask')}><PencilIcon size={12} /></button>
                    <button className="h-7 w-7 rounded-md text-text-300 hover:bg-danger-100/10 hover:text-danger-100" onClick={() => setDeleteTask(task)} title={t('common:delete')} aria-label={t('common:delete')}><TrashIcon size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}</>}
      </div>
      {editing && <TaskDialog task={editing === 'new' ? undefined : editing} directory={currentDirectory ?? pathInfo?.directory ?? ''} directories={directories} servers={servers} activeServer={activeServer} models={models} modelsLoading={modelsLoading} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load() }} />}
      <ConfirmDialog isOpen={deleteTask !== null} onClose={() => setDeleteTask(null)} onConfirm={() => {
        if (!deleteTask) return
        void window.customOpenCode.removeTask(deleteTask.id).then(async () => { setDeleteTask(null); await load() }).catch(cause => setError(cause instanceof Error ? cause.message : t('taskPanel.deleteFailed')))
      }} title={t('taskPanel.deleteTitle')} description={deleteTask ? t('taskPanel.deleteDescription', { title: deleteTask.title }) : ''} confirmText={t('common:delete')} variant="danger" />
    </div>
  )
})

function TaskRunList({ runs, loading, onOpenSession, onChanged }: { runs: TaskRun[]; loading: boolean; onOpenSession: (sessionID: string, directory: string) => void; onChanged: () => Promise<void> }) {
  const { t } = useTranslation(['components'])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'success' | 'error'>('all')
  const filtered = runs.filter(run => {
    const active = run.status === 'queued' || run.status === 'running' || run.status === 'submitted' || run.status === 'recovering'
    if (status === 'active' && !active) return false
    if (status === 'success' && run.status !== 'completed') return false
    if (status === 'error' && !['failed', 'timed_out', 'cancelled'].includes(run.status)) return false
    return `${run.taskTitle} ${run.prompt} ${run.directory} ${run.modelProviderID} ${run.modelID} ${run.log}`.toLowerCase().includes(search.trim().toLowerCase())
  })
  const groups = Array.from(filtered.reduce((result, run) => {
    const group = result.get(run.taskID) ?? { title: run.taskTitle, runs: [] as TaskRun[] }
    group.runs.push(run)
    result.set(run.taskID, group)
    return result
  }, new Map<string, { title: string; runs: TaskRun[] }>()).values())

  return <div>
    <div className="mb-5 flex gap-2"><div className="relative flex-1"><SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('taskPanel.searchRuns')} aria-label={t('taskPanel.searchRuns')} className="h-9 w-full rounded-lg border border-border-200/60 bg-bg-200/30 pl-9 pr-3 text-[length:var(--fs-sm)] text-text-100 outline-none transition-colors placeholder:text-text-500 focus:border-border-100 focus:bg-bg-100" /></div><select value={status} onChange={event => setStatus(event.target.value as typeof status)} aria-label={t('taskPanel.statusFilter')} className="h-9 rounded-lg border border-border-200/60 bg-bg-100 px-3 text-[length:var(--fs-sm)] text-text-200"><option value="all">{t('taskPanel.allStatuses')}</option><option value="active">{t('taskPanel.active')}</option><option value="success">{t('taskPanel.success')}</option><option value="error">{t('taskPanel.failedOrCancelled')}</option></select></div>
    {loading && runs.length === 0 ? <div className="flex justify-center py-20 text-text-400"><SpinnerIcon size={20} className="animate-spin" /></div> : null}
    {!loading && groups.length === 0 ? <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-200 py-20 text-text-400"><MessageSquareIcon size={28} /><div className="mt-3 text-text-200">{t('taskPanel.noRuns')}</div><div className="mt-1 text-[length:var(--fs-sm)]">{t('taskPanel.noRunsHint')}</div></div> : null}
    <div className="space-y-5">{groups.map(group => <section key={group.runs[0].taskID}>
      <div className="mb-2 flex items-center gap-2 px-1"><span className="text-[length:var(--fs-sm)] font-medium text-text-200">{group.title}</span><span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-200 px-1.5 text-[length:var(--fs-xxs)] text-text-400">{group.runs.length}</span></div>
      <div className="overflow-hidden rounded-xl border border-border-200/60 bg-bg-100">{group.runs.map((run, index) => {
        const active = run.status === 'queued' || run.status === 'running' || run.status === 'submitted' || run.status === 'recovering'
        const canOpen = !run.sessionID.startsWith('pending:') && serverStore.getServers().some(server => server.id === run.serverId)
        return <div key={run.id} className={index > 0 ? 'border-t border-border-200/45' : ''}>
          <div className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-200/35">
            <span className={`h-2 w-2 shrink-0 rounded-full ${run.status === 'failed' || run.status === 'timed_out' ? 'bg-danger-100' : active ? 'bg-warning-100' : run.status === 'cancelled' ? 'bg-text-500' : 'bg-success-100'}`} />
            <button type="button" disabled={!canOpen} onClick={() => { serverStore.setActiveServer(run.serverId); executionTargetStore.bindSession(run.sessionID, { serverId: run.serverId, directory: run.executionDirectory, sourceDirectory: run.directory, executionMode: run.executionMode, branch: run.branch || undefined, permissionProfile: run.permissionProfile }); onOpenSession(run.sessionID, run.executionDirectory) }} className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-60">
              <div className="flex items-center gap-2"><span className="truncate text-[length:var(--fs-sm)] font-medium text-text-100">{run.prompt}</span><span className={`shrink-0 rounded px-1.5 py-0.5 text-[length:var(--fs-xxs)] ${run.status === 'failed' || run.status === 'timed_out' ? 'bg-danger-100/10 text-danger-100' : active ? 'bg-warning-100/10 text-warning-100' : run.status === 'cancelled' ? 'bg-bg-200 text-text-400' : 'bg-success-100/10 text-success-100'}`}>{runStatusLabel(run.status, t)}</span></div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[length:var(--fs-xs)] text-text-400"><span>{new Date(run.createdAt).toLocaleString()}</span><span>{run.serverName}</span><span>{run.executionDirectory || run.directory || t('taskPanel.global')}</span><span>{run.executionMode === 'worktree' ? 'Worktree' : t('taskPanel.currentDirectory')}{run.branch ? ` · ${run.branch}` : ''}</span><span>{t('taskPanel.attempt', { count: run.attempt })}</span><span>{run.modelProviderID}/{run.modelID}</span></div>{run.error && <div className="mt-1 text-[length:var(--fs-xs)] text-danger-100">{run.error}</div>}
            </button>
            {active ? <button type="button" onClick={() => void window.customOpenCode.cancelTaskRun(run.id).then(onChanged)} className="rounded-md px-2 py-1 text-[length:var(--fs-xs)] text-danger-100 hover:bg-danger-100/10">{t('taskPanel.stop')}</button> : <><button type="button" onClick={() => void window.customOpenCode.runTask(run.taskID).then(onChanged)} className="rounded-md px-2 py-1 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-200">{t('taskPanel.runAgain')}</button><button type="button" onClick={() => { saveData(new TextEncoder().encode(run.log || run.error || ''), `automation-${run.id}.log`, 'text/plain;charset=utf-8') }} className="rounded-md px-2 py-1 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-200">{t('taskPanel.exportLog')}</button><button type="button" onClick={() => void window.customOpenCode.setTaskRunArchived(run.sessionID, true).then(onChanged)} className="rounded-md px-2 py-1 text-[length:var(--fs-xs)] text-text-400 hover:bg-bg-200">{t('taskPanel.archive')}</button></>}
          </div>
          {run.log ? <details className="border-t border-border-200/30 bg-bg-200/15 px-4 py-2"><summary className="cursor-pointer text-[length:var(--fs-xs)] text-text-400">{t('taskPanel.runLog')}</summary><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-[length:var(--fs-xxs)] leading-5 text-text-300">{run.log}</pre></details> : null}
        </div>
      })}</div>
    </section>)}</div>
  </div>
}

function Status({ task }: { task: Task }) {
  const { t } = useTranslation('components')
  const label = task.status === 'error' ? t('taskPanel.error') : task.enabled ? t('taskPanel.enabled') : t('taskPanel.paused')
  return <span className={`rounded-full px-2 py-0.5 text-[length:var(--fs-xxs)] ${task.status === 'error' ? 'bg-danger-100/10 text-danger-100' : task.enabled ? 'bg-success-100/10 text-success-100' : 'bg-bg-200 text-text-400'}`}>{label}</span>
}

function TaskDialog({ task, directory, directories, servers, activeServer, models, modelsLoading, onClose, onSaved }: { task?: Task; directory: string; directories: Array<{ path: string; name: string }>; servers: ServerConfig[]; activeServer: ServerConfig | null; models: ModelInfo[]; modelsLoading: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation(['components', 'common'])
  const inputClass = 'rounded-lg border border-border-200/70 bg-bg-100 px-3 text-[length:var(--fs-sm)] text-text-100 outline-none transition-colors placeholder:text-text-500 focus:border-border-100'
  const initial = task ? cronParts(task.cron) : { frequency: 'daily' as Frequency, time: '18:00', day: '1' }
  const [title, setTitle] = useState(task?.title ?? '')
  const [prompt, setPrompt] = useState(task?.prompt ?? '')
  const [frequency, setFrequency] = useState<Frequency>(initial.frequency)
  const [time, setTime] = useState(initial.time)
  const [day, setDay] = useState(initial.day)
  const [expression, setExpression] = useState(task?.cron ?? '0 18 * * *')
  const [selectedDirectory, setSelectedDirectory] = useState(task?.directory ?? directory)
  const [selectedServerId, setSelectedServerId] = useState(task?.serverId ?? activeServer?.id ?? '')
  const [executionMode, setExecutionMode] = useState<'current' | 'worktree'>(task?.executionMode ?? 'current')
  const [worktreeCleanup, setWorktreeCleanup] = useState<'always' | 'on-success' | 'never'>(task?.worktreeCleanup ?? 'on-success')
  const [branch, setBranch] = useState(task?.branch ?? '')
  const [permissionProfile, setPermissionProfile] = useState<'ask' | 'writes' | 'risk' | 'full'>(task?.permissionProfile ?? 'risk')
  const [retryCount, setRetryCount] = useState(task?.retryCount ?? 1)
  const [retryDelaySeconds, setRetryDelaySeconds] = useState(task?.retryDelaySeconds ?? 30)
  const [completionTimeoutMinutes, setCompletionTimeoutMinutes] = useState(task?.completionTimeoutMinutes ?? 60)
  const [overlapPolicy, setOverlapPolicy] = useState<'skip' | 'queue' | 'parallel'>(task?.overlapPolicy ?? 'skip')
  const [maxConcurrentRuns, setMaxConcurrentRuns] = useState(task?.maxConcurrentRuns ?? 1)
  const [missedRunPolicy, setMissedRunPolicy] = useState<'skip' | 'run-once'>(task?.missedRunPolicy ?? 'run-once')
  const [catchUpWindowMinutes, setCatchUpWindowMinutes] = useState(task?.catchUpWindowMinutes ?? 60)
  const [selectedModelKey, setSelectedModelKey] = useState(task?.modelProviderID && task.modelID ? taskModelKey(task.modelProviderID, task.modelID) : '')
  const [variant, setVariant] = useState(task?.variant ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const initialServerId = useRef(activeServer?.id ?? '')
  const selectedModel = models.find(model => taskModelKey(model.providerId, model.id) === selectedModelKey)
  const selectedServer = servers.find(server => server.id === selectedServerId)
  const selectedCapabilities = selectedServer ? serverStore.getHealth(selectedServer.id)?.capabilities : undefined

  const close = () => {
    if (initialServerId.current && serverStore.getActiveServerId() !== initialServerId.current) serverStore.setActiveServer(initialServerId.current)
    onClose()
  }

  useEffect(() => {
    if (selectedModelKey || models.length === 0) return
    setSelectedModelKey(taskModelKey(models[0].providerId, models[0].id))
  }, [models, selectedModelKey])

  useEffect(() => {
    if (!selectedServerId || activeServer?.id === selectedServerId) return
    serverStore.setActiveServer(selectedServerId)
  }, [activeServer?.id, selectedServerId])

  const save = async () => {
    const cron = frequency === 'advanced' ? expression : buildCron(frequency, time, day)
    setSaving(true); setError('')
    try {
      if (!selectedModel) throw new Error(t('taskPanel.selectModelError'))
      if (!selectedServer) throw new Error(t('taskPanel.selectServerError'))
      const health = await serverStore.checkHealth(selectedServer.id)
      if (health.status !== 'online') throw new Error(health.error || t('taskPanel.serverUnavailable'))
      if (executionMode === 'worktree' && !health.capabilities?.worktree) throw new Error(t('taskPanel.worktreeUnsupported'))
      if (branch && !health.capabilities?.vcsMutations) throw new Error(t('taskPanel.branchUnsupported'))
      const input = { title, prompt, cron, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, serverId: selectedServer.id, serverName: selectedServer.name, serverUrl: selectedServer.url, directory: selectedDirectory, executionMode, worktreeCleanup, branch, permissionProfile, retryCount, retryDelaySeconds, completionTimeoutMinutes, overlapPolicy, maxConcurrentRuns, missedRunPolicy, catchUpWindowMinutes, modelProviderID: selectedModel.providerId, modelID: selectedModel.id, variant, enabled: task?.enabled ?? true }
      if (task) await window.customOpenCode.updateTask(task.id, input)
      else await window.customOpenCode.createTask(input)
      if (initialServerId.current && serverStore.getActiveServerId() !== initialServerId.current) serverStore.setActiveServer(initialServerId.current)
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('taskPanel.saveFailed')) } finally { setSaving(false) }
  }
  return <Dialog isOpen onClose={close} title={t(task ? 'taskPanel.editTask' : 'taskPanel.newTask')} width={576}>
      <div className="space-y-4">
        <div><Label>{t('taskPanel.name')}</Label><input value={title} onChange={e => setTitle(e.target.value)} className={`${inputClass} h-9 w-full`} placeholder={t('taskPanel.namePlaceholder')} /></div>
        <div><Label>{t('taskPanel.prompt')}</Label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} className={`${inputClass} min-h-24 w-full resize-y py-2`} placeholder={t('taskPanel.promptPlaceholder')} /></div>
        <div><Label>{t('taskPanel.server')}</Label><select value={selectedServerId} onChange={e => { setSelectedServerId(e.target.value); setSelectedDirectory(''); setSelectedModelKey(''); setVariant(''); serverStore.setActiveServer(e.target.value) }} className={`${inputClass} h-9 w-full`}>{servers.map(server => <option key={server.id} value={server.id}>{server.id === 'local' ? t('taskPanel.local') : server.name} — {server.url}</option>)}</select></div>
        <div><Label>{t('taskPanel.project')}</Label><input list="scheduled-task-directories" value={selectedDirectory} onChange={e => setSelectedDirectory(e.target.value)} className={`${inputClass} h-9 w-full`} placeholder={t('taskPanel.projectPlaceholder')} /><datalist id="scheduled-task-directories">{directories.map(item => <option key={item.path} value={item.path}>{item.name}</option>)}</datalist></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>{t('taskPanel.executionLocation')}</Label><select value={executionMode} onChange={e => setExecutionMode(e.target.value as 'current' | 'worktree')} className={`${inputClass} h-9 w-full`}><option value="current">{t('taskPanel.currentDirectory')}</option><option value="worktree" disabled={!selectedDirectory || selectedCapabilities?.worktree === false}>{t('taskPanel.isolatedWorktree')}</option></select></div><div><Label>{t('taskPanel.baseBranch')}</Label><input value={branch} onChange={e => setBranch(e.target.value)} disabled={!selectedDirectory || selectedCapabilities?.vcsMutations === false} className={`${inputClass} h-9 w-full`} placeholder={t('taskPanel.branchPlaceholder')} /></div></div>
        {executionMode === 'worktree' ? <div><Label>{t('taskPanel.worktreeCleanup')}</Label><select value={worktreeCleanup} onChange={event => setWorktreeCleanup(event.target.value as 'always' | 'on-success' | 'never')} className={`${inputClass} h-9 w-full`}><option value="on-success">{t('taskPanel.cleanupSuccess')}</option><option value="always">{t('taskPanel.cleanupAlways')}</option><option value="never">{t('taskPanel.cleanupNever')}</option></select></div> : null}
        <div className="grid grid-cols-2 gap-2"><div><Label>{t('taskPanel.permissions')}</Label><select value={permissionProfile} onChange={e => setPermissionProfile(e.target.value as 'ask' | 'writes' | 'risk' | 'full')} className={`${inputClass} h-9 w-full`}><option value="ask">{t('taskPanel.permissionAsk')}</option><option value="writes">{t('taskPanel.permissionWrites')}</option><option value="risk">{t('taskPanel.permissionRisk')}</option><option value="full">{t('taskPanel.permissionFull')}</option></select></div><div><Label>{t('taskPanel.timeout')}</Label><input type="number" min={1} max={1440} value={completionTimeoutMinutes} onChange={e => setCompletionTimeoutMinutes(Number(e.target.value))} className={`${inputClass} h-9 w-full`} /></div></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>{t('taskPanel.retryCount')}</Label><input type="number" min={0} max={10} value={retryCount} onChange={e => setRetryCount(Number(e.target.value))} className={`${inputClass} h-9 w-full`} /></div><div><Label>{t('taskPanel.retryDelay')}</Label><input type="number" min={1} max={3600} value={retryDelaySeconds} onChange={e => setRetryDelaySeconds(Number(e.target.value))} className={`${inputClass} h-9 w-full`} /></div></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>{t('taskPanel.overlap')}</Label><select value={overlapPolicy} onChange={e => setOverlapPolicy(e.target.value as 'skip' | 'queue' | 'parallel')} className={`${inputClass} h-9 w-full`}><option value="skip">{t('taskPanel.overlapSkip')}</option><option value="queue">{t('taskPanel.overlapQueue')}</option><option value="parallel">{t('taskPanel.overlapParallel')}</option></select></div><div><Label>{t('taskPanel.maxTaskConcurrency')}</Label><input type="number" min={1} max={5} disabled={overlapPolicy !== 'parallel'} value={maxConcurrentRuns} onChange={e => setMaxConcurrentRuns(Number(e.target.value))} className={`${inputClass} h-9 w-full disabled:opacity-50`} /></div></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>{t('taskPanel.missedRun')}</Label><select value={missedRunPolicy} onChange={e => setMissedRunPolicy(e.target.value as 'skip' | 'run-once')} className={`${inputClass} h-9 w-full`}><option value="skip">{t('taskPanel.skip')}</option><option value="run-once">{t('taskPanel.catchUpOnce')}</option></select></div><div><Label>{t('taskPanel.catchUpWindow')}</Label><input type="number" min={1} max={10080} disabled={missedRunPolicy !== 'run-once'} value={catchUpWindowMinutes} onChange={e => setCatchUpWindowMinutes(Number(e.target.value))} className={`${inputClass} h-9 w-full disabled:opacity-50`} /></div></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>{t('taskPanel.model')}</Label><select value={selectedModelKey} disabled={modelsLoading} onChange={e => { setSelectedModelKey(e.target.value); setVariant('') }} className={`${inputClass} h-9 w-full`}><option value="">{modelsLoading ? t('taskPanel.loadingModels') : t('taskPanel.selectModel')}</option>{models.map(model => <option key={taskModelKey(model.providerId, model.id)} value={taskModelKey(model.providerId, model.id)}>{model.name} · {model.providerName}</option>)}</select></div><div><Label>{t('taskPanel.reasoning')}</Label><select value={variant} onChange={e => setVariant(e.target.value)} disabled={!selectedModel} className={`${inputClass} h-9 w-full`}><option value="">{t('taskPanel.default')}</option>{selectedModel?.variants.map(item => <option key={item} value={item}>{item}</option>)}</select></div></div>
        <div><Label>{t('taskPanel.schedule')}</Label><div className="grid grid-cols-[1fr_1fr] gap-2"><select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className={`${inputClass} h-9`}><option value="daily">{t('taskPanel.daily')}</option><option value="weekdays">{t('taskPanel.weekdays')}</option><option value="weekly">{t('taskPanel.weekly')}</option><option value="advanced">{t('taskPanel.advancedCron')}</option></select>{frequency === 'advanced' ? <input value={expression} onChange={e => setExpression(e.target.value)} className={`${inputClass} h-9 font-mono`} placeholder="0 18 * * *" /> : <div className="flex gap-2">{frequency === 'weekly' && <select value={day} onChange={e => setDay(e.target.value)} className={`${inputClass} h-9 flex-1`}>{weekdays.map(item => <option value={item[0]} key={item[0]}>{t(`taskPanel.weekday${item[0]}`)}</option>)}</select>}<input type="time" value={time} onChange={e => setTime(e.target.value)} className={`${inputClass} h-9 flex-1`} /></div>}</div>{frequency === 'advanced' && <p className="mt-1 text-[length:var(--fs-xs)] text-text-400">{t('taskPanel.cronHint')}</p>}</div>
        {error && <div className="text-[length:var(--fs-xs)] text-danger-100">{error}</div>}
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-border-200/60 pt-4"><button onClick={close} className="rounded-lg px-3 py-2 text-[length:var(--fs-sm)] text-text-300">{t('common:cancel')}</button><button disabled={saving || !title.trim() || !prompt.trim() || !selectedModel} onClick={() => void save()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent-main-100 px-4 py-2 text-[length:var(--fs-sm)] text-oncolor-100 transition-colors hover:bg-accent-main-200 disabled:opacity-50">{saving ? <SpinnerIcon size={12} className="animate-spin" /> : <CheckIcon size={12} />}{t('common:save')}</button></div>
  </Dialog>
}

function Label({ children }: { children: string }) { return <div className="mb-1.5 text-[length:var(--fs-xs)] font-medium text-text-300">{children}</div> }
function taskInputFromTask(task: Task): TaskInput {
  return {
    title: task.title,
    prompt: task.prompt,
    cron: task.cron,
    timezone: task.timezone,
    serverId: task.serverId,
    serverName: task.serverName,
    serverUrl: task.serverUrl,
    directory: task.directory,
    executionMode: task.executionMode,
    worktreeCleanup: task.worktreeCleanup,
    branch: task.branch,
    permissionProfile: task.permissionProfile,
    retryCount: task.retryCount,
    retryDelaySeconds: task.retryDelaySeconds,
    completionTimeoutMinutes: task.completionTimeoutMinutes,
    overlapPolicy: task.overlapPolicy,
    maxConcurrentRuns: task.maxConcurrentRuns,
    missedRunPolicy: task.missedRunPolicy,
    catchUpWindowMinutes: task.catchUpWindowMinutes,
    modelProviderID: task.modelProviderID,
    modelID: task.modelID,
    variant: task.variant,
    enabled: task.enabled,
  }
}
function isTaskExport(value: unknown): value is { format: 'opencodex.automation'; version: 1; settings?: TaskSettings; tasks: TaskInput[] } {
  if (!value || typeof value !== 'object') return false
  const config = value as Record<string, unknown>
  if (config.format !== 'opencodex.automation' || config.version !== 1 || !Array.isArray(config.tasks)) return false
  if (config.settings !== undefined && !isTaskSettings(config.settings)) return false
  return config.tasks.every(isTaskInput)
}
function isTaskSettings(value: unknown): value is TaskSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as Record<string, unknown>
  return Number.isInteger(settings.maxConcurrency) && Number.isInteger(settings.historyRetentionDays) && Number.isInteger(settings.maxHistory)
}
function isTaskInput(value: unknown): value is TaskInput {
  if (!value || typeof value !== 'object') return false
  const task = value as Record<string, unknown>
  const strings = ['title', 'prompt', 'cron', 'timezone', 'serverId', 'serverName', 'serverUrl', 'directory', 'branch', 'modelProviderID', 'modelID', 'variant']
  const integers = ['retryCount', 'retryDelaySeconds', 'completionTimeoutMinutes', 'maxConcurrentRuns', 'catchUpWindowMinutes']
  if (!strings.every(key => typeof task[key] === 'string') || !integers.every(key => Number.isInteger(task[key]))) return false
  if (task.executionMode !== 'current' && task.executionMode !== 'worktree') return false
  if (task.worktreeCleanup !== 'always' && task.worktreeCleanup !== 'on-success' && task.worktreeCleanup !== 'never') return false
  if (task.permissionProfile !== 'ask' && task.permissionProfile !== 'writes' && task.permissionProfile !== 'risk' && task.permissionProfile !== 'full') return false
  if (task.overlapPolicy !== 'skip' && task.overlapPolicy !== 'queue' && task.overlapPolicy !== 'parallel') return false
  if (task.missedRunPolicy !== 'skip' && task.missedRunPolicy !== 'run-once') return false
  return typeof task.enabled === 'boolean'
}
function buildCron(frequency: Frequency, time: string, day: string) { const [hour, minute] = time.split(':'); if (frequency === 'weekdays') return `${minute} ${hour} * * 1-5`; if (frequency === 'weekly') return `${minute} ${hour} * * ${day}`; return `${minute} ${hour} * * *` }
function cronParts(cron: string) { const [minute, hour, , , day] = cron.split(' '); if (!minute || !hour || !day) return { frequency: 'advanced' as Frequency, time: '18:00', day: '1' }; if (day === '*') return { frequency: 'daily' as Frequency, time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day: '1' }; if (day === '1-5') return { frequency: 'weekdays' as Frequency, time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day: '1' }; if (/^[0-6]$/.test(day)) return { frequency: 'weekly' as Frequency, time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day }; return { frequency: 'advanced' as Frequency, time: '18:00', day: '1' } }
function describeCron(cron: string, t: TFunction) { const value = cronParts(cron); if (value.frequency === 'advanced') return `Cron ${cron}`; if (value.frequency === 'weekdays') return t('taskPanel.weekdaysAt', { time: value.time }); if (value.frequency === 'weekly') return t('taskPanel.weeklyAt', { day: t(`taskPanel.weekday${value.day}`), time: value.time }); return t('taskPanel.dailyAt', { time: value.time }) }
function taskModelKey(providerID: string, modelID: string) { return `${providerID}\u0000${modelID}` }
function permissionLabel(value: Task['permissionProfile'], t: TFunction) { return t(`taskPanel.permission_${value}`) }
function runStatusLabel(value: TaskRun['status'], t: TFunction) { return t(`taskPanel.status_${value}`) }
