import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDirectory, useServerStore, useTheme } from '../../../hooks'
import { layoutStore, projectProfileStore, useLayoutStore, useProjectProfiles } from '../../../store'
import { projectEnvironmentStore, useProjectEnvironmentSnapshots } from '../../../store/projectEnvironmentStore'
import type { ProjectProfile } from '../../../store'
import { Button } from '../../../components/ui'
import { Toggle, SettingRow, SettingsSection } from './SettingsUI'
import { getProjects } from '../../../api/client'
import { getVcsDiff, getVcsInfo, listVcsBranches, switchVcsBranch, type VcsBranch } from '../../../api/vcs'
import type { ApiProject } from '../../../api'

export function WorkspaceSettings() {
  const { t } = useTranslation(['settings'])
  const {
    codeWordWrap,
    setCodeWordWrap,
    manualTerminalTitles,
    setManualTerminalTitles,
  } = useTheme()
  const {
    sidebarFolderRecents,
    sidebarFolderRecentsShowDiff,
    sidebarShowChildSessions,
    terminalCopyOnSelect,
    terminalRightClickPaste,
    wakeLock,
  } = useLayoutStore()

  return (
    <div>
      <SettingsSection title={t('workspace.layout')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('workspace.layoutDesc')}</p>

        <SettingRow
          label={t('appearance.wakeLock')}
          description={t('appearance.wakeLockDesc')}
          onClick={() => layoutStore.setWakeLock(!wakeLock)}
        >
          <Toggle enabled={wakeLock} onChange={() => layoutStore.setWakeLock(!wakeLock)} />
        </SettingRow>

        <SettingRow
          label={t('appearance.codeWordWrap')}
          description={t('appearance.codeWordWrapDesc')}
          onClick={() => setCodeWordWrap(!codeWordWrap)}
        >
          <Toggle enabled={codeWordWrap} onChange={() => setCodeWordWrap(!codeWordWrap)} />
        </SettingRow>

        <SettingRow
          label={t('workspace.manualTerminalTitles')}
          description={t('workspace.manualTerminalTitlesDesc')}
          onClick={() => {
            const next = !manualTerminalTitles
            setManualTerminalTitles(next)
            layoutStore.syncTerminalTitleMode(next)
          }}
        >
          <Toggle
            enabled={manualTerminalTitles}
            onChange={() => {
              const next = !manualTerminalTitles
              setManualTerminalTitles(next)
              layoutStore.syncTerminalTitleMode(next)
            }}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t('workspace.terminal')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('workspace.terminalDesc')}</p>

        <SettingRow
          label={t('workspace.terminalCopyOnSelect')}
          description={t('workspace.terminalCopyOnSelectDesc')}
          onClick={() => layoutStore.setTerminalCopyOnSelect(!terminalCopyOnSelect)}
        >
          <Toggle
            enabled={terminalCopyOnSelect}
            onChange={() => layoutStore.setTerminalCopyOnSelect(!terminalCopyOnSelect)}
          />
        </SettingRow>

        <SettingRow
          label={t('workspace.terminalRightClickPaste')}
          description={t('workspace.terminalRightClickPasteDesc')}
          onClick={() => layoutStore.setTerminalRightClickPaste(!terminalRightClickPaste)}
        >
          <Toggle
            enabled={terminalRightClickPaste}
            onChange={() => layoutStore.setTerminalRightClickPaste(!terminalRightClickPaste)}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t('workspace.sidebar')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('workspace.sidebarDesc')}</p>

        <SettingRow
          label={t('appearance.folderStyleRecents')}
          description={t('appearance.folderStyleRecentsDesc')}
          onClick={() => layoutStore.setSidebarFolderRecents(!sidebarFolderRecents)}
        >
          <Toggle
            enabled={sidebarFolderRecents}
            onChange={() => layoutStore.setSidebarFolderRecents(!sidebarFolderRecents)}
          />
        </SettingRow>

        <SettingRow
          label={t('appearance.folderStyleRecentsShowDiff')}
          description={t('appearance.folderStyleRecentsShowDiffDesc')}
          onClick={() => layoutStore.setSidebarFolderRecentsShowDiff(!sidebarFolderRecentsShowDiff)}
        >
          <Toggle
            enabled={sidebarFolderRecentsShowDiff}
            onChange={() => layoutStore.setSidebarFolderRecentsShowDiff(!sidebarFolderRecentsShowDiff)}
          />
        </SettingRow>

        <SettingRow
          label={t('appearance.showChildSessions')}
          description={t('appearance.showChildSessionsDesc')}
          onClick={() => layoutStore.setSidebarShowChildSessions(!sidebarShowChildSessions)}
        >
          <Toggle
            enabled={sidebarShowChildSessions}
            onChange={() => layoutStore.setSidebarShowChildSessions(!sidebarShowChildSessions)}
          />
        </SettingRow>
      </SettingsSection>
    </div>
  )
}

