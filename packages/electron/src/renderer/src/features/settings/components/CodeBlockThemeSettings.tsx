import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../../hooks'
import { AVAILABLE_CODE_BLOCK_THEMES, filterCodeBlockThemes } from '../../../lib/codeBlockThemes'
import { codeToHtml } from '../../../lib/shiki'
import { SegmentedControl, SettingsSection } from './SettingsUI'

const PREVIEW_CODE = `// greet user by name
function greet(name: string): string {
  const message = \`Hello, \${name}!\`
  return message
}

console.log(greet("world"))`

function ThemeSelect({ value, type, query, onChange, label, lightLabel, darkLabel }: { value: string; type: 'light' | 'dark'; query: string; onChange: (value: string) => void; label: string; lightLabel: string; darkLabel: string }) {
  const sameType = filterCodeBlockThemes(type)
  const otherType = filterCodeBlockThemes(type === 'light' ? 'dark' : 'light')
  const matches = (theme: (typeof AVAILABLE_CODE_BLOCK_THEMES)[number]) => {
    const normalized = query.trim().toLowerCase()
    return !normalized || theme.displayName.toLowerCase().includes(normalized) || theme.id.toLowerCase().includes(normalized)
  }
  return (
    <label className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(240px,340px)] md:items-center md:gap-5">
      <span className="text-[length:var(--fs-md)] font-medium text-text-100">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label={label}
        className="h-9 min-w-0 rounded-md border border-border-200 bg-bg-000 px-2.5 text-[length:var(--fs-sm)] text-text-100 outline-none hover:border-border-300 focus-visible:border-accent-main-100 focus-visible:ring-1 focus-visible:ring-accent-main-100/30"
      >
        <optgroup label={type === 'light' ? lightLabel : darkLabel}>
          {sameType.filter(theme => theme.id === value || matches(theme)).map(theme => <option key={theme.id} value={theme.id}>{theme.displayName}</option>)}
        </optgroup>
        <optgroup label={type === 'light' ? darkLabel : lightLabel}>
          {otherType.filter(theme => theme.id === value || matches(theme)).map(theme => <option key={theme.id} value={theme.id}>{theme.displayName}</option>)}
        </optgroup>
      </select>
    </label>
  )
}

export function CodeBlockThemeSettings() {
  const { t } = useTranslation('settings')
  const {
    codeBlockThemeLight,
    codeBlockThemeDark,
    setCodeBlockThemeLight,
    setCodeBlockThemeDark,
    resolvedTheme,
  } = useTheme()
  const [query, setQuery] = useState('')
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>(resolvedTheme === 'dark' ? 'dark' : 'light')
  const [html, setHtml] = useState('')
  const [error, setError] = useState('')
  const previewTheme = previewMode === 'dark' ? codeBlockThemeDark : codeBlockThemeLight
  const previewName = useMemo(() => AVAILABLE_CODE_BLOCK_THEMES.find(theme => theme.id === previewTheme)?.displayName ?? previewTheme, [previewTheme])

  useEffect(() => {
    let cancelled = false
    void codeToHtml(PREVIEW_CODE, { lang: 'ts', theme: previewTheme as Parameters<typeof codeToHtml>[1]['theme'] }).then(value => {
      if (cancelled) return
      setHtml(value)
      setError('')
    }).catch(reason => {
      if (cancelled) return
      setHtml('')
      setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => {
      cancelled = true
    }
  }, [previewTheme])

  return (
    <SettingsSection title={t('appearance.codeBlockThemes')}>
      <p className="text-[length:var(--fs-sm)] leading-relaxed text-text-400">{t('appearance.codeBlockThemesDesc')}</p>
      <input
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder={t('appearance.codeBlockThemeSearch')}
        className="h-9 w-full rounded-md border border-border-200 bg-transparent px-3 text-[length:var(--fs-sm)] text-text-100 outline-none placeholder:text-text-400 hover:border-border-300 focus-visible:border-accent-main-100"
      />
      <ThemeSelect value={codeBlockThemeLight} type="light" query={query} onChange={setCodeBlockThemeLight} label={t('appearance.codeBlockThemeLight')} lightLabel={t('appearance.modeLight')} darkLabel={t('appearance.modeDark')} />
      <ThemeSelect value={codeBlockThemeDark} type="dark" query={query} onChange={setCodeBlockThemeDark} label={t('appearance.codeBlockThemeDark')} lightLabel={t('appearance.modeLight')} darkLabel={t('appearance.modeDark')} />
      <div className="space-y-2 rounded-lg border border-border-200/50 bg-bg-100/25 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[length:var(--fs-sm)] font-medium text-text-100">{t('appearance.codeBlockPreview')}</div>
            <div className="truncate text-[length:var(--fs-xs)] text-text-400">{previewName}</div>
          </div>
          <div className="w-40 shrink-0">
            <SegmentedControl value={previewMode} options={[{ value: 'light', label: t('appearance.modeLight') }, { value: 'dark', label: t('appearance.modeDark') }]} onChange={setPreviewMode} />
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-border-200/50 text-[length:var(--fs-code)] leading-[var(--fs-code-line-height)]">
          {html ? <div className="overflow-x-auto [&_.shiki]:!m-0 [&_.shiki]:!p-3" dangerouslySetInnerHTML={{ __html: html }} /> : <pre className="overflow-x-auto bg-bg-200/40 p-3 text-text-400"><code>{error || PREVIEW_CODE}</code></pre>}
        </div>
      </div>
    </SettingsSection>
  )
}
