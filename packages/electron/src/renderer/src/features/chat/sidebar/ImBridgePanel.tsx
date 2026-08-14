import { createPortal } from 'react-dom'
import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { SmartphoneIcon, XIcon } from '../../../components/Icons'
import type { ImBridgeConfig, ImBridgeState } from '../../../../../shared/imBridge'
import { IMBRIDGE_PLATFORM_IDS, imBridgePlatformInfos, type ImBridgePlatformId } from '../../settings/components/imBotShared'

export interface ImBridgePanelPosition {
  top: number
  left: number
  width: number
}

const PLATFORM_LABELS: Record<ImBridgePlatformId, string> = {
  feishu: '飞书 / Lark',
  qq: 'QQ Bot',
  telegram: 'Telegram',
  discord: 'Discord',
  wechat: '微信 / WeChat',
  dingtalk: '钉钉 / DingTalk',
}

export function ImBridgePanel({
  position,
  visible,
  onClose,
  config,
  state,
  onOpenConfig,
  onOpenLogs,
  ref,
}: {
  position: ImBridgePanelPosition
  visible: boolean
  onClose: () => void
  config?: ImBridgeConfig
  state: ImBridgeState
  onOpenConfig: () => void
  onOpenLogs: () => void
  ref?: Ref<HTMLDivElement>
}) {
  const { t } = useTranslation(['chat', 'common'])
  const platformInfos = imBridgePlatformInfos(config, state.logs)

  return createPortal(
    <div
      ref={ref}
      className={`
        fixed z-[9999] rounded-lg border border-border-200/60 glass-alt sidebar-footer-popover shadow-lg
        transition-all duration-150 ease-out
        ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
      style={{
        bottom: window.innerHeight - position.top,
        left: position.left,
        width: position.width,
        transformOrigin: 'bottom left',
      }}
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-2">
          <SmartphoneIcon size={14} className="text-text-400" />
          <span className="text-[length:var(--fs-sm)] font-semibold text-text-100">{t('sidebar.imBot.title')}</span>
          {state.status === 'starting' ? (
            <span className="text-[length:var(--fs-xxs)] text-warning-100">{t('sidebar.imBot.serviceStarting')}</span>
          ) : (
            <span className="text-[length:var(--fs-xxs)] text-success-100">{t('sidebar.imBot.serviceRunning')}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common:close')}
          className="rounded-md p-1 text-text-400 transition-colors hover:bg-bg-200 hover:text-text-100"
        >
          <XIcon size={14} />
        </button>
      </div>

      <div className="space-y-2.5 px-3 pb-3">
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {(() => {
            const connected = IMBRIDGE_PLATFORM_IDS.filter(id => {
              const info = platformInfos[id]
              return info.enabled && info.status === 'connected'
            })
            if (connected.length === 0) {
              return (
                <div className="rounded-md px-2 py-1.5 text-[length:var(--fs-sm)] text-text-400">
                  {t('sidebar.imBot.noConnectedPlatforms')}
                </div>
              )
            }
            return connected.map(id => (
              <div key={id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-bg-200/40">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success-100" />
                <span className="flex-1 text-[length:var(--fs-sm)] text-text-200">{PLATFORM_LABELS[id]}</span>
                <span className="text-[length:var(--fs-xxs)] text-text-400">{t('sidebar.imBot.status.connected')}</span>
              </div>
            ))
          })()}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Button size="sm" onClick={onOpenConfig}>{t('sidebar.imBot.config')}</Button>
          <Button size="sm" variant="secondary" onClick={onOpenLogs}>{t('sidebar.imBot.logs')}</Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
