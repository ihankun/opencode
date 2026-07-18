import { lazy, Suspense } from 'react'

const MarkdownRenderer = lazy(() =>
  import('./MarkdownRenderer').then(module => ({ default: module.MarkdownRenderer })),
)

export function LazyMarkdownRenderer({
  content,
  className,
  isStreaming,
  variant,
}: {
  content: string
  className?: string
  isStreaming?: boolean
  variant?: 'default' | 'reasoning'
}) {
  return (
    <Suspense fallback={<div className={`whitespace-pre-wrap ${className ?? ''}`}>{content}</div>}>
      <MarkdownRenderer content={content} className={className} isStreaming={isStreaming} variant={variant} />
    </Suspense>
  )
}
