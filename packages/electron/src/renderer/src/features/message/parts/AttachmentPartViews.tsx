import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AttachmentDetailModal,
  AttachmentItem,
  fromFilePart,
  fromAgentPart,
  fromTextPart,
} from '../../attachment'
import { ExpandIcon } from '../../../components/Icons'
import type { FilePart, AgentPart, TextPart } from '../../../types/message'

// ============================================
// File Part View
// ============================================

interface FilePartViewProps {
  part: FilePart
}

export const FilePartView = memo(function FilePartView({ part }: FilePartViewProps) {
  const { t } = useTranslation('commands')
  const [imageError, setImageError] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const attachment = fromFilePart(part)
  const showImagePreview = part.mime.startsWith('image/') && !!part.url && !imageError

  if (showImagePreview) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="group/image relative max-w-[240px] overflow-hidden rounded-xl border border-border-200/70 bg-bg-200/35 shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:border-border-300 hover:shadow-md active:scale-[0.985]"
          title={t('attachment.viewDetail')}
          aria-label={`${t('attachment.viewDetail')}: ${attachment.displayName}`}
        >
          <img
            src={part.url}
            alt={attachment.displayName}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            className="block max-h-48 max-w-full object-contain"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-[background-color,opacity] duration-150 group-hover/image:bg-black/20 group-hover/image:opacity-100">
            <span className="flex size-8 items-center justify-center rounded-full bg-black/55 shadow-sm backdrop-blur-sm">
              <ExpandIcon size={15} />
            </span>
          </span>
        </button>
        <AttachmentDetailModal
          attachment={attachment}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      </>
    )
  }

  return <AttachmentItem attachment={attachment} expandable size="sm" />
})

// ============================================
// Agent Part View
// ============================================

interface AgentPartViewProps {
  part: AgentPart
}

export const AgentPartView = memo(function AgentPartView({ part }: AgentPartViewProps) {
  // 转换为 Attachment 类型
  const attachment = fromAgentPart(part)

  return <AttachmentItem attachment={attachment} expandable size="sm" />
})

// ============================================
// Synthetic Text Part View (系统上下文)
// ============================================

interface SyntheticTextPartViewProps {
  part: TextPart
}

export const SyntheticTextPartView = memo(function SyntheticTextPartView({ part }: SyntheticTextPartViewProps) {
  if (!part.synthetic) return null

  // 转换为 Attachment 类型
  const attachment = fromTextPart(part)

  return <AttachmentItem attachment={attachment} expandable size="sm" />
})
