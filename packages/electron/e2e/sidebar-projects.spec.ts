import { expect, test, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let application: ElectronApplication
let page: Page
let userData: string
let projectData: string

test.beforeEach(async () => {
  userData = await mkdtemp(join(tmpdir(), 'opencodex-e2e-'))
  projectData = await mkdtemp(join(tmpdir(), 'opencodex-projects-'))
  await Promise.all([
    mkdir(join(projectData, 'alpha')),
    mkdir(join(projectData, 'beta')),
    mkdir(join(projectData, 'gamma')),
  ])
  application = await electron.launch({
    executablePath: createRequire(import.meta.url)('electron') as string,
    args: [`--user-data-dir=${userData}`, join(process.cwd(), 'out/main/index.js')],
    env: { ...process.env, NODE_ENV: 'test' },
  })
  page = await application.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('button', { name: /新建任务|new task/i }).waitFor({ timeout: 20_000 })

  const guide = page.getByRole('dialog', { name: /首次使用引导|getting started/i })
  if (await guide.isVisible()) await guide.getByRole('button', { name: /跳过引导|skip/i }).click()
  await page.evaluate(paths => {
    localStorage.setItem(
      'srv:local:opencode-saved-directories',
      JSON.stringify(paths.map((path, index) => ({
        path,
        name: path.split('/').at(-1),
        addedAt: index + 1,
      }))),
    )
  }, [
    join(projectData, 'alpha'),
    join(projectData, 'beta'),
    join(projectData, 'gamma'),
  ])
  await page.reload()
  await page.getByRole('button', { name: 'alpha', exact: true }).waitFor({ timeout: 20_000 })
})

test.afterEach(async () => {
  await application?.close()
  await Promise.all([
    rm(userData, { recursive: true, force: true }),
    rm(projectData, { recursive: true, force: true }),
  ])
})

test('supports project context actions and latest-first pinning without row action buttons', async () => {
  await expect(
    page.getByRole('button', { name: /展开项目|折叠项目|expand project|collapse project/i }),
  ).toHaveCount(0)

  const pin = async (name: string) => {
    await page.getByRole('button', { name, exact: true }).click({ button: 'right' })
    const menu = page.getByRole('menu', { name })
    await expect(menu.getByRole('menuitem')).toHaveCount(3)
    await expect(menu.getByRole('menuitem', { name: /在访达中显示|show in file manager/i })).toBeVisible()
    await menu.getByRole('menuitem', { name: /置顶项目|pin project/i }).click()
  }

  await pin('beta')
  await pin('alpha')
  await expect(page.getByText(/^(置顶|Pinned)$/)).toBeVisible()

  const alpha = await page.getByRole('button', { name: 'alpha', exact: true }).boundingBox()
  const beta = await page.getByRole('button', { name: 'beta', exact: true }).boundingBox()
  expect(alpha?.y).toBeLessThan(beta?.y ?? 0)

  await page.getByRole('button', { name: 'alpha', exact: true }).click({ button: 'right' })
  const unpin = page
    .getByRole('menu', { name: 'alpha' })
    .getByRole('menuitem', { name: /取消置顶|unpin project/i })
  await expect(unpin).toBeVisible()
  await unpin.click()

  await page.getByRole('button', { name: 'gamma', exact: true }).click({ button: 'right' })
  await page.getByRole('menu', { name: 'gamma' }).getByRole('menuitem', { name: /移除项目|remove project/i }).click()
  const confirm = page.getByRole('dialog', { name: /移除项目|remove project/i })
  await confirm.getByRole('button', { name: /移除|remove/i }).click()
  await expect(page.getByRole('button', { name: 'gamma', exact: true })).toHaveCount(0)
})
