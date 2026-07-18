import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import {
  GlobeIcon,
  PlusIcon,
  TrashIcon,
  WifiIcon,
  WifiOffIcon,
  SpinnerIcon,
  KeyIcon,
  PencilIcon,
} from '../../../components/Icons'
import { useServerStore, useRouter } from '../../../hooks'
import { messageStore } from '../../../store'
import { SettingsCard } from './SettingsUI'
import type { ServerConfig, ServerHealth } from '../../../store/serverStore'

const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/

function isHttpsIpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '')
    return parsed.protocol === 'https:' && (IPV4_PATTERN.test(hostname) || hostname.includes(':'))
  } catch {
    return false
  }
}

function isRemoteHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase()
    const loopback = hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.')
    return parsed.protocol === 'http:' && !loopback
  } catch {
    return false
  }
}

// ============================================
// Server Item
// ============================================

function ServerItem({
  server,
  health,
  isActive,
  onSelect,
  onDelete,
  onEdit,
  onCheckHealth,
}: {
  server: ServerConfig
  health: ServerHealth | null
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onEdit: (updates: { name: string; url: string; allowInsecureHttp: boolean; username?: string; password?: string }) => void
  onCheckHealth: () => void
}) {
  const { t } = useTranslation(['settings', 'common'])
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const statusIcon = () => {
    if (!health || health.status === 'checking') return <SpinnerIcon size={12} className="animate-spin text-text-400" />
    if (health.status === 'online') return <WifiIcon size={12} className="text-success-100" />
    if (health.status === 'unauthorized') return <KeyIcon size={12} className="text-warning-100" />
    return <WifiOffIcon size={12} className="text-danger-100" />
  }

  const statusTitle = () => {
    if (!health) return t('servers.checkHealth')
    switch (health.status) {
      case 'checking':
        return t('servers.checking')
      case 'online':
        return `${t('servers.onlineLatency', { latency: health.latency })}${health.version ? ` · OpenCode v${health.version}` : ''}`
      case 'unauthorized':
        return t('servers.invalidCredentials')
      case 'offline':
        return health.error || t('common:offline')
      case 'error':
        return health.error || t('common:error')
      default:
        return t('common:unknown')
    }
  }

  if (editing) {
    return (
      <EditServerForm
        server={server}
        onSave={updates => {
          onEdit(updates)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <>
      <div
        onClick={onSelect}
        className={`group flex items-center gap-3 p-2.5 rounded-lg border transition-colors
          ${
            isActive ? 'border-accent-main-100/40 bg-accent-main-100/5' : 'border-border-200/40 hover:border-border-300'
          }`}
      >
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onSelect()
          }}
          aria-current={isActive ? 'true' : undefined}
          className="min-w-0 flex flex-1 items-center gap-3 bg-transparent border-none p-0 text-left"
        >
          <GlobeIcon size={14} className={isActive ? 'text-accent-main-100' : 'text-text-400'} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[length:var(--fs-md)] font-medium text-text-100 truncate">{server.name}</span>
              {isActive && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[length:var(--fs-xxs)] font-medium text-accent-main-100 bg-accent-main-100/10 shrink-0">
                  {t('servers.current')}
                </span>
              )}
            </div>
            <div className="text-[length:var(--fs-xs)] text-text-400 truncate font-mono flex items-center gap-1">
              {server.url}
              {server.auth?.password && <KeyIcon size={10} className="shrink-0 text-text-400" />}
            </div>
            {health?.status === 'online' ? (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span className={`rounded px-1.5 py-0.5 text-[length:var(--fs-xxs)] ${health.compatibility === 'current' ? 'bg-success-100/10 text-success-100' : health.compatibility === 'legacy' ? 'bg-warning-100/10 text-warning-100' : 'bg-danger-100/10 text-danger-100'}`}>
                  {t(`servers.compatibility.${health.compatibility ?? 'incompatible'}`)}
                </span>
                {health.capabilities?.worktree ? <span className="rounded bg-bg-300/50 px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400">Worktree</span> : null}
                {health.capabilities?.vcsMutations ? <span className="rounded bg-bg-300/50 px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400">Git</span> : null}
                {health.capabilities?.workspaceCheckpoints ? <span className="rounded bg-bg-300/50 px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400">{t('servers.capabilities.checkpoints')}</span> : null}
              </div>
            ) : null}
          </div>
        </button>
        <button
          type="button"
          className="p-2 rounded hover:bg-bg-200 transition-colors"
          onClick={e => {
            e.stopPropagation()
            onCheckHealth()
          }}
          title={statusTitle()}
          aria-label={statusTitle()}
        >
          {statusIcon()}
        </button>
        {!server.isDefault && (
          <>
            <button
              type="button"
              className="p-2 rounded text-text-400 hover:text-accent-main-100 hover:bg-accent-main-100/10 transition-all"
              onClick={e => {
                e.stopPropagation()
                setEditing(true)
              }}
              title={t('servers.editServer')}
              aria-label={t('servers.editServer')}
            >
              <PencilIcon size={12} />
            </button>
            <button
              type="button"
              className="p-2 rounded text-text-400 hover:text-danger-100 hover:bg-danger-100/10 transition-all"
              onClick={e => {
                e.stopPropagation()
                setConfirmDelete(true)
              }}
              title={t('common:remove')}
              aria-label={t('common:remove')}
            >
              <TrashIcon size={12} />
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          onDelete()
        }}
        title={t('servers.deleteServer')}
        description={t('servers.deleteServerConfirm', { name: server.name })}
        confirmText={t('common:delete')}
        cancelText={t('common:cancel')}
        variant="danger"
      />
    </>
  )
}

