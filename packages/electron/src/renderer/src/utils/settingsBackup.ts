import {
  STORAGE_KEY_BROWSER_OPEN_MODE,
  STORAGE_KEY_NOTIFICATIONS_ENABLED,
  STORAGE_KEY_NOTIFICATIONS_ONLY_WHEN_UNFOCUSED,
} from '../constants/storage'
import { getConfig, getGlobalConfig, updateConfig, updateGlobalConfig } from '../api/config'
import {
  exportLayoutBackup,
  exportNotificationEventSettingsBackup,
  exportNotificationPreferencesBackup,
  exportServerSettingsBackup,
  exportThemeBackup,
  exportUpdateSettingsBackup,
  importLayoutBackup,
  importNotificationEventSettingsBackup,
  importNotificationPreferencesBackup,
  importServerSettingsBackup,
  importThemeBackup,
  importUpdateSettingsBackup,
  type LayoutBackup,
  type NotificationEventSettingsBackup,
  type NotificationPreferencesBackup,
  type ServerSettingsBackup,
  type ThemeBackup,
  type UpdateSettingsBackup,
} from '../store'
import { exportKeybindingBackup, importKeybindingBackup, type KeybindingBackup } from '../store/keybindingStore'
import { exportSoundBackup, importSoundBackup, type SoundBackup } from '../store/soundStore'
import type { Config } from '../types/api/config'
import type { DesktopPreferences } from '../../../shared/desktopPreferences'
import type { ImBridgeConfig } from '../../../shared/imBridge'
import type { ProjectState } from '../../../shared/projects'
import type { SpeechModelPreferences } from '../../../shared/speechModel'
import {
  exportPerServerStorageBackup,
  importPerServerStorageBackup,
  type PerServerStorageBackup,
} from './perServerStorage'
import { snapshotRendererSettings } from '../rendererSettings'
import {
  filterRendererSettings,
  isRendererRuntimeSetting,
  sanitizeOpenCodeConfig,
} from './settingsBackupSafety'

const BACKUP_KIND = 'settings-backup'
const BACKUP_SCHEMA_VERSION = 4
const SECRET_MASK = '••••••••'

type Task = Awaited<ReturnType<Window['customOpenCode']['listTasks']>>[number]
type TaskInput = Parameters<Window['customOpenCode']['createTask']>[0]
type TaskSettings = Awaited<ReturnType<Window['customOpenCode']['taskSettings']>>
type SecurityConfig = Awaited<ReturnType<Window['customOpenCode']['security']>>

export interface NotificationBackup {
  browserNotificationsEnabled: boolean
  browserNotificationsOnlyWhenUnfocused: boolean
  browserOpenMode?: 'internal' | 'system'
  toast: NotificationPreferencesBackup
  events: NotificationEventSettingsBackup
}

export interface AutomationBackup {
  settings: TaskSettings
  tasks: Array<{
    sourceId: string
    input: TaskInput
  }>
}

export interface OpenCodeConfigBackup {
  global: Config
  projectState: ProjectState
  openCodeGoWorkspaceId: string
  projects: Array<{
    directory: string
    config: Config
  }>
}

export interface SettingsBackupModules {
  theme: ThemeBackup
  layout: LayoutBackup
  servers: ServerSettingsBackup
  perServerStorage: PerServerStorageBackup
  keybindings: KeybindingBackup
  notifications: NotificationBackup
  sound: SoundBackup
  update: UpdateSettingsBackup
  rendererSettings: Record<string, string>
  desktopPreferences: DesktopPreferences
  speechModel: SpeechModelPreferences
  security: SecurityConfig
  imBridge: ImBridgeConfig
  openCode: OpenCodeConfigBackup
  automations: AutomationBackup
}

export interface SettingsBackupFile {
  app: 'OpenCodex'
  kind: typeof BACKUP_KIND
  schemaVersion: typeof BACKUP_SCHEMA_VERSION
  createdAt: string
  manifest?: {
    included: string[]
    excluded: string[]
    managedSecretsExcluded: true
    mayContainUserContent: true
  }
  modules: SettingsBackupModules
}

function exportNotificationBackup(): NotificationBackup {
  return {
    browserNotificationsEnabled: localStorage.getItem(STORAGE_KEY_NOTIFICATIONS_ENABLED) === 'true',
    browserNotificationsOnlyWhenUnfocused:
      localStorage.getItem(STORAGE_KEY_NOTIFICATIONS_ONLY_WHEN_UNFOCUSED) === 'true',
    browserOpenMode: localStorage.getItem(STORAGE_KEY_BROWSER_OPEN_MODE) === 'system' ? 'system' : 'internal',
    toast: exportNotificationPreferencesBackup(),
    events: exportNotificationEventSettingsBackup(),
  }
}

