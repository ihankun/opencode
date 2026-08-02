import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LazyMarkdownRenderer } from '../../../components/LazyMarkdownRenderer'
import type { TextPart } from '../../../types/message'
import { useUiDisclosureState } from '../../../utils/uiDisclosureState'

/**
 * 超长文本阈值：超过后默认截断渲染，避免挂载时全量 markdown 解析卡死主线程。
 * 取 30000 字符作为保守阈值，覆盖绝大多数正常回复。
 */
const LONG_TEXT_THRESHOLD = 30000

/**
 * 折叠时渲染的字符数。截断到最近的双换行边界，尽量保持 markdown 结构完整。
 */
const LONG_TEXT_PREVIEW_CHARS = 6000

interface TextPartViewProps {
  part: TextPart
  isStreaming?: boolean
}

function findTruncateBoundary(text: string, maxChars: number): number {
  if (text.length <= maxChars) return text.length
  const boundary = text.lastIndexOf('\n\n', maxChars)
  if (boundary > maxChars * 0.5) return boundary
  const lineBoundary = text.lastIndexOf('\n', maxChars)
  if (lineBoundary > maxChars * 0.5) return lineBoundary
  return maxChars
}

/**
 * TextPartView - 直接渲染后端推送的文本，无缓冲延迟
 */
export const TextPartView = memo(function TextPartView({ part, isStreaming = false }: TextPartViewProps) {
  const { t } = useTranslation('message')
  const displayText = part.text || ''
  const isLongText = useMemo(() => displayText.length > LONG_TEXT_THRESHOLD, [displayText])
  const [expanded, setExpanded] = useUiDisclosureState(`message:${part.messageID}:text:${part.id}`, false)

  // 跳过空文本（除非正在 streaming）
  if (!displayText.trim() && !isStreaming) return null

  // 跳过 synthetic 文本（系统上下文，单独处理）
  if (part.synthetic) return null

  if (!isLongText || isStreaming) {
    return (
      <div>
        <LazyMarkdownRenderer content={displayText} isStreaming={isStreaming} />
      </div>
    )
  }

  const previewText = expanded
    ? displayText
    : displayText.slice(0, findTruncateBoundary(displayText, LONG_TEXT_PREVIEW_CHARS))

  return (
    <div className="w-full">
      <LazyMarkdownRenderer content={previewText} isStreaming={isStreaming} />
      <button
        type="button"
        onClick={() => setExpanded(current => !current)}
        className="mt-1 text-[length:var(--fs-sm)] text-text-400 hover:text-text-200 transition-colors"
        aria-expanded={expanded}
      >
        {expanded ? t('showLess') : t('showMore')}
      </button>
    </div>
  )
})
