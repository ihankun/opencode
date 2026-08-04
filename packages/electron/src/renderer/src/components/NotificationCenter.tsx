// ============================================
// NotificationCenterDialog - 消息中心
// 汇总所有通知（已读/未读），支持手动标记已读、全部已读、清空
// ============================================

import { useTranslation } from 'react-i18next'
import { Dialog, Button } from './ui'
import {
  useNotifications,
  notificationStore,
  type NotificationType,
} from '../store/notificationStore'
import { CloseIcon, HandIcon, QuestionIcon, CheckIcon, AlertCircleIcon, TrashIcon } from './Icons'

const typeConfig: Record<NotificationType, { icon: typeof HandIcon; color: string; bgAccent: string }> = {
  permission: { icon: HandIcon, color: 'text-warning-100', bgAccent: 'bg-warning-bg' },
  question: { icon: QuestionIcon, color: 'text-info-100', bgAccent: 'bg-info-bg' },
  completed: { icon: CheckIcon, color: 'text-success-100', bgAccent: 'bg-success-bg' },
  error: { icon: AlertCircleIcon, color: 'text-danger-100', bgAccent: 'bg-danger-bg' },
}

function formatTime(timestamp: number, language: string) {
  const diff = Date.now() - timestamp
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
  if (diff < 60_000) return relative.format(-Math.round(diff / 1000), 'second')
  if (diff < 3_600_000) return relative.format(-Math.round(diff / 60_000), 'minute')
  if (diff < 86_400_000) return relative.format(-Math.round(diff / 3_600_000), 'hour')
  if (diff < 7 * 86_400_000) return relative.format(-Math.round(diff / 86_400_000), 'day')
  return new Date(timestamp).toLocaleString(language)
}

export function NotificationCenterDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation(['chat', 'common'])
  const notifications = useNotifications()
  const unreadCount = notifications.filter(notification => !notification.read).length

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('sidebar.notificationsTitle')} width={520} rawContent className="h-[480px]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-100/50 px-4 py-2">
          <div className="truncate text-[length:var(--fs-heading-3)] font-semibold text-text-100">
            {t('sidebar.notificationsTitle')}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common:close')}
            title={t('common:close')}
            className="rounded-md p-1.5 text-text-400 transition-colors hover:bg-bg-100 hover:text-text-200"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-100/50 px-4 py-2">
          <span className="text-[length:var(--fs-xs)] text-text-400">
            {unreadCount > 0 ? t('sidebar.notificationsUnread', { count: unreadCount }) : t('sidebar.notificationsAllRead')}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => notificationStore.markAllRead()} disabled={unreadCount === 0}>
              {t('sidebar.readAll')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => notificationStore.clearAll()} disabled={notifications.length === 0}>
              {t('sidebar.clearNotifications')}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <div className="flex h-full items-center justify-center text-text-400 text-[length:var(--fs-sm)]">
              {t('sidebar.notificationsEmpty')}
            </div>
          ) : (
            notifications.map(notification => {
              const config = typeConfig[notification.type]
              const Icon = config.icon
              return (
                <div
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => notificationStore.markRead(notification.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') notificationStore.markRead(notification.id)
                  }}
                  className={`group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer hover:bg-bg-200/50 ${notification.read ? '' : 'bg-bg-200/30'}`}
                >
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${config.bgAccent}`}>
                    <Icon size={13} className={config.color} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[length:var(--fs-sm)] font-medium leading-tight text-text-100">
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className="mt-0.5 block break-words text-[length:var(--fs-xs)] leading-snug text-text-300">
                        {notification.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[length:var(--fs-xxs)] text-text-500">
                      {formatTime(notification.timestamp, i18n.language)}
                    </span>
                  </span>
                  {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-danger-100" />}
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation()
                      notificationStore.dismiss(notification.id)
                    }}
                    aria-label={t('sidebar.deleteNotification')}
                    title={t('sidebar.deleteNotification')}
                    className="shrink-0 rounded-md p-1 text-text-400 opacity-0 transition-opacity hover:bg-bg-200 hover:text-text-200 group-hover:opacity-100"
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Dialog>
  )
}
