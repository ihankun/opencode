import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { CheckIcon, ClockIcon, CloseIcon, PencilIcon, PlusIcon, RetryIcon, SpinnerIcon, TrashIcon } from './Icons'
import { useDirectory } from '../hooks'
import { parseNaturalTask } from '../api/task'

type Task = Awaited<ReturnType<typeof window.customOpenCode.listTasks>>[number]
type TaskInput = Parameters<typeof window.customOpenCode.createTask>[0]
type Frequency = 'daily' | 'weekdays' | 'weekly' | 'advanced'

const weekdays = [
  ['1', '一'], ['2', '二'], ['3', '三'], ['4', '四'], ['5', '五'], ['6', '六'], ['0', '日'],
] as const

export const TaskPanel = memo(function TaskPanel() {
  const { currentDirectory } = useDirectory()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'enabled' | 'paused'>('all')
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTasks(await window.customOpenCode.listTasks())
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取任务失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => void load(), [load])
  const visible = useMemo(() => tasks.filter(task => filter === 'all' || (filter === 'enabled' ? task.enabled : !task.enabled)), [filter, tasks])

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
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-200/50 px-6">
        <div>
          <h1 className="text-[length:var(--fs-lg)] font-semibold text-text-100">定时任务</h1>
          <p className="text-[length:var(--fs-xs)] text-text-400">按计划自动启动 OpenCodex 会话</p>
        </div>
        <div className="flex gap-1.5">
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200" onClick={() => void load()} title="刷新"><RetryIcon size={14} className={loading ? 'animate-spin' : ''} /></button>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-text-100 px-3 text-[length:var(--fs-sm)] text-bg-100" onClick={() => setEditing('new')}><PlusIcon size={13} />新建任务</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="mb-5 flex gap-1 rounded-lg bg-bg-200/50 p-1 w-fit">
          {([['all', '全部'], ['enabled', '已开启'], ['paused', '已暂停']] as const).map(item => (
            <button key={item[0]} onClick={() => setFilter(item[0])} className={`rounded-md px-3 py-1 text-[length:var(--fs-sm)] ${filter === item[0] ? 'bg-bg-100 text-text-100 shadow-sm' : 'text-text-400'}`}>{item[1]}</button>
          ))}
        </div>
        {error && <div className="mb-3 rounded-lg bg-danger-100/10 p-3 text-danger-100 text-[length:var(--fs-sm)]">{error}</div>}
        {loading && !tasks.length ? <div className="flex justify-center py-20 text-text-400"><SpinnerIcon size={20} className="animate-spin" /></div> : null}
        {!loading && !visible.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-200 py-20 text-text-400">
            <ClockIcon size={28} /><div className="mt-3 text-text-200">还没有定时任务</div><div className="mt-1 text-[length:var(--fs-sm)]">新建一个，或用自然语言快速填写</div>
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
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--fs-xs)] text-text-400"><span>{describeCron(task.cron)}</span><span>{task.timezone}</span>{task.nextRunAt && <span>下次：{new Date(task.nextRunAt).toLocaleString()}</span>}{task.lastRunAt && <span>上次：{new Date(task.lastRunAt).toLocaleString()}</span>}</div>
                    {task.lastError && <div className="mt-2 text-[length:var(--fs-xs)] text-danger-100">{task.lastError}</div>}
                  </div>
                  <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="h-7 rounded-md px-2 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-200" onClick={async () => { setBusy(task.id); await window.customOpenCode.runTask(task.id); await load(); setBusy('') }}>立即运行</button>
                    <button className="h-7 w-7 rounded-md text-text-300 hover:bg-bg-200" onClick={() => setEditing(task)}><PencilIcon size={12} /></button>
                    <button className="h-7 w-7 rounded-md text-text-300 hover:bg-danger-100/10 hover:text-danger-100" onClick={async () => { if (!confirm(`删除任务“${task.title}”？`)) return; await window.customOpenCode.removeTask(task.id); await load() }}><TrashIcon size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editing && <TaskDialog task={editing === 'new' ? undefined : editing} directory={currentDirectory ?? ''} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load() }} />}
    </div>
  )
})

function Status({ task }: { task: Task }) {
  const label = task.status === 'error' ? '异常' : task.enabled ? '已开启' : '已暂停'
  return <span className={`rounded-full px-2 py-0.5 text-[length:var(--fs-xxs)] ${task.status === 'error' ? 'bg-danger-100/10 text-danger-100' : task.enabled ? 'bg-success-100/10 text-success-100' : 'bg-bg-200 text-text-400'}`}>{label}</span>
}

