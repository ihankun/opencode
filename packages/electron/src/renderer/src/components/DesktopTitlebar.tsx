import { useEffect, useMemo } from 'react'
import {
  DESKTOP_TITLEBAR_HEIGHT,
  DESKTOP_TITLEBAR_Z_INDEX,
} from '../constants'
import { useTheme } from '../hooks/useTheme'
import { getDesktopPlatform, usesCustomDesktopTitlebar } from '../utils/platform'

export function DesktopTitlebar() {
  const { mode } = useTheme()
  const platform = useMemo(() => getDesktopPlatform(), [])
  const isDesktopChrome = useMemo(() => usesCustomDesktopTitlebar(), [])

  useEffect(() => {
    if (!isDesktopChrome) return
    // Windows has a custom title bar row; macOS uses traffic lights overlay.
    const height = platform === 'macos' ? 0 : DESKTOP_TITLEBAR_HEIGHT
    document.documentElement.style.setProperty('--desktop-titlebar-height', `${height}px`)
    return () => {
      document.documentElement.style.removeProperty('--desktop-titlebar-height')
    }
  }, [isDesktopChrome, platform])

  useEffect(() => {
    if (!isDesktopChrome) return

    if (typeof window.customOpenCode?.windowSetTheme !== 'function') return
    void window.customOpenCode.windowSetTheme(mode)
  }, [isDesktopChrome, mode])

  if (!isDesktopChrome) return null

  if (platform === 'windows' || platform === 'macos') return null

  return (
    <header
      className="desktop-titlebar desktop-titlebar-surface window-drag-region relative shrink-0"
      style={{ height: DESKTOP_TITLEBAR_HEIGHT, zIndex: DESKTOP_TITLEBAR_Z_INDEX }}
    />
  )
}
