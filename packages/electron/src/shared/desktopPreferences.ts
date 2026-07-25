export type DesktopPreferences = {
  defaultLocationApp: string
  showMenuBarIcon: boolean
  hideDockOnClose: boolean
  backgroundSubagents: boolean
  quotaProviders: Array<{
    id: string
    enabled: boolean
  }>
}

export const DEFAULT_DESKTOP_PREFERENCES: DesktopPreferences = {
  defaultLocationApp: '',
  showMenuBarIcon: true,
  hideDockOnClose: false,
  backgroundSubagents: false,
  quotaProviders: [],
}

export function normalizeDesktopPreferences(value: unknown): DesktopPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_DESKTOP_PREFERENCES }
  const input = value as Partial<DesktopPreferences>
  return {
    defaultLocationApp: typeof input.defaultLocationApp === 'string' ? input.defaultLocationApp : '',
    showMenuBarIcon: typeof input.showMenuBarIcon === 'boolean' ? input.showMenuBarIcon : true,
    hideDockOnClose: typeof input.hideDockOnClose === 'boolean' ? input.hideDockOnClose : false,
    backgroundSubagents: typeof input.backgroundSubagents === 'boolean' ? input.backgroundSubagents : false,
    quotaProviders: Array.isArray(input.quotaProviders)
      ? input.quotaProviders.reduce<DesktopPreferences['quotaProviders']>((items, value) => {
          if (!value || typeof value !== 'object') return items
          const item = value as { id?: unknown; enabled?: unknown }
          if (typeof item.id !== 'string') return items
          const id = item.id.trim()
          if (!id || items.some(current => current.id === id)) return items
          items.push({
            id,
            enabled: item.enabled === true,
          })
          return items
        }, [])
      : [],
  }
}
