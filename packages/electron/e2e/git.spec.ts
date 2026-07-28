import { expect, test } from '@playwright/test'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { addProject, launchElectronApp, type ElectronTestApp } from './support/electron'

const run = promisify(execFile)
let app: ElectronTestApp
let project: string

test.beforeEach(async () => {
  project = await mkdtemp(join(tmpdir(), 'opencodex-git-'))
  await run('git', ['init', '-b', 'main'], { cwd: project })
  await run('git', ['config', 'user.email', 'e2e@opencodex.local'], { cwd: project })
  await run('git', ['config', 'user.name', 'OpenCodex E2E'], { cwd: project })
  await writeFile(join(project, 'tracked.txt'), 'before\n')
  await run('git', ['add', 'tracked.txt'], { cwd: project })
  await run('git', ['commit', '-m', 'initial'], { cwd: project })
  await writeFile(join(project, 'tracked.txt'), 'before\nafter\n')

  app = await launchElectronApp()
  await addProject(app.page, project, 'git-project')
  await app.page.evaluate(async directory => {
    const state = await window.customOpenCode.server()
    if (state.status !== 'online') throw new Error('Local server is not online')
    const response = await fetch(`${state.server.url}/session?directory=${encodeURIComponent(directory)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Git E2E session' }),
    })
    if (!response.ok) throw new Error(`Failed to seed session: ${response.status}`)
  }, project)
  await app.page.reload()
  await app.page.getByRole('button', { name: 'git-project', exact: true }).click()
  await app.page.getByRole('button', { name: /Git E2E session/ }).click()
})

test.afterEach(async () => {
  await app?.close()
  await rm(project, { recursive: true, force: true })
})

test('shows an uncommitted file and stages it from the Git actions menu', async () => {
  await app.page.getByRole('button', { name: /打开面板|open panel/i }).click()
  await app.page.getByText(/^(变更|changes)$/i).click()
  await app.page.getByRole('button', { name: /变更模式|change mode/i }).click()
  await app.page.getByRole('menuitemradio', { name: /Git 变更|Git changes/i }).click()
  const changedFile = app.page.getByRole('button', { name: /^tracked\.txt \+/ }).first()
  await expect(changedFile).toBeVisible()

  await changedFile.click()
  await app.page.getByRole('button', { name: /Git 操作|Git actions/i }).click()
  await app.page.getByRole('menuitem', { name: /^暂存当前文件$|^stage current file$/i }).click()
  await expect.poll(async () => (await run('git', ['diff', '--cached', '--name-only'], { cwd: project })).stdout.trim()).toBe('tracked.txt')
})
