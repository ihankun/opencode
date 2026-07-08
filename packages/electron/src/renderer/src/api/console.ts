import { apiFetchJson } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'
import { STORAGE_KEY_CONSOLE_ACCOUNT_EMAIL } from '../constants/storage'

interface ConsoleOrg {
  accountID: string
  accountEmail: string
  accountUrl: string
  orgID: string
  orgName: string
  active: boolean
}

interface ConsoleAccount {
  accountID: string
  accountEmail: string
  accountUrl: string
  active: boolean
}

export interface ConsoleProfile {
  account?: ConsoleAccount
  org?: {
    orgID: string
    orgName: string
  }
  accounts: ConsoleAccount[]
}

export interface ConsoleLoginStart {
  code: string
  user: string
  url: string
  server: string
  expiresInMs: number
  intervalMs: number
}

export interface ConsoleLoginPoll {
  status: 'success' | 'pending' | 'slow' | 'expired' | 'denied' | 'error'
  email?: string
  message?: string
}

function experimentalPath(path: string, directory?: string): string {
  const formatted = formatPathForApi(directory)
  if (!formatted) return path

  const params = new URLSearchParams({ directory: formatted })
  return `${path}?${params.toString()}`
}

export async function getConsoleOrgs(directory?: string): Promise<ConsoleOrg[]> {
  return apiFetchJson<{ orgs: ConsoleOrg[] }>(experimentalPath('/experimental/console/orgs', directory)).then(result => result.orgs)
}

export async function getConsoleAccounts(directory?: string): Promise<ConsoleAccount[]> {
  return apiFetchJson<{ accounts: ConsoleAccount[] }>(experimentalPath('/experimental/console/accounts', directory)).then(
    result => result.accounts,
  )
}

export async function getConsoleProfile(directory?: string): Promise<ConsoleProfile> {
  return apiFetchJson<ConsoleProfile>(experimentalPath('/experimental/console/profile', directory))
}

export async function logoutConsoleAccount(accountID?: string, directory?: string): Promise<boolean> {
  return apiFetchJson<boolean>(experimentalPath('/experimental/console/logout', directory), {
    method: 'POST',
    body: JSON.stringify(accountID ? { accountID } : {}),
  })
}

export function getCachedConsoleAccountEmail(): string | null {
  const email = localStorage.getItem(STORAGE_KEY_CONSOLE_ACCOUNT_EMAIL)?.trim()
  return email || null
}

export function setCachedConsoleAccountEmail(email: string | null) {
  if (email?.trim()) {
    localStorage.setItem(STORAGE_KEY_CONSOLE_ACCOUNT_EMAIL, email.trim())
    return
  }

  localStorage.removeItem(STORAGE_KEY_CONSOLE_ACCOUNT_EMAIL)
}

export async function getActiveConsoleAccountEmail(directory?: string): Promise<string | null> {
  const [orgs, accounts] = await Promise.all([
    getConsoleOrgs(directory).catch(() => [] as ConsoleOrg[]),
    getConsoleAccounts(directory).catch(() => [] as ConsoleAccount[]),
  ])
  const email =
    orgs.find(org => org.active)?.accountEmail ??
    accounts.find(account => account.active)?.accountEmail ??
    orgs[0]?.accountEmail ??
    accounts[0]?.accountEmail ??
    getCachedConsoleAccountEmail()
  if (email) setCachedConsoleAccountEmail(email)
  return email
}

export async function startConsoleLogin(directory?: string, url?: string): Promise<ConsoleLoginStart> {
  return apiFetchJson<ConsoleLoginStart>(experimentalPath('/experimental/console/login', directory), {
    method: 'POST',
    body: JSON.stringify(url ? { url } : {}),
  })
}

export async function pollConsoleLogin(login: ConsoleLoginStart, directory?: string): Promise<ConsoleLoginPoll> {
  return apiFetchJson<ConsoleLoginPoll>(experimentalPath('/experimental/console/login/poll', directory), {
    method: 'POST',
    body: JSON.stringify(login),
  })
}

export async function waitConsoleLogin(login: ConsoleLoginStart, directory?: string): Promise<ConsoleLoginPoll> {
  if (typeof window !== 'undefined' && typeof window.customOpenCode?.waitConsoleLogin === 'function') {
    return window.customOpenCode.waitConsoleLogin(login)
  }

  return apiFetchJson<ConsoleLoginPoll>(experimentalPath('/experimental/console/login/wait', directory), {
    method: 'POST',
    body: JSON.stringify(login),
  })
}
