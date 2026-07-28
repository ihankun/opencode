import { expect, test } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { addProject, launchElectronApp, type ElectronTestApp } from './support/electron'
import { makeSession, startMockOpenCode, type MockOpenCode } from './support/mock-opencode'

let app: ElectronTestApp
let backend: MockOpenCode
let project: string
const permission = {
  id: 'per_e2e_1',
  sessionID: 'ses_permission',
  permission: 'bash',
  patterns: ['git status'],
  metadata: {},
  always: ['git status*'],
}

test.beforeEach(async () => {
  project = await mkdtemp(join(tmpdir(), 'opencodex-permission-'))
  backend = await startMockOpenCode({
    directory: project,
    sessions: [makeSession('ses_permission', project, '权限审批测试')],
  })
  app = await launchElectronApp({
    serverUrl: backend.url,
    settings: { 'inline-tool-requests': 'false' },
  })
  await addProject(app.page, project, 'permission-project')
  await app.page.getByRole('button', { name: 'permission-project', exact: true }).click()
  await app.page.getByRole('button', { name: /权限审批测试/ }).click()
})

test.afterEach(async () => {
  await app?.close()
  await backend?.close()
  await rm(project, { recursive: true, force: true })
})

test('shows a pending permission and submits an allow-once decision', async () => {
  backend.permissions.push(permission)
  backend.emit(project, 'permission.asked', permission)
  const allowOnce = app.page.getByRole('button', { name: /允许一次|allow once/i })
  await expect(allowOnce).toBeVisible()
  await expect(app.page.getByText('git status', { exact: true })).toBeVisible()
  await allowOnce.click()

  await expect(allowOnce).toBeHidden()
  await expect.poll(() => backend.requests.some(request =>
    request.method === 'POST' &&
    request.pathname === '/session/ses_permission/permissions/per_e2e_1' &&
    JSON.stringify(request.body).includes('once'),
  )).toBe(true)
})
