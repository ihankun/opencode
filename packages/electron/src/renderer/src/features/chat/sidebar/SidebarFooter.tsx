import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { ShareDialog } from '../ShareDialog'
import {
  CogIcon,
  ExternalLinkIcon,
  KeyIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  SystemIcon,
  ShareIcon,
  UsersIcon,
} from '../../../components/Icons'
import { Dialog } from '../../../components/ui'
import { refreshModels, useTheme } from '../../../hooks'
import {
  disposeInstance,
  getProviders,
  logoutConsoleAccount,
  removeProviderAuth,
  setProviderAuth,
} from '../../../api'
import { openUrl } from '../../../utils/browserOpen'

function AccountIndicator({ connectionState, size = 24 }: { connectionState: string; size?: number }) {
  const statusColor =
    connectionState === 'connected'
      ? 'bg-success-100'
      : connectionState === 'connecting'
        ? 'bg-warning-100 animate-pulse'
        : connectionState === 'error'
          ? 'bg-danger-100'
          : 'bg-text-500'

  return (
    <div
      className="relative shrink-0 rounded-full border border-border-200/60 bg-bg-200/70"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-1.5 rounded-full bg-text-400/25" />
      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg-200 ${statusColor}`} />
    </div>
  )
}

function OpenCodeLoginDialog({
  isOpen,
  onClose,
  onLoggedIn,
}: {
  isOpen: boolean
  onClose: () => void
  onLoggedIn: () => void
}) {
  const { t } = useTranslation(['chat'])
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const onLoggedInRef = useRef(onLoggedIn)

  useEffect(() => {
    onLoggedInRef.current = onLoggedIn
  }, [onLoggedIn])

  const reset = useCallback(() => {
    setApiKey('')
    setStatus('idle')
    setError('')
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const save = useCallback(async () => {
    const key = apiKey.trim()
    if (!key) {
      setStatus('error')
      setError(t('accountLogin.apiKeyRequired'))
      return
    }

    setStatus('saving')
    setError('')
    try {
      await setProviderAuth('opencode', { type: 'api', key })
      await logoutConsoleAccount().catch(() => undefined)
      await disposeInstance()
      await refreshModels()
      setStatus('success')
      onLoggedInRef.current()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [apiKey, t])

  useEffect(() => {
    if (status !== 'success') return

    const timer = setTimeout(handleClose, 900)
    return () => clearTimeout(timer)
  }, [handleClose, status])

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={t('accountLogin.title')} width={440}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border-200/60 bg-bg-100/60 p-3 text-[length:var(--fs-sm)] text-text-300">
          {t('accountLogin.description')}
        </div>

        <button
          type="button"
          onClick={() => void openUrl('https://opencode.ai/auth')}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-main-100 px-3 py-2 text-[length:var(--fs-sm)] font-medium text-white transition-opacity hover:opacity-90"
        >
          <ExternalLinkIcon size={15} />
          {t('accountLogin.openBrowser')}
        </button>

        <div className="space-y-2">
          <label className="text-[length:var(--fs-xs)] font-medium text-text-400" htmlFor="opencode-api-key">
            {t('accountLogin.apiKey')}
          </label>
          <input
            id="opencode-api-key"
            type="password"
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            placeholder={t('accountLogin.apiKeyPlaceholder')}
            className="w-full rounded-lg border border-border-200 bg-bg-000 px-3 py-2 text-[length:var(--fs-sm)] text-text-100 outline-none transition-colors placeholder:text-text-500 focus:border-accent-main-100"
          />
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={status === 'saving'}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-bg-200 px-3 py-2 text-[length:var(--fs-sm)] font-medium text-text-100 transition-colors hover:bg-bg-300 disabled:opacity-60"
        >
          <KeyIcon size={15} />
          {t(status === 'saving' ? 'accountLogin.saving' : 'accountLogin.save')}
        </button>

        {status === 'success' && (
          <div className="text-[length:var(--fs-sm)] text-success-100">{t('accountLogin.success')}</div>
        )}
        {status === 'error' && (
          <div className="text-[length:var(--fs-sm)] text-danger-100">
            {t('accountLogin.error')}
            {error ? `：${error}` : ''}
          </div>
        )}
      </div>
    </Dialog>
  )
}

function OpenCodeProfileDialog({
  isOpen,
  onClose,
  connected,
}: {
  isOpen: boolean
  onClose: () => void
  connected: boolean
}) {
  const { t } = useTranslation(['chat'])

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('accountProfile.title')} width={420}>
      <div className="space-y-3 text-[length:var(--fs-sm)]">
        <div className="rounded-lg border border-border-200/60 bg-bg-100/60 p-3">
          <div className="mb-1 text-[length:var(--fs-xs)] font-medium text-text-400">{t('accountProfile.provider')}</div>
          <div className="font-medium text-text-100">OpenCode Zen</div>
        </div>
        <div className="rounded-lg border border-border-200/60 bg-bg-100/60 p-3">
          <div className="mb-1 text-[length:var(--fs-xs)] font-medium text-text-400">{t('accountProfile.status')}</div>
          <div className={connected ? 'text-success-100' : 'text-text-400'}>
            {connected ? t('accountProfile.connected') : t('accountProfile.notLoggedIn')}
          </div>
        </div>
        <div className="rounded-lg border border-border-200/60 bg-bg-100/60 p-3 text-text-300">
          {t('accountProfile.description')}
        </div>
      </div>
    </Dialog>
  )
}

export interface SidebarFooterProps {
  showLabels: boolean
  connectionState: string
  onOpenSettings?: () => void
}

export function SidebarFooter({ showLabels, connectionState, onOpenSettings }: SidebarFooterProps) {
  const { t } = useTranslation(['chat', 'common'])
  const { mode: themeMode, setThemeWithAnimation: onThemeChange } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 260, fromBottom: false })
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [opencodeConnected, setOpencodeConnected] = useState(false)
  const [accountActionError, setAccountActionError] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const prevShowLabelsRef = useRef(showLabels)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 菜单中连接状态显示用
  const statusColorClass =
    {
      connected: 'bg-success-100',
      connecting: 'bg-warning-100 animate-pulse',
      disconnected: 'bg-text-500',
      error: 'bg-danger-100',
    }[connectionState] || 'bg-text-500'
  const connectionLabel = t(`sidebar.connection.${connectionState}`, {
    defaultValue: t('sidebar.connection.unknown'),
  })
  const refreshOpencodeConnection = useCallback(() => {
    return getProviders()
      .then(result => {
        const connected = result.connected.includes('opencode')
        setOpencodeConnected(connected)
        return connected
      })
      .catch(() => {
        setOpencodeConnected(false)
        return false
      })
  }, [])

  // 打开菜单
  const openMenu = useCallback(() => {
    if (!buttonRef.current || !containerRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const menuWidth = showLabels ? containerRect.width : 260

    if (showLabels) {
      // 展开模式：菜单底部在容器上方，留点间隙
      setMenuPos({
        top: containerRect.top - 8,
        left: containerRect.left,
        width: menuWidth,
        fromBottom: true,
      })
    } else {
      // 收起模式：菜单在按钮右侧，底部对齐按钮底部
      setMenuPos({
        top: buttonRect.bottom, // 用作 bottom 计算的参考点
        left: buttonRect.right + 16, // 间距增加到 16px
        width: 260,
        fromBottom: true, // 也用 bottom 定位
      })
    }

    setIsOpen(true)
    requestAnimationFrame(() => setIsVisible(true))
  }, [showLabels])

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setIsVisible(false)
    // 使用 ref 追踪 timeout 以便清理
    const closeTimeoutId = setTimeout(() => setIsOpen(false), 150)
    // 保存到 ref 以便清理
    closeTimeoutIdRef.current = closeTimeoutId
  }, [])

  const handleLogout = useCallback(async () => {
    closeMenu()
    setAccountActionError('')
    try {
      await removeProviderAuth('opencode')
      await logoutConsoleAccount().catch(() => undefined)
      await disposeInstance()
      setOpencodeConnected(false)
      await refreshModels()
    } catch (err) {
      setAccountActionError(err instanceof Error ? err.message : String(err))
    }
  }, [closeMenu])

  // 切换菜单
  const toggleMenu = useCallback(() => {
    if (isOpen) closeMenu()
    else openMenu()
  }, [isOpen, openMenu, closeMenu])

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      closeMenu()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, closeMenu])

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, closeMenu])

  // 侧边栏状态变化时关闭
  useEffect(() => {
    const showLabelsChanged = prevShowLabelsRef.current !== showLabels
    prevShowLabelsRef.current = showLabels

    let frameId: number | null = null

    if (showLabelsChanged && isOpen) {
      frameId = requestAnimationFrame(() => closeMenu())
    }

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [showLabels, isOpen, closeMenu])

  // 清理 closeTimeout 防止内存泄漏
  useEffect(() => {
    return () => {
      if (closeTimeoutIdRef.current) {
        clearTimeout(closeTimeoutIdRef.current)
        closeTimeoutIdRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let disposed = false
    refreshOpencodeConnection().then(connected => {
      if (!disposed) setOpencodeConnected(connected)
    })
    return () => {
      disposed = true
    }
  }, [refreshOpencodeConnection])

  // 浮动菜单
  const floatingMenu = isOpen
    ? createPortal(
        <div
          ref={menuRef}
          className={`
        fixed z-[9999] rounded-lg border border-border-200/60 glass-alt shadow-lg overflow-hidden
        transition-all duration-150 ease-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
          style={{
            bottom: window.innerHeight - menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            transformOrigin: showLabels ? 'bottom left' : 'bottom left',
          }}
        >
          {/* Theme Selector */}
          <div className="relative p-2">
            <div className="text-[length:var(--fs-xxs)] font-bold text-text-400 uppercase tracking-wider px-1 mb-1.5">
              {t('sidebar.appearance')}
            </div>
            <div className="flex bg-bg-200/50 p-1 rounded-md border border-border-200/30 relative isolate">
              <div
                className="absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/3)] bg-bg-000 rounded-sm shadow-sm ring-1 ring-border-200/50 transition-transform duration-300 ease-out -z-10"
                style={{
                  transform:
                    themeMode === 'system'
                      ? 'translateX(0%)'
                      : themeMode === 'light'
                        ? 'translateX(100%)'
                        : 'translateX(200%)',
                }}
              />
              {(['system', 'light', 'dark'] as const).map(m => (
                <button
                  key={m}
                  onClick={e => onThemeChange(m, e)}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded-sm text-[length:var(--fs-sm)] font-medium transition-colors duration-200 ${
                    themeMode === m ? 'text-text-100' : 'text-text-400 hover:text-text-200'
                  }`}
                >
                  {m === 'system' && <SystemIcon size={14} />}
                  {m === 'light' && <SunIcon size={14} />}
                  {m === 'dark' && <MoonIcon size={14} />}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" />
          </div>

          {/* Menu Items */}
          <div className="p-1">
            {accountActionError && (
              <div className="mx-2 my-1 rounded-md bg-danger-100/10 px-2 py-1.5 text-[length:var(--fs-xs)] text-danger-100">
                {accountActionError}
              </div>
            )}
            <button
              onClick={() => {
                closeMenu()
                setLoginDialogOpen(true)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[length:var(--fs-sm)] text-text-300 hover:text-text-100 hover:bg-bg-200/50 transition-colors text-left"
            >
              <KeyIcon size={14} />
              <span>{t('sidebar.accountLogin')}</span>
            </button>

            <button
              onClick={() => {
                closeMenu()
                setProfileDialogOpen(true)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[length:var(--fs-sm)] text-text-300 hover:text-text-100 hover:bg-bg-200/50 transition-colors text-left"
            >
              <UsersIcon size={14} />
              <span>{t('sidebar.accountProfile')}</span>
            </button>

            {opencodeConnected && (
              <button
                onClick={() => void handleLogout()}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[length:var(--fs-sm)] text-text-300 hover:text-text-100 hover:bg-bg-200/50 transition-colors text-left"
              >
                <LogOutIcon size={14} />
                <span>{t('sidebar.accountLogout')}</span>
              </button>
            )}

            <button
              onClick={() => {
                closeMenu()
                setShareDialogOpen(true)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[length:var(--fs-sm)] text-text-300 hover:text-text-100 hover:bg-bg-200/50 transition-colors text-left"
            >
              <ShareIcon size={14} />
              <span>{t('sidebar.shareChat')}</span>
            </button>

            <button
              onClick={() => {
                closeMenu()
                onOpenSettings?.()
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[length:var(--fs-sm)] text-text-300 hover:text-text-100 hover:bg-bg-200/50 transition-colors text-left"
            >
              <CogIcon size={14} />
              <span>{t('sidebar.settings')}</span>
            </button>
          </div>

          {/* Connection Status */}
          <div className="relative flex items-center gap-2 px-3 py-2 text-[length:var(--fs-xxs)] text-text-300 cursor-default">
            <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-border-200/30" />
            <div className={`w-1.5 h-1.5 rounded-full ${statusColorClass}`} />
            <span>{connectionLabel}</span>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div className="shrink-0 pb-[var(--safe-area-inset-bottom)]">
      <div ref={containerRef} className="flex flex-col gap-0.5 mx-2 py-2">
        {/* 状态/设置触发按钮 */}
        <button
          ref={buttonRef}
          onClick={toggleMenu}
          className={`
            h-8 flex items-center rounded-lg transition-all duration-300 group overflow-hidden
            ${isOpen ? 'bg-bg-200 text-text-100' : 'text-text-300 hover:text-text-100 hover:bg-bg-200'}
          `}
          style={{
            width: showLabels ? '100%' : 32,
            paddingLeft: showLabels ? 6 : 4, // 收起时为了对齐中心线(16px)，24px圆环需要4px padding (4+12=16)
            paddingRight: showLabels ? 8 : 4,
          }}
          title={opencodeConnected ? t('accountProfile.connected') : t('accountProfile.notLoggedIn')}
        >
          <AccountIndicator connectionState={connectionState} size={24} />

          <span
            className="ml-2 flex-1 flex items-center justify-between min-w-0 transition-opacity duration-300"
            style={{ opacity: showLabels ? 1 : 0 }}
          >
            <span className="text-[length:var(--fs-sm)] text-text-300 truncate">
              {opencodeConnected ? t('accountProfile.connected') : t('accountProfile.notLoggedIn')}
            </span>
          </span>
        </button>
      </div>

      {floatingMenu}
      <ShareDialog isOpen={shareDialogOpen} onClose={() => setShareDialogOpen(false)} />
      <OpenCodeProfileDialog
        isOpen={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        connected={opencodeConnected}
      />
      <OpenCodeLoginDialog
        isOpen={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onLoggedIn={() => {
          setOpencodeConnected(true)
          void refreshOpencodeConnection()
        }}
      />
    </div>
  )
}