function ProjectOverview() {
  const { i18n } = useTranslation()
  const { currentDirectory } = useDirectory()
  const { activeServer, getHealth } = useServerStore()
  const health = activeServer ? getHealth(activeServer.id) : null
  const zh = i18n.language.startsWith('zh')
  const [branches, setBranches] = useState<VcsBranch[]>([])
  const [dirtyFiles, setDirtyFiles] = useState(0)
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    if (!currentDirectory) return
    setBusy(true)
    setError('')
    try {
      const [vcs, nextBranches, diffs, nextProjects] = await Promise.all([
        getVcsInfo(currentDirectory),
        listVcsBranches(currentDirectory).catch(() => []),
        getVcsDiff('git', currentDirectory).catch(() => []),
        getProjects(undefined, activeServer?.id).catch(() => []),
      ])
      setBranches(vcs ? nextBranches : [])
      setDirtyFiles(diffs.length)
      setProjects(nextProjects)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => { void load() }, [activeServer?.id, currentDirectory])
  const currentBranch = branches.find(branch => branch.current)?.name
  return <SettingsSection title={zh ? '项目详情' : 'Project details'}>
    <p className="text-[length:var(--fs-sm)] text-text-400">{zh ? '集中查看项目位置、服务器、Git 状态和远程服务器可见的项目。' : 'Inspect project location, server, Git state, and projects visible to the remote server.'}</p>
    {!currentDirectory ? <div className="rounded-lg border border-dashed border-border-200 px-3 py-5 text-center text-[length:var(--fs-sm)] text-text-400">{zh ? '请先选择项目。' : 'Select a project first.'}</div> : <>
      <div className="grid gap-2 md:grid-cols-4">
        <ProjectMetric label={zh ? '服务器' : 'Server'} value={`${activeServer?.name ?? '—'} · ${health?.status === 'online' ? (zh ? '在线' : 'Online') : (zh ? '离线' : 'Offline')}`} />
        <ProjectMetric label={zh ? '当前分支' : 'Current branch'} value={currentBranch ?? (zh ? '非 Git 项目' : 'Not a Git project')} />
        <ProjectMetric label={zh ? '未提交文件' : 'Changed files'} value={String(dirtyFiles)} tone={dirtyFiles ? 'warning' : 'success'} />
        <ProjectMetric label={zh ? '远程项目数' : 'Remote projects'} value={String(projects.length)} />
      </div>
      <div className="rounded-lg border border-border-200/50 bg-bg-050 p-3">
        <div className="font-mono text-[length:var(--fs-xs)] text-text-300">{currentDirectory}</div>
        {branches.length > 0 && <div className="mt-3 flex items-center gap-2"><span className="text-[length:var(--fs-xs)] text-text-400">{zh ? '切换分支' : 'Switch branch'}</span><select value={currentBranch ?? ''} disabled={busy || dirtyFiles > 0} onChange={event => { setBusy(true); void switchVcsBranch(event.target.value, currentDirectory).then(load, cause => { setError(cause instanceof Error ? cause.message : String(cause)); setBusy(false) }) }} className="h-8 min-w-48 rounded-md border border-border-200 bg-bg-000 px-2 text-[length:var(--fs-xs)] text-text-100">{branches.map(branch => <option key={branch.name}>{branch.name}</option>)}</select>{dirtyFiles > 0 && <span className="text-[length:var(--fs-xxs)] text-warning-100">{zh ? '请先处理未提交修改' : 'Resolve uncommitted changes first'}</span>}</div>}
      </div>
      {projects.length > 0 && <details className="rounded-lg border border-border-200/50 px-3 py-2"><summary className="cursor-pointer text-[length:var(--fs-sm)] text-text-200">{zh ? '服务器项目目录' : 'Server project catalog'} ({projects.length})</summary><div className="mt-2 max-h-40 space-y-1 overflow-auto">{projects.map(project => <div key={project.id} className="truncate rounded bg-bg-100 px-2 py-1 font-mono text-[length:var(--fs-xxs)] text-text-400">{project.worktree}</div>)}</div></details>}
      {error && <div className="rounded-md bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100">{error}</div>}
      <div className="flex justify-end"><Button variant="secondary" isLoading={busy} onClick={() => void load()}>{zh ? '刷新状态' : 'Refresh status'}</Button></div>
    </>}
  </SettingsSection>
}

