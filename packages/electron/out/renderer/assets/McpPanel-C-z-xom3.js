const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./main-CbDQK4WE.js","./main-xvrYfrv0.css","./index-DNB4L3_3.js"])))=>i.map(i=>d[i]);
import { aY as getSDKClient, bV as unwrap, aI as formatPathForApi, bC as reactExports, cf as useTranslation, b$ as useDirectory, bt as logger, ai as __vitePreload, bk as jsxRuntimeExports, U as PlusIcon, Z as RetryIcon, a4 as SpinnerIcon, b as AlertCircleIcon, T as PlugIcon, k as CloseIcon, g as ChevronDownIcon, i as ChevronRightIcon, K as KeyIcon, f as CheckIcon, E as ExternalLinkIcon, ak as apiErrorHandler } from "./main-CbDQK4WE.js";
async function getMcpStatus(directory) {
  const sdk = getSDKClient();
  return unwrap(await sdk.mcp.status({ directory: formatPathForApi(directory) }));
}
async function addMcpServer(name, config, directory) {
  const sdk = getSDKClient();
  unwrap(await sdk.mcp.add({ name, config, directory: formatPathForApi(directory) }));
}
async function connectMcpServer(name, directory) {
  const sdk = getSDKClient();
  unwrap(await sdk.mcp.connect({ name, directory: formatPathForApi(directory) }));
}
async function disconnectMcpServer(name, directory) {
  const sdk = getSDKClient();
  unwrap(await sdk.mcp.disconnect({ name, directory: formatPathForApi(directory) }));
}
async function startMcpAuth(name, directory) {
  const sdk = getSDKClient();
  const result = unwrap(await sdk.mcp.auth.start({ name, directory: formatPathForApi(directory) }));
  return { url: result.authorizationUrl };
}
async function authenticateMcp(name, directory) {
  const sdk = getSDKClient();
  unwrap(await sdk.mcp.auth.authenticate({ name, directory: formatPathForApi(directory) }));
}
const McpPanel = reactExports.memo(function McpPanel2({ isResizing: _isResizing }) {
  const { t } = useTranslation(["components", "common"]);
  const { currentDirectory } = useDirectory();
  const [servers, setServers] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [actionLoading, setActionLoading] = reactExports.useState(null);
  const [showAddForm, setShowAddForm] = reactExports.useState(false);
  const loadStatus = reactExports.useCallback(async () => {
    try {
      setError(null);
      const statusResponse = await getMcpStatus(currentDirectory);
      logger.log("[McpPanel] Status:", statusResponse);
      const entries = Object.entries(statusResponse).map(([name, status]) => ({
        name,
        status
      }));
      entries.sort((a, b) => a.name.localeCompare(b.name));
      setServers(entries);
    } catch (err) {
      apiErrorHandler("load MCP status", err);
      setError(t("mcpPanel.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [currentDirectory, t]);
  reactExports.useEffect(() => {
    loadStatus();
  }, [loadStatus]);
  const handleRefresh = reactExports.useCallback(() => {
    setLoading(true);
    loadStatus();
  }, [loadStatus]);
  const handleConnect = reactExports.useCallback(
    async (name) => {
      setActionLoading(name);
      try {
        await connectMcpServer(name, currentDirectory);
        await new Promise((r) => setTimeout(r, 500));
        await loadStatus();
      } catch (err) {
        apiErrorHandler("connect MCP server", err);
      } finally {
        setActionLoading(null);
      }
    },
    [currentDirectory, loadStatus]
  );
  const handleDisconnect = reactExports.useCallback(
    async (name) => {
      setActionLoading(name);
      try {
        await disconnectMcpServer(name, currentDirectory);
        await new Promise((r) => setTimeout(r, 500));
        await loadStatus();
      } catch (err) {
        apiErrorHandler("disconnect MCP server", err);
      } finally {
        setActionLoading(null);
      }
    },
    [currentDirectory, loadStatus]
  );
  const handleAuth = reactExports.useCallback(
    async (name) => {
      setActionLoading(name);
      try {
        await authenticateMcp(name, currentDirectory);
        await new Promise((r) => setTimeout(r, 3e3));
        await loadStatus();
      } catch {
        try {
          const result = await startMcpAuth(name, currentDirectory);
          if ((await __vitePreload(async () => {
            const { isTauri } = await import("./main-CbDQK4WE.js").then((n) => n.bS);
            return { isTauri };
          }, true ? __vite__mapDeps([0,1]) : void 0, import.meta.url)).isTauri()) {
            __vitePreload(() => import("./index-DNB4L3_3.js"), true ? __vite__mapDeps([2,0,1]) : void 0, import.meta.url).then((mod) => mod.openUrl(result.url)).catch(() => window.open(result.url, "_blank", "noopener,noreferrer"));
          } else {
            window.open(result.url, "_blank", "noopener,noreferrer");
          }
          await new Promise((r) => setTimeout(r, 3e3));
          await loadStatus();
        } catch (err2) {
          apiErrorHandler("start MCP auth", err2);
        }
      } finally {
        setActionLoading(null);
      }
    },
    [currentDirectory, loadStatus]
  );
  const handleAddServer = reactExports.useCallback(
    async (name, config) => {
      setActionLoading("__adding__");
      try {
        await addMcpServer(name, config, currentDirectory);
        setShowAddForm(false);
        await new Promise((r) => setTimeout(r, 500));
        await loadStatus();
      } catch (err) {
        apiErrorHandler("add MCP server", err);
        throw err;
      } finally {
        setActionLoading(null);
      }
    },
    [currentDirectory, loadStatus]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full bg-bg-100", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-10 items-center justify-between px-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-6 min-w-0 items-center gap-1.5 text-text-100 text-[length:var(--fs-xs)] font-medium", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("mcpPanel.title") }),
        !loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex h-4 items-center text-[length:var(--fs-xs)] leading-none text-text-400", children: [
          "(",
          servers.length,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowAddForm(true),
            disabled: showAddForm,
            "aria-label": t("mcpPanel.addServer"),
            className: "inline-flex h-6 w-6 items-center justify-center hover:bg-bg-200/50 rounded-md text-text-300 hover:text-text-100 transition-colors disabled:opacity-50",
            title: t("mcpPanel.addServer"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 12 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: handleRefresh,
            disabled: loading,
            "aria-label": t("common:refresh"),
            className: "inline-flex h-6 w-6 items-center justify-center hover:bg-bg-200/50 rounded-md text-text-300 hover:text-text-100 transition-colors disabled:opacity-50",
            title: t("common:refresh"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 12, className: loading ? "animate-spin" : "" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-auto", children: [
      showAddForm && /* @__PURE__ */ jsxRuntimeExports.jsx(
        AddServerForm,
        {
          onSubmit: handleAddServer,
          onCancel: () => setShowAddForm(false),
          isLoading: actionLoading === "__adding__"
        }
      ),
      loading && servers.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 20, className: "animate-spin opacity-50" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("mcpPanel.loadingServers") })
      ] }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { size: 20, className: "text-danger-100" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: error }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: handleRefresh,
            className: "px-3 py-1.5 text-[length:var(--fs-sm)] bg-bg-200/50 hover:bg-bg-200 text-text-200 rounded-md transition-colors",
            children: t("common:retry")
          }
        )
      ] }) : servers.length === 0 && !showAddForm ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2 px-4 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PlugIcon, { size: 24, className: "opacity-30" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("mcpPanel.noServers") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowAddForm(true),
            className: "px-3 py-1.5 text-[length:var(--fs-sm)] bg-bg-200/50 hover:bg-bg-200 text-text-200 rounded-md transition-colors",
            children: t("mcpPanel.addServer")
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-1", children: servers.map((server) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        ServerItem,
        {
          server,
          isLoading: actionLoading === server.name,
          onConnect: handleConnect,
          onDisconnect: handleDisconnect,
          onAuth: handleAuth
        },
        server.name
      )) })
    ] })
  ] });
});
const AddServerForm = reactExports.memo(function AddServerForm2({ onSubmit, onCancel, isLoading }) {
  const { t } = useTranslation(["components", "common"]);
  const [serverType, setServerType] = reactExports.useState("local");
  const [name, setName] = reactExports.useState("");
  const [command, setCommand] = reactExports.useState("");
  const [url, setUrl] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t("mcpPanel.nameRequired"));
      return;
    }
    try {
      if (serverType === "local") {
        if (!command.trim()) {
          setError(t("mcpPanel.commandRequired"));
          return;
        }
        const cmdParts = command.trim().split(/\s+/);
        await onSubmit(name.trim(), {
          type: "local",
          command: cmdParts
        });
      } else {
        if (!url.trim()) {
          setError(t("mcpPanel.urlRequired"));
          return;
        }
        await onSubmit(name.trim(), {
          type: "remote",
          url: url.trim()
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mcpPanel.failedToAdd"));
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "m-3 rounded-lg border border-border-200/60 bg-bg-100/50 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-base)] font-medium text-text-100", children: t("mcpPanel.addMcpServer") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onCancel,
          className: "p-1 hover:bg-bg-200/50 rounded-md text-text-400 hover:text-text-100 transition-colors",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { size: 14 })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setServerType("local"),
          className: `flex-1 px-3 py-1.5 text-[length:var(--fs-sm)] rounded-md transition-colors ${serverType === "local" ? "bg-accent-main-100/20 text-accent-main-100 border border-accent-main-100/50" : "bg-bg-200/50 text-text-300 border border-transparent hover:bg-bg-200"}`,
          children: t("mcpPanel.local")
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setServerType("remote"),
          className: `flex-1 px-3 py-1.5 text-[length:var(--fs-sm)] rounded-md transition-colors ${serverType === "remote" ? "bg-accent-main-100/20 text-accent-main-100 border border-accent-main-100/50" : "bg-bg-200/50 text-text-300 border border-transparent hover:bg-bg-200"}`,
          children: t("mcpPanel.remote")
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "text",
        value: name,
        onChange: (e) => setName(e.target.value),
        placeholder: t("mcpPanel.serverName"),
        className: "w-full px-2 py-1.5 text-[length:var(--fs-sm)] bg-bg-000 border border-border-200 rounded-md text-text-100 placeholder-text-500 focus:border-accent-main-100 focus-visible:ring-1 focus-visible:ring-accent-main-100/40 focus-visible:ring-inset"
      }
    ) }),
    serverType === "local" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "text",
        value: command,
        onChange: (e) => setCommand(e.target.value),
        placeholder: t("mcpPanel.commandPlaceholder"),
        className: "w-full px-2 py-1.5 text-[length:var(--fs-sm)] bg-bg-000 border border-border-200 rounded-md text-text-100 placeholder-text-500 focus:border-accent-main-100 focus-visible:ring-1 focus-visible:ring-accent-main-100/40 focus-visible:ring-inset"
      }
    ) }),
    serverType === "remote" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "text",
        value: url,
        onChange: (e) => setUrl(e.target.value),
        placeholder: t("mcpPanel.urlPlaceholder"),
        className: "w-full px-2 py-1.5 text-[length:var(--fs-sm)] bg-bg-000 border border-border-200 rounded-md text-text-100 placeholder-text-500 focus:border-accent-main-100 focus-visible:ring-1 focus-visible:ring-accent-main-100/40 focus-visible:ring-inset"
      }
    ) }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 text-[length:var(--fs-sm)] text-danger-100", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "submit",
        disabled: isLoading,
        className: "w-full px-3 py-1.5 text-[length:var(--fs-sm)] bg-accent-main-100 hover:bg-accent-main-200 text-oncolor-100 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2",
        children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 12, className: "animate-spin" }),
          t("common:adding")
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 12 }),
          t("mcpPanel.addServer")
        ] })
      }
    )
  ] });
});
const ServerItem = reactExports.memo(function ServerItem2({ server, isLoading, onConnect, onDisconnect, onAuth }) {
  const { t } = useTranslation(["components", "common"]);
  const { name, status } = server;
  const [expanded, setExpanded] = reactExports.useState(false);
  const getErrorMessage = () => {
    if (status.status === "failed") {
      return status.error;
    }
    if (status.status === "needs_client_registration") {
      return status.error;
    }
    return null;
  };
  const errorMessage = getErrorMessage();
  const getStatusInfo = () => {
    switch (status.status) {
      case "connected":
        return { color: "text-success-100", label: t("mcpPanel.connected"), icon: CheckIcon };
      case "disabled":
        return { color: "text-text-400", label: t("mcpPanel.disabled"), icon: null };
      case "failed":
        return { color: "text-danger-100", label: t("common:failed"), icon: AlertCircleIcon };
      case "needs_auth":
        return { color: "text-warning-100", label: t("mcpPanel.needsAuth"), icon: KeyIcon };
      case "needs_client_registration":
        return { color: "text-warning-100", label: t("mcpPanel.needsRegistration"), icon: KeyIcon };
      default:
        return { color: "text-text-400", label: t("common:unknown"), icon: null };
    }
  };
  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const renderActions = () => {
    if (isLoading) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 14, className: "animate-spin text-text-400" });
    }
    switch (status.status) {
      case "connected":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              onDisconnect(name);
            },
            className: "px-2 py-0.5 text-[length:var(--fs-sm)] bg-bg-300/50 hover:bg-danger-bg hover:text-danger-100 text-text-300 rounded-md transition-colors",
            children: t("mcpPanel.disconnect")
          }
        );
      case "disabled":
      case "failed":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              onConnect(name);
            },
            className: "px-2 py-0.5 text-[length:var(--fs-sm)] bg-bg-300/50 hover:bg-success-bg hover:text-success-100 text-text-300 rounded-md transition-colors",
            children: t("mcpPanel.connect")
          }
        );
      case "needs_auth":
      case "needs_client_registration":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              onAuth(name);
            },
            className: "px-2 py-0.5 text-[length:var(--fs-sm)] bg-warning-bg hover:bg-warning-bg/80 text-warning-100 rounded-md transition-colors flex items-center gap-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLinkIcon, { size: 10 }),
              t("mcpPanel.authenticate")
            ]
          }
        );
      default:
        return null;
    }
  };
  const getStatusDotColor = () => {
    switch (status.status) {
      case "connected":
        return "bg-success-100";
      case "disabled":
        return "bg-text-500";
      case "failed":
        return "bg-danger-100";
      case "needs_auth":
      case "needs_client_registration":
        return "bg-warning-100";
      default:
        return "bg-text-500";
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex items-center gap-2 rounded-md px-2 py-2 hover:bg-bg-200/50 transition-colors",
        onClick: () => errorMessage && setExpanded(!expanded),
        children: [
          errorMessage ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-400 shrink-0 cursor-pointer", children: expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 12 }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-3 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2 h-2 rounded-full shrink-0 ${getStatusDotColor()}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-base)] text-text-100 truncate", children: name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `text-[length:var(--fs-sm)] ${statusInfo.color} flex items-center gap-1`, children: [
              StatusIcon && /* @__PURE__ */ jsxRuntimeExports.jsx(StatusIcon, { size: 10 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: statusInfo.label }),
              errorMessage && !expanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-text-500 ml-1 truncate max-w-[200px]", title: errorMessage, children: [
                "- ",
                errorMessage
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 shrink-0", children: renderActions() })
        ]
      }
    ),
    expanded && errorMessage && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-2 mb-1 ml-7 rounded-md bg-danger-bg px-2 py-2 text-[length:var(--fs-sm)] text-text-200 break-words font-mono", children: errorMessage })
  ] });
});
export {
  McpPanel
};
