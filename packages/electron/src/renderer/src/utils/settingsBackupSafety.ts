import type { Config } from '../types/api/config'

const RENDERER_RUNTIME_KEYS = new Set([
  'console-account-email',
  'last-directory',
  'model-usage-stats',
  'opencode-service-env-vars',
  'opencode-session-orders',
  'opencode:notifications',
  'opencodex-workspace-checkpoints',
  'opencodex.automation.handled-runs.v1',
  'opencodex:conversation-metadata',
  'opencodex:project-environment-snapshots',
  'selected-project-id',
  'session-model-selection',
])

export function filterRendererSettings(settings: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(settings)
      .filter(([key]) => !RENDERER_RUNTIME_KEYS.has(key))
      .map(([key, value]) => [
        key,
        key === 'opencodex.automation.templates.v1' ? sanitizeAutomationTemplates(value) : value,
      ]),
  )
}

export function isRendererRuntimeSetting(key: string) {
  return RENDERER_RUNTIME_KEYS.has(key)
}

export function sanitizeOpenCodeConfig(config: Config): Config {
  return sanitizeConfigValue(config) as Config
}

function sanitizeConfigValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeConfigValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSecretConfigKey(key))
      .map(([key, item]) => [key, sanitizeConfigValue(item)]),
  )
}

function isSecretConfigKey(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, '')
  return [
    'apikey',
    'authorization',
    'credential',
    'credentials',
    'env',
    'environment',
    'header',
    'headers',
    'password',
    'secret',
    'token',
  ].some(value => normalized === value || normalized.endsWith(value))
}

function sanitizeAutomationTemplates(value: string) {
  try {
    const templates: unknown = JSON.parse(value)
    if (!Array.isArray(templates)) return '[]'
    return JSON.stringify(templates.map(template => {
      if (!template || typeof template !== 'object') return template
      const input = 'input' in template && template.input && typeof template.input === 'object'
        ? template.input as Record<string, unknown>
        : undefined
      if (!input) return template
      return {
        ...template,
        input: {
          ...input,
          notificationChannels: Array.isArray(input.notificationChannels)
            ? input.notificationChannels.filter(channel => channel === 'desktop')
            : [],
          notificationWebhookUrl: '',
        },
      }
    }))
  } catch {
    return '[]'
  }
}
