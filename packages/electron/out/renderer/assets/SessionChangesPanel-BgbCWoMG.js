import { bC as reactExports, cf as useTranslation, bk as jsxRuntimeExports, j as ClockIcon, z as LayersIcon, G as GitBranchIcon, v as GitDiffIcon, aK as getCurrentProject, b0 as getVcsInfo, a$ as getVcsDiff, aZ as getSessionDiff, aS as getLastTurnDiff, bd as initGitProject, s as DropdownMenu, Z as RetryIcon, aT as getMaterialIconUrl, i as ChevronRightIcon, at as detectLanguage, aF as extractContentFromUnifiedDiff, b_ as useDiffViewerData, q as DiffViewer, ad as ViewModeSwitch, c1 as useFullscreenLayer, I as MaximizeIcon, bK as sessionErrorHandler } from "./main-CxRsPsI8.js";
import { a as useVerticalSplitResize, u as useSessionChangeScope, c as changeScopeStore, P as PreviewTabsBar } from "./useVerticalSplitResize-CIwa9Yhs.js";
const MIN_LIST_HEIGHT = 80;
const MIN_PREVIEW_HEIGHT = 120;
function getDefaultChangeMode(options) {
  if (options.includes("turn")) return "turn";
  if (options.includes("git")) return "git";
  if (options.includes("branch")) return "branch";
  if (options.includes("session")) return "session";
  return options[0] ?? "session";
}
function reconcileDiffPreviewState(diffs, openFiles, activeFile) {
  const availableFiles = new Set(diffs.map((diff) => diff.file));
  const nextOpenFiles = openFiles.filter((file) => availableFiles.has(file));
  if (nextOpenFiles.length === 0 && diffs.length > 0) {
    nextOpenFiles.push(diffs[0].file);
  }
  const nextActiveFile = activeFile && nextOpenFiles.includes(activeFile) ? activeFile : nextOpenFiles[0] ?? null;
  return { nextOpenFiles, nextActiveFile };
}
const SessionChangesPanel = reactExports.memo(function SessionChangesPanel2({
  sessionId,
  directory,
  isResizing: isPanelResizing = false
}) {
  const { t } = useTranslation(["components", "common"]);
  const containerRef = reactExports.useRef(null);
  const listRef = reactExports.useRef(null);
  const {
    splitHeight: listHeight,
    isResizing,
    resetSplitHeight,
    handleResizeStart,
    handleTouchResizeStart
  } = useVerticalSplitResize({
    containerRef,
    primaryRef: listRef,
    cssVariableName: "--list-height",
    minPrimaryHeight: MIN_LIST_HEIGHT,
    minSecondaryHeight: MIN_PREVIEW_HEIGHT
  });
  const [project, setProject] = reactExports.useState(null);
  const [vcsInfo, setVcsInfo] = reactExports.useState(null);
  const [projectLoading, setProjectLoading] = reactExports.useState(false);
  const [initializingGit, setInitializingGit] = reactExports.useState(false);
  const [loadingModes, setLoadingModes] = reactExports.useState({ git: false, branch: false, session: false, turn: false });
  const [loadedModes, setLoadedModes] = reactExports.useState({ git: false, branch: false, session: false, turn: false });
  const [gitDiffs, setGitDiffs] = reactExports.useState([]);
  const [branchDiffs, setBranchDiffs] = reactExports.useState([]);
  const [sessionDiffs, setSessionDiffs] = reactExports.useState([]);
  const [turnDiffs, setTurnDiffs] = reactExports.useState([]);
  const [error, setError] = reactExports.useState(null);
  const [viewMode, setViewMode] = reactExports.useState("unified");
  const [listMode, setListMode] = reactExports.useState("tree");
  const [changeMenuOpen, setChangeMenuOpen] = reactExports.useState(false);
  const changeMode = useSessionChangeScope(sessionId);
  const [selectedFile, setSelectedFile] = reactExports.useState(null);
  const [openDiffFiles, setOpenDiffFiles] = reactExports.useState([]);
  const [mountedPreviewFiles, setMountedPreviewFiles] = reactExports.useState(/* @__PURE__ */ new Set());
  const [expandedDirs, setExpandedDirs] = reactExports.useState(/* @__PURE__ */ new Set());
  const projectRequestIdRef = reactExports.useRef(0);
  const diffRequestIdRef = reactExports.useRef({ git: 0, branch: 0, session: 0, turn: 0 });
  const openDiffFilesRef = reactExports.useRef([]);
  const selectedFileRef = reactExports.useRef(null);
  const changeMenuTriggerRef = reactExports.useRef(null);
  const changeMenuRef = reactExports.useRef(null);
  const changeMenuOptionRefs = reactExports.useRef({});
  const changeMenuOpenFocusRef = reactExports.useRef("selected");
  const changeMenuId = reactExports.useId();
  const isAnyResizing = isPanelResizing || isResizing;
  const setChangeMode = reactExports.useCallback(
    (mode) => {
      changeScopeStore.setMode(sessionId, mode);
    },
    [sessionId]
  );
  const changeOptions = reactExports.useMemo(() => {
    const options = [];
    if (project?.vcs) options.push("turn", "git");
    if (project?.vcs && vcsInfo?.branch && vcsInfo?.default_branch && vcsInfo.branch !== vcsInfo.default_branch) {
      options.push("branch");
    }
    if (project?.vcs) options.push("session");
    return options;
  }, [project?.vcs, vcsInfo?.branch, vcsInfo?.default_branch]);
  const preferredChangeMode = reactExports.useMemo(() => getDefaultChangeMode(changeOptions), [changeOptions]);
  const changeModeMeta = reactExports.useMemo(
    () => ({
      git: {
        label: t("sessionChanges.gitScope"),
        description: t("sessionChanges.gitScopeHint"),
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GitDiffIcon, { size: 12 })
      },
      branch: {
        label: t("sessionChanges.branchScope"),
        description: t("sessionChanges.branchScopeHint", { branch: vcsInfo?.default_branch ?? "main" }),
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranchIcon, { size: 12 })
      },
      session: {
        label: t("sessionChanges.sessionScope"),
        description: t("sessionChanges.sessionScopeHint"),
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LayersIcon, { size: 12 })
      },
      turn: {
        label: t("sessionChanges.turnScope"),
        description: t("sessionChanges.turnScopeHint"),
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ClockIcon, { size: 12 })
      }
    }),
    [t, vcsInfo?.default_branch]
  );
  const diffs = reactExports.useMemo(
    () => changeMode === "git" ? gitDiffs : changeMode === "branch" ? branchDiffs : changeMode === "session" ? sessionDiffs : turnDiffs,
    [branchDiffs, changeMode, gitDiffs, sessionDiffs, turnDiffs]
  );
  const loading = projectLoading || initializingGit || loadingModes[changeMode];
  const focusChangeMenuOption = reactExports.useCallback((mode) => {
    changeMenuOptionRefs.current[mode]?.focus();
  }, []);
  const isVisibleFocusableElement = reactExports.useCallback((target) => {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    const candidate = element?.closest(
      'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!candidate) return false;
    const style = window.getComputedStyle(candidate);
    return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
  }, []);
  const focusRelativeToChangeTrigger = reactExports.useCallback((direction) => {
    const trigger = changeMenuTriggerRef.current;
    if (!trigger) return;
    const focusables = Array.from(
      document.body.querySelectorAll(
        'button:not([disabled]), [href], input:not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.closest('[aria-hidden="true"]'));
    const currentIndex = focusables.findIndex((item) => item === trigger);
    if (currentIndex === -1) return;
    focusables[currentIndex + direction]?.focus();
  }, []);
  reactExports.useEffect(() => {
    openDiffFilesRef.current = openDiffFiles;
  }, [openDiffFiles]);
  reactExports.useEffect(() => {
    setMountedPreviewFiles((prev) => {
      const openFiles = new Set(openDiffFiles);
      const next = new Set([...prev].filter((file) => openFiles.has(file)));
      if (selectedFile) next.add(selectedFile);
      if (next.size === prev.size && [...next].every((file) => prev.has(file))) return prev;
      return next;
    });
  }, [openDiffFiles, selectedFile]);
  reactExports.useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);
  reactExports.useEffect(() => {
    if (!changeMenuOpen) return;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (changeMenuRef.current?.contains(target) || changeMenuTriggerRef.current?.contains(target)) {
        return;
      }
      setChangeMenuOpen(false);
      if (!isVisibleFocusableElement(event.target)) {
        changeMenuTriggerRef.current?.focus();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setChangeMenuOpen(false);
        changeMenuTriggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [changeMenuOpen, isVisibleFocusableElement]);
  reactExports.useEffect(() => {
    if (!changeMenuOpen) return;
    const targetMode = changeMenuOpenFocusRef.current === "first" ? changeOptions[0] : changeMenuOpenFocusRef.current === "last" ? changeOptions[changeOptions.length - 1] : changeOptions.includes(changeMode) ? changeMode : preferredChangeMode;
    const timerId = window.setTimeout(() => {
      focusChangeMenuOption(targetMode);
    }, 0);
    return () => {
      clearTimeout(timerId);
    };
  }, [changeMenuOpen, changeOptions, changeMode, focusChangeMenuOption, preferredChangeMode]);
  const handleChangeMenuKeyDown = reactExports.useCallback(
    (event) => {
      if (changeOptions.length === 0) return;
      const currentIndex = changeOptions.findIndex((mode) => changeMenuOptionRefs.current[mode] === document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        setChangeMenuOpen(false);
        changeMenuTriggerRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        setChangeMenuOpen(false);
        window.setTimeout(() => {
          focusRelativeToChangeTrigger(event.shiftKey ? -1 : 1);
        }, 0);
        return;
      }
      const focusByIndex = (index) => {
        const targetMode = changeOptions[index];
        if (targetMode) focusChangeMenuOption(targetMode);
      };
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % changeOptions.length;
        focusByIndex(nextIndex);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const nextIndex = currentIndex === -1 ? changeOptions.length - 1 : (currentIndex - 1 + changeOptions.length) % changeOptions.length;
        focusByIndex(nextIndex);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusByIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusByIndex(changeOptions.length - 1);
      }
    },
    [changeOptions, focusChangeMenuOption, focusRelativeToChangeTrigger]
  );
  const loadProjectState = reactExports.useCallback(async () => {
    if (!sessionId) return null;
    const requestId = ++projectRequestIdRef.current;
    setProjectLoading(true);
    setError(null);
    try {
      const nextProject = await getCurrentProject(directory);
      if (requestId !== projectRequestIdRef.current) return null;
      setProject(nextProject);
      if (nextProject.vcs) {
        const nextVcsInfo = await getVcsInfo(directory).catch(() => null);
        if (requestId !== projectRequestIdRef.current) return null;
        setVcsInfo(nextVcsInfo);
      } else {
        setVcsInfo(null);
      }
      return nextProject;
    } catch (err) {
      if (requestId !== projectRequestIdRef.current) return null;
      sessionErrorHandler("load current project", err);
      setProject(null);
      setVcsInfo(null);
      setError(t("sessionChanges.failedToLoad"));
      return null;
    } finally {
      if (requestId === projectRequestIdRef.current) {
        setProjectLoading(false);
      }
    }
  }, [directory, sessionId, t]);
  const loadDiffMode = reactExports.useCallback(
    async (mode, options) => {
      const currentProject = options?.project ?? project;
      if (!sessionId || !currentProject?.vcs) return;
      if (!options?.force && loadedModes[mode]) return;
      const requestId = ++diffRequestIdRef.current[mode];
      setLoadingModes((prev) => ({ ...prev, [mode]: true }));
      setError(null);
      try {
        let data;
        if (mode === "git" || mode === "branch") {
          data = await getVcsDiff(mode, directory);
        } else if (mode === "session") {
          data = await getSessionDiff(sessionId, directory);
        } else {
          data = await getLastTurnDiff(sessionId, directory);
        }
        if (requestId !== diffRequestIdRef.current[mode]) return;
        if (mode === "git") {
          setGitDiffs(data);
        } else if (mode === "branch") {
          setBranchDiffs(data);
        } else if (mode === "session") {
          setSessionDiffs(data);
        } else {
          setTurnDiffs(data);
        }
        setLoadedModes((prev) => ({ ...prev, [mode]: true }));
      } catch (err) {
        if (requestId !== diffRequestIdRef.current[mode]) return;
        sessionErrorHandler(`load ${mode} diff`, err);
        setError(t("sessionChanges.failedToLoad"));
      } finally {
        if (requestId === diffRequestIdRef.current[mode]) {
          setLoadingModes((prev) => ({ ...prev, [mode]: false }));
        }
      }
    },
    [directory, loadedModes, project, sessionId, t]
  );
  reactExports.useEffect(() => {
    diffRequestIdRef.current = {
      git: diffRequestIdRef.current.git + 1,
      branch: diffRequestIdRef.current.branch + 1,
      session: diffRequestIdRef.current.session + 1,
      turn: diffRequestIdRef.current.turn + 1
    };
    setProject(null);
    setVcsInfo(null);
    setGitDiffs([]);
    setBranchDiffs([]);
    setSessionDiffs([]);
    setTurnDiffs([]);
    setLoadedModes({ git: false, branch: false, session: false, turn: false });
    setLoadingModes({ git: false, branch: false, session: false, turn: false });
    setError(null);
    setOpenDiffFiles([]);
    setSelectedFile(null);
    setMountedPreviewFiles(/* @__PURE__ */ new Set());
    setExpandedDirs(/* @__PURE__ */ new Set());
    setChangeMenuOpen(false);
    resetSplitHeight();
    void loadProjectState();
  }, [directory, sessionId, loadProjectState, resetSplitHeight]);
  reactExports.useEffect(() => {
    if (changeOptions.length === 0) return;
    if (changeOptions.includes(changeMode)) return;
    setChangeMode(preferredChangeMode);
  }, [changeMode, changeOptions, preferredChangeMode, setChangeMode]);
  reactExports.useEffect(() => {
    if (!project?.vcs) return;
    if (!changeOptions.includes(changeMode)) return;
    void loadDiffMode(changeMode);
  }, [changeMode, changeOptions, loadDiffMode, project?.vcs]);
  reactExports.useEffect(() => {
    setExpandedDirs(collectExpandedDirPaths(buildChangesTree(diffs)));
    const { nextOpenFiles, nextActiveFile } = reconcileDiffPreviewState(
      diffs,
      openDiffFilesRef.current,
      selectedFileRef.current
    );
    setOpenDiffFiles(nextOpenFiles);
    setSelectedFile(nextActiveFile);
    if (diffs.length === 0) {
      resetSplitHeight();
    }
  }, [diffs, resetSplitHeight]);
  const handleRefresh = reactExports.useCallback(async () => {
    const nextProject = await loadProjectState();
    if (!nextProject?.vcs) return;
    await loadDiffMode(changeMode, { force: true, project: nextProject });
  }, [changeMode, loadDiffMode, loadProjectState]);
  const handleInitGit = reactExports.useCallback(async () => {
    setInitializingGit(true);
    setError(null);
    try {
      const nextProject = await initGitProject(directory);
      setProject(nextProject);
      setVcsInfo(null);
      setGitDiffs([]);
      setBranchDiffs([]);
      setSessionDiffs([]);
      setTurnDiffs([]);
      setLoadedModes({ git: false, branch: false, session: false, turn: false });
      setLoadingModes({ git: false, branch: false, session: false, turn: false });
      setChangeMenuOpen(false);
      void loadProjectState();
    } catch (err) {
      sessionErrorHandler("init git project", err);
      setError(t("sessionChanges.failedToInitGit"));
    } finally {
      setInitializingGit(false);
    }
  }, [directory, loadProjectState, t]);
  const handleSelectFile = reactExports.useCallback((file) => {
    setOpenDiffFiles((prev) => prev.includes(file) ? prev : [...prev, file]);
    setSelectedFile((prev) => prev === file ? prev : file);
  }, []);
  const handleToggleDir = reactExports.useCallback((path) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);
  const changesTree = reactExports.useMemo(() => buildChangesTree(diffs), [diffs]);
  const handleClosePreview = reactExports.useCallback(() => {
    setOpenDiffFiles([]);
    setSelectedFile(null);
    resetSplitHeight();
  }, [resetSplitHeight]);
  const handleActivatePreview = reactExports.useCallback((file) => {
    setSelectedFile((prev) => prev === file ? prev : file);
  }, []);
  const handleClosePreviewTab = reactExports.useCallback((file) => {
    setOpenDiffFiles((prev) => {
      const index = prev.indexOf(file);
      if (index === -1) return prev;
      const next = prev.filter((item) => item !== file);
      setSelectedFile((current) => {
        if (current !== file) return current;
        return next[Math.min(index, next.length - 1)] ?? null;
      });
      return next;
    });
  }, []);
  const handleReorderPreviewTabs = reactExports.useCallback((draggedFile, targetFile) => {
    setOpenDiffFiles((prev) => {
      const draggedIndex = prev.indexOf(draggedFile);
      const targetIndex = prev.indexOf(targetFile);
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return prev;
      const next = [...prev];
      const [dragged] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
  }, []);
  const selectedDiff = selectedFile ? diffs.find((d) => d.file === selectedFile) : null;
  const previewDiffs = reactExports.useMemo(
    () => openDiffFiles.map((file) => diffs.find((diff) => diff.file === file)).filter((diff) => Boolean(diff)),
    [diffs, openDiffFiles]
  );
  const mountedPreviewDiffs = reactExports.useMemo(
    () => previewDiffs.filter((diff) => diff.file === selectedFile || mountedPreviewFiles.has(diff.file)),
    [mountedPreviewFiles, previewDiffs, selectedFile]
  );
  const showPreview = !loading && selectedDiff !== null && !(error && diffs.length === 0);
  if (projectLoading && !project) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-text-400 text-[length:var(--fs-sm)]", children: t("sessionChanges.loadingChanges") });
  }
  if (!project && error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-danger-100 text-[length:var(--fs-sm)]", children: error });
  }
  if (!project?.vcs) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-xs text-center space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-base)] font-medium text-text-200", children: t("sessionChanges.noGit") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("sessionChanges.noGitHint") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: handleInitGit,
          disabled: initializingGit,
          className: "inline-flex items-center justify-center rounded px-3 py-1.5 text-[length:var(--fs-sm)] font-medium bg-accent-main-100 text-white hover:bg-accent-main-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors",
          children: initializingGit ? t("sessionChanges.initializingGit") : t("sessionChanges.initGit")
        }
      ),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-danger-100", children: error })
    ] }) });
  }
  const totalStats = diffs.reduce(
    (acc, d) => ({
      additions: acc.additions + d.additions,
      deletions: acc.deletions + d.deletions
    }),
    { additions: 0, deletions: 0 }
  );
  const emptyText = changeMode === "git" ? t("sessionChanges.noGitChanges") : changeMode === "branch" ? t("sessionChanges.noBranchChanges") : changeMode === "session" ? t("sessionChanges.noChanges") : t("sessionChanges.noTurnChanges");
  const activeChangeModeMeta = changeModeMeta[changeMode];
  const compactFileCountLabel = t("sessionChanges.fileCountCompact", { count: diffs.length });
  const fullFileCountLabel = t("sessionChanges.fileCount", { count: diffs.length });
  const statFadeMaskStyle = {
    WebkitMaskImage: "linear-gradient(to right, black 0, black calc(100% - 10px), transparent 100%)",
    maskImage: "linear-gradient(to right, black 0, black calc(100% - 10px), transparent 100%)"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: containerRef, className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        ref: listRef,
        className: "overflow-hidden flex flex-col shrink-0",
        style: {
          "--list-height": listHeight !== null ? `${listHeight}px` : "40%",
          height: showPreview ? "var(--list-height)" : "100%",
          minHeight: showPreview ? MIN_LIST_HEIGHT : void 0
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-10 items-center gap-2 px-3 shrink-0 overflow-hidden", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "min-w-0 flex flex-1 overflow-hidden",
                title: `+${totalStats.additions} -${totalStats.deletions} ${fullFileCountLabel}`,
                style: statFadeMaskStyle,
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex h-6 min-w-max items-center gap-1.5 whitespace-nowrap text-[length:var(--fs-xxs)] font-mono tabular-nums", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-success-100", children: [
                    "+",
                    totalStats.additions
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-danger-100", children: [
                    "-",
                    totalStats.deletions
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-400", children: compactFileCountLabel })
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  ref: changeMenuTriggerRef,
                  type: "button",
                  onClick: () => {
                    changeMenuOpenFocusRef.current = "selected";
                    setChangeMenuOpen((open) => !open);
                  },
                  onKeyDown: (event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                      event.preventDefault();
                      changeMenuOpenFocusRef.current = event.key === "ArrowUp" ? "last" : "first";
                      setChangeMenuOpen(true);
                    }
                  },
                  "aria-label": `${t("sessionChanges.mode")}: ${activeChangeModeMeta.label}`,
                  "aria-haspopup": "menu",
                  "aria-expanded": changeMenuOpen,
                  "aria-controls": changeMenuOpen ? changeMenuId : void 0,
                  title: activeChangeModeMeta.label,
                  className: `
                inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors
                ${changeMenuOpen ? "bg-bg-200 text-text-100" : "text-text-400 hover:text-text-100 hover:bg-bg-200/50"}
              `,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0", children: activeChangeModeMeta.icon })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DropdownMenu,
                {
                  triggerRef: changeMenuTriggerRef,
                  isOpen: changeMenuOpen,
                  position: "bottom",
                  align: "right",
                  minWidth: "170px",
                  maxWidth: "min(220px, calc(100vw - 24px))",
                  constrainToRef: containerRef,
                  className: "!rounded-lg !p-1",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      id: changeMenuId,
                      ref: changeMenuRef,
                      role: "menu",
                      "aria-label": t("sessionChanges.mode"),
                      onKeyDown: handleChangeMenuKeyDown,
                      className: "space-y-px",
                      children: changeOptions.map((mode) => {
                        const meta = changeModeMeta[mode];
                        const isSelected = mode === changeMode;
                        return /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            ref: (node) => {
                              changeMenuOptionRefs.current[mode] = node;
                              const shouldFocusNode = changeMenuOpen && (changeMenuOpenFocusRef.current === "selected" && isSelected || changeMenuOpenFocusRef.current === "first" && mode === changeOptions[0] || changeMenuOpenFocusRef.current === "last" && mode === changeOptions[changeOptions.length - 1]);
                              if (node && shouldFocusNode) {
                                node.focus();
                              }
                            },
                            type: "button",
                            role: "menuitemradio",
                            "aria-checked": isSelected,
                            tabIndex: isSelected ? 0 : -1,
                            title: meta.description,
                            onClick: () => {
                              setChangeMode(mode);
                              setChangeMenuOpen(false);
                              changeMenuTriggerRef.current?.focus();
                            },
                            className: `
                        group flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[length:var(--fs-sm)] transition-colors
                        ${isSelected ? "bg-bg-200/70 text-text-100 font-medium" : "text-text-200 hover:bg-bg-200/60 hover:text-text-100"}
                      `,
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: meta.label })
                          },
                          mode
                        );
                      })
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center bg-bg-200/50 rounded-md overflow-hidden border border-border-200/50", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setListMode("flat"),
                    "aria-pressed": listMode === "flat",
                    className: `px-2 py-0.5 text-[length:var(--fs-xxs)] transition-colors ${listMode === "flat" ? "bg-bg-000 text-text-100 shadow-sm" : "text-text-400 hover:text-text-200"}`,
                    title: t("sessionChanges.flatList"),
                    children: t("sessionChanges.list")
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setListMode("tree"),
                    "aria-pressed": listMode === "tree",
                    className: `px-2 py-0.5 text-[length:var(--fs-xxs)] transition-colors ${listMode === "tree" ? "bg-bg-000 text-text-100 shadow-sm" : "text-text-400 hover:text-text-200"}`,
                    title: t("sessionChanges.treeView"),
                    children: t("sessionChanges.tree")
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center bg-bg-200/50 rounded-md overflow-hidden border border-border-200/50", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setViewMode("unified"),
                    "aria-pressed": viewMode === "unified",
                    className: `px-2 py-0.5 text-[length:var(--fs-xxs)] transition-colors ${viewMode === "unified" ? "bg-bg-000 text-text-100 shadow-sm" : "text-text-400 hover:text-text-200"}`,
                    children: t("sessionChanges.unified")
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setViewMode("split"),
                    "aria-pressed": viewMode === "split",
                    className: `px-2 py-0.5 text-[length:var(--fs-xxs)] transition-colors ${viewMode === "split" ? "bg-bg-000 text-text-100 shadow-sm" : "text-text-400 hover:text-text-200"}`,
                    children: t("sessionChanges.split")
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: handleRefresh,
                  disabled: loading,
                  "aria-label": t("common:refresh"),
                  className: "inline-flex h-6 w-6 items-center justify-center text-text-400 hover:text-text-100 hover:bg-bg-200/50 rounded-md transition-colors disabled:opacity-50",
                  title: t("common:refresh"),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 12, className: loading ? "animate-spin" : "" })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto panel-scrollbar-y", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-text-400 text-[length:var(--fs-sm)]", children: t("sessionChanges.loadingChanges") }) : error && diffs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-danger-100 text-[length:var(--fs-sm)]", children: error }) : diffs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-text-400 text-[length:var(--fs-sm)]", children: emptyText }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-0.5", children: listMode === "tree" ? (
            // Tree view
            changesTree.map((node) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              ChangesTreeItem,
              {
                node,
                depth: 0,
                expandedDirs,
                onSelectFile: handleSelectFile,
                onToggleDir: handleToggleDir
              },
              node.path
            ))
          ) : (
            // Flat list view
            diffs.map((diff) => {
              const fileStatus = getFileStatus(diff);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => handleSelectFile(diff.file),
                  className: `
                       w-full min-w-0 flex items-center gap-2 px-3 py-1 text-left
                       hover:bg-bg-200/50 transition-colors text-[length:var(--fs-sm)]
                       text-text-300
                     `,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "img",
                      {
                        src: getMaterialIconUrl(diff.file, "file"),
                        alt: "",
                        width: 16,
                        height: 16,
                        className: "shrink-0",
                        loading: "lazy",
                        decoding: "async",
                        onError: (e) => {
                          e.currentTarget.style.visibility = "hidden";
                        }
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex-1 min-w-0 font-mono truncate ${FILE_STATUS_COLOR[fileStatus]}`, children: diff.file }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[length:var(--fs-xxs)] font-mono shrink-0", children: [
                      diff.additions > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-success-100", children: [
                        "+",
                        diff.additions
                      ] }),
                      diff.deletions > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-danger-100", children: [
                        "-",
                        diff.deletions
                      ] })
                    ] })
                  ]
                },
                diff.file
              );
            })
          ) }) })
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
    showPreview && selectedDiff && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex flex-col min-h-0", style: { minHeight: MIN_PREVIEW_HEIGHT }, children: mountedPreviewDiffs.map((previewDiff) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: previewDiff.file === selectedFile ? "h-full min-h-0" : "hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      DiffPreviewPanel,
      {
        diff: previewDiff,
        previewDiffs,
        viewMode,
        isResizing: isAnyResizing,
        onActivatePreview: handleActivatePreview,
        onClosePreview: handleClosePreviewTab,
        onReorderPreview: handleReorderPreviewTabs,
        onClose: handleClosePreview
      }
    ) }, previewDiff.file)) })
  ] });
});
const DiffPreviewPanel = reactExports.memo(function DiffPreviewPanel2({
  diff,
  previewDiffs,
  viewMode,
  isResizing,
  onActivatePreview,
  onClosePreview,
  onReorderPreview,
  onClose
}) {
  const language = detectLanguage(diff.file) || "text";
  const { before, after } = reactExports.useMemo(() => {
    if (diff.patch) return extractContentFromUnifiedDiff(diff.patch);
    if (diff.before !== void 0 && diff.after !== void 0) return { before: diff.before, after: diff.after };
    return { before: "", after: "" };
  }, [diff.patch, diff.before, diff.after]);
  const diffViewerData = useDiffViewerData(before, after, language, isResizing);
  const { t } = useTranslation(["components", "common"]);
  const [fullscreenViewMode, setFullscreenViewMode] = reactExports.useState(viewMode);
  const fileName = diff.file.split(/[/\\]/).pop() || diff.file;
  const fullscreenLayer = reactExports.useMemo(
    () => ({
      id: `session-change:${diff.file}`,
      title: fileName,
      titleExtra: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-[length:var(--fs-xs)] font-mono tabular-nums shrink-0", children: [
        diff.additions > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-success-100", children: [
          "+",
          diff.additions
        ] }),
        diff.deletions > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-danger-100", children: [
          "-",
          diff.deletions
        ] })
      ] }),
      headerRight: /* @__PURE__ */ jsxRuntimeExports.jsx(ViewModeSwitch, { viewMode: fullscreenViewMode, onChange: setFullscreenViewMode }),
      deferContent: true,
      content: /* @__PURE__ */ jsxRuntimeExports.jsx(
        DiffViewer,
        {
          before,
          after,
          language,
          viewMode: fullscreenViewMode,
          data: diffViewerData
        }
      )
    }),
    [after, before, diff.additions, diff.deletions, diff.file, diffViewerData, fileName, fullscreenViewMode, language]
  );
  const { open: openFullscreen } = useFullscreenLayer(fullscreenLayer);
  const previewTabItems = reactExports.useMemo(
    () => previewDiffs.map((previewDiff) => {
      const currentFileName = previewDiff.file.split(/[/\\]/).pop() || previewDiff.file;
      return {
        id: previewDiff.file,
        title: previewDiff.file,
        closeTitle: `${t("common:close")} ${currentFileName}`,
        iconPath: previewDiff.file,
        label: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block whitespace-nowrap text-[length:var(--fs-xs)] font-mono", children: currentFileName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[length:var(--fs-xxs)] font-mono text-success-100/90", children: previewDiff.additions > 0 ? `+${previewDiff.additions}` : "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[length:var(--fs-xxs)] font-mono text-danger-100/90", children: previewDiff.deletions > 0 ? `-${previewDiff.deletions}` : "" })
        ] })
      };
    }),
    [previewDiffs, t]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PreviewTabsBar,
      {
        items: previewTabItems,
        activeId: diff.file,
        closeAllTitle: t("common:closeAllTabs"),
        onActivate: onActivatePreview,
        onClose: onClosePreview,
        onCloseAll: onClose,
        onReorder: onReorderPreview,
        tabWidthClassName: "w-auto max-w-none min-w-max",
        rightActions: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              setFullscreenViewMode(viewMode);
              openFullscreen();
            },
            className: "p-1 text-text-400 hover:text-text-100 hover:bg-bg-300/50 rounded transition-colors",
            title: t("contentBlock.fullscreen"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(MaximizeIcon, { size: 12 })
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DiffViewer, { before, after, language, viewMode, isResizing, data: diffViewerData }) })
  ] });
});
function getFileStatus(diff) {
  if (diff.status) return diff.status;
  if (diff.deletions === 0 && diff.additions > 0) return "added";
  if (diff.additions === 0 && diff.deletions > 0) return "deleted";
  if (diff.before !== void 0 && diff.after !== void 0) {
    if (!diff.before.trim()) return "added";
    if (!diff.after.trim()) return "deleted";
  }
  return "modified";
}
const FILE_STATUS_COLOR = {
  added: "text-success-100",
  deleted: "text-danger-100",
  modified: "text-warning-100"
};
function buildChangesTree(diffs) {
  const root = [];
  for (const diff of diffs) {
    const parts = diff.file.split(/[/\\]/).filter(Boolean);
    let currentLevel = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");
      let existing = currentLevel.find((n) => n.name === part);
      if (!existing) {
        const status = isFile ? getFileStatus(diff) : void 0;
        existing = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "directory",
          diff: isFile ? diff : void 0,
          children: [],
          additions: isFile ? diff.additions : 0,
          deletions: isFile ? diff.deletions : 0,
          status
        };
        currentLevel.push(existing);
      }
      if (!isFile) {
        existing.additions += diff.additions;
        existing.deletions += diff.deletions;
        currentLevel = existing.children;
      }
    }
  }
  const processNodes = (nodes) => {
    return nodes.map((n) => {
      const processedChildren = processNodes(n.children);
      let dirStatus = void 0;
      if (n.type === "directory" && processedChildren.length > 0) {
        const hasAdded = processedChildren.some((c) => c.status === "added");
        const hasModified = processedChildren.some((c) => c.status === "modified");
        const hasDeleted = processedChildren.some((c) => c.status === "deleted");
        if (hasAdded) dirStatus = "added";
        else if (hasModified) dirStatus = "modified";
        else if (hasDeleted) dirStatus = "deleted";
      }
      return {
        ...n,
        children: processedChildren,
        status: n.type === "directory" ? dirStatus : n.status
      };
    }).sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };
  return processNodes(root);
}
function collectExpandedDirPaths(nodes) {
  const allDirPaths = /* @__PURE__ */ new Set();
  const collectDirs = (entries) => {
    for (const node of entries) {
      if (node.type === "directory") {
        allDirPaths.add(node.path);
        collectDirs(node.children);
      }
    }
  };
  collectDirs(nodes);
  return allDirPaths;
}
const ChangesTreeItem = reactExports.memo(function ChangesTreeItem2({
  node,
  depth,
  expandedDirs,
  onSelectFile,
  onToggleDir
}) {
  const isExpanded = expandedDirs.has(node.path);
  const paddingLeft = 8 + depth * 16;
  const statusColor = node.status ? FILE_STATUS_COLOR[node.status] : "text-text-400";
  if (node.type === "directory") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => onToggleDir(node.path),
          className: "w-full min-w-0 flex items-center gap-1.5 py-1 hover:bg-bg-200/50 transition-colors text-[length:var(--fs-sm)] text-text-300",
          style: { paddingLeft },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 12, className: `shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "img",
              {
                src: getMaterialIconUrl(node.path, "directory", isExpanded),
                alt: "",
                width: 16,
                height: 16,
                className: "shrink-0",
                loading: "lazy",
                decoding: "async",
                onError: (e) => {
                  e.currentTarget.style.visibility = "hidden";
                }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex-1 min-w-0 truncate text-left ${node.status ? statusColor : ""}`, children: node.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-[length:var(--fs-xxs)] font-mono pr-3 shrink-0", children: [
              node.additions > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-success-100", children: [
                "+",
                node.additions
              ] }),
              node.deletions > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-danger-100", children: [
                "-",
                node.deletions
              ] })
            ] })
          ]
        }
      ),
      isExpanded && node.children.map((child) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        ChangesTreeItem2,
        {
          node: child,
          depth: depth + 1,
          expandedDirs,
          onSelectFile,
          onToggleDir
        },
        child.path
      ))
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      onClick: () => node.diff && onSelectFile(node.diff.file),
      className: `
         w-full min-w-0 flex items-center gap-1.5 py-1 transition-colors text-[length:var(--fs-sm)]
         hover:bg-bg-200/50
         text-text-300
       `,
      style: { paddingLeft: paddingLeft + 16 },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: getMaterialIconUrl(node.name, "file"),
            alt: "",
            width: 16,
            height: 16,
            className: "shrink-0",
            loading: "lazy",
            decoding: "async",
            onError: (e) => {
              e.currentTarget.style.visibility = "hidden";
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: `flex-1 min-w-0 font-mono truncate text-left ${node.status ? FILE_STATUS_COLOR[node.status] : ""}`,
            children: node.name
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-[length:var(--fs-xxs)] font-mono pr-3 shrink-0", children: [
          node.additions > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-success-100", children: [
            "+",
            node.additions
          ] }),
          node.deletions > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-danger-100", children: [
            "-",
            node.deletions
          ] })
        ] })
      ]
    }
  );
});
export {
  SessionChangesPanel
};
