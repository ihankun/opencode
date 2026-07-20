import {
  STORAGE_KEY_BROWSER_OPEN_MODE,
  STORAGE_KEY_NOTIFICATIONS_ENABLED,
  STORAGE_KEY_NOTIFICATIONS_ONLY_WHEN_UNFOCUSED,
} from '../constants/storage'
import {
  exportLayoutBackup,
  exportNotificationEventSettingsBackup,
  exportNotificationPreferencesBackup,
  exportServerSettingsBackup,
  exportServiceSettingsBackup,
  exportThemeBackup,
  exportUpdateSettingsBackup,
  importLayoutBackup,
  importNotificationEventSettingsBackup,
  importNotificationPreferencesBackup,
  importServerSettingsBackup,
  importServiceSettingsBackup,
  importThemeBackup,
  importUpdateSettingsBackup,
  type LayoutBackup,
  type NotificationEventSettingsBackup,
  type NotificationPreferencesBackup,
  type ServerSettingsBackup,
  type ServiceSettingsBackup,
  type ThemeBackup,
  type UpdateSettingsBackup,
} from '../store'
import { exportKeybindingBackup, importKeybindingBackup, type KeybindingBackup } from '../store/keybindingStore'
import { exportSoundBackup, importSoundBackup, type SoundBackup } from '../store/soundStore'
import {
  exportPerServerStorageBackup,
  importPerServerStorageBackup,
  type PerServerStorageBackup,
} from './perServerStorage'

const BACKUP_KIND = 'settings-backup'
const BACKUP_SCHEMA_VERSION = 2

export interface NotificationBackup {
  browserNotificationsEnabled: boolean
  browserNotificationsOnlyWhenUnfocused: boolean
  browserOpenMode?: 'internal' | 'system'
  toast: NotificationPreferencesBackup
  events: NotificationEventSettingsBackup
}

export interface SettingsBackupModules {
  theme: ThemeBackup
  layout: LayoutBackup
  servers: ServerSettingsBackup
  perServerStorage: PerServerStorageBackup
  service: ServiceSettingsBackup
  keybindings: KeybindingBackup
  notifications: NotificationBackup
  sound: SoundBackup
  update: UpdateSettingsBackup
}

export interface SettingsBackupFile {
  app: 'OpenCodex'
  kind: typeof BACKUP_KIND
  schemaVersion: typeof BACKUP_SCHEMA_VERSION
  createdAt: string
  manifest?: {
    included: string[]
    excluded: string[]
    containsSecrets: false
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
    'service',
    'keybindings',
    'notifications',
    'sound',
    'update',
  ]

  for (const id of requiredModules) {
    if (!(id in modules)) {
      throw new Error(`Missing backup module: ${id}`)
    }
  }

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
  const backup: SettingsBackupFile = {
    app: 'OpenCodex',
    kind: BACKUP_KIND,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt,
    manifest: {
      included: ['theme', 'layout', 'server profiles (without credentials)', 'per-server UI preferences', 'service preferences', 'keybindings', 'notifications', 'sound', 'update preferences'],
      excluded: ['credentials and API keys', 'OpenCode provider authentication', 'IM bot secrets', 'automations and run history', 'hooks', 'memory files', 'security policy', 'OpenCode project configuration'],
      containsSecrets: false,
    },
    modules: {
      theme: exportThemeBackup(),
      layout: exportLayoutBackup(),
      servers: exportServerSettingsBackup(),
      perServerStorage: exportPerServerStorageBackup(),
      service: exportServiceSettingsBackup(),
      keybindings: exportKeybindingBackup(),
      notifications: exportNotificationBackup(),
      sound: await exportSoundBackup(),
      update: exportUpdateSettingsBackup(),
    },
  }

  return {
    fileName: buildBackupFileName(createdAt),
    data: new TextEncoder().encode(`${JSON.stringify(backup, null, 2)}\n`),
  }
}

export async function importSettingsBackup(file: File): Promise<void> {
  const text = await file.text()
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid backup file')
  }

  const backup = normalizeBackupFile(parsed)

  importThemeBackup(backup.modules.theme)
  importLayoutBackup(backup.modules.layout)
  await importServerSettingsBackup(backup.modules.servers)
  importPerServerStorageBackup(backup.modules.perServerStorage)
  importServiceSettingsBackup(backup.modules.service)
  importKeybindingBackup(backup.modules.keybindings)
  importNotificationBackup(backup.modules.notifications)
  await importSoundBackup(backup.modules.sound)
  importUpdateSettingsBackup(backup.modules.update)
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
