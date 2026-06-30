import { bC as reactExports, c0 as useDragEdgeAutoScroll, bO as subscribeInternalDrag, aR as getInternalDragSnapshot, bP as subscribeInternalDrop, bk as jsxRuntimeExports, aT as getMaterialIconUrl, k as CloseIcon, bN as startInternalDrag } from "./main-CbDQK4WE.js";
class ChangeScopeStore {
  modes = /* @__PURE__ */ new Map();
  subscribers = /* @__PURE__ */ new Set();
  subscribe = (fn) => {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  };
  getMode(sessionId) {
    if (!sessionId) return "turn";
    return this.modes.get(sessionId) ?? "turn";
  }
  setMode(sessionId, mode) {
    if (!sessionId) return;
    if (this.modes.get(sessionId) === mode) return;
    this.modes.set(sessionId, mode);
    this.subscribers.forEach((fn) => fn());
  }
  clearSession(sessionId) {
    if (!sessionId) return;
    if (!this.modes.delete(sessionId)) return;
    this.subscribers.forEach((fn) => fn());
  }
  clearAll() {
    if (this.modes.size === 0) return;
    this.modes.clear();
    this.subscribers.forEach((fn) => fn());
  }
}
const changeScopeStore = new ChangeScopeStore();
function useSessionChangeScope(sessionId) {
  const getSnapshot = reactExports.useCallback(() => changeScopeStore.getMode(sessionId), [sessionId]);
  return reactExports.useSyncExternalStore(changeScopeStore.subscribe, getSnapshot, getSnapshot);
}
const PreviewTabsBar = reactExports.memo(function PreviewTabsBar2({
  items,
  activeId,
  closeAllTitle,
  onActivate,
  onClose,
  onCloseAll,
  onReorder,
  rightActions,
  tabWidthClassName = "w-40 max-w-40"
}) {
  const tabsScrollRef = reactExports.useRef(null);
  const [draggedId, setDraggedId] = reactExports.useState(null);
  const [dragOverId, setDragOverId] = reactExports.useState(null);
  useDragEdgeAutoScroll(tabsScrollRef, {
    payloadKind: "preview-tab"
  });
  reactExports.useEffect(() => {
    return subscribeInternalDrag(() => {
      const active = getInternalDragSnapshot().active;
      if (!active || active.payload.kind !== "preview-tab") {
        setDraggedId(null);
        setDragOverId(null);
        return;
      }
      setDraggedId(active.payload.id);
      const target = document.elementFromPoint(active.current.x, active.current.y)?.closest("[data-preview-tab-id]");
      const targetId = target?.dataset.previewTabId;
      setDragOverId(targetId && targetId !== active.payload.id ? targetId : null);
    });
  }, []);
  reactExports.useEffect(() => {
    return subscribeInternalDrop((event) => {
      if (event.payload.kind !== "preview-tab") return;
      const target = document.elementFromPoint(event.point.x, event.point.y)?.closest("[data-preview-tab-id]");
      const targetId = target?.dataset.previewTabId;
      if (targetId && targetId !== event.payload.id) {
        onReorder(event.payload.id, targetId);
      }
      setDraggedId(null);
      setDragOverId(null);
    });
  }, [onReorder]);
  const handleTabsWheel = reactExports.useCallback((event) => {
    const container = tabsScrollRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (delta === 0) return;
    event.preventDefault();
    container.scrollLeft += delta;
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center justify-between shrink-0 bg-bg-200/60 h-[30px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        ref: tabsScrollRef,
        onWheel: handleTabsWheel,
        className: "min-w-0 flex-1 h-full overflow-x-auto overflow-y-hidden no-scrollbar",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-w-max items-center h-full gap-0", children: items.map((item) => {
          const isActive = item.id === activeId;
          const isDragOver = dragOverId === item.id && draggedId !== item.id;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              "data-preview-tab-id": item.id,
              onPointerDown: (event) => {
                const target = event.target;
                if (target.closest("button")) return;
                startInternalDrag(event, { kind: "preview-tab", id: item.id });
              },
              className: isActive ? `tab-active relative z-10 mx-px flex h-full ${tabWidthClassName} shrink-0 select-none items-center gap-1 bg-bg-100 text-text-100` : `relative mx-px flex h-[24px] ${tabWidthClassName} shrink-0 select-none items-center gap-1 overflow-hidden rounded-md border-x-[5px] border-transparent bg-transparent text-text-400 hover:bg-bg-200/50 hover:text-text-100 transition-colors ${isDragOver ? "bg-accent-main-100/8" : ""}`,
              title: item.title,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => onActivate(item.id),
                    className: "flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 overflow-hidden pl-2.5 pr-1 text-left",
                    children: [
                      item.iconPath && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "img",
                        {
                          src: getMaterialIconUrl(item.iconPath, "file"),
                          alt: "",
                          width: 13,
                          height: 13,
                          draggable: false,
                          className: "shrink-0",
                          onError: (e) => {
                            e.currentTarget.style.visibility = "hidden";
                          }
                        }
                      ),
                      item.label
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: (event) => {
                      event.stopPropagation();
                      onClose(item.id);
                    },
                    className: "mr-1.5 shrink-0 rounded p-1 text-text-500 hover:bg-bg-300 hover:text-text-100 transition-colors",
                    title: item.closeTitle,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { size: 10 })
                  }
                )
              ]
            },
            item.id
          );
        }) })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5 shrink-0 px-1.5 h-full", children: [
      rightActions,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onCloseAll,
          className: "p-1 text-text-400 hover:text-text-100 hover:bg-bg-300/50 rounded transition-colors shrink-0",
          title: closeAllTitle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { size: 12 })
        }
      )
    ] })
  ] });
});
function useVerticalSplitResize({
  containerRef,
  primaryRef,
  cssVariableName,
  minPrimaryHeight,
  minSecondaryHeight,
  defaultPrimaryHeightRatio = 0.4
}) {
  const [splitHeight, setSplitHeight] = reactExports.useState(null);
  const [isResizing, setIsResizing] = reactExports.useState(false);
  const rafRef = reactExports.useRef(0);
  const currentHeightRef = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => {
    if (!isResizing && primaryRef.current && splitHeight !== null) {
      primaryRef.current.style.setProperty(cssVariableName, `${splitHeight}px`);
      currentHeightRef.current = splitHeight;
    }
  }, [cssVariableName, isResizing, primaryRef, splitHeight]);
  reactExports.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  const resetSplitHeight = reactExports.useCallback(() => {
    setSplitHeight(null);
    currentHeightRef.current = null;
  }, []);
  const applyHeight = reactExports.useCallback(
    (containerHeight, startHeight, startY, currentY) => {
      const primaryEl = primaryRef.current;
      if (!primaryEl) return;
      const deltaY = currentY - startY;
      const nextHeight = startHeight + deltaY;
      const maxHeight = containerHeight - minSecondaryHeight;
      const clampedHeight = Math.min(Math.max(nextHeight, minPrimaryHeight), maxHeight);
      primaryEl.style.setProperty(cssVariableName, `${clampedHeight}px`);
      currentHeightRef.current = clampedHeight;
    },
    [cssVariableName, minPrimaryHeight, minSecondaryHeight, primaryRef]
  );
  const finishResize = reactExports.useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (currentHeightRef.current !== null) {
      setSplitHeight(currentHeightRef.current);
    }
  }, []);
  const handleResizeStart = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      const container = containerRef.current;
      if (!container || !primaryRef.current) return;
      setIsResizing(true);
      const containerRect = container.getBoundingClientRect();
      const startY = event.clientY;
      const startHeight = currentHeightRef.current ?? containerRect.height * defaultPrimaryHeightRatio;
      const handleMouseMove = (moveEvent) => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
          applyHeight(containerRect.height, startHeight, startY, moveEvent.clientY);
        });
      };
      const handleMouseUp = () => {
        finishResize();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [applyHeight, containerRef, defaultPrimaryHeightRatio, finishResize, primaryRef]
  );
  const handleTouchResizeStart = reactExports.useCallback(
    (event) => {
      const container = containerRef.current;
      if (!container || !primaryRef.current) return;
      setIsResizing(true);
      const containerRect = container.getBoundingClientRect();
      const startY = event.touches[0].clientY;
      const startHeight = currentHeightRef.current ?? containerRect.height * defaultPrimaryHeightRatio;
      const handleTouchMove = (moveEvent) => {
        moveEvent.preventDefault();
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
          applyHeight(containerRect.height, startHeight, startY, moveEvent.touches[0].clientY);
        });
      };
      const handleTouchEnd = () => {
        finishResize();
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
    },
    [applyHeight, containerRef, defaultPrimaryHeightRatio, finishResize, primaryRef]
  );
  return {
    splitHeight,
    isResizing,
    resetSplitHeight,
    handleResizeStart,
    handleTouchResizeStart
  };
}
export {
  PreviewTabsBar as P,
  useVerticalSplitResize as a,
  changeScopeStore as c,
  useSessionChangeScope as u
};
