import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { layoutStore } from '../store/layoutStore'
import {
  TerminalIcon,
  FolderIcon,
  GitCommitIcon,
  GlobeIcon,
  GitWorktreeIcon,
  FileIcon,
  AgentIcon,
} from './Icons'

interface MenuItem {
  id: string
  icon: React.ReactNode
  label: string
  action: () => void
  disabled?: boolean
  disabledHint?: string
}

export const RightPanelEmptyGuide = memo(function RightPanelEmptyGuide({ directory, onNewTerminal }: { directory?: string; onNewTerminal?: () => void }) {
  const { t } = useTranslation(['components', 'common'])

  const menuItems: MenuItem[] = [
    {
      id: 'terminal',
      icon: <TerminalIcon size={16} />,
      label: t('terminal.terminal'),
      action: () => onNewTerminal?.(),
    },
    {
      id: 'files',
      icon: <FolderIcon size={16} />,
      label: t('panelContainer.files'),
      action: () => layoutStore.addFilesTab('right'),
    },
    {
      id: 'changes',
      icon: <GitCommitIcon size={16} />,
      label: t('panelContainer.changes'),
      action: () => layoutStore.addChangesTab('right'),
    },
    {
      id: 'preview',
      icon: <GlobeIcon size={16} />,
      label: t('panelContainer.preview'),
      action: () => layoutStore.addPreviewTab('right'),
    },
    {
      id: 'worktree',
      icon: <GitWorktreeIcon size={16} />,
      label: t('panelContainer.worktrees'),
      action: () => layoutStore.addWorktreeTab('right'),
    },
    {
      id: 'project-instructions',
      icon: <FileIcon size={16} />,
      label: t('panelContainer.projectInstructions'),
      action: () => layoutStore.addProjectInstructionsTab(),
      disabled: !directory,
      disabledHint: directory ? undefined : t('panelContainer.selectProject'),
    },
    {
      id: 'project-agents',
      icon: <AgentIcon size={16} />,
      label: t('panelContainer.projectAgents'),
      action: () => layoutStore.addProjectAgentsTab(),
      disabled: !directory,
      disabledHint: directory ? undefined : t('panelContainer.selectProject'),
    },
    {
      id: 'workspace-memory',
      icon: <AgentIcon size={16} />,
      label: t('panelContainer.workspaceMemory'),
      action: () => layoutStore.addWorkspaceMemoryTab(),
      disabled: !directory,
      disabledHint: directory ? undefined : t('panelContainer.selectProject'),
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="mb-6 text-text-300">
        <h2 className="text-lg font-medium mb-2">{t('rightPanel.emptyGuide.title', '打开标签页')}</h2>
        <p className="text-sm">{t('rightPanel.emptyGuide.description', '选择要在侧边面板中打开的标签。')}</p>
      </div>
      
      <div className="w-full max-w-[280px] space-y-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={item.action}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-150
              ${item.disabled 
                ? 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-text-200' 
                : 'hover:bg-bg-200/60 hover:text-text-100 text-text-200'}
            `}
            title={item.disabledHint}
          >
            <span className="opacity-60 shrink-0">{item.icon}</span>
            <span className="text-[length:var(--fs-sm)]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
})
