import { expect, test } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { addProject, launchElectronApp, type ElectronTestApp } from './support/electron'
import { startMockOpenCode, type MockOpenCode } from './support/mock-opencode'

let app: ElectronTestApp
let backend: MockOpenCode
let project: string

test.beforeEach(async () => {
  project = await mkdtemp(join(tmpdir(), 'opencodex-message-stream-'))
  backend = await startMockOpenCode({ directory: project })
  app = await launchElectronApp({ serverUrl: backend.url })
  await addProject(app.page, project, 'stream-project')
  await app.page.getByRole('button', { name: 'stream-project', exact: true }).click()
})

test.afterEach(async () => {
  await app?.close()
  await backend?.close()
  await rm(project, { recursive: true, force: true })
})

test('renders user content, incremental assistant deltas, and the completed state', async () => {
  const composer = app.page.getByRole('textbox', { name: /随心输入|type anything/i })
  await composer.fill('测试消息流')
  await app.page.getByRole('button', { name: /发送消息|send message/i }).click()

  await expect(app.page.getByText('测试消息流', { exact: true })).toBeVisible()
  await expect(app.page.getByText('正在流式', { exact: true })).toBeVisible()
  await expect(app.page.getByText('正在流式返回结果', { exact: true })).toBeVisible()
  await expect(app.page.getByRole('button', { name: /停止生成|stop generating/i })).toHaveCount(0)
  await expect(app.page.getByRole('textbox', { name: /回复 Agent|reply to agent/i })).toBeEnabled()
  await expect(app.page.getByRole('button', { name: /发送消息|send message/i })).toBeDisabled()
})
