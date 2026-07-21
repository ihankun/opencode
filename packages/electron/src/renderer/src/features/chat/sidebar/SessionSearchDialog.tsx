import { startTransition, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../../components/ui/Dialog'
import { SearchIcon, SpinnerIcon } from '../../../components/Icons'
import { createSession, forkSession, getSessionMessages, getSessions, sendMessageAsyncToServer, type ApiSession, type ApiMessageWithParts } from '../../../api'
import { formatRelativeTime } from '../../../utils/dateUtils'
import { normalizeToForwardSlash } from '../../../utils'
import { saveData } from '../../../utils/downloadUtils'
import { serverStore } from '../../../store/serverStore'

const SESSION_LIMIT = 500
const MESSAGE_SEARCH_LIMIT = 500
const METADATA_KEY = 'opencodex:conversation-metadata'

interface SessionSearchDialogProps {
  isOpen: boolean
  directory?: string
  onClose: () => void
  onSelectSession: (session: ApiSession) => void
}

interface SessionSearchResult {
  session: ApiSession
  snippet: string
  matchKind: 'title' | 'content' | 'recent'
}

export function SessionSearchDialog({ isOpen, directory, onClose, onSelectSession }: SessionSearchDialogProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [query, setQuery] = useState('')
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [results, setResults] = useState<SessionSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const [metadata, setMetadata] = useState<Record<string, { tags: string[] }>>(() => loadConversationMetadata())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const messageCacheRef = useRef(new Map<string, string>())
  const inputRef = useRef<HTMLInputElement>(null)
  const normalizedDirectory = directory ? normalizeToForwardSlash(directory) || directory : undefined

  useEffect(() => {
    if (!isOpen) return

    setQuery('')
    setSelectedIndex(0)
    setLoading(true)
    let cancelled = false

    getSessions({
      roots: true,
      limit: SESSION_LIMIT,
      directory: normalizedDirectory,
    })
      .then(data => {
        if (cancelled) return
        setSessions(data)
        setResults(data.slice(0, 12).map(session => ({ session, snippet: '', matchKind: 'recent' })))
        setIndexing(true)
        void buildSearchIndex(data, normalizedDirectory, messageCacheRef.current).finally(() => {
          if (!cancelled) setIndexing(false)
        })
      })
      .catch(() => {
        if (cancelled) return
        setSessions([])
        setResults([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, normalizedDirectory])

  useEffect(() => {
    if (!isOpen) return
    const frameId = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const eligible = tagFilter ? sessions.filter(session => metadata[session.id]?.tags.includes(tagFilter)) : sessions
    const term = normalizeSearch(query)
    if (!term) {
      setResults(eligible.slice(0, 30).map(session => ({ session, snippet: '', matchKind: 'recent' })))
      setSelectedIndex(0)
      return
    }

    let cancelled = false
    const timerId = window.setTimeout(() => {
      void searchSessions(eligible, term, normalizedDirectory, messageCacheRef.current).then(nextResults => {
        if (cancelled) return
        startTransition(() => {
          setResults(nextResults)
          setSelectedIndex(0)
        })
      })
    }, 160)

    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [isOpen, metadata, normalizedDirectory, query, sessions, tagFilter])

  const tags = [...new Set(Object.values(metadata).flatMap(item => item.tags))].sort()
  const setSessionTags = (sessionID: string, nextTags: string[]) => {
    const next = { ...metadata, [sessionID]: { tags: [...new Set(nextTags.map(tag => tag.trim()).filter(Boolean))].slice(0, 12) } }
    setMetadata(next)
    localStorage.setItem(METADATA_KEY, JSON.stringify(next))
  }
  const addTag = (session: ApiSession) => {
    const value = window.prompt(t('sessionSearch.tagPrompt'), metadata[session.id]?.tags.join(', ') ?? '')
    if (value === null) return
    setSessionTags(session.id, value.split(','))
  }
  const exportSession = async (session: ApiSession, format: 'markdown' | 'json') => {
    const messages = await getSessionMessages(session.id, undefined, session.directory || normalizedDirectory)
    const content = format === 'json'
      ? JSON.stringify({ session, tags: metadata[session.id]?.tags ?? [], messages }, null, 2)
      : [`# ${session.title || t('sessionSearch.untitled')}`, '', `Project: ${session.directory || '—'}`, `Tags: ${(metadata[session.id]?.tags ?? []).join(', ') || '—'}`, '', ...messages.flatMap(message => [`## ${message.info.role}`, '', getApiMessageText(message), ''])].join('\n')
    saveData(new TextEncoder().encode(content), `${safeFileName(session.title || session.id)}.${format === 'json' ? 'json' : 'md'}`, format === 'json' ? 'application/json' : 'text/markdown')
  }
  const fork = async (session: ApiSession) => {
    const next = await forkSession(session.id, undefined, session.directory || normalizedDirectory)
    onSelectSession(next)
    onClose()
  }
  const handoff = async (session: ApiSession) => {
    const candidates = serverStore.getServers().filter(server => server.id !== serverStore.getActiveServer()?.id && serverStore.getHealth(server.id)?.status === 'online')
    if (candidates.length === 0) {
      window.alert(t('sessionSearch.noHandoffServer'))
      return
    }
    const requested = window.prompt(t('sessionSearch.handoffPrompt', { servers: candidates.map(server => server.name).join(', ') }), candidates[0].name)
    const target = candidates.find(server => server.name === requested || server.id === requested)
    if (!target) return
    const messages = await getSessionMessages(session.id, 80, session.directory || normalizedDirectory)
    const modelMessage = [...messages].reverse().find(message => message.info.role === 'assistant')
    if (!modelMessage || modelMessage.info.role !== 'assistant') throw new Error(t('sessionSearch.noHandoffModel'))
    const transcript = messages.slice(-30).map(message => `${message.info.role.toUpperCase()}: ${getApiMessageText(message)}`).join('\n\n').slice(-30_000)
    const next = await createSession({ directory: session.directory || normalizedDirectory, title: `${session.title || t('sessionSearch.untitled')} · handoff`, serverId: target.id })
    await sendMessageAsyncToServer(target.id, { sessionId: next.id, directory: next.directory, text: `${t('sessionSearch.handoffInstruction')}\n\n${transcript}`, attachments: [], model: { providerID: modelMessage.info.providerID, modelID: modelMessage.info.modelID } })
    serverStore.setActiveServer(target.id)
    onSelectSession(next)
    onClose()
  }

  const selectedResult = results[selectedIndex]

  const selectResult = useCallback(
    (result: SessionSearchResult | undefined) => {
      if (!result) return
      onSelectSession(result.session)
      onClose()
    },
    [onClose, onSelectSession],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex(index => Math.min(index + 1, Math.max(0, results.length - 1)))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex(index => Math.max(0, index - 1))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        selectResult(selectedResult)
      }
    },
    [results.length, selectResult, selectedResult],
  )

  const title = query.trim() ? t('sessionSearch.results') : t('sessionSearch.recentChats')

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width="min(720px, calc(100vw - 48px))"
      className="max-h-[min(680px,calc(100vh-80px))] w-full"
      rawContent
      ariaLabel={t('sessionSearch.title')}
    >
      <div className="flex min-h-0 flex-col bg-bg-000/95">
        <div className="border-b border-border-200/50 p-3">
          <div className="relative flex h-11 items-center rounded-lg bg-bg-100/80 px-3 focus-within:ring-1 focus-within:ring-accent-main-100/50">
            <SearchIcon size={17} className="mr-2 shrink-0 text-text-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('sessionSearch.placeholder')}
              className="h-full min-w-0 flex-1 bg-transparent text-[length:var(--fs-base)] text-text-100 placeholder:text-text-500 outline-none"
            />
            {(loading || indexing) && <SpinnerIcon size={15} className="shrink-0 animate-spin text-text-400" />}
          </div>
          {tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setTagFilter('')} className={`rounded-full px-2 py-1 text-[length:var(--fs-xs)] ${!tagFilter ? 'bg-accent-main-100/15 text-accent-main-100' : 'bg-bg-100 text-text-400'}`}>{t('sessionSearch.allTags')}</button>
            {tags.map(tag => <button key={tag} type="button" onClick={() => setTagFilter(tag)} className={`rounded-full px-2 py-1 text-[length:var(--fs-xs)] ${tagFilter === tag ? 'bg-accent-main-100/15 text-accent-main-100' : 'bg-bg-100 text-text-400'}`}>#{tag}</button>)}
          </div>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="px-2 py-1.5 text-[length:var(--fs-xs)] font-medium text-text-400">{title}</div>
          {results.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[length:var(--fs-sm)] text-text-400">
              {loading ? t('sessionSearch.loading') : t('sessionSearch.noResults')}
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => (
                <SearchResultRow
                  key={result.session.id}
                  result={result}
                  query={query}
                  selected={index === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onSelect={() => selectResult(result)}
                  tags={metadata[result.session.id]?.tags ?? []}
                  onTag={() => addTag(result.session)}
                  onExport={format => void exportSession(result.session, format)}
                  onFork={() => void fork(result.session)}
                  onHandoff={() => void handoff(result.session).catch(cause => window.alert(cause instanceof Error ? cause.message : String(cause)))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}

function SearchResultRow(props: {
  result: SessionSearchResult
  query: string
  selected: boolean
  onMouseEnter: () => void
  onSelect: () => void
  tags: string[]
  onTag: () => void
  onExport: (format: 'markdown' | 'json') => void
  onFork: () => void
  onHandoff: () => void
}) {
  const { t } = useTranslation(['chat'])
  const session = props.result.session
  const title = session.title || t('sessionSearch.untitled')
  const updated = session.time?.updated ?? session.time?.created
  const meta = [projectName(session.directory), updated ? formatRelativeTime(updated) : ''].filter(Boolean).join(' · ')
  const label =
    props.result.matchKind === 'content'
      ? t('sessionSearch.contentMatch')
      : props.result.matchKind === 'title'
        ? t('sessionSearch.titleMatch')
        : ''

  return (
    <div
      onClick={props.onSelect}
      onMouseEnter={props.onMouseEnter}
      role="button"
      tabIndex={0}
      className={`group flex w-full min-w-0 flex-col rounded-lg px-3 py-2 text-left transition-colors ${
        props.selected ? 'bg-bg-200 text-text-100' : 'text-text-200 hover:bg-bg-200/60'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-[length:var(--fs-base)] font-medium">
          {highlight(title, props.query)}
        </span>
        {label && <span className="shrink-0 text-[length:var(--fs-xs)] text-text-500">{label}</span>}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {props.tags.map(tag => <span key={tag} className="rounded-full bg-accent-main-100/10 px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-accent-main-100">#{tag}</span>)}
        <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" onClick={event => { event.stopPropagation(); props.onTag() }} className="rounded px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400 hover:bg-bg-300">{t('sessionSearch.tags')}</button>
          <button type="button" onClick={event => { event.stopPropagation(); props.onFork() }} className="rounded px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400 hover:bg-bg-300">{t('sessionSearch.fork')}</button>
          <button type="button" onClick={event => { event.stopPropagation(); props.onHandoff() }} className="rounded px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400 hover:bg-bg-300">{t('sessionSearch.handoff')}</button>
          <button type="button" onClick={event => { event.stopPropagation(); props.onExport('markdown') }} className="rounded px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400 hover:bg-bg-300">MD</button>
          <button type="button" onClick={event => { event.stopPropagation(); props.onExport('json') }} className="rounded px-1.5 py-0.5 text-[length:var(--fs-xxs)] text-text-400 hover:bg-bg-300">JSON</button>
        </span>
      </div>
      {(props.result.snippet || meta) && (
        <div className="mt-1 flex min-w-0 items-center gap-2 text-[length:var(--fs-sm)] text-text-400">
          {props.result.snippet ? (
            <span className="min-w-0 flex-1 truncate">{highlight(props.result.snippet, props.query)}</span>
          ) : (
            <span className="min-w-0 flex-1 truncate">{meta}</span>
          )}
          {props.result.snippet && meta && <span className="shrink-0 truncate">{meta}</span>}
        </div>
      )}
    </div>
  )
}

async function buildSearchIndex(sessions: ApiSession[], directory: string | undefined, cache: Map<string, string>) {
  const pending = sessions.filter(session => !cache.has(`${directory ?? ''}:${session.id}`))
  for (let index = 0; index < pending.length; index += 6) {
    await Promise.all(pending.slice(index, index + 6).map(session => getCachedSessionText(session.id, session.directory || directory, cache)))
    await yieldToBrowser()
  }
}

function yieldToBrowser() {
  return new Promise<void>(resolve => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 120 })
      return
    }
    globalThis.setTimeout(resolve, 0)
  })
}

function loadConversationMetadata() {
  try {
    const value = JSON.parse(localStorage.getItem(METADATA_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
      if (!item || typeof item !== 'object' || !Array.isArray((item as { tags?: unknown }).tags)) return []
      return [[key, { tags: (item as { tags: unknown[] }).tags.filter((tag): tag is string => typeof tag === 'string') }]]
    }))
  } catch {
    return {}
  }
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 100) || 'conversation'
}

async function searchSessions(
  sessions: ApiSession[],
  term: string,
  directory: string | undefined,
  messageCache: Map<string, string>,
) {
  const titleMatches: SessionSearchResult[] = sessions
    .filter(session => normalizeSearch(session.title || '').includes(term))
    .map(session => ({ session, snippet: '', matchKind: 'title' as const }))

  const unmatched = sessions.filter(session => !titleMatches.some(result => result.session.id === session.id))
  const contentMatchesRaw: Array<Promise<SessionSearchResult | undefined>> = unmatched.map(async session => {
    const content = await getCachedSessionText(session.id, directory, messageCache)
    const index = normalizeSearch(content).indexOf(term)
    if (index === -1) return undefined
    return {
      session,
      snippet: buildSnippet(content, index, term.length),
      matchKind: 'content' as const,
    }
  })
  const contentMatches = (await Promise.all(contentMatchesRaw)).filter(
    (result): result is SessionSearchResult => result !== undefined,
  )

  return [...titleMatches, ...contentMatches].slice(0, 30)
}

async function getCachedSessionText(sessionId: string, directory: string | undefined, cache: Map<string, string>) {
  const key = `${directory ?? ''}:${sessionId}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  try {
    const messages = await getSessionMessages(sessionId, MESSAGE_SEARCH_LIMIT, directory)
    const text = messages.map(getApiMessageText).filter(Boolean).join('\n')
    cache.set(key, text)
    return text
  } catch {
    cache.set(key, '')
    return ''
  }
}

function getApiMessageText(message: ApiMessageWithParts) {
  return message.parts
    .flatMap(part => {
      if (part.type === 'text' && 'text' in part && typeof part.text === 'string') return [part.text]
      if (part.type === 'file' && 'filename' in part && typeof part.filename === 'string') return [part.filename]
      return []
    })
    .join(' ')
}

function buildSnippet(content: string, index: number, length: number) {
  const start = Math.max(0, index - 48)
  const end = Math.min(content.length, index + length + 96)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < content.length ? '...' : ''
  return `${prefix}${content.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase()
}

function projectName(directory?: string) {
  if (!directory) return ''
  return directory.split(/[\\/]/).filter(Boolean).at(-1) ?? directory
}

function highlight(text: string, query: string) {
  const term = query.trim()
  if (!term) return text
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-accent-main-100/20 px-0.5 text-text-100">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  )
}