function importNotificationBackup(raw: unknown): void {
  const parsed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : undefined
  const browserNotificationsEnabled = parsed?.browserNotificationsEnabled === true
  const browserNotificationsOnlyWhenUnfocused = parsed?.browserNotificationsOnlyWhenUnfocused === true
  const browserOpenMode = parsed?.browserOpenMode === 'system' ? 'system' : 'internal'

  if (browserNotificationsEnabled) {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS_ENABLED, 'true')
  } else {
    localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS_ENABLED)
  }

  if (browserNotificationsOnlyWhenUnfocused) {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS_ONLY_WHEN_UNFOCUSED, 'true')
  } else {
    localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS_ONLY_WHEN_UNFOCUSED)
  }

  if (browserOpenMode === 'system') {
    localStorage.setItem(STORAGE_KEY_BROWSER_OPEN_MODE, 'system')
  } else {
    localStorage.removeItem(STORAGE_KEY_BROWSER_OPEN_MODE)
  }

  importNotificationPreferencesBackup(parsed?.toast)
  importNotificationEventSettingsBackup(parsed?.events)
}

function normalizeBackupFile(raw: unknown): SettingsBackupFile {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file')
  }

  const parsed = raw as Record<string, unknown>
  if (parsed.app !== 'OpenCodex' || parsed.kind !== BACKUP_KIND || parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error('Unsupported backup format')
  }

  if (!parsed.modules || typeof parsed.modules !== 'object') {
    throw new Error('Missing backup modules')
  }

  const modules = parsed.modules as Record<string, unknown>
  const requiredModules: Array<keyof SettingsBackupModules> = [
    'theme',
    'layout',
    'servers',
    'perServerStorage',
    'keybindings',
    'notifications',
    'sound',
    'update',
    'rendererSettings',
    'desktopPreferences',
    'speechModel',
    'security',
    'imBridge',
    'openCode',
    'automations',
  ]

  requiredModules.forEach(id => {
    if (!(id in modules)) throw new Error(`Missing backup module: ${id}`)
  })

  return {
    app: 'OpenCodex',
    kind: BACKUP_KIND,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    modules: modules as unknown as SettingsBackupModules,
  }
}

function buildBackupFileName(createdAt: string): string {
  const safeTimestamp = createdAt.replace(/[:]/g, '-').replace(/\.\d+Z$/, 'Z')
  return `opencodex-settings-backup-${safeTimestamp}.json`
}

export async function exportSettingsBackup(): Promise<{ fileName: string; data: Uint8Array }> {
  const createdAt = new Date().toISOString()
  const projectState = await window.customOpenCode.projectState('local')
  const [rendererSettings, desktopPreferences, speechModel, security, imBridge, automations, globalConfig, openCodeGoQuota, projectConfigs] = await Promise.all([
    window.customOpenCode.rendererSettings(),
    window.customOpenCode.desktopPreferences(),
    window.customOpenCode.speechModelConfig(),
    window.customOpenCode.security(),
    window.customOpenCode.imBridgeConfig(),
    Promise.all([window.customOpenCode.taskSettings(), window.customOpenCode.listTasks()]),
    getGlobalConfig(),
    window.customOpenCode.openCodeGoQuotaConfig(),
    Promise.all(projectState.directories.map(async item => ({
      directory: item.path,
      config: sanitizeOpenCodeConfig(await getConfig(item.path)),
    }))),
  ])
  const backup: SettingsBackupFile = {
    app: 'OpenCodex',
    kind: BACKUP_KIND,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt,
    manifest: {
      included: [
        'all safe renderer preferences',
        'desktop, speech, security, and IM bridge preferences',
        'server profiles and per-server preferences',
        'OpenCode global and saved-project configuration',
        'automation definitions and scheduler settings',
      ],
      excluded: [
        'credentials, API keys, tokens, and secrets',
        'automation webhook secrets',
        'session, automation run, notification, checkpoint, and diagnostic history',
        'cache files, memory contents, and generated runtime data',
      ],
      managedSecretsExcluded: true,
      mayContainUserContent: true,
    },
    modules: {
      theme: exportThemeBackup(),
      layout: exportLayoutBackup(),
      servers: exportServerSettingsBackup(),
      perServerStorage: exportPerServerStorageBackup(),
      keybindings: exportKeybindingBackup(),
      notifications: exportNotificationBackup(),
      sound: await exportSoundBackup(),
      update: exportUpdateSettingsBackup(),
      rendererSettings: filterRendererSettings(rendererSettings),
      desktopPreferences,
      speechModel: {
        provider: speechModel.provider,
        baseUrl: speechModel.baseUrl,
        model: speechModel.model,
        language: speechModel.language,
      },
      security,
      imBridge: redactImBridgeSecrets(imBridge),
      openCode: {
        global: sanitizeOpenCodeConfig(globalConfig),
        projectState,
        openCodeGoWorkspaceId: openCodeGoQuota.workspaceId,
        projects: projectConfigs,
      },
      automations: {
        settings: automations[0],
        tasks: automations[1].map(task => ({
          sourceId: task.id,
          input: taskInputFromTask(task),
        })),
      },
    },
  }

  return {
    fileName: buildBackupFileName(createdAt),
    data: new TextEncoder().encode(`${JSON.stringify(backup, null, 2)}\n`),
  }
}

