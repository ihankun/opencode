import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiSession } from '../../api'
import { MessageSquareIcon } from '../../components/Icons'
import { formatRelativeTime } from '../../utils/dateUtils'

interface SessionReferenceMenuProps {
  isOpen: boolean
  query: string
  sessions: ApiSession[]
  excludeIds?: Set<string>
  onSelect: (session: ApiSession) => void
  onClose: () => void
}

export interface SessionReferenceMenuHandle {
  moveUp: () => void
  moveDown: () => void
  selectCurrent: () => void
}

export const SessionReferenceMenu = forwardRef<SessionReferenceMenuHandle, SessionReferenceMenuProps>(
  function SessionReferenceMenu({ isOpen, query, sessions, excludeIds, onSelect, onClose }, ref) {
    const { t } = useTranslation(['chat', 'common'])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const filtered = useMemo(() => {
      if (!isOpen) return []
      const normalized = query.trim().toLowerCase()
      return sessions.filter(session => {
        if (excludeIds?.has(session.id)) return false
        if (!normalized) return true
        return session.title.toLowerCase().includes(normalized)
      })
    }, [excludeIds, isOpen, query, sessions])
    const activeIndex = filtered.length === 0 ? 0 : Math.min(selectedIndex, filtered.length - 1)

    useEffect(() => {
      if (!isOpen) return
      const frameId = requestAnimationFrame(() => setSelectedIndex(0))
      return () => cancelAnimationFrame(frameId)
    }, [isOpen, query])

    useEffect(() => {
      const selected = listRef.current?.children[activeIndex] as HTMLElement | undefined
      selected?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    useImperativeHandle(
      ref,
      () => ({
        moveUp: () => setSelectedIndex(index => Math.max(index - 1, 0)),
        moveDown: () => setSelectedIndex(index => Math.min(index + 1, filtered.length - 1)),
        selectCurrent: () => {
          const selected = filtered[activeIndex]
          if (selected) onSelect(selected)
        },
      }),
      [activeIndex, filtered, onSelect],
    )

    useEffect(() => {
      if (!isOpen) return
      const handlePointerDown = (event: PointerEvent) => {
        if (!menuRef.current?.contains(event.target as Node)) onClose()
      }
      document.addEventListener('pointerdown', handlePointerDown)
      return () => document.removeEventListener('pointerdown', handlePointerDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
      <div
        ref={menuRef}
        data-dropdown-open
        aria-label={t('sessionReference.title')}
        className="absolute bottom-full left-0 z-50 mb-2 flex max-h-[min(320px,calc(100dvh-10rem))] w-full flex-col overflow-hidden rounded-xl border border-border-200/60 glass shadow-lg md:max-w-[380px]"
      >
        <div className="border-b border-border-200/40 px-3 py-2">
          <div className="text-[length:var(--fs-sm)] font-medium text-text-200">{t('sessionReference.title')}</div>
          <div className="mt-0.5 text-[length:var(--fs-xs)] text-text-500">{t('sessionReference.description')}</div>
        </div>
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="px-2 py-4 text-center text-[length:var(--fs-sm)] text-text-400">
              {query ? t('sessionReference.noResults') : t('sessionReference.empty')}
            </div>
          ) : (
            filtered.map((session, index) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelect(session)}
                onPointerEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  index === activeIndex
                    ? 'bg-accent-main-100/10 text-text-100'
                    : 'text-text-200 hover:bg-bg-100/40'
                }`}
              >
                <MessageSquareIcon size={15} className="shrink-0 text-accent-main-100" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[length:var(--fs-base)]">
                    {session.title || t('sessionSearch.untitled')}
                  </span>
                  <span className="block truncate text-[length:var(--fs-xs)] text-text-500">
                    {formatRelativeTime(session.time.updated)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
        <div className="hidden gap-3 px-3 py-1.5 text-[length:var(--fs-xs)] text-text-500/70 md:flex">
          <span>{t('common:upDownSelect')}</span>
          <span>{t('common:enterConfirmShort')}</span>
          <span>{t('common:escCancel')}</span>
        </div>
      </div>
    )
  },
)
