import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../../components/ui/Dialog'
import { CheckIcon, GlobeIcon, KeyIcon, SpinnerIcon, WifiIcon, WifiOffIcon } from '../../../components/Icons'
import { useServerStore, useRouter } from '../../../hooks'
import { messageStore } from '../../../store'
import type { ServerConfig, ServerHealth } from '../../../store/serverStore'

// 左下角服务器菜单的「切换服务器」弹窗：列出已维护的服务器，点击即可快速切换。
// 切换逻辑与设置-服务器页一致：健康检查通过 → 清空当前会话 → 设置 active → 回首页。
export function ServerSwitchDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation(['chat', 'settings', 'common'])
  const { servers, activeServer, setActiveServer, checkHealth, checkAllHealth, getHealth } = useServerStore()
  const { navigateHome, sessionId: routeSessionId } = useRouter()
  const [switchingId, setSwitchingId] = useState<string>()
  const [switchError, setSwitchError] = useState<string>()

  // 打开时刷新一次健康状态，让列表展示最新连通性
  useEffect(() => {
    if (isOpen) void checkAllHealth()
  }, [isOpen, checkAllHealth])

  useEffect(() => {
    if (isOpen) setSwitchError(undefined)
  }, [isOpen])

  // 固定排列：默认（本机）服务器在最上面，其余按添加顺序
  const orderedServers = useMemo(() => {
    const defaultServer = servers.find(server => server.isDefault)
    if (!defaultServer) return servers
    return [defaultServer, ...servers.filter(server => !server.isDefault)]
  }, [servers])

  const handleSelect = useCallback(
    async (server: ServerConfig) => {
      if (switchingId) return
      if (activeServer?.id === server.id) {
        onClose()
        return
      }
      setSwitchError(undefined)
      setSwitchingId(server.id)
      const health = await checkHealth(server.id)
      setSwitchingId(undefined)
      if (health.status !== 'online') {
        setSwitchError(t('settings:servers.switchUnavailable'))
        return
      }
      // 清理当前 session 的 store 状态后切换，避免跨服务器残留
      if (routeSessionId) messageStore.clearSession(routeSessionId)
      setActiveServer(server.id) // 内部触发 serverChangeListeners → 整体刷新
      navigateHome(null)
      onClose()
    },
    [activeServer?.id, checkHealth, navigateHome, onClose, routeSessionId, setActiveServer, switchingId, t],
  )

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={440}
      title={
        <div className="flex items-center gap-2">
          <GlobeIcon size={16} className="text-text-300" />
          {t('chat:sidebar.switchServer')}
        </div>
      }
    >
      <div className="space-y-1.5">
        {orderedServers.map(server => (
          <ServerSwitchRow
            key={server.id}
            server={server}
            health={getHealth(server.id)}
            isActive={activeServer?.id === server.id}
            switching={switchingId === server.id}
            onSelect={() => void handleSelect(server)}
          />
        ))}

        {servers.length === 0 && (
          <div className="py-8 text-center text-[length:var(--fs-sm)] text-text-400">{t('settings:servers.noServersConfigured')}</div>
        )}

        {switchError && <div className="px-1 pt-1 text-[length:var(--fs-xs)] text-danger-100">{switchError}</div>}
      </div>
    </Dialog>
  )
}

function ServerSwitchRow({
  server,
  health,
  isActive,
  switching,
  onSelect,
}: {
  server: ServerConfig
  health: ServerHealth | null
  isActive: boolean
  switching: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation(['chat', 'settings', 'common'])

  const statusContent = () => {
    if (switching) return <SpinnerIcon size={13} className="animate-spin text-text-400" />
    if (!health || health.status === 'checking') return <SpinnerIcon size={13} className="animate-spin text-text-400" />
    if (health.status === 'online') return <WifiIcon size={13} className="text-success-100" />
    if (health.status === 'unauthorized') return <KeyIcon size={13} className="text-warning-100" />
    return <WifiOffIcon size={13} className="text-danger-100" />
  }

  const statusLabel = () => {
    if (!health) return t('settings:servers.checkHealth')
    switch (health.status) {
      case 'checking':
        return t('settings:servers.checking')
      case 'online':
        return `${t('chat:sidebar.connection.connected')}${health.latency != null ? ` · ${health.latency}ms` : ''}`
      case 'unauthorized':
        return t('settings:servers.invalidCredentials')
      case 'offline':
        return health.error || t('common:offline')
      case 'error':
        return health.error || t('common:error')
      default:
        return t('common:unknown')
    }
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={switching}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        isActive
          ? 'bg-bg-200/60 ring-1 ring-border-200/60'
          : 'hover:bg-bg-200/40'
      } disabled:cursor-wait`}
    >
      <div className={`relative shrink-0 ${isActive ? 'text-accent-main-100' : 'text-text-400'}`}>
        <GlobeIcon size={17} />
        {isActive && (
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-main-100 text-oncolor-100">
            <CheckIcon size={9} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[length:var(--fs-sm)] font-medium text-text-100">
          {server.name}
          {server.isDefault && <span className="ml-1.5 text-[length:var(--fs-xxs)] font-normal text-text-400">({t('chat:sidebar.active')})</span>}
        </div>
        <div className="truncate text-[length:var(--fs-xxs)] text-text-400">{server.url}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-[length:var(--fs-xxs)] text-text-400">
        {statusContent()}
        <span className="max-w-40 truncate">{statusLabel()}</span>
      </div>
    </button>
  )
}
