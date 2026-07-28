import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderIcon, ArrowUpIcon, SpinnerIcon, PlusIcon, ChevronDownIcon, ClockIcon } from '../../components/Icons'
import { listDirectory, getPath } from '../../api'
import { fileErrorHandler, getDirectoryName } from '../../utils'
import { Dialog } from '../../components/ui/Dialog'
import { isElectron, getDesktopPlatform } from '../../utils/platform'
import { useDirectory } from '../../contexts/useDirectory'

// ============================================
// Types
// ============================================

interface ProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (path: string) => void
  initialPath?: string
}

interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory'
}

// ============================================
// Constants
// ============================================

// 始终使用正斜杠显示
const PATH_SEP = '/'

// ============================================
// Utils
// ============================================

function normalizePath(p: string): string {
  if (!p) return ''
  // 只转换反斜杠为正斜杠，保留尾斜杠（不能用 normalizeToForwardSlash，它会删尾斜杠）
  return p.replace(/\\/g, '/')
}

function getDirectoryPath(path: string): string {
  const normalized = normalizePath(path)
  if (normalized.endsWith(PATH_SEP)) return normalized
  const lastSep = normalized.lastIndexOf(PATH_SEP)
  if (lastSep < 0) return '.' + PATH_SEP
  return normalized.substring(0, lastSep + 1)
}

function getFilterText(path: string): string {
  const normalized = normalizePath(path)
  if (normalized.endsWith(PATH_SEP)) return ''
  const lastSep = normalized.lastIndexOf(PATH_SEP)
  return normalized.substring(lastSep + 1)
}

// ============================================
// Component
// ============================================

