import { expect, test } from '@playwright/test'
import { launchElectronApp, type ElectronTestApp } from './support/electron'
import { startMockOpenCode, type MockOpenCode } from './support/mock-opencode'

let app: ElectronTestApp
let backend: MockOpenCode

test.beforeEach(async () => {
  backend = await startMockOpenCode()
  app = await launchElectronApp({ serverUrl: backend.url })
  await app.page.route('https://api.github.com/repos/ihankun/opencodex/releases/latest', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      tag_name: 'v99.0.0',
      html_url: 'https://github.com/ihankun/opencodex/releases/tag/v99.0.0',
      published_at: '2026-07-28T00:00:00.000Z',
      name: 'E2E Release',
    }),
  }))
})

test.afterEach(async () => {
  await app?.close()
  await backend?.close()
})

test('checks for updates and exposes the latest release action', async () => {
  await app.page.evaluate(() => window.dispatchEvent(new Event('titlebar:open-settings')))
  const settings = app.page.getByRole('dialog', { name: /设置|settings/i })
  await settings.getByRole('tab', { name: /关于|about/i }).click()
  await settings.getByRole('button', { name: /检查更新|check for updates/i }).click()

  await expect(settings.getByText(/发现新版本.*99\.0\.0|version 99\.0\.0 is available/i)).toBeVisible()
  await expect(settings.getByRole('button', { name: /前往 GitHub 下载|download from GitHub/i })).toBeVisible()
})