function ProjectMetric(props: { label: string; value: string; tone?: 'warning' | 'success' }) {
  return <div className="rounded-lg border border-border-200/50 bg-bg-050 px-3 py-2"><div className="text-[length:var(--fs-xxs)] text-text-500">{props.label}</div><div className={`mt-1 truncate text-[length:var(--fs-sm)] font-medium ${props.tone === 'warning' ? 'text-warning-100' : props.tone === 'success' ? 'text-success-100' : 'text-text-200'}`}>{props.value}</div></div>
}

function ProjectProfileSettings() {
  useProjectProfiles()
  useProjectEnvironmentSnapshots()
  const { i18n } = useTranslation()
  const { currentDirectory } = useDirectory()
  const { servers } = useServerStore()
  const zh = i18n.language.startsWith('zh')
  const [draft, setDraft] = useState<Omit<ProjectProfile, 'updatedAt'>>()
  const [saved, setSaved] = useState(false)
  const snapshots = currentDirectory ? projectEnvironmentStore.list(currentDirectory) : []

  useEffect(() => {
    if (!currentDirectory) {
      setDraft(undefined)
      return
    }
    const profile = projectProfileStore.get(currentDirectory)
    setDraft(profile ? { ...profile } : {
      directory: currentDirectory,
      executionMode: 'current',
      setupCommands: [],
      enabledSkills: [],
      enabledMcp: [],
    })
  }, [currentDirectory])

  return (
    <SettingsSection title={zh ? '项目 Profile' : 'Project profile'}>
      <p className="text-[length:var(--fs-sm)] text-text-400">{zh ? '为当前项目保存新建任务默认值、环境初始化和能力范围。' : 'Save task defaults, environment setup, and enabled capabilities for the current project.'}</p>
      {!draft ? <div className="rounded-lg border border-dashed border-border-200 px-3 py-5 text-center text-[length:var(--fs-sm)] text-text-400">{zh ? '请先在主界面选择项目。' : 'Select a project in the main window first.'}</div> : <div className="space-y-3">
        <div className="rounded-lg bg-bg-200/35 px-3 py-2 font-mono text-[length:var(--fs-xs)] text-text-300">{draft.directory}</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ProfileField label={zh ? '默认服务器' : 'Default server'}><select className={profileInput} value={draft.defaultServerId ?? ''} onChange={event => setDraft({ ...draft, defaultServerId: event.target.value || undefined })}><option value="">{zh ? '跟随全局默认' : 'Use global default'}</option>{servers.map(server => <option key={server.id} value={server.id}>{server.name} · {server.url}</option>)}</select></ProfileField>
          <ProfileField label={zh ? '执行模式' : 'Execution mode'}><select className={profileInput} value={draft.executionMode} onChange={event => setDraft({ ...draft, executionMode: event.target.value as 'current' | 'worktree' })}><option value="current">{zh ? '当前工作区' : 'Current workspace'}</option><option value="worktree">Worktree</option></select></ProfileField>
          <ProfileField label={zh ? '默认 Agent' : 'Default agent'}><input className={profileInput} value={draft.defaultAgent ?? ''} onChange={event => setDraft({ ...draft, defaultAgent: event.target.value || undefined })} placeholder="build" /></ProfileField>
          <ProfileField label={zh ? '默认模型（provider:model）' : 'Default model (provider:model)'}><input className={profileInput} value={draft.defaultModelKey ?? ''} onChange={event => setDraft({ ...draft, defaultModelKey: event.target.value || undefined })} /></ProfileField>
          <ProfileField label={zh ? '默认分支' : 'Default branch'}><input className={profileInput} value={draft.defaultBranch ?? ''} onChange={event => setDraft({ ...draft, defaultBranch: event.target.value || undefined })} placeholder="dev / main" /></ProfileField>
          <ProfileField label={zh ? '权限配置' : 'Permission profile'}><select className={profileInput} value={draft.permissionProfile ?? ''} onChange={event => setDraft({ ...draft, permissionProfile: event.target.value || undefined })}><option value="">{zh ? '跟随新建任务' : 'Use task selection'}</option><option value="ask">Ask</option><option value="writes">Writes</option><option value="risk">Risk</option><option value="full">Full</option></select></ProfileField>
          <ProfileField label={zh ? '沙箱 Profile' : 'Sandbox profile'}><input className={profileInput} value={draft.sandboxProfile ?? ''} onChange={event => setDraft({ ...draft, sandboxProfile: event.target.value || undefined })} placeholder="default / strict" /></ProfileField>
          <ProfileField label={zh ? '启用技能（逗号分隔）' : 'Enabled skills'}><input className={profileInput} value={draft.enabledSkills.join(', ')} onChange={event => setDraft({ ...draft, enabledSkills: splitProfileList(event.target.value) })} /></ProfileField>
          <ProfileField label={zh ? '启用 MCP（逗号分隔）' : 'Enabled MCP servers'}><input className={profileInput} value={draft.enabledMcp.join(', ')} onChange={event => setDraft({ ...draft, enabledMcp: splitProfileList(event.target.value) })} /></ProfileField>
          <ProfileField label={zh ? '初始化命令（每行一条）' : 'Setup commands'} className="md:col-span-2"><textarea rows={4} className={`${profileInput} h-auto py-2 font-mono`} value={draft.setupCommands.join('\n')} onChange={event => setDraft({ ...draft, setupCommands: event.target.value.split(/\r?\n/).map(item => item.trim()).filter(Boolean) })} /></ProfileField>
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { projectProfileStore.remove(draft.directory); setDraft({ directory: draft.directory, executionMode: 'current', setupCommands: [], enabledSkills: [], enabledMcp: [] }); setSaved(false) }}>{zh ? '清除 Profile' : 'Clear profile'}</Button><Button onClick={() => { projectProfileStore.save(draft); setSaved(true) }}>{zh ? '保存 Profile' : 'Save profile'}</Button></div>
        {saved ? <p className="text-right text-[length:var(--fs-xs)] text-success-100">{zh ? '已保存，新建任务时自动应用。' : 'Saved and applied to new tasks.'}</p> : null}
        <div className="rounded-lg border border-border-200/50 bg-bg-050 p-3"><div className="text-[length:var(--fs-xs)] font-medium text-text-200">{zh ? '环境快照' : 'Environment snapshots'}</div><div className="mt-1 text-[length:var(--fs-xxs)] text-text-500">{zh ? 'Profile 更新后，下一次新建任务会在沙箱中按顺序执行初始化命令，并记录服务器、分支和工作区状态。' : 'After profile changes, the next task runs setup commands in the sandbox and records its server, branch, and workspace state.'}</div>{snapshots.length === 0 ? <div className="mt-2 text-[length:var(--fs-xs)] text-text-500">{zh ? '尚无快照' : 'No snapshots yet'}</div> : <div className="mt-2 space-y-1">{snapshots.slice(0, 5).map(snapshot => <div key={snapshot.id} className="flex justify-between rounded bg-bg-100 px-2 py-1 font-mono text-[length:var(--fs-xxs)] text-text-400"><span>{snapshot.branch || '—'} · {snapshot.dirtyFiles} dirty · {snapshot.setupCommands.length} setup</span><span>{new Date(snapshot.createdAt).toLocaleString()}</span></div>)}</div>}</div>
      </div>}
    </SettingsSection>
  )
}

const profileInput = 'h-9 w-full rounded-lg border border-border-200 bg-bg-000 px-3 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100/70'

function ProfileField(props: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block text-[length:var(--fs-xs)] text-text-300 ${props.className ?? ''}`}><span className="mb-1 block font-medium">{props.label}</span>{props.children}</label>
}

function splitProfileList(value: string) {
  return value.split(/[\s,]+/).map(item => item.trim()).filter(Boolean)
}
