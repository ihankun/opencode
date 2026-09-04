import { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon } from '../../../components/Icons'
import { useDelayedRender } from '../../../hooks'
import { LazyMarkdownRenderer } from '../../../components/LazyMarkdownRenderer'
import type { ReasoningPart } from '../../../types/message'
import { useUiDisclosureState } from '../../../utils/uiDisclosureState'

interface ReasoningPartViewProps {
  part: ReasoningPart
  isStreaming?: boolean
}

export const ReasoningPartView = memo(function ReasoningPartView({ part, isStreaming }: ReasoningPartViewProps) {
  const { t } = useTranslation('message')
  const rawText = part.text || ''

  const isPartStreaming = isStreaming && !part.time?.end
  const hasContent = !!rawText.trim()

  const displayText = rawText
  const [expanded, setExpanded] = useUiDisclosureState(`message:${part.messageID}:reasoning:${part.id}`, false)
  const shouldRenderBody = useDelayedRender(expanded)
  const summaryContainerRef = useRef<HTMLDivElement>(null)
  const summaryMeasureRef = useRef<HTMLSpanElement>(null)
  const [summaryOverflow, setSummaryOverflow] = useState(false)

  const collapsedPreview = useMemo(() => (displayText || '').replace(/\s+/g, ' ').trim(), [displayText])
  const thoughtDurationLabel = useMemo(() => {
    const start = part.time?.start
    const end = part.time?.end
    if (!start || !end || end <= start) return null
    const durationMs = end - start
    if (durationMs < 1000) return `${Math.max(1, Math.round(durationMs))}ms`
    if (durationMs < 10000) return `${(durationMs / 1000).toFixed(1)}s`
    return `${Math.round(durationMs / 1000)}s`
  }, [part.time?.start, part.time?.end])
  const summaryText = collapsedPreview || (isPartStreaming ? t('reasoning.thinking') : '')

  const measureSummaryOverflow = useCallback(() => {
    const containerEl = summaryContainerRef.current
    const measureEl = summaryMeasureRef.current
    if (!containerEl || !measureEl) return
    const overflow = measureEl.scrollWidth - containerEl.clientWidth > 1
    setSummaryOverflow(prev => (prev === overflow ? prev : overflow))
  }, [])

  useEffect(() => {
    let frameId: number | null = null

    // 思考内容默认不自动展开；未手动操作时完成后保持折叠，想看自己点开
    if (!isPartStreaming) {
      frameId = requestAnimationFrame(() => {
        setExpanded(false, { touched: false, respectUser: true })
      })
    }

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [isPartStreaming, hasContent, setExpanded])

  useEffect(() => {
    measureSummaryOverflow()

    const raf = requestAnimationFrame(measureSummaryOverflow)
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && summaryContainerRef.current) {
      ro = new ResizeObserver(measureSummaryOverflow)
      ro.observe(summaryContainerRef.current)
    }

    const fontsReady = document.fonts?.ready
    if (fontsReady && typeof fontsReady.then === 'function') {
      fontsReady.then(() => measureSummaryOverflow()).catch(() => {})
    }

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [summaryText, measureSummaryOverflow])

  if (!hasContent) return null

  const expandedMetaText = isPartStreaming
    ? t('reasoning.thinking')
    : thoughtDurationLabel
      ? t('reasoning.thoughtFor', { duration: thoughtDurationLabel })
      : t('reasoning.thoughtProcess')
  const collapsedLabel = isPartStreaming ? t('reasoning.thinking') : t('reasoning.thoughtProcess')
  const summaryClassName = expanded
    ? isPartStreaming
      ? 'text-[length:var(--fs-sm)] leading-5 text-text-200'
      : 'text-[length:var(--fs-sm)] leading-5 text-text-500/80'
    : isPartStreaming
      ? 'text-[length:var(--fs-sm)] leading-5 text-text-200'
      : 'text-[length:var(--fs-sm)] leading-5 text-text-300'

  const content = (
    <>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="group/reasoning flex w-full min-w-0 items-start gap-2 m-0 border-0 bg-transparent p-0 text-left cursor-pointer text-text-400 hover:text-text-200"
      >
        <div ref={summaryContainerRef} className="relative min-w-0 flex-1 overflow-hidden">
          <div className="relative inline-block min-w-0 max-w-full align-top">
            {expanded ? (
              <span className={`block min-w-0 ${summaryClassName} ${isPartStreaming ? 'reasoning-shimmer-text' : ''}`}>
                {expandedMetaText}
              </span>
            ) : (
              <span className={`block min-w-0 ${summaryClassName} ${isPartStreaming ? 'reasoning-shimmer-text' : ''}`}>
                {collapsedLabel}
              </span>
            )}
          </div>
          <span
            ref={summaryMeasureRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 invisible whitespace-nowrap text-[length:var(--fs-sm)] leading-5`}
          >
            {summaryText}
          </span>
        </div>
        <span
          className={`inline-flex h-5 w-3 items-center justify-center shrink-0 text-text-500 group-hover/reasoning:text-text-300 transition-[transform,color] duration-200 ${expanded ? '' : '-rotate-90'}`}
        >
          <ChevronDownIcon size={12} />
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-75'
        }`}
      >
        <div className="min-h-0 min-w-0 overflow-hidden" style={{ clipPath: 'inset(0 -100% 0 -100%)' }}>
          {shouldRenderBody && (
            <div className="text-[length:var(--fs-sm)]">
              <LazyMarkdownRenderer content={displayText} variant="reasoning" isStreaming={isPartStreaming} />
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    // 流式「正在思考」行处于消息流最底端，视口底边深探 72px 时它会陷进输入框玻璃
    // 后面；mb-14 把它拉回玻璃上方（24px spacer + 32px 模糊前过渡 + 余量），完成
    // 后移除避免留空
    <div className={`py-1 ${isPartStreaming ? 'mb-14' : ''}`}>
      {content}
      <span className="sr-only" role="status" aria-live="polite">
        {summaryText}
      </span>
    </div>
  )
})
