import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { autoApproveStore } from '../../../store'
import type { AlwaysAllowMode } from '../../../store/autoApproveStore'
import { themeStore } from '../../../store/themeStore'
import { Toggle, SegmentedControl, SettingRow, SettingsSection } from './SettingsUI'
import { getConfig, getGlobalConfig, updateConfig, updateGlobalConfig } from '../../../api/config'
import { notifyAgentsChanged } from '../../../api/agent'
import { useModels } from '../../../hooks'
import type { AgentConfig, Config } from '../../../types/api/config'
import { Button, Dialog } from '../../../components/ui'
import { apiErrorHandler } from '../../../utils'
import { desktopPreferencesStore, useDesktopPreferences } from '../../../store/desktopPreferencesStore'

type AgentDraft = AgentConfig & { name: string }

const agentColors = [
  { value: 'accent', background: 'var(--color-accent-main-100)', zh: '强调色', en: 'Accent' },
  { value: 'secondary', background: 'var(--color-accent-secondary-100)', zh: '辅助色', en: 'Secondary' },
  { value: 'success', background: 'var(--color-success-100)', zh: '绿色', en: 'Green' },
  { value: 'warning', background: 'var(--color-warning-100)', zh: '橙色', en: 'Orange' },
  { value: 'error', background: 'var(--color-danger-100)', zh: '红色', en: 'Red' },
  { value: 'info', background: 'var(--color-info-100)', zh: '蓝色', en: 'Blue' },
]

function agentColor(color: unknown) {
  if (typeof color !== 'string') return 'var(--color-accent-main-100)'
  if (color.startsWith('#')) return color
  return agentColors.find(option => option.value === color)?.background ?? 'var(--color-accent-main-100)'
}

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
  const [compactInlinePermission, setCompactInlinePermission] = useState(themeStore.compactInlinePermission)
  const desktopPreferences = useDesktopPreferences()

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

  const handleBackgroundSubagentsToggle = () => {
    void desktopPreferencesStore
      .update({ backgroundSubagents: !desktopPreferences.backgroundSubagents })
      .catch(cause => apiErrorHandler('update background subagents', cause))
  }

  return (
    <div>
      <AgentProfiles scope="global" />
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

        <SettingRow
          label={t('agent.backgroundSubagents')}
          description={t('agent.backgroundSubagentsDesc')}
          onClick={handleBackgroundSubagentsToggle}
        >
          <Toggle
            enabled={desktopPreferences.backgroundSubagents}
            onChange={handleBackgroundSubagentsToggle}
            ariaLabel={t('agent.backgroundSubagents')}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t('agent.toolInteraction')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('agent.toolInteractionDesc')}</p>

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
      </SettingsSection>
    </div>
  )
}

interface AgentProfilesProps {
  scope: 'global' | 'project'
  directory?: string
  panel?: boolean
}

