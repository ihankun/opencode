import { expect, test } from '@playwright/test'
import { launchElectronApp, type ElectronTestApp } from './support/electron'

let app: ElectronTestApp

test.beforeEach(async () => {
  app = await launchElectronApp()
})

test.afterEach(async () => {
  await app?.close()
})

test('opens and closes settings from the desktop event', async () => {
  await app.page.evaluate(() => window.dispatchEvent(new Event('titlebar:open-settings')))
  const settings = app.page.getByRole('dialog', { name: /设置|settings/i })
  await expect(settings).toBeVisible()
  await settings.getByRole('button', { name: /关闭设置|close settings/i }).click()
  await expect(settings).toBeHidden()
})

test('shows consolidated extension tabs and closes settings above the draggable header', async () => {
  await expect(app.page.getByRole('button', { name: /^(技能|skills)$/i })).toHaveCount(0)
  await app.page.getByRole('button', { name: /插件|plugins/i }).click()
  await expect(app.page.getByText(/扩展与能力|extensions (?:&|and) capabilities/i)).toBeVisible()
  const extensionTabs = app.page.getByRole('tablist', { name: /扩展与能力|extensions (?:&|and) capabilities/i }).getByRole('tab')
  await expect(extensionTabs).toHaveCount(4)
  await expect(extensionTabs.nth(0)).toHaveAccessibleName(/技能|skills/i)
  await expect(extensionTabs.nth(1)).toHaveAccessibleName(/插件|plugins/i)
  await expect(extensionTabs.nth(2)).toHaveAccessibleName(/^MCP$/)
  await expect(extensionTabs.nth(3)).toHaveAccessibleName(/专家套件|expert kits/i)
  await expect(extensionTabs.locator('svg')).toHaveCount(4)

  await app.page.evaluate(() => window.dispatchEvent(new Event('titlebar:open-settings')))
  const settings = app.page.getByRole('dialog', { name: /设置|settings/i })
  await expect(settings).toBeVisible()
  await settings.getByRole('button', { name: /关闭设置|close settings/i }).click()
  await expect(settings).toBeHidden()
})

test('first-use guide can be skipped and stays completed', async () => {
  await app.page.evaluate(() => window.dispatchEvent(new Event('onboarding:restart')))
  const guide = app.page.getByRole('dialog', { name: /首次使用引导|getting started/i })
  await expect(guide).toBeVisible()
  await guide.getByRole('button', { name: /跳过引导|skip/i }).click()
  await expect(guide).toBeHidden()
  expect(await app.page.evaluate(() => localStorage.getItem('opencodex:onboarding-completed'))).toBe('true')
})
