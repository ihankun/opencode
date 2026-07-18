import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, GlobeIcon, ImageIcon, PlusIcon, RetryIcon } from './Icons'
import { layoutStore } from '../store/layoutStore'
import { openUrl } from '../utils/browserOpen'
import { useMessageStore } from '../store'
import { insertComposerDraft } from '../utils/composerDraft'

type PreviewPage = { id: string; url: string }

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
  const { sessionId } = useMessageStore()
  const initialUrl = safePreviewUrl(url)
  const [pages, setPages] = useState<PreviewPage[]>(() => [{ id: crypto.randomUUID(), url: initialUrl }])
  const [activeId, setActiveId] = useState(() => pages[0].id)
  const active = pages.find(page => page.id === activeId) ?? pages[0]
  const [input, setInput] = useState(active.url)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [ports, setPorts] = useState<string[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>(initialUrl ? [initialUrl] : [])
  const [historyIndex, setHistoryIndex] = useState(initialUrl ? 0 : -1)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const next = safePreviewUrl(url)
    if (!next || pages.some(page => page.url === next)) return
    const page = { id: crypto.randomUUID(), url: next }
    setPages(current => [...current, page])
    setActiveId(page.id)
  }, [pages, url])

  useEffect(() => {
    setInput(active.url)
    setError('')
  }, [active.id, active.url])

  const hostname = useMemo(() => {
    if (!active.url) return ''
    try {
      return new URL(active.url).hostname
    } catch {
      return ''
    }
  }, [active.url])

  const setActiveUrl = (next: string, record = true) => {
    setPages(current => current.map(page => page.id === active.id ? { ...page, url: next } : page))
    layoutStore.updateTab(tabId, { previewUrl: next })
    setLogs(current => [`${new Date().toLocaleTimeString()} navigate ${next}`, ...current].slice(0, 100))
    if (!record) return
    const nextHistory = [...history.slice(0, historyIndex + 1), next]
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  const navigate = () => {
    try {
      const next = normalizePreviewUrl(input)
      if (!next) return
      setInput(next)
      setActiveUrl(next)
      setError('')
    } catch {
      setError(t('preview.invalidUrl'))
    }
  }

  const moveHistory = (offset: number) => {
    const index = historyIndex + offset
    const next = history[index]
    if (!next) return
    setHistoryIndex(index)
    setInput(next)
    setActiveUrl(next, false)
  }

  const discover = async () => {
    if (typeof window.customOpenCode?.discoverPreviewPorts !== 'function') {
      setError(t('preview.desktopBridgeUnavailable'))
      return
    }
    const host = hostname || '127.0.0.1'
    setPorts(await window.customOpenCode.discoverPreviewPorts(host))
  }

  const capture = async () => {
    if (typeof window.customOpenCode?.capturePreview !== 'function') {
      setError(t('preview.desktopBridgeUnavailable'))
      return
    }
    const rect = iframeRef.current?.getBoundingClientRect()
    if (!rect) return
    await window.customOpenCode.capturePreview({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
  }

  const referenceElement = () => {
    if (!sessionId || !iframeRef.current) return
    try {
      const document = iframeRef.current.contentDocument
      if (!document) throw new Error()
      setError(t('preview.selectElementHint'))
      const select = (event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        const element = event.target instanceof Element ? event.target : undefined
        if (!element) return
        const selector = [element.tagName.toLowerCase(), element.id ? `#${element.id}` : '', [...element.classList].slice(0, 3).map(name => `.${name}`).join('')].join('')
        insertComposerDraft({ sessionId, text: `请检查并修改预览页面元素：${selector}\n页面：${active.url}\n内容：${element.textContent?.trim().slice(0, 300) || '(empty)'}` })
        setError('')
      }
      document.addEventListener('click', select, { capture: true, once: true })
    } catch {
      setError(t('preview.crossOriginElement'))
    }
  }

  const addPage = () => {
    const page = { id: crypto.randomUUID(), url: '' }
    setPages(current => [...current, page])
    setActiveId(page.id)
  }

  const closePage = (id: string) => {
    if (pages.length === 1) return
    const index = pages.findIndex(page => page.id === id)
    const next = pages.filter(page => page.id !== id)
    setPages(next)
    if (id === activeId) setActiveId(next[Math.max(0, index - 1)].id)
  }

  return <div className="flex h-full min-h-0 flex-col bg-bg-100">
    <div className="flex h-8 shrink-0 items-end gap-0.5 overflow-x-auto border-b border-border-100 bg-bg-200/25 px-1">
      {pages.map((page, index) => <button key={page.id} type="button" onClick={() => setActiveId(page.id)} className={`group flex h-7 max-w-40 items-center gap-1 rounded-t-md px-2 text-[length:var(--fs-xs)] ${page.id === active.id ? 'bg-bg-100 text-text-100' : 'text-text-400 hover:bg-bg-200/60'}`}><span className="truncate">{page.url ? new URL(page.url).host : `${t('preview.title')} ${index + 1}`}</span>{pages.length > 1 ? <span onClick={event => { event.stopPropagation(); closePage(page.id) }} className="text-text-500 hover:text-text-100">×</span> : null}</button>)}
      <button type="button" onClick={addPage} className="mb-0.5 rounded p-1 text-text-500 hover:bg-bg-200 hover:text-text-100"><PlusIcon size={12} /></button>
    </div>
    <div className="flex shrink-0 items-center gap-1 border-b border-border-100 px-2 py-1.5">
      <button type="button" onClick={() => moveHistory(-1)} disabled={historyIndex <= 0} className="rounded p-1 text-text-400 disabled:opacity-25"><ChevronLeftIcon size={14} /></button>
      <button type="button" onClick={() => moveHistory(1)} disabled={historyIndex < 0 || historyIndex >= history.length - 1} className="rounded p-1 text-text-400 disabled:opacity-25"><ChevronRightIcon size={14} /></button>
      <GlobeIcon size={14} className="shrink-0 text-text-400" />
      <input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') navigate() }} placeholder={t('preview.placeholder')} aria-label={t('preview.address')} className="min-w-0 flex-1 rounded-md border border-border-200 bg-bg-200/40 px-2 py-1 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100" />
      <button type="button" onClick={() => setReloadKey(value => value + 1)} disabled={!active.url} title={t('preview.reload')} className="rounded-md p-1.5 text-text-400 hover:bg-bg-200 hover:text-text-100 disabled:opacity-30"><RetryIcon size={14} /></button>
      <button type="button" onClick={() => void discover()} title={t('preview.discoverPorts')} className="rounded px-1.5 py-1 text-[length:var(--fs-xxs)] text-text-400 hover:bg-bg-200">Ports</button>
      <button type="button" onClick={referenceElement} disabled={!active.url || !sessionId} title={t('preview.referenceElement')} className="rounded px-1.5 py-1 text-[length:var(--fs-xxs)] text-text-400 hover:bg-bg-200 disabled:opacity-30">@</button>
      <button type="button" onClick={() => void capture()} disabled={!active.url} title={t('preview.screenshot')} className="rounded-md p-1.5 text-text-400 hover:bg-bg-200 disabled:opacity-30"><ImageIcon size={14} /></button>
      <button type="button" onClick={() => void openUrl(active.url, 'system')} disabled={!active.url} title={t('preview.openExternal')} className="rounded-md p-1.5 text-text-400 hover:bg-bg-200 hover:text-text-100 disabled:opacity-30"><ExternalLinkIcon size={14} /></button>
    </div>
    {ports.length ? <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border-100 px-2 py-1">{ports.map(port => <button key={port} onClick={() => { setInput(port); setActiveUrl(port); setPorts([]) }} className="rounded bg-bg-200 px-2 py-1 text-[length:var(--fs-xs)] text-text-300">{new URL(port).host}</button>)}</div> : null}
    {error ? <div className="shrink-0 px-3 py-1 text-[length:var(--fs-xs)] text-danger-100">{error}</div> : null}
    {active.url ? <iframe ref={iframeRef} key={`${active.url}:${reloadKey}`} src={active.url} onLoad={() => setLogs(current => [`${new Date().toLocaleTimeString()} loaded ${active.url}`, ...current].slice(0, 100))} title={hostname ? `${t('preview.title')} — ${hostname}` : t('preview.title')} sandbox="allow-downloads allow-forms allow-modals allow-same-origin allow-scripts" referrerPolicy="no-referrer" className="min-h-0 flex-1 border-0 bg-white" /> : <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-text-400"><GlobeIcon size={28} className="opacity-40" /><p className="text-[length:var(--fs-sm)]">{t('preview.empty')}</p><p className="max-w-sm text-[length:var(--fs-xs)] text-text-500">{t('preview.frameHint')}</p></div>}
    {logs.length ? <details className="max-h-28 shrink-0 overflow-auto border-t border-border-100 bg-bg-200/20 px-2 py-1"><summary className="cursor-pointer text-[length:var(--fs-xxs)] text-text-500">{t('preview.navigationLog')}</summary>{logs.map((log, index) => <div key={`${log}-${index}`} className="font-mono text-[length:var(--fs-xxs)] text-text-400">{log}</div>)}</details> : null}
  </div>
}
