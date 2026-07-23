// ============================================
// McpPanel - MCP 服务器管理面板
// 显示所有 MCP 服务器状态，支持连接/断开/认证
// 支持添加新服务器
// ============================================

import { memo, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PlugIcon,
  RetryIcon,
  KeyIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
  CheckIcon,
  SpinnerIcon,
  PlusIcon,
  CloseIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  DownloadIcon,
  SearchIcon,
  TrashIcon,
} from './Icons'
import {
  getMcpStatus,
  connectMcpServer,
  disconnectMcpServer,
  startMcpAuth,
  authenticateMcp,
  addMcpServer,
  removeMcpServer,
} from '../api/mcp'
import type { MCPStatus, McpServerConfig } from '../types/api/mcp'
import { useDirectory } from '../hooks'
import { logger } from '../utils/logger'
import { apiErrorHandler } from '../utils'
import { openUrl } from '../utils/browserOpen'
import { Button, Dialog } from './ui'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { serverStore } from '../store/serverStore'
import type { CustomOpenCodeMcpSource } from '../../../preload'

// ============================================
// Types
// ============================================

interface ServerEntry {
  name: string
  status: MCPStatus
  source?: CustomOpenCodeMcpSource
}

type McpMarketItem = Awaited<ReturnType<typeof window.customOpenCode.searchMcpServers>>['data'][number]

// ============================================
// McpPanel Component
// ============================================

interface McpPanelProps {
  isResizing?: boolean
}

function secureEnvironmentName(name: string, key: string) {
  const segment = (value: string) => value.toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^\d/, '_$&').slice(0, 48)
  return `OPENCODEX_MCP_${segment(name)}_${segment(key)}`
}

