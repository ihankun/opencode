import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDirectory } from '../../../contexts/useDirectory'
import { useServerStore } from '../../../hooks/useServerStore'

const McpPanel = lazy(() => import('../../../components/McpPanel').then(module => ({ default: module.McpPanel })))
const SkillPanel = lazy(() => import('../../../components/SkillPanel').then(module => ({ default: module.SkillPanel })))
const PluginPanel = lazy(() => import('../../../components/PluginPanel').then(module => ({ default: module.PluginPanel })))
const ExpertKitPanel = lazy(() => import('../../../components/ExpertKitPanel').then(module => ({ default: module.ExpertKitPanel })))

type ExtensionTab = 'mcp' | 'skills' | 'plugins' | 'kits'

export function ExtensionCenterSettings() {
  const { t } = useTranslation('settings')
  const { currentDirectory } = useDirectory()
  const { activeServer, getHealth } = useServerStore()
  const [tab, setTab] = useState<ExtensionTab>('mcp')
  const health = activeServer ? getHealth(activeServer.id) : null
  const tabs: Array<{ id: ExtensionTab; label: string }> = [
    { id: 'mcp', label: t('extensions.mcp') },
    { id: 'skills', label: t('extensions.skills') },
    { id: 'plugins', label: t('extensions.plugins') },
    { id: 'kits', label: t('extensions.expertKits') },
  ]

  return <div className="space-y-3">
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-border-200/50 bg-bg-050/50 p-3 text-[length:var(--fs-xs)]">
      <div><div className="text-text-500">{t('extensions.serverScope')}</div><div className="mt-1 truncate text-text-200">{activeServer?.name ?? '—'} · {health?.compatibility ?? 'unknown'}</div></div>
      <div><div className="text-text-500">{t('extensions.workspaceScope')}</div><div className="mt-1 truncate text-text-200" title={currentDirectory}>{currentDirectory || t('extensions.global')}</div></div>
      <div><div className="text-text-500">{t('extensions.permissions')}</div><div className="mt-1 text-text-200">{t('extensions.permissionsValue')}</div></div>
    </div>
    <div className="flex gap-1 rounded-lg bg-bg-200/40 p-1">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`flex-1 rounded-md px-3 py-1.5 text-[length:var(--fs-sm)] ${tab === item.id ? 'bg-bg-100 text-text-100 shadow-sm' : 'text-text-400 hover:text-text-200'}`}>{item.label}</button>)}</div>
    <div className="h-[min(650px,65vh)] overflow-hidden rounded-xl border border-border-200/50 bg-bg-100">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-[length:var(--fs-sm)] text-text-400">{t('extensions.loading')}</div>}>
        {tab === 'mcp' ? <McpPanel /> : tab === 'skills' ? <SkillPanel showHeader={false} /> : tab === 'plugins' ? <PluginPanel /> : <ExpertKitPanel />}
      </Suspense>
    </div>
    <p className="text-[length:var(--fs-xs)] leading-relaxed text-text-500">{t('extensions.diagnosticHint')}</p>
  </div>
}
