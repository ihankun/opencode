import { expect, test } from '@playwright/test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { launchElectronApp, type ElectronTestApp } from './support/electron'

let app: ElectronTestApp
let projectData: string

test.beforeEach(async () => {
  projectData = await mkdtemp(join(tmpdir(), 'opencodex-projects-'))
  await Promise.all([
    mkdir(join(projectData, 'alpha')),
    mkdir(join(projectData, 'beta')),
    mkdir(join(projectData, 'gamma')),
  ])
  app = await launchElectronApp()
  await app.page.evaluate(async input => {
    await window.customOpenCode.updateProjectDirectories('local', input.map((item, index) => ({
      path: item.path,
      name: item.name,
      addedAt: index + 1,
    })))
  }, [
    { path: join(projectData, 'alpha'), name: 'alpha' },
    { path: join(projectData, 'beta'), name: 'beta' },
    { path: join(projectData, 'gamma'), name: 'gamma' },
  ])
  await app.page.reload()
  await app.page.getByRole('button', { name: 'alpha', exact: true }).waitFor({ timeout: 20_000 })
})

test.afterEach(async () => {
  await app?.close()
  await Promise.all([
    rm(projectData, { recursive: true, force: true }),
  ])
})

test('supports project context actions and latest-first pinning without row action buttons', async () => {
  await expect(
    app.page.getByRole('button', { name: /展开项目|折叠项目|expand project|collapse project/i }),
  ).toHaveCount(0)

  const pin = async (name: string) => {
    await app.page.getByRole('button', { name, exact: true }).click({ button: 'right' })
    const menu = app.page.getByRole('menu', { name })
    await expect(menu.getByRole('menuitem')).toHaveCount(3)
    await expect(menu.getByRole('menuitem', { name: /在访达中显示|show in file manager/i })).toBeVisible()
    await menu.getByRole('menuitem', { name: /置顶项目|pin project/i }).click()
  }

  await pin('beta')
  await pin('alpha')
  await expect(app.page.getByText(/^(置顶|Pinned)$/)).toBeVisible()

  const alpha = await app.page.getByRole('button', { name: 'alpha', exact: true }).boundingBox()
  const beta = await app.page.getByRole('button', { name: 'beta', exact: true }).boundingBox()
  expect(alpha?.y).toBeLessThan(beta?.y ?? 0)

  await app.page.getByRole('button', { name: 'alpha', exact: true }).click({ button: 'right' })
  const unpin = app.page
    .getByRole('menu', { name: 'alpha' })
    .getByRole('menuitem', { name: /取消置顶|unpin project/i })
  await expect(unpin).toBeVisible()
  await unpin.click()

  await app.page.getByRole('button', { name: 'gamma', exact: true }).click({ button: 'right' })
  await app.page.getByRole('menu', { name: 'gamma' }).getByRole('menuitem', { name: /移除项目|remove project/i }).click()
  const confirm = app.page.getByRole('dialog', { name: /移除项目|remove project/i })
  await confirm.getByRole('button', { name: /移除|remove/i }).click()
  await expect(app.page.getByRole('button', { name: 'gamma', exact: true })).toHaveCount(0)
})
