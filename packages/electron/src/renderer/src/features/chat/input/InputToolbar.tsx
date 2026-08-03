import { useState, useRef, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronDownIcon,
  SendIcon,
  StopIcon,
  PaperclipIcon,
  PlusIcon,
  LinkIcon,
  AgentIcon,
  ThinkingIcon,
  BuildAgentIcon,
  PlanAgentIcon,
  GoalAgentIcon,
  HandIcon,
  ShieldIcon,
  PermissionListIcon,
  MicrophoneIcon,
} from '../../../components/Icons'
import { DropdownMenu, MenuItem, IconButton, AnimatedPresence } from '../../../components/ui'
import { CircularProgress } from '../../../components/CircularProgress'
import { ModelSelector, type ModelSelectorHandle } from '../ModelSelector'
import { ContextDetailsDialog } from '../sidebar/ContextDetailsDialog'
import { computeContextSources } from '../contextSources'
import { useChatViewport } from '../chatViewport'
import { selectableAgentsInDisplayOrder } from '../agentOrder'
import { formatTokens } from '../../../hooks'
import type { ApiAgent } from '../../../api/client'
import type { ModelInfo, FileCapabilities } from '../../../api'
import type { SessionStats } from '../../../hooks'
import { useMessageStore } from '../../../store'
import { autoApproveStore, type ApprovalMode } from '../../../store/autoApproveStore'
import { DOCUMENT_FILE_EXTENSIONS, DOCUMENT_FILE_MIMES } from './inputUtils'

interface InputToolbarProps {
  paneId: string
  agents: ApiAgent[]
  selectedAgent?: string
  onAgentChange?: (agentName: string) => void

  variants?: string[]
  selectedVariant?: string
  onVariantChange?: (variant: string | undefined) => void

  fileCapabilities?: FileCapabilities
  onFilesSelected: (files: File[]) => void
  onAddReference?: () => void
  onAddCommand?: () => void

  isStreaming?: boolean
  isSending?: boolean
  onAbort?: () => void

  canSend: boolean
  onSend: () => void

  // Model selection（移动端显示在工具栏）
  models?: ModelInfo[]
  selectedModelKey?: string | null
  onModelChange?: (modelKey: string, model: ModelInfo) => void
  modelsLoading?: boolean
  // 输入框容器 ref，用于约束菜单边界
  inputContainerRef?: React.RefObject<HTMLDivElement | null>
  modelSelectorRef?: React.RefObject<ModelSelectorHandle | null>
  contextStats?: SessionStats
  hasMessages?: boolean
  voiceSupported?: boolean
  voiceListening?: boolean
  voiceTranscribing?: boolean
  onVoiceToggle?: () => void
}

const approvalModes: ApprovalMode[] = ['ask', 'writes', 'risk', 'full']

function ApprovalModeIcon({ mode }: { mode: ApprovalMode }) {
  if (mode === 'ask') return <HandIcon />
  if (mode === 'full') return <ShieldIcon className="text-danger-100" />
  if (mode === 'writes') return <ShieldIcon className="text-warning-100" />
  return <PermissionListIcon className="text-accent-main-100" />
}

