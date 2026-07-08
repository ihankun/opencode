import { STORAGE_KEY_BROWSER_OPEN_MODE } from '../constants/storage'
import { isTauri } from './tauri'

export type BrowserOpenMode = 'internal' | 'system'

export function getBrowserOpenMode(): BrowserOpenMode {
  return localStorage.getItem(STORAGE_KEY_BROWSER_OPEN_MODE) === 'system' ? 'system' : 'internal'
}

export function setBrowserOpenMode(mode: BrowserOpenMode) {
  if (mode === 'system') {
    localStorage.setItem(STORAGE_KEY_BROWSER_OPEN_MODE, 'system')
    return
  }
  localStorage.removeItem(STORAGE_KEY_BROWSER_OPEN_MODE)
}

export async function openUrl(url: string, mode: BrowserOpenMode = getBrowserOpenMode()) {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && typeof window.customOpenCode?.openExternalUrl === 'function') {
      await window.customOpenCode.openExternalUrl(url)
      return
    }
    if (isTauri()) {
      const opener = await import('@tauri-apps/plugin-opener')
      await opener.openUrl(url)
      return
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
