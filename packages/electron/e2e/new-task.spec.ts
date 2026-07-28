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
  project = await mkdtemp(join(tmpdir(), 'opencodex-new-task-'))
  backend = await startMockOpenCode({ directory: project })
  app = await launchElectronApp({ serverUrl: backend.url })
  await addProject(app.page, project, 'new-task-project')
})

test.afterEach(async () => {
  await app?.close()
  await backend?.close()
  await rm(project, { recursive: true, force: true })
})

test('creates a new task in the selected project and submits its first prompt', async () => {
  await app.page.getByRole('button', { name: 'new-task-project', exact: true }).click()
  await app.page.getByRole('button', { name: /新建任务|new task/i }).click()
  const composer = app.page.getByRole('textbox', { name: /随心输入|type anything/i })
  await composer.fill('创建一个可验证的新任务')
  await app.page.getByRole('button', { name: /发送消息|send message/i }).click()

  await expect.poll(() => backend.requests.some(request => request.method === 'POST' && request.pathname === '/session')).toBe(true)
  await expect.poll(() => backend.requests.some(request => request.method === 'POST' && request.pathname.endsWith('/prompt_async'))).toBe(true)
  await expect(app.page).toHaveURL(/ses_e2e_1/)
  await expect(app.page.getByText('创建一个可验证的新任务', { exact: true })).toBeVisible()
})

