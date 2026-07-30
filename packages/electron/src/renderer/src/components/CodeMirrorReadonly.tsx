import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorState, type Extension } from '@codemirror/state'
import { openSearchPanel } from '@codemirror/search'
import { EditorView } from '@codemirror/view'
import type { HighlightTokens } from '../hooks/useSyntaxHighlight'
import { createReadonlyCodeMirrorExtensions, dispatchShikiTokens } from './codeMirrorReadonlyExtensions'
import { getLineCount, getLineNumberColumnWidth } from '../utils/lineNumberUtils'

interface CodeMirrorReadonlyProps {
  code: string
  tokensRef: React.RefObject<HighlightTokens | null>
  tokensVersion: number
  wordWrap: boolean
  lineHeight: number
  maxHeight?: number
  isResizing?: boolean
  isVisible?: boolean
  showLineNumbers?: boolean
  className?: string
  extraExtensions?: Extension[]
}

export function CodeMirrorReadonly({
  code,
  tokensRef,
  tokensVersion,
  wordWrap,
  lineHeight,
  maxHeight,
  isResizing = false,
  isVisible = true,
  showLineNumbers = true,
  className = '',
  extraExtensions = [],
}: CodeMirrorReadonlyProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const constrainedHeight = maxHeight !== undefined
  const lineNumberWidth = useMemo(() => getLineNumberColumnWidth(getLineCount(code)), [code])
  // 折叠时跳过 CodeMirror 创建，用 pre 占位；展开时延迟一帧再创建
  const [deferredVisible, setDeferredVisible] = useState(isVisible)
  const pendingFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (isVisible) {
      // 展开时延迟一帧创建，避免折叠→展开的 transition 期间闪烁
      pendingFrameRef.current = requestAnimationFrame(() => {
        pendingFrameRef.current = null
        setDeferredVisible(true)
      })
      return () => {
        if (pendingFrameRef.current !== null) {
          cancelAnimationFrame(pendingFrameRef.current)
          pendingFrameRef.current = null
        }
      }
    }
    // 折叠时立即销毁 CodeMirror，切换到 pre 占位
    setDeferredVisible(false)
  }, [isVisible])

  const extensions = useMemo(
    () =>
      createReadonlyCodeMirrorExtensions({
        wordWrap,
        lineHeight,
        showLineNumbers,
        maxHeight,
        editable: !constrainedHeight,
        lineNumberWidth,
        extraExtensions,
      }),
    [wordWrap, lineHeight, showLineNumbers, maxHeight, constrainedHeight, lineNumberWidth, extraExtensions],
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host || !deferredVisible) return

    const view = new EditorView({
      parent: host,
      state: EditorState.create({ doc: code, extensions }),
    })

    viewRef.current = view
    dispatchShikiTokens(view, tokensRef.current)

    return () => {
      view.destroy()
      if (viewRef.current === view) viewRef.current = null
    }
  }, [code, extensions, tokensRef, deferredVisible])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    dispatchShikiTokens(view, tokensRef.current)
  }, [tokensRef, tokensVersion])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !isVisible) return

    let secondFrameId: number | null = null
    const firstFrameId = requestAnimationFrame(() => {
      view.requestMeasure()
      secondFrameId = requestAnimationFrame(() => view.requestMeasure())
    })
    const transitionTimerId = window.setTimeout(() => view.requestMeasure(), 320)

    return () => {
      cancelAnimationFrame(firstFrameId)
      if (secondFrameId !== null) cancelAnimationFrame(secondFrameId)
      clearTimeout(transitionTimerId)
    }
  }, [isVisible, deferredVisible])

  const handleKeyDownCapture = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      const view = viewRef.current
      if (!view) return
      event.preventDefault()
      openSearchPanel(view)
    }
  }, [])

  // 折叠时用 pre 占位，显示前几行代码作为视觉提示
  if (!deferredVisible) {
    const previewLines = code.split('\n').slice(0, 6).join('\n')
    return (
      <div
        className={`${constrainedHeight ? 'w-full overflow-hidden' : 'h-full min-h-0 w-full overflow-hidden'} font-mono text-[length:var(--fs-code)] ${className}`}
        data-resizing={isResizing ? 'true' : undefined}
      >
        <pre
          className="m-0 p-3 whitespace-pre-wrap break-words text-text-400 opacity-60"
          style={{ maxHeight: constrainedHeight ? maxHeight : 120, lineHeight: `${lineHeight}px` }}
        >
          {previewLines}
          {code.split('\n').length > 6 && '\n…'}
        </pre>
      </div>
    )
  }

  return (
    <div
      className={`${constrainedHeight ? 'w-full overflow-hidden' : 'h-full min-h-0 w-full overflow-hidden'} font-mono text-[length:var(--fs-code)] ${className}`}
      data-resizing={isResizing ? 'true' : undefined}
      onKeyDownCapture={handleKeyDownCapture}
    >
      <div ref={hostRef} className={constrainedHeight ? '' : 'h-full min-h-0'} />
    </div>
  )
}