// ============================================
// Edit Server Form (inline)
// ============================================

function EditServerForm({
  server,
  onSave,
  onCancel,
}: {
  server: ServerConfig
  onSave: (updates: { name: string; url: string; allowInsecureHttp: boolean; username?: string; password?: string }) => void
  onCancel: () => void
}) {
  const { t } = useTranslation(['settings', 'common'])
  const [name, setName] = useState(server.name)
  const [url, setUrl] = useState(server.url)
  const [username, setUsername] = useState(server.auth?.username || '')
  const [password, setPassword] = useState(server.auth?.password || '')
  const [showAuth, setShowAuth] = useState(!!server.auth?.password)
  const [allowInsecureHttp, setAllowInsecureHttp] = useState(server.allowInsecureHttp === true)
  const [error, setError] = useState('')
  const showHttpsIpWarning = isHttpsIpUrl(url)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('servers.nameRequired'))
      return
    }
    if (!url.trim()) {
      setError(t('servers.urlRequired'))
      return
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol')
    } catch {
      setError(t('servers.invalidUrl'))
      return
    }
    if (isRemoteHttpUrl(url) && !allowInsecureHttp) {
      setError(t('servers.insecureHttpRequired'))
      return
    }
    onSave({
      name: name.trim(),
      url: url.trim(),
      allowInsecureHttp,
      username: password.trim() ? username.trim() || 'opencode' : undefined,
      password: password.trim() || undefined,
    })
  }

  const inputCls =
    'w-full h-8 px-3 text-[length:var(--fs-md)] bg-bg-000 border border-border-200 rounded-md focus:outline-none focus:border-accent-main-100/50 text-text-100 placeholder:text-text-400'

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 rounded-lg border border-accent-main-100/30 bg-accent-main-100/[0.02] space-y-2.5"
    >
      <div>
        <label className="block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1">{t('servers.name')}</label>
        <input
          type="text"
          value={name}
          onChange={e => {
            setName(e.target.value)
            setError('')
          }}
          placeholder={t('servers.namePlaceholder')}
          className={inputCls}
          autoFocus
        />
      </div>
      <div>
        <label className="block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1">{t('servers.url')}</label>
        <input
          type="text"
          value={url}
          onChange={e => {
            setUrl(e.target.value)
            setError('')
          }}
          placeholder={t('servers.urlPlaceholder')}
          className={`${inputCls} font-mono`}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowAuth(!showAuth)}
        className="flex items-center gap-1.5 text-[length:var(--fs-xs)] text-accent-main-100 hover:text-accent-main-200 transition-colors"
      >
        <KeyIcon size={10} />
        {showAuth ? t('servers.hideAuth') : t('servers.addAuth')}
      </button>

      {showAuth && (
        <>
          <div>
            <label className="block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1">{t('servers.username')}</label>
            <input
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value)
                setError('')
              }}
              placeholder={t('servers.usernamePlaceholder')}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1">{t('servers.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder={t('servers.passwordPlaceholder')}
              className={inputCls}
            />
          </div>
        </>
      )}

      {showHttpsIpWarning && (
        <div className="text-[length:var(--fs-xs)] text-warning-100 bg-warning-bg border border-warning-100/20 rounded-md px-2.5 py-2 leading-relaxed">
          {t('servers.httpsIpWarning')}
        </div>
      )}

      {isRemoteHttpUrl(url) && (
        <label className="flex items-start gap-2 rounded-md border border-warning-100/20 bg-warning-bg px-2.5 py-2 text-[length:var(--fs-xs)] text-warning-100">
          <input type="checkbox" checked={allowInsecureHttp} onChange={event => setAllowInsecureHttp(event.target.checked)} className="mt-0.5" />
          <span>{t('servers.allowInsecureHttp')}</span>
        </label>
      )}

      {error && <p className="text-[length:var(--fs-xs)] text-danger-100">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('common:cancel')}
        </Button>
        <Button type="submit" size="sm">
          {t('common:save')}
        </Button>
      </div>
    </form>
  )
}

