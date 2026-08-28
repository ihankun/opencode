import { memo, useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { diffLines } from 'diff'
import { animate } from 'motion/mini'
import { ChevronDownIcon, ChevronRightIcon, SplitIcon, SpinnerIcon, UndoIcon } from '../../components/Icons'
import { CopyButton, SmoothHeight } from '../../components/ui'
import { LazyMarkdownRenderer } from '../../components/LazyMarkdownRenderer'
import { useDelayedRender } from '../../hooks'
import { useTheme } from '../../hooks/useTheme'
import {
  TextPartView,
  ReasoningPartView,
  ToolPartView,
  FilePartView,
  AgentPartView,
  SyntheticTextPartView,
  StepFinishPartView,
  SubtaskPartView,
  RetryPartView,
  CompactionPartView,
  MessageErrorView,
} from './parts'
import { extractToolData } from './tools'
import type {
  Message,
  Part,
  TextPart,
  ReasoningPart,
  ToolPart,
  FilePart,
  AgentPart,
  StepFinishPart,
  CompactionPart,
  AssistantMessageInfo,
} from '../../types/message'
import { isToolPart, isVisibleReasoningPart, isVisibleTextPart } from '../../types/message'
import { formatDuration, formatCompletedAt, formatDetailedDateTime } from '../../utils/formatUtils'
import { useUiDisclosureState } from '../../utils/uiDisclosureState'

interface MessageRendererProps {
  message: Message
  allowStreamingLayoutAnimation?: boolean
  /** 回合总时长（毫秒），仅在回合最后一条 assistant 消息上有值 */
  turnDuration?: number
  onUndo?: (userMessageId: string) => void
  onFork?: (message: Message, forkMessageId?: string) => Promise<void> | void
  forkMessageId?: string
  canUndo?: boolean
  onEnsureParts?: (messageId: string) => void
  showActions?: boolean
  showError?: boolean
  /** 强制工具步骤使用描述型紧凑标题（"已处理"执行过程展开区使用） */
  descriptiveTools?: boolean
}

export const MessageRenderer = memo(function MessageRenderer({
  message,
  allowStreamingLayoutAnimation = true,
  turnDuration,
  onUndo,
  onFork,
  forkMessageId,
  canUndo,
  onEnsureParts,
  showActions = true,
  showError = true,
  descriptiveTools = false,
}: MessageRendererProps) {
  const { info } = message
  const isUser = info.role === 'user'

  if (isUser) {
    return (
      <article className="message-render-boundary" aria-label="User message">
        <UserMessageView
          message={message}
          onUndo={onUndo}
          onFork={onFork}
          forkMessageId={forkMessageId}
          canUndo={canUndo}
        />
      </article>
    )
  }

  return (
    <article className="message-render-boundary" aria-label="Assistant message">
      <AssistantMessageView
        message={message}
        allowStreamingLayoutAnimation={allowStreamingLayoutAnimation}
        turnDuration={turnDuration}
        onFork={onFork}
        forkMessageId={forkMessageId}
        onEnsureParts={onEnsureParts}
        showActions={showActions}
        showError={showError}
        descriptiveTools={descriptiveTools}
      />
    </article>
  )
})

// ============================================
// 入场生长动画 hook — 新消息作为对话流的延续，从 height 0 平滑展开
// ============================================

function useEntryGrowAnimation(created: number) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || Date.now() - created > 3000) return
    const targetHeight = el.scrollHeight
    el.style.height = '0px'
    el.style.clipPath = 'inset(0 -100% 0 -100%)'
    animate(el, { height: `${targetHeight}px` }, { duration: 0.2, ease: 'easeOut' }).then(() => {
      el.style.height = ''
      el.style.clipPath = ''
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return ref
}

// ============================================
// Collapsible User Text
// ============================================

/** 默认预览 8 行 */
const COLLAPSE_PREVIEW_LINES = 8

/**
 * 超长用户文本内容级截断阈值：折叠态只渲染前 N 字符，
 * 避免挂载时全量 markdown 解析 + 渲染海量 DOM 卡死主线程。
 */
const USER_TEXT_TRUNCATE_THRESHOLD = 30000
const USER_TEXT_PREVIEW_CHARS = 4000

function truncateUserText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const boundary = text.lastIndexOf('\n', maxChars)
  if (boundary > maxChars * 0.5) return text.slice(0, boundary)
  return text.slice(0, maxChars)
}

// 折叠状态缓存：消息是否溢出
const overflowStateCache = new Map<string, boolean>()

