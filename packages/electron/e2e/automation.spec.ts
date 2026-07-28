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
  project = await mkdtemp(join(tmpdir(), 'opencodex-automation-'))
  backend = await startMockOpenCode({ directory: project })
  app = await launchElectronApp({ serverUrl: backend.url })
  await addProject(app.page, project, 'automation-project')
})

test.afterEach(async () => {
  await app?.close()
  await backend?.close()
  await rm(project, { recursive: true, force: true })
})

test('creates and pauses a scheduled automation through the desktop UI', async () => {
  await app.page.getByRole('button', { name: /自动化|automations/i }).click()
  await expect(app.page.getByRole('heading', { name: /自动化|automations/i })).toBeVisible()
  await app.page.getByRole('button', { name: /^新建任务$|^new automation$/i }).last().click()
  const dialog = app.page.getByRole('dialog', { name: /新建任务|new automation/i })
  await dialog.getByRole('textbox', { name: /名称|name/i }).fill('每日 E2E 检查')
  await dialog.getByRole('textbox', { name: /要执行的指令|task instructions/i }).fill('检查关键路径并汇总')
  await expect(dialog.getByRole('combobox', { name: /运行模型|model/i })).not.toHaveValue('')
  await dialog.getByRole('button', { name: /^保存$|^save$/i }).click()

  await expect(app.page.getByText('每日 E2E 检查', { exact: true })).toBeVisible()
  const toggle = app.page.getByRole('switch', { name: /暂停|pause/i })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(app.page.getByRole('switch', { name: /启用|enable/i })).toHaveAttribute('aria-checked', 'false')
  await expect.poll(async () => (await app.page.evaluate(() => window.customOpenCode.listTasks()))[0]?.enabled).toBe(false)
})
