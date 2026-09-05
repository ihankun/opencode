import type { SettingsTab } from './SettingsDialog'

export interface SettingsSearchDefinition {
  tab: SettingsTab
  labelKey: string
  targetKey?: string
  fallbackKey?: string
  contextKey?: string
}

export interface SearchMenuItem {
  id: string
  label: string
  tabLabel: string
  description?: string
  searchText?: string
}

export interface SettingsSearchItem extends SearchMenuItem {
  tab: SettingsTab
  targetLabel: string
  fallbackLabel?: string
  targetContext?: string
}

const definitions = (tab: SettingsTab, labelKeys: string[]): SettingsSearchDefinition[] =>
  labelKeys.map(labelKey => ({ tab, labelKey }))

export const SETTINGS_SEARCH_DEFINITIONS: SettingsSearchDefinition[] = [
  ...definitions('general', ['general.defaultFileOpenTarget', 'general.showMenuBarIcon', 'general.hideDockOnClose']),
  ...definitions('quota', ['general.quotaDisplay']),
  ...definitions('servers', ['servers.connections']),
  ...definitions('hosting', ['servers.hosting.title']),
  ...definitions('providers', ['tabs.providers']),
  ...definitions('models', ['models.visibility']),
  ...definitions('speechModel', ['speechModel.provider', 'speechModel.baseUrl', 'speechModel.model', 'speechModel.language', 'speechModel.apiKey']),
  ...definitions('agent', ['agent.behavior', 'agent.backgroundSubagents', 'agent.questionAutoContinue', 'chat.approvePendingOnFullAuto', 'chat.queueFollowupMessages', 'chat.processCollapse']),
  ...definitions('chat', ['chat.pathsFormatting', 'chat.conversationExperience', 'chat.stepFinishInfo', 'chat.enterKeyBehavior', 'chat.actionsOnLatestAssistantOnly', 'chat.desktopCollapsedInputDock']),
  ...definitions('workspace', ['workspace.layout', 'workspace.terminal', 'workspace.sidebar', 'appearance.wakeLock', 'appearance.codeWordWrap', 'workspace.manualTerminalTitles', 'workspace.terminalCopyOnSelect', 'workspace.terminalRightClickPaste', 'appearance.showChildSessions']),
  ...definitions('appearance', ['appearance.display', 'appearance.colorMode', 'appearance.glassEffect', 'appearance.uiFontScale', 'appearance.codeFontScale', 'appearance.language', 'appearance.codeBlockThemes', 'appearance.codeBlockThemeLight', 'appearance.codeBlockThemeDark']),
  ...definitions('notifications', ['notifications.systemNotifications', 'notifications.inAppAlerts', 'notifications.toastNotifications', 'notifications.soundSettings', 'notifications.notificationTypes']),
  ...definitions('archived', ['tabs.archived']),
  ...definitions('memory', ['tabs.memory']),
  ...definitions('hooks', ['tabs.hooks']),
  ...definitions('security', ['tabs.security']),
  ...definitions('logs', ['logs.debugLogsCardTitle', 'logs.diagnosticsCardTitle']),
  ...definitions('backup', ['backup.cardTitle']),
  ...definitions('config', ['config.sourceTitle']),
  ...definitions('keybindings', ['keybindings.title']),
  ...definitions('about', ['about.versionCardTitle', 'about.updateCardTitle']),
]

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

export function filterSettingsSearchItems<T extends SearchMenuItem>(items: T[], query: string): T[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return []
  return items
    .map((item, index) => {
      const label = normalizeSearchText(item.label)
      const tabLabel = normalizeSearchText(item.tabLabel)
      const description = normalizeSearchText(item.description ?? '')
      const extra = normalizeSearchText(item.searchText ?? '')
      const rank = label === normalizedQuery ? 0 : label.startsWith(normalizedQuery) ? 1 : label.includes(normalizedQuery) ? 2 : tabLabel.includes(normalizedQuery) ? 3 : description.includes(normalizedQuery) ? 4 : extra.includes(normalizedQuery) ? 5 : -1
      return { item, index, rank }
    })
    .filter(result => result.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(result => result.item)
}
