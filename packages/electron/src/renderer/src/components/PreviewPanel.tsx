import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLinkIcon, GlobeIcon, RetryIcon } from './Icons'
import { layoutStore } from '../store/layoutStore'
import { openUrl } from '../utils/browserOpen'

function normalizePreviewUrl(value: string) {
  const input = value.trim()
  if (!input) return ''
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `http://${input}`
  const parsed = new URL(candidate)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Unsupported preview URL')
  return parsed.toString()
}

function safePreviewUrl(value?: string) {
  if (!value) return ''
  try {
    return normalizePreviewUrl(value)
  } catch {
    return ''
  }
}

export function PreviewPanel({ tabId, url }: { tabId: string; url?: string }) {
  const { t } = useTranslation('components')
  const [input, setInput] = useState(() => safePreviewUrl(url))
  const [loadedUrl, setLoadedUrl] = useState(() => safePreviewUrl(url))
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    const next = safePreviewUrl(url)
    setInput(next)
    setLoadedUrl(next)
    setError('')
  }, [url])

  const hostname = useMemo(() => {
    if (!loadedUrl) return ''
    try {
      return new URL(loadedUrl).hostname
    } catch {
      return ''
    }
  }, [loadedUrl])

  const navigate = () => {
    try {
      const next = normalizePreviewUrl(input)
      if (!next) return
      setInput(next)
      setLoadedUrl(next)
      setError('')
      layoutStore.updateTab(tabId, { previewUrl: next })
    } catch {
      setError(t('preview.invalidUrl'))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-100">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border-100 px-2 py-1.5">
        <GlobeIcon size={14} className="shrink-0 text-text-400" />
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') navigate()
          }}
          placeholder={t('preview.placeholder')}
          aria-label={t('preview.address')}
          className="min-w-0 flex-1 rounded-md border border-border-200 bg-bg-200/40 px-2 py-1 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100"
        />
        <button type="button" onClick={() => setReloadKey(value => value + 1)} disabled={!loadedUrl} title={t('preview.reload')} className="rounded-md p-1.5 text-text-400 hover:bg-bg-200 hover:text-text-100 disabled:opacity-30">
          <RetryIcon size={14} />
        </button>
        <button type="button" onClick={() => void openUrl(loadedUrl, 'system')} disabled={!loadedUrl} title={t('preview.openExternal')} className="rounded-md p-1.5 text-text-400 hover:bg-bg-200 hover:text-text-100 disabled:opacity-30">
          <ExternalLinkIcon size={14} />
        </button>
      </div>
      {error ? <div className="shrink-0 px-3 py-1 text-[length:var(--fs-xs)] text-danger-100">{error}</div> : null}
      {loadedUrl ? (
        <iframe
          key={`${loadedUrl}:${reloadKey}`}
          src={loadedUrl}
          title={hostname ? `${t('preview.title')} — ${hostname}` : t('preview.title')}
          sandbox="allow-downloads allow-forms allow-modals allow-same-origin allow-scripts"
          referrerPolicy="no-referrer"
          className="min-h-0 flex-1 border-0 bg-white"
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-text-400">
          <GlobeIcon size={28} className="opacity-40" />
          <p className="text-[length:var(--fs-sm)]">{t('preview.empty')}</p>
          <p className="max-w-sm text-[length:var(--fs-xs)] text-text-500">{t('preview.frameHint')}</p>
        </div>
      )}
    </div>
  )
}
