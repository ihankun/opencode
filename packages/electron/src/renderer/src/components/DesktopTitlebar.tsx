import { useEffect, useMemo } from 'react'
import {
  DESKTOP_TITLEBAR_HEIGHT,
  DESKTOP_TITLEBAR_Z_INDEX,
} from '../constants'
import { useTheme } from '../hooks/useTheme'
import { getDesktopPlatform, usesCustomDesktopTitlebar } from '../utils/tauri'

export function DesktopTitlebar() {
  const { mode, resolvedTheme } = useTheme()
  const platform = useMemo(() => getDesktopPlatform(), [])
  const isDesktopChrome = useMemo(() => usesCustomDesktopTitlebar(), [])

  useEffect(() => {
    if (!isDesktopChrome) return
    // Windows controls and macOS traffic lights overlay the existing app headers.
    // Both platforms must avoid adding a second titlebar row to the document flow.
    const height = platform === 'windows' || platform === 'macos' ? 0 : DESKTOP_TITLEBAR_HEIGHT
    document.documentElement.style.setProperty('--desktop-titlebar-height', `${height}px`)
    return () => {
      document.documentElement.style.removeProperty('--desktop-titlebar-height')
    }
  }, [isDesktopChrome, platform])

  useEffect(() => {
    if (!isDesktopChrome) return

    let cancelled = false
    const theme = mode === 'system' ? null : resolvedTheme

    void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      if (cancelled) return
      try {
        await getCurrentWindow().setTheme(theme)
      } catch {
        // best effort
      }
    })

    return () => {
      cancelled = true
    }
  }, [isDesktopChrome, mode, resolvedTheme])

  if (!isDesktopChrome) return null

  if (platform === 'windows' || platform === 'macos') return null

  return (
    <header
      className="desktop-titlebar desktop-titlebar-surface window-drag-region relative shrink-0"
      style={{ height: DESKTOP_TITLEBAR_HEIGHT, zIndex: DESKTOP_TITLEBAR_Z_INDEX }}
    />
  )
}
