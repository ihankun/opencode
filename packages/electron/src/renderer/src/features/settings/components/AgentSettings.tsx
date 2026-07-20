import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { autoApproveStore } from '../../../store'
import type { AlwaysAllowMode } from '../../../store/autoApproveStore'
import { themeStore, type ToolCardStyle } from '../../../store/themeStore'
import { Toggle, SegmentedControl, SettingRow, SettingsSection } from './SettingsUI'
import { getConfig, getGlobalConfig, updateConfig, updateGlobalConfig } from '../../../api/config'
import { useDirectory } from '../../../hooks'
import type { AgentConfig, Config } from '../../../types/api/config'
import { Button, Dialog } from '../../../components/ui'
import { apiErrorHandler } from '../../../utils'

type AgentDraft = AgentConfig & { name: string }

const emptyAgent: AgentDraft = {
  name: '',
  description: '',
  mode: 'primary',
  model: '',
  prompt: '',
  color: 'accent',
  permission: { edit: 'ask', bash: 'ask' },
}

export function AgentSettings() {
  const { t } = useTranslation(['settings'])
  const [alwaysAllowMode, setAlwaysAllowMode] = useState<AlwaysAllowMode>(autoApproveStore.alwaysAllowMode)
  const [approvePendingOnFullAuto, setApprovePendingOnFullAuto] = useState(autoApproveStore.approvePendingOnFullAuto)
  const [queueFollowupMessages, setQueueFollowupMessages] = useState(themeStore.queueFollowupMessages)
  const [descriptiveToolSteps, setDescriptiveToolSteps] = useState(themeStore.descriptiveToolSteps)
  const [inlineToolRequests, setInlineToolRequests] = useState(themeStore.inlineToolRequests)
  const [toolCardStyle, setToolCardStyle] = useState(themeStore.toolCardStyle)
  const [immersiveMode, setImmersiveMode] = useState(themeStore.immersiveMode)
  const [compactInlinePermission, setCompactInlinePermission] = useState(themeStore.compactInlinePermission)

  const handleAlwaysAllowModeChange = (mode: AlwaysAllowMode) => {
    setAlwaysAllowMode(mode)
    autoApproveStore.setAlwaysAllowMode(mode)
    if (mode === 'backend') autoApproveStore.clearAllRules()
  }

  const handleApprovePendingOnFullAutoToggle = () => {
    const next = !approvePendingOnFullAuto
    setApprovePendingOnFullAuto(next)
    autoApproveStore.setApprovePendingOnFullAuto(next)
  }

  const handleQueueFollowupMessagesToggle = () => {
    const next = !queueFollowupMessages
    setQueueFollowupMessages(next)
    themeStore.setQueueFollowupMessages(next)
  }

  const handleDescriptiveToolStepsToggle = () => {
    const next = !descriptiveToolSteps
    setDescriptiveToolSteps(next)
    themeStore.setDescriptiveToolSteps(next)
  }

  const handleInlineToolRequestsToggle = () => {
    const next = !inlineToolRequests
    setInlineToolRequests(next)
    themeStore.setInlineToolRequests(next)
  }

  const handleCompactInlinePermissionToggle = () => {
    const next = !compactInlinePermission
    setCompactInlinePermission(next)
    themeStore.setCompactInlinePermission(next)
  }

  const handleToolCardStyleChange = (style: ToolCardStyle) => {
    setToolCardStyle(style)
    themeStore.setToolCardStyle(style)
  }

  const handleImmersiveModeToggle = () => {
    const next = !immersiveMode
    setImmersiveMode(next)
    themeStore.setImmersiveMode(next)
    setInlineToolRequests(next)
    setDescriptiveToolSteps(next)
    setToolCardStyle(next ? 'compact' : 'classic')
    setCompactInlinePermission(next)
  }

  return (
    <div>
      <AgentProfiles />
      <SettingsSection title={t('agent.behavior')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('agent.behaviorDesc')}</p>

        <div>
          <p className="text-[length:var(--fs-md)] text-text-100 mb-1.5">{t('chat.alwaysAllowMode')}</p>
          <p className="text-[length:var(--fs-sm)] text-text-400 mb-3">{t('chat.alwaysAllowModeDesc')}</p>
          <SegmentedControl
            value={alwaysAllowMode}
            options={[
              { value: 'backend', label: t('chat.alwaysAllowBackend') },
              { value: 'frontend', label: t('chat.alwaysAllowFrontend') },
            ]}
            onChange={v => handleAlwaysAllowModeChange(v as AlwaysAllowMode)}
          />
        </div>

        <SettingRow
          label={t('chat.approvePendingOnFullAuto')}
          description={t('chat.approvePendingOnFullAutoDesc')}
          onClick={handleApprovePendingOnFullAutoToggle}
        >
          <Toggle enabled={approvePendingOnFullAuto} onChange={handleApprovePendingOnFullAutoToggle} />
        </SettingRow>

        <SettingRow
          label={t('chat.queueFollowupMessages')}
          description={t('chat.queueFollowupMessagesDesc')}
          onClick={handleQueueFollowupMessagesToggle}
        >
          <Toggle enabled={queueFollowupMessages} onChange={handleQueueFollowupMessagesToggle} />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t('agent.toolInteraction')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('agent.toolInteractionDesc')}</p>

        <SettingRow
          label={t('chat.immersiveMode')}
          description={t('chat.immersiveModeDesc')}
          onClick={handleImmersiveModeToggle}
        >
          <Toggle enabled={immersiveMode} onChange={handleImmersiveModeToggle} />
        </SettingRow>

        <SettingRow
          label={t('chat.inlineToolRequests')}
          description={t('chat.inlineToolRequestsDesc')}
          onClick={handleInlineToolRequestsToggle}
        >
          <Toggle enabled={inlineToolRequests} onChange={handleInlineToolRequestsToggle} />
        </SettingRow>

        <SettingRow
          label={t('chat.descriptiveToolSteps')}
          description={t('chat.descriptiveToolStepsDesc')}
          onClick={handleDescriptiveToolStepsToggle}
        >
          <Toggle enabled={descriptiveToolSteps} onChange={handleDescriptiveToolStepsToggle} />
        </SettingRow>

        <SettingRow
          label={t('chat.compactInlinePermission')}
          description={t('chat.compactInlinePermissionDesc')}
          onClick={handleCompactInlinePermissionToggle}
        >
          <Toggle enabled={compactInlinePermission} onChange={handleCompactInlinePermissionToggle} />
        </SettingRow>

        <div>
          <p className="text-[length:var(--fs-md)] text-text-100 mb-1.5">{t('chat.toolCardStyle')}</p>
          <p className="text-[length:var(--fs-sm)] text-text-400 mb-3">{t('chat.toolCardStyleDesc')}</p>
          <SegmentedControl
            value={toolCardStyle}
            options={[
              { value: 'classic', label: t('chat.toolCardClassic') },
              { value: 'compact', label: t('chat.toolCardCompact') },
            ]}
            onChange={v => handleToolCardStyleChange(v as ToolCardStyle)}
          />
        </div>
      </SettingsSection>
    </div>
  )
}

