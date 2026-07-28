import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export type ElectronTestApp = {
  application: ElectronApplication
  page: Page
  userData: string
  close(): Promise<void>
}

export async function launchElectronApp(options?: {
  serverUrl?: string
  settings?: Record<string, string>
}): Promise<ElectronTestApp> {
  const userData = await mkdtemp(join(tmpdir(), 'opencodex-e2e-'))
  await mkdir(userData, { recursive: true })
  await writeFile(
    join(userData, 'renderer-settings.json'),
    `${JSON.stringify({
      version: 1,
      settings: {
        'opencodex:onboarding-completed': 'true',
        ...options?.settings,
      },
    }, null, 2)}\n`,
  )

  const application = await electron.launch({
    executablePath: createRequire(import.meta.url)('electron') as string,
    args: [join(process.cwd(), 'out/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      OPENCODE_E2E_USER_DATA_DIR: userData,
      ...(options?.serverUrl ? { OPENCODE_E2E_SERVER_URL: options.serverUrl } : {}),
    },
  })
  const page = await application.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('button', { name: /新建任务|new task/i }).waitFor({ timeout: 20_000 })

  return {
    application,
    page,
    userData,
    async close() {
      await application.close()
      await rm(userData, { recursive: true, force: true })
    },
  }
}

export async function addProject(page: Page, directory: string, name: string) {
  await page.evaluate(
    async input => {
      await window.customOpenCode.updateProjectDirectories('local', [{
        path: input.directory,
        name: input.name,
        addedAt: Date.now(),
      }])
    },
    { directory, name },
  )
  await page.reload()
  await page.getByRole('button', { name, exact: true }).waitFor({ timeout: 20_000 })
}

