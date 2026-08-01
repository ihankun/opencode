// ============================================
// ChatArea - 聊天消息显示区域
// ============================================
//
// 这版改成页块级虚拟化：
// - 消息按页分块，不再按 message 逐条虚拟
// - 视口附近少量页保持真实 DOM
// - 远页折叠成固定高度块，优先使用实测高度，未测量时使用保守估算
//
// 这样滚动链路里不会出现“正在眼前从假高度变真高度的 message”，
// 手感比消息级壳切换稳定得多，同时 DOM 数量也有上限。

import {
  useRef,
  useImperativeHandle,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { animate } from 'motion/mini'
import { MessageRenderer } from '../message'
import { buildExecutionCollapsePlan, mergeProcessMessages } from '../message/autoCollapseExecution'
import { MessageErrorView } from '../message/parts'
import { ChevronRightIcon, SpinnerIcon } from '../../components/Icons'
import { messageStore } from '../../store'
import { hasRenderableParts, type Message, type MessageError } from '../../types/message'
import { RetryStatusInline, type RetryStatusInlineData } from './RetryStatusInline'
import { buildVisibleMessageEntries, getVisibleMessageForkTargetId } from './chatAreaVisibility'
import { AT_BOTTOM_THRESHOLD_PX } from '../../constants'
import { useDelayedRender } from '../../hooks'

import { useTheme } from '../../hooks/useTheme'
import { useChatViewport } from './chatViewport'
import { rankOutlineVisibleMessageIds } from '../../components/outlineIndexModel'
import { formatDuration } from '../../utils/formatUtils'
import { useUiDisclosureState } from '../../utils/uiDisclosureState'
import {
  buildContentKeyedChatPages,
  buildExpandedPageSelection,
  buildPageOffsets,
  buildPageRenderSegments,
  computeAnchorRestoreScrollDelta,
  buildTurnDurationMap,
  computeExpandedPageRange,
  expandSelectionWithPageKeys,
  retainNearbyPageSelection,
  resolveAtBottomState,
  seedMeasuredPageHeightsFromPreviousPages,
  type ChatPage,
  type StableChatPage,
} from './chatPageModel'

const LOAD_MORE_ROOT_MARGIN = '480px 0px 0px 0px'
const LOAD_MORE_WHEEL_COOLDOWN_MS = 120
const LOAD_MORE_DEFER_MS = 100
const PENDING_SCROLL_TARGET_KEEPALIVE_MS = 900
const DISCLOSURE_ANCHOR_LOCK_MS = 420
const PAGE_SELECTION_SETTLE_MS = 140

type LoadMoreAnchorSnapshot = {
  messageId: string
  topOffset: number
  pageCountBefore: number
}

/** Stable no-op to avoid creating a new closure on every render. */
const NOOP = () => {}

function pageHasStreamingMessage(page: ChatPage): boolean {
  return page.rows.some(row =>
    row.messages.some(
      message => message.isStreaming || (message.info.role === 'assistant' && message.info.time.completed == null),
    ),
  )
}

function pageHasUserMessage(page: ChatPage): boolean {
  return page.rows.some(row => row.messages.some(message => message.info.role === 'user'))
}

function captureLoadMoreAnchor(root: HTMLElement, pageCountBefore = 0): LoadMoreAnchorSnapshot | null {
  const rootRect = root.getBoundingClientRect()
  const rootTop = rootRect.top
  const rootBottom = rootRect.bottom
  const candidates = root.querySelectorAll<HTMLElement>('[data-message-id]')

  let best: LoadMoreAnchorSnapshot | null = null
  for (const element of candidates) {
    const rect = element.getBoundingClientRect()
    // 元素在视口下方 → 后续元素更靠下，提前退出
    if (rect.top >= rootBottom) break
    // 元素在视口上方 → 跳过
    if (rect.bottom <= rootTop) continue

    const messageId = element.getAttribute('data-message-id')
    if (!messageId) continue

    const topOffset = rect.top - rootTop
    if (!best || topOffset < best.topOffset) {
      best = { messageId, topOffset, pageCountBefore }
    }
  }

  return best
}

interface ChatAreaProps {
  messages: Message[]
  pageRecords?: StableChatPage[]
  visibleMessages?: Message[]
  forkTargetIdMap?: Map<string, string | undefined>
  turnDurationMap?: Map<string, number>
  sessionId?: string | null
  isStreaming?: boolean
  allowStreamingLayoutAnimation?: boolean
  loadState?: 'idle' | 'loading' | 'loaded' | 'error'
  loadError?: MessageError
  connectionError?: MessageError
  onOpenSettings?: () => void
  hasMoreHistory?: boolean
  onLoadMore?: () => void | Promise<void>
  onUndo?: (userMessageId: string) => void
  onFork?: (message: Message, forkMessageId?: string) => void | Promise<void>
  canUndo?: boolean
  registerMessage?: (id: string, element: HTMLElement | null) => void
  retryStatus?: RetryStatusInlineData | null
  bottomPadding?: number
  onVisibleMessageIdsChange?: (ids: string[]) => void
  onAtBottomChange?: (atBottom: boolean) => void
}

export type ChatAreaHandle = {
  scrollToBottom: (instant?: boolean) => void
  scrollToBottomIfAtBottom: () => void
  scrollToLastMessage: () => void
  scrollToMessageIndex: (index: number) => void
  scrollToMessageId: (messageId: string) => void
}

export const ChatArea = memo(
  forwardRef<ChatAreaHandle, ChatAreaProps>(
    (
      {
        messages,
        pageRecords,
        visibleMessages: visibleMessagesProp,
        forkTargetIdMap: forkTargetIdMapProp,
        turnDurationMap: turnDurationMapProp,
        sessionId,
        isStreaming = false,
        allowStreamingLayoutAnimation = true,
        loadState = 'idle',
        loadError,
        connectionError,
        onOpenSettings,
        onLoadMore,
        onUndo,
        onFork,
        canUndo,
        hasMoreHistory: _hasMoreHistory = false,
        registerMessage,
        retryStatus = null,
        bottomPadding = 0,
        onVisibleMessageIdsChange,
        onAtBottomChange,
      },
      ref,
    ) => {
      const { t } = useTranslation('chat')
      const scrollRef = useRef<HTMLDivElement>(null)
      const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)
      const topSentinelRef = useRef<HTMLDivElement>(null)
      const isAtBottomRef = useRef(true)
      const loadMoreRef = useRef(onLoadMore)
      const isLoadingRef = useRef(false)
      const [isLoadingMore, setIsLoadingMore] = useState(false)
      const [scrollOffsetFromBottom, setScrollOffsetFromBottom] = useState(0)
      const [viewportHeight, setViewportHeight] = useState(0)
      const [measuredPageHeights, setMeasuredPageHeights] = useState<Record<string, number>>({})
      const [retainedPageSelection, setRetainedPageSelection] = useState<Set<number>>(new Set())
      const [pendingScrollMessageId, setPendingScrollMessageId] = useState<string | null>(null)
      const [pendingLoadMoreAnchorMessageId, setPendingLoadMoreAnchorMessageId] = useState<string | null>(null)
      const scrollSnapshotRafRef = useRef<number | null>(null)
      const pendingLoadMoreAnchorRef = useRef<LoadMoreAnchorSnapshot | null>(null)
      const pendingLayoutAnchorRef = useRef<LoadMoreAnchorSnapshot | null>(null)
      const stableLayoutAnchorRef = useRef<LoadMoreAnchorSnapshot | null>(null)
      const disclosureLayoutAnchorRef = useRef<LoadMoreAnchorSnapshot | null>(null)
      const pendingLoadMoreTimerRef = useRef<number | null>(null)
      const disclosureAnchorTimerRef = useRef<number | null>(null)
      const pageSelectionSettleTimerRef = useRef<number | null>(null)
      const pendingScrollClearTimerRef = useRef<number | null>(null)
      const pendingAnchorClearRafRef = useRef<number | null>(null)
      const pendingSessionResetRafRef = useRef<number | null>(null)
      const visibleIdsPublishRafRef = useRef<number | null>(null)
      const lastScrollRootSizeRef = useRef({ width: 0, height: 0 })
      const scrollOffsetFromBottomRef = useRef(0)
      const measuredPageHeightsRef = useRef<Record<string, number>>({})
      const lastPublishedVisibleIdsRef = useRef<string[]>([])
      const previousActivePagesRef = useRef<{ sessionId?: string | null; pages: StableChatPage[] }>({ pages: [] })
      const lastStreamingPageKeysRef = useRef<ReadonlySet<string>>(new Set())
      const settlingScrollMessageIdRef = useRef<string | null>(null)
      const pendingScrollBehaviorRef = useRef<ScrollBehavior>('auto')
      const loadMoreRequestIdRef = useRef(0)
      const topSentinelVisibleRef = useRef(false)
      const lastWheelInputAtRef = useRef(0)
      const allowBottomReattachRef = useRef(false)
      const touchScrollYRef = useRef<number | null>(null)
      const tryLoadMoreRef = useRef<() => void>(NOOP)

      useEffect(() => {
        loadMoreRef.current = onLoadMore
      }, [onLoadMore])

      const loadMoreBlockedRef = useRef(true)

      const { presentation } = useChatViewport()
      const atBottomThreshold = presentation.isCompact ? 150 : AT_BOTTOM_THRESHOLD_PX
      const messagePaddingClass = presentation.isCompact ? 'px-3' : 'px-4'
      const messageMaxWidthClass = 'max-w-[95%] xl:max-w-7xl'
      const shouldUseExternalViewModel = pageRecords != null && visibleMessagesProp != null
      const visibleMessageEntries = useMemo(
        () => (shouldUseExternalViewModel ? [] : buildVisibleMessageEntries(messages)),
        [messages, shouldUseExternalViewModel],
      )
      const visibleMessages = useMemo(
        () => visibleMessagesProp ?? visibleMessageEntries.map(entry => entry.message),
        [visibleMessageEntries, visibleMessagesProp],
      )
      const pages = useMemo<StableChatPage[]>(
        () => (shouldUseExternalViewModel ? [] : buildContentKeyedChatPages(visibleMessages)),
        [shouldUseExternalViewModel, visibleMessages],
      )
      const localForkTargetIdMap = useMemo(
        () =>
          forkTargetIdMapProp ??
          new Map(visibleMessageEntries.map(entry => [entry.message.info.id, getVisibleMessageForkTargetId(entry)])),
        [forkTargetIdMapProp, visibleMessageEntries],
      )
      const localTurnDurationMap = useMemo(
        () => turnDurationMapProp ?? buildTurnDurationMap(messages, visibleMessages),
        [messages, turnDurationMapProp, visibleMessages],
      )
      // 发送后 agent 尚未产出任何 assistant 回复时显示"正在处理"，
      // 一旦最后一条消息变为 assistant（开始回复）即隐藏，无需等待回复完成
      const lastMessage = messages[messages.length - 1]
      const showProcessing = isStreaming && lastMessage?.info.role !== 'assistant'

      const activePages = pageRecords ?? pages

      useLayoutEffect(() => {
        const previous = previousActivePagesRef.current
        previousActivePagesRef.current = { sessionId, pages: activePages }
        if (previous.sessionId !== sessionId || previous.pages.length === 0 || activePages.length === 0) return

        const seeded = seedMeasuredPageHeightsFromPreviousPages({
          pages: activePages,
          previousPages: previous.pages,
          measuredPageHeights: measuredPageHeightsRef.current,
        })
        if (seeded === measuredPageHeightsRef.current) return
        measuredPageHeightsRef.current = seeded
        setMeasuredPageHeights(seeded)
      }, [activePages, sessionId])

      const pendingTargetPageIndex = useMemo(
        () =>
          pendingScrollMessageId == null
            ? -1
            : activePages.findIndex(page => page.messageIds.includes(pendingScrollMessageId)),
        [activePages, pendingScrollMessageId],
      )

      const pendingLoadMoreAnchorPageIndex = useMemo(
        () =>
          pendingLoadMoreAnchorMessageId == null
            ? -1
            : activePages.findIndex(page => page.messageIds.includes(pendingLoadMoreAnchorMessageId)),
        [activePages, pendingLoadMoreAnchorMessageId],
      )

      const expandedPageRange = useMemo(
        () =>
          computeExpandedPageRange({
            pages: activePages,
            measuredPageHeights,
            scrollOffsetFromBottom,
            viewportHeight,
          }),
        [activePages, measuredPageHeights, scrollOffsetFromBottom, viewportHeight],
      )

      const expandedPageSelection = useMemo(
        () => buildExpandedPageSelection(expandedPageRange, [pendingTargetPageIndex, pendingLoadMoreAnchorPageIndex]),
        [expandedPageRange, pendingLoadMoreAnchorPageIndex, pendingTargetPageIndex],
      )
      const latestExpandedPageSelectionRef = useRef(expandedPageSelection)
      useLayoutEffect(() => {
        latestExpandedPageSelectionRef.current = expandedPageSelection
        setRetainedPageSelection(previous => retainNearbyPageSelection(expandedPageSelection, previous))
        if (pageSelectionSettleTimerRef.current !== null) window.clearTimeout(pageSelectionSettleTimerRef.current)
        pageSelectionSettleTimerRef.current = window.setTimeout(() => {
          pageSelectionSettleTimerRef.current = null
          setRetainedPageSelection(new Set(latestExpandedPageSelectionRef.current))
        }, PAGE_SELECTION_SETTLE_MS)
      }, [expandedPageSelection])
      const stabilizedPageSelection = useMemo(
        () => retainNearbyPageSelection(expandedPageSelection, retainedPageSelection),
        [expandedPageSelection, retainedPageSelection],
      )

      const streamingPageKeys = useMemo(() => {
        const keys = new Set<string>()
        for (const page of activePages) {
          if (pageHasStreamingMessage(page)) keys.add(page.key)
        }
        return keys
      }, [activePages])

      useLayoutEffect(() => {
        lastStreamingPageKeysRef.current = streamingPageKeys
      }, [streamingPageKeys])

      const renderPageSelection = useMemo(
        () =>
          expandSelectionWithPageKeys({
            pages: activePages,
            expandedPageSelection: stabilizedPageSelection,
            pageKeys: streamingPageKeys,
          }),
        [activePages, stabilizedPageSelection, streamingPageKeys],
      )

      const renderSegments = useMemo(
        () =>
          buildPageRenderSegments({
            pages: activePages,
            expandedPageSelection: renderPageSelection,
            measuredPageHeights,
          }),
        [activePages, measuredPageHeights, renderPageSelection],
      )
      const observedMessageIdsSignature = useMemo(
        () =>
          renderSegments
            .flatMap(segment => (segment.kind === 'expanded' ? segment.page.messageIds : []))
            .join('\u001f'),
        [renderSegments],
      )

      const clearPendingLoadMoreTimer = useCallback(() => {
        if (pendingLoadMoreTimerRef.current === null) return
        window.clearTimeout(pendingLoadMoreTimerRef.current)
        pendingLoadMoreTimerRef.current = null
      }, [])

      const clearPendingScrollTimer = useCallback(() => {
        if (pendingScrollClearTimerRef.current === null) return
        window.clearTimeout(pendingScrollClearTimerRef.current)
        pendingScrollClearTimerRef.current = null
      }, [])

      const clearPendingLoadMoreAnchorMessage = useCallback(() => {
        if (pendingAnchorClearRafRef.current !== null) cancelAnimationFrame(pendingAnchorClearRafRef.current)
        pendingAnchorClearRafRef.current = requestAnimationFrame(() => {
          pendingAnchorClearRafRef.current = null
          setPendingLoadMoreAnchorMessageId(null)
        })
      }, [])

      const resetSessionViewState = useCallback(() => {
        if (pendingSessionResetRafRef.current !== null) cancelAnimationFrame(pendingSessionResetRafRef.current)
        pendingSessionResetRafRef.current = requestAnimationFrame(() => {
          pendingSessionResetRafRef.current = null
          setIsLoadingMore(false)
          measuredPageHeightsRef.current = {}
          setMeasuredPageHeights({})
          scrollOffsetFromBottomRef.current = 0
          setScrollOffsetFromBottom(0)
          setPendingScrollMessageId(null)
          setRetainedPageSelection(new Set())
        })
      }, [])

      useEffect(() => {
        return () => {
          clearPendingLoadMoreTimer()
          clearPendingScrollTimer()
          if (scrollSnapshotRafRef.current !== null) cancelAnimationFrame(scrollSnapshotRafRef.current)
          if (pendingAnchorClearRafRef.current !== null) cancelAnimationFrame(pendingAnchorClearRafRef.current)
          if (pendingSessionResetRafRef.current !== null) cancelAnimationFrame(pendingSessionResetRafRef.current)
          if (visibleIdsPublishRafRef.current !== null) cancelAnimationFrame(visibleIdsPublishRafRef.current)
          if (disclosureAnchorTimerRef.current !== null) window.clearTimeout(disclosureAnchorTimerRef.current)
          if (pageSelectionSettleTimerRef.current !== null) window.clearTimeout(pageSelectionSettleTimerRef.current)
        }
      }, [clearPendingLoadMoreTimer, clearPendingScrollTimer])

      const setScrollContainerRef = useCallback((node: HTMLDivElement | null) => {
        scrollRef.current = node
        setScrollRoot(prev => (prev === node ? prev : node))
      }, [])

      const updateScrollOffsetSnapshot = useCallback(() => {
        const root = scrollRef.current
        if (!root) return

        const nextOffset = Math.abs(root.scrollTop)
        if (scrollSnapshotRafRef.current !== null) cancelAnimationFrame(scrollSnapshotRafRef.current)
        scrollSnapshotRafRef.current = requestAnimationFrame(() => {
          scrollSnapshotRafRef.current = null
          // 阈值 4px：快速滚动时减少约 75% 的 setState 触发，视觉无感知
          if (Math.abs(nextOffset - scrollOffsetFromBottomRef.current) < 4) return
          if (!isAtBottomRef.current) {
            const anchor = disclosureLayoutAnchorRef.current ?? captureLoadMoreAnchor(root)
            stableLayoutAnchorRef.current = anchor
            pendingLayoutAnchorRef.current = anchor
          } else {
            stableLayoutAnchorRef.current = null
          }
          scrollOffsetFromBottomRef.current = nextOffset
          setScrollOffsetFromBottom(nextOffset)
        })
      }, [])

      const commitAtBottom = useCallback(
        (next: boolean) => {
          const previous = isAtBottomRef.current
          isAtBottomRef.current = next
          if (previous !== next) onAtBottomChange?.(next)
        },
        [onAtBottomChange],
      )

      useEffect(() => {
        const root = scrollRoot
        if (!root || typeof ResizeObserver === 'undefined') return

        const syncViewport = () => {
          const nextSize = { width: root.clientWidth, height: root.clientHeight }
          const previousSize = lastScrollRootSizeRef.current
          const widthChanged = Math.abs(previousSize.width - nextSize.width) >= 1
          const heightChanged = Math.abs(previousSize.height - nextSize.height) >= 1

          if (widthChanged || heightChanged) {
            lastScrollRootSizeRef.current = nextSize
          }

          setViewportHeight(prev => (Math.abs(prev - nextSize.height) < 1 ? prev : nextSize.height))
        }

        syncViewport()
        const observer = new ResizeObserver(syncViewport)
        observer.observe(root)
        return () => observer.disconnect()
      }, [scrollRoot])

      useEffect(() => {
        const root = scrollRef.current
        if (!root) return

        const onScroll = () => {
          const hasOverflow = root.scrollHeight > root.clientHeight + 1
          const distFromBottom = Math.abs(root.scrollTop)
          const atBottom = resolveAtBottomState({
            previous: isAtBottomRef.current,
            distanceFromBottom: hasOverflow ? distFromBottom : 0,
            threshold: atBottomThreshold,
            allowReattach: allowBottomReattachRef.current,
          })
          commitAtBottom(atBottom)
          if (atBottom) allowBottomReattachRef.current = false

          if (!atBottom) loadMoreBlockedRef.current = false
          updateScrollOffsetSnapshot()
        }

        const onWheel = (event: WheelEvent) => {
          lastWheelInputAtRef.current = Date.now()
          if (event.deltaY < 0) allowBottomReattachRef.current = false
          if (event.deltaY > 0) allowBottomReattachRef.current = true
        }

        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'Home') {
            allowBottomReattachRef.current = false
          }
          if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'End') {
            allowBottomReattachRef.current = true
          }
        }

        const onTouchStart = (event: TouchEvent) => {
          touchScrollYRef.current = event.touches[0]?.clientY ?? null
        }

        const onTouchMove = (event: TouchEvent) => {
          const currentY = event.touches[0]?.clientY
          const previousY = touchScrollYRef.current
          if (currentY == null || previousY == null) return
          if (currentY > previousY) allowBottomReattachRef.current = false
          if (currentY < previousY) allowBottomReattachRef.current = true
          touchScrollYRef.current = currentY
        }

        root.addEventListener('scroll', onScroll, { passive: true })
        root.addEventListener('wheel', onWheel, { passive: true })
        root.addEventListener('keydown', onKeyDown)
        root.addEventListener('touchstart', onTouchStart, { passive: true })
        root.addEventListener('touchmove', onTouchMove, { passive: true })
        updateScrollOffsetSnapshot()
        return () => {
          root.removeEventListener('scroll', onScroll)
          root.removeEventListener('wheel', onWheel)
          root.removeEventListener('keydown', onKeyDown)
          root.removeEventListener('touchstart', onTouchStart)
          root.removeEventListener('touchmove', onTouchMove)
        }
      }, [atBottomThreshold, commitAtBottom, updateScrollOffsetSnapshot])

      const prevSessionIdRef = useRef(sessionId)
      useEffect(() => {
        if (sessionId === prevSessionIdRef.current) return
        prevSessionIdRef.current = sessionId
        commitAtBottom(true)
        allowBottomReattachRef.current = false
        loadMoreBlockedRef.current = true
        pendingLoadMoreAnchorRef.current = null
        pendingLayoutAnchorRef.current = null
        stableLayoutAnchorRef.current = null
        disclosureLayoutAnchorRef.current = null
        if (disclosureAnchorTimerRef.current !== null) {
          window.clearTimeout(disclosureAnchorTimerRef.current)
          disclosureAnchorTimerRef.current = null
        }
        previousActivePagesRef.current = { sessionId, pages: [] }
        lastStreamingPageKeysRef.current = new Set()
        clearPendingLoadMoreAnchorMessage()
        topSentinelVisibleRef.current = false
        loadMoreRequestIdRef.current += 1
        isLoadingRef.current = false
        clearPendingLoadMoreTimer()
        settlingScrollMessageIdRef.current = null
        clearPendingScrollTimer()
        resetSessionViewState()
        lastPublishedVisibleIdsRef.current = []
        onVisibleMessageIdsChange?.([])

        requestAnimationFrame(() => {
          const root = scrollRef.current
          if (!root) return
          root.scrollTop = 0
          updateScrollOffsetSnapshot()
        })
      }, [
        clearPendingLoadMoreTimer,
        clearPendingLoadMoreAnchorMessage,
        clearPendingScrollTimer,
        commitAtBottom,
        onVisibleMessageIdsChange,
        resetSessionViewState,
        sessionId,
        updateScrollOffsetSnapshot,
        visibleMessages,
      ])

      useEffect(() => {
        if (loadState !== 'loaded') return
        requestAnimationFrame(() => {
          const root = scrollRef.current
          if (root && isAtBottomRef.current) {
            root.scrollTop = 0
            updateScrollOffsetSnapshot()
          }
        })
      }, [loadState, updateScrollOffsetSnapshot])

      const tryLoadMore = useCallback(() => {
        if (isLoadingRef.current) return
        if (!topSentinelVisibleRef.current) return
        if (loadMoreBlockedRef.current) return

        const fn = loadMoreRef.current
        if (!fn) return

        const sid = sessionId
        if (!sid) return
        const hasMore = messageStore.getSessionState(sid)?.hasMoreHistory ?? false
        if (!hasMore) return

        const sinceWheel = Date.now() - lastWheelInputAtRef.current
        if (sinceWheel < LOAD_MORE_WHEEL_COOLDOWN_MS) {
          clearPendingLoadMoreTimer()
          pendingLoadMoreTimerRef.current = window.setTimeout(() => {
            pendingLoadMoreTimerRef.current = null
            tryLoadMoreRef.current()
          }, LOAD_MORE_DEFER_MS)
          return
        }

        const root = scrollRef.current
        if (root) {
          const anchor = captureLoadMoreAnchor(root, activePages.length)
          pendingLoadMoreAnchorRef.current = anchor
          setPendingLoadMoreAnchorMessageId(anchor?.messageId ?? null)
        }

        const requestId = ++loadMoreRequestIdRef.current
        const requestSessionId = sid
        isLoadingRef.current = true
        setIsLoadingMore(true)
        Promise.resolve(fn()).finally(() => {
          if (loadMoreRequestIdRef.current !== requestId || sessionId !== requestSessionId) return
          isLoadingRef.current = false
          setIsLoadingMore(false)
        })
      }, [activePages.length, clearPendingLoadMoreTimer, sessionId])

      useEffect(() => {
        tryLoadMoreRef.current = tryLoadMore
      }, [tryLoadMore])

      useEffect(() => {
        const sentinel = topSentinelRef.current
        const root = scrollRef.current
        if (!sentinel || !root) return

        const observer = new IntersectionObserver(
          ([entry]) => {
            topSentinelVisibleRef.current = entry.isIntersecting
            if (!entry.isIntersecting) {
              clearPendingLoadMoreTimer()
              return
            }
            tryLoadMore()
          },
          { root, rootMargin: LOAD_MORE_ROOT_MARGIN },
        )

        observer.observe(sentinel)
        return () => {
          observer.disconnect()
          topSentinelVisibleRef.current = false
          clearPendingLoadMoreTimer()
        }
      }, [clearPendingLoadMoreTimer, scrollRoot, tryLoadMore])

      useLayoutEffect(() => {
        const anchor = pendingLoadMoreAnchorRef.current
        const root = scrollRef.current
        if (!anchor || !root) return
        if (activePages.length <= anchor.pageCountBefore) return

        const target = root.querySelector<HTMLElement>(`[data-message-id="${anchor.messageId}"]`)
        if (!target) return

        pendingLoadMoreAnchorRef.current = null
        clearPendingLoadMoreAnchorMessage()

        const rootRect = root.getBoundingClientRect()
        const nextTopOffset = target.getBoundingClientRect().top - rootRect.top
        const delta = computeAnchorRestoreScrollDelta(anchor.topOffset, nextTopOffset)
        if (Math.abs(delta) >= 1) {
          root.scrollTop += delta
          updateScrollOffsetSnapshot()
        }
      }, [activePages, clearPendingLoadMoreAnchorMessage, updateScrollOffsetSnapshot])

      useLayoutEffect(() => {
        const anchor = pendingLayoutAnchorRef.current
        const root = scrollRef.current
        if (!anchor || !root) return

        const target = root.querySelector<HTMLElement>(`[data-message-id="${anchor.messageId}"]`)
        const disclosureLocked = disclosureLayoutAnchorRef.current === anchor
        if (!disclosureLocked) pendingLayoutAnchorRef.current = null
        if (!target) return

        const rootRect = root.getBoundingClientRect()
        const nextTopOffset = target.getBoundingClientRect().top - rootRect.top
        const delta = computeAnchorRestoreScrollDelta(anchor.topOffset, nextTopOffset)
        if (Math.abs(delta) >= 1) {
          root.scrollTop += delta
          updateScrollOffsetSnapshot()
        }
        if (!disclosureLocked) stableLayoutAnchorRef.current = captureLoadMoreAnchor(root)
      }, [activePages, measuredPageHeights, renderSegments, updateScrollOffsetSnapshot])

      const onVisibleIdsChangeRef = useRef(onVisibleMessageIdsChange)
      useEffect(() => {
        onVisibleIdsChangeRef.current = onVisibleMessageIdsChange
      }, [onVisibleMessageIdsChange])

      useEffect(() => {
        const root = scrollRef.current
        if (!root) return

        const visibleIds = new Set<string>()
        const publishVisibleIds = () => {
          visibleIdsPublishRafRef.current = null
          const rootRect = root.getBoundingClientRect()
          const ids = rankOutlineVisibleMessageIds(
            Array.from(root.querySelectorAll<HTMLElement>('[data-message-id]')).flatMap(element => {
              const messageId = element.getAttribute('data-message-id')
              if (!messageId || !visibleIds.has(messageId)) return []
              const rect = element.getBoundingClientRect()
              return [{ messageId, top: rect.top, bottom: rect.bottom }]
            }),
            rootRect.top,
            rootRect.bottom,
          )
          const previous = lastPublishedVisibleIdsRef.current
          if (previous.length === ids.length && previous.every((id, index) => id === ids[index])) return
          lastPublishedVisibleIdsRef.current = ids
          onVisibleIdsChangeRef.current?.(ids)
        }
        const scheduleVisibleIdsPublish = () => {
          if (visibleIdsPublishRafRef.current !== null) return
          visibleIdsPublishRafRef.current = requestAnimationFrame(publishVisibleIds)
        }
        const observer = new IntersectionObserver(
          entries => {
            let changed = false
            for (const entry of entries) {
              const id = entry.target.getAttribute('data-message-id')
              if (!id) continue
              if (entry.isIntersecting) {
                if (!visibleIds.has(id)) {
                  visibleIds.add(id)
                  changed = true
                }
              } else if (visibleIds.has(id)) {
                visibleIds.delete(id)
                changed = true
              }
            }
            if (changed) scheduleVisibleIdsPublish()
          },
          { root, rootMargin: '0px' },
        )

        const elements = root.querySelectorAll<HTMLElement>('[data-message-id]')
        elements.forEach(element => observer.observe(element))

        return () => {
          observer.disconnect()
          if (visibleIdsPublishRafRef.current !== null) {
            cancelAnimationFrame(visibleIdsPublishRafRef.current)
            visibleIdsPublishRafRef.current = null
          }
        }
      }, [observedMessageIdsSignature, scrollRoot])

      useEffect(() => {
        if (!pendingScrollMessageId) return
        const target = scrollRef.current?.querySelector<HTMLElement>(`[data-message-id="${pendingScrollMessageId}"]`)
        if (!target) return
        if (settlingScrollMessageIdRef.current === pendingScrollMessageId) return

        settlingScrollMessageIdRef.current = pendingScrollMessageId
        target.scrollIntoView({ block: 'start', behavior: pendingScrollBehaviorRef.current })
        clearPendingScrollTimer()
        pendingScrollClearTimerRef.current = window.setTimeout(() => {
          pendingScrollClearTimerRef.current = null
          if (settlingScrollMessageIdRef.current !== pendingScrollMessageId) return
          settlingScrollMessageIdRef.current = null
          setPendingScrollMessageId(current => (current === pendingScrollMessageId ? null : current))
        }, PENDING_SCROLL_TARGET_KEEPALIVE_MS)
      }, [
        activePages,
        clearPendingScrollTimer,
        expandedPageRange.endIndex,
        expandedPageRange.startIndex,
        pendingScrollMessageId,
      ])

      const updateMeasuredPageHeight = useCallback((pageKey: string, nextHeight: number) => {
        if (nextHeight <= 0) return
        const current = measuredPageHeightsRef.current[pageKey] ?? null
        if (current !== null && Math.abs(current - nextHeight) < 1) return
        const root = scrollRef.current
        if (root && !isAtBottomRef.current) {
          pendingLayoutAnchorRef.current =
            disclosureLayoutAnchorRef.current ?? stableLayoutAnchorRef.current ?? captureLoadMoreAnchor(root)
        }
        const next = { ...measuredPageHeightsRef.current, [pageKey]: nextHeight }
        measuredPageHeightsRef.current = next
        setMeasuredPageHeights(next)
      }, [])

      const captureAnchorBeforeDisclosure = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        if (isAtBottomRef.current) return
        if (!(event.target instanceof Element) || !event.target.closest('[aria-expanded]')) return

        const root = scrollRef.current
        if (!root) return
        const anchor = captureLoadMoreAnchor(root)
        if (!anchor) return

        stableLayoutAnchorRef.current = anchor
        disclosureLayoutAnchorRef.current = anchor
        pendingLayoutAnchorRef.current = anchor
        if (disclosureAnchorTimerRef.current !== null) window.clearTimeout(disclosureAnchorTimerRef.current)
        disclosureAnchorTimerRef.current = window.setTimeout(() => {
          disclosureAnchorTimerRef.current = null
          disclosureLayoutAnchorRef.current = null
          pendingLayoutAnchorRef.current = null
          stableLayoutAnchorRef.current = captureLoadMoreAnchor(root)
        }, DISCLOSURE_ANCHOR_LOCK_MS)
      }, [])

      const requestScrollToMessage = useCallback(
        (messageId: string, behavior: ScrollBehavior) => {
          const root = scrollRef.current
          if (!root) return

          const directTarget = root.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)
          if (directTarget) {
            directTarget.scrollIntoView({ block: 'start', behavior })
            return
          }

          const targetPageIndex = activePages.findIndex(page => page.messageIds.includes(messageId))
          if (targetPageIndex === -1) return

          const pageOffsets = buildPageOffsets(activePages, measuredPageHeights)
          root.scrollTo({ top: -pageOffsets[targetPageIndex], behavior: behavior === 'smooth' ? 'auto' : behavior })
          updateScrollOffsetSnapshot()
          settlingScrollMessageIdRef.current = null
          clearPendingScrollTimer()
          pendingScrollBehaviorRef.current = 'auto'
          setPendingScrollMessageId(messageId)
        },
        [activePages, clearPendingScrollTimer, measuredPageHeights, updateScrollOffsetSnapshot],
      )

      useImperativeHandle(
        ref,
        () => ({
          scrollToBottom: (instant = false) => {
            const root = scrollRef.current
            if (!root) return
            allowBottomReattachRef.current = true
            commitAtBottom(true)
            root.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' })
          },
          scrollToBottomIfAtBottom: () => {
            const root = scrollRef.current
            if (!root) return
            if (Math.abs(root.scrollTop) > 2) return
            if (!isAtBottomRef.current) return
            root.scrollTop = 0
          },
          scrollToLastMessage: () => {
            if (visibleMessages.length === 0) return
            requestScrollToMessage(visibleMessages[visibleMessages.length - 1].info.id, 'auto')
          },
          scrollToMessageIndex: (index: number) => {
            const message = visibleMessages[index]
            if (!message) return
            requestScrollToMessage(message.info.id, 'smooth')
          },
          scrollToMessageId: (messageId: string) => {
            requestScrollToMessage(messageId, 'smooth')
          },
        }),
        [commitAtBottom, requestScrollToMessage, visibleMessages],
      )

      return (
        <div className="h-full overflow-hidden contain-strict relative">
          {loadState === 'loading' && visibleMessages.length === 0 && (
            <div className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-4 gap-4 animate-pulse" style={{ animationDuration: '1.5s' }}>
              <div className="flex justify-end">
                <div className="h-10 w-3/5 rounded-2xl bg-bg-300/60" />
              </div>
              <div className="flex justify-start">
                <div className="h-24 w-4/5 rounded-2xl bg-bg-300/60" />
              </div>
              <div className="flex justify-end">
                <div className="h-12 w-2/5 rounded-2xl bg-bg-300/60" />
              </div>
              <div className="flex justify-start">
                <div className="h-32 w-4/5 rounded-2xl bg-bg-300/60" />
              </div>
            </div>
          )}

          <div
            ref={setScrollContainerRef}
            data-chat-scroll-root="true"
            onClickCapture={captureAnchorBeforeDisclosure}
            className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar contain-content flex flex-col-reverse"
            style={{ overflowAnchor: 'none' }}
          >
            <div className="flex-1" />

            <div className="shrink-0" style={{ height: 24 }} />

            {retryStatus && (
              <div className={`w-full ${messageMaxWidthClass} mx-auto ${messagePaddingClass} shrink-0`}>
                <div className="flex justify-start">
                  <div className="w-full min-w-0">
                    <RetryStatusInline status={retryStatus} />
                  </div>
                </div>
              </div>
            )}

            {showProcessing && !retryStatus && (
              <div className={`w-full ${messageMaxWidthClass} mx-auto ${messagePaddingClass} shrink-0 py-3`}>
                <div className="flex justify-start">
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-1.5 rounded-md py-1 text-[length:var(--fs-base)] text-text-400"
                  >
                    {isStreaming ? (
                      <SpinnerIcon size={14} className="animate-spin text-accent-main-100" />
                    ) : (
                      <span className="text-accent-main-100">✓</span>
                    )}
                    <span className="font-medium">
                      {t('chatArea.agentProcessing')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {visibleMessages.length === 0 && (loadError || connectionError) && (
              <div className={`w-full ${messageMaxWidthClass} mx-auto ${messagePaddingClass} shrink-0`}>
                <div className="flex justify-start">
                  <div className="w-full min-w-0 space-y-2">
                    <MessageErrorView error={loadError ?? connectionError!} />
                    {connectionError && onOpenSettings && (
                      <button
                        type="button"
                        onClick={onOpenSettings}
                        className="rounded-md border border-border-200 bg-bg-100 px-3 py-1.5 text-[length:var(--fs-sm)] text-text-200 transition-colors hover:bg-bg-200"
                      >
                        Open server settings
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {renderSegments.map(segment =>
              segment.kind === 'expanded' ? (
                <PageBlock
                  key={segment.key}
                  page={segment.page}
                  messageMaxWidthClass={messageMaxWidthClass}
                  messagePaddingClass={messagePaddingClass}
                  registerMessage={registerMessage}
                  onUndo={onUndo}
                  onFork={onFork}
                  canUndo={canUndo}
                  turnDurationMap={localTurnDurationMap}
                  forkTargetIdMap={localForkTargetIdMap}
                  allowStreamingLayoutAnimation={allowStreamingLayoutAnimation}
                  onMeasuredHeightChange={updateMeasuredPageHeight}
                />
              ) : (
                <CollapsedPagesBlock key={segment.key} height={segment.height} />
              ),
            )}

            {visibleMessages.length > 0 && isLoadingMore && (
              <div className="flex justify-center py-3 shrink-0">
                <div className="flex items-center gap-2 text-text-400 text-[length:var(--fs-sm)]">
                  <span className="w-3.5 h-3.5 border-2 border-text-400/30 border-t-text-400 rounded-full animate-spin" />
                  {t('chatArea.loadingHistory')}
                </div>
              </div>
            )}

            <div className="mobile-chat-top-spacer shrink-0" />
            <div ref={topSentinelRef} className="h-px shrink-0" aria-hidden="true" />
          </div>
        </div>
      )
    },
  ),
)

interface PageBlockProps {
  page: ChatPage
  messageMaxWidthClass: string
  messagePaddingClass: string
  registerMessage?: (id: string, element: HTMLElement | null) => void
  onUndo?: (userMessageId: string) => void
  onFork?: (message: Message, forkMessageId?: string) => void | Promise<void>
  canUndo?: boolean
  turnDurationMap: Map<string, number>
  forkTargetIdMap: Map<string, string | undefined>
  allowStreamingLayoutAnimation: boolean
  onMeasuredHeightChange: (pageKey: string, nextHeight: number) => void
}

interface PageDerivedValueProps {
  page: ChatPage
  turnDurationMap: Map<string, number>
  forkTargetIdMap: Map<string, string | undefined>
}

function pageMessageDerivedValuesEqual(previous: PageDerivedValueProps, next: PageDerivedValueProps) {
  return previous.page.messageIds.every(messageId => {
    return (
      previous.turnDurationMap.get(messageId) === next.turnDurationMap.get(messageId) &&
      previous.forkTargetIdMap.get(messageId) === next.forkTargetIdMap.get(messageId)
    )
  })
}

export function arePageBlockPropsEqual(previous: PageBlockProps, next: PageBlockProps) {
  if (previous.page !== next.page) return false
  if (previous.messageMaxWidthClass !== next.messageMaxWidthClass) return false
  if (previous.messagePaddingClass !== next.messagePaddingClass) return false
  if (previous.registerMessage !== next.registerMessage) return false
  if (previous.onUndo !== next.onUndo && pageHasUserMessage(next.page)) return false
  if (previous.onFork !== next.onFork) return false
  if (previous.canUndo !== next.canUndo && pageHasUserMessage(next.page)) return false
  if (
    previous.allowStreamingLayoutAnimation !== next.allowStreamingLayoutAnimation &&
    (pageHasStreamingMessage(previous.page) || pageHasStreamingMessage(next.page))
  ) {
    return false
  }
  if (previous.onMeasuredHeightChange !== next.onMeasuredHeightChange) return false
  return pageMessageDerivedValuesEqual(previous, next)
}

function usePageHeightMeasurement(
  pageKey: string,
  onMeasuredHeightChange: (pageKey: string, nextHeight: number) => void,
) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const measure = useCallback(() => {
    const element = wrapperRef.current
    if (!element) return
    onMeasuredHeightChange(pageKey, element.offsetHeight)
  }, [onMeasuredHeightChange, pageKey])

  useLayoutEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    const element = wrapperRef.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure])

  return wrapperRef
}

const PageBlock = memo(function PageBlock({
  page,
  messageMaxWidthClass,
  messagePaddingClass,
  registerMessage,
  onUndo,
  onFork,
  canUndo,
  turnDurationMap,
  forkTargetIdMap,
  allowStreamingLayoutAnimation,
  onMeasuredHeightChange,
}: PageBlockProps) {
  const wrapperRef = usePageHeightMeasurement(page.key, onMeasuredHeightChange)

  return (
    <div ref={wrapperRef} className="shrink-0" data-page-key={page.key}>
      {page.rows.map(row => {
        const isUser = row.messages[0].info.role === 'user'
        return (
          <div
            key={row.key}
            className={`w-full ${messageMaxWidthClass} mx-auto ${messagePaddingClass} py-3 transition-[max-width] duration-300 ease-in-out`}
          >
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`min-w-0 group ${!isUser ? 'w-full' : ''} flex flex-col gap-2`}>
                {isUser ? (
                  row.messages.map(message => (
                    <RenderedMessageItem
                      key={message.info.id}
                      messageId={message.info.id}
                      registerMessage={registerMessage}
                    >
                      <MessageRenderer
                        message={message}
                        onUndo={onUndo}
                        onFork={onFork}
                        forkMessageId={forkTargetIdMap.get(message.info.id)}
                        canUndo={canUndo}
                        onEnsureParts={NOOP}
                      />
                    </RenderedMessageItem>
                  ))
                ) : (
                  <AssistantTurnMessages
                    messages={row.messages}
                    registerMessage={registerMessage}
                    onFork={onFork}
                    turnDurationMap={turnDurationMap}
                    forkTargetIdMap={forkTargetIdMap}
                    allowStreamingLayoutAnimation={allowStreamingLayoutAnimation}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}, arePageBlockPropsEqual)

/** "已处理"耗时：1 分钟以下显示整秒（1s、2s、3s...），以上走 formatDuration */
function formatTurnElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  return formatDuration(totalSeconds * 1000)
}

const AssistantTurnMessages = memo(function AssistantTurnMessages({
  messages,
  registerMessage,
  onFork,
  turnDurationMap,
  forkTargetIdMap,
  allowStreamingLayoutAnimation,
}: {
  messages: Message[]
  registerMessage?: (id: string, element: HTMLElement | null) => void
  onFork?: (message: Message, forkMessageId?: string) => void | Promise<void>
  turnDurationMap: Map<string, number>
  forkTargetIdMap: Map<string, string | undefined>
  allowStreamingLayoutAnimation: boolean
}) {
  const { t } = useTranslation('message')
  const { autoCollapseExecutionProcess } = useTheme()
  const plan = useMemo(
    () => (autoCollapseExecutionProcess ? buildExecutionCollapsePlan(messages) : null),
    [autoCollapseExecutionProcess, messages],
  )
  const disclosureKey = `assistant-turn:${messages.at(-1)?.info.id ?? 'empty'}:execution-process`
  const [expanded, setExpanded] = useUiDisclosureState(disclosureKey, true)
  const shouldRenderProcess = useDelayedRender(expanded)

  // 处理中：实时累加耗时（每秒刷新），完成后回落实际耗时
  const isProcessing = messages.some(message => message.isStreaming)
  const turnStart = messages[0]?.info.time.created
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isProcessing || turnStart == null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isProcessing, turnStart])

  if (!plan) {
    return mergeProcessMessages(messages).map(message => (
      <RenderedMessageItem
        key={message.info.id}
        messageId={message.info.id}
        registerMessage={registerMessage}
      >
        <MessageRenderer
          message={message}
          allowStreamingLayoutAnimation={message.isStreaming ? allowStreamingLayoutAnimation : false}
          turnDuration={turnDurationMap.get(message.info.id)}
          onFork={onFork}
          forkMessageId={forkTargetIdMap.get(message.info.id)}
          onEnsureParts={NOOP}
        />
      </RenderedMessageItem>
    ))
  }

  const processMessages = messages
    .slice(0, plan.conclusionMessageIndex + 1)
    .map((message, index) =>
      index === plan.conclusionMessageIndex
        ? { ...message, parts: message.parts.slice(0, plan.conclusionPartIndex) }
        : message,
    )
    .filter(hasRenderableParts)
  const conclusionMessages = messages
    .slice(plan.conclusionMessageIndex)
    .map((message, index) =>
      index === 0
        ? { ...message, parts: message.parts.slice(plan.conclusionPartIndex) }
        : message,
    )
    .filter(hasRenderableParts)
  const completedDuration = messages.reduce(
    (value, message) => turnDurationMap.get(message.info.id) ?? value,
    undefined as number | undefined,
  )
  const duration =
    isProcessing && turnStart != null ? now - turnStart : completedDuration

  return (
    <>
      <div className="border-b border-border-200/60 pb-2">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={t(expanded ? 'executionProcess.collapse' : 'executionProcess.expand')}
          onClick={() => setExpanded(value => !value)}
          className="flex items-center gap-1.5 rounded-md py-1 text-[length:var(--fs-base)] text-text-400 transition-colors hover:text-text-200"
        >
          <span className="font-medium">{t('executionProcess.processed')}</span>
          {duration != null && duration > 0 && <span>{formatTurnElapsed(duration)}</span>}
          <ChevronRightIcon
            size={14}
            className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            {shouldRenderProcess && (
              <div className="flex flex-col gap-2 pt-2">
                {mergeProcessMessages(processMessages).map(message => (
                  <RenderedMessageItem
                    key={`${message.info.id}:process`}
                    messageId={message.info.id}
                    registerMessage={registerMessage}
                  >
                    <MessageRenderer
                      message={message}
                      showActions={false}
                      showError={false}
                      onEnsureParts={NOOP}
                      descriptiveTools
                    />
                  </RenderedMessageItem>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {conclusionMessages.map(message => (
        <RenderedMessageItem
          key={`${message.info.id}:conclusion`}
          messageId={message.info.id}
          registerMessage={registerMessage}
        >
          <MessageRenderer
            message={message}
            turnDuration={turnDurationMap.get(message.info.id)}
            onFork={onFork}
            forkMessageId={forkTargetIdMap.get(message.info.id)}
            onEnsureParts={NOOP}
          />
        </RenderedMessageItem>
      ))}
    </>
  )
})

const CollapsedPagesBlock = memo(function CollapsedPagesBlock({ height }: { height: number }) {
  return <div className="shrink-0" style={{ height: `${height}px`, overflowAnchor: 'none' }} aria-hidden="true" />
})

interface RenderedMessageItemProps {
  messageId: string
  registerMessage?: (id: string, element: HTMLElement | null) => void
  children: ReactNode
}

const RenderedMessageItem = memo(function RenderedMessageItem({
  messageId,
  registerMessage,
  children,
}: RenderedMessageItemProps) {
  const setElement = useCallback(
    (node: HTMLDivElement | null) => {
      registerMessage?.(messageId, node)
    },
    [messageId, registerMessage],
  )

  return (
    <div ref={setElement} data-message-id={messageId}>
      {children}
    </div>
  )
})