function AgentProfiles() {
  const { i18n } = useTranslation()
  const { currentDirectory } = useDirectory()
  const [scope, setScope] = useState<'global' | 'project'>(currentDirectory ? 'project' : 'global')
  const [config, setConfig] = useState<Config>()
  const [draft, setDraft] = useState<AgentDraft>()
  const [originalName, setOriginalName] = useState('')
  const [permissions, setPermissions] = useState('{}')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const zh = i18n.language.startsWith('zh')
  const agents = useMemo(() => {
    const value = (config as unknown as { agent?: unknown } | undefined)?.agent
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    return Object.entries(value as Record<string, AgentConfig>).filter((entry): entry is [string, AgentConfig] => Boolean(entry[1]) && typeof entry[1] === 'object')
  }, [config])

  useEffect(() => {
    let disposed = false
    setError('')
    const request = scope === 'project' && currentDirectory ? getConfig(currentDirectory) : getGlobalConfig()
    void request.then(value => {
      if (!disposed) setConfig(value)
    }).catch(cause => {
      apiErrorHandler('load agent profiles', cause)
      if (!disposed) setError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => {
      disposed = true
    }
  }, [currentDirectory, scope])

  const open = (name?: string, value?: AgentConfig) => {
    const next = { ...emptyAgent, ...value, name: name ?? '' }
    setDraft(next)
    setOriginalName(name ?? '')
    setPermissions(JSON.stringify(next.permission ?? {}, null, 2))
    setError('')
  }

  const save = async () => {
    if (!config || !draft?.name.trim()) return
    let permission: AgentConfig['permission']
    try {
      const value = JSON.parse(permissions || '{}') as unknown
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid')
      permission = value as AgentConfig['permission']
    } catch {
      setError(zh ? '权限必须是有效的 JSON 对象。' : 'Permissions must be a valid JSON object.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const existing = (config as unknown as { agent?: Record<string, AgentConfig> }).agent ?? {}
      const name = draft.name.trim()
      const nextAgents = { ...existing }
      if (originalName && originalName !== name) nextAgents[originalName] = { ...nextAgents[originalName], disable: true }
      nextAgents[name] = {
        description: draft.description?.trim() || undefined,
        mode: draft.mode,
        model: draft.model?.trim() || undefined,
        variant: draft.variant?.trim() || undefined,
        prompt: draft.prompt?.trim() || undefined,
        color: draft.color || undefined,
        hidden: draft.mode === 'subagent' ? draft.hidden : undefined,
        maxSteps: draft.maxSteps && draft.maxSteps > 0 ? draft.maxSteps : undefined,
        permission,
        disable: false,
      }
      const next = { ...(config as unknown as Record<string, unknown>), agent: nextAgents } as unknown as Config
      const saved = scope === 'project' && currentDirectory ? await updateConfig(next, currentDirectory) : await updateGlobalConfig(next)
      setConfig(saved)
      setDraft(undefined)
    } catch (cause) {
      apiErrorHandler('save agent profile', cause)
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const disable = async (name: string, value: AgentConfig) => {
    if (!config) return
    setBusy(true)
    try {
      const existing = (config as unknown as { agent?: Record<string, AgentConfig> }).agent ?? {}
      const next = { ...(config as unknown as Record<string, unknown>), agent: { ...existing, [name]: { ...value, disable: !value.disable } } } as unknown as Config
      setConfig(scope === 'project' && currentDirectory ? await updateConfig(next, currentDirectory) : await updateGlobalConfig(next))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsSection title={zh ? 'Agent 配置' : 'Agent profiles'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[length:var(--fs-sm)] text-text-400">{zh ? '管理 Primary Agent、Subagent、模型、提示词和工具权限。' : 'Manage primary agents, subagents, models, prompts, and tool permissions.'}</p>
          <div className="mt-2 inline-flex rounded-lg bg-bg-200/50 p-0.5">
            <button type="button" onClick={() => setScope('global')} className={`rounded-md px-2.5 py-1 text-[length:var(--fs-xs)] ${scope === 'global' ? 'bg-bg-000 text-text-100 shadow-sm' : 'text-text-400'}`}>{zh ? '全局' : 'Global'}</button>
            <button type="button" disabled={!currentDirectory} onClick={() => setScope('project')} className={`rounded-md px-2.5 py-1 text-[length:var(--fs-xs)] disabled:opacity-40 ${scope === 'project' ? 'bg-bg-000 text-text-100 shadow-sm' : 'text-text-400'}`}>{zh ? '当前项目' : 'Project'}</button>
          </div>
        </div>
        <Button size="sm" onClick={() => open()}>{zh ? '新建 Agent' : 'New agent'}</Button>
      </div>
      {error && !draft ? <p className="mt-3 rounded-lg bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">{error}</p> : null}
      <div className="mt-3 space-y-2">
        {agents.length === 0 ? <div className="rounded-lg border border-dashed border-border-200 px-3 py-6 text-center text-[length:var(--fs-sm)] text-text-400">{zh ? '当前作用域没有自定义 Agent。' : 'No custom agents in this scope.'}</div> : agents.map(([name, value]) => (
          <div key={name} className="flex items-center gap-3 rounded-lg border border-border-200/60 bg-bg-000/40 px-3 py-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: typeof value.color === 'string' && value.color.startsWith('#') ? value.color : 'var(--color-accent-main-100)' }} />
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-[length:var(--fs-sm)] font-medium text-text-100">{name}</span><span className="rounded bg-bg-200 px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400">{value.mode ?? 'all'}</span>{value.disable ? <span className="text-[length:var(--fs-xxs)] text-warning-100">{zh ? '已停用' : 'Disabled'}</span> : null}</div><p className="truncate text-[length:var(--fs-xs)] text-text-400">{value.description || value.model || (zh ? '未填写描述' : 'No description')}</p></div>
            <Button size="sm" variant="secondary" onClick={() => open(name, value)}>{zh ? '编辑' : 'Edit'}</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => open(`${name}-copy`, { ...value, disable: false })}>{zh ? '复制' : 'Duplicate'}</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void disable(name, value)}>{value.disable ? (zh ? '启用' : 'Enable') : (zh ? '停用' : 'Disable')}</Button>
          </div>
        ))}
      </div>
      <Dialog isOpen={Boolean(draft)} onClose={() => setDraft(undefined)} title={originalName ? (zh ? '编辑 Agent' : 'Edit agent') : (zh ? '新建 Agent' : 'New agent')} width={720}>
        {draft ? <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AgentField label={zh ? '名称' : 'Name'}><input value={draft.name} disabled={Boolean(originalName)} onChange={event => setDraft({ ...draft, name: event.target.value })} className={agentInput} /></AgentField>
            <AgentField label={zh ? '类型' : 'Mode'}><select value={draft.mode} onChange={event => setDraft({ ...draft, mode: event.target.value as AgentConfig['mode'] })} className={agentInput}><option value="primary">Primary</option><option value="subagent">Subagent</option><option value="all">All</option></select></AgentField>
            <AgentField label={zh ? '描述' : 'Description'} className="md:col-span-2"><input value={draft.description ?? ''} onChange={event => setDraft({ ...draft, description: event.target.value })} className={agentInput} /></AgentField>
            <AgentField label={zh ? '模型（provider/model）' : 'Model (provider/model)'}><input value={draft.model ?? ''} onChange={event => setDraft({ ...draft, model: event.target.value })} className={agentInput} /></AgentField>
            <AgentField label="Variant"><input value={draft.variant ?? ''} onChange={event => setDraft({ ...draft, variant: event.target.value })} className={agentInput} /></AgentField>
            <AgentField label={zh ? '颜色' : 'Color'}><input value={String(draft.color ?? '')} onChange={event => setDraft({ ...draft, color: event.target.value })} className={agentInput} placeholder="#4f8cff / accent" /></AgentField>
            <AgentField label={zh ? '最大步骤' : 'Maximum steps'}><input type="number" min={1} value={draft.maxSteps ?? ''} onChange={event => setDraft({ ...draft, maxSteps: Number(event.target.value) || undefined })} className={agentInput} /></AgentField>
            <AgentField label={zh ? '系统提示词' : 'System prompt'} className="md:col-span-2"><textarea rows={6} value={draft.prompt ?? ''} onChange={event => setDraft({ ...draft, prompt: event.target.value })} className={`${agentInput} h-auto py-2 font-mono`} /></AgentField>
            <AgentField label={zh ? '权限 JSON' : 'Permissions JSON'} className="md:col-span-2"><textarea rows={7} value={permissions} onChange={event => setPermissions(event.target.value)} className={`${agentInput} h-auto py-2 font-mono`} /></AgentField>
          </div>
          {draft.mode === 'subagent' ? <label className="flex items-center gap-2 text-[length:var(--fs-sm)] text-text-200"><input type="checkbox" checked={draft.hidden === true} onChange={event => setDraft({ ...draft, hidden: event.target.checked })} />{zh ? '从手动 @ 菜单隐藏' : 'Hide from the manual @ menu'}</label> : null}
          {error ? <p className="rounded-lg bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">{error}</p> : null}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDraft(undefined)}>{zh ? '取消' : 'Cancel'}</Button><Button isLoading={busy} onClick={() => void save()}>{zh ? '保存' : 'Save'}</Button></div>
        </div> : null}
      </Dialog>
    </SettingsSection>
  )
}

const agentInput = 'h-9 w-full rounded-lg border border-border-200 bg-bg-000 px-3 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100/70'

function AgentField(props: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block text-[length:var(--fs-xs)] text-text-300 ${props.className ?? ''}`}><span className="mb-1 block font-medium">{props.label}</span>{props.children}</label>
}