export const McpPanel = memo(function McpPanel({ isResizing: _isResizing }: McpPanelProps) {
  const { t, i18n } = useTranslation(['components', 'common'])
  const { currentDirectory } = useDirectory()
  const [servers, setServers] = useState<ServerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [marketQuery, setMarketQuery] = useState('')
  const [marketResults, setMarketResults] = useState<Awaited<ReturnType<typeof window.customOpenCode.searchMcpServers>>['data']>([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [marketProvider, setMarketProvider] = useState<'official' | 'netease'>('official')
  const [marketCategory, setMarketCategory] = useState('')
  const [marketCategories, setMarketCategories] = useState<Awaited<ReturnType<typeof window.customOpenCode.searchMcpServers>>['categories']>([])
  const [marketCursor, setMarketCursor] = useState<string | null>(null)
  const [tab, setTab] = useState<'installed' | 'marketplace'>('installed')
  const [marketInstall, setMarketInstall] = useState<McpMarketItem | null>(null)
  const [environmentDraft, setEnvironmentDraft] = useState<Record<string, string>>({})

  // 加载 MCP 状态
  const loadStatus = useCallback(async () => {
    try {
      setError(null)
      const statusResponse = await getMcpStatus(currentDirectory)
      logger.log('[McpPanel] Status:', statusResponse)

      // 构建 server entries
      const entries: ServerEntry[] = Object.entries(statusResponse).map(([name, status]) => ({
        name,
        status: status as MCPStatus,
      }))
      const sources = serverStore.getActiveServerId() === 'local' && typeof window.customOpenCode?.mcpSources === 'function'
        ? await window.customOpenCode.mcpSources({ directory: currentDirectory, names: entries.map(entry => entry.name) })
        : {}

      // 按名称排序
      entries.sort((a, b) => a.name.localeCompare(b.name))
      setServers(entries.map(entry => ({ ...entry, source: sources[entry.name] })))
    } catch (err) {
      apiErrorHandler('load MCP status', err)
      setError(t('mcpPanel.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [currentDirectory, t])

  // 初始加载
  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // 刷新
  const handleRefresh = useCallback(() => {
    setLoading(true)
    loadStatus()
  }, [loadStatus])

  // 连接服务器
  const handleConnect = useCallback(
    async (name: string) => {
      setActionLoading(name)
      try {
        await connectMcpServer(name, currentDirectory)
        // 等一下让后端处理完
        await new Promise(r => setTimeout(r, 500))
        await loadStatus()
      } catch (err) {
        apiErrorHandler('connect MCP server', err)
      } finally {
        setActionLoading(null)
      }
    },
    [currentDirectory, loadStatus],
  )

  // 断开服务器
  const handleDisconnect = useCallback(
    async (name: string) => {
      setActionLoading(name)
      try {
        await disconnectMcpServer(name, currentDirectory)
        await new Promise(r => setTimeout(r, 500))
        await loadStatus()
      } catch (err) {
        apiErrorHandler('disconnect MCP server', err)
      } finally {
        setActionLoading(null)
      }
    },
    [currentDirectory, loadStatus],
  )

  // 开始认证流程
  const handleAuth = useCallback(
    async (name: string) => {
      setActionLoading(name)
      try {
        // 尝试使用 authenticate 接口（自动打开浏览器）
        await authenticateMcp(name, currentDirectory)
        // 等待用户完成认证
        await new Promise(r => setTimeout(r, 3000))
        await loadStatus()
      } catch {
        // 如果失败，尝试 startMcpAuth 获取 URL
        try {
          const result = await startMcpAuth(name, currentDirectory)
          await openUrl(result.url)
          await new Promise(r => setTimeout(r, 3000))
          await loadStatus()
        } catch (err2) {
          apiErrorHandler('start MCP auth', err2)
        }
      } finally {
        setActionLoading(null)
      }
    },
    [currentDirectory, loadStatus],
  )

  // 添加新服务器
  const handleAddServer = useCallback(
    async (name: string, config: McpServerConfig) => {
      setActionLoading('__adding__')
      try {
        await addMcpServer(name, config, currentDirectory)
        setShowAddForm(false)
        await new Promise(r => setTimeout(r, 500))
        await loadStatus()
      } catch (err) {
        apiErrorHandler('add MCP server', err)
        throw err
      } finally {
        setActionLoading(null)
      }
    },
    [currentDirectory, loadStatus],
  )

  const handleMarketSearch = useCallback(async (cursor?: string, append = false) => {
    setMarketLoading(true)
    try {
      setMarketError(null)
      const result = await window.customOpenCode.searchMcpServers({
        provider: marketProvider,
        query: marketQuery,
        category: marketCategory || undefined,
        cursor,
      })
      setMarketResults(current => append ? [...current, ...result.data] : result.data)
      setMarketCategories(result.categories)
      setMarketCursor(result.nextCursor)
    } catch (err) {
      apiErrorHandler('search MCP registry', err)
      setMarketError(err instanceof Error ? err.message : t('mcpPanel.marketplaceFailed'))
    } finally {
      setMarketLoading(false)
    }
  }, [marketCategory, marketProvider, marketQuery, t])

  useEffect(() => {
    if (tab !== 'marketplace') return
    const timer = window.setTimeout(() => void handleMarketSearch(), marketQuery.trim() ? 500 : 0)
    return () => window.clearTimeout(timer)
  }, [handleMarketSearch, tab])

  const installMarketItem = useCallback(async (item: McpMarketItem, environment: Record<string, string>) => {
    setActionLoading(item.name)
    try {
      if (item.requiredEnvironment.length > 0 && serverStore.getActiveServerId() !== 'local') {
        throw new Error('远程服务器的环境变量必须在远程主机上配置，OpenCodex 不会把密钥写入远程配置文件。')
      }
      const scope = `mcp:${currentDirectory ?? 'global'}:${item.name}`
      const secureEnvironment = Object.fromEntries(Object.entries(environment).map(([key, value]) => [secureEnvironmentName(item.name, key), value]))
      if (Object.keys(secureEnvironment).length) await window.customOpenCode.setSecureEnvironment(scope, secureEnvironment)
      const config = item.config.type === 'local' && item.requiredEnvironment.length > 0
        ? {
            ...item.config,
            environment: Object.fromEntries(item.requiredEnvironment.map(key => [key, `{env:${secureEnvironmentName(item.name, key)}}`])),
          }
        : item.config
      await addMcpServer(item.name, config as McpServerConfig, currentDirectory)
      await window.customOpenCode.setMcpMarketplaceSource({ directory: currentDirectory, name: item.name, provider: item.provider })
      await window.customOpenCode.restartServer()
      await loadStatus()
      setMarketInstall(null)
    } catch (cause) {
      setMarketError(cause instanceof Error ? cause.message : t('mcpPanel.marketplaceFailed'))
    } finally {
      setActionLoading(null)
    }
  }, [currentDirectory, loadStatus, t])

  const handleMarketInstall = useCallback((item: McpMarketItem) => {
    if (item.requiredEnvironment.length === 0) {
      void installMarketItem(item, {})
      return
    }
    setEnvironmentDraft(Object.fromEntries(item.requiredEnvironment.map(name => [name, ''])))
    setMarketInstall(item)
  }, [installMarketItem])

  const handleRemoveServer = useCallback(async (name: string) => {
    setActionLoading(name)
    try {
      await removeMcpServer(name, currentDirectory)
      await window.customOpenCode.setSecureEnvironment(`mcp:${currentDirectory ?? 'global'}:${name}`, null)
      await window.customOpenCode.setMcpMarketplaceSource({ directory: currentDirectory, name, provider: null })
      await window.customOpenCode.restartServer()
      await loadStatus()
    } finally {
      setActionLoading(null)
    }
  }, [currentDirectory, loadStatus])

  // ============================================
  // Render
  // ============================================

  return (
    <div className="flex flex-col h-full bg-bg-100">
      {/* Header */}
      <div className="relative flex h-10 items-center justify-between px-3">
        <div className="flex h-6 min-w-0 items-center gap-1.5 text-text-100 text-[length:var(--fs-xs)] font-medium">
          <span>{t('mcpPanel.title')}</span>
          {!loading && <span className="inline-flex h-4 items-center text-[length:var(--fs-xs)] leading-none text-text-400">({servers.length})</span>}
        </div>
        <div className="flex items-center gap-1">
          {tab === 'installed' && <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label={t('common:refresh')}
            className="inline-flex h-6 w-6 items-center justify-center hover:bg-bg-200/50 rounded-md text-text-300 hover:text-text-100 transition-colors disabled:opacity-50"
            title={t('common:refresh')}
          >
            <RetryIcon size={12} className={loading ? 'animate-spin' : ''} />
          </button>}
          {tab === 'installed' && <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
            aria-label={t('mcpPanel.addServer')}
            className="inline-flex h-6 w-6 items-center justify-center hover:bg-bg-200/50 rounded-md text-text-300 hover:text-text-100 transition-colors disabled:opacity-50"
            title={t('mcpPanel.addServer')}
          >
            <PlusIcon size={12} />
          </button>}
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" />
      </div>

      <div className="flex gap-1 border-b border-border-200/30 px-3 py-2">
        {(['installed', 'marketplace'] as const).map(item => (
          <button key={item} type="button" onClick={() => { setTab(item); setMarketQuery(''); setMarketResults([]) }} className={`rounded-md px-2.5 py-1 text-[length:var(--fs-xs)] transition-colors ${tab === item ? 'bg-bg-200 text-text-100' : 'text-text-400 hover:text-text-200'}`}>
            {t(`mcpPanel.${item}`)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'marketplace' && <div className="border-b border-border-200/50 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[length:var(--fs-xs)] text-text-400">{t('mcpPanel.provider')}</span>
            <div className="flex rounded-md bg-bg-200/40 p-0.5">{(['official', 'netease'] as const).map(provider => <button key={provider} type="button" onClick={() => { setMarketProvider(provider); setMarketCategory('') }} className={`rounded px-2 py-1 text-[length:var(--fs-xs)] ${marketProvider === provider ? 'bg-bg-000 text-text-100 shadow-sm' : 'text-text-400'}`}>{t(`mcpPanel.provider_${provider}`)}</button>)}</div>
            {marketCategories.length > 0 && <select value={marketCategory} onChange={event => setMarketCategory(event.target.value)} className="h-7 max-w-44 rounded-md border border-border-200/60 bg-bg-100 px-2 text-[length:var(--fs-xs)] text-text-200"><option value="">{t('mcpPanel.allCategories')}</option>{marketCategories.map(category => <option key={category.id} value={category.id}>{i18n.language.startsWith('zh') ? category.nameZh : category.nameEn}</option>)}</select>}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1"><SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-400" /><input value={marketQuery} onChange={event => setMarketQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && void handleMarketSearch()} placeholder={t('mcpPanel.searchPlaceholder')} className="h-8 w-full rounded-md border border-border-200/60 bg-bg-100 pl-8 pr-2 text-[length:var(--fs-sm)] text-text-100 outline-none" /></div>
            <button disabled={marketLoading} onClick={() => void handleMarketSearch()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-bg-200 px-3 text-[length:var(--fs-sm)] text-text-200 disabled:opacity-50">{marketLoading ? <SpinnerIcon size={12} className="animate-spin" /> : <SearchIcon size={12} />}{t('mcpPanel.search')}</button>
          </div>
          {marketError && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100"><span>{marketError}</span><button type="button" onClick={() => { setMarketProvider(current => current === 'official' ? 'netease' : 'official'); setMarketCategory('') }} className="rounded border border-danger-100/30 px-2 py-1">{t(marketProvider === 'official' ? 'mcpPanel.switchToNetease' : 'mcpPanel.switchToOfficial')}</button></div>}
          {marketResults.length > 0 && <div className="mt-3 space-y-1">{marketResults.map(item => {
            const installed = servers.some(server => server.name === item.name)
            return <div key={`${item.provider}-${item.name}-${item.version}`} className="flex min-h-16 items-center gap-3 rounded-lg border border-border-200/40 bg-bg-200/20 px-2.5 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-200 text-text-300"><PlugIcon size={15} /></div>
              <div className="min-w-0 flex-1"><div className="flex gap-2"><span className="truncate text-[length:var(--fs-sm)] font-medium text-text-100">{item.name}</span>{item.version && <span className="text-[length:var(--fs-xs)] text-text-400">v{item.version}</span>}</div><div className="line-clamp-2 text-[length:var(--fs-xs)] text-text-400">{item.description}</div><div className="mt-1 flex flex-wrap gap-x-2 text-[length:var(--fs-xxs)] text-text-500"><span>{t(`mcpPanel.provider_${item.provider}`)} · {item.source}</span>{item.category && <span>{item.category}</span>}{item.downloads > 0 && <span>{t('mcpPanel.monthlyDownloads', { count: item.downloads.toLocaleString() })}</span>}{item.requiredEnvironment.length > 0 && <span className="text-warning-100">{t('mcpPanel.requiresConfig')}: {item.requiredEnvironment.join(', ')}</span>}</div></div>
              <button disabled={Boolean(actionLoading)} onClick={() => installed ? void handleRemoveServer(item.name) : handleMarketInstall(item)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-300 hover:bg-bg-200 disabled:opacity-50">{actionLoading === item.name ? <SpinnerIcon size={13} className="animate-spin" /> : installed ? <TrashIcon size={13} /> : <DownloadIcon size={13} />}</button>
            </div>
          })}</div>}
          {marketCursor && <div className="mt-3 flex justify-center"><button type="button" disabled={marketLoading} onClick={() => void handleMarketSearch(marketCursor, true)} className="rounded-md border border-border-200/60 bg-bg-000 px-3 py-1.5 text-[length:var(--fs-xs)] text-text-300 disabled:opacity-50">{t('mcpPanel.loadMore')}</button></div>}
        </div>}
        {/* Add Server Form */}
        {tab === 'installed' && showAddForm && (
          <AddServerForm
            onSubmit={handleAddServer}
            onCancel={() => setShowAddForm(false)}
            isLoading={actionLoading === '__adding__'}
          />
        )}

        {tab === 'marketplace' ? (
          !marketLoading && marketResults.length === 0 ? <div className="flex flex-col items-center justify-center gap-2 py-20 text-text-400 text-[length:var(--fs-sm)]"><SearchIcon size={22} className="opacity-40" /><span>{t('mcpPanel.marketplaceHint')}</span></div> : null
        ) : loading && servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2">
            <SpinnerIcon size={20} className="animate-spin opacity-50" />
            <span>{t('mcpPanel.loadingServers')}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2">
            <AlertCircleIcon size={20} className="text-danger-100" />
            <span>{error}</span>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1.5 text-[length:var(--fs-sm)] bg-bg-200/50 hover:bg-bg-200 text-text-200 rounded-md transition-colors"
            >
              {t('common:retry')}
            </button>
          </div>
        ) : servers.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2 px-4 text-center">
            <PlugIcon size={24} className="opacity-30" />
            <span>{t('mcpPanel.noServers')}</span>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 text-[length:var(--fs-sm)] bg-bg-200/50 hover:bg-bg-200 text-text-200 rounded-md transition-colors"
            >
              {t('mcpPanel.addServer')}
            </button>
          </div>
        ) : (
          <div className="p-1">
            {servers.map(server => (
              <ServerItem
                key={server.name}
                server={server}
                isLoading={actionLoading === server.name}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onAuth={handleAuth}
                onRemove={handleRemoveServer}
              />
            ))}
          </div>
        )}
      </div>
      <Dialog isOpen={marketInstall !== null} onClose={() => setMarketInstall(null)} title={t('mcpPanel.configureInstall')} width={480}>
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault()
          if (!marketInstall || Object.values(environmentDraft).some(value => !value.trim())) return
          void installMarketItem(marketInstall, environmentDraft)
        }}>
          <p className="text-[length:var(--fs-sm)] leading-relaxed text-text-300">{t('mcpPanel.environmentDescription', { name: marketInstall?.name })}</p>
          <div className="space-y-3">{marketInstall?.requiredEnvironment.map(name => <label key={name} className="block"><span className="mb-1 block font-mono text-[length:var(--fs-xs)] text-text-300">{name}</span><input type="password" autoComplete="off" value={environmentDraft[name] ?? ''} onChange={event => setEnvironmentDraft(current => ({ ...current, [name]: event.target.value }))} className="h-9 w-full rounded-md border border-border-200 bg-bg-000 px-3 font-mono text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100" /></label>)}</div>
          <p className="rounded-md bg-warning-bg px-3 py-2 text-[length:var(--fs-xs)] leading-relaxed text-warning-100">{t('mcpPanel.environmentStorageWarning')}</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setMarketInstall(null)}>{t('common:cancel')}</Button><Button type="submit" disabled={Object.values(environmentDraft).some(value => !value.trim())} isLoading={actionLoading === marketInstall?.name}>{t('mcpPanel.install')}</Button></div>
        </form>
      </Dialog>
    </div>
  )
})

// ============================================
// AddServerForm Component
// ============================================

interface AddServerFormProps {
  onSubmit: (name: string, config: McpServerConfig) => Promise<void>
  onCancel: () => void
  isLoading: boolean
}

const AddServerForm = memo(function AddServerForm({ onSubmit, onCancel, isLoading }: AddServerFormProps) {
  const { t } = useTranslation(['components', 'common'])
  const [serverType, setServerType] = useState<'local' | 'remote'>('local')
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(t('mcpPanel.nameRequired'))
      return
    }

    try {
      if (serverType === 'local') {
        if (!command.trim()) {
          setError(t('mcpPanel.commandRequired'))
          return
        }
        const cmdParts = parseCommandLine(command)
        await onSubmit(name.trim(), {
          type: 'local',
          command: cmdParts,
        })
      } else {
        if (!url.trim()) {
          setError(t('mcpPanel.urlRequired'))
          return
        }
        await onSubmit(name.trim(), {
          type: 'remote',
          url: url.trim(),
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mcpPanel.failedToAdd'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="m-3 rounded-lg border border-border-200/60 bg-bg-100/50 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[length:var(--fs-base)] font-medium text-text-100">{t('mcpPanel.addMcpServer')}</span>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 hover:bg-bg-200/50 rounded-md text-text-400 hover:text-text-100 transition-colors"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      {/* Server Type Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setServerType('local')}
          className={`flex-1 px-3 py-1.5 text-[length:var(--fs-sm)] rounded-md transition-colors ${
            serverType === 'local'
              ? 'bg-accent-main-100/20 text-accent-main-100 border border-accent-main-100/50'
              : 'bg-bg-200/50 text-text-300 border border-transparent hover:bg-bg-200'
          }`}
        >
          {t('mcpPanel.local')}
        </button>
        <button
          type="button"
          onClick={() => setServerType('remote')}
          className={`flex-1 px-3 py-1.5 text-[length:var(--fs-sm)] rounded-md transition-colors ${
            serverType === 'remote'
              ? 'bg-accent-main-100/20 text-accent-main-100 border border-accent-main-100/50'
              : 'bg-bg-200/50 text-text-300 border border-transparent hover:bg-bg-200'
          }`}
        >
          {t('mcpPanel.remote')}
        </button>
      </div>

      {/* Name Input */}
      <div className="mb-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('mcpPanel.serverName')}
          className="w-full px-2 py-1.5 text-[length:var(--fs-sm)] bg-bg-000 border border-border-200 rounded-md text-text-100 placeholder-text-500 focus:border-accent-main-100 focus-visible:ring-1 focus-visible:ring-accent-main-100/40 focus-visible:ring-inset"
        />
      </div>

      {/* Local: Command Input */}
      {serverType === 'local' && (
        <div className="mb-2">
          <input
            type="text"
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder={t('mcpPanel.commandPlaceholder')}
            className="w-full px-2 py-1.5 text-[length:var(--fs-sm)] bg-bg-000 border border-border-200 rounded-md text-text-100 placeholder-text-500 focus:border-accent-main-100 focus-visible:ring-1 focus-visible:ring-accent-main-100/40 focus-visible:ring-inset"
          />
        </div>
      )}

      {/* Remote: URL Input */}
      {serverType === 'remote' && (
        <div className="mb-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder={t('mcpPanel.urlPlaceholder')}
            className="w-full px-2 py-1.5 text-[length:var(--fs-sm)] bg-bg-000 border border-border-200 rounded-md text-text-100 placeholder-text-500 focus:border-accent-main-100 focus-visible:ring-1 focus-visible:ring-accent-main-100/40 focus-visible:ring-inset"
          />
        </div>
      )}

      {/* Error */}
      {error && <div className="mb-2 text-[length:var(--fs-sm)] text-danger-100">{error}</div>}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-3 py-1.5 text-[length:var(--fs-sm)] bg-accent-main-100 hover:bg-accent-main-200 text-oncolor-100 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <SpinnerIcon size={12} className="animate-spin" />
            {t('common:adding')}
          </>
        ) : (
          <>
            <PlusIcon size={12} />
            {t('mcpPanel.addServer')}
          </>
        )}
      </button>
    </form>
  )
})

function parseCommandLine(value: string) {
  const parts: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let escaping = false

  for (const char of value.trim()) {
    if (escaping) {
      current += char
      escaping = false
      continue
    }
    if (char === '\\') {
      escaping = true
      continue
    }
    if (quote) {
      if (char === quote) {
        quote = null
        continue
      }
      current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        parts.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (escaping) current += '\\'
  if (quote) throw new Error('Command contains an unclosed quote.')
  if (current) parts.push(current)
  return parts
}

// ============================================
// ServerItem Component
// ============================================

interface ServerItemProps {
  server: ServerEntry
  isLoading: boolean
  onConnect: (name: string) => void
  onDisconnect: (name: string) => void
  onAuth: (name: string) => void
  onRemove: (name: string) => void
}

const ServerItem = memo(function ServerItem({ server, isLoading, onConnect, onDisconnect, onAuth, onRemove }: ServerItemProps) {
  const { t } = useTranslation(['components', 'common'])
  const { name, status } = server
  const [expanded, setExpanded] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(false)

  // 获取错误信息（如果有）
  const getErrorMessage = (): string | null => {
    if (status.status === 'failed') {
      return status.error
    }
    if (status.status === 'needs_client_registration') {
      return status.error
    }
    return null
  }

  const errorMessage = getErrorMessage()
  const source = (() => {
    if (!server.source) return t('mcpPanel.sourceRemote')
    if (server.source.kind === 'marketplace') return t('mcpPanel.sourceMarketplace', {
      source: t(`mcpPanel.provider_${server.source.provider}`),
    })
    if (server.source.kind === 'plugin') return t('mcpPanel.sourcePlugin', { source: server.source.detail })
    if (server.source.kind === 'config') return t('mcpPanel.sourceConfig', { source: server.source.detail })
    return t('mcpPanel.sourceRuntime')
  })()

  // 状态颜色和标签
  const getStatusInfo = () => {
    switch (status.status) {
      case 'connected':
        return { color: 'text-success-100', label: t('mcpPanel.connected'), icon: CheckIcon }
      case 'disabled':
        return { color: 'text-text-400', label: t('mcpPanel.disabled'), icon: null }
      case 'failed':
        return { color: 'text-danger-100', label: t('common:failed'), icon: AlertCircleIcon }
      case 'needs_auth':
        return { color: 'text-warning-100', label: t('mcpPanel.needsAuth'), icon: KeyIcon }
      case 'needs_client_registration':
        return { color: 'text-warning-100', label: t('mcpPanel.needsRegistration'), icon: KeyIcon }
      default:
        return { color: 'text-text-400', label: t('common:unknown'), icon: null }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  // 渲染操作按钮
  const renderActions = () => {
    if (isLoading) {
      return <SpinnerIcon size={14} className="animate-spin text-text-400" />
    }

    switch (status.status) {
      case 'connected':
        return (
          <button
            onClick={e => {
              e.stopPropagation()
              onDisconnect(name)
            }}
            className="px-2 py-0.5 text-[length:var(--fs-sm)] bg-bg-300/50 hover:bg-danger-bg hover:text-danger-100 text-text-300 rounded-md transition-colors"
          >
            {t('mcpPanel.disconnect')}
          </button>
        )
      case 'disabled':
      case 'failed':
        return (
          <button
            onClick={e => {
              e.stopPropagation()
              onConnect(name)
            }}
            className="px-2 py-0.5 text-[length:var(--fs-sm)] bg-bg-300/50 hover:bg-success-bg hover:text-success-100 text-text-300 rounded-md transition-colors"
          >
            {t('mcpPanel.connect')}
          </button>
        )
      case 'needs_auth':
      case 'needs_client_registration':
        return (
          <button
            onClick={e => {
              e.stopPropagation()
              onAuth(name)
            }}
            className="px-2 py-0.5 text-[length:var(--fs-sm)] bg-warning-bg hover:bg-warning-bg/80 text-warning-100 rounded-md transition-colors flex items-center gap-1"
          >
            <ExternalLinkIcon size={10} />
            {t('mcpPanel.authenticate')}
          </button>
        )
      default:
        return null
    }
  }

  // 状态指示器颜色
  const getStatusDotColor = () => {
    switch (status.status) {
      case 'connected':
        return 'bg-success-100'
      case 'disabled':
        return 'bg-text-500'
      case 'failed':
        return 'bg-danger-100'
      case 'needs_auth':
      case 'needs_client_registration':
        return 'bg-warning-100'
      default:
        return 'bg-text-500'
    }
  }

  return (
    <>
    <div className="group">
      {/* Main row */}
      <div
        className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-bg-200/50 transition-colors"
        onClick={() => errorMessage && setExpanded(!expanded)}
      >
        {/* Expand icon only if there is an error to show details for */}
        {errorMessage ? (
          <span className="text-text-400 shrink-0 cursor-pointer">
            {expanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </span>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor()}`} />

        {/* Server name */}
        <div className="flex-1 min-w-0">
          <div className="text-[length:var(--fs-base)] text-text-100 truncate">{name}</div>
          <div className={`text-[length:var(--fs-sm)] ${statusInfo.color} flex items-center gap-1`}>
            {StatusIcon && <StatusIcon size={10} />}
            <span>{statusInfo.label}</span>
            {errorMessage && !expanded && (
              <span className="text-text-500 ml-1 truncate max-w-[200px]" title={errorMessage}>
                - {errorMessage}
              </span>
            )}
          </div>
          <div className="truncate font-mono text-[length:var(--fs-xxs)] text-text-500" title={source}>{source}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">{renderActions()}<button onClick={e => { e.stopPropagation(); setRemoveConfirm(true) }} className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-400 opacity-0 transition-opacity hover:bg-danger-100/10 hover:text-danger-100 group-hover:opacity-100" title={t('mcpPanel.remove')}><TrashIcon size={11} /></button></div>
      </div>

      {/* Expanded Error Details */}
      {expanded && errorMessage && (
        <div className="mx-2 mb-1 ml-7 rounded-md bg-danger-bg px-2 py-2 text-[length:var(--fs-sm)] text-text-200 break-words font-mono">
          {errorMessage}
        </div>
      )}
    </div>
    <ConfirmDialog isOpen={removeConfirm} onClose={() => setRemoveConfirm(false)} onConfirm={() => { setRemoveConfirm(false); onRemove(name) }} title={t('mcpPanel.remove')} description={t('mcpPanel.removeConfirm', { name })} confirmText={t('common:remove')} variant="danger" />
    </>
  )
})