export function AgentProfiles({ scope, directory, panel = false }: AgentProfilesProps) {
  const { i18n } = useTranslation()
  const { models, isLoading: modelsLoading, error: modelsError } = useModels()
  const [config, setConfig] = useState<Config>()
  const [draft, setDraft] = useState<AgentDraft>()
  const [originalName, setOriginalName] = useState('')
  const [permissions, setPermissions] = useState('{}')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const zh = i18n.language.startsWith('zh')
  const agents = useMemo(() => {
    return Object.entries(configAgents(config)).filter((entry): entry is [string, AgentConfig] => Boolean(entry[1]) && typeof entry[1] === 'object')
  }, [config])
  const selectedModel = draft?.model
    ? models.find(model => `${model.providerId}/${model.id}` === draft.model)
    : undefined

  const permissionAction = (name: 'edit' | 'bash') => {
    try {
      const value = JSON.parse(permissions || '{}') as unknown
      if (!value || typeof value !== 'object' || Array.isArray(value)) return 'ask'
      const action = (value as Record<string, unknown>)[name]
      return action === 'allow' || action === 'deny' ? action : 'ask'
    } catch {
      return 'ask'
    }
  }

  const setPermissionAction = (name: 'edit' | 'bash', action: string) => {
    const value = (() => {
      try {
        const parsed = JSON.parse(permissions || '{}') as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
      } catch {
        // Replacing an invalid advanced draft through a basic control is intentional.
      }
      return {}
    })()
    setPermissions(JSON.stringify({ ...value, [name]: action }, null, 2))
  }

  const loadProfiles = useCallback(async () => {
    if (scope === 'global') return getGlobalConfig()
    if (!directory) return undefined
    const [effective, global] = await Promise.all([getConfig(directory), getGlobalConfig()])
    const globalAgents = configAgents(global)
    return {
      agent: Object.fromEntries(
        Object.entries(configAgents(effective)).filter(([name, value]) => JSON.stringify(value) !== JSON.stringify(globalAgents[name])),
      ),
    }
  }, [directory, scope])

  useEffect(() => {
    let disposed = false
    setError('')
    setDraft(undefined)
    setOriginalName('')
    void loadProfiles().then(value => {
      if (!disposed) setConfig(value)
    }).catch(cause => {
      apiErrorHandler('load agent profiles', cause)
      if (!disposed) setError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => {
      disposed = true
    }
  }, [loadProfiles])

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
      const existing = configAgents(config)
      const name = draft.name.trim()
      const steps = draft.steps ?? draft.maxSteps
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
        steps: steps && steps > 0 ? steps : undefined,
        permission,
        disable: false,
      }
      if (scope === 'project') {
        await updateConfig({ agent: nextAgents }, directory)
        setConfig(await loadProfiles())
      } else {
        setConfig(await updateGlobalConfig({ ...config, agent: nextAgents }))
      }
      notifyAgentsChanged()
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
      const nextAgents = { ...configAgents(config), [name]: { ...value, disable: !value.disable } }
      if (scope === 'project') {
        await updateConfig({ agent: nextAgents }, directory)
        setConfig(await loadProfiles())
      } else {
        setConfig(await updateGlobalConfig({ ...config, agent: nextAgents }))
      }
      notifyAgentsChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[length:var(--fs-sm)] text-text-400">
            {scope === 'global'
              ? (zh ? '管理适用于所有项目的 Primary Agent、Subagent、模型、提示词和工具权限。' : 'Manage primary agents, subagents, models, prompts, and tool permissions shared by every project.')
              : (zh ? '管理仅适用于当前项目的 Agent 配置。' : 'Manage agent profiles scoped to the current project.')}
          </p>
          {scope === 'project' && directory ? (
            <p className="mt-1 truncate font-mono text-[length:var(--fs-xxs)] text-text-500" title={directory}>{directory}</p>
          ) : null}
        </div>
        <Button size="sm" onClick={() => open()}>{zh ? '新建 Agent' : 'New agent'}</Button>
      </div>
      {error && !draft ? <p className="mt-3 rounded-lg bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">{error}</p> : null}
      <div className="mt-3 space-y-2">
        {agents.length === 0 ? <div className="rounded-lg border border-dashed border-border-200 px-3 py-6 text-center text-[length:var(--fs-sm)] text-text-400">{scope === 'global' ? (zh ? '没有全局自定义 Agent。' : 'No global custom agents.') : (zh ? '当前项目没有自定义 Agent。' : 'No custom agents in this project.')}</div> : agents.map(([name, value]) => (
          <div key={name} className="flex items-center gap-3 rounded-lg border border-border-200/60 bg-bg-000/40 px-3 py-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: agentColor(value.color) }} />
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-[length:var(--fs-sm)] font-medium text-text-100">{name}</span><span className="rounded bg-bg-200 px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400">{value.mode ?? 'all'}</span>{value.disable ? <span className="text-[length:var(--fs-xxs)] text-warning-100">{zh ? '已停用' : 'Disabled'}</span> : null}</div><p className="truncate text-[length:var(--fs-xs)] text-text-400">{value.description || value.model || (zh ? '未填写描述' : 'No description')}</p></div>
            <Button size="sm" variant="secondary" onClick={() => open(name, value)}>{zh ? '编辑' : 'Edit'}</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => open(`${name}-copy`, { ...value, disable: false })}>{zh ? '复制' : 'Duplicate'}</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void disable(name, value)}>{value.disable ? (zh ? '启用' : 'Enable') : (zh ? '停用' : 'Disable')}</Button>
          </div>
        ))}
      </div>
      <Dialog isOpen={Boolean(draft)} onClose={() => setDraft(undefined)} title={originalName ? (zh ? '编辑 Agent' : 'Edit agent') : (zh ? '新建 Agent' : 'New agent')} width={720}>
        {draft ? <div className="space-y-3">
          <div className="rounded-lg border border-accent-main-100/20 bg-accent-main-100/5 px-3 py-2 text-[length:var(--fs-xs)] leading-relaxed text-text-300">
            {zh
              ? 'Agent 是可复用的工作模式。Primary 会出现在新对话输入框的 Agent 下拉菜单中；Subagent 可通过 @ 选择或由其他 Agent 调用。通常只需填写名称、用途和系统提示词，其余保持默认即可。'
              : 'An agent is a reusable working mode. Primary agents appear in the composer Agent menu; subagents can be selected with @ or called by other agents. Usually you only need a name, purpose, and system prompt.'}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AgentField label={zh ? '名称' : 'Name'} description={zh ? '用于菜单显示，例如 code-reviewer。' : 'Shown in menus, for example code-reviewer.'}>
              <input value={draft.name} disabled={Boolean(originalName)} onChange={event => setDraft({ ...draft, name: event.target.value })} className={agentInput} placeholder="code-reviewer" />
            </AgentField>
            <AgentField label={zh ? '类型' : 'Mode'} description={zh ? '决定 Agent 出现和被调用的位置。' : 'Controls where the agent appears and can be called.'}>
              <select value={draft.mode} onChange={event => setDraft({ ...draft, mode: event.target.value as AgentConfig['mode'] })} className={agentInput}>
                <option value="primary">{zh ? 'Primary（对话中直接选择）' : 'Primary (select in chat)'}</option>
                <option value="subagent">{zh ? 'Subagent（通过 @ 或其他 Agent 调用）' : 'Subagent (called with @ or by agents)'}</option>
                <option value="all">{zh ? 'All（两种方式都可用）' : 'All (available in both places)'}</option>
              </select>
            </AgentField>
            <AgentField label={zh ? '用途说明' : 'Purpose'} description={zh ? '告诉你和其他 Agent 什么时候应该使用它。' : 'Explains when you or another agent should use it.'} className="md:col-span-2">
              <input value={draft.description ?? ''} onChange={event => setDraft({ ...draft, description: event.target.value })} className={agentInput} placeholder={zh ? '例如：审查 TypeScript 代码并给出可执行的修改建议' : 'For example: Review TypeScript and suggest actionable changes'} />
            </AgentField>
            <AgentField label={zh ? '模型' : 'Model'} description={zh ? '不指定时跟随当前对话选择的模型。' : 'Leave unset to follow the model selected in the conversation.'}>
              <select
                value={draft.model ?? ''}
                onChange={event => setDraft({ ...draft, model: event.target.value || undefined, variant: undefined })}
                className={agentInput}
                disabled={modelsLoading && models.length === 0}
              >
                <option value="">{modelsLoading ? (zh ? '正在加载模型…' : 'Loading models…') : (zh ? '跟随当前对话模型（推荐）' : 'Follow conversation model (recommended)')}</option>
                {draft.model && !models.some(model => `${model.providerId}/${model.id}` === draft.model) ? <option value={draft.model}>{draft.model} ({zh ? '当前不可用' : 'unavailable'})</option> : null}
                {models.map(model => <option key={`${model.providerId}/${model.id}`} value={`${model.providerId}/${model.id}`}>{model.providerName} · {model.name}</option>)}
              </select>
              {modelsError ? <span className="mt-1 block text-[length:var(--fs-xxs)] text-warning-100">{zh ? '模型列表加载失败，将跟随当前对话模型。' : 'Could not load models; the conversation model will be used.'}</span> : null}
            </AgentField>
            <AgentField label={zh ? '推理强度' : 'Reasoning effort'} description={zh ? '仅显示所选模型支持的选项。' : 'Only options supported by the selected model are shown.'}>
              <select
                value={draft.variant ?? ''}
                onChange={event => setDraft({ ...draft, variant: event.target.value || undefined })}
                className={agentInput}
                disabled={!selectedModel || selectedModel.variants.length === 0}
              >
                <option value="">{zh ? '默认' : 'Default'}</option>
                {draft.variant && !selectedModel?.variants.includes(draft.variant) ? <option value={draft.variant}>{draft.variant}</option> : null}
                {selectedModel?.variants.map(variant => <option key={variant} value={variant}>{variant}</option>)}
              </select>
            </AgentField>
            <AgentField label={zh ? '标识颜色' : 'Color'} description={zh ? '用于菜单中快速识别这个 Agent。' : 'Used to identify this agent in menus.'}>
              <div className="flex h-9 items-center gap-2">
                {agentColors.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    title={zh ? option.zh : option.en}
                    aria-label={zh ? option.zh : option.en}
                    aria-pressed={draft.color === option.value}
                    onClick={() => setDraft({ ...draft, color: option.value })}
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${draft.color === option.value ? 'border-text-100 ring-2 ring-accent-main-100/25' : 'border-bg-000'}`}
                    style={{ background: option.background }}
                  />
                ))}
              </div>
            </AgentField>
            <AgentField label={zh ? '最大执行步骤' : 'Maximum steps'} description={zh ? '留空使用系统默认值；只有需要限制执行轮数时才填写。' : 'Leave blank for the system default; set only when you need a hard limit.'}>
              <input type="number" min={1} value={draft.steps ?? draft.maxSteps ?? ''} onChange={event => setDraft({ ...draft, steps: Number(event.target.value) || undefined, maxSteps: undefined })} className={agentInput} placeholder={zh ? '系统默认' : 'System default'} />
            </AgentField>
            <AgentField label={zh ? '系统提示词' : 'System prompt'} description={zh ? '描述它的角色、目标、工作方式和输出要求。' : 'Describe its role, goals, working style, and expected output.'} className="md:col-span-2">
              <textarea rows={5} value={draft.prompt ?? ''} onChange={event => setDraft({ ...draft, prompt: event.target.value })} className={`${agentInput} h-auto py-2`} placeholder={zh ? '例如：你是一名代码审查专家。优先发现真实缺陷，并按严重程度给出简洁建议……' : 'For example: You are a code review expert. Prioritize real defects and give concise, severity-ranked feedback…'} />
            </AgentField>
            <div className="md:col-span-2 rounded-lg border border-border-200/60 bg-bg-050 px-3 py-2.5">
              <div className="mb-2 text-[length:var(--fs-xs)] font-medium text-text-300">{zh ? '工具权限' : 'Tool permissions'}</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <AgentField label={zh ? '编辑文件' : 'Edit files'}>
                  <select value={permissionAction('edit')} onChange={event => setPermissionAction('edit', event.target.value)} className={agentInput}>
                    <option value="ask">{zh ? '每次询问' : 'Ask every time'}</option>
                    <option value="allow">{zh ? '自动允许' : 'Always allow'}</option>
                    <option value="deny">{zh ? '禁止' : 'Deny'}</option>
                  </select>
                </AgentField>
                <AgentField label={zh ? '运行命令' : 'Run commands'}>
                  <select value={permissionAction('bash')} onChange={event => setPermissionAction('bash', event.target.value)} className={agentInput}>
                    <option value="ask">{zh ? '每次询问' : 'Ask every time'}</option>
                    <option value="allow">{zh ? '自动允许' : 'Always allow'}</option>
                    <option value="deny">{zh ? '禁止' : 'Deny'}</option>
                  </select>
                </AgentField>
              </div>
              <details className="mt-2 text-[length:var(--fs-xs)] text-text-400">
                <summary className="cursor-pointer select-none hover:text-text-200">{zh ? '高级权限 JSON（可选）' : 'Advanced permissions JSON (optional)'}</summary>
                <textarea rows={5} value={permissions} onChange={event => setPermissions(event.target.value)} className={`${agentInput} mt-2 h-auto py-2 font-mono`} />
              </details>
            </div>
          </div>
          {draft.mode === 'subagent' ? <label className="flex items-center gap-2 text-[length:var(--fs-sm)] text-text-200"><input type="checkbox" checked={draft.hidden === true} onChange={event => setDraft({ ...draft, hidden: event.target.checked })} />{zh ? '从手动 @ 菜单隐藏' : 'Hide from the manual @ menu'}</label> : null}
          {error ? <p className="rounded-lg bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">{error}</p> : null}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDraft(undefined)}>{zh ? '取消' : 'Cancel'}</Button><Button disabled={!draft.name.trim()} isLoading={busy} onClick={() => void save()}>{zh ? '保存' : 'Save'}</Button></div>
        </div> : null}
      </Dialog>
    </>
  )

  if (scope === 'project' && !directory) {
    return <div className="flex h-full items-center justify-center px-6 text-center text-[length:var(--fs-sm)] text-text-400">{zh ? '请先选择项目，再管理项目 Agent。' : 'Select a project before managing project agents.'}</div>
  }

  if (panel) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <section className="mx-auto max-w-3xl rounded-xl border border-border-200 bg-bg-100 p-4">
          <h2 className="mb-3 text-[length:var(--fs-base)] font-medium text-text-100">{zh ? '项目 Agent' : 'Project agents'}</h2>
          {content}
        </section>
      </div>
    )
  }

  return <SettingsSection title={zh ? '全局 Agent 配置' : 'Global agent profiles'}>{content}</SettingsSection>
}

function configAgents(config?: Config) {
  return Object.fromEntries(
    Object.entries(config?.agent ?? {}).filter((entry): entry is [string, AgentConfig] => Boolean(entry[1])),
  )
}

const agentInput = 'h-9 w-full rounded-lg border border-border-200 bg-bg-000 px-3 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100/70'

function AgentField(props: { label: string; children: React.ReactNode; className?: string; description?: string }) {
  return <label className={`block text-[length:var(--fs-xs)] text-text-300 ${props.className ?? ''}`}><span className="mb-1 block font-medium">{props.label}</span>{props.children}{props.description ? <span className="mt-1 block text-[length:var(--fs-xxs)] leading-relaxed text-text-500">{props.description}</span> : null}</label>
}
