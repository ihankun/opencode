import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { CheckIcon, ClockIcon, CloseIcon, MessageSquareIcon, PencilIcon, PlusIcon, RetryIcon, SearchIcon, SpinnerIcon, TrashIcon } from './Icons'
import { useDirectory, useModels, useServerStore } from '../hooks'
import type { ModelInfo } from '../api'
import { executionTargetStore } from '../store/executionTargetStore'
import { serverStore, type ServerConfig } from '../store/serverStore'

type Task = Awaited<ReturnType<typeof window.customOpenCode.listTasks>>[number]
type TaskInput = Parameters<typeof window.customOpenCode.createTask>[0]
type TaskRun = Awaited<ReturnType<typeof window.customOpenCode.listTaskRuns>>[number]
type Frequency = 'daily' | 'weekdays' | 'weekly' | 'advanced'

const weekdays = [
  ['1', '一'], ['2', '二'], ['3', '三'], ['4', '四'], ['5', '五'], ['6', '六'], ['0', '日'],
] as const

export const TaskPanel = memo(function TaskPanel({ onOpenSession }: { onOpenSession: (sessionID: string, directory: string) => void }) {
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextTasks, nextRuns] = await Promise.all([window.customOpenCode.listTasks(), window.customOpenCode.listTaskRuns()])
      setTasks(nextTasks)
      setRuns(nextRuns)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取任务失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    return window.customOpenCode.onTasksChanged(() => void load())
  }, [load])
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
  }, [load])

  return (
    <div className="flex h-full flex-col bg-bg-100">
      <div className="window-drag-region flex h-14 shrink-0 items-center justify-between border-b border-border-200/50 px-6">
        <div>
          <h1 className="text-[length:var(--fs-lg)] font-semibold text-text-100">定时任务</h1>
          <p className="text-[length:var(--fs-xs)] text-text-400">按计划自动启动 OpenCodex 会话</p>
        </div>
        <div className="flex gap-1.5">
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200" onClick={() => void load()} title="刷新"><RetryIcon size={14} className={loading ? 'animate-spin' : ''} /></button>
          {view === 'tasks' && <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-main-100 px-3 text-[length:var(--fs-sm)] text-oncolor-100 transition-colors hover:bg-accent-main-200" onClick={() => setEditing('new')}><PlusIcon size={13} />新建任务</button>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1 border-b border-border-200/40 px-6 py-2">
        {([['tasks', '任务列表', tasks.length], ['runs', '执行记录', runs.length]] as const).map(item => <button key={item[0]} onClick={() => setView(item[0])} className={`rounded-md px-3 py-1.5 text-[length:var(--fs-sm)] transition-colors ${view === item[0] ? 'bg-bg-200 text-text-100' : 'text-text-400 hover:text-text-200'}`}>{item[1]}<span className="ml-1.5 text-[length:var(--fs-xs)] text-text-500">{item[2]}</span></button>)}
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        {view === 'runs' ? <TaskRunList runs={runs} loading={loading} onOpenSession={onOpenSession} /> : <>
        <div className="mb-5 flex gap-1 rounded-lg bg-bg-200/50 p-1 w-fit">
          {([['all', '全部'], ['enabled', '已开启'], ['paused', '已暂停']] as const).map(item => (
            <button key={item[0]} onClick={() => setFilter(item[0])} className={`rounded-md px-3 py-1 text-[length:var(--fs-sm)] ${filter === item[0] ? 'bg-bg-100 text-text-100 shadow-sm' : 'text-text-400'}`}>{item[1]}</button>
          ))}
        </div>
        {error && <div className="mb-3 rounded-lg bg-danger-100/10 p-3 text-danger-100 text-[length:var(--fs-sm)]">{error}</div>}
        {loading && !tasks.length ? <div className="flex justify-center py-20 text-text-400"><SpinnerIcon size={20} className="animate-spin" /></div> : null}
        {!loading && !visible.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-200 py-20 text-text-400">
            <ClockIcon size={28} /><div className="mt-3 text-text-200">还没有定时任务</div><div className="mt-1 text-[length:var(--fs-sm)]">点击“新建任务”设置一个执行计划</div>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(task => (
              <div key={task.id} className="group rounded-xl border border-border-200/60 bg-bg-100 p-4 transition-colors hover:bg-bg-200/20">
                <div className="flex items-start gap-3">
                  <button disabled={busy === task.id} onClick={() => void update(task, { ...task, enabled: !task.enabled })} className={`mt-0.5 inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${task.enabled ? 'bg-success-100' : 'bg-bg-300'}`} title={task.enabled ? '暂停' : '启用'}><span className={`h-4 w-4 rounded-full bg-white transition-transform ${task.enabled ? 'translate-x-4' : ''}`} /></button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-medium text-text-100">{task.title}</span><Status task={task} /></div>
                    <div className="mt-1 truncate text-[length:var(--fs-sm)] text-text-300">{task.prompt}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--fs-xs)] text-text-400"><span>{describeCron(task.cron)}</span><span>服务器：{task.serverName}</span><span>项目：{task.directory || '全局'}</span><span>{task.executionMode === 'worktree' ? '隔离 Worktree' : '当前目录'}{task.branch ? ` · ${task.branch}` : ''}</span><span>模型：{task.modelProviderID}/{task.modelID}</span><span>审批：{permissionLabel(task.permissionProfile)}</span><span>失败重试：{task.retryCount} 次</span><span>{task.timezone}</span>{task.nextRunAt && <span>下次：{new Date(task.nextRunAt).toLocaleString()}</span>}{task.lastRunAt && <span>上次：{new Date(task.lastRunAt).toLocaleString()}</span>}</div>
                    {task.lastError && <div className="mt-2 text-[length:var(--fs-xs)] text-danger-100">{task.lastError}</div>}
                  </div>
                  <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                    {task.status === 'running' ? <button className="h-7 rounded-md px-2 text-[length:var(--fs-xs)] text-danger-100 hover:bg-danger-100/10" onClick={async () => { setBusy(task.id); await window.customOpenCode.cancelTask(task.id); await load(); setBusy('') }}>停止</button> : <button className="h-7 rounded-md px-2 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-200" onClick={async () => { setBusy(task.id); await window.customOpenCode.runTask(task.id); await load(); setBusy('') }}>立即运行</button>}
                    <button className="h-7 w-7 rounded-md text-text-300 hover:bg-bg-200" onClick={() => setEditing(task)}><PencilIcon size={12} /></button>
                    <button className="h-7 w-7 rounded-md text-text-300 hover:bg-danger-100/10 hover:text-danger-100" onClick={async () => { if (!confirm(`删除任务“${task.title}”？`)) return; await window.customOpenCode.removeTask(task.id); await load() }}><TrashIcon size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}</>}
      </div>
      {editing && <TaskDialog task={editing === 'new' ? undefined : editing} directory={currentDirectory ?? pathInfo?.directory ?? ''} directories={directories} servers={servers} activeServer={activeServer} models={models} modelsLoading={modelsLoading} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load() }} />}
    </div>
  )
})