function ApprovalModeSelector({ paneId, disabled, inputContainerRef }: {
  paneId: string
  disabled: boolean
  inputContainerRef?: React.RefObject<HTMLDivElement | null>
}) {
  const { t } = useTranslation('chat')
  const mode = useSyncExternalStore(autoApproveStore.subscribe, () => autoApproveStore.getApprovalMode(paneId))
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (triggerRef.current?.contains(event.target as Node) || menuRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(value => !value)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-[length:var(--fs-base)] rounded-lg transition-all duration-150 hover:bg-bg-200 active:scale-95 disabled:opacity-50"
        title={t(`inputToolbar.approvalModes.${mode}.description`)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-text-400"><ApprovalModeIcon mode={mode} /></span>
        <span className="text-[length:var(--fs-sm)] text-text-300">{t(`inputToolbar.approvalModes.${mode}.label`)}</span>
        <span className="text-text-400"><ChevronDownIcon /></span>
      </button>
      <DropdownMenu triggerRef={triggerRef} isOpen={open} position="top" align="left" constrainToRef={inputContainerRef}>
        <div ref={menuRef} role="menu" aria-label={t('inputToolbar.approvalMode')}>
          {approvalModes.map(item => (
            <MenuItem
              key={item}
              label={t(`inputToolbar.approvalModes.${item}.label`)}
              description={t(`inputToolbar.approvalModes.${item}.description`)}
              icon={<ApprovalModeIcon mode={item} />}
              selected={mode === item}
              selectionRole="menuitemradio"
              onClick={() => {
                autoApproveStore.setApprovalMode(paneId, item)
                setOpen(false)
              }}
            />
          ))}
        </div>
      </DropdownMenu>
    </div>
  )
}

function formatTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getVariantLabel(variant: string | undefined, t: (key: string) => string) {
  if (!variant) return t('inputToolbar.variants.default')

  const normalized = variant.toLowerCase()
  const knownLabels: Record<string, string> = {
    default: t('inputToolbar.variants.default'),
    none: t('inputToolbar.variants.none'),
    minimal: t('inputToolbar.variants.minimal'),
    low: t('inputToolbar.variants.low'),
    medium: t('inputToolbar.variants.medium'),
    middle: t('inputToolbar.variants.medium'),
    middlw: t('inputToolbar.variants.medium'),
    high: t('inputToolbar.variants.high'),
    xhigh: t('inputToolbar.variants.xhigh'),
    max: t('inputToolbar.variants.max'),
  }

  return knownLabels[normalized] ?? formatTitleCase(variant)
}

function getAgentLabel(agentName: string, t: (key: string) => string) {
  if (agentName === 'goal') return t('inputToolbar.agents.goal')
  return agentName === 'build' || agentName === 'plan' ? formatTitleCase(agentName) : formatTitleCase(agentName)
}

function getAgentDescription(agent: ApiAgent, t: (key: string) => string) {
  if (agent.name === 'build') return t('inputToolbar.agentDescriptions.build')
  if (agent.name === 'plan') return t('inputToolbar.agentDescriptions.plan')
  if (agent.name === 'goal') return t('inputToolbar.agentDescriptions.goal')
  return agent.description
}

function AgentModeIcon({ name, color }: { name?: string; color?: string }) {
  const normalized = name?.toLowerCase()
  const Icon =
    normalized === 'build' ? BuildAgentIcon : normalized === 'plan' ? PlanAgentIcon : normalized === 'goal' ? GoalAgentIcon : AgentIcon
  const resolvedColor = color ? ({
    primary: 'var(--color-accent-main-100)',
    accent: 'var(--color-accent-main-100)',
    secondary: 'var(--color-accent-secondary-100)',
    success: 'var(--color-success-100)',
    warning: 'var(--color-warning-100)',
    error: 'var(--color-danger-100)',
    info: 'var(--color-info-100)',
  }[color] ?? color) : undefined
  const style = normalized === 'build' ? { color: '#2563eb' } : normalized === 'goal' ? { color: '#f97316' } : resolvedColor ? { color: resolvedColor } : undefined

  return <Icon style={style} />
}

function ContextUsageIndicator({ stats, hasMessages }: { stats?: SessionStats; hasMessages?: boolean }) {
  const { t } = useTranslation('chat')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(true)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const { messages } = useMessageStore()
  const contextUsed = hasMessages ? (stats?.contextUsed ?? 0) : 0
  const contextLimit = stats?.contextLimit ?? 0
  const contextPercent = hasMessages ? (stats?.contextPercent ?? 0) : 0
  const progressColor =
    contextPercent >= 90 ? 'text-danger-100' : contextPercent >= 70 ? 'text-warning-100' : 'text-text-400'
  const progressFillClass =
    contextPercent >= 90 ? 'bg-danger-100' : contextPercent >= 70 ? 'bg-warning-100' : 'bg-accent-main-100'
  const sources = useMemo(() => computeContextSources(messages), [messages])

  const updateTooltipPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    setTooltipPosition({
      top: Math.max(8, rect.top - 8),
      left: Math.min(window.innerWidth - 12, rect.right + 8),
    })
  }, [])

  const showTooltip = useCallback(() => {
    updateTooltipPosition()
    setTooltipOpen(true)
  }, [updateTooltipPosition])

  useEffect(() => {
    if (!tooltipOpen) return

    updateTooltipPosition()
    window.addEventListener('resize', updateTooltipPosition)
    window.addEventListener('scroll', updateTooltipPosition, true)
    return () => {
      window.removeEventListener('resize', updateTooltipPosition)
      window.removeEventListener('scroll', updateTooltipPosition, true)
    }
  }, [tooltipOpen, updateTooltipPosition])

  return (
    <div className="relative shrink-0" onMouseEnter={showTooltip} onMouseLeave={() => setTooltipOpen(false)}>
      <button
        ref={buttonRef}
        type="button"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-400 transition-colors hover:bg-bg-200 hover:text-text-100"
        aria-label={t('contextIndicator.label')}
        onClick={() => {
          setTooltipOpen(false)
          setDetailsOpen(true)
        }}
        onFocus={showTooltip}
        onBlur={() => setTooltipOpen(false)}
      >
        <CircularProgress
          progress={contextPercent / 100}
          size={18}
          strokeWidth={3}
          trackClassName="text-text-500/25"
          progressClassName={progressColor}
        />
      </button>

      {tooltipOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed z-[10000] w-60 rounded-lg border border-border-200/70 bg-bg-000/95 px-3 py-2 text-center shadow-xl backdrop-blur-md"
              style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                transform: 'translate(-100%, -100%)',
              }}
              onMouseEnter={showTooltip}
              onMouseLeave={() => setTooltipOpen(false)}
            >
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-300">
                <div className={`h-full rounded-full ${progressFillClass}`} style={{ width: `${contextPercent}%` }} />
              </div>
              <div className="mt-1 text-[length:var(--fs-sm)] font-semibold leading-5 tabular-nums text-text-100">
                {formatTokens(contextUsed)}/{contextLimit > 0 ? formatTokens(contextLimit) : '—'}
              </div>
              <div className="mt-1.5 border-t border-border-200/50 pt-1.5">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-1 rounded text-[length:var(--fs-xxs)] font-medium text-text-400 transition-colors hover:text-text-200"
                  onClick={() => setSourcesOpen(value => !value)}
                  aria-expanded={sourcesOpen}
                >
                  <ChevronDownIcon size={12} className={`transition-transform ${sourcesOpen ? 'rotate-180' : ''}`} />
                  {t('contextDetails.sources')}
                </button>
                {sourcesOpen && (
                  <div className="mt-1.5 space-y-1.5">
                    {sources.map(source => (
                      <div key={source.type}>
                        <div className="mb-0.5 flex justify-between text-[length:var(--fs-xxs)] text-text-400">
                          <span className="truncate">
                            {source.type} · {source.count}
                          </span>
                          <span className="tabular-nums">{source.percent}%</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-bg-300">
                          <div
                            className="h-full rounded-full bg-accent-main-100/70"
                            style={{ width: `${source.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      <ContextDetailsDialog isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} contextLimit={contextLimit} />
    </div>
  )
}

export function InputToolbar({
  paneId,
  agents,
  selectedAgent,
  onAgentChange,
  variants = [],
  selectedVariant,
  onVariantChange,
  fileCapabilities,
  onFilesSelected,
  onAddReference,
  onAddCommand,
  isStreaming,
  isSending = false,
  onAbort,
  canSend,
  onSend,
  models = [],
  selectedModelKey = null,
  onModelChange,
  modelsLoading = false,
  inputContainerRef,
  modelSelectorRef,
  contextStats,
  hasMessages = false,
  voiceSupported = false,
  voiceListening = false,
  voiceTranscribing = false,
  onVoiceToggle,
}: InputToolbarProps) {
  const { t } = useTranslation(['chat', 'common'])
  const { presentation } = useChatViewport()
  const isCompact = presentation.isCompact

  // 根据模型能力计算支持的文件类型
  const caps = fileCapabilities ?? { image: false, pdf: false, audio: false, video: false }
  const supportsAnyFile = true
  const controlsDisabled = isSending
  const selectedVariantLabel = getVariantLabel(selectedVariant, t)

  const acceptString = useMemo(() => {
    const accept: string[] = []

    accept.push(...DOCUMENT_FILE_MIMES, ...DOCUMENT_FILE_EXTENSIONS.map(extension => `.${extension}`))

    if (caps.image) {
      accept.push('image/*')
    }
    if (caps.audio) {
      accept.push('audio/*')
    }
    if (caps.video) {
      accept.push('video/*')
    }

    return accept.join(',')
  }, [caps.image, caps.audio, caps.video])
  // State for menus
  const [agentMenuOpen, setAgentMenuOpen] = useState(false)
  const [variantMenuOpen, setVariantMenuOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  // Refs
  const agentTriggerRef = useRef<HTMLButtonElement>(null)
  const agentMenuRef = useRef<HTMLDivElement>(null)
  const variantTriggerRef = useRef<HTMLButtonElement>(null)
  const variantMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addTriggerRef = useRef<HTMLButtonElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const agentMenuFocusRef = useRef<'selected' | 'first' | 'last'>('selected')
  const variantMenuFocusRef = useRef<'selected' | 'first' | 'last'>('selected')
  const agentMenuId = 'input-toolbar-agent-menu'
  const variantMenuId = 'input-toolbar-variant-menu'

  const focusComposerInput = useCallback(() => {
    const input = inputContainerRef?.current?.querySelector<HTMLElement>(
      'textarea, input:not([type="file"]):not([disabled]), [contenteditable="true"]',
    )
    input?.focus()
  }, [inputContainerRef])

  const closeMenuToComposer = useCallback(
    (close: () => void) => {
      close()
      window.setTimeout(focusComposerInput, 0)
    },
    [focusComposerInput],
  )

  const focusMenuItem = useCallback((menu: HTMLDivElement | null, mode: 'selected' | 'first' | 'last') => {
    if (!menu) return

    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"], button'))
    if (items.length === 0) return

    const selectedItem = menu.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')
    const target = mode === 'first' ? items[0] : mode === 'last' ? items[items.length - 1] : selectedItem ?? items[0]
    target?.focus()
  }, [])

  const focusRelativeToTrigger = useCallback((trigger: HTMLButtonElement | null, direction: 1 | -1) => {
    if (!trigger) return

    const focusables = Array.from(
      document.body.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(element => {
      if (element.closest('[aria-hidden="true"]')) return false
      const style = window.getComputedStyle(element)
      return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0'
    })
    const currentIndex = focusables.findIndex(item => item === trigger)
    if (currentIndex === -1) return
    const nextIndex = currentIndex + direction
    focusables[nextIndex]?.focus()
  }, [])

  const isFocusableElement = useCallback((target: EventTarget | null) => {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
    if (!element) return false
    const candidate = element.closest<HTMLElement>(
      'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (!candidate) return false

    const style = window.getComputedStyle(candidate)
    return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0'
  }, [])

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, menu: HTMLDivElement | null, onClose: () => void, trigger: HTMLButtonElement | null) => {
      const items = Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"], button') ?? [])
      if (items.length === 0) {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
          trigger?.focus()
        }
        return
      }

      const currentIndex = items.findIndex(item => item === document.activeElement)
      const focusByIndex = (index: number) => items[index]?.focus()

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length
        focusByIndex(nextIndex)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        const nextIndex = currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length
        focusByIndex(nextIndex)
      } else if (event.key === 'Home') {
        event.preventDefault()
        focusByIndex(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        focusByIndex(items.length - 1)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        trigger?.focus()
      } else if (event.key === 'Tab') {
        event.preventDefault()
        onClose()
        window.setTimeout(() => {
          focusRelativeToTrigger(trigger, event.shiftKey ? -1 : 1)
        }, 0)
      }
    },
    [focusRelativeToTrigger],
  )

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Click outside logic
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        agentMenuOpen &&
        !agentMenuRef.current?.contains(e.target as Node) &&
        !agentTriggerRef.current?.contains(e.target as Node)
      ) {
        setAgentMenuOpen(false)
        if (!isFocusableElement(e.target)) {
          agentTriggerRef.current?.focus()
        }
      }
      if (
        variantMenuOpen &&
        !variantMenuRef.current?.contains(e.target as Node) &&
        !variantTriggerRef.current?.contains(e.target as Node)
      ) {
        setVariantMenuOpen(false)
        if (!isFocusableElement(e.target)) {
          variantTriggerRef.current?.focus()
        }
      }
      if (
        addMenuOpen &&
        !addMenuRef.current?.contains(e.target as Node) &&
        !addTriggerRef.current?.contains(e.target as Node)
      ) {
        setAddMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [addMenuOpen, agentMenuOpen, variantMenuOpen, isFocusableElement])

  useEffect(() => {
    if (!agentMenuOpen) return
    const timerId = window.setTimeout(() => {
      focusMenuItem(agentMenuRef.current, agentMenuFocusRef.current)
    }, 0)
    return () => clearTimeout(timerId)
  }, [agentMenuOpen, focusMenuItem])

  useEffect(() => {
    if (!variantMenuOpen) return
    const timerId = window.setTimeout(() => {
      focusMenuItem(variantMenuRef.current, variantMenuFocusRef.current)
    }, 0)
    return () => clearTimeout(timerId)
  }, [variantMenuOpen, focusMenuItem])

  const selectableAgents = useMemo(() => selectableAgentsInDisplayOrder(agents), [agents])
  const currentAgent = agents.find(a => a.name === selectedAgent)
  const currentAgentDescription = currentAgent ? getAgentDescription(currentAgent, t) : undefined

  return (
    <div className="flex items-center justify-between px-3 pt-2 pb-1.5 relative">
      {/* Left side: Agent selector */}
      <div className={`flex items-center min-w-0 ${isCompact ? 'gap-1' : 'gap-2'}`}>
        {supportsAnyFile && (
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            multiple
            className="hidden"
            onChange={e => {
              onFilesSelected(Array.from(e.target.files ?? []))
              e.currentTarget.value = ''
            }}
          />
        )}
        <div className="relative shrink-0">
          <IconButton
            ref={addTriggerRef}
            aria-label={t('inputToolbar.addContent')}
            disabled={controlsDisabled}
            onClick={() => setAddMenuOpen(value => !value)}
          >
            <PlusIcon />
          </IconButton>
          <DropdownMenu
            triggerRef={addTriggerRef}
            isOpen={addMenuOpen}
            position="top"
            align="left"
            constrainToRef={inputContainerRef}
          >
            <div ref={addMenuRef} role="menu" aria-label={t('inputToolbar.addContent')}>
              <MenuItem
                label={t('inputToolbar.attachFile')}
                description={t('inputToolbar.attachFileDesc')}
                icon={<PaperclipIcon />}
                disabled={!supportsAnyFile}
                onClick={() => {
                  setAddMenuOpen(false)
                  void handleFileClick()
                }}
              />
              <MenuItem
                label={t('inputToolbar.addReference')}
                description={t('inputToolbar.addReferenceDesc')}
                icon={<LinkIcon />}
                onClick={() => {
                  onAddReference?.()
                  closeMenuToComposer(() => setAddMenuOpen(false))
                }}
              />
              <MenuItem
                label={t('inputToolbar.addCommand')}
                description={t('inputToolbar.addCommandDesc')}
                icon={<ChevronDownIcon className="-rotate-90" />}
                onClick={() => {
                  onAddCommand?.()
                  closeMenuToComposer(() => setAddMenuOpen(false))
                }}
              />
            </div>
          </DropdownMenu>
        </div>

        {/* Agent Selector */}
        <AnimatedPresence show={selectableAgents.length > 1} className={isCompact ? 'shrink-0' : ''}>
          <div className="relative">
            <button
              ref={agentTriggerRef}
              type="button"
              onClick={() => {
                agentMenuFocusRef.current = 'selected'
                setAgentMenuOpen(!agentMenuOpen)
              }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  agentMenuFocusRef.current = e.key === 'ArrowUp' ? 'last' : 'first'
                  setAgentMenuOpen(true)
                }
              }}
              disabled={controlsDisabled}
              aria-haspopup="menu"
              aria-expanded={agentMenuOpen}
              aria-controls={agentMenuOpen ? agentMenuId : undefined}
              className="flex items-center gap-1.5 px-2 py-1.5 text-[length:var(--fs-base)] rounded-lg transition-all duration-150 hover:bg-bg-200 active:scale-95 cursor-pointer min-w-0 overflow-hidden w-full"
              title={
                currentAgent
                  ? `${getAgentLabel(currentAgent.name, t)}${currentAgentDescription ? ': ' + currentAgentDescription : ''}`
                  : selectedAgent || 'build'
              }
            >
              {/* 紧凑信息流隐藏 AgentIcon 节省空间 */}
              <span
                className={`text-text-400 shrink-0 ${isCompact ? 'hidden' : ''}`}
              >
                <AgentModeIcon name={selectedAgent || 'build'} color={currentAgent?.color} />
              </span>
              <span className="text-[length:var(--fs-sm)] text-text-300 truncate">{getAgentLabel(selectedAgent || 'build', t)}</span>
              <span className={`text-text-400 shrink-0 ${isCompact ? 'hidden' : ''}`}>
                <ChevronDownIcon />
              </span>
            </button>

            <DropdownMenu
              triggerRef={agentTriggerRef}
              isOpen={agentMenuOpen}
              position="top"
              align="left"
              constrainToRef={inputContainerRef}
            >
              <div
                id={agentMenuId}
                ref={agentMenuRef}
                role="menu"
                aria-label="Agent menu"
                onKeyDown={event =>
                  handleMenuKeyDown(event, agentMenuRef.current, () => setAgentMenuOpen(false), agentTriggerRef.current)
                }
              >
                {selectableAgents.map(agent => (
                  <MenuItem
                    key={agent.name}
                    label={getAgentLabel(agent.name, t)}
                    description={getAgentDescription(agent, t)}
                    icon={
                      <span className="text-text-400">
                        <AgentModeIcon name={agent.name} color={agent.color} />
                      </span>
                    }
                    selected={selectedAgent === agent.name}
                    selectionRole="menuitemradio"
                    onClick={() => {
                      onAgentChange?.(agent.name)
                      closeMenuToComposer(() => setAgentMenuOpen(false))
                    }}
                  />
                ))}
              </div>
            </DropdownMenu>
          </div>
        </AnimatedPresence>

        <ApprovalModeSelector paneId={paneId} disabled={controlsDisabled} inputContainerRef={inputContainerRef} />

      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 min-w-0">
        <ContextUsageIndicator stats={contextStats} hasMessages={hasMessages} />
        {voiceSupported && <button type="button" onClick={onVoiceToggle} disabled={controlsDisabled || voiceTranscribing} aria-pressed={voiceListening} aria-label={t(voiceTranscribing ? 'inputToolbar.transcribingVoice' : voiceListening ? 'inputToolbar.stopVoice' : 'inputToolbar.startVoice')} title={t(voiceTranscribing ? 'inputToolbar.transcribingVoice' : voiceListening ? 'inputToolbar.stopVoice' : 'inputToolbar.startVoice')} className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-60 ${voiceListening ? 'bg-danger-100/10 text-danger-100' : voiceTranscribing ? 'text-accent-main-100' : 'text-text-400 hover:bg-bg-200 hover:text-text-100'}`}><MicrophoneIcon size={15} className={voiceTranscribing ? 'animate-pulse' : undefined} />{voiceListening && <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-danger-100" />}</button>}
        {onModelChange && (
          <div className="min-w-0 max-w-[180px]">
            <ModelSelector
              ref={modelSelectorRef}
              models={models}
              selectedModelKey={selectedModelKey}
              onSelect={onModelChange}
              isLoading={modelsLoading}
              position="top"
              trigger="toolbar"
              constrainToRef={inputContainerRef}
            />
          </div>
        )}
        <AnimatedPresence show={variants.length > 0} className="shrink-0">
          <div className="relative">
            <button
              ref={variantTriggerRef}
              type="button"
              onClick={() => {
                variantMenuFocusRef.current = 'selected'
                setVariantMenuOpen(!variantMenuOpen)
              }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  variantMenuFocusRef.current = e.key === 'ArrowUp' ? 'last' : 'first'
                  setVariantMenuOpen(true)
                }
              }}
              disabled={controlsDisabled}
              aria-haspopup="menu"
              aria-expanded={variantMenuOpen}
              aria-controls={variantMenuOpen ? variantMenuId : undefined}
              className="flex items-center gap-1.5 px-2 py-1.5 text-[length:var(--fs-base)] rounded-lg transition-all duration-150 hover:bg-bg-200 active:scale-95 cursor-pointer min-w-0 overflow-hidden w-full"
              title={
                selectedVariantLabel
              }
            >
              <span className="text-text-400 shrink-0">
                <ThinkingIcon />
              </span>
              <span className="text-[length:var(--fs-sm)] text-text-300 truncate">
                {selectedVariantLabel}
              </span>
              <span className="text-text-400 shrink-0">
                <ChevronDownIcon />
              </span>
            </button>

            <DropdownMenu
              triggerRef={variantTriggerRef}
              isOpen={variantMenuOpen}
              position="top"
              align="left"
              minWidth="auto"
              constrainToRef={inputContainerRef}
            >
              <div
                id={variantMenuId}
                ref={variantMenuRef}
                role="menu"
                aria-label="Variant menu"
                onKeyDown={event =>
                  handleMenuKeyDown(event, variantMenuRef.current, () => setVariantMenuOpen(false), variantTriggerRef.current)
                }
              >
                <MenuItem
                  label={getVariantLabel(undefined, t)}
                  selected={!selectedVariant}
                  selectionRole="menuitemradio"
                  onClick={() => {
                    onVariantChange?.(undefined)
                    closeMenuToComposer(() => setVariantMenuOpen(false))
                  }}
                />
                {variants.map(variant => (
                  <MenuItem
                    key={variant}
                    label={getVariantLabel(variant, t)}
                    selected={selectedVariant === variant}
                    selectionRole="menuitemradio"
                    onClick={() => {
                      onVariantChange?.(variant)
                      closeMenuToComposer(() => setVariantMenuOpen(false))
                    }}
                  />
                ))}
              </div>
            </DropdownMenu>
          </div>
        </AnimatedPresence>
        {!canSend && isStreaming && !isSending ? (
          <IconButton aria-label={t('inputToolbar.stopGeneration')} variant="solid" onClick={onAbort}>
            <StopIcon />
          </IconButton>
        ) : (
          <IconButton
            aria-label={isSending ? t('inputToolbar.sendingMessage') : t('inputToolbar.sendMessage')}
            variant="solid"
            disabled={!canSend || isSending}
            onClick={() => onSend()}
            data-codex-btn="send"
          >
            <SendIcon />
          </IconButton>
        )}
      </div>
    </div>
  )
}
