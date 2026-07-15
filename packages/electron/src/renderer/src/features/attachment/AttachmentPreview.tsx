import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloseIcon } from '../../components/Icons'
import { AttachmentDetailModal } from './AttachmentDetailModal'
import { AttachmentItem } from './AttachmentItem'
import type { Attachment } from './types'

interface AttachmentPreviewProps {
  attachments: Attachment[]
  onRemove?: (id: string) => void
  className?: string
  size?: 'sm' | 'md'
  expandable?: boolean
  variant?: 'wrap' | 'list' | 'grid' | 'rail'
  /** @deprecated use variant='list' or variant='wrap' */
  direction?: 'row' | 'column'
}

/**
 * 附件预览组件
 * 用于输入框上方预览区和消息气泡中
 */
export function AttachmentPreview({
  attachments,
  onRemove,
  className = '',
  size = 'md',
  expandable = false,
  variant,
  direction,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null

  // Backward compatibility
  const mode = variant || (direction === 'column' ? 'list' : 'wrap')

  const sizeClasses = size === 'sm' ? 'text-[length:var(--fs-sm)] gap-1.5' : 'text-[length:var(--fs-base)] gap-2'

  const containerClasses = {
    wrap: 'flex flex-wrap',
    list: 'flex flex-col items-end', // List aligns to end (user message)
    grid: 'grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 w-full',
    rail: 'inline-flex min-w-max snap-x snap-proximity flex-nowrap items-start',
  }[mode]

  const itemClasses = {
    wrap: 'w-[140px]',
    list: 'w-full max-w-[280px]', // Slightly wider in list
    grid: 'w-full min-w-0', // min-w-0 required for flex/grid truncation
    rail: 'w-[140px] shrink-0 snap-start',
  }[mode]

  return (
    <div className={`${containerClasses} ${sizeClasses} ${className}`}>
      {attachments.map(attachment => (
        <AttachmentPreviewItem
          key={attachment.id}
          attachment={attachment}
          onRemove={onRemove}
          size={size}
          expandable={expandable}
          className={itemClasses}
          showImageThumbnail={mode === 'rail'}
        />
      ))}
    </div>
  )
}

function AttachmentPreviewItem({
  attachment,
  onRemove,
  size,
  expandable,
  className,
  showImageThumbnail,
}: {
  attachment: Attachment
  onRemove?: (id: string) => void
  size: 'sm' | 'md'
  expandable: boolean
  className: string
  showImageThumbnail: boolean
}) {
  const { t } = useTranslation('commands')
  const [imageError, setImageError] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const isImage = attachment.mime?.startsWith('image/') && !!attachment.url

  if (!showImageThumbnail || !isImage || imageError) {
    return (
      <AttachmentItem
        attachment={attachment}
        onRemove={onRemove}
        size={size}
        expandable={expandable}
        className={className}
      />
    )
  }

  return (
    <div className="group/image relative h-20 w-20 shrink-0 snap-start overflow-hidden rounded-xl border border-border-200/70 bg-bg-200/45 shadow-sm">
      <button
        type="button"
        onClick={() => setIsPreviewOpen(true)}
        className="block size-full"
        title={t('attachment.viewDetail')}
        aria-label={`${t('attachment.viewDetail')}: ${attachment.displayName}`}
      >
        <img
          src={attachment.url}
          alt={attachment.displayName}
          className="size-full object-cover transition-transform duration-200 group-hover/image:scale-[1.03]"
          decoding="async"
          onError={() => setImageError(true)}
        />
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/75"
          aria-label={t('attachment.removeAttachment')}
          title={t('attachment.removeAttachment')}
        >
          <CloseIcon size={11} />
        </button>
      )}
      <AttachmentDetailModal
        attachment={attachment}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  )
}