// ============================================
// Add Server Form
// ============================================

function AddServerForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, url: string, allowInsecureHttp: boolean, username?: string, password?: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation(['settings', 'common'])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [allowInsecureHttp, setAllowInsecureHttp] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('servers.nameRequired'))
      return
    }
    if (!url.trim()) {
      setError(t('servers.urlRequired'))
      return
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol')
    } catch {
      setError(t('servers.invalidUrl'))
      return
    }
    if (isRemoteHttpUrl(url) && !allowInsecureHttp) {
      setError(t('servers.insecureHttpRequired'))
      return
    }

    onAdd(
      name.trim(),
      url.trim(),
      allowInsecureHttp,
      password.trim() ? username.trim() || 'opencode' : undefined,
      password.trim() || undefined,
    )
  }

  const isCrossOrigin = (() => {
    if (!url.trim()) return false
    try {
      const serverUrl = new URL(url)
      return serverUrl.origin !== window.location.origin
    } catch {
      return false
    }
  })()
  const showHttpsIpWarning = isHttpsIpUrl(url)

  const inputCls =
    'w-full h-8 px-3 text-[length:var(--fs-md)] bg-bg-000 border border-border-200 rounded-md focus:outline-none focus:border-accent-main-100/50 text-text-100 placeholder:text-text-400'

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-lg border border-border-200 bg-bg-050 space-y-2.5">
      <div>
        <label className="block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1">{t('servers.name')}</label>
        <input
          type="text"
          value={name}
          onChange={e => {
            setName(e.target.value)
            setError('')
          }}
          placeholder={t('servers.namePlaceholder')}
          className={inputCls}
          autoFocus
        />
      </div>
      <div>
        <label className="block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1">{t('servers.url')}</label>
        <input
          type="text"
          value={url}
          onChange={e => {
            setUrl(e.target.value)
            setError('')
          }}
          placeholder={t('servers.urlPlaceholder')}
          className={`${inputCls} font-mono`}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowAuth(!showAuth)}
        className="flex items-center gap-1.5 text-[length:var(--fs-xs)] text-accent-main-100 hover:text-accent-main-200 transition-colors"
      >
        <KeyIcon size={10} />
        {showAuth ? t('servers.hideAuth') : t('servers.addAuth')}
      </button>

      {showAuth && (
        <>
          <div>
            <label className="block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1">{t('servers.username')}</label>
            <input
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value)
                setError('')
              }}
              placeholder={t('servers.usernamePlaceholder')}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1">{t('servers.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder={t('servers.passwordPlaceholder')}
              className={inputCls}
            />
          </div>

          {isCrossOrigin && password.trim() && (
            <div className="text-[length:var(--fs-xs)] text-warning-100 bg-warning-bg border border-warning-100/20 rounded-md px-2.5 py-2 leading-relaxed">
              {t('servers.crossOriginWarning')}{' '}
              <a
                href="https://github.com/anomalyco/opencode/issues/10047"
                target="_blank"
                rel="noopener"
                className="underline hover:no-underline"
              >
                #10047
              </a>
            </div>
          )}

          <div className="text-[length:var(--fs-xs)] text-text-400 leading-relaxed">{t('servers.credentialsStorage')}</div>
        </>
      )}

      {showHttpsIpWarning && (
        <div className="text-[length:var(--fs-xs)] text-warning-100 bg-warning-bg border border-warning-100/20 rounded-md px-2.5 py-2 leading-relaxed">
          {t('servers.httpsIpWarning')}
        </div>
      )}


      {isRemoteHttpUrl(url) && (
        <label className="flex items-start gap-2 rounded-md border border-warning-100/20 bg-warning-bg px-2.5 py-2 text-[length:var(--fs-xs)] text-warning-100">
          <input type="checkbox" checked={allowInsecureHttp} onChange={event => setAllowInsecureHttp(event.target.checked)} className="mt-0.5" />
          <span>{t('servers.allowInsecureHttp')}</span>
        </label>
      )}

      {error && <p className="text-[length:var(--fs-xs)] text-danger-100">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('common:cancel')}
        </Button>
        <Button type="submit" size="sm">
          {t('common:add')}
        </Button>
      </div>
    </form>
  )
}

