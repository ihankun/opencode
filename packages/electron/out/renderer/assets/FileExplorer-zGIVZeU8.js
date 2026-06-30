import { cf as useTranslation, bC as reactExports, bq as listDirectory, aQ as getFileStatus, a$ as getVcsDiff, aS as getLastTurnDiff, aZ as getSessionDiff, aP as getFileContent, bk as jsxRuntimeExports, bo as layoutStore, aT as getMaterialIconUrl, Z as RetryIcon, b as AlertCircleIcon, bN as startInternalDrag, g as ChevronDownIcon, i as ChevronRightIcon, at as detectLanguage, au as downloadFileContent, aW as getPreviewCategory, bf as isBinaryContent, as as decodeBase64Text, bj as isTextualMedia, an as buildDataUrl, ao as buildTextDataUrl, l as CodePreview, r as DownloadIcon, c1 as useFullscreenLayer, I as MaximizeIcon, M as MarkdownRenderer, aH as formatMimeType } from "./main-CxRsPsI8.js";
import { u as useSessionChangeScope, a as useVerticalSplitResize, P as PreviewTabsBar } from "./useVerticalSplitResize-CIwa9Yhs.js";
function useFileExplorer(options = {}) {
  const { directory, autoLoad = true, sessionId } = options;
  const { t } = useTranslation(["components"]);
  const changeMode = useSessionChangeScope(sessionId ?? null);
  const directoryRef = reactExports.useRef(directory);
  directoryRef.current = directory;
  const [tree, setTree] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [expandedPaths, setExpandedPaths] = reactExports.useState(/* @__PURE__ */ new Set());
  const expandedPathsByDirectoryRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const [previewContent, setPreviewContent] = reactExports.useState(null);
  const [previewLoading, setPreviewLoading] = reactExports.useState(false);
  const [previewError, setPreviewError] = reactExports.useState(null);
  const previewCacheRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const previewLoadIdRef = reactExports.useRef(0);
  const [fileStatus, setFileStatus] = reactExports.useState(/* @__PURE__ */ new Map());
  const loadIdRef = reactExports.useRef(0);
  const childLoadIdsRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const statusLoadIdRef = reactExports.useRef(0);
  const loadRoot = reactExports.useCallback(async () => {
    if (!directory) return;
    const loadId = ++loadIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const nodes = await listDirectory("", directory);
      if (loadId !== loadIdRef.current) return;
      const sorted = sortNodes(nodes);
      setTree(sorted.map((n) => ({ ...n, children: n.type === "directory" ? void 0 : void 0 })));
    } catch (e) {
      if (loadId === loadIdRef.current) {
        setError(e instanceof Error ? e.message : t("fileExplorer.failedToLoadFiles"));
      }
    } finally {
      if (loadId === loadIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [directory, t]);
  const loadStatuses = reactExports.useCallback(async () => {
    if (!directory) {
      setFileStatus(/* @__PURE__ */ new Map());
      return;
    }
    const loadId = ++statusLoadIdRef.current;
    const statusMap = /* @__PURE__ */ new Map();
    try {
      if (!sessionId) {
        const status = await getFileStatus(directory);
        if (loadId !== statusLoadIdRef.current) return;
        status.forEach((item) => {
          const normalized = normalizePath(item.path);
          if (normalized.startsWith("../")) return;
          statusMap.set(normalized, { ...item, path: normalized });
        });
      } else {
        const diffs = changeMode === "git" || changeMode === "branch" ? await getVcsDiff(changeMode, directory) : changeMode === "turn" ? await getLastTurnDiff(sessionId, directory) : await getSessionDiff(sessionId, directory);
        if (loadId !== statusLoadIdRef.current) return;
        diffs.forEach((diff) => {
          const normalized = normalizePath(diff.file);
          statusMap.set(normalized, {
            path: normalized,
            added: diff.additions,
            removed: diff.deletions,
            status: getFileStatusFromDiff(diff)
          });
        });
      }
      computeDirectoryStatus(statusMap);
      setFileStatus(statusMap);
    } catch {
      if (loadId !== statusLoadIdRef.current) return;
      setFileStatus(/* @__PURE__ */ new Map());
    }
  }, [changeMode, directory, sessionId]);
  const loadChildren = reactExports.useCallback(
    async (parentPath) => {
      if (!directory) return;
      const loadKey = `${directory}\0${parentPath}`;
      const loadId = (childLoadIdsRef.current.get(loadKey) ?? 0) + 1;
      childLoadIdsRef.current.set(loadKey, loadId);
      const isCurrentLoad = () => directoryRef.current === directory && childLoadIdsRef.current.get(loadKey) === loadId;
      setTree(
        (prev) => updateTreeNode(prev, parentPath, (node) => ({
          ...node,
          isLoading: true
        }))
      );
      try {
        const nodes = await listDirectory(parentPath, directory);
        if (!isCurrentLoad()) return;
        const sorted = sortNodes(nodes);
        setTree(
          (prev) => updateTreeNode(prev, parentPath, (node) => ({
            ...node,
            children: sorted.map((n) => ({ ...n })),
            isLoading: false,
            isLoaded: true
          }))
        );
      } catch {
        if (!isCurrentLoad()) return;
        setTree(
          (prev) => updateTreeNode(prev, parentPath, (node) => ({
            ...node,
            isLoading: false,
            isLoaded: true,
            children: []
          }))
        );
      }
    },
    [directory]
  );
  const updateExpandedPaths = reactExports.useCallback(
    (updater) => {
      setExpandedPaths((prev) => {
        const next = updater(prev);
        if (directory) {
          expandedPathsByDirectoryRef.current.set(directory, new Set(next));
        }
        return next;
      });
    },
    [directory]
  );
  const toggleExpand = reactExports.useCallback(
    (path) => {
      updateExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          const node = findTreeNode(tree, path);
          if (node && node.type === "directory" && !node.isLoaded && !node.isLoading) {
            loadChildren(path);
          }
        }
        return next;
      });
    },
    [tree, loadChildren, updateExpandedPaths]
  );
  const expandPath = reactExports.useCallback(
    (path) => {
      updateExpandedPaths((prev) => {
        const next = new Set(prev);
        next.add(path);
        return next;
      });
      const node = findTreeNode(tree, path);
      if (node && node.type === "directory" && !node.isLoaded && !node.isLoading) {
        loadChildren(path);
      }
    },
    [tree, loadChildren, updateExpandedPaths]
  );
  const collapsePath = reactExports.useCallback((path) => {
    updateExpandedPaths((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, [updateExpandedPaths]);
  const loadPreview = reactExports.useCallback(
    async (path) => {
      if (!directory) return;
      const loadId = ++previewLoadIdRef.current;
      setPreviewLoading(true);
      setPreviewError(null);
      const cached = previewCacheRef.current.get(path);
      if (cached) {
        if (loadId === previewLoadIdRef.current) {
          setPreviewContent(cached);
          setPreviewLoading(false);
        }
        return;
      }
      try {
        const content = await getFileContent(path, directory);
        if (loadId !== previewLoadIdRef.current) return;
        previewCacheRef.current.set(path, content);
        setPreviewContent(content);
      } catch (e) {
        if (loadId !== previewLoadIdRef.current) return;
        setPreviewError(e instanceof Error ? e.message : t("fileExplorer.failedToLoadFile"));
        setPreviewContent(null);
      } finally {
        if (loadId === previewLoadIdRef.current) {
          setPreviewLoading(false);
        }
      }
    },
    [directory, t]
  );
  const clearPreview = reactExports.useCallback(() => {
    previewLoadIdRef.current += 1;
    setPreviewContent(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }, []);
  const refresh = reactExports.useCallback(async () => {
    if (directory) {
      expandedPathsByDirectoryRef.current.delete(directory);
    }
    setExpandedPaths(/* @__PURE__ */ new Set());
    previewCacheRef.current.clear();
    setPreviewContent(null);
    await Promise.all([loadRoot(), loadStatuses()]);
  }, [directory, loadRoot, loadStatuses]);
  reactExports.useEffect(() => {
    if (autoLoad && directory) {
      loadRoot();
    }
  }, [autoLoad, directory, loadRoot]);
  reactExports.useEffect(() => {
    if (autoLoad && directory) {
      loadStatuses();
    }
  }, [autoLoad, directory, loadStatuses]);
  reactExports.useEffect(() => {
    if (!directory) {
      setExpandedPaths(/* @__PURE__ */ new Set());
      return;
    }
    const storedPaths = expandedPathsByDirectoryRef.current.get(directory);
    setExpandedPaths(storedPaths ? new Set(storedPaths) : /* @__PURE__ */ new Set());
  }, [directory]);
  reactExports.useEffect(() => {
    if (!directory || tree.length === 0 || expandedPaths.size === 0) return;
    const pendingPaths = collectPendingExpandedDirectoryPaths(tree, expandedPaths);
    if (pendingPaths.length === 0) return;
    pendingPaths.forEach((path) => {
      void loadChildren(path);
    });
  }, [directory, expandedPaths, loadChildren, tree]);
  reactExports.useEffect(() => {
    previewCacheRef.current.clear();
    previewLoadIdRef.current += 1;
    setPreviewContent(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }, [directory, sessionId]);
  return {
    tree,
    isLoading,
    error,
    expandedPaths,
    toggleExpand,
    expandPath,
    collapsePath,
    previewContent,
    previewLoading,
    previewError,
    loadPreview,
    clearPreview,
    fileStatus,
    refresh,
    loadChildren
  };
}
function sortNodes(nodes) {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}
function findTreeNode(tree, path) {
  for (const node of tree) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findTreeNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}
function updateTreeNode(tree, path, updater) {
  return tree.map((node) => {
    if (node.path === path) {
      return updater(node);
    }
    if (node.children) {
      return {
        ...node,
        children: updateTreeNode(node.children, path, updater)
      };
    }
    return node;
  });
}
function collectPendingExpandedDirectoryPaths(tree, expandedPaths) {
  const pending = [];
  const visit = (nodes) => {
    for (const node of nodes) {
      if (node.type !== "directory") continue;
      if (expandedPaths.has(node.path)) {
        if (!node.isLoaded && !node.isLoading) {
          pending.push(node.path);
          continue;
        }
      }
      if (node.children) {
        visit(node.children);
      }
    }
  };
  visit(tree);
  return pending;
}
function normalizePath(p) {
  let result = p.replace(/\\/g, "/");
  if (result.startsWith("./")) result = result.slice(2);
  return result;
}
function getFileStatusFromDiff(diff) {
  if (diff.status) return diff.status;
  if (diff.deletions === 0 && diff.additions > 0) return "added";
  if (diff.additions === 0 && diff.deletions > 0) return "deleted";
  if (diff.before !== void 0 && diff.after !== void 0) {
    if (!diff.before.trim()) return "added";
    if (!diff.after.trim()) return "deleted";
  }
  return "modified";
}
function computeDirectoryStatus(statusMap) {
  const dirStatuses = /* @__PURE__ */ new Map();
  for (const [filePath, item] of statusMap) {
    const parts = filePath.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dirPath = parts.slice(0, i).join("/");
      const existingStatus = dirStatuses.get(dirPath);
      const newStatus = item.status;
      if (!existingStatus || newStatus === "added" || newStatus === "modified" && existingStatus === "deleted") {
        dirStatuses.set(dirPath, newStatus);
      }
    }
  }
  for (const [dirPath, status] of dirStatuses) {
    if (!statusMap.has(dirPath)) {
      statusMap.set(dirPath, { path: dirPath, added: 0, removed: 0, status });
    }
  }
}
const MIN_TREE_HEIGHT = 100;
const MIN_PREVIEW_HEIGHT = 150;
const MARKDOWN_MIME_TYPES = /* @__PURE__ */ new Set(["text/markdown", "text/x-markdown", "text/md", "application/markdown"]);
function isMarkdownPreview(language, mimeType) {
  if (language === "markdown" || language === "mdx") return true;
  if (!mimeType) return false;
  return MARKDOWN_MIME_TYPES.has(mimeType.split(";", 1)[0].toLowerCase());
}
const FileExplorer = reactExports.memo(function FileExplorer2({
  panelTabId,
  directory,
  previewFile,
  previewFiles,
  position = "right",
  isPanelResizing = false,
  sessionId
}) {
  const { t } = useTranslation(["components", "common"]);
  const containerRef = reactExports.useRef(null);
  const treeRef = reactExports.useRef(null);
  const {
    splitHeight: treeHeight,
    isResizing,
    resetSplitHeight,
    handleResizeStart,
    handleTouchResizeStart
  } = useVerticalSplitResize({
    containerRef,
    primaryRef: treeRef,
    cssVariableName: "--tree-height",
    minPrimaryHeight: MIN_TREE_HEIGHT,
    minSecondaryHeight: MIN_PREVIEW_HEIGHT
  });
  const isAnyResizing = isPanelResizing || isResizing;
  const {
    tree,
    isLoading,
    error,
    expandedPaths,
    toggleExpand,
    previewContent,
    previewLoading,
    previewError,
    loadPreview,
    clearPreview,
    fileStatus,
    refresh
  } = useFileExplorer({ directory, autoLoad: true, sessionId: sessionId || void 0 });
  reactExports.useEffect(() => {
    if (previewFile) {
      loadPreview(previewFile.path);
    } else {
      clearPreview();
    }
  }, [previewFile, loadPreview, clearPreview]);
  const handleRefresh = reactExports.useCallback(async () => {
    await refresh();
    if (previewFile) {
      await loadPreview(previewFile.path);
    }
  }, [loadPreview, previewFile, refresh]);
  const handleFileClick = reactExports.useCallback(
    (node) => {
      if (node.type === "directory") {
        toggleExpand(node.path);
      } else {
        layoutStore.openFilePreview({ path: node.path, name: node.name }, position);
      }
    },
    [toggleExpand, position]
  );
  const handleClosePreview = reactExports.useCallback(() => {
    layoutStore.closeAllFilePreviews(panelTabId);
    resetSplitHeight();
  }, [panelTabId, resetSplitHeight]);
  const handleActivatePreview = reactExports.useCallback(
    (path) => {
      layoutStore.activateFilePreview(panelTabId, path);
    },
    [panelTabId]
  );
  const handleClosePreviewTab = reactExports.useCallback(
    (path) => {
      layoutStore.closeFilePreview(panelTabId, path);
    },
    [panelTabId]
  );
  const handleReorderPreviewTabs = reactExports.useCallback(
    (draggedPath, targetPath) => {
      layoutStore.reorderFilePreviews(panelTabId, draggedPath, targetPath);
    },
    [panelTabId]
  );
  const showPreview = Boolean(previewFile) || previewLoading || Boolean(previewError);
  if (!directory) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "img",
        {
          src: getMaterialIconUrl("folder", "directory", false),
          alt: "",
          width: 32,
          height: 32,
          className: "opacity-30",
          onError: (e) => {
            e.currentTarget.style.visibility = "hidden";
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-center", children: t("fileExplorer.selectProject") })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: containerRef, className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        ref: treeRef,
        className: "overflow-hidden flex flex-col shrink-0",
        style: {
          "--tree-height": treeHeight !== null ? `${treeHeight}px` : "40%",
          height: showPreview ? "var(--tree-height)" : "100%",
          minHeight: showPreview ? MIN_TREE_HEIGHT : void 0
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-10 items-center justify-between px-3 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex h-6 items-center text-[length:var(--fs-xs)] font-medium text-text-100", children: t("fileExplorer.explorer") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: handleRefresh,
                disabled: isLoading,
                "aria-label": t("common:refresh"),
                className: "inline-flex h-6 w-6 items-center justify-center text-text-400 hover:text-text-100 hover:bg-bg-200/50 rounded-md transition-colors disabled:opacity-50",
                title: t("common:refresh"),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 12, className: isLoading ? "animate-spin" : "" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto panel-scrollbar-y", children: isLoading && tree.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-20 text-text-400 text-[length:var(--fs-sm)]", children: t("common:loading") }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-20 text-danger-100 text-[length:var(--fs-sm)] gap-1 px-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { size: 16 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-center", children: error })
          ] }) : tree.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-20 text-text-400 text-[length:var(--fs-sm)]", children: t("fileExplorer.noFilesFound") }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-1", children: tree.map((node) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FileTreeItem,
            {
              node,
              depth: 0,
              expandedPaths,
              fileStatus,
              onClick: handleFileClick
            },
            node.path
          )) }) })
        ]
      }
    ),
    showPreview && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `
            h-1.5 cursor-row-resize shrink-0 relative
            hover:bg-accent-main-100/50 active:bg-accent-main-100 transition-colors
            ${isResizing ? "bg-accent-main-100" : "bg-bg-200/60"}
          `,
        onMouseDown: handleResizeStart,
        onTouchStart: handleTouchResizeStart
      }
    ),
    showPreview && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex flex-col min-h-0", style: { minHeight: MIN_PREVIEW_HEIGHT }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      FilePreview,
      {
        previewFiles,
        path: previewFile?.path ?? null,
        content: previewContent,
        isLoading: previewLoading,
        error: previewError,
        onClose: handleClosePreview,
        onActivatePreview: handleActivatePreview,
        onClosePreview: handleClosePreviewTab,
        onReorderPreview: handleReorderPreviewTabs,
        isResizing: isAnyResizing
      }
    ) })
  ] });
});
const FileTreeItem = reactExports.memo(function FileTreeItem2({
  node,
  depth,
  expandedPaths,
  fileStatus,
  onClick
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isDirectory = node.type === "directory";
  const status = fileStatus.get(node.path) || fileStatus.get(node.path.replace(/\\/g, "/"));
  const statusColor = reactExports.useMemo(() => {
    if (!status) return null;
    switch (status.status) {
      case "added":
        return "text-success-100";
      case "modified":
        return "text-warning-100";
      case "deleted":
        return "text-danger-100";
      default:
        return null;
    }
  }, [status]);
  const handlePointerDragStart = reactExports.useCallback(
    (e) => {
      const fileData = {
        type: isDirectory ? "folder" : "file",
        path: node.path,
        // 相对路径
        absolute: node.absolute,
        // 绝对路径
        name: node.name
      };
      startInternalDrag(e, { kind: "file-mention", file: fileData });
    },
    [node.path, node.absolute, node.name, isDirectory]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onPointerDown: handlePointerDragStart,
        onClick: () => onClick(node),
        className: `
          w-full flex items-center gap-1 px-2 py-0.5 text-left cursor-default
          select-none hover:bg-bg-200/50 transition-colors text-[length:var(--fs-sm)]
          text-text-300
          ${node.ignored ? "opacity-50" : ""}
        `,
        style: { paddingLeft: `${depth * 12 + 8}px` },
        children: [
          isDirectory ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-4 h-4 flex items-center justify-center text-text-400 shrink-0", children: isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 12 }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-4 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: getMaterialIconUrl(node.path, isDirectory ? "directory" : "file", isExpanded),
              alt: "",
              width: 16,
              height: 16,
              draggable: false,
              className: "shrink-0",
              loading: "lazy",
              decoding: "async",
              onError: (e) => {
                e.currentTarget.style.visibility = "hidden";
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `truncate flex-1 ${statusColor || ""}`, children: node.name }),
          node.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-3 h-3 border border-text-400 border-t-transparent rounded-full animate-spin shrink-0" })
        ]
      }
    ),
    isDirectory && isExpanded && node.children && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: node.children.map((child) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      FileTreeItem2,
      {
        node: child,
        depth: depth + 1,
        expandedPaths,
        fileStatus,
        onClick
      },
      child.path
    )) })
  ] });
});
function FilePreview({
  previewFiles,
  path,
  content,
  isLoading,
  error,
  onClose,
  onActivatePreview,
  onClosePreview,
  onReorderPreview,
  isResizing = false
}) {
  const { t } = useTranslation(["components", "common"]);
  const scrollRef = reactExports.useRef(null);
  const fileName = path?.split(/[/\\]/).pop() || "Untitled";
  const language = path ? detectLanguage(path) : "text";
  const handleDownload = reactExports.useCallback(() => {
    if (content) {
      downloadFileContent(content, fileName);
    }
  }, [content, fileName]);
  const previewTabItems = reactExports.useMemo(
    () => previewFiles.map((file) => ({
      id: file.path,
      title: file.path,
      closeTitle: `${t("common:close")} ${file.name}`,
      iconPath: file.path,
      label: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block whitespace-nowrap text-[length:var(--fs-xs)] font-mono", children: file.name })
    })),
    [previewFiles, t]
  );
  const displayContent = reactExports.useMemo(() => {
    if (!content) return null;
    const category = getPreviewCategory(content.mimeType);
    if (isMarkdownPreview(language, content.mimeType)) {
      const text = isBinaryContent(content.encoding) ? decodeBase64Text(content.content) : content.content;
      return {
        type: "markdown",
        text
      };
    }
    if (isTextualMedia(content.mimeType)) {
      const isBase64 = isBinaryContent(content.encoding);
      const text = isBase64 ? decodeBase64Text(content.content) : content.content;
      const dataUrl = isBase64 ? buildDataUrl(content.mimeType, content.content) : buildTextDataUrl(content.mimeType, content.content);
      return {
        type: "textMedia",
        text,
        dataUrl,
        category,
        mimeType: content.mimeType
      };
    }
    if (isBinaryContent(content.encoding) && category) {
      return {
        type: "media",
        category,
        dataUrl: buildDataUrl(content.mimeType, content.content),
        mimeType: content.mimeType
      };
    }
    if (isBinaryContent(content.encoding)) {
      return {
        type: "binary",
        mimeType: content.mimeType || "application/octet-stream"
      };
    }
    return {
      type: "text",
      text: content.content
    };
  }, [content, language]);
  const fullscreenContent = reactExports.useMemo(() => {
    if (!displayContent) return null;
    switch (displayContent.type) {
      case "media":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          MediaPreview,
          {
            category: displayContent.category,
            dataUrl: displayContent.dataUrl,
            mimeType: displayContent.mimeType,
            fileName
          }
        );
      case "binary":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(BinaryPlaceholder, { mimeType: displayContent.mimeType, fileName, onDownload: handleDownload });
      case "textMedia":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextMediaPreview,
          {
            dataUrl: displayContent.dataUrl,
            text: displayContent.text,
            language: language || "xml",
            fileName,
            isResizing: false
          }
        );
      case "markdown":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownFilePreview, { text: displayContent.text, isResizing: false });
      case "text":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CodePreview, { code: displayContent.text, language: language || "text" });
      default:
        return null;
    }
  }, [displayContent, fileName, language, handleDownload]);
  const fullscreenHeaderRight = reactExports.useMemo(
    () => content ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: handleDownload,
        className: "p-1.5 text-text-400 hover:text-text-100 hover:bg-bg-200/60 rounded-lg transition-colors",
        title: `${t("common:save")} ${fileName}`,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadIcon, { size: 14 })
      }
    ) : null,
    [content, fileName, handleDownload, t]
  );
  const fullscreenLayer = reactExports.useMemo(
    () => fullscreenContent ? {
      id: `file-preview:${path || fileName}`,
      title: fileName,
      headerRight: fullscreenHeaderRight,
      content: fullscreenContent
    } : null,
    [fileName, fullscreenContent, fullscreenHeaderRight, path]
  );
  const { open: openFullscreen } = useFullscreenLayer(fullscreenLayer);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PreviewTabsBar,
      {
        items: previewTabItems,
        activeId: path,
        closeAllTitle: t("common:closeAllTabs"),
        onActivate: onActivatePreview,
        onClose: onClosePreview,
        onCloseAll: onClose,
        onReorder: onReorderPreview,
        tabWidthClassName: "w-auto max-w-none min-w-max",
        rightActions: content ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: openFullscreen,
              className: "p-1 text-text-400 hover:text-text-100 hover:bg-bg-300/50 rounded transition-colors",
              title: t("contentBlock.fullscreen"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(MaximizeIcon, { size: 12 })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleDownload,
              className: "p-1 text-text-400 hover:text-text-100 hover:bg-bg-300/50 rounded transition-colors",
              title: `${t("common:save")} ${fileName}`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadIcon, { size: 12 })
            }
          )
        ] }) : null
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: scrollRef, className: "flex-1 overflow-auto panel-scrollbar", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full text-text-400 text-[length:var(--fs-sm)]", children: t("common:loading") }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-danger-100 text-[length:var(--fs-sm)] gap-1 px-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { size: 16 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-center", children: error })
    ] }) : displayContent?.type === "media" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      MediaPreview,
      {
        category: displayContent.category,
        dataUrl: displayContent.dataUrl,
        mimeType: displayContent.mimeType,
        fileName
      }
    ) : displayContent?.type === "binary" ? /* @__PURE__ */ jsxRuntimeExports.jsx(BinaryPlaceholder, { mimeType: displayContent.mimeType, fileName, onDownload: handleDownload }) : displayContent?.type === "textMedia" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      TextMediaPreview,
      {
        dataUrl: displayContent.dataUrl,
        text: displayContent.text,
        language: language || "xml",
        fileName,
        isResizing
      }
    ) : displayContent?.type === "markdown" ? /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownFilePreview, { text: displayContent.text, isResizing }) : (
      // diff 渲染已移至 Changes 面板
      // ) : displayContent?.type === 'diff' ? (
      //   <DiffPreview hunks={displayContent.hunks} isResizing={isResizing} />
      displayContent?.type === "text" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CodePreview, { code: displayContent.text, language: language || "text", isResizing }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full text-text-400 text-[length:var(--fs-sm)]", children: t("common:noContent") })
    ) })
  ] });
}
function MediaPreview({ category, dataUrl, mimeType, fileName }) {
  switch (category) {
    case "image":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ImagePreview, { dataUrl, fileName });
    case "audio":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full gap-3 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-text-400 text-[length:var(--fs-sm)]", children: formatMimeType(mimeType) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("audio", { controls: true, src: dataUrl, className: "w-full max-w-xs" })
      ] });
    case "video":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("video", { controls: true, src: dataUrl, className: "max-w-full max-h-full rounded" }) });
    case "pdf":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("iframe", { src: dataUrl, title: fileName, className: "w-full h-full border-0" });
  }
}
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const ZOOM_FACTOR = 1.15;
function ImagePreview({ dataUrl, fileName }) {
  const { t } = useTranslation(["components", "common"]);
  const containerRef = reactExports.useRef(null);
  const [naturalSize, setNaturalSize] = reactExports.useState({ w: 0, h: 0 });
  const scaleRef = reactExports.useRef(1);
  const [scale, setScale] = reactExports.useState(1);
  const [fitScale, setFitScale] = reactExports.useState(1);
  const [translate, setTranslate] = reactExports.useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = reactExports.useState(false);
  const dragRef = reactExports.useRef({ active: false, startX: 0, startY: 0 });
  const computeFitScale = reactExports.useCallback(
    (el) => {
      if (!el || !naturalSize.w || !naturalSize.h) return 1;
      const rect = el.getBoundingClientRect();
      return Math.min(rect.width / naturalSize.w, rect.height / naturalSize.h, 1);
    },
    [naturalSize]
  );
  reactExports.useEffect(() => {
    const container = containerRef.current;
    if (!container || !naturalSize.w || !naturalSize.h) return;
    const updateFitScale = () => {
      const nextFitScale = computeFitScale(container);
      setFitScale(nextFitScale);
      if (!initialized) {
        scaleRef.current = nextFitScale;
        setScale(nextFitScale);
        setTranslate({ x: 0, y: 0 });
        setInitialized(true);
      }
    };
    updateFitScale();
    const resizeObserver = new ResizeObserver(updateFitScale);
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [naturalSize, initialized, computeFitScale]);
  reactExports.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      const oldScale = scaleRef.current;
      const newScale = Math.min(Math.max(oldScale * factor, MIN_ZOOM), MAX_ZOOM);
      const ratio = newScale / oldScale;
      scaleRef.current = newScale;
      setScale(newScale);
      setTranslate((t2) => ({
        x: cx - ratio * (cx - t2.x),
        y: cy - ratio * (cy - t2.y)
      }));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);
  reactExports.useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      setTranslate((t2) => ({ x: t2.x + dx, y: t2.y + dy }));
    };
    const onUp = () => {
      if (dragRef.current.active) {
        dragRef.current.active = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);
  const handleMouseDown = reactExports.useCallback((e) => {
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }, []);
  const zoomIn = reactExports.useCallback(() => {
    const s = Math.min(scaleRef.current * 1.25, MAX_ZOOM);
    scaleRef.current = s;
    setScale(s);
  }, []);
  const zoomOut = reactExports.useCallback(() => {
    const s = Math.max(scaleRef.current / 1.25, MIN_ZOOM);
    scaleRef.current = s;
    setScale(s);
  }, []);
  const zoomFit = reactExports.useCallback(() => {
    scaleRef.current = fitScale;
    setScale(fitScale);
    setTranslate({ x: 0, y: 0 });
  }, [fitScale]);
  const zoomActual = reactExports.useCallback(() => {
    scaleRef.current = 1;
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);
  const isFit = Math.abs(scale - fitScale) < 1e-3 && translate.x === 0 && translate.y === 0;
  const isActual = Math.abs(scale - 1) < 1e-3 && translate.x === 0 && translate.y === 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 flex items-center justify-center gap-1.5 px-2 py-1 border-b border-border-100/30 bg-bg-100/50 text-[length:var(--fs-xxs)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: zoomOut,
          className: "px-1.5 py-0.5 rounded hover:bg-bg-200 text-text-300 hover:text-text-100 transition-colors",
          children: "−"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "w-10 text-center text-text-400 tabular-nums", children: [
        Math.round(scale * 100),
        "%"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: zoomIn,
          className: "px-1.5 py-0.5 rounded hover:bg-bg-200 text-text-300 hover:text-text-100 transition-colors",
          children: "+"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-px h-3 bg-border-200 mx-1" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: zoomFit,
          className: `px-1.5 py-0.5 rounded transition-colors ${isFit ? "bg-bg-200 text-text-100" : "text-text-400 hover:bg-bg-200 hover:text-text-100"}`,
          children: t("fileExplorer.fit")
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: zoomActual,
          className: `px-1.5 py-0.5 rounded transition-colors ${isActual ? "bg-bg-200 text-text-100" : "text-text-400 hover:bg-bg-200 hover:text-text-100"}`,
          children: t("fileExplorer.oneToOne")
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        ref: containerRef,
        className: "flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing",
        onMouseDown: handleMouseDown,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: dataUrl,
            alt: fileName,
            draggable: false,
            className: "absolute left-1/2 top-1/2 select-none",
            style: {
              transform: `translate(-50%, -50%) translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: "center center"
            },
            onLoad: (e) => {
              setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
            }
          }
        )
      }
    )
  ] });
}
function TextMediaPreview({ dataUrl, text, language, fileName, isResizing = false }) {
  const { t } = useTranslation(["components", "common"]);
  const [mode, setMode] = reactExports.useState("preview");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 flex items-center gap-0.5 px-2 py-1 border-b border-border-100/30 bg-bg-100/50 text-[length:var(--fs-xxs)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setMode("preview"),
          className: `px-2 py-0.5 rounded transition-colors ${mode === "preview" ? "bg-bg-200 text-text-100" : "text-text-400 hover:bg-bg-200 hover:text-text-100"}`,
          children: t("common:preview")
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setMode("code"),
          className: `px-2 py-0.5 rounded transition-colors ${mode === "code" ? "bg-bg-200 text-text-100" : "text-text-400 hover:bg-bg-200 hover:text-text-100"}`,
          children: t("common:code")
        }
      )
    ] }),
    mode === "preview" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ImagePreview, { dataUrl, fileName }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CodePreview, { code: text, language, isResizing }) })
  ] });
}
function MarkdownFilePreview({ text, isResizing = false }) {
  const { t } = useTranslation(["components", "common"]);
  const [mode, setMode] = reactExports.useState("preview");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 flex items-center gap-0.5 px-2 py-1 border-b border-border-100/30 bg-bg-100/50 text-[length:var(--fs-xxs)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setMode("preview"),
          className: `px-2 py-0.5 rounded transition-colors ${mode === "preview" ? "bg-bg-200 text-text-100" : "text-text-400 hover:bg-bg-200 hover:text-text-100"}`,
          children: t("common:preview")
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setMode("code"),
          className: `px-2 py-0.5 rounded transition-colors ${mode === "code" ? "bg-bg-200 text-text-100" : "text-text-400 hover:bg-bg-200 hover:text-text-100"}`,
          children: t("common:code")
        }
      )
    ] }),
    mode === "preview" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0 overflow-auto panel-scrollbar px-5 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownRenderer, { content: text }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CodePreview, { code: text, language: "markdown", isResizing }) })
  ] });
}
function BinaryPlaceholder({ mimeType, fileName, onDownload }) {
  const { t } = useTranslation(["components", "common"]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-sm)] gap-2 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        src: getMaterialIconUrl(fileName, "file"),
        alt: "",
        width: 32,
        height: 32,
        className: "opacity-50",
        onError: (e) => {
          e.currentTarget.style.visibility = "hidden";
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-text-300", children: fileName }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatMimeType(mimeType) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-500 text-[length:var(--fs-xxs)]", children: t("components:fileExplorer.binaryFile") }),
    onDownload && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: onDownload,
        className: "mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-bg-200 hover:bg-bg-300 text-text-200 rounded transition-colors text-[length:var(--fs-xs)]",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadIcon, { size: 12 }),
          t("common:download")
        ]
      }
    )
  ] });
}
function DiffPreview({ hunks, isResizing = false }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `font-mono text-[length:var(--fs-code)] leading-relaxed ${isResizing ? "whitespace-pre overflow-hidden" : ""}`,
      style: { contain: "content" },
      children: hunks.map((hunk, hunkIdx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border-100/30 last:border-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-1 bg-bg-200/50 text-text-400 text-[length:var(--fs-xxs)]", children: [
          "@@ -",
          hunk.oldStart,
          ",",
          hunk.oldLines,
          " +",
          hunk.newStart,
          ",",
          hunk.newLines,
          " @@"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: hunk.lines.map((line, lineIdx) => {
          const type = line[0];
          let bgClass = "";
          let textClass = "text-text-300";
          if (type === "+") {
            bgClass = "bg-success-100/10";
            textClass = "text-success-100";
          } else if (type === "-") {
            bgClass = "bg-danger-100/10";
            textClass = "text-danger-100";
          }
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `px-3 py-0.5 ${bgClass} ${textClass}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "select-none opacity-50 w-4 inline-block", children: type || " " }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: line.slice(1) })
          ] }, lineIdx);
        }) })
      ] }, hunkIdx))
    }
  );
}
export {
  DiffPreview,
  FileExplorer
};
