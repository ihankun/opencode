import { expect, test } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { addProject, launchElectronApp, type ElectronTestApp } from './support/electron'
import {
  makeSession,
  startMockOpenCode,
  type MessageWithParts,
  type MockOpenCode,
} from './support/mock-opencode'

let app: ElectronTestApp
let backend: MockOpenCode
let project: string

test.beforeEach(async () => {
  project = await mkdtemp(join(tmpdir(), 'opencodex-session-reference-'))
  backend = await startMockOpenCode({
    directory: project,
    sessions: [makeSession('ses_reference', project, '架构讨论')],
  })
  const messages: MessageWithParts[] = [
    {
      info: {
        id: 'msg_reference_user',
        sessionID: 'ses_reference',
        role: 'user',
        time: { created: Date.now() - 2_000 },
      },
      parts: [{
        id: 'part_reference_user',
        sessionID: 'ses_reference',
        messageID: 'msg_reference_user',
        type: 'text',
        text: '跨会话功能应该使用隐藏上下文。',
      }],
    },
    {
      info: {
        id: 'msg_reference_assistant',
        sessionID: 'ses_reference',
        role: 'assistant',
        time: { created: Date.now() - 1_000 },
      },
      parts: [{
        id: 'part_reference_assistant',
        sessionID: 'ses_reference',
        messageID: 'msg_reference_assistant',
        type: 'text',
        text: '可以使用 synthetic text part 注入。',
      }, {
        id: 'part_reference_todo',
        sessionID: 'ses_reference',
        messageID: 'msg_reference_assistant',
        type: 'tool',
        tool: 'todowrite',
        state: {
          status: 'completed',
          input: {
            todos: [{
              content: '不应注入当前会话的历史 Todo',
              status: 'in_progress',
              priority: 'high',
            }],
          },
          output: '',
        },
      }, {
        id: 'part_reference_patch',
        sessionID: 'ses_reference',
        messageID: 'msg_reference_assistant',
        type: 'patch',
        hash: 'historical-patch',
        files: ['src/should-not-leak.ts'],
      }],
    },
  ]
  backend.messages.set('ses_reference', messages)
  app = await launchElectronApp({ serverUrl: backend.url })
  await addProject(app.page, project, 'reference-project')
  await app.page.getByRole('button', { name: 'reference-project', exact: true }).click()
})

test.afterEach(async () => {
  await app?.close()
  await backend?.close()
  await rm(project, { recursive: true, force: true })
})

test('links a sidebar session with # and sends its transcript as hidden context', async () => {
  const composer = app.page.getByRole('textbox', { name: /随心输入|type anything/i })
  await composer.fill('#')

  const menu = app.page.locator('[data-dropdown-open]').filter({ has: app.page.getByText('关联会话', { exact: true }) })
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: /架构讨论/ }).click()
  await expect(composer).toHaveValue('#架构讨论 ')
  await composer.pressSequentially('总结一下这个会话')
  await app.page.getByRole('button', { name: /发送消息|send message/i }).click()

  await expect.poll(() => backend.requests.some(request =>
    request.method === 'POST' && request.pathname.endsWith('/prompt_async'),
  )).toBe(true)
  const prompt = backend.requests.find(request =>
    request.method === 'POST' && request.pathname.endsWith('/prompt_async'),
  )
  expect(prompt?.body).toMatchObject({
    parts: [
      expect.objectContaining({
        type: 'text',
        synthetic: true,
        text: expect.stringContaining('synthetic text part'),
      }),
      expect.objectContaining({
        type: 'text',
        text: '#架构讨论 总结一下这个会话',
      }),
    ],
  })
  expect(prompt?.body).toEqual(expect.objectContaining({
    parts: expect.arrayContaining([
      expect.objectContaining({
        text: expect.stringContaining('historical Todo, tool, patch, permission, and execution parts are intentionally omitted'),
      }),
    ]),
  }))
  expect(JSON.stringify(prompt?.body)).not.toContain('不应注入当前会话的历史 Todo')
  expect(JSON.stringify(prompt?.body)).not.toContain('src/should-not-leak.ts')
  await expect(app.page.getByText('#架构讨论 总结一下这个会话', { exact: true })).toBeVisible()
  await expect(app.page.getByText('跨会话功能应该使用隐藏上下文。', { exact: true })).toHaveCount(0)
})