const CollapsibleUserText = memo(function CollapsibleUserText({
  text,
  collapseEnabled,
  renderMarkdown,
  messageId,
}: {
  text: string
  collapseEnabled: boolean
  renderMarkdown: boolean
  messageId: string
}) {
  const { t } = useTranslation('message')
  const contentRef = useRef<HTMLDivElement>(null)
  const overflowCacheKey = `${messageId}:${renderMarkdown ? 'markdown' : 'plain'}`
  const [expanded, setExpanded] = useUiDisclosureState(`message:${messageId}:user-text`, false)
  const [isOverflow, setIsOverflow] = useState(() => overflowStateCache.get(overflowCacheKey) ?? false)

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return

    let disposed = false
    const measure = () => {
      if (disposed) return
      const lineHeight = Number.parseFloat(window.getComputedStyle(el).lineHeight)
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return
      const collapsedHeight = lineHeight * COLLAPSE_PREVIEW_LINES
      const next = el.scrollHeight > collapsedHeight + 1
      overflowStateCache.set(overflowCacheKey, next)
      setIsOverflow(prev => (prev === next ? prev : next))
    }

    measure()
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(el)
    document.fonts?.ready?.then(measure)

    return () => {
      disposed = true
      resizeObserver.disconnect()
    }
  }, [text, overflowCacheKey])

  const showCollapse = collapseEnabled && isOverflow
  const isCollapsed = collapseEnabled && !expanded
  // 超长文本折叠态只渲染截断预览，展开后才全量渲染，避免挂载时卡死主线程；
  // 独立于 collapseEnabled，即使主题关闭了折叠也强制截断，防止超长文本白屏
  const isTruncated = !expanded && text.length > USER_TEXT_TRUNCATE_THRESHOLD
  const renderText = isTruncated ? truncateUserText(text, USER_TEXT_PREVIEW_CHARS) : text

  return (
    <div className="px-4 py-2.5 bg-bg-300 rounded-2xl max-w-full">
      <div className="relative">
        <div
          ref={contentRef}
          className={`m-0 break-words text-[length:var(--fs-base)] text-text-100 leading-relaxed${
            renderMarkdown ? '' : ' whitespace-pre-wrap'
          }${
            isCollapsed ? ' overflow-hidden' : ''
          }`}
          style={isCollapsed ? { maxHeight: `${COLLAPSE_PREVIEW_LINES}lh` } : undefined}
        >
          {renderMarkdown ? <LazyMarkdownRenderer content={renderText} /> : renderText}
        </div>
        {/* 底部渐变遮罩 */}
        {showCollapse && isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-bg-300 to-transparent pointer-events-none" />
        )}
      </div>
      {(showCollapse || isTruncated) && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="mt-1 text-[length:var(--fs-sm)] text-text-400 hover:text-text-200 transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? t('showLess') : t('showMore')}
        </button>
      )}
    </div>
  )
})

interface ForkActionButtonProps {
  message: Message
  onFork?: (message: Message, forkMessageId?: string) => Promise<void> | void
  forkMessageId?: string
}

const ForkActionButton = memo(function ForkActionButton({ message, onFork, forkMessageId }: ForkActionButtonProps) {
  const { t } = useTranslation('message')
  const [isForking, setIsForking] = useState(false)

  const handleFork = useCallback(async () => {
    if (!onFork || isForking) return

    setIsForking(true)

    try {
      await onFork(message, forkMessageId)
    } catch {
      // 业务错误由上层统一处理
    } finally {
      setIsForking(false)
    }
  }, [forkMessageId, isForking, message, onFork])

  if (!onFork) return null

  return (
    <button
      onClick={() => void handleFork()}
      disabled={isForking}
      className="p-1.5 rounded-md transition-colors duration-150 text-text-400 hover:text-text-200 disabled:cursor-default disabled:text-text-500"
      title={isForking ? t('forkingFromHere') : t('forkFromHere')}
      aria-label={isForking ? t('forkingFromHere') : t('forkFromHere')}
    >
      {isForking ? <SpinnerIcon className="animate-spin" /> : <SplitIcon />}
    </button>
  )
})

// ============================================
// User Message View
// ============================================

interface UserMessageViewProps {
  message: Message
  onUndo?: (userMessageId: string) => void
  onFork?: (message: Message, forkMessageId?: string) => Promise<void> | void
  forkMessageId?: string
  canUndo?: boolean
}

