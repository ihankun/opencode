export type ParsedNaturalTask = {
  title: string
  prompt: string
  frequency: 'daily' | 'weekdays' | 'weekly'
  time: string
  day: string
}

export function parseNaturalTask(text: string): ParsedNaturalTask | undefined {
  const value = text.trim()
  const time = value.match(/(?:每天|工作日|周[一二三四五六日天])?\s*(\d{1,2})(?:[:：点时](\d{1,2})?)?/)
  if (!time) return
  const hour = Number(time[1])
  const minute = Number(time[2] ?? 0)
  if (hour > 23 || minute > 59) return
  const weekly = value.match(/(?:每)?周([一二三四五六日天])/)
  const frequency = weekly ? 'weekly' as const : value.includes('工作日') ? 'weekdays' as const : 'daily' as const
  const names = '日一二三四五六'
  const day = weekly ? String(weekly[1] === '天' ? 0 : names.indexOf(weekly[1])) : '1'
  const prompt = value.replace(time[0], '').replace(/^每\s*/, '').replace(/^(请|帮我|提醒我)\s*/, '').trim()
  return { title: prompt.slice(0, 24) || '定时任务', prompt: prompt || value, frequency, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, day }
}

export async function createTaskFromCommand(text: string, directory: string | undefined, model: { providerId: string; id: string } | undefined, variant?: string) {
  const parsed = parseNaturalTask(text)
  if (!parsed) throw new Error('无法识别任务时间。示例：/task 每天18点总结今天修改的内容')
  if (!model) throw new Error('当前对话没有可用模型，无法创建定时任务')
  const [hour, minute] = parsed.time.split(':')
  const cron = parsed.frequency === 'weekdays' ? `${minute} ${hour} * * 1-5` : parsed.frequency === 'weekly' ? `${minute} ${hour} * * ${parsed.day}` : `${minute} ${hour} * * *`
  const server = serverStore.getActiveServer()
  if (!server) throw new Error('当前没有可用服务器，无法创建定时任务')
  return window.customOpenCode.createTask({
    title: parsed.title,
    prompt: parsed.prompt,
    cron,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    serverId: server.id,
    serverName: server.name,
    serverUrl: server.url,
    directory: directory ?? '',
    executionMode: 'current',
    worktreeCleanup: 'on-success',
    branch: '',
    permissionProfile: 'risk',
    retryCount: 1,
    retryDelaySeconds: 30,
    completionTimeoutMinutes: 60,
    overlapPolicy: 'skip',
    maxConcurrentRuns: 1,
    missedRunPolicy: 'run-once',
    catchUpWindowMinutes: 60,
    modelProviderID: model.providerId,
    modelID: model.id,
    variant: variant ?? '',
    enabled: true,
  })
}
import { serverStore } from '../store/serverStore'
