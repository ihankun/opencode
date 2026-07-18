import { isElectron, isTauri, isTauriMobile } from '../utils/tauri'

export type PlatformKind = 'electron' | 'tauri-desktop' | 'tauri-mobile' | 'web'

let nativeFetch: typeof globalThis.fetch | null = null
let nativeFetchLoading: Promise<typeof globalThis.fetch> | null = null

export function platformKind(): PlatformKind {
  if (isElectron()) return 'electron'
  if (isTauriMobile()) return 'tauri-mobile'
  if (isTauri()) return 'tauri-desktop'
  return 'web'
}

export const platformCapabilities = {
  get secureCredentials() { return platformKind() === 'electron' },
  get nativeFilesystem() { return platformKind() === 'electron' || platformKind().startsWith('tauri') },
  get nativeNotifications() { return platformKind() === 'electron' || platformKind().startsWith('tauri') },
  get managedLocalServer() { return platformKind() === 'electron' || platformKind() === 'tauri-desktop' },
  get internalBrowser() { return platformKind() === 'electron' },
}

export async function preparePlatformNetwork() {
  if (!isTauri() || nativeFetch) return
  nativeFetchLoading ??= import('@tauri-apps/plugin-http').then(module => {
    nativeFetch = module.fetch as unknown as typeof globalThis.fetch
    return nativeFetch
  })
  await nativeFetchLoading
}

export async function platformFetch(input: RequestInfo | URL, init?: RequestInit) {
  await preparePlatformNetwork()
  return (nativeFetch ?? globalThis.fetch)(input, init)
}

export async function platformOpenUrl(url: string, mode: 'internal' | 'system') {
  if (mode === 'internal' && typeof window.customOpenCode?.openInternalUrl === 'function') {
    await window.customOpenCode.openInternalUrl(url)
    return
  }
  if (typeof window.customOpenCode?.openExternalUrl === 'function') {
    await window.customOpenCode.openExternalUrl(url)
    return
  }
  if (isTauri()) {
    const opener = await import('@tauri-apps/plugin-opener')
    await opener.openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function initialOpenDirectory() {
  if (!isTauri()) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string | null>('get_cli_directory')
}

export async function onOpenDirectory(listener: (directory: string) => void) {
  if (!isTauri()) return () => undefined
  const { listen } = await import('@tauri-apps/api/event')
  return listen<string>('open-directory', event => listener(event.payload))
}
