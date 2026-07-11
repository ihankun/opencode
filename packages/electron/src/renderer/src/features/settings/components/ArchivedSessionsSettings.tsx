import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deleteSession, getSessions, restoreSession, type ApiSession } from '../../../api'
import { ArchiveIcon, RestoreIcon, TrashIcon, SpinnerIcon } from '../../../components/Icons'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { pinnedSessionsStore } from '../../../store/pinnedSessionsStore'
import { clearSessionRuntimeState } from '../../../utils/sessionLifecycle'
import { uiErrorHandler } from '../../../utils'

export function ArchivedSessionsSettings() {
  const { t, i18n } = useTranslation(['settings', 'common'])
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ApiSession | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setSessions(await getSessions({ archived: 'true', limit: 1000 }))
    } catch (error) {
      uiErrorHandler('load archived sessions', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const groups = useMemo(
    () =>
      Array.from(
        [...sessions]
          .sort((a, b) => (b.time.archived ?? 0) - (a.time.archived ?? 0))
          .reduce((result, session) => {
            const directory = session.directory || t('archived.unknownWorkspace')
            result.set(directory, [...(result.get(directory) ?? []), session])
            return result
          }, new Map<string, ApiSession[]>()),
      ),
    [sessions, t],
  )

  const restore = async (session: ApiSession) => {
    setBusy(session.id)
    try {
      await restoreSession(session.id, session.directory)
      setSessions(current => current.filter(item => item.id !== session.id))
    } catch (error) {
      uiErrorHandler('restore session', error)
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!pendingDelete) return
    setBusy(pendingDelete.id)
    try {
      await deleteSession(pendingDelete.id, pendingDelete.directory)
      pinnedSessionsStore.unpin(pendingDelete.id)
      clearSessionRuntimeState(pendingDelete.id)
      setSessions(current => current.filter(item => item.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (error) {
      uiErrorHandler('permanently delete session', error)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[length:var(--fs-base)] font-semibold text-text-100">{t('archived.title')}</h2>
        <p className="mt-1 text-[length:var(--fs-sm)] text-text-400">{t('archived.description')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><SpinnerIcon className="animate-spin text-text-400" /></div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-text-400">
          <ArchiveIcon size={28} />
          <span className="text-[length:var(--fs-sm)]">{t('archived.empty')}</span>
        </div>
      ) : (
        groups.map(([directory, items]) => (
          <section key={directory} className="flex flex-col gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[length:var(--fs-md)] font-semibold text-text-100">{directory.split(/[\\/]/).filter(Boolean).at(-1) || directory}</h3>
              <p className="truncate text-[length:var(--fs-xs)] text-text-500" title={directory}>{directory}</p>
            </div>
            <div className="rounded-xl border border-border-200/60 divide-y divide-border-200/50 overflow-hidden">
              {items.map(session => (
                <div key={session.id} className="flex items-center gap-3 bg-bg-050/40 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[length:var(--fs-md)] font-medium text-text-100">{session.title}</p>
                    <p className="text-[length:var(--fs-xs)] text-text-500">
                      {t('archived.archivedAt', { date: new Date(session.time.archived ?? session.time.updated).toLocaleString(i18n.language) })}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" disabled={busy === session.id} onClick={() => void restore(session)}>
                    <RestoreIcon size={13} />{t('archived.restore')}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={busy === session.id} className="text-danger-100 hover:text-danger-100" onClick={() => setPendingDelete(session)}>
                    <TrashIcon size={13} />{t('archived.delete')}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void remove()}
        title={t('archived.deleteTitle')}
        description={t('archived.deleteWarning', { title: pendingDelete?.title })}
        confirmText={t('archived.deleteForever')}
        variant="danger"
        isLoading={!!pendingDelete && busy === pendingDelete.id}
      />
    </div>
  )
}