// ============================================
// Tab: Servers
// ============================================

export function ServersSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const [addingServer, setAddingServer] = useState(false)
  const [switchError, setSwitchError] = useState('')
  const [selectingServerId, setSelectingServerId] = useState<string>()
  const {
    servers,
    activeServer,
    addServer,
    removeServer,
    updateServer,
    setActiveServer,
    checkHealth,
    checkAllHealth,
    getHealth,
  } = useServerStore()
  const { navigateHome, sessionId: routeSessionId } = useRouter()
  const orderedServers = useMemo(() => {
    if (!activeServer) return servers
    const active = servers.find(s => s.id === activeServer.id)
    if (!active) return servers
    return [active, ...servers.filter(s => s.id !== active.id)]
  }, [servers, activeServer])

  useEffect(() => {
    checkAllHealth()
  }, [checkAllHealth])

  // 切换服务器：设置 active + 清理当前 session + 导航回首页
  const handleSelectServer = useCallback(
    async (id: string) => {
      if (activeServer?.id === id) return // 没变，不做事

      setSwitchError('')
      setSelectingServerId(id)
      const health = await checkHealth(id)
      setSelectingServerId(undefined)
      if (health.status !== 'online') {
        setSwitchError(t('servers.switchUnavailable'))
        return
      }

      // 清理当前 session 的 store 状态
      if (routeSessionId) {
        messageStore.clearSession(routeSessionId)
      }

      setActiveServer(id) // 内部触发 serverChangeListeners → reconnectSSE()
      navigateHome()
    },
    [activeServer?.id, checkHealth, routeSessionId, setActiveServer, navigateHome, t],
  )

  return (
    <div className="space-y-4">
      <SettingsCard
        title={t('servers.connections')}
        description={t('servers.connectionsDesc')}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={checkAllHealth}
              className="text-[length:var(--fs-xs)] px-2 py-1 rounded-md border border-border-200/60 text-text-300 hover:text-text-100 hover:border-border-300/70 hover:bg-bg-100/60 transition-colors"
            >
              {t('common:refresh')}
            </button>
            {!addingServer && (
              <button
                onClick={() => setAddingServer(true)}
                className="flex items-center gap-1 text-[length:var(--fs-xs)] px-2 py-1 rounded-md border border-accent-main-100/40 text-accent-main-100 hover:text-accent-main-200 hover:border-accent-main-100/60 hover:bg-accent-main-100/5 transition-colors"
              >
                <PlusIcon size={10} /> {t('common:add')}
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-1.5">
          {orderedServers.map(s => (
            <ServerItem
              key={s.id}
              server={s}
              health={getHealth(s.id)}
              isActive={activeServer?.id === s.id}
              onSelect={() => {
                if (selectingServerId) return
                void handleSelectServer(s.id)
              }}
              onDelete={() => removeServer(s.id)}
              onEdit={updates => {
                const auth = updates.password
                  ? { username: updates.username || 'opencode', password: updates.password }
                  : undefined
                updateServer(s.id, { name: updates.name, url: updates.url, allowInsecureHttp: updates.allowInsecureHttp, auth })
                void checkHealth(s.id)
              }}
              onCheckHealth={() => void checkHealth(s.id)}
            />
          ))}

          {addingServer && (
            <AddServerForm
              onAdd={(n, u, allowInsecureHttp, user, pass) => {
                const auth = pass ? { username: user || 'opencode', password: pass } : undefined
                const s = addServer({ name: n, url: u, allowInsecureHttp, auth })
                setAddingServer(false)
                void checkHealth(s.id)
              }}
              onCancel={() => setAddingServer(false)}
            />
          )}

          {switchError && <div className="px-1 text-[length:var(--fs-xs)] text-danger-100">{switchError}</div>}

          {servers.length === 0 && !addingServer && (
            <div className="text-[length:var(--fs-md)] text-text-400 text-center py-8">{t('servers.noServersConfigured')}</div>
          )}
        </div>
      </SettingsCard>
      <HostingCredentialsCard />
    </div>
  )
}

type HostingProvider = 'github' | 'gitlab' | 'bitbucket'

function HostingCredentialsCard() {
  const { t } = useTranslation(['settings', 'common'])
  const [configured, setConfigured] = useState<Record<HostingProvider, boolean>>({ github: false, gitlab: false, bitbucket: false })
  const [tokens, setTokens] = useState<Record<HostingProvider, string>>({ github: '', gitlab: '', bitbucket: '' })
  const [usernames, setUsernames] = useState<Record<HostingProvider, string>>({ github: '', gitlab: '', bitbucket: '' })
  const [busy, setBusy] = useState<HostingProvider>()
  const providers: HostingProvider[] = ['github', 'gitlab', 'bitbucket']
  const available = typeof window.customOpenCode?.hostingCredentials === 'function'

  const refresh = useCallback(() => {
    if (typeof window.customOpenCode?.hostingCredentials !== 'function') return
    void window.customOpenCode.hostingCredentials().then(setConfigured)
  }, [])

  useEffect(refresh, [refresh])

  const save = async (provider: HostingProvider) => {
    if (typeof window.customOpenCode?.setHostingCredential !== 'function') return
    const token = tokens[provider].trim()
    if (!token) return
    setBusy(provider)
    await window.customOpenCode.setHostingCredential(provider, {
      username: usernames[provider].trim() || (provider === 'bitbucket' ? 'x-token-auth' : provider),
      password: token,
    })
    setTokens(current => ({ ...current, [provider]: '' }))
    setBusy(undefined)
    refresh()
  }

  const remove = async (provider: HostingProvider) => {
    if (typeof window.customOpenCode?.setHostingCredential !== 'function') return
    setBusy(provider)
    await window.customOpenCode.setHostingCredential(provider, null)
    setBusy(undefined)
    refresh()
  }

  if (!available) return null

  return <SettingsCard title={t('servers.hosting.title')} description={t('servers.hosting.description')}>
    <div className="space-y-3">
      {providers.map(provider => <div key={provider} className="rounded-lg border border-border-200/40 p-3">
        <div className="mb-2 flex items-center justify-between"><span className="text-[length:var(--fs-sm)] font-medium text-text-100">{provider === 'github' ? 'GitHub' : provider === 'gitlab' ? 'GitLab' : 'Bitbucket'}</span><span className={`text-[length:var(--fs-xs)] ${configured[provider] ? 'text-success-100' : 'text-text-500'}`}>{t(configured[provider] ? 'servers.hosting.configured' : 'servers.hosting.notConfigured')}</span></div>
        <div className="flex gap-2">
          {provider === 'bitbucket' ? <input value={usernames[provider]} onChange={event => setUsernames(current => ({ ...current, [provider]: event.target.value }))} className="h-8 w-32 rounded-md border border-border-200 bg-bg-000 px-2 text-[length:var(--fs-xs)] text-text-100 outline-none" placeholder={t('servers.hosting.username')} /> : null}
          <input type="password" value={tokens[provider]} onChange={event => setTokens(current => ({ ...current, [provider]: event.target.value }))} className="h-8 min-w-0 flex-1 rounded-md border border-border-200 bg-bg-000 px-2 text-[length:var(--fs-xs)] text-text-100 outline-none" placeholder={configured[provider] ? t('servers.hosting.replaceToken') : t('servers.hosting.token')} />
          <Button size="sm" disabled={!tokens[provider].trim() || busy === provider} onClick={() => void save(provider)}>{t('common:save')}</Button>
          {configured[provider] ? <Button size="sm" variant="ghost" disabled={busy === provider} onClick={() => void remove(provider)}>{t('common:remove')}</Button> : null}
        </div>
      </div>)}
      <p className="text-[length:var(--fs-xs)] leading-relaxed text-text-500">{t('servers.hosting.secureStorage')}</p>
    </div>
  </SettingsCard>
}
