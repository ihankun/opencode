import { lazy, Suspense } from 'react'

// 模块加载时立即开始下载 MarkdownRenderer chunk + Shiki 高亮器
import('./MarkdownRenderer')
import('../lib/shiki').then(async m => {
  const h = await m.getHighlighter()
  const common = ['typescript', 'javascript', 'json', 'python', 'shell', 'html', 'css', 'yaml', 'markdown']
  await Promise.allSettled(common.map(lang => m.ensureLang(lang)))
}).catch(() => {})

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
  const isReasoning = variant === 'reasoning'
  const fallbackClasses = [
    'markdown-content',
    'whitespace-pre-wrap',
    'break-words min-w-0 overflow-hidden',
    isReasoning ? 'text-[length:var(--fs-sm)] leading-5 text-text-400' : 'text-[length:var(--fs-base)] leading-relaxed text-text-100',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Suspense fallback={<div className={fallbackClasses}>{content}</div>}>
      <MarkdownRenderer content={content} className={className} isStreaming={isStreaming} variant={variant} />
    </Suspense>
  )
}
