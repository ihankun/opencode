export type DesktopPreferences = {
  defaultLocationApp: string
  showMenuBarIcon: boolean
  hideDockOnClose: boolean
  backgroundSubagents: boolean
}

export const DEFAULT_DESKTOP_PREFERENCES: DesktopPreferences = {
  defaultLocationApp: '',
  showMenuBarIcon: true,
  hideDockOnClose: false,
  backgroundSubagents: false,
}

export function normalizeDesktopPreferences(value: unknown): DesktopPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_DESKTOP_PREFERENCES }
  const input = value as Partial<DesktopPreferences>
  return {
    defaultLocationApp: typeof input.defaultLocationApp === 'string' ? input.defaultLocationApp : '',
    showMenuBarIcon: typeof input.showMenuBarIcon === 'boolean' ? input.showMenuBarIcon : true,
    hideDockOnClose: typeof input.hideDockOnClose === 'boolean' ? input.hideDockOnClose : false,
    backgroundSubagents: typeof input.backgroundSubagents === 'boolean' ? input.backgroundSubagents : false,
  }
}