const UserMessageView = memo(function UserMessageView({
  message,
  onUndo,
  onFork,
  forkMessageId,
  canUndo,
}: UserMessageViewProps) {
  const { t } = useTranslation('message')
  const { parts, info } = message
  const [showSystemContext, setShowSystemContext] = useUiDisclosureState(
    `message:${info.id}:user-system-context`,
    false,
  )
  const shouldRenderSystemContext = useDelayedRender(showSystemContext)

  const wrapperRef = useEntryGrowAnimation(info.time.created)

  // 分离不同类型的 parts
  const textParts = parts.filter((p): p is TextPart => p.type === 'text' && !p.synthetic)
  const syntheticParts = parts.filter((p): p is TextPart => p.type === 'text' && !!p.synthetic)
  const fileParts = parts.filter((p): p is FilePart => p.type === 'file')
  const agentParts = parts.filter((p): p is AgentPart => p.type === 'agent')
  const compactionParts = parts.filter((p): p is CompactionPart => p.type === 'compaction')

  const hasSystemContext = syntheticParts.length > 0
  const messageText = textParts.map(p => p.text).join('')

  return (
    <div ref={wrapperRef} className="flex flex-col items-end group">
      <div className="flex flex-col gap-1 items-end w-full">
        {/* 用户附件 */}
        {(fileParts.length > 0 || agentParts.length > 0) && (
          <div className="mb-1 flex max-w-full min-w-0 flex-wrap gap-2 justify-end">
            {fileParts.map(part => (
              <FilePartView key={part.id} part={part} />
            ))}
            {agentParts.map(part => (
              <AgentPartView key={part.id} part={part} />
            ))}
          </div>
        )}

        {/* 消息文本 */}
        {messageText && (
          <CollapsibleUserText
            text={messageText}
            collapseEnabled
            renderMarkdown={false}
            messageId={info.id}
          />
        )}

        {/* 系统上下文 */}
        {hasSystemContext && (
          <div className="flex flex-col items-end mt-1 w-full">
            <button
              onClick={() => setShowSystemContext(!showSystemContext)}
              className="flex items-center gap-1 text-[length:var(--fs-sm)] text-text-400 hover:text-text-300 transition-colors py-1 px-2 rounded hover:bg-bg-200"
            >
              <span>
                {showSystemContext ? t('hideSystemContext') : t('showSystemContext', { count: syntheticParts.length })}
              </span>
              <span className={`transition-transform duration-300 ${showSystemContext ? '' : '-rotate-90'}`}>
                <ChevronDownIcon size={10} />
              </span>
            </button>

            <div
              className={`grid w-full transition-[grid-template-rows,opacity] duration-300 ease-out ${
                showSystemContext ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                {shouldRenderSystemContext && (
                  <div className="pt-2 flex max-w-full min-w-0 flex-wrap gap-2 justify-end">
                    {syntheticParts.map(part => (
                      <SyntheticTextPartView key={part.id} part={part} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {compactionParts.length > 0 && (
          <div className="w-full mt-1">
            {compactionParts.map(part => (
              <CompactionPartView key={part.id} part={part} />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 [@media(any-pointer:coarse)]:opacity-100 transition-opacity">
          {/* Undo button */}
          {canUndo && onUndo && (
            <button
              onClick={() => onUndo(info.id)}
              className="p-1.5 rounded-md transition-colors duration-150 text-text-400 hover:text-text-200"
              title={t('undoFromHere')}
            >
              <UndoIcon />
            </button>
          )}
          <ForkActionButton message={message} onFork={onFork} forkMessageId={forkMessageId} />
          {/* Copy button */}
          {messageText && <CopyButton text={messageText} position="static" />}
        </div>
      </div>
    </div>
  )
})

// ============================================
// Assistant Message View
// ============================================

const AssistantMessageView = memo(function AssistantMessageView({
  message,
  allowStreamingLayoutAnimation = true,
  turnDuration,
  onFork,
  forkMessageId,
  onEnsureParts,
  showActions = true,
  showError = true,
  descriptiveTools = false,
}: {
  message: Message
  allowStreamingLayoutAnimation?: boolean
  turnDuration?: number
  onFork?: (message: Message, forkMessageId?: string) => Promise<void> | void
  forkMessageId?: string
  onEnsureParts?: (messageId: string) => void
  showActions?: boolean
  showError?: boolean
  descriptiveTools?: boolean
}) {
  const { t } = useTranslation('message')
  const { parts, isStreaming, info } = message
  const { stepFinishDisplay } = useTheme()

  const wrapperRef = useEntryGrowAnimation(info.time.created)

  useEffect(() => {
    if (parts.length === 0 && onEnsureParts) {
      onEnsureParts(message.info.id)
    }
  }, [parts.length, onEnsureParts, message.info.id])

  // 收集连续的 tool parts 合并渲染
  const renderItems = useMemo(() => groupPartsForRender(parts), [parts])

  // 判断哪些 reasoning part 已经结束（后面出现了任何非基础设施 part）
  // 直接检查源 parts 数组，而非 renderItems，因为 renderItems 会过滤掉空 text，
  // 但空 text part 的存在本身就说明模型已经进入了下一输出阶段
  const endedReasoningIds = useMemo(() => {
    const ended = new Set<string>()
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].type !== 'reasoning') continue
      for (let j = i + 1; j < parts.length; j++) {
        const t = parts[j].type
        // snapshot/patch 是纯内部状态，不代表内容流转
        if (t === 'snapshot' || t === 'patch') continue
        // 任何其他 part 类型（包括空 text、step-start、tool 等）都说明思考已结束
        ended.add(parts[i].id)
        break
      }
    }
    return ended
  }, [parts])

  // 计算完整文本用于复制
  const fullText = parts
    .filter((p): p is TextPart => p.type === 'text' && !p.synthetic)
    .map(p => p.text)
    .join('')
  const hasCopyableText = fullText.trim().length > 0

  // 检查消息级别错误
  const messageError = (info as AssistantMessageInfo).error

  // 消息总耗时
  const { created, completed } = info.time
  const duration = completed != null ? completed - created : undefined

  // agent / model（仅 assistant 消息）
  const assistantInfo = info.role === 'assistant' ? (info as AssistantMessageInfo) : null
  const agent = assistantInfo?.agent || undefined
  const modelLabel = assistantInfo?.modelID || undefined

  const hasStepFinishPart = parts.some(part => part.type === 'step-finish')
  const showTurnDurationFooter =
    !isStreaming && !hasStepFinishPart && stepFinishDisplay.turnDuration && turnDuration != null && turnDuration > 0
  const showCompletedAtFooter = !isStreaming && !hasStepFinishPart && stepFinishDisplay.completedAt && completed != null

  if (!isStreaming && parts.length === 0) {
    // 有错误时直接显示错误信息
    if (messageError && showError) {
      return (
        <div className="flex flex-col gap-2 w-full">
          <MessageErrorView error={messageError} stateKey={`message:${message.info.id}:error`} />
        </div>
      )
    }
    // parts 尚未 hydrate — 保留最小占位减少 CLS，不显示骨架/loading 文字
    // onEnsureParts 已在上方 useEffect 中触发 hydrate，parts 到位后自动 re-render
    return <div className="w-full min-h-[40px]" />
  }

  return (
    <div ref={wrapperRef} className="flex flex-col gap-2 w-full group">
      {/* 只在贴底跟随时保留高度补间；用户看历史时关闭，避免消息生长把视口顶走 */}
      <SmoothHeight isActive={!!isStreaming && allowStreamingLayoutAnimation}>
        <div className="flex flex-col gap-2">
          {renderItems.map((item: RenderItem, idx: number) => {
            // 耗时只在最后一个含 stepFinish 的 item 上显示
            const isLastStepFinish =
              idx ===
              renderItems.findLastIndex(it =>
                it.type === 'tool-group' || it.type === 'auto-fold'
                  ? !!it.stepFinish
                  : it.part.type === 'step-finish',
              )

            if (item.type === 'tool-group') {
              return (
                <ToolGroup
                  key={item.parts[0].id}
                  parts={item.parts}
                  stepFinish={item.stepFinish}
                  duration={isLastStepFinish ? duration : undefined}
                  turnDuration={isLastStepFinish ? turnDuration : undefined}
                  isStreaming={isStreaming}
                  agent={agent}
                  modelLabel={modelLabel}
                  completedAt={isLastStepFinish ? completed : undefined}
                  descriptiveTools={descriptiveTools}
                />
              )
            }

              if (item.type === 'auto-fold') {
                return (
                  <AutoFoldGroup
                    key={item.segments[0]?.parts[0]?.id || 'auto-fold'}
                    segments={item.segments}
                    stepFinish={item.stepFinish}
                  duration={isLastStepFinish ? duration : undefined}
                  turnDuration={isLastStepFinish ? turnDuration : undefined}
                  isStreaming={isStreaming}
                  agent={agent}
                  modelLabel={modelLabel}
                  completedAt={isLastStepFinish ? completed : undefined}
                  endedReasoningIds={endedReasoningIds}
                />
              )
            }

            const part = item.part
            switch (part.type) {
              case 'text':
                return <TextPartView key={part.id} part={part} isStreaming={isStreaming} />
              case 'reasoning': {
                const reasoningDone = endedReasoningIds.has(part.id)
                return <ReasoningPartView key={part.id} part={part} isStreaming={isStreaming && !reasoningDone} />
              }
              case 'step-finish':
                return (
                  <StepFinishPartView
                    key={part.id}
                    part={part}
                    duration={isLastStepFinish ? duration : undefined}
                    turnDuration={isLastStepFinish ? turnDuration : undefined}
                    agent={agent}
                    modelLabel={modelLabel}
                    completedAt={isLastStepFinish ? completed : undefined}
                  />
                )
              case 'subtask':
                return <SubtaskPartView key={part.id} part={part} />
              case 'retry':
                return <RetryPartView key={part.id} part={part} />
              case 'compaction':
                return <CompactionPartView key={part.id} part={part} />
              default:
                return null
            }
          })}
        </div>
      </SmoothHeight>

      {/* Message-level error */}
      {showError && messageError && <MessageErrorView error={messageError} stateKey={`message:${info.id}:error`} />}

      {(showTurnDurationFooter || showCompletedAtFooter) && (
        <div className="flex items-center gap-3 py-0.5 text-[length:var(--fs-xxs)] text-text-500">
          {showTurnDurationFooter && (
            <span>{t('stepFinish.totalDuration', { duration: formatDuration(turnDuration!) })}</span>
          )}
          {showCompletedAtFooter && (
            <span title={formatDetailedDateTime(completed!)}>{formatCompletedAt(completed!)}</span>
          )}
        </div>
      )}

      {showActions && hasCopyableText && (
        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 [@media(any-pointer:coarse)]:opacity-100 transition-opacity">
          <ForkActionButton message={message} onFork={onFork} forkMessageId={forkMessageId} />
          <CopyButton text={fullText} position="static" />
        </div>
      )}
    </div>
  )
})

// ============================================
// Tool Group (连续的 tool parts)
// ============================================

interface ToolGroupProps {
  parts: ToolPart[]
  stepFinish?: StepFinishPart
  duration?: number
  turnDuration?: number
  isStreaming?: boolean
  agent?: string
  modelLabel?: string
  completedAt?: number
  /** 强制描述型紧凑标题模式，覆盖主题设置 */
  descriptiveTools?: boolean
}

/** 用户需要阅读/交互的工具：沉浸模式下这些工具完成后保持展开 */
const READABLE_TOOL_PATTERNS = /bash|\bsh\b|cmd|terminal|shell|write|save|edit|replace|patch|todo|question|ask/i

function isReadableTool(toolName: string): boolean {
  return READABLE_TOOL_PATTERNS.test(toolName.toLowerCase())
}

const ToolGroup = memo(function ToolGroup({
  parts,
  stepFinish,
  duration,
  turnDuration,
  isStreaming,
  agent,
  modelLabel,
  completedAt,
  descriptiveTools = false,
}: ToolGroupProps) {
  const { t } = useTranslation('message')
  const { immersiveMode } = useTheme()
  // 描述型步骤已强制开启（原 descriptiveToolSteps 配置已移除）
  const descriptive = true

  const doneCount = parts.filter(p => p.state.status === 'completed').length
  const totalCount = parts.length
  const isAllDone = doneCount === totalCount
  const hasActiveTools = parts.some(isToolPartActive)
  const stepsSummary = descriptive ? buildDescriptiveToolStepsSummary(parts, t) : undefined

  // 汇总所有成功完成的工具的 diff stats（失败的不算）
  const totalDiffStats = useMemo(() => {
    if (!descriptive) return undefined
    let additions = 0,
      deletions = 0
    for (const part of parts) {
      if (part.state.status === 'error') continue
      const data = extractToolData(part)
      const stats = data.diffStats || computePartDiffStats(data)
      if (stats) {
        additions += stats.additions
        deletions += stats.deletions
      }
    }
    return additions || deletions ? { additions, deletions } : undefined
  }, [descriptive, parts])

  // 沉浸模式下：判断工具组是否包含需要用户阅读的工具
  const hasReadableTools = immersiveMode && parts.some(p => isReadableTool(p.tool))
  const shouldStartExpanded =
    !descriptive ||
    hasActiveTools ||
    (immersiveMode && !!isStreaming && hasReadableTools)

  // descriptive 模式默认收起，运行时展开，完成后保持展开
  // 沉浸模式下：没有可读工具则完成后自动收起
  const groupStateKey = `message:${parts[0]?.messageID || 'unknown'}:tool-group:${parts[0]?.id || 'empty'}`
  const [expanded, setExpanded] = useUiDisclosureState(groupStateKey, shouldStartExpanded)
  const hasAutoExpandedReadableRef = useRef(shouldStartExpanded && immersiveMode && hasReadableTools)

  useEffect(() => {
    if (!descriptive) return
    // 沉浸模式下没有可读工具：始终收起，不展开
    if (immersiveMode && !hasReadableTools) {
      setExpanded(false, { touched: false, respectUser: true })
      return
    }
    // "已处理"执行区：工具始终折叠为摘要行，运行中也不展开（避免先显示再隐藏）
    if (descriptiveTools) {
      setExpanded(false, { touched: false, respectUser: true })
      return
    }
    if (hasActiveTools) {
      if (immersiveMode && hasReadableTools) {
        hasAutoExpandedReadableRef.current = true
      }
      setExpanded(true, { touched: false, respectUser: true })
      return
    }
    // 某些可读工具（如 todo）可能首帧已完成，错过 running 态；流仍在继续时也自动展开一次
    if (immersiveMode && isStreaming && hasReadableTools && !hasAutoExpandedReadableRef.current) {
      hasAutoExpandedReadableRef.current = true
      setExpanded(true, { touched: false, respectUser: true })
    }
  }, [
    descriptive,
    descriptiveTools,
    hasActiveTools,
    immersiveMode,
    hasReadableTools,
    isStreaming,
    setExpanded,
  ])

  const effectiveExpanded = expanded
  const shouldRenderBody = useDelayedRender(effectiveExpanded)

  // compact: 单工具时用紧凑布局（图标内联，无 timeline 连接线）
  // 不区分 streaming 状态 — 单工具始终 compact，第二个工具到来时再自然过渡到 timeline
  const isSingleCompact = totalCount === 1 && !descriptive
  // steps header: 多工具始终显示；描述型 steps 模式下，单工具也显示
  const showStepsHeader = totalCount > 1 || descriptive

  // 统一容器结构 — ToolPartView 始终在同一 React 树位置，
  // streaming→idle / 1→N 工具切换时不 remount，expanded 状态不丢失
  return (
    <SmoothHeight isActive={!!isStreaming}>
      <div className="flex flex-col">
        {showStepsHeader &&
          (descriptive ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-baseline rounded-md py-1 text-left hover:bg-bg-200/30 transition-colors"
            >
              <span className="text-[length:var(--fs-sm)] leading-5">
                {stepsSummary?.map((seg, i) => (
                  <span
                    key={i}
                    className={
                      seg.type === 'error'
                        ? 'text-danger-100'
                        : seg.type === 'active'
                          ? 'reasoning-shimmer-text'
                          : 'text-text-300'
                    }
                  >
                    {seg.text}
                  </span>
                ))}
              </span>
              {totalDiffStats && !hasActiveTools && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-[length:var(--fs-xxs)] font-mono font-medium tabular-nums">
                  {totalDiffStats.additions > 0 && (
                    <span className="text-success-100">+{totalDiffStats.additions}</span>
                  )}
                  {totalDiffStats.deletions > 0 && <span className="text-danger-100">-{totalDiffStats.deletions}</span>}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 py-1.5 text-text-400 text-[length:var(--fs-base)] hover:text-text-200 hover:bg-bg-200/30 rounded-md transition-colors"
            >
              <span className="inline-flex w-[14px] items-center justify-center shrink-0">
                {effectiveExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
              </span>
              <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
                <span className="text-[length:var(--fs-md)] font-medium leading-tight">
                  {isAllDone
                    ? t('stepsCount', { done: totalCount, total: totalCount })
                    : t('stepsCount', { done: doneCount, total: totalCount })}
                </span>
                {!effectiveExpanded && stepFinish && (
                  <span className="text-[length:var(--fs-sm)] text-text-500 font-mono opacity-70">
                    {formatTokens(stepFinish.tokens, t)}
                  </span>
                )}
              </span>
            </button>
          ))}

        <div
          className={
            showStepsHeader
              ? `grid transition-[grid-template-rows] duration-300 ease-in-out ${effectiveExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`
              : ''
          }
        >
          <div
            className={showStepsHeader ? 'flex flex-col min-h-0 min-w-0 overflow-hidden' : 'flex flex-col'}
            style={showStepsHeader ? { clipPath: 'inset(0 -100% 0 -100%)' } : undefined}
          >
            {(!showStepsHeader || shouldRenderBody) &&
              parts.map((part, idx) => (
                <ToolPartView
                  key={part.id}
                  part={part}
                  isFirst={idx === 0}
                  isLast={idx === parts.length - 1}
                  compact={isSingleCompact}
                  descriptive={descriptive}
                  isStreaming={isStreaming}
                />
              ))}
          </div>
        </div>

        {stepFinish && (
          <div className="mt-2">
            <StepFinishPartView
              part={stepFinish}
              duration={duration}
              turnDuration={turnDuration}
              agent={agent}
              modelLabel={modelLabel}
              completedAt={completedAt}
            />
          </div>
        )}
      </div>
    </SmoothHeight>
  )
})

// ============================================
// Auto-Fold Group (连续无正文的思考 + 工具)
// ============================================

interface AutoFoldGroupProps {
  segments: AutoFoldSegment[]
  stepFinish?: StepFinishPart
  duration?: number
  turnDuration?: number
  isStreaming?: boolean
  agent?: string
  modelLabel?: string
  completedAt?: number
  /** 已结束的 reasoning id 集合，用于关闭 shimmer */
  endedReasoningIds: Set<string>
}

/** 始终折叠的"过程段"：标题显示摘要，展开后按原始顺序渲染思考与工具 */
const AutoFoldGroup = memo(function AutoFoldGroup({
  segments,
  stepFinish,
  duration,
  turnDuration,
  isStreaming,
  agent,
  modelLabel,
  completedAt,
  endedReasoningIds,
}: AutoFoldGroupProps) {
  const { t } = useTranslation('message')
  const first = segments[0]?.parts[0]
  const groupStateKey = `message:${first?.messageID || 'unknown'}:auto-fold:${first?.id || 'empty'}`
  const [expanded, setExpanded] = useUiDisclosureState(groupStateKey, false)
  const shouldRenderBody = useDelayedRender(expanded)
  const reasons = segments.flatMap(s => (s.type === 'reasoning' ? s.parts : []))
  const tools = segments.flatMap(s => (s.type === 'tool' ? s.parts : []))
  const label = buildAutoFoldSummary(reasons, tools, t)
  const lastToolIndex = segments.findLastIndex(s => s.type === 'tool')

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-center gap-1.5 py-1.5 text-left text-text-400 hover:text-text-200 hover:bg-bg-200/30 rounded-md transition-colors"
      >
        <span className="inline-flex w-[14px] items-center justify-center shrink-0">
          {expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[length:var(--fs-sm)] leading-5 text-text-300">{label}</span>
        {!expanded && stepFinish && (
          <span className="text-[length:var(--fs-sm)] text-text-500 font-mono opacity-70 shrink-0">
            {formatTokens(stepFinish.tokens, t)}
          </span>
        )}
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ clipPath: 'inset(0 -100% 0 -100%)' }}>
          {shouldRenderBody && (
            <>
              {segments.map((seg, i) =>
                seg.type === 'reasoning'
                  ? seg.parts.map(r => (
                      <ReasoningPartView
                        key={r.id}
                        part={r}
                        isStreaming={isStreaming && !endedReasoningIds.has(r.id)}
                      />
                    ))
                  : (
                      <ToolGroup
                        key={seg.parts[0].id}
                        parts={seg.parts}
                        stepFinish={i === lastToolIndex ? stepFinish : undefined}
                        duration={duration}
                        turnDuration={turnDuration}
                        isStreaming={isStreaming}
                        agent={agent}
                        modelLabel={modelLabel}
                        completedAt={completedAt}
                        descriptiveTools
                      />
                    ),
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
})

// ============================================
// Helpers
// ============================================

function formatTokens(
  tokens: StepFinishPart['tokens'],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const total = tokens.input + tokens.output + tokens.reasoning + tokens.cache.read + tokens.cache.write
  if (total >= 1000) {
    return t('tokensK', { count: (total / 1000).toFixed(1) })
  }
  return `${total} ${t('tokens')}`
}

type ToolSummaryCategory =
  | 'execute'
  | 'write'
  | 'edit'
  | 'read'
  | 'search'
  | 'list'
  | 'network'
  | 'task'
  | 'todo'
  | 'question'
  | 'skill'
  | 'think'
  | 'other'

type ToolSummaryPhase = 'done' | 'active' | 'failed'

interface SummarySegment {
  text: string
  type: 'normal' | 'error' | 'active'
}

function buildDescriptiveToolStepsSummary(
  parts: ToolPart[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): SummarySegment[] {
  const sep = t('toolSteps.separator')
  const segments: SummarySegment[] = []
  const MAX_CATEGORIES = 3

  // ── 按类别汇总 done / failed / active ──
  const categoryOrder: ToolSummaryCategory[] = []
  const doneMap = new Map<ToolSummaryCategory, number>()
  const failedMap = new Map<ToolSummaryCategory, number>()
  const activeMap = new Map<ToolSummaryCategory, number>()

  for (const part of parts) {
    const cat = getToolSummaryCategory(part.tool)
    if (!doneMap.has(cat)) {
      categoryOrder.push(cat)
      doneMap.set(cat, 0)
      failedMap.set(cat, 0)
      activeMap.set(cat, 0)
    }
    if (part.state.status === 'completed') doneMap.set(cat, (doneMap.get(cat) || 0) + 1)
    else if (part.state.status === 'error') failedMap.set(cat, (failedMap.get(cat) || 0) + 1)
    else if (isToolPartActive(part)) activeMap.set(cat, (activeMap.get(cat) || 0) + 1)
  }

  // ── 已完成 + 失败（合并同类别）──
  // 先收集所有完成态类别（含纯失败的类别）
  const finishedCategories = categoryOrder.filter(cat => (doneMap.get(cat) || 0) > 0 || (failedMap.get(cat) || 0) > 0)

  const pushFinishedSegments = (cats: ToolSummaryCategory[]) => {
    for (const cat of cats) {
      const done = doneMap.get(cat) || 0
      const failed = failedMap.get(cat) || 0
      if (segments.length > 0) segments.push({ text: sep, type: 'normal' })

      if (done > 0 && failed > 0) {
        // 同类别既有成功又有失败：合并成一句
        const total = done + failed
        segments.push({ text: formatToolSummarySegment(cat, total, 'done', t), type: 'normal' })
        segments.push({ text: t('toolSteps.failedSuffix', { count: failed }), type: 'error' })
      } else if (done > 0) {
        segments.push({ text: formatToolSummarySegment(cat, done, 'done', t), type: 'normal' })
      } else {
        // 纯失败
        if (failed === 1) {
          segments.push({ text: formatToolSummarySegment(cat, failed, 'failed', t), type: 'error' })
        } else {
          segments.push({ text: formatToolSummarySegment(cat, failed, 'done', t), type: 'error' })
          segments.push({ text: t('toolSteps.failedAllSuffix'), type: 'error' })
        }
      }
    }
  }

  if (finishedCategories.length <= MAX_CATEGORIES) {
    pushFinishedSegments(finishedCategories)
  } else {
    pushFinishedSegments(finishedCategories.slice(0, MAX_CATEGORIES))
    const restCount = finishedCategories
      .slice(MAX_CATEGORIES)
      .reduce((sum, cat) => sum + (doneMap.get(cat) || 0) + (failedMap.get(cat) || 0), 0)
    segments.push({ text: sep, type: 'normal' })
    segments.push({ text: t('toolSteps.moreActions', { count: restCount }), type: 'normal' })
  }

  // ── 运行中 ──
  const activeCategories = categoryOrder.filter(cat => (activeMap.get(cat) || 0) > 0)
  for (const cat of activeCategories) {
    if (segments.length > 0) segments.push({ text: sep, type: 'normal' })
    segments.push({ text: formatToolSummarySegment(cat, activeMap.get(cat) || 0, 'active', t), type: 'active' })
  }

  if (segments.length === 0) {
    return [{ text: t('stepsCount', { done: 0, total: parts.length }), type: 'normal' }]
  }

  let isFirstContent = true
  for (const seg of segments) {
    if (seg.text === sep) continue
    if (isFirstContent) {
      isFirstContent = false
      continue
    }
    seg.text = seg.text.charAt(0).toLowerCase() + seg.text.slice(1)
  }

  return segments
}

/** 自动折叠块标题：思考次数 + 工具分类摘要（复用 toolSteps 文案） */
function buildAutoFoldSummary(
  reasons: ReasoningPart[],
  tools: ToolPart[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const sep = t('toolSteps.separator')
  const segments: string[] = []
  if (reasons.length > 0) {
    segments.push(t('toolSteps.thinkDone', { count: reasons.length }))
  }
  const toolText = buildDescriptiveToolStepsSummary(tools, t)
    .map(s => s.text)
    .join('')
  if (toolText) segments.push(toolText)
  return segments.join(sep)
}

function formatToolSummarySegment(
  category: ToolSummaryCategory,
  count: number,
  phase: ToolSummaryPhase,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const key = `toolSteps.${category}${phase.charAt(0).toUpperCase()}${phase.slice(1)}`
  return t(key, { count })
}

function getToolSummaryCategory(toolName: string): ToolSummaryCategory {
  const lower = toolName.toLowerCase()

  if (lower.includes('todo')) return 'todo'
  if (lower === 'task') return 'task'
  if (lower.includes('question') || lower.includes('ask')) return 'question'
  if (lower.includes('skill')) return 'skill'
  if (
    lower.includes('bash') ||
    lower === 'sh' ||
    lower.includes('cmd') ||
    lower.includes('terminal') ||
    lower.includes('shell')
  ) {
    return 'execute'
  }
  if (lower.includes('write') || lower.includes('save')) {
    return 'write'
  }
  if (lower.includes('edit') || lower.includes('replace') || lower.includes('patch')) {
    return 'edit'
  }
  if (
    lower.includes('web') ||
    lower.includes('fetch') ||
    lower.includes('http') ||
    lower.includes('browse') ||
    lower.includes('network') ||
    lower.includes('exa')
  ) {
    return 'network'
  }
  if (lower.includes('read') || lower.includes('cat')) return 'read'
  if (lower.includes('grep') || lower.includes('search')) return 'search'
  if (lower.includes('glob') || lower.includes('find')) return 'list'
  if (lower.includes('think') || lower.includes('reason') || lower.includes('plan')) return 'think'
  return 'other'
}

function isToolPartActive(part: ToolPart): boolean {
  return part.state.status === 'running' || part.state.status === 'pending'
}

/** 从 extractToolData 的结果计算 diff stats（当 metadata 没给 diffStats 时） */
function computePartDiffStats(data: {
  diff?: { before: string; after: string } | string
  files?: Array<{ before?: string; after?: string; additions?: number; deletions?: number }>
}): { additions: number; deletions: number } | undefined {
  if (data.files?.length) {
    let a = 0,
      d = 0
    for (const f of data.files) {
      if (f.additions !== undefined) a += f.additions
      if (f.deletions !== undefined) d += f.deletions
      if (f.additions === undefined && f.before !== undefined && f.after !== undefined) {
        const s = diffPairStats(f.before, f.after)
        a += s.additions
        d += s.deletions
      }
    }
    return a || d ? { additions: a, deletions: d } : undefined
  }
  if (data.diff && typeof data.diff === 'object') {
    const s = diffPairStats(data.diff.before, data.diff.after)
    return s.additions || s.deletions ? s : undefined
  }
  return undefined
}

function diffPairStats(before: string, after: string): { additions: number; deletions: number } {
  const changes = diffLines(before, after)
  let additions = 0,
    deletions = 0
  for (const c of changes) {
    if (c.added) additions += c.count || 0
    if (c.removed) deletions += c.count || 0
  }
  return { additions, deletions }
}

// ============================================
// Helper: Group parts for rendering
// ============================================

type AutoFoldSegment =
  | { type: 'reasoning'; parts: ReasoningPart[] }
  | { type: 'tool'; parts: ToolPart[] }

type RenderItem =
  | { type: 'single'; part: Part }
  | { type: 'tool-group'; parts: ToolPart[]; stepFinish?: StepFinishPart }
  | {
      type: 'auto-fold'
      segments: AutoFoldSegment[]
      stepFinish?: StepFinishPart
    }

/** parts[from..] 跳过基础设施、空内容、reasoning 和 text 后，是否还会出现 tool */
function hasMoreToolsAhead(parts: Part[], from: number): boolean {
  for (let k = from; k < parts.length; k++) {
    const part = parts[k]
    if (part.type === 'step-start' || part.type === 'step-finish' || part.type === 'snapshot' || part.type === 'patch')
      continue
    if (part.type === 'text' && !isVisibleTextPart(part)) continue
    if (part.type === 'reasoning' || part.type === 'text') continue
    return part.type === 'tool'
  }
  return false
}

function groupPartsForRender(parts: Part[]): RenderItem[] {
  const result: RenderItem[] = []
  let segments: AutoFoldSegment[] = []
  let stepFinish: StepFinishPart | undefined

  const addPart = (part: ReasoningPart | ToolPart) => {
    const last = segments[segments.length - 1]
    if (part.type === 'reasoning') {
      if (last?.type === 'reasoning') last.parts.push(part)
      else segments.push({ type: 'reasoning', parts: [part] })
    } else {
      if (last?.type === 'tool') last.parts.push(part)
      else segments.push({ type: 'tool', parts: [part] })
    }
  }

  const flushRun = (sf?: StepFinishPart) => {
    const total = segments.reduce((n, s) => n + s.parts.length, 0)
    const toolCount = segments.reduce((n, s) => (s.type === 'tool' ? n + s.parts.length : n), 0)
    if (total === 0) return
    // 连续纯思考 + 工具的过程段聚合成自动折叠块；正文会打断，不跨正文聚合
    if (total >= 2 && toolCount >= 1) {
      result.push({ type: 'auto-fold', segments, stepFinish: sf })
    } else {
      for (const seg of segments) {
        if (seg.type === 'reasoning') {
          for (const r of seg.parts) result.push({ type: 'single', part: r })
        } else {
          result.push({ type: 'tool-group', parts: seg.parts, stepFinish: sf })
        }
      }
    }
    segments = []
    stepFinish = undefined
  }

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    // 跳过不渲染的 parts
    if (part.type === 'step-start' || part.type === 'snapshot' || part.type === 'patch') continue
    if (part.type === 'text' && !isVisibleTextPart(part)) continue
    if (part.type === 'reasoning' && !isVisibleReasoningPart(part)) continue

    if (part.type === 'reasoning') {
      addPart(part)
    } else if (part.type === 'text') {
      // 正文打断过程段：flush 当前纯思考+工具段（折叠），正文独立可见，不跨正文聚合
      flushRun(stepFinish)
      result.push({ type: 'single', part })
    } else if (isToolPart(part)) {
      addPart(part)
    } else if (part.type === 'step-finish') {
      if (segments.length > 0 && hasMoreToolsAhead(parts, i + 1)) {
        // 中间 step-finish：后面还有 tool，暂存不 flush
        stepFinish = part
      } else if (segments.length > 0) {
        // 最后一个 step-finish，结束过程段
        flushRun(part)
      } else {
        result.push({ type: 'single', part })
      }
    } else {
      flushRun(stepFinish)
      result.push({ type: 'single', part })
    }
  }

  flushRun(stepFinish)
  return result
}
