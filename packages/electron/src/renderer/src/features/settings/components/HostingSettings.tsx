import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { SettingsCard } from './SettingsUI'

type HostingProvider = 'github' | 'gitlab' | 'bitbucket'

export function HostingSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const [configured, setConfigured] = useState<Record<HostingProvider, boolean>>({ github: false, gitlab: false, bitbucket: false })
  const [tokens, setTokens] = useState<Record<HostingProvider, string>>({ github: '', gitlab: '', bitbucket: '' })
  const [usernames, setUsernames] = useState<Record<HostingProvider, string>>({ github: '', gitlab: '', bitbucket: '' })
  const [busy, setBusy] = useState<HostingProvider>()
  const providers: HostingProvider[] = ['github', 'gitlab', 'bitbucket']
  const available = typeof window.customOpenCode?.hostingCredentials === 'function'

  const refresh = useCallback(() => {
    if (typeof window.customOpenCode?.hostingCredentials !== 'function') return
    void window.customOpenCode.hostingCredentials().then(setConfigured)
  }, [])

  useEffect(refresh, [refresh])

  const save = async (provider: HostingProvider) => {
    if (typeof window.customOpenCode?.setHostingCredential !== 'function') return
    const token = tokens[provider].trim()
    if (!token) return
    setBusy(provider)
    await window.customOpenCode.setHostingCredential(provider, {
      username: usernames[provider].trim() || (provider === 'bitbucket' ? 'x-token-auth' : provider),
      password: token,
    })
    setTokens(current => ({ ...current, [provider]: '' }))
    setBusy(undefined)
    refresh()
  }

  const remove = async (provider: HostingProvider) => {
    if (typeof window.customOpenCode?.setHostingCredential !== 'function') return
    setBusy(provider)
    await window.customOpenCode.setHostingCredential(provider, null)
    setBusy(undefined)
    refresh()
  }

  if (!available) return null

  return (
    <SettingsCard title={t('servers.hosting.title')} description={t('servers.hosting.description')}>
      <div className="space-y-3">
        {providers.map(provider => (
          <div key={provider} className="rounded-lg border border-border-200/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[length:var(--fs-sm)] font-medium text-text-100">
                {provider === 'github' ? 'GitHub' : provider === 'gitlab' ? 'GitLab' : 'Bitbucket'}
              </span>
              <span className={`text-[length:var(--fs-xs)] ${configured[provider] ? 'text-success-100' : 'text-text-500'}`}>
                {t(configured[provider] ? 'servers.hosting.configured' : 'servers.hosting.notConfigured')}
              </span>
            </div>
            <div className="flex gap-2">
              {provider === 'bitbucket' ? (
                <input
                  value={usernames[provider]}
                  onChange={event => setUsernames(current => ({ ...current, [provider]: event.target.value }))}
                  className="h-8 w-32 rounded-md border border-border-200 bg-bg-000 px-2 text-[length:var(--fs-xs)] text-text-100 outline-none"
                  placeholder={t('servers.hosting.username')}
                />
              ) : null}
              <input
                type="password"
                value={tokens[provider]}
                onChange={event => setTokens(current => ({ ...current, [provider]: event.target.value }))}
                className="h-8 min-w-0 flex-1 rounded-md border border-border-200 bg-bg-000 px-2 text-[length:var(--fs-xs)] text-text-100 outline-none"
                placeholder={configured[provider] ? t('servers.hosting.replaceToken') : t('servers.hosting.token')}
              />
              <Button size="sm" disabled={!tokens[provider].trim() || busy === provider} onClick={() => void save(provider)}>
                {t('common:save')}
              </Button>
              {configured[provider] ? (
                <Button size="sm" variant="ghost" disabled={busy === provider} onClick={() => void remove(provider)}>
                  {t('common:remove')}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        <p className="text-[length:var(--fs-xs)] leading-relaxed text-text-500">{t('servers.hosting.secureStorage')}</p>
      </div>
    </SettingsCard>
  )
}
