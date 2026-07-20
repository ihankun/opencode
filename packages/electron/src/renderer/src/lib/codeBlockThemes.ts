import { bundledThemesInfo, type BundledTheme } from 'shiki/themes'

export type CodeBlockThemeInfo = {
  id: BundledTheme
  displayName: string
  type: 'light' | 'dark'
}

export const AVAILABLE_CODE_BLOCK_THEMES: readonly CodeBlockThemeInfo[] = bundledThemesInfo
  .map(theme => ({ id: theme.id as BundledTheme, displayName: theme.displayName, type: theme.type as 'light' | 'dark' }))
  .sort((a, b) => a.displayName.localeCompare(b.displayName))

export const DEFAULT_CODE_BLOCK_THEME_LIGHT = 'github-light-default' as const
export const DEFAULT_CODE_BLOCK_THEME_DARK = 'github-dark-default' as const

const knownThemes = new Set<string>(AVAILABLE_CODE_BLOCK_THEMES.map(theme => theme.id))

export function normalizeCodeBlockTheme(id: string, fallback: BundledTheme): BundledTheme {
  return knownThemes.has(id) ? id as BundledTheme : fallback
}

export function filterCodeBlockThemes(type: 'light' | 'dark') {
  return AVAILABLE_CODE_BLOCK_THEMES.filter(theme => theme.type === type)
}
