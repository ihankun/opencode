import { aY as getSDKClient, bV as unwrap, aI as formatPathForApi, bC as reactExports, cf as useTranslation, b$ as useDirectory, ch as useVcsInfo, aK as getCurrentProject, bw as normalizeToForwardSlash, bs as listWorktrees, bR as subscribeToEvents, br as listPtySessions, bE as removePtySession, ar as createWorktree, bG as requestGitWorkspaceCatalogRefresh, bg as isSameDirectory, bF as removeWorktree, bH as resetWorktree, bk as jsxRuntimeExports, w as GitWorktreeIcon, Z as RetryIcon, G as GitBranchIcon, U as PlusIcon, b as AlertCircleIcon, k as CloseIcon, a4 as SpinnerIcon, aN as getDirectoryName, n as ConfirmDialog, u as FolderIcon, E as ExternalLinkIcon, aa as TrashIcon } from "./main-CxRsPsI8.js";
async function disposeInstance(directory) {
  const sdk = getSDKClient();
  unwrap(await sdk.instance.dispose({ directory: formatPathForApi(directory) }));
  return true;
}
const WorktreePanel = reactExports.memo(function WorktreePanel2({ isResizing: _isResizing }) {
  const { t } = useTranslation(["components", "common"]);
  const { currentDirectory, addDirectory, setCurrentDirectory } = useDirectory();
  const { vcsInfo, refresh: refreshVcs } = useVcsInfo(currentDirectory);
  const [worktrees, setWorktrees] = reactExports.useState([]);
  const [rootDirectory, setRootDirectory] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [actionLoading, setActionLoading] = reactExports.useState(null);
  const [showCreateForm, setShowCreateForm] = reactExports.useState(false);
  const loadRequestIdRef = reactExports.useRef(0);
  const [deleteConfirm, setDeleteConfirm] = reactExports.useState({
    isOpen: false,
    directory: null
  });
  const [resetConfirm, setResetConfirm] = reactExports.useState({
    isOpen: false,
    directory: null
  });
  const resolveRootDirectory = reactExports.useCallback(async (directory) => {
    if (!directory) return null;
    const project = await getCurrentProject(directory);
    if (project.vcs !== "git" || !project.worktree) return null;
    return normalizeToForwardSlash(project.worktree);
  }, []);
  const loadWorktrees = reactExports.useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    if (!currentDirectory) {
      setError(null);
      setWorktrees([]);
      setRootDirectory(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const baseDirectory = await resolveRootDirectory(currentDirectory);
      if (requestId !== loadRequestIdRef.current) return;
      setRootDirectory(baseDirectory);
      if (!baseDirectory) {
        setWorktrees([]);
        return;
      }
      const list = await listWorktrees(baseDirectory);
      if (requestId !== loadRequestIdRef.current) return;
      setWorktrees(list);
    } catch (e) {
      if (requestId !== loadRequestIdRef.current) return;
      setError(e instanceof Error ? e.message : t("worktreePanel.failedToLoad"));
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentDirectory, resolveRootDirectory, t]);
  reactExports.useEffect(() => {
    loadWorktrees();
  }, [loadWorktrees]);
  reactExports.useEffect(() => {
    return subscribeToEvents({
      onWorktreeReady: () => {
        loadWorktrees();
      },
      onWorktreeFailed: (data) => {
        setError(t("worktreePanel.failedWithMessage", { message: data.message }));
        setActionLoading(null);
      },
      onVcsBranchUpdated: () => {
        refreshVcs();
      }
    });
  }, [loadWorktrees, refreshVcs, t]);
  const releaseWorktreeResources = reactExports.useCallback(async (directory) => {
    try {
      const ptySessions = await listPtySessions(directory);
      await Promise.allSettled(ptySessions.map((pty) => removePtySession(pty.id, directory)));
    } catch {
    }
    try {
      await disposeInstance(directory);
    } catch {
    }
  }, []);
  const requireRootDirectory = reactExports.useCallback(() => {
    if (!rootDirectory) {
      throw new Error(t("worktreePanel.failedToLoad"));
    }
    return rootDirectory;
  }, [rootDirectory, t]);
  const canManageWorktrees = !!rootDirectory && !loading;
  const handleOpenSession = reactExports.useCallback(
    (worktreeDir) => {
      const normalized = normalizeToForwardSlash(worktreeDir);
      addDirectory(normalized);
      window.location.hash = `#/?dir=${normalized}`;
    },
    [addDirectory]
  );
  const handleCreate = reactExports.useCallback(
    async (name, autoOpen) => {
      if (!currentDirectory || !name.trim()) return;
      setActionLoading("create");
      try {
        const baseDirectory = requireRootDirectory();
        const wt = await createWorktree({ name: name.trim() }, baseDirectory);
        setShowCreateForm(false);
        await loadWorktrees();
        requestGitWorkspaceCatalogRefresh();
        if (autoOpen && wt.directory) {
          handleOpenSession(wt.directory);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("worktreePanel.failedToCreate"));
      } finally {
        setActionLoading(null);
      }
    },
    [currentDirectory, handleOpenSession, loadWorktrees, requireRootDirectory, t]
  );
  const handleDelete = reactExports.useCallback(
    async (directory) => {
      if (!currentDirectory) return;
      setActionLoading(`delete-${directory}`);
      try {
        const baseDirectory = requireRootDirectory();
        const isCurrentDirectory = isSameDirectory(currentDirectory, directory);
        if (isCurrentDirectory && !isSameDirectory(currentDirectory, baseDirectory)) {
          setCurrentDirectory(baseDirectory);
        }
        await releaseWorktreeResources(directory);
        await removeWorktree({ directory }, baseDirectory);
        await loadWorktrees();
        requestGitWorkspaceCatalogRefresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("worktreePanel.failedToRemove"));
      } finally {
        setActionLoading(null);
        setDeleteConfirm({ isOpen: false, directory: null });
      }
    },
    [currentDirectory, loadWorktrees, releaseWorktreeResources, requireRootDirectory, setCurrentDirectory, t]
  );
  const handleReset = reactExports.useCallback(
    async (directory) => {
      if (!currentDirectory) return;
      setActionLoading(`reset-${directory}`);
      try {
        const baseDirectory = requireRootDirectory();
        await releaseWorktreeResources(directory);
        await resetWorktree({ directory }, baseDirectory);
        await loadWorktrees();
        requestGitWorkspaceCatalogRefresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("worktreePanel.failedToReset"));
      } finally {
        setActionLoading(null);
        setResetConfirm({ isOpen: false, directory: null });
      }
    },
    [currentDirectory, loadWorktrees, releaseWorktreeResources, requireRootDirectory, t]
  );
  if (!currentDirectory) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-sm)] gap-2 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GitWorktreeIcon, { size: 24, className: "opacity-30" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("worktreePanel.selectProject") })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-10 items-center justify-between px-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-6 min-w-0 items-center gap-1.5 text-[length:var(--fs-xs)] text-text-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: t("worktreePanel.git") }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            loadWorktrees();
            refreshVcs();
          },
          disabled: loading,
          className: "inline-flex h-6 w-6 items-center justify-center rounded-md text-text-400 hover:text-text-100 hover:bg-bg-200/50 transition-colors",
          title: t("common:refresh"),
          "aria-label": t("common:refresh"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 12, className: loading ? "animate-spin" : "" })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" })
    ] }),
    vcsInfo?.branch && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranchIcon, { size: 14, className: "text-accent-main-100 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-sm)] font-mono text-text-100 truncate", title: vcsInfo.branch, children: vcsInfo.branch })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center justify-between px-3 py-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-6 items-center gap-1.5 text-[length:var(--fs-xs)] text-text-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: t("worktreePanel.worktrees") }),
        !loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-text-400", children: [
          "(",
          worktrees.length,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setShowCreateForm(true),
          disabled: !!actionLoading || !canManageWorktrees,
          className: "inline-flex h-6 w-6 items-center justify-center rounded-md text-text-400 hover:text-text-100 hover:bg-bg-200/50 transition-colors",
          title: t("worktreePanel.createWorktree"),
          "aria-label": t("worktreePanel.createWorktree"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 12 })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-3 mt-2 px-2.5 py-2 rounded-md bg-danger-100/10 border border-danger-100/20 flex items-start gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { size: 12, className: "text-danger-100 shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-xs)] text-danger-100 break-all", children: error }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setError(null),
          "aria-label": t("common:close"),
          className: "p-0.5 rounded text-text-400 hover:text-text-100 shrink-0",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { size: 10 })
        }
      )
    ] }),
    showCreateForm && canManageWorktrees && /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreateWorktreeForm,
      {
        onSubmit: handleCreate,
        onCancel: () => setShowCreateForm(false),
        isLoading: actionLoading === "create"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto custom-scrollbar", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center h-32 text-text-400 text-[length:var(--fs-sm)] gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 14, className: "animate-spin" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("worktreePanel.loadingWorktrees") })
    ] }) : worktrees.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-32 text-text-400 text-[length:var(--fs-sm)] gap-2 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GitWorktreeIcon, { size: 20, className: "opacity-30" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("worktreePanel.noWorktrees") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setShowCreateForm(true),
          disabled: !canManageWorktrees,
          className: "px-3 py-1.5 text-[length:var(--fs-xs)] bg-bg-200/50 hover:bg-bg-200 text-text-200 rounded-md transition-colors",
          children: t("worktreePanel.createWorktree")
        }
      )
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-1", children: worktrees.map((wt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorktreeItem,
      {
        directory: wt,
        name: getDirectoryName(wt),
        isLoading: actionLoading === `delete-${wt}` || actionLoading === `reset-${wt}`,
        onOpenSession: () => handleOpenSession(wt),
        onDelete: () => setDeleteConfirm({ isOpen: true, directory: wt }),
        onReset: () => setResetConfirm({ isOpen: true, directory: wt })
      },
      wt
    )) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        isOpen: deleteConfirm.isOpen,
        onClose: () => setDeleteConfirm({ isOpen: false, directory: null }),
        onConfirm: () => {
          if (deleteConfirm.directory) {
            handleDelete(deleteConfirm.directory);
          }
        },
        title: t("worktreePanel.removeWorktree"),
        description: t("worktreePanel.removeWorktreeConfirm", {
          name: deleteConfirm.directory ? getDirectoryName(deleteConfirm.directory) : ""
        }),
        confirmText: t("common:remove"),
        variant: "danger"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        isOpen: resetConfirm.isOpen,
        onClose: () => setResetConfirm({ isOpen: false, directory: null }),
        onConfirm: () => {
          if (resetConfirm.directory) {
            handleReset(resetConfirm.directory);
          }
        },
        title: t("worktreePanel.resetWorktree"),
        description: t("worktreePanel.resetWorktreeConfirm", {
          name: resetConfirm.directory ? getDirectoryName(resetConfirm.directory) : ""
        }),
        confirmText: t("common:reset"),
        variant: "danger"
      }
    )
  ] });
});
function CreateWorktreeForm({ onSubmit, onCancel, isLoading }) {
  const { t } = useTranslation(["components", "common"]);
  const [name, setName] = reactExports.useState("");
  const [autoOpen, setAutoOpen] = reactExports.useState(true);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name, autoOpen);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "mx-3 mt-2 p-2.5 rounded-lg bg-bg-100/50 border border-border-200/60", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-300 font-medium mb-2", children: t("worktreePanel.newWorktree") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "text",
        value: name,
        onChange: (e) => setName(e.target.value),
        placeholder: t("worktreePanel.worktreeNamePlaceholder"),
        className: "w-full bg-bg-000 border border-border-200 rounded-md px-2.5 py-1.5 text-[length:var(--fs-sm)] text-text-100 placeholder:text-text-400/60 focus:outline-none focus:border-accent-main-100/50 transition-colors",
        autoFocus: true,
        disabled: isLoading
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 mt-2 cursor-pointer select-none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: autoOpen,
          onChange: (e) => setAutoOpen(e.target.checked),
          disabled: isLoading,
          className: "rounded border-border-200 text-accent-main-100 focus:ring-accent-main-100/30 w-3.5 h-3.5"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-xs)] text-text-300", children: t("worktreePanel.openSessionAfter") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-2 mt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onCancel,
          disabled: isLoading,
          className: "px-2.5 py-1 text-[length:var(--fs-xs)] text-text-300 hover:text-text-100 hover:bg-bg-200/50 rounded-md transition-colors",
          children: t("common:cancel")
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "submit",
          disabled: !name.trim() || isLoading,
          className: "px-2.5 py-1 text-[length:var(--fs-xs)] bg-accent-main-100 hover:bg-accent-main-200 text-oncolor-100 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5",
          children: [
            isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 10, className: "animate-spin" }),
            t("common:create")
          ]
        }
      )
    ] })
  ] });
}
const WorktreeItem = reactExports.memo(function WorktreeItem2({
  directory,
  name,
  isLoading,
  onOpenSession,
  onDelete,
  onReset
}) {
  const { t } = useTranslation(["components", "common"]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-bg-200/50 transition-colors", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-7 h-7 rounded-md bg-bg-200/60 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderIcon, { size: 14, className: "text-text-400" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-text-100 font-medium truncate", children: name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xxs)] text-text-400/70 font-mono truncate", title: directory, children: directory })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 12, className: "animate-spin text-text-400 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onOpenSession,
          className: "p-1 rounded-md text-text-400 hover:text-accent-main-100 hover:bg-accent-main-100/10 transition-colors",
          title: t("worktreePanel.openSession"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLinkIcon, { size: 12 })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onReset,
          className: "p-1 rounded-md text-text-400 hover:text-warning-100 hover:bg-warning-100/10 transition-colors",
          title: t("worktreePanel.resetWorktreeAction"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 12 })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onDelete,
          className: "p-1 rounded-md text-text-400 hover:text-danger-100 hover:bg-danger-100/10 transition-colors",
          title: t("worktreePanel.removeWorktreeAction"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrashIcon, { size: 12 })
        }
      )
    ] })
  ] });
});
export {
  WorktreePanel
};
