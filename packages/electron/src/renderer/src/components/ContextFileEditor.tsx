import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { captureMemory, getMemorySource, updateMemorySource, type MemorySource } from '../api/memory'
import { serverStore } from '../store/serverStore'
import { useMessageStore } from '../store'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'

const PROJECT_TEMPLATE = `# Project instructions

## Project conventions

- Add rules that should apply throughout this project.

## Validation

- Add the checks that should run before work is considered complete.
`

const WORKSPACE_TEMPLATE = `# Workspace memory

## Current workspace conventions

- Add durable context specific to this working directory.

## User preferences

- Add preferences that should carry into future tasks in this workspace.
`

interface ContextFileEditorProps {
  source: 'project' | 'workspace'
  directory?: string
  sessionId?: string | null
}

export const ContextFileEditor = memo(function ContextFileEditor({ source, directory, sessionId }: ContextFileEditorProps) {
  const { t } = useTranslation(['components', 'settings', 'common'])
  const { messages } = useMessageStore()
  const [current, setCurrent] = useState<MemorySource | null>(null)
  const [loadedDirectory, setLoadedDirectory] = useState('')
  const loadedDirectoryRef = useRef('')
  const dirtyRef = useRef(false)
  const loadSequenceRef = useRef(0)
  const [pendingDirectory, setPendingDirectory] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [savedDraft, setSavedDraft] = useState('')
  const [capture, setCapture] = useState('')
  const [proposal, setProposal] = useState('')
  const [proposalStatus, setProposalStatus] = useState<'idle' | 'approved' | 'discarded'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const supported = serverStore.supports('memory')
  const viewingPreviousDirectory = Boolean(loadedDirectory && loadedDirectory !== directory)

  dirtyRef.current = draft !== savedDraft
  loadedDirectoryRef.current = loadedDirectory

  const load = useCallback(
    async (targetDirectory: string) => {
      if (!supported) return
      const sequence = ++loadSequenceRef.current
      const next = await getMemorySource(source, targetDirectory)
      if (sequence !== loadSequenceRef.current) return
      setCurrent(next)
      setDraft(next.content)
      setSavedDraft(next.content)
      setLoadedDirectory(targetDirectory)
      setPendingDirectory(null)
    },
    [source, supported],
  )

  useEffect(() => {
    setError('')
    if (!directory) {
      setCurrent(null)
      setDraft('')
      setSavedDraft('')
      setLoadedDirectory('')
      return
    }
    if (loadedDirectoryRef.current && loadedDirectoryRef.current !== directory && dirtyRef.current) {
      setPendingDirectory(directory)
      return
    }
    setCurrent(null)
    setDraft('')
    setSavedDraft('')
    void load(directory).catch(cause => setError(cause instanceof Error ? cause.message : t('settings:memory.loadFailed')))
  }, [directory, load, t])

  useEffect(() => {
    setProposal('')
    setProposalStatus('idle')
  }, [directory, sessionId])

  useEffect(() => {
    if (source !== 'workspace' || !sessionId || proposalStatus !== 'idle' || proposal) return
    const candidates = messages
      .flatMap(message =>
        message.parts.flatMap(part => (part.type === 'text' && 'text' in part && typeof part.text === 'string' ? [part.text.trim()] : [])),
      )
      .filter(text => /\b(always|never|prefer|convention|must)\b|总是|不要|偏好|约定|规范|必须/i.test(text))
      .slice(-8)
    if (candidates.length === 0) return
    setProposal(['## Proposed memory', '', ...candidates.map(text => `- ${text.replace(/\s+/g, ' ').slice(0, 500)}`)].join('\n'))
  }, [messages, proposal, proposalStatus, sessionId, source])

  const save = async () => {
    const targetDirectory = loadedDirectory || directory
    if (!targetDirectory) return
    setBusy(true)
    setError('')
    try {
      await updateMemorySource(source, draft, targetDirectory)
      await load(directory || targetDirectory)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('settings:memory.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const appendMemory = async (content: string, approveProposal = false) => {
    const targetDirectory = loadedDirectory || directory
    if (!targetDirectory || !content.trim()) return
    setBusy(true)
    setError('')
    try {
      await captureMemory(content, targetDirectory)
      setCapture('')
      if (approveProposal) {
        setProposal('')
        setProposalStatus('approved')
      }
      await load(directory || targetDirectory)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('settings:memory.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (!directory) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[length:var(--fs-sm)] text-text-400">
        {t('contextFile.selectProject')}
      </div>
    )
  }

  if (!supported) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[length:var(--fs-sm)] text-text-400">
        {t('settings:memory.unsupported')}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {viewingPreviousDirectory ? (
          <div className="rounded-lg bg-warning-100/10 p-3 text-[length:var(--fs-xs)] text-warning-100">
            {t('contextFile.previousProjectDraft')}
          </div>
        ) : null}
        <section className="rounded-xl border border-border-200 bg-bg-100 p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-[length:var(--fs-base)] font-medium text-text-100">
              {source === 'project' ? t('contextFile.projectTitle') : t('contextFile.workspaceTitle')}
            </h2>
            {current ? (
              <span
                className={`rounded-full px-2 py-1 text-[length:var(--fs-xxs)] ${current.exists ? 'bg-success-100/10 text-success-100' : 'bg-bg-200 text-text-400'}`}
              >
                {current.exists ? t('contextFile.exists') : t('contextFile.willCreate')}
              </span>
            ) : null}
          </div>
          <p className="mb-3 text-[length:var(--fs-xs)] leading-5 text-text-400">
            {source === 'project' ? t('contextFile.projectDescription') : t('contextFile.workspaceDescription')}
          </p>
          <div className="mb-2 truncate font-mono text-[length:var(--fs-xxs)] text-text-500" title={current?.path}>
            {current?.path ?? t('common:loading')}
          </div>
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            rows={18}
            className="w-full resize-y rounded-lg border border-border-200 bg-bg-000 p-3 font-mono text-[length:var(--fs-xs)] leading-5 text-text-100 outline-none focus:border-accent-main-100"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[length:var(--fs-xxs)] text-text-500">
              {new TextEncoder().encode(draft).byteLength.toLocaleString()} bytes
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDraft(source === 'project' ? PROJECT_TEMPLATE : WORKSPACE_TEMPLATE)}>
                {t('settings:memory.useTemplate')}
              </Button>
              <Button size="sm" disabled={draft === savedDraft} isLoading={busy} onClick={() => void save()}>
                {t('common:save')}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-[length:var(--fs-xxs)] text-text-500">{t('contextFile.nextMessage')}</p>
        </section>

        {source === 'workspace' && !viewingPreviousDirectory ? (
          <>
            <section className="rounded-xl border border-border-200 bg-bg-100 p-4">
              <h2 className="text-[length:var(--fs-sm)] font-medium text-text-100">{t('settings:memory.capture')}</h2>
              <p className="mt-1 text-[length:var(--fs-xs)] leading-5 text-text-400">{t('settings:memory.captureDesc')}</p>
              <textarea
                value={capture}
                onChange={event => setCapture(event.target.value)}
                rows={5}
                placeholder={t('settings:memory.capturePlaceholder')}
                className="mt-3 w-full resize-y rounded-lg border border-border-200 bg-bg-000 p-3 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100"
              />
              <div className="mt-3 flex justify-end">
                <Button size="sm" disabled={!capture.trim()} isLoading={busy} onClick={() => void appendMemory(capture)}>
                  {t('settings:memory.saveToWorkspace')}
                </Button>
              </div>
            </section>

            <section className="rounded-xl border border-border-200 bg-bg-100 p-4">
              <h2 className="text-[length:var(--fs-sm)] font-medium text-text-100">{t('settings:memory.proposals')}</h2>
              <p className="mt-1 text-[length:var(--fs-xs)] leading-5 text-text-400">{t('settings:memory.proposalsDesc')}</p>
              {proposal ? (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-warning-100/10 px-2 py-1 text-[length:var(--fs-xxs)] text-warning-100">
                      {t('settings:memory.needsReview')}
                    </span>
                    <span className="truncate font-mono text-[length:var(--fs-xxs)] text-text-500">{sessionId}</span>
                  </div>
                  <textarea
                    value={proposal}
                    onChange={event => setProposal(event.target.value)}
                    rows={7}
                    className="w-full resize-y rounded-lg border border-border-200 bg-bg-000 p-3 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setProposal('')
                        setProposalStatus('discarded')
                      }}
                    >
                      {t('settings:memory.discardProposal')}
                    </Button>
                    <Button size="sm" isLoading={busy} onClick={() => void appendMemory(proposal, true)}>
                      {t('settings:memory.approveProposal')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-border-200 px-3 py-6 text-center text-[length:var(--fs-xs)] text-text-500">
                  {proposalStatus === 'approved'
                    ? t('settings:memory.proposalApproved')
                    : proposalStatus === 'discarded'
                      ? t('settings:memory.proposalDiscarded')
                      : t('settings:memory.noProposal')}
                </div>
              )}
            </section>
          </>
        ) : null}

        {error ? <div className="rounded-lg bg-danger-100/10 p-3 text-[length:var(--fs-sm)] text-danger-100">{error}</div> : null}
      </div>
      <ConfirmDialog
        isOpen={pendingDirectory !== null}
        onClose={() => setPendingDirectory(null)}
        onConfirm={() => {
          if (!pendingDirectory) return
          const next = pendingDirectory
          setPendingDirectory(null)
          setCurrent(null)
          setDraft('')
          setSavedDraft('')
          void load(next).catch(cause => setError(cause instanceof Error ? cause.message : t('settings:memory.loadFailed')))
        }}
        title={t('contextFile.discardTitle')}
        description={t('contextFile.discardDescription')}
        confirmText={t('contextFile.discardAndSwitch')}
        variant="warning"
      />
    </div>
  )
})
