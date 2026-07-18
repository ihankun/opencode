import i18n from '../i18n'
import { serverStore } from '../store/serverStore'
import { parseNaturalTask } from './taskParser'
export { parseNaturalTask } from './taskParser'
export type { ParsedNaturalTask } from './taskParser'

export async function createTaskFromCommand(text: string, directory: string | undefined, model: { providerId: string; id: string } | undefined, variant?: string) {
  const parsed = parseNaturalTask(text)
  if (!parsed) throw new Error(i18n.t('components:taskPanel.naturalTimeError'))
  if (!model) throw new Error(i18n.t('components:taskPanel.noModelError'))
  const [hour, minute] = parsed.time.split(':')
  const cron = parsed.frequency === 'weekdays' ? `${minute} ${hour} * * 1-5` : parsed.frequency === 'weekly' ? `${minute} ${hour} * * ${parsed.day}` : `${minute} ${hour} * * *`
  const server = serverStore.getActiveServer()
  if (!server) throw new Error(i18n.t('components:taskPanel.noServerError'))
  return window.customOpenCode.createTask({
    title: parsed.title || i18n.t('components:taskPanel.defaultTaskTitle'),
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
    triggerType: 'schedule',
    triggerTaskId: '',
    dependencyTaskIds: [],
    notificationChannels: ['desktop'],
    notificationWebhookUrl: '',
    modelProviderID: model.providerId,
    modelID: model.id,
    variant: variant ?? '',
    enabled: true,
  })
}