function TaskRunList({ runs, loading, onOpenSession }: { runs: TaskRun[]; loading: boolean; onOpenSession: (sessionID: string, directory: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = runs.filter(run => `${run.taskTitle} ${run.prompt} ${run.directory} ${run.modelProviderID} ${run.modelID}`.toLowerCase().includes(search.trim().toLowerCase()))
  const groups = Array.from(filtered.reduce((result, run) => {
    const group = result.get(run.taskID) ?? { title: run.taskTitle, runs: [] as TaskRun[] }
    group.runs.push(run)
    result.set(run.taskID, group)
    return result
  }, new Map<string, { title: string; runs: TaskRun[] }>()).values())

  return <div>
    <div className="relative mb-5"><SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索任务、指令、项目或模型..." className="h-9 w-full rounded-lg border border-border-200/60 bg-bg-200/30 pl-9 pr-3 text-[length:var(--fs-sm)] text-text-100 outline-none transition-colors placeholder:text-text-500 focus:border-border-100 focus:bg-bg-100" /></div>
    {loading && runs.length === 0 ? <div className="flex justify-center py-20 text-text-400"><SpinnerIcon size={20} className="animate-spin" /></div> : null}
    {!loading && groups.length === 0 ? <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-200 py-20 text-text-400"><MessageSquareIcon size={28} /><div className="mt-3 text-text-200">暂无执行会话</div><div className="mt-1 text-[length:var(--fs-sm)]">任务运行后，会话会集中显示在这里</div></div> : null}
    <div className="space-y-5">{groups.map(group => <section key={group.runs[0].taskID}>
      <div className="mb-2 flex items-center gap-2 px-1"><span className="text-[length:var(--fs-sm)] font-medium text-text-200">{group.title}</span><span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-200 px-1.5 text-[length:var(--fs-xxs)] text-text-400">{group.runs.length}</span></div>
      <div className="overflow-hidden rounded-xl border border-border-200/60 bg-bg-100">{group.runs.map((run, index) => {
        const active = run.status === 'running' || run.status === 'submitted' || run.status === 'recovering'
        const canOpen = !run.sessionID.startsWith('pending:') && serverStore.getServers().some(server => server.id === run.serverId)
        return <div key={run.id} className={index > 0 ? 'border-t border-border-200/45' : ''}>
          <div className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-200/35">
            <span className={`h-2 w-2 shrink-0 rounded-full ${run.status === 'failed' || run.status === 'timed_out' ? 'bg-danger-100' : active ? 'bg-warning-100' : run.status === 'cancelled' ? 'bg-text-500' : 'bg-success-100'}`} />
            <button type="button" disabled={!canOpen} onClick={() => { serverStore.setActiveServer(run.serverId); executionTargetStore.bindSession(run.sessionID, { serverId: run.serverId, directory: run.executionDirectory, sourceDirectory: run.directory, executionMode: run.executionMode, branch: run.branch || undefined, permissionProfile: run.permissionProfile }); onOpenSession(run.sessionID, run.executionDirectory) }} className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-60">
              <div className="flex items-center gap-2"><span className="truncate text-[length:var(--fs-sm)] font-medium text-text-100">{run.prompt}</span><span className={`shrink-0 rounded px-1.5 py-0.5 text-[length:var(--fs-xxs)] ${run.status === 'failed' || run.status === 'timed_out' ? 'bg-danger-100/10 text-danger-100' : active ? 'bg-warning-100/10 text-warning-100' : run.status === 'cancelled' ? 'bg-bg-200 text-text-400' : 'bg-success-100/10 text-success-100'}`}>{runStatusLabel(run.status)}</span></div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[length:var(--fs-xs)] text-text-400"><span>{new Date(run.createdAt).toLocaleString()}</span><span>{run.serverName}</span><span>{run.executionDirectory || run.directory || '全局'}</span><span>{run.executionMode === 'worktree' ? 'Worktree' : '当前目录'}{run.branch ? ` · ${run.branch}` : ''}</span><span>第 {run.attempt} 次</span><span>{run.modelProviderID}/{run.modelID}</span></div>{run.error && <div className="mt-1 text-[length:var(--fs-xs)] text-danger-100">{run.error}</div>}
            </button>
            {active ? <button type="button" onClick={() => void window.customOpenCode.cancelTaskRun(run.id)} className="rounded-md px-2 py-1 text-[length:var(--fs-xs)] text-danger-100 hover:bg-danger-100/10">停止</button> : null}
          </div>
          {run.log ? <details className="border-t border-border-200/30 bg-bg-200/15 px-4 py-2"><summary className="cursor-pointer text-[length:var(--fs-xs)] text-text-400">运行日志</summary><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-[length:var(--fs-xxs)] leading-5 text-text-300">{run.log}</pre></details> : null}
        </div>
      })}</div>
    </section>)}</div>
  </div>
}

function Status({ task }: { task: Task }) {
  const label = task.status === 'error' ? '异常' : task.enabled ? '已开启' : '已暂停'
  return <span className={`rounded-full px-2 py-0.5 text-[length:var(--fs-xxs)] ${task.status === 'error' ? 'bg-danger-100/10 text-danger-100' : task.enabled ? 'bg-success-100/10 text-success-100' : 'bg-bg-200 text-text-400'}`}>{label}</span>
}

function TaskDialog({ task, directory, directories, servers, activeServer, models, modelsLoading, onClose, onSaved }: { task?: Task; directory: string; directories: Array<{ path: string; name: string }>; servers: ServerConfig[]; activeServer: ServerConfig | null; models: ModelInfo[]; modelsLoading: boolean; onClose: () => void; onSaved: () => void }) {
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
  const [selectedModelKey, setSelectedModelKey] = useState(task?.modelProviderID && task.modelID ? taskModelKey(task.modelProviderID, task.modelID) : '')
  const [variant, setVariant] = useState(task?.variant ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedModel = models.find(model => taskModelKey(model.providerId, model.id) === selectedModelKey)
  const selectedServer = servers.find(server => server.id === selectedServerId)
  const selectedCapabilities = selectedServer ? serverStore.getHealth(selectedServer.id)?.capabilities : undefined

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
      if (!selectedModel) throw new Error('请选择运行模型')
      if (!selectedServer) throw new Error('请选择运行服务器')
      const health = await serverStore.checkHealth(selectedServer.id)
      if (health.status !== 'online') throw new Error(health.error || '所选服务器当前不可用')
      if (executionMode === 'worktree' && !health.capabilities?.worktree) throw new Error('所选服务器不支持隔离 Worktree')
      if (branch && !health.capabilities?.vcsMutations) throw new Error('所选服务器不支持分支切换')
      const input = { title, prompt, cron, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, serverId: selectedServer.id, serverName: selectedServer.name, serverUrl: selectedServer.url, directory: selectedDirectory, executionMode, worktreeCleanup, branch, permissionProfile, retryCount, retryDelaySeconds, completionTimeoutMinutes, modelProviderID: selectedModel.providerId, modelID: selectedModel.id, variant, enabled: task?.enabled ?? true }
      if (task) await window.customOpenCode.updateTask(task.id, input)
      else await window.customOpenCode.createTask(input)
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败') } finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/45 p-6" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="w-full max-w-xl rounded-2xl border border-border-200 bg-bg-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-border-200/60 px-5 py-4"><div className="font-semibold text-text-100">{task ? '编辑定时任务' : '新建定时任务'}</div><button onClick={onClose}><CloseIcon size={15} /></button></div>
      <div className="space-y-4 p-5">
        <div><Label>名称</Label><input value={title} onChange={e => setTitle(e.target.value)} className={`${inputClass} h-9 w-full`} placeholder="每日修改总结" /></div>
        <div><Label>要执行的指令</Label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} className={`${inputClass} min-h-24 w-full resize-y py-2`} placeholder="总结今天修改的全部内容" /></div>
        <div><Label>运行服务器</Label><select value={selectedServerId} onChange={e => { setSelectedServerId(e.target.value); setSelectedDirectory(''); setSelectedModelKey(''); setVariant(''); serverStore.setActiveServer(e.target.value) }} className={`${inputClass} h-9 w-full`}>{servers.map(server => <option key={server.id} value={server.id}>{server.id === 'local' ? '本地' : server.name} — {server.url}</option>)}</select></div>
        <div><Label>运行项目</Label><input list="scheduled-task-directories" value={selectedDirectory} onChange={e => setSelectedDirectory(e.target.value)} className={`${inputClass} h-9 w-full`} placeholder="服务器上的项目绝对路径；留空表示全局" /><datalist id="scheduled-task-directories">{directories.map(item => <option key={item.path} value={item.path}>{item.name}</option>)}</datalist></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>执行位置</Label><select value={executionMode} onChange={e => setExecutionMode(e.target.value as 'current' | 'worktree')} className={`${inputClass} h-9 w-full`}><option value="current">当前目录</option><option value="worktree" disabled={!selectedDirectory || selectedCapabilities?.worktree === false}>隔离 Worktree</option></select></div><div><Label>基准分支</Label><input value={branch} onChange={e => setBranch(e.target.value)} disabled={!selectedDirectory || selectedCapabilities?.vcsMutations === false} className={`${inputClass} h-9 w-full`} placeholder="留空使用当前分支" /></div></div>
        {executionMode === 'worktree' ? <div><Label>Worktree 清理策略</Label><select value={worktreeCleanup} onChange={event => setWorktreeCleanup(event.target.value as 'always' | 'on-success' | 'never')} className={`${inputClass} h-9 w-full`}><option value="on-success">成功后自动清理，失败时保留排查</option><option value="always">每次结束都自动清理</option><option value="never">始终保留，由我手动清理</option></select></div> : null}
        <div className="grid grid-cols-2 gap-2"><div><Label>权限审批</Label><select value={permissionProfile} onChange={e => setPermissionProfile(e.target.value as 'ask' | 'writes' | 'risk' | 'full')} className={`${inputClass} h-9 w-full`}><option value="ask">每项都审批</option><option value="writes">写入时审批</option><option value="risk">仅风险操作审批</option><option value="full">全自动（不审批）</option></select></div><div><Label>完成超时（分钟）</Label><input type="number" min={1} max={1440} value={completionTimeoutMinutes} onChange={e => setCompletionTimeoutMinutes(Number(e.target.value))} className={`${inputClass} h-9 w-full`} /></div></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>失败重试次数</Label><input type="number" min={0} max={10} value={retryCount} onChange={e => setRetryCount(Number(e.target.value))} className={`${inputClass} h-9 w-full`} /></div><div><Label>重试间隔（秒）</Label><input type="number" min={1} max={3600} value={retryDelaySeconds} onChange={e => setRetryDelaySeconds(Number(e.target.value))} className={`${inputClass} h-9 w-full`} /></div></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>运行模型</Label><select value={selectedModelKey} disabled={modelsLoading} onChange={e => { setSelectedModelKey(e.target.value); setVariant('') }} className={`${inputClass} h-9 w-full`}><option value="">{modelsLoading ? '正在加载模型...' : '请选择模型'}</option>{models.map(model => <option key={taskModelKey(model.providerId, model.id)} value={taskModelKey(model.providerId, model.id)}>{model.name} · {model.providerName}</option>)}</select></div><div><Label>推理级别</Label><select value={variant} onChange={e => setVariant(e.target.value)} disabled={!selectedModel} className={`${inputClass} h-9 w-full`}><option value="">默认</option>{selectedModel?.variants.map(item => <option key={item} value={item}>{variantLabel(item)}</option>)}</select></div></div>
        <div><Label>执行时间</Label><div className="grid grid-cols-[1fr_1fr] gap-2"><select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className={`${inputClass} h-9`}><option value="daily">每天</option><option value="weekdays">工作日</option><option value="weekly">每周</option><option value="advanced">高级（Cron）</option></select>{frequency === 'advanced' ? <input value={expression} onChange={e => setExpression(e.target.value)} className={`${inputClass} h-9 font-mono`} placeholder="0 18 * * *" /> : <div className="flex gap-2">{frequency === 'weekly' && <select value={day} onChange={e => setDay(e.target.value)} className={`${inputClass} h-9 flex-1`}>{weekdays.map(item => <option value={item[0]} key={item[0]}>周{item[1]}</option>)}</select>}<input type="time" value={time} onChange={e => setTime(e.target.value)} className={`${inputClass} h-9 flex-1`} /></div>}</div>{frequency === 'advanced' && <p className="mt-1 text-[length:var(--fs-xs)] text-text-400">支持标准五段 Cron 表达式，按当前时区执行。</p>}</div>
        {error && <div className="text-[length:var(--fs-xs)] text-danger-100">{error}</div>}
      </div>
      <div className="flex justify-end gap-2 border-t border-border-200/60 px-5 py-4"><button onClick={onClose} className="rounded-lg px-3 py-2 text-[length:var(--fs-sm)] text-text-300">取消</button><button disabled={saving || !title.trim() || !prompt.trim() || !selectedModel} onClick={() => void save()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent-main-100 px-4 py-2 text-[length:var(--fs-sm)] text-oncolor-100 transition-colors hover:bg-accent-main-200 disabled:opacity-50">{saving ? <SpinnerIcon size={12} className="animate-spin" /> : <CheckIcon size={12} />}保存</button></div>
    </div>
  </div>
}

function Label({ children }: { children: string }) { return <div className="mb-1.5 text-[length:var(--fs-xs)] font-medium text-text-300">{children}</div> }
function buildCron(frequency: Frequency, time: string, day: string) { const [hour, minute] = time.split(':'); if (frequency === 'weekdays') return `${minute} ${hour} * * 1-5`; if (frequency === 'weekly') return `${minute} ${hour} * * ${day}`; return `${minute} ${hour} * * *` }
function cronParts(cron: string) { const [minute, hour, , , day] = cron.split(' '); if (!minute || !hour || !day) return { frequency: 'advanced' as Frequency, time: '18:00', day: '1' }; if (day === '*') return { frequency: 'daily' as Frequency, time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day: '1' }; if (day === '1-5') return { frequency: 'weekdays' as Frequency, time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day: '1' }; if (/^[0-6]$/.test(day)) return { frequency: 'weekly' as Frequency, time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day }; return { frequency: 'advanced' as Frequency, time: '18:00', day: '1' } }
function describeCron(cron: string) { const value = cronParts(cron); if (value.frequency === 'advanced') return `Cron ${cron}`; if (value.frequency === 'weekdays') return `工作日 ${value.time}`; if (value.frequency === 'weekly') return `每周${weekdays.find(item => item[0] === value.day)?.[1] ?? value.day} ${value.time}`; return `每天 ${value.time}` }
function taskModelKey(providerID: string, modelID: string) { return `${providerID}\u0000${modelID}` }
function variantLabel(value: string) { const labels: Record<string, string> = { low: '低', medium: '中', middle: '中', high: '高' }; return labels[value.toLowerCase()] ?? value }
function permissionLabel(value: Task['permissionProfile']) { return { ask: '全部审批', writes: '写入审批', risk: '风险审批', full: '全自动' }[value] }
function runStatusLabel(value: TaskRun['status']) { return { running: '启动中', submitted: '执行中', recovering: '恢复监控', completed: '已完成', failed: '失败', timed_out: '超时', cancelled: '已取消' }[value] }
