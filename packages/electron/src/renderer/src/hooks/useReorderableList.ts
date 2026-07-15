import { useCallback, useEffect, useRef, useState } from 'react'

interface ReorderState {
  draggedId: string
  currentOrder: string[]
}

interface UseReorderableListOptions {
  ids: string[]
  canDrag: (id: string) => boolean
  onCommit: (draggedId: string, targetId: string, order: string[]) => void
  onDragActivated?: () => void
  onDragFinished?: () => void
}

export function useReorderableList({
  ids,
  canDrag,
  onCommit,
  onDragActivated,
  onDragFinished,
}: UseReorderableListOptions) {
  const refs = useRef<Map<string, HTMLElement>>(new Map())
  const [dragState, setDragState] = useState<ReorderState | null>(null)
  const dragStartY = useRef(0)
  const latestPointerY = useRef(0)
  const dragActive = useRef(false)
  const latestOrderRef = useRef<string[]>([])
  const activationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const overlayRef = useRef<HTMLElement | null>(null)
  const indicatorRef = useRef<HTMLDivElement | null>(null)
  const draggedElementRef = useRef<HTMLElement | null>(null)
  const touchMovedRef = useRef(false)
  const touchStartYRef = useRef(0)
  const touchDragIdRef = useRef<string | null>(null)

  const clearActivationTimer = useCallback(() => {
    if (!activationTimer.current) return
    clearTimeout(activationTimer.current)
    activationTimer.current = null
  }, [])

  const clearDragVisuals = useCallback(() => {
    overlayRef.current?.remove()
    indicatorRef.current?.remove()
    if (draggedElementRef.current) delete draggedElementRef.current.dataset.reorderDragging
    overlayRef.current = null
    indicatorRef.current = null
    draggedElementRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const updateDrag = useCallback((dragId: string, pointerY: number, baseOrder: string[]) => {
    const candidates = baseOrder
      .flatMap(id => {
        if (id === dragId) return []
        const element = refs.current.get(id)
        if (!element) return []
        const rect = element.getBoundingClientRect()
        return [{ id, rect, centerY: rect.top + rect.height / 2 }]
      })
      .toSorted((left, right) => left.centerY - right.centerY)
    if (candidates.length === 0) return

    const insertIndex = candidates.findIndex(item => pointerY < item.centerY)
    const normalizedIndex = insertIndex === -1 ? candidates.length : insertIndex
    const next = candidates.map(item => item.id)
    next.splice(normalizedIndex, 0, dragId)
    latestOrderRef.current = next
    setDragState(prev => (prev ? { ...prev, currentOrder: next } : prev))

    const overlay = overlayRef.current
    if (overlay) {
      overlay.style.transform = `translate3d(0, ${pointerY - dragStartY.current}px, 0) scale(1.015)`
    }

    const previous = candidates[normalizedIndex - 1]?.rect
    const following = candidates[normalizedIndex]?.rect
    const top = previous && following ? (previous.bottom + following.top) / 2 : following?.top ?? previous?.bottom
    if (top === undefined) return

    const left = Math.min(...candidates.map(item => item.rect.left))
    const right = Math.max(...candidates.map(item => item.rect.right))
    const indicator = indicatorRef.current
    if (!indicator) return
    indicator.style.left = `${left}px`
    indicator.style.top = `${top - 1}px`
    indicator.style.width = `${right - left}px`
  }, [])

  const activateDrag = useCallback(
    (id: string, pointerY: number, currentOrder: string[]) => {
      if (dragActive.current) return
      const element = refs.current.get(id)
      if (!element) return

      clearActivationTimer()
      dragActive.current = true
      latestOrderRef.current = currentOrder
      draggedElementRef.current = element
      element.dataset.reorderDragging = 'true'
      onDragActivated?.()
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'

      const preview = element.querySelector<HTMLElement>('[data-reorder-preview]') ?? element
      const rect = preview.getBoundingClientRect()
      const overlay = preview.cloneNode(true) as HTMLElement
      overlay.removeAttribute('id')
      delete overlay.dataset.reorderDragging
      overlay.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
      overlay.classList.add('reorder-drag-overlay')
      Object.assign(overlay.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      })
      document.body.appendChild(overlay)
      overlayRef.current = overlay

      const indicator = document.createElement('div')
      indicator.className = 'reorder-drop-indicator'
      document.body.appendChild(indicator)
      indicatorRef.current = indicator

      setDragState({ draggedId: id, currentOrder })
      updateDrag(id, pointerY, currentOrder)
      requestAnimationFrame(() => {
        if (dragActive.current) updateDrag(id, latestPointerY.current, currentOrder)
      })
    },
    [clearActivationTimer, onDragActivated, updateDrag],
  )

  const suppressNextClick = useCallback(() => {
    const suppress = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      document.removeEventListener('click', suppress, true)
    }
    document.addEventListener('click', suppress, true)
    window.setTimeout(() => document.removeEventListener('click', suppress, true))
  }, [])

  const finishDrag = useCallback(
    (draggedId: string, originalOrder: string[], suppressClick: boolean) => {
      clearActivationTimer()
      const finalOrder = latestOrderRef.current
      const originalIndex = originalOrder.indexOf(draggedId)
      const nextIndex = finalOrder.indexOf(draggedId)

      if (originalIndex !== -1 && nextIndex !== -1 && originalIndex !== nextIndex) {
        const targetId = originalOrder[nextIndex]
        if (targetId) onCommit(draggedId, targetId, finalOrder)
      }

      if (suppressClick) suppressNextClick()
      setDragState(null)
      dragActive.current = false
      latestOrderRef.current = []
      clearDragVisuals()
      onDragFinished?.()
    },
    [clearActivationTimer, clearDragVisuals, onCommit, onDragFinished, suppressNextClick],
  )

  const cancelDrag = useCallback(() => {
    clearActivationTimer()
    setDragState(null)
    dragActive.current = false
    latestOrderRef.current = []
    clearDragVisuals()
    onDragFinished?.()
  }, [clearActivationTimer, clearDragVisuals, onDragFinished])

  const handlePointerStart = useCallback(
    (id: string, event: React.PointerEvent) => {
      if (!canDrag(id) || event.button !== 0 || !event.isPrimary || event.pointerType === 'touch') return

      event.stopPropagation()
      dragStartY.current = event.clientY
      latestPointerY.current = event.clientY
      dragActive.current = false
      const currentOrder = [...ids]

      activationTimer.current = setTimeout(() => {
        activateDrag(id, latestPointerY.current, currentOrder)
      }, 180)

      const onMove = (moveEvent: PointerEvent) => {
        latestPointerY.current = moveEvent.clientY
        if (!dragActive.current) {
          if (Math.abs(moveEvent.clientY - dragStartY.current) < 4) return
          activateDrag(id, moveEvent.clientY, currentOrder)
        }
        moveEvent.preventDefault()
        updateDrag(id, moveEvent.clientY, currentOrder)
      }

      const cleanupListeners = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onCancel)
      }
      const onUp = () => {
        cleanupListeners()
        if (dragActive.current) finishDrag(id, currentOrder, true)
        else clearActivationTimer()
      }
      const onCancel = () => {
        cleanupListeners()
        cancelDrag()
      }

      document.addEventListener('pointermove', onMove, { passive: false })
      document.addEventListener('pointerup', onUp)
      document.addEventListener('pointercancel', onCancel)
    },
    [activateDrag, canDrag, cancelDrag, clearActivationTimer, finishDrag, ids, updateDrag],
  )

  const handleTouchStart = useCallback(
    (id: string, event: React.TouchEvent) => {
      if (!canDrag(id)) return

      event.stopPropagation()
      touchMovedRef.current = false
      touchStartYRef.current = event.touches[0].clientY
      latestPointerY.current = event.touches[0].clientY
      touchDragIdRef.current = null

      activationTimer.current = setTimeout(() => {
        if (touchMovedRef.current) return
        const currentOrder = [...ids]
        touchDragIdRef.current = id
        dragStartY.current = touchStartYRef.current
        activateDrag(id, latestPointerY.current, currentOrder)
      }, 360)
    },
    [activateDrag, canDrag, ids],
  )

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      latestPointerY.current = event.touches[0].clientY
      if (Math.abs(event.touches[0].clientY - touchStartYRef.current) > 8) touchMovedRef.current = true

      if (activationTimer.current && touchMovedRef.current && !touchDragIdRef.current) {
        clearActivationTimer()
      }
      if (!touchDragIdRef.current) return

      event.preventDefault()
      event.stopPropagation()
      updateDrag(touchDragIdRef.current, event.touches[0].clientY, ids)
    },
    [clearActivationTimer, ids, updateDrag],
  )

  const handleTouchEnd = useCallback(() => {
    clearActivationTimer()
    if (touchDragIdRef.current) finishDrag(touchDragIdRef.current, [...ids], true)
    touchDragIdRef.current = null
  }, [clearActivationTimer, finishDrag, ids])

  useEffect(() => {
    return () => {
      clearActivationTimer()
      clearDragVisuals()
    }
  }, [clearActivationTimer, clearDragVisuals])

  return {
    draggedId: dragState?.draggedId ?? null,
    isDragging: !!dragState,
    // 拖动期间保持真实列表稳定，悬浮副本和插入线负责反馈；松手后再一次性提交顺序。
    displayOrder: ids,
    handlePointerStart,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    registerRef: (id: string, element: HTMLElement | null) => {
      if (element) refs.current.set(id, element)
      else refs.current.delete(id)
    },
  }
}