export async function importSettingsBackup(file: File): Promise<void> {
  const text = await file.text()
  const backup = normalizeBackupFile(parseBackupJson(text))

  importThemeBackup(backup.modules.theme)
  importLayoutBackup(backup.modules.layout)
  await importServerSettingsBackup(backup.modules.servers)
  importPerServerStorageBackup(backup.modules.perServerStorage)
  importKeybindingBackup(backup.modules.keybindings)
  importNotificationBackup(backup.modules.notifications)
  await importSoundBackup(backup.modules.sound)
  importUpdateSettingsBackup(backup.modules.update)

  await Promise.all([
    window.customOpenCode.updateDesktopPreferences(backup.modules.desktopPreferences),
    window.customOpenCode.updateSpeechModelConfig(backup.modules.speechModel),
    window.customOpenCode.updateSecurity(backup.modules.security),
    window.customOpenCode.updateImBridgeConfig(backup.modules.imBridge),
    importOpenCodeConfig(backup.modules.openCode),
    importAutomations(backup.modules.automations),
  ])

  importRendererSettings(backup.modules.rendererSettings)
  await window.customOpenCode.updateRendererSettings(snapshotRendererSettings(localStorage))
}

export function previewBackupMeta(file: File): Promise<{ createdAt: string | null }> {
  return file.text().then(text => {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      return { createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : null }
    } catch {
      return { createdAt: null }
    }
  })
}

function parseBackupJson(text: string) {
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid backup file')
  }
}

function redactImBridgeSecrets(config: ImBridgeConfig): ImBridgeConfig {
  const redact = (value: string) => value ? SECRET_MASK : ''
  return {
    ...config,
    feishu: {
      ...config.feishu,
      appSecret: redact(config.feishu.appSecret),
      verificationToken: redact(config.feishu.verificationToken),
      encryptKey: redact(config.feishu.encryptKey),
    },
    qq: { ...config.qq, secret: redact(config.qq.secret) },
    telegram: { ...config.telegram, botToken: redact(config.telegram.botToken) },
    discord: { ...config.discord, botToken: redact(config.discord.botToken) },
    wechat: { ...config.wechat, token: redact(config.wechat.token) },
    dingtalk: { ...config.dingtalk, appSecret: redact(config.dingtalk.appSecret) },
  }
}

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
    triggerType: task.triggerType,
    triggerTaskId: task.triggerTaskId,
    dependencyTaskIds: task.dependencyTaskIds,
    notificationChannels: task.notificationChannels.filter(channel => channel === 'desktop'),
    notificationWebhookUrl: '',
    modelProviderID: task.modelProviderID,
    modelID: task.modelID,
    variant: task.variant,
    enabled: task.enabled,
  }
}

async function importOpenCodeConfig(backup: OpenCodeConfigBackup) {
  await Promise.all([
    updateGlobalConfig(backup.global),
    window.customOpenCode.updateProjectDirectories('local', backup.projectState.directories),
    window.customOpenCode.updateRecentProjects('local', backup.projectState.recentProjects),
    window.customOpenCode.updateOpenCodeGoQuotaConfig({ workspaceId: backup.openCodeGoWorkspaceId }),
    ...backup.projects.map(item => updateConfig(item.config, item.directory)),
  ])
}

async function importAutomations(backup: AutomationBackup) {
  const currentTasks = await window.customOpenCode.listTasks()
  const currentById = new Map(currentTasks.map(task => [task.id, task]))
  const idMap = new Map<string, string>()
  const imported = await Promise.all(backup.tasks.map(async task => {
    const current = currentById.get(task.sourceId)
    const input = {
      ...task.input,
      triggerType: 'schedule' as const,
      triggerTaskId: '',
      dependencyTaskIds: [],
    }
    const next = current
      ? await window.customOpenCode.updateTask(current.id, input)
      : await window.customOpenCode.createTask(input)
    idMap.set(task.sourceId, next.id)
    return { task, next }
  }))
  await Promise.all(imported.map(item => window.customOpenCode.updateTask(item.next.id, {
    ...item.task.input,
    triggerTaskId: idMap.get(item.task.input.triggerTaskId) ?? '',
    dependencyTaskIds: item.task.input.dependencyTaskIds.flatMap(id => {
      const mapped = idMap.get(id)
      return mapped ? [mapped] : []
    }),
  })))
  await window.customOpenCode.updateTaskSettings(backup.settings)
}

function importRendererSettings(settings: Record<string, string>) {
  Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => key !== null && !isRendererRuntimeSetting(key))
    .forEach(key => localStorage.removeItem(key))
  Object.entries(filterRendererSettings(settings))
    .forEach(([key, value]) => localStorage.setItem(key, value))
}
