import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CustomOpenCodeExpertKit } from '../../../preload'
import { AlertCircleIcon, CloseIcon, DownloadIcon, SearchIcon, SpinnerIcon, TeachIcon, TrashIcon } from './Icons'
import { apiErrorHandler } from '../utils'
import { ConfirmDialog } from './ui/ConfirmDialog'

export const ExpertKitPanel = memo(function ExpertKitPanel() {
  const { t } = useTranslation(['components', 'common'])
  const [query, setQuery] = useState('')
  const [kits, setKits] = useState<CustomOpenCodeExpertKit[]>([])
  const [selected, setSelected] = useState<CustomOpenCodeExpertKit | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [forceAction, setForceAction] = useState<{ kit: CustomOpenCodeExpertKit; mode: 'install' | 'remove' } | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.customOpenCode.searchExpertKits(query)
      setKits(result)
      setSelected(current => current ? result.find(kit => kit.id === current.id) ?? null : null)
    } catch (cause) {
      apiErrorHandler('load expert kits', cause)
      setError(cause instanceof Error ? cause.message : t('expertKit.failed'))
    } finally {
      setLoading(false)
    }
  }, [query, t])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query.trim() ? 400 : 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const mutate = async (kit: CustomOpenCodeExpertKit, mode: 'install' | 'remove', force = false) => {
    try {
      setAction(kit.id)
      setError(null)
      if (mode === 'install') await window.customOpenCode.installExpertKit(kit.id, force)
      else await window.customOpenCode.removeExpertKit(kit.id, force)
      await window.customOpenCode.restartServer()
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      if (!force && /already exists|local changes/i.test(message)) {
        setForceAction({ kit, mode })
        return
      }
      setError(message)
    } finally {
      setAction(null)
    }
  }

  return <div className="flex h-full min-h-0 flex-col bg-bg-100">
    <div className="border-b border-border-200/40 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div><div className="text-[length:var(--fs-sm)] font-medium text-text-100">{t('expertKit.title')}</div><div className="mt-0.5 text-[length:var(--fs-xs)] text-text-400">{t('expertKit.subtitle')}</div></div>
        <span className="rounded bg-bg-200 px-2 py-1 text-[length:var(--fs-xs)] text-text-400">{t('expertKit.provider')}</span>
      </div>
      <div className="relative"><SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('expertKit.search')} className="h-8 w-full rounded-md border border-border-200/60 bg-bg-100 pl-8 pr-2 text-[length:var(--fs-sm)] text-text-100 outline-none" /></div>
    </div>
    {error && <div className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-danger-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-danger-100"><AlertCircleIcon size={13} />{error}</div>}
    <div className="min-h-0 flex-1 overflow-auto p-3">
      {loading && kits.length === 0 ? <div className="flex h-full items-center justify-center gap-2 text-[length:var(--fs-sm)] text-text-400"><SpinnerIcon size={18} className="animate-spin" />{t('expertKit.loading')}</div> : kits.length === 0 ? <div className="flex h-full flex-col items-center justify-center gap-2 text-[length:var(--fs-sm)] text-text-400"><TeachIcon size={24} className="opacity-40" />{t('expertKit.empty')}</div> : <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{kits.map(kit => <button key={kit.id} type="button" onClick={() => setSelected(kit)} className="flex min-h-32 gap-3 rounded-lg border border-border-200/50 bg-bg-000 p-3 text-left transition-colors hover:border-border-100 hover:bg-bg-200/20">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg-200">{kit.icon ? <img src={kit.icon} alt="" className="h-full w-full object-cover" /> : <TeachIcon size={20} className="text-accent-main-100" />}</div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-[length:var(--fs-sm)] font-medium text-text-100">{kit.name}</span>{kit.installed && <span className="rounded bg-success-100/10 px-1.5 py-0.5 text-[10px] text-success-100">{kit.updateAvailable ? t('expertKit.updateAvailable') : t('expertKit.installed')}</span>}</div><div className="mt-1 line-clamp-2 text-[length:var(--fs-xs)] leading-4 text-text-400">{kit.description}</div><div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-text-500"><span>{kit.author}</span><span>v{kit.version}</span><span>{t('expertKit.skillCount', { count: kit.skills.length })}</span>{kit.downloadCount > 0 && <span>↓ {kit.downloadCount.toLocaleString()}</span>}</div><div className="mt-2 flex flex-wrap gap-1">{kit.skills.slice(0, 4).map(skill => <span key={skill.id} className="rounded bg-bg-200/70 px-1.5 py-0.5 text-[10px] text-text-300">{skill.name}</span>)}{kit.skills.length > 4 && <span className="px-1 py-0.5 text-[10px] text-text-500">+{kit.skills.length - 4}</span>}</div></div>
      </button>)}</div>}
    </div>
    {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-6" onMouseDown={event => event.target === event.currentTarget && setSelected(null)}><div className="flex max-h-[78vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border-200 bg-bg-000 shadow-2xl">
      <div className="flex items-start justify-between border-b border-border-200/50 px-4 py-3"><div className="flex min-w-0 items-center gap-3">{selected.icon && <img src={selected.icon} alt="" className="h-10 w-10 rounded-lg object-cover" />}<div className="min-w-0"><div className="truncate text-[length:var(--fs-base)] font-medium text-text-100">{selected.name}</div><div className="text-[length:var(--fs-xs)] text-text-400">{selected.author} · v{selected.version} · {t('expertKit.provider')}</div></div></div><button type="button" onClick={() => setSelected(null)} className="rounded p-1 text-text-400 hover:bg-bg-200"><CloseIcon size={15} /></button></div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4"><p className="text-[length:var(--fs-sm)] leading-5 text-text-300">{selected.description}</p><div><div className="mb-2 text-[length:var(--fs-xs)] font-medium text-text-200">{t('expertKit.includedSkills')}</div><div className="space-y-2">{selected.skills.map(skill => <div key={skill.id} className="rounded-md border border-border-200/40 bg-bg-100 p-2"><div className="text-[length:var(--fs-sm)] font-medium text-text-100">{skill.name}</div>{skill.description && <div className="mt-0.5 text-[length:var(--fs-xs)] text-text-400">{skill.description}</div>}</div>)}</div></div>{selected.tryAsking.length > 0 && <div><div className="mb-2 text-[length:var(--fs-xs)] font-medium text-text-200">{t('expertKit.tryAsking')}</div><div className="flex flex-wrap gap-2">{selected.tryAsking.map(prompt => <span key={prompt} className="rounded-md bg-bg-200/60 px-2 py-1 text-[length:var(--fs-xs)] text-text-300">{prompt}</span>)}</div></div>}</div>
      <div className="flex justify-end gap-2 border-t border-border-200/50 px-4 py-3">{selected.installed && <button type="button" disabled={Boolean(action)} onClick={() => void mutate(selected, 'remove')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-danger-100/30 px-3 text-[length:var(--fs-sm)] text-danger-100 disabled:opacity-50">{action === selected.id ? <SpinnerIcon size={12} className="animate-spin" /> : <TrashIcon size={12} />}{t('expertKit.uninstall')}</button>}<button type="button" disabled={Boolean(action)} onClick={() => void mutate(selected, 'install')} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent-main-100 px-3 text-[length:var(--fs-sm)] text-white disabled:opacity-50">{action === selected.id ? <SpinnerIcon size={12} className="animate-spin" /> : <DownloadIcon size={12} />}{selected.installed ? selected.updateAvailable ? t('expertKit.update') : t('expertKit.reinstall') : t('expertKit.install')}</button></div>
    </div></div>}
    <ConfirmDialog isOpen={forceAction !== null} onClose={() => setForceAction(null)} onConfirm={() => { const pending = forceAction; setForceAction(null); if (pending) void mutate(pending.kit, pending.mode, true) }} title={t('expertKit.title')} description={t('expertKit.forceConflict')} confirmText={t('common:confirm')} variant="danger" isLoading={Boolean(action)} />
  </div>
})

export default ExpertKitPanel