function TaskDialog({ task, directory, onClose, onSaved }: { task?: Task; directory: string; onClose: () => void; onSaved: () => void }) {
  const inputClass = 'rounded-lg border border-border-200/70 bg-bg-100 px-3 text-[length:var(--fs-sm)] text-text-100 outline-none transition-colors placeholder:text-text-500 focus:border-border-100'
  const initial = task ? cronParts(task.cron) : { frequency: 'daily' as Frequency, time: '18:00', day: '1' }
  const [title, setTitle] = useState(task?.title ?? '')
  const [prompt, setPrompt] = useState(task?.prompt ?? '')
  const [frequency, setFrequency] = useState<Frequency>(initial.frequency)
  const [time, setTime] = useState(initial.time)
  const [day, setDay] = useState(initial.day)
  const [expression, setExpression] = useState(task?.cron ?? '0 18 * * *')
  const [natural, setNatural] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const applyNatural = () => {
    const parsed = parseNaturalTask(natural)
    if (!parsed) return setError('暂时无法识别。示例：每天6点总结今天修改的内容；每周五 16:00 做周报')
    setTitle(parsed.title); setPrompt(parsed.prompt); setFrequency(parsed.frequency); setTime(parsed.time); setDay(parsed.day); setError('')
  }
  const save = async () => {
    const cron = frequency === 'advanced' ? expression : buildCron(frequency, time, day)
    setSaving(true); setError('')
    try {
      const input = { title, prompt, cron, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, directory: task?.directory ?? directory, enabled: task?.enabled ?? true }
      if (task) await window.customOpenCode.updateTask(task.id, input)
      else await window.customOpenCode.createTask(input)
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败') } finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/45 p-6" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="w-full max-w-xl rounded-2xl border border-border-200 bg-bg-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-border-200/60 px-5 py-4"><div className="font-semibold text-text-100">{task ? '编辑定时任务' : '新建定时任务'}</div><button onClick={onClose}><CloseIcon size={15} /></button></div>
      <div className="space-y-4 p-5">
        {!task && <div><Label>用一句话创建</Label><div className="flex gap-2"><input value={natural} onChange={e => setNatural(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyNatural()} className={`${inputClass} h-9 flex-1`} placeholder="例如：每天6点总结今天修改的全部内容"/><button onClick={applyNatural} className="rounded-lg bg-bg-200 px-3 text-[length:var(--fs-sm)] text-text-200">智能填写</button></div></div>}
        <div><Label>名称</Label><input value={title} onChange={e => setTitle(e.target.value)} className={`${inputClass} h-9 w-full`} placeholder="每日修改总结" /></div>
        <div><Label>要执行的指令</Label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} className={`${inputClass} min-h-24 w-full resize-y py-2`} placeholder="总结今天修改的全部内容" /></div>
        <div><Label>执行时间</Label><div className="grid grid-cols-[1fr_1fr] gap-2"><select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className={`${inputClass} h-9`}><option value="daily">每天</option><option value="weekdays">工作日</option><option value="weekly">每周</option><option value="advanced">高级（Cron）</option></select>{frequency === 'advanced' ? <input value={expression} onChange={e => setExpression(e.target.value)} className={`${inputClass} h-9 font-mono`} placeholder="0 18 * * *" /> : <div className="flex gap-2">{frequency === 'weekly' && <select value={day} onChange={e => setDay(e.target.value)} className={`${inputClass} h-9 flex-1`}>{weekdays.map(item => <option value={item[0]} key={item[0]}>周{item[1]}</option>)}</select>}<input type="time" value={time} onChange={e => setTime(e.target.value)} className={`${inputClass} h-9 flex-1`} /></div>}</div>{frequency === 'advanced' && <p className="mt-1 text-[length:var(--fs-xs)] text-text-400">支持标准五段 Cron 表达式，按当前时区执行。</p>}</div>
        {error && <div className="text-[length:var(--fs-xs)] text-danger-100">{error}</div>}
      </div>
      <div className="flex justify-end gap-2 border-t border-border-200/60 px-5 py-4"><button onClick={onClose} className="rounded-lg px-3 py-2 text-[length:var(--fs-sm)] text-text-300">取消</button><button disabled={saving || !title.trim() || !prompt.trim()} onClick={() => void save()} className="inline-flex items-center gap-1.5 rounded-lg bg-text-100 px-4 py-2 text-[length:var(--fs-sm)] text-bg-100 disabled:opacity-50">{saving ? <SpinnerIcon size={12} className="animate-spin" /> : <CheckIcon size={12} />}保存</button></div>
    </div>
  </div>
}

function Label({ children }: { children: string }) { return <div className="mb-1.5 text-[length:var(--fs-xs)] font-medium text-text-300">{children}</div> }
function buildCron(frequency: Frequency, time: string, day: string) { const [hour, minute] = time.split(':'); if (frequency === 'weekdays') return `${minute} ${hour} * * 1-5`; if (frequency === 'weekly') return `${minute} ${hour} * * ${day}`; return `${minute} ${hour} * * *` }
function cronParts(cron: string) { const [minute, hour, , , day] = cron.split(' '); if (!minute || !hour || !day) return { frequency: 'advanced' as Frequency, time: '18:00', day: '1' }; if (day === '*') return { frequency: 'daily' as Frequency, time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day: '1' }; if (day === '1-5') return { frequency: 'weekdays' as Frequency, time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day: '1' }; if (/^[0-6]$/.test(day)) return { frequency: 'weekly' as Frequency, time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day }; return { frequency: 'advanced' as Frequency, time: '18:00', day: '1' } }
function describeCron(cron: string) { const value = cronParts(cron); if (value.frequency === 'advanced') return `Cron ${cron}`; if (value.frequency === 'weekdays') return `工作日 ${value.time}`; if (value.frequency === 'weekly') return `每周${weekdays.find(item => item[0] === value.day)?.[1] ?? value.day} ${value.time}`; return `每天 ${value.time}` }
