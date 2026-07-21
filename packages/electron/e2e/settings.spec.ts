import { expect, test, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let application: ElectronApplication
let page: Page
let userData: string

test.beforeEach(async () => {
  userData = await mkdtemp(join(tmpdir(), 'opencodex-e2e-'))
  application = await electron.launch({
    executablePath: createRequire(import.meta.url)('electron') as string,
    args: [`--user-data-dir=${userData}`, join(process.cwd(), 'out/main/index.js')],
    env: { ...process.env, NODE_ENV: 'test' },
  })
  page = await application.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('button', { name: /新建任务|new task/i }).waitFor({ timeout: 20_000 })
})

test.afterEach(async () => {
  await application?.close()
  await rm(userData, { recursive: true, force: true })
})

test('opens and closes settings from the desktop event', async () => {
  const guide = page.getByRole('dialog', { name: /首次使用引导|getting started/i })
  if (await guide.isVisible()) await guide.getByRole('button', { name: /跳过引导|skip/i }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('titlebar:open-settings')))
  const settings = page.getByRole('dialog', { name: /设置|settings/i })
  await expect(settings).toBeVisible()
  await settings.getByRole('button', { name: /关闭设置|close settings/i }).click()
  await expect(settings).toBeHidden()
})

test('first-use guide can be skipped and stays completed', async () => {
  await page.evaluate(() => window.dispatchEvent(new Event('onboarding:restart')))
  const guide = page.getByRole('dialog', { name: /首次使用引导|getting started/i })
  await expect(guide).toBeVisible()
  await guide.getByRole('button', { name: /跳过引导|skip/i }).click()
  await expect(guide).toBeHidden()
  expect(await page.evaluate(() => localStorage.getItem('opencodex:onboarding-completed'))).toBe('true')
})