export function ProjectDialog({ isOpen, onClose, onSelect, initialPath = '' }: ProjectDialogProps) {
  const { t } = useTranslation(['chat', 'common'])
  const { savedDirectories, recentProjects } = useDirectory()
  // State
  const [inputValue, setInputValue] = useState('')
  const [items, setItems] = useState<FileItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drives, setDrives] = useState<string[]>([])

  // Refs
  const loadedPathRef = useRef<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingSelectionRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)

  // Windows 盘符检测
  const isWin = isElectron() && getDesktopPlatform() === 'windows'

  // 当前盘符（从 inputValue 提取，不含冒号）
  const currentDrive = useMemo(() => {
    if (!isWin) return ''
    const match = inputValue.match(/^([a-zA-Z]):/i)
    return match ? match[1].toUpperCase() : (drives[0]?.replace(':', '') ?? '')
  }, [inputValue, isWin, drives])

  // Computed
  const currentDir = useMemo(() => getDirectoryPath(inputValue), [inputValue])
  const filterText = useMemo(() => getFilterText(inputValue), [inputValue])

  const filteredItems = useMemo(() => {
    if (!filterText) return items
    const lower = filterText.toLowerCase()
    return items.filter(item => item.name.toLowerCase().startsWith(lower))
  }, [items, filterText])

  const recentDirectories = useMemo(
    () =>
      [...savedDirectories]
        .toSorted((a, b) => (recentProjects[b.path] ?? b.addedAt) - (recentProjects[a.path] ?? a.addedAt))
        .slice(0, 5),
    [recentProjects, savedDirectories],
  )

  // ==========================================
  // Initialize
  // ==========================================

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    const timer = window.setTimeout(() => {
      loadedPathRef.current = ''
      setItems([])

      const initPath = async () => {
        let path = initialPath
        if (!path) {
          try {
            const p = await getPath()
            path = p.home
          } catch {
            /* ignore */
          }
        }

        if (cancelled) return

        path = normalizePath(path)
        if (!path.endsWith(PATH_SEP)) path += PATH_SEP
        setInputValue(path)
        setSelectedIndex(0)
        pendingSelectionRef.current = null
        setTimeout(() => inputRef.current?.focus(), 50)
      }

      void initPath()
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isOpen, initialPath])

  // ==========================================
  // Load Windows Drives
  // ==========================================

  useEffect(() => {
    if (!isOpen || !isWin) return
    let cancelled = false
    window.customOpenCode?.listDrives().then(d => {
      if (!cancelled && d.length > 0) setDrives(d)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [isOpen, isWin])

  // ==========================================
  // Load Directory
  // ==========================================

  useEffect(() => {
    if (!isOpen || !currentDir) return
    // 目录变化时始终重新加载
    if (currentDir === loadedPathRef.current) return

    let cancelled = false
    const requestId = ++requestIdRef.current
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)

      listDirectory(currentDir)
        .then(nodes => {
          if (cancelled || requestId !== requestIdRef.current) return

          const fileItems = nodes
            .filter(n => n.type === 'directory')
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(n => ({
              name: n.name,
              path: normalizePath(n.absolute),
              type: n.type,
            }))

          setItems(fileItems)
          loadedPathRef.current = currentDir

          if (pendingSelectionRef.current) {
            const idx = fileItems.findIndex(item => item.name === pendingSelectionRef.current)
            setSelectedIndex(idx !== -1 ? idx : 0)
            pendingSelectionRef.current = null
          } else {
            setSelectedIndex(0)
          }
        })
        .catch(err => {
          if (cancelled || requestId !== requestIdRef.current) return
          fileErrorHandler('list directory', err)
          setError(err.message)
          setItems([])
          loadedPathRef.current = ''
        })
        .finally(() => {
          if (!cancelled && requestId === requestIdRef.current) {
            setIsLoading(false)
          }
        })
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isOpen, currentDir])

  // ==========================================
  // Scroll to Selection
  // ==========================================

  useEffect(() => {
    const el = document.getElementById(`project-item-${selectedIndex}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, filteredItems])

  // ==========================================
  // Handlers
  // ==========================================

  const handleGoBack = useCallback(() => {
    let current = inputValue
    if (!current.endsWith(PATH_SEP)) {
      current = getDirectoryPath(current)
    } else {
      current = current.slice(0, -1)
    }

    const parent = getDirectoryPath(current)
    if (parent && parent !== current + PATH_SEP) {
      const folderName = current.split(PATH_SEP).pop()
      if (folderName) pendingSelectionRef.current = folderName
      setInputValue(parent)
    }
  }, [inputValue])

  const handleItemClick = useCallback((item: FileItem) => {
    setInputValue(item.path + PATH_SEP)
    inputRef.current?.focus()
  }, [])

  const handleSelectFolder = useCallback(
    (folderPath: string) => {
      onSelect(folderPath)
      onClose()
    },
    [onSelect, onClose],
  )

  const handleConfirmCurrent = useCallback(() => {
    // 去掉尾斜杠，但保留根路径（/ 或 C:/）
    let path = inputValue
    if (path.endsWith(PATH_SEP) && path !== PATH_SEP && !/^[a-zA-Z]:\/$/.test(path)) {
      path = path.slice(0, -1)
    }
    // 只阻止空路径和 "."
    if (!path || path === '.') return
    onSelect(path)
    onClose()
  }, [inputValue, onSelect, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'ArrowRight':
        case 'Tab':
          if (filteredItems.length > 0) {
            e.preventDefault()
            const selected = filteredItems[selectedIndex]
            setInputValue(selected.path + PATH_SEP)
            setSelectedIndex(0)
          }
          break
        case 'ArrowLeft': {
          const inputEl = e.currentTarget as HTMLInputElement
          const isAtStart = inputEl.selectionStart === 0 && inputEl.selectionEnd === 0
          if (isAtStart || inputValue.endsWith(PATH_SEP)) {
            e.preventDefault()
            handleGoBack()
          }
          break
        }
        case 'Enter':
          e.preventDefault()
          if (filteredItems.length > 0) {
            const selectedPath = filteredItems[selectedIndex].path
            if (selectedPath) {
              onSelect(selectedPath)
              onClose()
            }
          } else {
            // 去掉尾斜杠，但保留根路径（/ 或 C:/）
            let path = inputValue
            if (path.endsWith(PATH_SEP) && path !== PATH_SEP && !/^[a-zA-Z]:\/$/.test(path)) {
              path = path.slice(0, -1)
            }
            if (path && path !== '.') {
              onSelect(path)
              onClose()
            }
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [filteredItems, selectedIndex, inputValue, handleGoBack, onSelect, onClose],
  )

  // ==========================================
  // Render
  // ==========================================

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      rawContent
      width={560}
      showCloseButton={false}
      allowTouchBackdropClose
      className="h-[min(460px,100%)]"
    >
      {/* Header */}
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Drive selector (Windows only) */}
          {isWin && drives.length > 0 && (
            <div className="relative shrink-0">
              <select
                value={currentDrive}
                onChange={e => {
                  const drive = e.target.value
                  if (drive) {
                    setInputValue(drive + ':/')
                    inputRef.current?.focus()
                  }
                }}
                className="appearance-none h-[38px] pl-3 pr-7 bg-bg-000/40 rounded-lg border border-border-200/60 text-[length:var(--fs-base)] text-text-100 outline-none focus:border-accent-main-100/50 transition-colors cursor-pointer"
              >
                {drives.map(d => {
                  const letter = d.replace(':', '')
                  return <option key={letter} value={letter}>{letter}</option>
                })}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-400 pointer-events-none" size={14} />
            </div>
          )}

          {/* Path input */}
          <div className="relative flex-1 bg-bg-000/40 rounded-lg border border-border-200/60 flex items-center px-3 py-2.5">
            <FolderIcon className="text-text-400 w-4 h-4 shrink-0 mr-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => {
                setInputValue(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('projectDialog.typePath')}
              className="flex-1 bg-transparent border-none !outline-none !ring-0 !shadow-none text-[length:var(--fs-base)] text-text-100 placeholder:text-text-400 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            {isLoading && <SpinnerIcon className="animate-spin text-text-400 w-4 h-4" size={16} />}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 custom-scrollbar">
        {error ? (
          <div className="flex items-center justify-center h-full text-danger-100 text-[length:var(--fs-sm)] px-4 text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-0.5">
            {!filterText && recentDirectories.length > 0 && (
              <div className="mb-2 rounded-lg border border-border-200/45 bg-bg-100/35 p-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[length:var(--fs-xxs)] font-medium uppercase tracking-wide text-text-500">
                  <ClockIcon size={12} />
                  {t('projectDialog.recentProjects')}
                </div>
                {recentDirectories.map(directory => (
                  <button
                    key={directory.path}
                    type="button"
                    onClick={() => handleSelectFolder(directory.path)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-200/60"
                    title={directory.path}
                  >
                    <FolderIcon size={14} className="shrink-0 text-text-400" />
                    <span className="min-w-0 flex-1 truncate text-[length:var(--fs-sm)] text-text-200">{directory.name || getDirectoryName(directory.path) || directory.path}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Go Up */}
            {inputValue.split(PATH_SEP).filter(Boolean).length > 0 && !(isWin && /^[a-zA-Z]:\/?$/.test(inputValue)) && (
              <ListItem
                id="project-item-up"
                icon={<ArrowUpIcon className="w-3.5 h-3.5" />}
                label={t('projectDialog.parent')}
                isSelected={selectedIndex === -1}
                onClick={() => {
                  handleGoBack()
                  inputRef.current?.focus()
                }}
                onMouseEnter={() => setSelectedIndex(-1)}
              />
            )}

            {/* Empty State */}
            {filteredItems.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-28 text-text-400/60 text-[length:var(--fs-sm)] gap-2">
                <FolderIcon className="w-6 h-6 opacity-30" />
                <span>{filterText ? t('projectDialog.noMatchingFolders') : t('common:emptyFolder')}</span>
              </div>
            )}

            {/* Items */}
            {filteredItems.map((item, index) => (
              <ListItem
                key={item.name}
                id={`project-item-${index}`}
                icon={<FolderIcon className="w-3.5 h-3.5" />}
                label={item.name}
                isSelected={index === selectedIndex}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                action={
                  index === selectedIndex && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleSelectFolder(item.path)
                      }}
                      className="flex items-center gap-1 text-[length:var(--fs-xxs)] bg-accent-main-100 hover:bg-accent-main-200 px-2 py-0.5 rounded text-oncolor-100 font-medium transition-colors"
                    >
                      <PlusIcon className="w-2.5 h-2.5" />
                      {t('common:add')}
                    </button>
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative p-3 flex items-center gap-3 shrink-0">
        <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-border-200/30" />
        <div className="text-[length:var(--fs-xxs)] text-text-400 flex-1 min-w-0 font-mono whitespace-normal break-all leading-4">
          {inputValue}
        </div>
        <button
          onClick={handleConfirmCurrent}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-000/40 hover:bg-accent-main-100/10 border border-border-200/60 hover:border-accent-main-100/30 text-text-200 hover:text-accent-main-100 rounded-md transition-colors text-[length:var(--fs-sm)] font-medium shrink-0 whitespace-nowrap"
        >
          <PlusIcon className="w-3 h-3" />
          {t('projectDialog.addCurrent')}
        </button>
      </div>
    </Dialog>
  )
}

// ============================================
// ListItem Component
// ============================================

interface ListItemProps {
  id: string
  icon: React.ReactNode
  label: string
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  action?: React.ReactNode
}

function ListItem({ id, icon, label, isSelected, onClick, onMouseEnter, action }: ListItemProps) {
  return (
    <div
      id={id}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`
        flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all duration-150
        ${
          isSelected
            ? 'bg-bg-200/60 text-text-100'
            : 'text-text-300 hover:bg-bg-200/50 hover:text-text-100'
        }
      `}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={isSelected ? 'text-accent-main-100' : 'text-text-400'}>{icon}</span>
        <span className="text-[length:var(--fs-base)] truncate">{label}</span>
      </div>
      {action}
    </div>
  )
}
