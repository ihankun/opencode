import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../../components/ui/Dialog'
import { CloseIcon, SmartphoneIcon } from '../../../components/Icons'

const ImBotServiceSettings = lazy(() => import('../../settings/components/ImBotServiceSettings').then(module => ({ default: module.ImBotServiceSettings })))
const ImBotConfigSettings = lazy(() => import('../../settings/components/ImBotConfigSettings').then(module => ({ default: module.ImBotConfigSettings })))
const ImBotLogsSettings = lazy(() => import('../../settings/components/ImBotLogsSettings').then(module => ({ default: module.ImBotLogsSettings })))

export type ImBridgeDialogTab = 'service' | 'config' | 'logs'

// IM 机器人独立配置弹窗：设置页不再承载 IM 相关配置，
// 底部栏 IM 图标点击后在此弹窗内完成服务/渠道/日志的全部操作
export function ImBridgeDialog({
  isOpen,
  onClose,
  initialTab = 'service',
}: {
  isOpen: boolean
  onClose: () => void
  initialTab?: ImBridgeDialogTab
}) {
  const { t } = useTranslation(['chat', 'settings', 'common'])
  const [tab, setTab] = useState<ImBridgeDialogTab>(initialTab)

  useEffect(() => {
    if (isOpen) setTab(initialTab)
  }, [isOpen, initialTab])

  const tabs: { id: ImBridgeDialogTab; labelKey: string }[] = [
    { id: 'service', labelKey: 'settings:tabs.imBotService' },
    { id: 'config', labelKey: 'settings:tabs.imBotConfig' },
    { id: 'logs', labelKey: 'settings:tabs.imBotLogs' },
  ]

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={760} className="h-[min(80vh,640px)]" rawContent ariaLabel={t('chat:sidebar.imBot.title')}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-100/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <SmartphoneIcon size={16} className="text-text-300" />
          <span className="text-[length:var(--fs-heading-2)] font-semibold text-text-100">{t('chat:sidebar.imBot.title')}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common:close')}
          className="rounded-md p-2 text-text-400 transition-colors hover:bg-bg-100 hover:text-text-200"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border-100/50 px-5 py-2">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-md px-3 py-1.5 text-[length:var(--fs-sm)] transition-colors ${
              tab === item.id ? 'bg-bg-200 font-medium text-text-100' : 'text-text-400 hover:bg-bg-200/50 hover:text-text-200'
            }`}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
        <Suspense fallback={<div className="flex min-h-48 items-center justify-center text-[length:var(--fs-sm)] text-text-400">{t('common:loading')}</div>}>
          {tab === 'service' && <ImBotServiceSettings />}
          {tab === 'config' && <ImBotConfigSettings />}
          {tab === 'logs' && <ImBotLogsSettings />}
        </Suspense>
      </div>
    </Dialog>
  )
}
