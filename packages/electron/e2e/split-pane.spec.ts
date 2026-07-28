import { expect, test } from '@playwright/test'
import { launchElectronApp, type ElectronTestApp } from './support/electron'
import { startMockOpenCode, type MockOpenCode } from './support/mock-opencode'

let app: ElectronTestApp
let backend: MockOpenCode

test.beforeEach(async () => {
  backend = await startMockOpenCode()
  app = await launchElectronApp({ serverUrl: backend.url })
})

test.afterEach(async () => {
  await app?.close()
  await backend?.close()
})

test('splits the active conversation into two independently focusable panes', async () => {
  await expect(app.page.getByRole('button', { name: 'Split pane' })).toHaveCount(1)
  await app.page.getByRole('button', { name: 'Split pane' }).click()

  await expect(app.page.getByRole('button', { name: 'Split pane' })).toHaveCount(0)
  await expect(app.page.getByRole('button', { name: 'Close pane' })).toHaveCount(2)
  const composers = app.page.getByRole('textbox', { name: /随心输入|type anything/i })
  await expect(composers).toHaveCount(2)
  await composers.nth(1).fill('第二个分屏')
  await expect(composers.nth(0)).toHaveValue('')
  await expect(composers.nth(1)).toHaveValue('第二个分屏')
})
