import { describe, expect, test } from 'bun:test'
import type { Config } from '../types/api/config'
import { filterRendererSettings, sanitizeOpenCodeConfig } from './settingsBackupSafety'

describe('settings backup safety', () => {
  test('filters secrets and runtime state from renderer settings', () => {
    expect(filterRendererSettings({
      'theme-mode': 'dark',
      'opencodex:accessibility': '{"reduceMotion":true}',
      'opencode-service-env-vars': '[{"key":"TOKEN","value":"secret"}]',
      'opencode:notifications': '[{"body":"private"}]',
      'opencodex-workspace-checkpoints': '{"files":[]}',
      'opencodex.automation.handled-runs.v1': '["run-1"]',
      'model-usage-stats': '{"provider/model":10}',
      'opencodex.automation.templates.v1': JSON.stringify([{
        name: 'Daily',
        input: {
          notificationChannels: ['desktop', 'webhook'],
          notificationWebhookUrl: 'https://example.com/hooks/secret',
        },
      }]),
    })).toEqual({
      'theme-mode': 'dark',
      'opencodex:accessibility': '{"reduceMotion":true}',
      'opencodex.automation.templates.v1': JSON.stringify([{
        name: 'Daily',
        input: {
          notificationChannels: ['desktop'],
          notificationWebhookUrl: '',
        },
      }]),
    })
  })

  test('removes nested credential fields from OpenCode configuration', () => {
    const config = {
      model: 'openai/gpt-5',
      provider: {
        openai: {
          options: {
            apiKey: 'secret',
            headers: { Authorization: 'Bearer secret' },
            baseURL: 'https://api.openai.com/v1',
          },
        },
      },
      mcp: {
        safe: {
          type: 'remote',
          url: 'https://example.com/mcp',
          token: 'secret',
        },
      },
    } as unknown as Config

    expect(sanitizeOpenCodeConfig(config)).toEqual({
      model: 'openai/gpt-5',
      provider: {
        openai: {
          options: {
            baseURL: 'https://api.openai.com/v1',
          },
        },
      },
      mcp: {
        safe: {
          type: 'remote',
          url: 'https://example.com/mcp',
        },
      },
    })
  })
})
