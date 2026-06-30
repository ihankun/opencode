const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-DNB4L3_3.js","./main-CbDQK4WE.js","./main-xvrYfrv0.css","./configOfficialValidator-TABM96Q5.js"])))=>i.map(i=>d[i]);
import { aY as getSDKClient, bV as unwrap, aI as formatPathForApi, bC as reactExports, aV as getPathMode, aO as getEffectivePathStyle, aM as getDetectedPathStyle, bQ as subscribePathMode, bL as setPathMode, cf as useTranslation, c5 as useKeybindingStore, bk as jsxRuntimeExports, a1 as SearchIcon, bm as keyEventToString, ab as UndoIcon, bz as parseKeybinding, aG as formatKeybinding, am as autoApproveStore, bT as themeStore, ce as useTheme, e as Button, a7 as SystemIcon, a6 as SunIcon, N as MoonIcon, g as ChevronDownIcon, f as CheckIcon, a9 as Trans, bI as saveData, F as FONT_SCALE_MAX, t as FONT_SCALE_MIN, a_ as getThemePreset, aE as exportUpdateSettingsBackup, aC as exportSoundBackup, av as exportKeybindingBackup, aB as exportServiceSettingsBackup, az as exportPerServerStorageBackup, aA as exportServerSettingsBackup, aw as exportLayoutBackup, aD as exportThemeBackup, bb as importThemeBackup, b4 as importLayoutBackup, b8 as importServerSettingsBackup, b7 as importPerServerStorageBackup, b9 as importServiceSettingsBackup, b3 as importKeybindingBackup, ba as importSoundBackup, bc as importUpdateSettingsBackup, ax as exportNotificationEventSettingsBackup, ay as exportNotificationPreferencesBackup, a0 as STORAGE_KEY_NOTIFICATIONS_ENABLED, b6 as importNotificationPreferencesBackup, b5 as importNotificationEventSettingsBackup, cg as useUpdateStore, b2 as hasUpdateAvailable, bX as updateStore, X as RELEASES_PAGE_URL, Z as RetryIcon, E as ExternalLinkIcon, r as DownloadIcon, ac as UploadIcon, bi as isTauri, ai as __vitePreload, c4 as useIsMobile, P as PathAutoIcon, O as PathUnixIcon, Q as PathWindowsIcon, c7 as useModels, c2 as useHiddenModelKeys, aU as getModelKey, b1 as groupModelsByProvider, k as CloseIcon, bv as modelVisibilityStore, c8 as useNotification, by as notificationStore, cd as useSoundSettings, d as BellIcon, bM as soundStore, ae as VolumeIcon, af as VolumeOffIcon, a3 as ShieldIcon, V as QuestionIcon, b as AlertCircleIcon, c9 as useNotificationEventSettings, bx as notificationEventSettingsStore, bh as isSoundSupported, bA as playSound, S as PlayIcon, $ as SOUND_OPTIONS, B as BUILTIN_SOUNDS, aa as TrashIcon, cc as useServiceStore, cb as useServerStore, L as LOCAL_SERVER_ID, bJ as serviceStore, A as API_BASE_URL, a5 as StopIcon, a4 as SpinnerIcon, ag as WifiIcon, ah as WifiOffIcon, al as applyLocalServiceUrl, ak as apiErrorHandler, ca as useRouter, bu as messageStore, U as PlusIcon, x as GlobeIcon, K as KeyIcon, R as PencilIcon, n as ConfirmDialog, c6 as useLayoutStore, bo as layoutStore, bB as reactDomExports, h as ChevronLeftIcon, i as ChevronRightIcon, o as CopyIcon, a2 as SettingsIcon, bY as useCurrentDirectory, bp as listAvailableShells, D as Dialog, y as KeyboardIcon, m as CogIcon, T as PlugIcon, z as LayersIcon, p as CpuIcon, J as MessageSquareIcon, a as AgentIcon } from "./main-CbDQK4WE.js";
async function getConfig(directory) {
  const sdk = getSDKClient();
  return unwrap(await sdk.config.get({ directory: formatPathForApi(directory) }));
}
async function getGlobalConfig() {
  const sdk = getSDKClient();
  return unwrap(await sdk.global.config.get());
}
async function updateGlobalConfig(config) {
  const sdk = getSDKClient();
  return unwrap(await sdk.global.config.update({ config }));
}
async function getProviderConfigs(directory) {
  const sdk = getSDKClient();
  return unwrap(await sdk.config.providers({ directory: formatPathForApi(directory) }));
}
function usePathMode() {
  const [pathMode, setPathModeState] = reactExports.useState(getPathMode);
  const [effectiveStyle, setEffectiveStyle] = reactExports.useState(getEffectivePathStyle);
  const [detectedStyle, setDetectedStyle] = reactExports.useState(getDetectedPathStyle);
  reactExports.useEffect(() => {
    const unsubscribe = subscribePathMode((mode, style) => {
      setPathModeState(mode);
      setEffectiveStyle(style);
      setDetectedStyle(getDetectedPathStyle());
    });
    return unsubscribe;
  }, []);
  const setPathMode$1 = reactExports.useCallback((mode) => {
    setPathMode(mode);
    setPathModeState(mode);
    setEffectiveStyle(getEffectivePathStyle());
  }, []);
  return {
    pathMode,
    effectiveStyle,
    detectedStyle,
    setPathMode: setPathMode$1,
    isAutoMode: pathMode === "auto",
    isWindowsStyle: effectiveStyle === "windows"
  };
}
const ACTION_TRANSLATION_KEYS = {
  openSettings: { label: "openSettings", description: "openSettingsDesc" },
  openProject: { label: "openProject", description: "openProjectDesc" },
  commandPalette: { label: "commandPalette", description: "commandPaletteDesc" },
  toggleSidebar: { label: "toggleSidebar", description: "toggleSidebarDesc" },
  toggleRightPanel: { label: "toggleRightPanel", description: "toggleRightPanelDesc" },
  focusInput: { label: "focusInput", description: "focusInputDesc" },
  newSession: { label: "newSession", description: "newSessionDesc" },
  archiveSession: { label: "archiveSession", description: "archiveSessionDesc" },
  previousSession: { label: "previousSession", description: "previousSessionDesc" },
  nextSession: { label: "nextSession", description: "nextSessionDesc" },
  toggleTerminal: { label: "toggleTerminal", description: "toggleTerminalDesc" },
  newTerminal: { label: "newTerminal", description: "newTerminalDesc" },
  "terminal.copySelection": { label: "terminalCopySelection", description: "terminalCopySelectionDesc" },
  "terminal.paste": { label: "terminalPaste", description: "terminalPasteDesc" },
  selectModel: { label: "selectModel", description: "selectModelDesc" },
  toggleAgent: { label: "toggleAgent", description: "toggleAgentDesc" },
  sendMessage: { label: "sendMessage", description: "sendMessageDesc" },
  cancelMessage: { label: "cancelMessage", description: "cancelMessageDesc" },
  copyLastResponse: { label: "copyLastResponse", description: "copyLastResponseDesc" },
  toggleFullAuto: { label: "toggleFullAuto", description: "toggleFullAutoDesc" },
  focusNextPane: { label: "focusNextPane", description: "focusNextPaneDesc" },
  focusPrevPane: { label: "focusPrevPane", description: "focusPrevPaneDesc" },
  splitRight: { label: "splitRight", description: "splitRightDesc" },
  splitDown: { label: "splitDown", description: "splitDownDesc" },
  closePane: { label: "closePane", description: "closePaneDesc" },
  togglePaneFullscreen: { label: "togglePaneFullscreen", description: "togglePaneFullscreenDesc" }
};
function Kbd({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "kbd",
    {
      className: "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5\n                    text-[length:var(--fs-xs)] font-mono font-medium leading-none\n                    bg-bg-100 text-text-300 border border-border-200 rounded\n                    shadow-[0_1px_0_0_var(--border-200)]",
      children
    }
  );
}
function ShortcutDisplay({ shortcut, className }) {
  const parsed = parseKeybinding(shortcut);
  const formatted = formatKeybinding(parsed);
  const parts = formatted.split(" + ");
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center gap-0.5 ${className || ""}`, children: parts.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Kbd, { children: p }, i)) });
}
function KeybindingRow({ config, onEdit, onReset, isKeyUsed, t }) {
  const [isEditing, setIsEditing] = reactExports.useState(false);
  const [tempKey, setTempKey] = reactExports.useState("");
  const [error, setError] = reactExports.useState("");
  const captureRef = reactExports.useRef(null);
  const isModified = config.currentKey !== config.defaultKey;
  reactExports.useEffect(() => {
    if (isEditing) captureRef.current?.focus();
  }, [isEditing]);
  const handleKeyDown = reactExports.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;
      const newKey = keyEventToString(e);
      setTempKey(newKey);
      setError(isKeyUsed(newKey, config.action, config.scope) ? t("keybindings.alreadyInUse") : "");
    },
    [isKeyUsed, config.action, config.scope, t]
  );
  const confirm = reactExports.useCallback(() => {
    if (tempKey && !error) onEdit(config.action, tempKey);
    setIsEditing(false);
    setTempKey("");
    setError("");
  }, [tempKey, error, onEdit, config.action]);
  const cancel = reactExports.useCallback(() => {
    setIsEditing(false);
    setTempKey("");
    setError("");
  }, []);
  reactExports.useEffect(() => {
    if (!isEditing) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
        return;
      }
      if (e.key === "Enter" && tempKey && !error) {
        e.preventDefault();
        confirm();
        return;
      }
      handleKeyDown(e);
    };
    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [isEditing, tempKey, error, handleKeyDown, confirm, cancel]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `
      flex items-center h-9 px-3 rounded-md transition-colors group
      ${isEditing ? "bg-accent-main-100/5 ring-1 ring-accent-main-100/20" : "hover:bg-bg-100/60"}
    `,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-[length:var(--fs-md)] text-text-200 truncate", children: config.label }),
        isModified && !isEditing && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => onReset(config.action),
            className: "p-1 mr-1 rounded text-text-400 hover:text-text-100 hover:bg-bg-200 \n                     opacity-0 group-hover:opacity-100 transition-opacity",
            title: t("keybindings.resetToDefault"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(UndoIcon, { size: 12 })
          }
        ),
        isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              ref: captureRef,
              tabIndex: 0,
              className: `
              min-w-[120px] h-7 flex items-center justify-center px-3 
              text-[length:var(--fs-sm)] font-mono rounded border-2 outline-none
              ${error ? "border-danger-100/60 bg-danger-100/5 text-danger-100" : "border-accent-main-100/60 bg-accent-main-100/5 text-accent-main-100"}
            `,
              children: tempKey || /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-400", children: "..." })
            }
          ),
          error && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-xs)] text-danger-100", children: error })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              setIsEditing(true);
              setTempKey("");
              setError("");
            },
            className: `
            h-7 flex items-center gap-0.5 px-1 rounded transition-colors
            ${isModified ? "hover:bg-accent-main-100/10" : "hover:bg-bg-200/60"}
          `,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              ShortcutDisplay,
              {
                shortcut: config.currentKey,
                className: isModified ? "[&_kbd]:border-accent-main-100/40 [&_kbd]:text-accent-main-100" : ""
              }
            )
          }
        )
      ]
    }
  );
}
const CATEGORY_ORDER = [
  "general",
  "session",
  "pane",
  "terminal",
  "model",
  "message",
  "permission"
];
const CATEGORY_LABELS = {
  general: "keybindings.categories.general",
  session: "keybindings.categories.session",
  pane: "keybindings.categories.pane",
  terminal: "keybindings.categories.terminal",
  model: "keybindings.categories.model",
  message: "keybindings.categories.message",
  permission: "keybindings.categories.permission"
};
function KeybindingsSection() {
  const { t } = useTranslation(["settings", "common", "commands"]);
  const { keybindings, setKeybinding, resetKeybinding, resetAll, isKeyUsed } = useKeybindingStore();
  const [search, setSearch] = reactExports.useState("");
  const searchRef = reactExports.useRef(null);
  const localizedKeybindings = reactExports.useMemo(
    () => keybindings.map((kb) => ({
      ...kb,
      label: t(`commands:${ACTION_TRANSLATION_KEYS[kb.action].label}`),
      description: t(`commands:${ACTION_TRANSLATION_KEYS[kb.action].description}`)
    })),
    [keybindings, t]
  );
  const filtered = reactExports.useMemo(() => {
    if (!search.trim()) return localizedKeybindings;
    const q = search.toLowerCase();
    return localizedKeybindings.filter(
      (kb) => kb.label.toLowerCase().includes(q) || kb.description.toLowerCase().includes(q) || kb.currentKey.toLowerCase().includes(q)
    );
  }, [localizedKeybindings, search]);
  const grouped = reactExports.useMemo(
    () => CATEGORY_ORDER.map((cat) => ({ category: cat, items: filtered.filter((kb) => kb.category === cat) })).filter(
      (g) => g.items.length > 0
    ),
    [filtered]
  );
  const hasModifications = localizedKeybindings.some((kb) => kb.currentKey !== kb.defaultKey);
  reactExports.useEffect(() => {
    searchRef.current?.focus();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-sm)] font-medium text-text-400 uppercase tracking-wider", children: t("keybindings.title") }),
      hasModifications && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: resetAll,
          className: "text-[length:var(--fs-xs)] text-text-400 hover:text-danger-100 px-2 py-0.5 rounded hover:bg-danger-100/10 transition-colors",
          children: t("keybindings.resetAll")
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SearchIcon, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-text-400 pointer-events-none" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: searchRef,
          type: "text",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: t("keybindings.filterPlaceholder"),
          className: "w-full h-8 pl-8 pr-3 text-[length:var(--fs-md)] bg-bg-050 border border-border-200 rounded-lg\n                     text-text-100 placeholder:text-text-400 \n                     focus:outline-none focus:border-accent-main-100/50 transition-colors"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "-mx-1", children: grouped.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center text-[length:var(--fs-base)] text-text-400", children: t("common:noMatches") }) : grouped.map(({ category, items }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-1 text-[length:var(--fs-xs)] font-medium text-text-400 uppercase tracking-wider", children: t(CATEGORY_LABELS[category]) }),
      items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        KeybindingRow,
        {
          config: item,
          onEdit: setKeybinding,
          onReset: resetKeybinding,
          isKeyUsed,
          t
        },
        item.action
      ))
    ] }, category)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-3 mt-2 border-t border-border-100/50 text-[length:var(--fs-xs)] text-text-400", children: t("keybindings.clickToRebind") })
  ] });
}
function Toggle({
  enabled,
  onChange,
  ariaLabel
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": enabled,
      "aria-label": ariaLabel,
      onClick: (e) => {
        e.stopPropagation();
        onChange();
      },
      className: `group/switch relative select-none cursor-pointer rounded-full transition-all
        ring-[0.5px] ring-border-200 hover:ring-[1px]
        focus-visible:outline focus-visible:outline-[1px] focus-visible:outline-accent-main-100 focus-visible:outline-offset-2
        ${enabled ? "bg-accent-main-100 !ring-[0px] hover:!ring-[1px] hover:ring-accent-main-100/60" : "bg-bg-300"}`,
      style: { width: 36, height: 20 },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `absolute flex items-center justify-center top-[2px] left-[2px] rounded-full transition-all
          bg-white ring-[0.5px] ring-inset ring-border-200
          ${enabled ? "!ring-[0px]" : ""}`,
          style: {
            height: 16,
            width: 16,
            transform: enabled ? "translateX(16px)" : "translateX(0px)"
          }
        }
      )
    }
  );
}
function SegmentedControl({ value, options, onChange }) {
  const activeIndex = options.findIndex((o) => o.value === value);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "bg-bg-100/50 p-0.5 rounded-lg flex border border-border-200/50 relative isolate",
      role: "tablist",
      onKeyDown: (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const dir = e.key === "ArrowRight" ? 1 : -1;
          const next = (activeIndex + dir + options.length) % options.length;
          onChange(options[next].value);
        }
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute top-0.5 bottom-0.5 left-0.5 bg-bg-000 rounded-md shadow-sm ring-1 ring-border-200/50 transition-transform duration-300 ease-out -z-10",
            style: {
              width: `calc((100% - 4px) / ${options.length})`,
              transform: `translateX(${activeIndex * 100}%)`
            }
          }
        ),
        options.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            role: "tab",
            "aria-selected": opt.value === value,
            tabIndex: opt.value === value ? 0 : -1,
            onClick: (e) => onChange(opt.value, e),
            className: `flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[length:var(--fs-md)] font-medium transition-colors duration-200
            ${opt.value === value ? "text-text-100" : "text-text-400 hover:text-text-200"}`,
            children: [
              opt.icon,
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: opt.label })
            ]
          },
          opt.value
        ))
      ]
    }
  );
}
function SettingRow({ label, description, icon, children, onClick, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `w-full flex flex-row gap-x-8 gap-y-3 justify-between items-center
        ${onClick ? "cursor-pointer" : ""}
        ${className || ""}`,
      onClick,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0 flex-1", children: [
          icon && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-400 shrink-0", children: icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] font-medium text-text-100", children: label }),
            description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400 leading-relaxed", children: description })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0", children })
      ]
    }
  );
}
function SettingsSection({ title, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex flex-col gap-5 border-b border-border-200/50 last:!border-b-0 mb-7 pb-7 last:mb-0 last:pb-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-[length:var(--fs-base)] font-semibold text-text-100", children: title }),
    children
  ] });
}
function SettingsCard({
  title,
  description,
  actions,
  children,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: `rounded-xl border border-border-200/55 bg-bg-050/55 p-3.5 ${className || ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3 mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-md)] font-semibold text-text-100", children: title }),
        description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mt-0.5 leading-relaxed", children: description })
      ] }),
      actions && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0", children: actions })
    ] }),
    children
  ] });
}
function AgentSettings() {
  const { t } = useTranslation(["settings"]);
  const [alwaysAllowMode, setAlwaysAllowMode] = reactExports.useState(autoApproveStore.alwaysAllowMode);
  const [approvePendingOnFullAuto, setApprovePendingOnFullAuto] = reactExports.useState(autoApproveStore.approvePendingOnFullAuto);
  const [queueFollowupMessages, setQueueFollowupMessages] = reactExports.useState(themeStore.queueFollowupMessages);
  const [descriptiveToolSteps, setDescriptiveToolSteps] = reactExports.useState(themeStore.descriptiveToolSteps);
  const [inlineToolRequests, setInlineToolRequests] = reactExports.useState(themeStore.inlineToolRequests);
  const [toolCardStyle, setToolCardStyle] = reactExports.useState(themeStore.toolCardStyle);
  const [immersiveMode, setImmersiveMode] = reactExports.useState(themeStore.immersiveMode);
  const [compactInlinePermission, setCompactInlinePermission] = reactExports.useState(themeStore.compactInlinePermission);
  const handleAlwaysAllowModeChange = (mode) => {
    setAlwaysAllowMode(mode);
    autoApproveStore.setAlwaysAllowMode(mode);
    if (mode === "backend") autoApproveStore.clearAllRules();
  };
  const handleApprovePendingOnFullAutoToggle = () => {
    const next = !approvePendingOnFullAuto;
    setApprovePendingOnFullAuto(next);
    autoApproveStore.setApprovePendingOnFullAuto(next);
  };
  const handleQueueFollowupMessagesToggle = () => {
    const next = !queueFollowupMessages;
    setQueueFollowupMessages(next);
    themeStore.setQueueFollowupMessages(next);
  };
  const handleDescriptiveToolStepsToggle = () => {
    const next = !descriptiveToolSteps;
    setDescriptiveToolSteps(next);
    themeStore.setDescriptiveToolSteps(next);
  };
  const handleInlineToolRequestsToggle = () => {
    const next = !inlineToolRequests;
    setInlineToolRequests(next);
    themeStore.setInlineToolRequests(next);
  };
  const handleCompactInlinePermissionToggle = () => {
    const next = !compactInlinePermission;
    setCompactInlinePermission(next);
    themeStore.setCompactInlinePermission(next);
  };
  const handleToolCardStyleChange = (style) => {
    setToolCardStyle(style);
    themeStore.setToolCardStyle(style);
  };
  const handleImmersiveModeToggle = () => {
    const next = !immersiveMode;
    setImmersiveMode(next);
    themeStore.setImmersiveMode(next);
    setInlineToolRequests(next);
    setDescriptiveToolSteps(next);
    setToolCardStyle(next ? "compact" : "classic");
    setCompactInlinePermission(next);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("agent.behavior"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("agent.behaviorDesc") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-100 mb-1.5", children: t("chat.alwaysAllowMode") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400 mb-3", children: t("chat.alwaysAllowModeDesc") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: alwaysAllowMode,
            options: [
              { value: "backend", label: t("chat.alwaysAllowBackend") },
              { value: "frontend", label: t("chat.alwaysAllowFrontend") }
            ],
            onChange: (v) => handleAlwaysAllowModeChange(v)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.approvePendingOnFullAuto"),
          description: t("chat.approvePendingOnFullAutoDesc"),
          onClick: handleApprovePendingOnFullAutoToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: approvePendingOnFullAuto, onChange: handleApprovePendingOnFullAutoToggle })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.queueFollowupMessages"),
          description: t("chat.queueFollowupMessagesDesc"),
          onClick: handleQueueFollowupMessagesToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: queueFollowupMessages, onChange: handleQueueFollowupMessagesToggle })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("agent.toolInteraction"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("agent.toolInteractionDesc") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.immersiveMode"),
          description: t("chat.immersiveModeDesc"),
          onClick: handleImmersiveModeToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: immersiveMode, onChange: handleImmersiveModeToggle })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.inlineToolRequests"),
          description: t("chat.inlineToolRequestsDesc"),
          onClick: handleInlineToolRequestsToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: inlineToolRequests, onChange: handleInlineToolRequestsToggle })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.descriptiveToolSteps"),
          description: t("chat.descriptiveToolStepsDesc"),
          onClick: handleDescriptiveToolStepsToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: descriptiveToolSteps, onChange: handleDescriptiveToolStepsToggle })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.compactInlinePermission"),
          description: t("chat.compactInlinePermissionDesc"),
          onClick: handleCompactInlinePermissionToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: compactInlinePermission, onChange: handleCompactInlinePermissionToggle })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-100 mb-1.5", children: t("chat.toolCardStyle") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400 mb-3", children: t("chat.toolCardStyleDesc") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: toolCardStyle,
            options: [
              { value: "classic", label: t("chat.toolCardClassic") },
              { value: "compact", label: t("chat.toolCardCompact") }
            ],
            onChange: (v) => handleToolCardStyleChange(v)
          }
        )
      ] })
    ] })
  ] });
}
const FALLBACK_PREVIEW_COLORS = {
  bg: "#f0f0f0",
  accent: "#888888",
  text: "#333333"
};
function toCssHsl(token) {
  return `hsl(${token})`;
}
function getPresetPreviewColors(id, resolvedTheme) {
  const preset = getThemePreset(id);
  if (!preset) return FALLBACK_PREVIEW_COLORS;
  const colors = resolvedTheme === "dark" ? preset.dark : preset.light;
  return {
    bg: toCssHsl(colors.background.bg100),
    accent: toCssHsl(colors.accent.main100),
    text: toCssHsl(colors.text.text100)
  };
}
function getSnippetFileName(name) {
  const safe = name.trim().replace(/[<>:"/\\|?*]/g, "").replace(new RegExp("\\p{Cc}", "gu"), "").replace(/\s+/g, "-");
  return `${safe || "custom-css"}.css`;
}
function PresetCard({
  id,
  name,
  description,
  isActive,
  onClick,
  resolvedTheme
}) {
  const colors = getPresetPreviewColors(id, resolvedTheme);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      onClick,
      className: `flex items-start gap-3 p-3 rounded-lg border transition-all text-left w-full
        ${isActive ? "border-accent-main-100/60 bg-accent-main-100/5 ring-1 ring-accent-main-100/20" : "border-border-200/50 hover:border-border-300 hover:bg-bg-100/50"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "shrink-0 w-8 h-8 rounded-md border border-border-200/30 overflow-hidden relative mt-0.5",
            style: { backgroundColor: colors.bg },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-0 left-0 right-0 h-2", style: { backgroundColor: colors.accent } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "absolute top-1.5 left-1.5 w-3 h-0.5 rounded-full",
                  style: { backgroundColor: colors.text, opacity: 0.6 }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "absolute top-3 left-1.5 w-2 h-0.5 rounded-full",
                  style: { backgroundColor: colors.text, opacity: 0.3 }
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-md)] font-medium text-text-100", children: name }),
            isActive && /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { size: 12, className: "text-accent-main-100 shrink-0" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mt-0.5", children: description })
        ] })
      ]
    }
  );
}
const sliderCls = `flex-1 h-1.5 rounded-full appearance-none cursor-pointer
  bg-bg-200
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:w-3.5
  [&::-webkit-slider-thumb]:h-3.5
  [&::-webkit-slider-thumb]:rounded-full
  [&::-webkit-slider-thumb]:bg-accent-main-100
  [&::-webkit-slider-thumb]:shadow-sm
  [&::-webkit-slider-thumb]:border-2
  [&::-webkit-slider-thumb]:border-bg-000
  [&::-webkit-slider-thumb]:cursor-pointer
  [&::-moz-range-thumb]:w-3.5
  [&::-moz-range-thumb]:h-3.5
  [&::-moz-range-thumb]:rounded-full
  [&::-moz-range-thumb]:bg-accent-main-100
  [&::-moz-range-thumb]:border-2
  [&::-moz-range-thumb]:border-bg-000
  [&::-moz-range-thumb]:cursor-pointer
  [&::-moz-range-track]:bg-bg-200
  [&::-moz-range-track]:rounded-full
  [&::-moz-range-track]:h-1.5`;
function FontScaleSlider({
  value,
  onChange,
  baseSize
}) {
  const displayPx = baseSize + value;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 w-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-400 text-[length:var(--fs-xs)] select-none shrink-0", style: { fontSize: 11 }, children: "A" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "range",
        min: FONT_SCALE_MIN,
        max: FONT_SCALE_MAX,
        step: 1,
        value,
        onChange: (e) => onChange(Number(e.target.value)),
        className: sliderCls
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-400 select-none shrink-0", style: { fontSize: 16 }, children: "A" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[length:var(--fs-sm)] text-text-300 w-12 text-right tabular-nums shrink-0", children: [
      displayPx,
      "px"
    ] })
  ] });
}
function CustomCSSEditor({
  value,
  onChange,
  onImportFile,
  onLoadTemplate,
  onClear,
  t
}) {
  const [localValue, setLocalValue] = reactExports.useState(value);
  const debounceRef = reactExports.useRef(null);
  const fileInputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    setLocalValue(value);
  }, [value]);
  const handleChange = (newVal) => {
    setLocalValue(newVal);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(newVal), 400);
  };
  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const css = event.target?.result;
      setLocalValue(css);
      onImportFile(css);
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const template = `/* ====== One Dark Inspired Theme Template ====== */
/* Palette inspired by Atom One Dark / One Dark Pro (MIT). */
/* Use HSL token values: H S% L% (without hsl()). */

/* Optional font imports (must stay at top if enabled) */
/* @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'); */

/* ====== Fonts ====== */
:root:root {
  --font-ui-sans: 'Inter', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'SF Mono', Menlo, Consolas, 'Liberation Mono',
    'DejaVu Sans Mono', 'Noto Sans Mono', 'Noto Sans Mono CJK SC', monospace;
}

/* ====== Light (default + manual light) ====== */
:root:root,
:root:root[data-mode='light'] {
  /* Background */
  --bg-000: 220 30% 99%;
  --bg-100: 220 25% 96%;
  --bg-200: 220 20% 92%;
  --bg-300: 220 16% 88%;
  --bg-400: 220 14% 82%;

  /* Text */
  --text-000: 0 0% 100%;
  --text-100: 220 16% 17%;
  --text-200: 220 12% 35%;
  --text-300: 220 10% 50%;
  --text-400: 220 8% 62%;
  --text-500: 220 7% 72%;
  --text-600: 220 10% 84%;

  /* Accent */
  --accent-brand: 286 50% 52%;
  --accent-main-000: 207 70% 46%;
  --accent-main-100: 207 78% 54%;
  --accent-main-200: 207 86% 62%;
  --accent-secondary-100: 187 50% 43%;

  /* Semantic */
  --success-100: 95 36% 42%;
  --success-200: 95 30% 34%;
  --success-bg: 95 45% 93%;
  --warning-100: 37 84% 46%;
  --warning-200: 37 76% 39%;
  --warning-bg: 37 90% 92%;
  --danger-000: 355 58% 42%;
  --danger-100: 355 68% 54%;
  --danger-200: 355 74% 63%;
  --danger-bg: 355 80% 94%;
  --danger-900: 355 54% 91%;
  --info-100: 221 74% 50%;
  --info-200: 221 78% 60%;
  --info-bg: 221 85% 94%;

  /* Border */
  --border-100: 220 16% 84%;
  --border-200: 220 13% 79%;
  --border-300: 220 12% 70%;

  /* Special */
  --always-black: 0 0% 0%;
  --always-white: 0 0% 100%;
  --oncolor-100: 0 0% 100%;
}

/* ====== Dark (manual dark) ====== */
:root:root[data-mode='dark'] {
  /* Background */
  --bg-000: 220 13% 21%;
  --bg-100: 220 14% 18%;
  --bg-200: 220 15% 15%;
  --bg-300: 220 16% 12%;
  --bg-400: 220 18% 9%;

  /* Text */
  --text-000: 0 0% 100%;
  --text-100: 220 14% 90%;
  --text-200: 220 12% 72%;
  --text-300: 220 10% 58%;
  --text-400: 220 9% 46%;
  --text-500: 220 8% 36%;
  --text-600: 220 10% 26%;

  /* Accent */
  --accent-brand: 286 56% 67%;
  --accent-main-000: 207 70% 58%;
  --accent-main-100: 207 82% 66%;
  --accent-main-200: 207 90% 74%;
  --accent-secondary-100: 187 47% 55%;

  /* Semantic */
  --success-100: 95 38% 62%;
  --success-200: 95 33% 52%;
  --success-bg: 95 25% 18%;
  --warning-100: 37 87% 63%;
  --warning-200: 37 76% 54%;
  --warning-bg: 37 30% 18%;
  --danger-000: 355 63% 60%;
  --danger-100: 355 74% 66%;
  --danger-200: 355 80% 74%;
  --danger-bg: 355 28% 18%;
  --danger-900: 355 24% 26%;
  --info-100: 221 83% 65%;
  --info-200: 221 88% 74%;
  --info-bg: 221 30% 18%;

  /* Border */
  --border-100: 220 12% 28%;
  --border-200: 220 12% 34%;
  --border-300: 220 12% 42%;

  /* Special */
  --always-black: 0 0% 0%;
  --always-white: 0 0% 100%;
  --oncolor-100: 0 0% 100%;
}

/* ====== Auto (system dark when data-mode is not set) ====== */
@media (prefers-color-scheme: dark) {
  :root:root:not([data-mode]) {
    --bg-000: 220 13% 21%;
    --bg-100: 220 14% 18%;
    --bg-200: 220 15% 15%;
    --bg-300: 220 16% 12%;
    --bg-400: 220 18% 9%;

    --text-000: 0 0% 100%;
    --text-100: 220 14% 90%;
    --text-200: 220 12% 72%;
    --text-300: 220 10% 58%;
    --text-400: 220 9% 46%;
    --text-500: 220 8% 36%;
    --text-600: 220 10% 26%;

    --accent-brand: 286 56% 67%;
    --accent-main-000: 207 70% 58%;
    --accent-main-100: 207 82% 66%;
    --accent-main-200: 207 90% 74%;
    --accent-secondary-100: 187 47% 55%;

    --success-100: 95 38% 62%;
    --success-200: 95 33% 52%;
    --success-bg: 95 25% 18%;
    --warning-100: 37 87% 63%;
    --warning-200: 37 76% 54%;
    --warning-bg: 37 30% 18%;
    --danger-000: 355 63% 60%;
    --danger-100: 355 74% 66%;
    --danger-200: 355 80% 74%;
    --danger-bg: 355 28% 18%;
    --danger-900: 355 24% 26%;
    --info-100: 221 83% 65%;
    --info-200: 221 88% 74%;
    --info-bg: 221 30% 18%;

    --border-100: 220 12% 28%;
    --border-200: 220 12% 34%;
    --border-300: 220 12% 42%;

    --always-black: 0 0% 0%;
    --always-white: 0 0% 100%;
    --oncolor-100: 0 0% 100%;
  }
}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Trans,
        {
          i18nKey: "settings:appearance.customCssSpecificityHelp",
          components: {
            1: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-[length:var(--fs-xxs)] px-1 py-0.5 bg-bg-200 rounded font-mono" })
          }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: fileInputRef, type: "file", accept: ".css", onChange: handleFileImport, className: "hidden" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => fileInputRef.current?.click(),
            className: "text-[10px] text-accent-main-100 hover:text-accent-main-200 transition-colors px-1.5 py-0.5 rounded hover:bg-bg-200/50 shrink-0",
            children: t("appearance.importCss")
          }
        ),
        !localValue.trim() && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              setLocalValue(template);
              onLoadTemplate(template);
            },
            className: "text-[10px] text-accent-main-100 hover:text-accent-main-200 transition-colors px-1.5 py-0.5 rounded hover:bg-bg-200/50 shrink-0",
            children: t("appearance.loadTemplate")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        value: localValue,
        onChange: (e) => handleChange(e.target.value),
        placeholder: template,
        spellCheck: false,
        className: "w-full h-48 px-3 py-2 text-[length:var(--fs-sm)] font-mono bg-bg-200/50 border border-border-200 rounded-lg \n          focus:outline-none focus:border-accent-main-100/50 text-text-100 placeholder:text-text-500 \n          resize-y custom-scrollbar leading-relaxed"
      }
    ),
    localValue.trim() && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "ghost",
        size: "sm",
        onClick: () => {
          setLocalValue("");
          onClear();
        },
        children: t("common:clear")
      }
    ) })
  ] });
}
function SavedSnippetItem({
  snippet,
  isActive,
  isDirty,
  onApply,
  onExport,
  onDelete,
  t
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-border-200/50 px-3 py-2.5 bg-bg-100/40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-sm)] font-medium text-text-100 truncate", children: snippet.name }),
        isActive && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 rounded bg-accent-main-100/10 text-accent-main-100 text-[length:var(--fs-xxs)]", children: t("appearance.activeOverride") }),
        isDirty && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 rounded bg-warning-bg text-warning-200 text-[length:var(--fs-xxs)]", children: t("appearance.modifiedOverride") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mt-1 whitespace-pre-wrap break-all max-h-10 overflow-hidden", children: snippet.css.slice(0, 160) || "/* empty */" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: onApply, disabled: isActive && !isDirty, children: isActive && !isDirty ? t("appearance.selectedOverride") : t("appearance.applyOverride") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: onExport, children: t("common:download") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: onDelete, children: t("common:delete") })
    ] })
  ] }) });
}
function AppearanceSettings() {
  const { t, i18n } = useTranslation(["settings", "common"]);
  const {
    mode: themeMode,
    setThemeWithAnimation,
    presetId,
    resolvedTheme,
    setPresetWithAnimation,
    availablePresets,
    customCSS,
    setCustomCSS,
    customCSSSnippets,
    activeCustomCSSSnippetId,
    saveCustomCSSSnippet,
    updateCustomCSSSnippet,
    deleteCustomCSSSnippet,
    applyCustomCSSSnippet,
    clearActiveCustomCSSSnippet,
    glassEffect,
    setGlassEffect,
    uiFontScale,
    setUIFontScale,
    codeFontScale,
    setCodeFontScale
  } = useTheme();
  const activeSnippet = customCSSSnippets.find((item) => item.id === activeCustomCSSSnippetId) || null;
  const hasUnsavedSnippetChanges = activeSnippet != null && activeSnippet.css !== customCSS;
  const activeSnippetId = activeSnippet?.id ?? null;
  const activeSnippetName = activeSnippet?.name ?? "";
  const [snippetDraft, setSnippetDraft] = reactExports.useState({
    snippetId: activeSnippetId,
    name: activeSnippetName
  });
  const snippetName = snippetDraft.snippetId === activeSnippetId ? snippetDraft.name : activeSnippetName;
  const handleImportCSS = (css) => {
    clearActiveCustomCSSSnippet();
    setCustomCSS(css);
  };
  const handleSaveNewSnippet = () => {
    const name = snippetName.trim();
    const css = customCSS.trim();
    if (!name || !css) return;
    saveCustomCSSSnippet(name, customCSS);
  };
  const handleRenameSnippet = () => {
    const name = snippetName.trim();
    if (!activeSnippet || !name || name === activeSnippet.name) return;
    updateCustomCSSSnippet(activeSnippet.id, { name });
  };
  const handleUpdateSnippet = () => {
    if (!activeSnippet) return;
    updateCustomCSSSnippet(activeSnippet.id, { css: customCSS });
  };
  const handleDeleteSnippet = (snippet) => {
    const confirmed = window.confirm(t("appearance.deleteOverrideConfirm", { name: snippet.name }));
    if (!confirmed) return;
    deleteCustomCSSSnippet(snippet.id);
  };
  const handleExportSnippet = (snippet) => {
    saveData(new TextEncoder().encode(snippet.css), getSnippetFileName(snippet.name), "text/css;charset=utf-8");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    availablePresets.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("appearance.themePresets"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("appearance.themePresetsDesc") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: availablePresets.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        PresetCard,
        {
          id: p.id,
          name: p.name,
          description: p.description,
          isActive: presetId === p.id,
          onClick: (e) => setPresetWithAnimation(p.id, e),
          resolvedTheme
        },
        p.id
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("appearance.customCss"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("appearance.customCssDesc") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          CustomCSSEditor,
          {
            value: customCSS,
            onChange: setCustomCSS,
            onImportFile: handleImportCSS,
            onLoadTemplate: handleImportCSS,
            onClear: () => {
              clearActiveCustomCSSSnippet();
              setCustomCSS("");
            },
            t
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border-200/50 bg-bg-100/30 p-3 space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-100 mb-1.5", children: t("appearance.savedOverrides") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("appearance.savedOverridesDesc") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 md:flex-row md:items-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: snippetName,
                onChange: (e) => setSnippetDraft({ snippetId: activeSnippetId, name: e.target.value }),
                placeholder: t("appearance.overrideNamePlaceholder"),
                className: "flex-1 min-w-0 px-3 py-2 text-[length:var(--fs-sm)] bg-bg-200/50 border border-border-200 rounded-lg text-text-100 placeholder:text-text-500 focus:outline-none focus:border-accent-main-100/50"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "secondary",
                  size: "sm",
                  onClick: handleSaveNewSnippet,
                  disabled: !snippetName.trim() || !customCSS.trim(),
                  children: t("appearance.saveAsNewOverride")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "ghost",
                  size: "sm",
                  onClick: handleRenameSnippet,
                  disabled: !activeSnippet || !snippetName.trim() || snippetName.trim() === activeSnippet.name,
                  children: t("appearance.renameOverride")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "ghost",
                  size: "sm",
                  onClick: handleUpdateSnippet,
                  disabled: !activeSnippet || !hasUnsavedSnippetChanges,
                  children: t("appearance.updateOverride")
                }
              )
            ] })
          ] }),
          customCSSSnippets.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: customCSSSnippets.map((snippet) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            SavedSnippetItem,
            {
              snippet,
              isActive: snippet.id === activeCustomCSSSnippetId,
              isDirty: snippet.id === activeCustomCSSSnippetId && hasUnsavedSnippetChanges,
              onApply: () => applyCustomCSSSnippet(snippet.id),
              onExport: () => handleExportSnippet(snippet),
              onDelete: () => handleDeleteSnippet(snippet),
              t
            },
            snippet.id
          )) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-text-500", children: t("appearance.noSavedOverrides") })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("appearance.display"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-100 mb-1.5", children: t("appearance.colorMode") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: themeMode,
            options: [
              { value: "system", label: t("appearance.modeAuto"), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(SystemIcon, { size: 14 }) },
              { value: "light", label: t("appearance.modeLight"), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(SunIcon, { size: 14 }) },
              { value: "dark", label: t("appearance.modeDark"), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MoonIcon, { size: 14 }) }
            ],
            onChange: (v, e) => setThemeWithAnimation(v, e)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("appearance.glassEffect"),
          description: t("appearance.glassEffectDesc"),
          onClick: () => setGlassEffect(!glassEffect),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: glassEffect, onChange: () => setGlassEffect(!glassEffect) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-100 mb-2", children: t("appearance.uiFontScale") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FontScaleSlider, { value: uiFontScale, onChange: setUIFontScale, baseSize: 14 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-xs)] text-text-500 mt-1", children: t("appearance.uiFontScaleDesc") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-100 mb-2", children: t("appearance.codeFontScale") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FontScaleSlider, { value: codeFontScale, onChange: setCodeFontScale, baseSize: 13 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-xs)] text-text-500 mt-1", children: t("appearance.codeFontScaleDesc") })
      ] }),
      (uiFontScale !== 0 || codeFontScale !== 0) && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            setUIFontScale(0);
            setCodeFontScale(0);
          },
          className: "text-[length:var(--fs-sm)] text-accent-main-100 hover:text-accent-main-200 transition-colors px-2 py-1 rounded hover:bg-bg-200/50 self-start",
          children: t("appearance.fontScaleReset")
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SettingRow, { label: t("appearance.language"), description: t("appearance.languageDesc"), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative inline-flex", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: i18n.language,
            onChange: (e) => i18n.changeLanguage(e.target.value),
            "aria-label": t("appearance.language"),
            style: { colorScheme: resolvedTheme },
            className: "appearance-none pl-2 pr-8 py-1 text-[length:var(--fs-sm)] bg-bg-200/50 border border-border-200 rounded-md text-text-100 focus:outline-none focus:border-accent-main-100/50 cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { className: "bg-bg-100 text-text-100", value: "en", children: t("appearance.languages.en") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { className: "bg-bg-100 text-text-100", value: "zh-CN", children: t("appearance.languages.zh-CN") })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ChevronDownIcon,
          {
            size: 14,
            className: "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-300"
          }
        )
      ] }) })
    ] })
  ] });
}
const BACKUP_KIND = "settings-backup";
const BACKUP_SCHEMA_VERSION = 2;
function exportNotificationBackup() {
  return {
    browserNotificationsEnabled: localStorage.getItem(STORAGE_KEY_NOTIFICATIONS_ENABLED) === "true",
    toast: exportNotificationPreferencesBackup(),
    events: exportNotificationEventSettingsBackup()
  };
}
function importNotificationBackup(raw) {
  const parsed = raw && typeof raw === "object" ? raw : void 0;
  const browserNotificationsEnabled = parsed?.browserNotificationsEnabled === true;
  if (browserNotificationsEnabled) {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS_ENABLED, "true");
  } else {
    localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS_ENABLED);
  }
  importNotificationPreferencesBackup(parsed?.toast);
  importNotificationEventSettingsBackup(parsed?.events);
}
function normalizeBackupFile(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid backup file");
  }
  const parsed = raw;
  if (parsed.app !== "OpenCodeUI" || parsed.kind !== BACKUP_KIND || parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error("Unsupported backup format");
  }
  if (!parsed.modules || typeof parsed.modules !== "object") {
    throw new Error("Missing backup modules");
  }
  const modules = parsed.modules;
  const requiredModules = [
    "theme",
    "layout",
    "servers",
    "perServerStorage",
    "service",
    "keybindings",
    "notifications",
    "sound",
    "update"
  ];
  for (const id of requiredModules) {
    if (!(id in modules)) {
      throw new Error(`Missing backup module: ${id}`);
    }
  }
  return {
    app: "OpenCodeUI",
    kind: BACKUP_KIND,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : (/* @__PURE__ */ new Date()).toISOString(),
    modules
  };
}
function buildBackupFileName(createdAt) {
  const safeTimestamp = createdAt.replace(/[:]/g, "-").replace(/\.\d+Z$/, "Z");
  return `opencodeui-settings-backup-${safeTimestamp}.json`;
}
async function exportSettingsBackup() {
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const backup = {
    app: "OpenCodeUI",
    kind: BACKUP_KIND,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt,
    modules: {
      theme: exportThemeBackup(),
      layout: exportLayoutBackup(),
      servers: exportServerSettingsBackup(),
      perServerStorage: exportPerServerStorageBackup(),
      service: exportServiceSettingsBackup(),
      keybindings: exportKeybindingBackup(),
      notifications: exportNotificationBackup(),
      sound: await exportSoundBackup(),
      update: exportUpdateSettingsBackup()
    }
  };
  return {
    fileName: buildBackupFileName(createdAt),
    data: new TextEncoder().encode(`${JSON.stringify(backup, null, 2)}
`)
  };
}
async function importSettingsBackup(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid backup file");
  }
  const backup = normalizeBackupFile(parsed);
  importThemeBackup(backup.modules.theme);
  importLayoutBackup(backup.modules.layout);
  importServerSettingsBackup(backup.modules.servers);
  importPerServerStorageBackup(backup.modules.perServerStorage);
  importServiceSettingsBackup(backup.modules.service);
  importKeybindingBackup(backup.modules.keybindings);
  importNotificationBackup(backup.modules.notifications);
  await importSoundBackup(backup.modules.sound);
  importUpdateSettingsBackup(backup.modules.update);
}
function previewBackupMeta(file) {
  return file.text().then((text) => {
    try {
      const parsed = JSON.parse(text);
      return { createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : null };
    } catch {
      return { createdAt: null };
    }
  });
}
async function openExternalUrl(url) {
  if (isTauri()) {
    await __vitePreload(() => import("./index-DNB4L3_3.js"), true ? __vite__mapDeps([0,1,2]) : void 0, import.meta.url).then((mod) => mod.openUrl(url)).catch(() => window.open(url, "_blank", "noopener,noreferrer"));
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
function AboutSettings() {
  const { t } = useTranslation(["settings"]);
  const updateState = useUpdateStore();
  const hasUpdate = hasUpdateAvailable(updateState);
  const latestRelease = updateState.latestRelease;
  const latestVersion = latestRelease?.tagName || t("about.unknownVersion");
  const releaseDate = latestRelease?.publishedAt ? new Date(latestRelease.publishedAt).toLocaleString() : null;
  const fileInputRef = reactExports.useRef(null);
  const [backupBusy, setBackupBusy] = reactExports.useState(null);
  const [backupError, setBackupError] = reactExports.useState(null);
  const handleCheckUpdates = reactExports.useCallback(() => {
    void updateStore.checkForUpdates({ force: true });
  }, []);
  const handleOpenRelease = reactExports.useCallback(() => {
    const targetUrl = latestRelease?.url || RELEASES_PAGE_URL;
    updateStore.hideToastForCurrentVersion();
    void openExternalUrl(targetUrl);
  }, [latestRelease?.url]);
  const handleExportBackup = reactExports.useCallback(async () => {
    setBackupError(null);
    setBackupBusy("export");
    try {
      const { fileName, data } = await exportSettingsBackup();
      saveData(data, fileName, "application/json;charset=utf-8");
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : t("about.backupExportFailed"));
    } finally {
      setBackupBusy(null);
    }
  }, [t]);
  const handleImportClick = reactExports.useCallback(() => {
    setBackupError(null);
    fileInputRef.current?.click();
  }, []);
  const handleImportBackup = reactExports.useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setBackupError(null);
      setBackupBusy("import");
      try {
        const { createdAt } = await previewBackupMeta(file);
        const confirmed = window.confirm(
          createdAt ? t("about.backupImportConfirmWithDate", { date: new Date(createdAt).toLocaleString() }) : t("about.backupImportConfirm")
        );
        if (!confirmed) return;
        await importSettingsBackup(file);
        window.location.reload();
      } catch (error) {
        setBackupError(error instanceof Error ? error.message : t("about.backupImportFailed"));
      } finally {
        setBackupBusy(null);
      }
    },
    [t]
  );
  let statusText = t("about.statusIdle");
  if (updateState.checking) {
    statusText = t("about.statusChecking");
  } else if (updateState.error) {
    statusText = t("about.statusError", { error: updateState.error });
  } else if (hasUpdate) {
    statusText = t("about.statusUpdateAvailable", { version: latestVersion });
  } else if (latestRelease) {
    statusText = t("about.statusUpToDate");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-7", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("about.title"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsCard, { title: t("about.versionCardTitle"), description: t("about.versionCardDesc"), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border-200/50 bg-bg-000/35 px-3 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mb-1", children: t("about.currentVersion") }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[length:var(--fs-base)] font-semibold text-text-100 font-mono", children: [
            "v",
            updateState.currentVersion
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border-200/50 bg-bg-000/35 px-3 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mb-1", children: t("about.latestVersion") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-base)] font-semibold text-text-100 font-mono", children: latestVersion })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border-200/50 bg-bg-100/35 px-3 py-3 text-[length:var(--fs-sm)] text-text-300 leading-relaxed", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-text-100", children: statusText }),
        releaseDate && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-text-400", children: t("about.publishedAt", { date: releaseDate }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "secondary", isLoading: updateState.checking, onClick: handleCheckUpdates, children: [
          !updateState.checking && /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 12 }),
          t("about.checkNow")
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", onClick: handleOpenRelease, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLinkIcon, { size: 12 }),
          hasUpdate ? t("about.viewUpdate") : t("about.openReleases")
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsCard, { title: t("about.backupCardTitle"), description: t("about.backupCardDesc"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: fileInputRef,
          type: "file",
          accept: "application/json,.json",
          onChange: handleImportBackup,
          className: "hidden"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-border-200/50 bg-bg-100/35 px-3 py-3 text-[length:var(--fs-sm)] text-text-300 leading-relaxed", children: t("about.backupWarning") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "secondary", isLoading: backupBusy === "export", onClick: handleExportBackup, children: [
            backupBusy !== "export" && /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadIcon, { size: 12 }),
            t("about.exportBackup")
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", isLoading: backupBusy === "import", onClick: handleImportClick, children: [
            backupBusy !== "import" && /* @__PURE__ */ jsxRuntimeExports.jsx(UploadIcon, { size: 12 }),
            t("about.importBackup")
          ] })
        ] }),
        backupError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-danger-100/20 bg-danger-100/10 px-3 py-2 text-[length:var(--fs-sm)] text-danger-100 leading-relaxed", children: backupError })
      ] })
    ] })
  ] }) });
}
function ChatSettings() {
  const { t } = useTranslation(["settings"]);
  const { pathMode, setPathMode: setPathMode2, effectiveStyle, detectedStyle, isAutoMode } = usePathMode();
  const {
    externalFileDropMode,
    setExternalFileDropMode,
    outlineCurrentHighlight,
    setOutlineCurrentHighlight,
    renderUserMarkdown,
    setRenderUserMarkdown
  } = useTheme();
  const [collapseUserMessages, setCollapseUserMessages] = reactExports.useState(themeStore.collapseUserMessages);
  const [stepFinishDisplay, setStepFinishDisplay] = reactExports.useState(themeStore.stepFinishDisplay);
  const [completedAtFormat, setCompletedAtFormat] = reactExports.useState(themeStore.completedAtFormat);
  const [reasoningDisplayMode, setReasoningDisplayMode] = reactExports.useState(themeStore.reasoningDisplayMode);
  useIsMobile();
  const handleCollapseToggle = () => {
    const v = !collapseUserMessages;
    setCollapseUserMessages(v);
    themeStore.setCollapseUserMessages(v);
  };
  const handleRenderUserMarkdownToggle = () => {
    setRenderUserMarkdown(!renderUserMarkdown);
  };
  const handleReasoningDisplayModeChange = (mode) => {
    setReasoningDisplayMode(mode);
    themeStore.setReasoningDisplayMode(mode);
  };
  const externalDropAlwaysMention = externalFileDropMode === "mention";
  const handleExternalDropModeToggle = () => {
    setExternalFileDropMode(externalDropAlwaysMention ? "upload-first" : "mention");
  };
  const handleOutlineHighlightToggle = () => {
    setOutlineCurrentHighlight(!outlineCurrentHighlight);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("chat.pathsFormatting"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("chat.pathsFormattingDesc") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SegmentedControl,
        {
          value: pathMode,
          options: [
            { value: "auto", label: t("chat.auto"), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(PathAutoIcon, { size: 14 }) },
            { value: "unix", label: t("chat.unixSlash"), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(PathUnixIcon, { size: 14 }) },
            { value: "windows", label: t("chat.winBackslash"), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(PathWindowsIcon, { size: 14 }) }
          ],
          onChange: (v) => setPathMode2(v)
        }
      ),
      isAutoMode && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[length:var(--fs-xs)] text-text-400", children: [
        t("chat.usingStyle", { style: effectiveStyle === "windows" ? "\\" : "/" }),
        detectedStyle && t("chat.detectedStyle", {
          style: detectedStyle === "windows" ? t("chat.windows") : t("chat.unix")
        })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.externalDropMentionMode"),
          description: t("chat.externalDropMentionModeDesc"),
          onClick: handleExternalDropModeToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: externalDropAlwaysMention, onChange: handleExternalDropModeToggle })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("chat.conversationExperience"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("chat.conversationExperienceDesc") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.collapseLongMessages"),
          description: t("chat.collapseLongMessagesDesc"),
          onClick: handleCollapseToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: collapseUserMessages, onChange: handleCollapseToggle })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.renderUserMarkdown"),
          description: t("chat.renderUserMarkdownDesc"),
          onClick: handleRenderUserMarkdownToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: renderUserMarkdown, onChange: handleRenderUserMarkdownToggle })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("chat.outlineCurrentHighlight"),
          description: t("chat.outlineCurrentHighlightDesc"),
          onClick: handleOutlineHighlightToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: outlineCurrentHighlight, onChange: handleOutlineHighlightToggle })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-100 mb-1.5", children: t("chat.thinkingDisplay") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400 mb-3", children: t("chat.thinkingDisplayDesc") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: reasoningDisplayMode,
            options: [
              { value: "capsule", label: t("chat.capsule") },
              { value: "italic", label: t("chat.italic") },
              { value: "markdown", label: t("chat.markdown") }
            ],
            onChange: (v) => handleReasoningDisplayModeChange(v)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("chat.stepFinishInfo"), children: [
      [
        { key: "agent", label: t("chat.agent"), desc: t("chat.showAgent") },
        { key: "model", label: t("chat.model"), desc: t("chat.showModel") },
        { key: "tokens", label: t("chat.tokens"), desc: t("chat.showTokenUsage") },
        { key: "cache", label: t("chat.cache"), desc: t("chat.showCacheHit") },
        { key: "cost", label: t("chat.cost"), desc: t("chat.showApiCost") },
        { key: "duration", label: t("chat.duration"), desc: t("chat.showResponseTime") },
        { key: "turnDuration", label: t("chat.totalDuration"), desc: t("chat.showTurnElapsed") },
        { key: "completedAt", label: t("chat.completedAt"), desc: t("chat.showCompletedAt") }
      ].map(({ key, label, desc }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label,
          description: desc,
          onClick: () => {
            const next = { [key]: !stepFinishDisplay[key] };
            setStepFinishDisplay((prev) => ({ ...prev, ...next }));
            themeStore.setStepFinishDisplay(next);
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Toggle,
            {
              enabled: stepFinishDisplay[key],
              onChange: () => {
                const next = { [key]: !stepFinishDisplay[key] };
                setStepFinishDisplay((prev) => ({ ...prev, ...next }));
                themeStore.setStepFinishDisplay(next);
              }
            }
          )
        },
        key
      )),
      stepFinishDisplay.completedAt && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-100 mb-1.5", children: t("chat.completedAtFormat") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400 mb-3", children: t("chat.completedAtFormatDesc") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: completedAtFormat,
            options: [
              { value: "time", label: t("chat.completedAtTimeOnly") },
              { value: "dateTime", label: t("chat.completedAtDateTime") }
            ],
            onChange: (v) => {
              const next = v;
              setCompletedAtFormat(next);
              themeStore.setCompletedAtFormat(next);
            }
          }
        )
      ] })
    ] })
  ] });
}
function formatContext(limit) {
  if (!limit) return "";
  const k = Math.round(limit / 1e3);
  if (k >= 1e3) return `${(k / 1e3).toFixed(0)}M`;
  return `${k}k`;
}
function ModelsSettings() {
  const { t } = useTranslation("settings");
  const { models, isLoading } = useModels();
  const hiddenModelKeys = useHiddenModelKeys();
  const [query, setQuery] = reactExports.useState("");
  const hiddenModelKeySet = reactExports.useMemo(() => new Set(hiddenModelKeys), [hiddenModelKeys]);
  const visibleCount = reactExports.useMemo(
    () => models.reduce((count, model) => hiddenModelKeySet.has(getModelKey(model)) ? count : count + 1, 0),
    [models, hiddenModelKeySet]
  );
  const filteredModels = reactExports.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return models;
    const normalize = (value) => typeof value === "string" ? value.toLowerCase() : "";
    return models.filter(
      (model) => normalize(model.name).includes(normalizedQuery) || normalize(model.id).includes(normalizedQuery) || normalize(model.family).includes(normalizedQuery) || normalize(model.providerName).includes(normalizedQuery)
    );
  }, [models, query]);
  const groups = reactExports.useMemo(() => groupModelsByProvider(filteredModels), [filteredModels]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("models.visibility"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400 leading-relaxed", children: t("models.visibilityDesc") }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border-200/50 bg-bg-100/50 transition-colors focus-within:border-border-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SearchIcon, { className: "w-3.5 h-3.5 text-text-400 shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: query,
          onChange: (e) => setQuery(e.target.value),
          placeholder: t("models.searchPlaceholder"),
          spellCheck: false,
          autoCorrect: "off",
          autoComplete: "off",
          autoCapitalize: "off",
          className: "flex-1 bg-transparent border-none outline-none text-[length:var(--fs-base)] text-text-100 placeholder:text-text-400"
        }
      ),
      query && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setQuery(""),
          className: "p-1 rounded-md text-text-400 hover:text-text-200 hover:bg-bg-200/60 transition-colors",
          "aria-label": t("models.clearSearch"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { size: 14 })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-xs)] text-text-400", children: t("models.keepOneEnabled") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-5", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-[length:var(--fs-sm)] text-text-400", children: t("models.loading") }) : groups.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-[length:var(--fs-sm)] text-text-400", children: query ? t("models.noResults") : t("models.empty") }) : groups.map((group) => {
      const providerModels = models.filter((model) => model.providerName === group.providerName);
      const providerVisibleCount = providerModels.filter(
        (model) => !hiddenModelKeySet.has(getModelKey(model))
      ).length;
      const providerVisible = providerVisibleCount > 0;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "rounded-xl border border-border-200/55 bg-bg-050/55 overflow-hidden",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4 px-4 py-3 border-b border-border-200/50 bg-bg-100/35", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-md)] font-semibold text-text-100 truncate", children: group.providerName }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mt-0.5", children: t("models.providerCount", { count: providerModels.length }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Toggle,
                {
                  enabled: providerVisible,
                  ariaLabel: `${t("models.visibility")}: ${group.providerName}`,
                  onChange: () => {
                    const nextVisible = !providerVisible;
                    if (!nextVisible && providerVisibleCount >= visibleCount) return;
                    modelVisibilityStore.setManyVisible(providerModels, nextVisible);
                  }
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border-200/40", children: group.models.map((model) => {
              const key = getModelKey(model);
              const enabled = !hiddenModelKeySet.has(key);
              const context = formatContext(model.contextLimit);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  onClick: () => {
                    if (enabled && visibleCount <= 1) return;
                    modelVisibilityStore.setVisible(model, !enabled);
                  },
                  className: "w-full flex items-center justify-between gap-4 px-4 py-3 hover:bg-bg-100/35 transition-colors",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        "aria-pressed": enabled,
                        onClick: (e) => {
                          e.stopPropagation();
                          if (enabled && visibleCount <= 1) return;
                          modelVisibilityStore.setVisible(model, !enabled);
                        },
                        className: "min-w-0 flex-1 text-left outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent-main-100 rounded-md",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-md)] font-medium text-text-100 truncate", children: model.name }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[length:var(--fs-xs)] text-text-400 mt-0.5 truncate", children: [
                            model.id,
                            context ? ` · ${context}` : ""
                          ] })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Toggle,
                      {
                        enabled,
                        ariaLabel: `${t("models.visibility")}: ${model.name}`,
                        onChange: () => {
                          if (enabled && visibleCount <= 1) return;
                          modelVisibilityStore.setVisible(model, !enabled);
                        }
                      }
                    ) })
                  ]
                },
                key
              );
            }) })
          ]
        },
        group.providerName
      );
    }) })
  ] }) });
}
const EVENT_TYPES = [
  {
    type: "completed",
    labelKey: "notifications.eventCompleted",
    descKey: "notifications.eventCompletedDesc",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { size: 14 }),
    color: "text-green-400"
  },
  {
    type: "permission",
    labelKey: "notifications.eventPermission",
    descKey: "notifications.eventPermissionDesc",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldIcon, { size: 14 }),
    color: "text-yellow-400"
  },
  {
    type: "question",
    labelKey: "notifications.eventQuestion",
    descKey: "notifications.eventQuestionDesc",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(QuestionIcon, { size: 14 }),
    color: "text-blue-400"
  },
  {
    type: "error",
    labelKey: "notifications.eventError",
    descKey: "notifications.eventErrorDesc",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { size: 14 }),
    color: "text-red-400"
  }
];
function VolumeSlider({ value, onChange }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 w-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeOffIcon, { size: 13, className: "text-text-400 shrink-0" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "range",
        min: 0,
        max: 100,
        value,
        onChange: (e) => onChange(Number(e.target.value)),
        className: "flex-1 h-1.5 rounded-full appearance-none cursor-pointer\n          bg-bg-200\n          [&::-webkit-slider-thumb]:appearance-none\n          [&::-webkit-slider-thumb]:w-3.5\n          [&::-webkit-slider-thumb]:h-3.5\n          [&::-webkit-slider-thumb]:rounded-full\n          [&::-webkit-slider-thumb]:bg-accent-main-100\n          [&::-webkit-slider-thumb]:shadow-sm\n          [&::-webkit-slider-thumb]:border-2\n          [&::-webkit-slider-thumb]:border-bg-000\n          [&::-webkit-slider-thumb]:cursor-pointer\n          [&::-moz-range-thumb]:w-3.5\n          [&::-moz-range-thumb]:h-3.5\n          [&::-moz-range-thumb]:rounded-full\n          [&::-moz-range-thumb]:bg-accent-main-100\n          [&::-moz-range-thumb]:border-2\n          [&::-moz-range-thumb]:border-bg-000\n          [&::-moz-range-thumb]:cursor-pointer\n          [&::-moz-range-track]:bg-bg-200\n          [&::-moz-range-track]:rounded-full\n          [&::-moz-range-track]:h-1.5"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeIcon, { size: 13, className: "text-text-400 shrink-0" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-sm)] text-text-300 w-8 text-right tabular-nums", children: value })
  ] });
}
function EventEnableRow({
  type,
  labelKey,
  descKey,
  icon,
  color
}) {
  const { t } = useTranslation(["settings"]);
  const settings = useNotificationEventSettings();
  const eventConfig = settings.events[type];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    SettingRow,
    {
      label: t(labelKey),
      description: t(descKey),
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: color, children: icon }),
      onClick: () => notificationEventSettingsStore.setSystemEnabled(type, !eventConfig.systemEnabled),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Toggle,
        {
          enabled: eventConfig.systemEnabled,
          onChange: () => notificationEventSettingsStore.setSystemEnabled(type, !eventConfig.systemEnabled)
        }
      )
    }
  );
}
function EventSoundCard({
  type,
  labelKey,
  descKey,
  icon,
  color
}) {
  const { t } = useTranslation(["settings"]);
  const settings = useSoundSettings();
  const eventConfig = settings.events[type];
  const [uploadError, setUploadError] = reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const soundOptions = SOUND_OPTIONS[type];
  const hasCustom = soundStore.hasCustomAudio(type);
  const handlePreview = reactExports.useCallback(() => {
    if (eventConfig.soundId === "none") return;
    const customBlob = eventConfig.soundId === "custom" ? soundStore.getCustomAudioBlob(type) : null;
    playSound({
      soundId: eventConfig.soundId,
      customAudioData: customBlob,
      volume: settings.volume
    });
  }, [eventConfig, settings.volume, type]);
  const handleSoundChange = reactExports.useCallback(
    (soundId) => {
      setUploadError(null);
      soundStore.setEventSound(type, soundId);
    },
    [type]
  );
  const handleFileUpload = reactExports.useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadError(null);
      const result = await soundStore.uploadCustomAudio(type, file);
      if (!result.success && result.error) {
        const errorKey = `notifications.error${result.error.charAt(0).toUpperCase()}${result.error.slice(1)}`;
        setUploadError(t(errorKey));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [type, t]
  );
  const handleRemoveCustom = reactExports.useCallback(async () => {
    setUploadError(null);
    await soundStore.removeCustomAudio(type);
  }, [type]);
  const handleExportCustom = reactExports.useCallback(async () => {
    await soundStore.exportCustomAudio(type);
  }, [type]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border-200/50 bg-bg-000/40 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2 mb-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: color, children: icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-md)] font-medium text-text-100", children: t(labelKey) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400", children: t(descKey) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "sm",
          variant: "ghost",
          onClick: handlePreview,
          disabled: eventConfig.soundId === "none",
          className: "gap-1.5 text-[length:var(--fs-sm)]",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PlayIcon, { size: 12 }),
            t("notifications.preview")
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5 mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => handleSoundChange("none"),
          className: `px-2.5 py-1 rounded-md text-[length:var(--fs-sm)] font-medium transition-colors border
            ${eventConfig.soundId === "none" ? "bg-accent-main-100/10 text-accent-main-100 border-accent-main-100/30" : "text-text-400 border-border-200/40 hover:bg-bg-100/60 hover:text-text-200"}`,
          children: t("notifications.noSound")
        }
      ),
      soundOptions.map((sid) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => handleSoundChange(sid),
          className: `px-2.5 py-1 rounded-md text-[length:var(--fs-sm)] font-medium transition-colors border
              ${eventConfig.soundId === sid ? "bg-accent-main-100/10 text-accent-main-100 border-accent-main-100/30" : "text-text-400 border-border-200/40 hover:bg-bg-100/60 hover:text-text-200"}`,
          children: BUILTIN_SOUNDS[sid]
        },
        sid
      )),
      hasCustom && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => handleSoundChange("custom"),
          className: `px-2.5 py-1 rounded-md text-[length:var(--fs-sm)] font-medium transition-colors border
              ${eventConfig.soundId === "custom" ? "bg-accent-main-100/10 text-accent-main-100 border-accent-main-100/30" : "text-text-400 border-border-200/40 hover:bg-bg-100/60 hover:text-text-200"}`,
          children: t("notifications.customSound")
        }
      )
    ] }),
    hasCustom && eventConfig.customFileName && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1.5 px-0.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: "text-[length:var(--fs-xs)] text-text-300 truncate max-w-[200px]",
          title: eventConfig.customFileName,
          children: eventConfig.customFileName
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "sm",
          variant: "ghost",
          onClick: handleExportCustom,
          className: "gap-1 text-[length:var(--fs-xs)] h-6 px-1.5",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadIcon, { size: 10 }),
            t("notifications.exportAudio")
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "sm",
          variant: "ghost",
          onClick: handleRemoveCustom,
          className: "gap-1 text-[length:var(--fs-xs)] h-6 px-1.5 text-red-400 hover:text-red-300",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TrashIcon, { size: 10 }),
            t("notifications.removeCustom")
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mt-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: fileInputRef, type: "file", accept: "audio/*", onChange: handleFileUpload, className: "hidden" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "sm",
          variant: "ghost",
          onClick: () => fileInputRef.current?.click(),
          className: "gap-1.5 text-[length:var(--fs-xs)] h-7",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(UploadIcon, { size: 11 }),
            hasCustom ? t("notifications.replaceAudio") : t("notifications.uploadAudio")
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-xs)] text-text-500 ml-auto", children: t("notifications.supportedFormats") })
    ] }),
    uploadError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 text-[length:var(--fs-xs)] text-red-400 flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { size: 11 }),
      uploadError
    ] })
  ] });
}
function NotificationSettings() {
  const { t } = useTranslation(["settings", "common"]);
  const {
    enabled: notificationsEnabled,
    setEnabled: setNotificationsEnabled,
    supported: notificationsSupported,
    permission: notificationPermission,
    sendNotification
  } = useNotification();
  const [toastEnabled, setToastEnabledState] = reactExports.useState(notificationStore.toastEnabled);
  const soundSettings = useSoundSettings();
  const soundSupported = isSoundSupported();
  const handleTestNotification = () => {
    sendNotification(t("notifications.testTitle"), t("notifications.testBody"));
  };
  const handleToastToggle = () => {
    const v = !toastEnabled;
    setToastEnabledState(v);
    notificationStore.setToastEnabled(v);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 xl:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingsCard,
        {
          title: t("notifications.systemNotifications"),
          description: t("notifications.systemNotificationsDesc"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            notificationsSupported ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                SettingRow,
                {
                  label: t("notifications.notificationsLabel"),
                  description: notificationPermission === "denied" ? t("notifications.blockedByBrowser") : t("notifications.notifyWhenComplete"),
                  onClick: () => notificationPermission !== "denied" && setNotificationsEnabled(!notificationsEnabled),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Toggle,
                    {
                      enabled: notificationsEnabled && notificationPermission !== "denied",
                      onChange: () => notificationPermission !== "denied" && setNotificationsEnabled(!notificationsEnabled)
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                SettingRow,
                {
                  label: t("notifications.testNotification"),
                  description: notificationsEnabled ? t("notifications.sendSampleDesc") : t("notifications.enableToTest"),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      size: "sm",
                      variant: "ghost",
                      onClick: handleTestNotification,
                      disabled: !notificationsEnabled || notificationPermission === "denied",
                      children: t("common:send")
                    }
                  )
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-text-400 leading-relaxed", children: t("notifications.notAvailable") }),
            notificationsEnabled && notificationPermission !== "denied" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border-200/35 pt-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-1 mb-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-md)] font-semibold text-text-100 mb-1.5", children: t("notifications.notificationTypes") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400", children: t("notifications.notificationTypesDesc") })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: EVENT_TYPES.map((evt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                EventEnableRow,
                {
                  type: evt.type,
                  labelKey: evt.labelKey,
                  descKey: evt.descKey,
                  icon: evt.icon,
                  color: evt.color
                },
                evt.type
              )) })
            ] })
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsCard, { title: t("notifications.inAppAlerts"), description: t("notifications.inAppAlertsDesc"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("notifications.toastNotifications"),
          description: t("notifications.toastDesc"),
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BellIcon, { size: 14 }),
          onClick: handleToastToggle,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: toastEnabled, onChange: handleToastToggle })
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsCard, { title: t("notifications.soundSettings"), description: t("notifications.soundSettingsDesc"), children: soundSupported ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SettingRow,
          {
            label: t("notifications.soundEnabled"),
            description: t("notifications.soundEnabledDesc"),
            icon: soundSettings.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeIcon, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeOffIcon, { size: 14 }),
            onClick: () => soundStore.setEnabled(!soundSettings.enabled),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Toggle,
              {
                enabled: soundSettings.enabled,
                onChange: () => soundStore.setEnabled(!soundSettings.enabled)
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SettingRow,
          {
            label: t("notifications.currentSessionSound"),
            description: t("notifications.currentSessionSoundDesc"),
            onClick: () => soundStore.setCurrentSessionEnabled(!soundSettings.currentSessionEnabled),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Toggle,
              {
                enabled: soundSettings.currentSessionEnabled,
                onChange: () => soundStore.setCurrentSessionEnabled(!soundSettings.currentSessionEnabled)
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-2.5 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-md)] font-medium text-text-100 mb-1", children: t("notifications.volume") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mb-2.5", children: t("notifications.volumeDesc") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeSlider, { value: soundSettings.volume, onChange: (v) => soundStore.setVolume(v) })
        ] })
      ] }),
      soundSettings.enabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-md)] font-semibold text-text-100 mb-1.5 px-1", children: t("notifications.eventSounds") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mb-3 px-1", children: t("notifications.eventSoundsDesc") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 xl:grid-cols-2", children: EVENT_TYPES.map((evt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          EventSoundCard,
          {
            type: evt.type,
            labelKey: evt.labelKey,
            descKey: evt.descKey,
            icon: evt.icon,
            color: evt.color
          },
          evt.type
        )) })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-text-400 leading-relaxed", children: t("notifications.soundNotSupported") }) })
  ] });
}
function ServiceSettings() {
  const { t } = useTranslation(["settings", "common"]);
  const isMobile = useIsMobile();
  const {
    autoStart: autoStartService,
    binaryPath,
    detectedBinaryPath,
    envVars,
    running: serviceRunning,
    startedByUs,
    starting: serviceStarting
  } = useServiceStore();
  const { servers } = useServerStore();
  const localServer = servers.find((server) => server.id === LOCAL_SERVER_ID);
  const isTauriDesktop = isTauri() && !isMobile;
  const [localBinaryPath, setLocalBinaryPath] = reactExports.useState(binaryPath);
  const pathDebounceRef = reactExports.useRef(null);
  const [detectingBinary, setDetectingBinary] = reactExports.useState(false);
  const [serviceError, setServiceError] = reactExports.useState("");
  reactExports.useEffect(() => {
    setLocalBinaryPath(binaryPath);
  }, [binaryPath]);
  reactExports.useEffect(() => {
    if (!isTauriDesktop) return;
    handleCheckService();
    handleDetectBinary();
  }, [isTauriDesktop]);
  const handleAutoStartToggle = () => {
    serviceStore.setAutoStart(!autoStartService);
  };
  const handleBinaryPathChange = (v) => {
    setLocalBinaryPath(v);
    if (pathDebounceRef.current) clearTimeout(pathDebounceRef.current);
    pathDebounceRef.current = setTimeout(() => serviceStore.setBinaryPath(v), 400);
  };
  const getServerUrl = () => localServer?.url || API_BASE_URL;
  const handleDetectBinary = async () => {
    if (!isTauriDesktop) return;
    setDetectingBinary(true);
    try {
      const { invoke } = await __vitePreload(async () => {
        const { invoke: invoke2 } = await import("./main-CbDQK4WE.js").then((n) => n.aq);
        return { invoke: invoke2 };
      }, true ? __vite__mapDeps([1,2]) : void 0, import.meta.url);
      const detected = await invoke("detect_opencode_binary", { envVars: serviceStore.envVarsRecord });
      serviceStore.setDetectedBinaryPath(detected);
    } catch (e) {
      apiErrorHandler("detect opencode binary", e);
      serviceStore.setDetectedBinaryPath(null);
    } finally {
      setDetectingBinary(false);
    }
  };
  const handleStartService = async () => {
    setServiceError("");
    try {
      const { invoke } = await __vitePreload(async () => {
        const { invoke: invoke2 } = await import("./main-CbDQK4WE.js").then((n) => n.aq);
        return { invoke: invoke2 };
      }, true ? __vite__mapDeps([1,2]) : void 0, import.meta.url);
      serviceStore.setStarting(true);
      const detected = await invoke("detect_opencode_binary", { envVars: serviceStore.envVarsRecord }).catch(
        () => null
      );
      serviceStore.setDetectedBinaryPath(detected);
      const result = await invoke("start_opencode_service", {
        url: getServerUrl(),
        binaryPath: serviceStore.effectiveBinaryPath,
        envVars: serviceStore.envVarsRecord
      });
      applyLocalServiceUrl(result.url);
      serviceStore.setStartedByUs(result.startedByUs);
      serviceStore.setRunning(true);
    } catch (e) {
      const msg = String(e);
      apiErrorHandler("start service", msg);
      setServiceError(msg);
    } finally {
      serviceStore.setStarting(false);
    }
  };
  const handleStopService = async () => {
    setServiceError("");
    try {
      const { invoke } = await __vitePreload(async () => {
        const { invoke: invoke2 } = await import("./main-CbDQK4WE.js").then((n) => n.aq);
        return { invoke: invoke2 };
      }, true ? __vite__mapDeps([1,2]) : void 0, import.meta.url);
      await invoke("stop_opencode_service");
      serviceStore.setStartedByUs(false);
      serviceStore.setRunning(false);
    } catch (e) {
      apiErrorHandler("stop service", e);
    }
  };
  const handleCheckService = async () => {
    try {
      const { invoke } = await __vitePreload(async () => {
        const { invoke: invoke2 } = await import("./main-CbDQK4WE.js").then((n) => n.aq);
        return { invoke: invoke2 };
      }, true ? __vite__mapDeps([1,2]) : void 0, import.meta.url);
      const running = await invoke("check_opencode_service", { url: getServerUrl() });
      serviceStore.setRunning(running);
      if (running) {
        const byUs = await invoke("get_service_started_by_us");
        serviceStore.setStartedByUs(byUs);
      } else {
        serviceStore.setStartedByUs(false);
      }
    } catch (e) {
      apiErrorHandler("check service", e);
    }
  };
  if (!isTauriDesktop) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsCard, { title: t("service.localService"), description: t("service.desktopOnlyDesc"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-text-400 leading-relaxed", children: t("service.webModeDesc") }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsCard, { title: t("service.localService"), description: t("service.localServiceDesc"), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] font-medium text-text-300", children: t("service.binaryPath") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "text-[length:var(--fs-xs)] text-accent-main-100 hover:text-accent-main-100/80 transition-colors disabled:opacity-50",
            onClick: handleDetectBinary,
            disabled: detectingBinary,
            children: detectingBinary ? t("service.detectingBinary") : t("service.detectBinary")
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: localBinaryPath,
          onChange: (e) => handleBinaryPathChange(e.target.value),
          placeholder: t("service.binaryPathPlaceholder"),
          className: "w-full h-8 px-3 text-[length:var(--fs-md)] font-mono bg-bg-200/50 border border-border-200 rounded-md\n              focus:outline-none focus:border-accent-main-100/50 text-text-100 placeholder:text-text-400"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mt-1", children: t("service.binaryPathHelp") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-500 mt-1 font-mono break-all", children: localBinaryPath.trim() ? t("service.usingManualBinary") : detectedBinaryPath ? t("service.detectedBinary", { path: detectedBinaryPath }) : t("service.detectedBinaryMissing") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("service.autoStart"),
          description: t("service.autoStartDesc"),
          onClick: handleAutoStartToggle,
          className: "bg-bg-100/35 border-border-200/45",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: autoStartService, onChange: handleAutoStartToggle })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("service.serviceStatus"),
          description: serviceStarting ? t("service.starting") : serviceRunning ? startedByUs ? t("service.runningStartedByApp") : t("service.runningExternal") : t("service.notRunning"),
          icon: serviceStarting ? /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 14, className: "animate-spin text-text-400" }) : serviceRunning ? /* @__PURE__ */ jsxRuntimeExports.jsx(WifiIcon, { size: 14, className: "text-success-100" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(WifiOffIcon, { size: 14, className: "text-text-400" }),
          className: "bg-bg-100/35 border-border-200/45",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            !serviceStarting && !serviceRunning && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: handleStartService, children: t("common:start") }),
            !serviceStarting && serviceRunning && startedByUs && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", onClick: handleStopService, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(StopIcon, { size: 12, className: "mr-1" }),
              t("common:stop")
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: handleCheckService, disabled: serviceStarting, children: t("common:refresh") })
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] font-medium text-text-300", children: t("service.envVars") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: "text-[length:var(--fs-xs)] text-accent-main-100 hover:text-accent-main-100/80 transition-colors",
            onClick: () => serviceStore.setEnvVars([...envVars, { key: "", value: "" }]),
            children: [
              "+ ",
              t("common:add")
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mb-2", children: t("service.envVarsDesc") }),
      envVars.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-1.5", children: envVars.map((env, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: env.key,
            onChange: (e) => {
              const updated = [...envVars];
              updated[idx] = { ...updated[idx], key: e.target.value };
              serviceStore.setEnvVars(updated);
            },
            placeholder: t("service.keyPlaceholder"),
            className: "w-[120px] shrink-0 h-7 px-2 text-[length:var(--fs-xs)] font-mono bg-bg-200/50 border border-border-200 rounded\n                      focus:outline-none focus:border-accent-main-100/50 text-text-100 placeholder:text-text-500"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-500 text-[length:var(--fs-xs)] shrink-0", children: "=" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: env.value,
            onChange: (e) => {
              const updated = [...envVars];
              updated[idx] = { ...updated[idx], value: e.target.value };
              serviceStore.setEnvVars(updated);
            },
            placeholder: t("service.valuePlaceholder"),
            className: "flex-1 min-w-0 h-7 px-2 text-[length:var(--fs-xs)] font-mono bg-bg-200/50 border border-border-200 rounded\n                      focus:outline-none focus:border-accent-main-100/50 text-text-100 placeholder:text-text-500"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "shrink-0 w-7 h-7 flex items-center justify-center text-text-400 hover:text-danger-100\n                      hover:bg-danger-100/10 rounded transition-colors",
            onClick: () => {
              const updated = envVars.filter((_, i) => i !== idx);
              serviceStore.setEnvVars(updated);
            },
            title: t("common:remove"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrashIcon, { size: 12 })
          }
        )
      ] }, idx)) })
    ] }),
    serviceError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-danger-100 bg-danger-100/10 border border-danger-100/20 rounded-md px-2.5 py-2 leading-relaxed break-all", children: serviceError })
  ] }) });
}
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;
function isHttpsIpUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
    return parsed.protocol === "https:" && (IPV4_PATTERN.test(hostname) || hostname.includes(":"));
  } catch {
    return false;
  }
}
function ServerItem({
  server,
  health,
  isActive,
  onSelect,
  onDelete,
  onEdit,
  onCheckHealth
}) {
  const { t } = useTranslation(["settings", "common"]);
  const [editing, setEditing] = reactExports.useState(false);
  const [confirmDelete, setConfirmDelete] = reactExports.useState(false);
  const statusIcon = () => {
    if (!health || health.status === "checking") return /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 12, className: "animate-spin text-text-400" });
    if (health.status === "online") return /* @__PURE__ */ jsxRuntimeExports.jsx(WifiIcon, { size: 12, className: "text-success-100" });
    if (health.status === "unauthorized") return /* @__PURE__ */ jsxRuntimeExports.jsx(KeyIcon, { size: 12, className: "text-warning-100" });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(WifiOffIcon, { size: 12, className: "text-danger-100" });
  };
  const statusTitle = () => {
    if (!health) return t("servers.checkHealth");
    switch (health.status) {
      case "checking":
        return t("servers.checking");
      case "online":
        return `${t("servers.onlineLatency", { latency: health.latency })}${health.version ? ` · OpenCode v${health.version}` : ""}`;
      case "unauthorized":
        return t("servers.invalidCredentials");
      case "offline":
        return health.error || t("common:offline");
      case "error":
        return health.error || t("common:error");
      default:
        return t("common:unknown");
    }
  };
  if (editing) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      EditServerForm,
      {
        server,
        onSave: (updates) => {
          onEdit(updates);
          setEditing(false);
        },
        onCancel: () => setEditing(false)
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        onClick: onSelect,
        className: `group flex items-center gap-3 p-2.5 rounded-lg border transition-colors
          ${isActive ? "border-accent-main-100/40 bg-accent-main-100/5" : "border-border-200/40 hover:border-border-300"}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: (e) => {
                e.stopPropagation();
                onSelect();
              },
              "aria-current": isActive ? "true" : void 0,
              className: "min-w-0 flex flex-1 items-center gap-3 bg-transparent border-none p-0 text-left",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(GlobeIcon, { size: 14, className: isActive ? "text-accent-main-100" : "text-text-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[length:var(--fs-md)] font-medium text-text-100 truncate", children: server.name }),
                    isActive && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-1.5 py-0.5 rounded-full text-[length:var(--fs-xxs)] font-medium text-accent-main-100 bg-accent-main-100/10 shrink-0", children: t("servers.current") })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[length:var(--fs-xs)] text-text-400 truncate font-mono flex items-center gap-1", children: [
                    server.url,
                    server.auth?.password && /* @__PURE__ */ jsxRuntimeExports.jsx(KeyIcon, { size: 10, className: "shrink-0 text-text-400" })
                  ] })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "p-2 rounded hover:bg-bg-200 transition-colors",
              onClick: (e) => {
                e.stopPropagation();
                onCheckHealth();
              },
              title: statusTitle(),
              "aria-label": statusTitle(),
              children: statusIcon()
            }
          ),
          !server.isDefault && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "p-2 rounded text-text-400 hover:text-accent-main-100 hover:bg-accent-main-100/10 transition-all",
                onClick: (e) => {
                  e.stopPropagation();
                  setEditing(true);
                },
                title: t("servers.editServer"),
                "aria-label": t("servers.editServer"),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(PencilIcon, { size: 12 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "p-2 rounded text-text-400 hover:text-danger-100 hover:bg-danger-100/10 transition-all",
                onClick: (e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                },
                title: t("common:remove"),
                "aria-label": t("common:remove"),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrashIcon, { size: 12 })
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        isOpen: confirmDelete,
        onClose: () => setConfirmDelete(false),
        onConfirm: () => {
          setConfirmDelete(false);
          onDelete();
        },
        title: t("servers.deleteServer"),
        description: t("servers.deleteServerConfirm", { name: server.name }),
        confirmText: t("common:delete"),
        cancelText: t("common:cancel"),
        variant: "danger"
      }
    )
  ] });
}
function EditServerForm({
  server,
  onSave,
  onCancel
}) {
  const { t } = useTranslation(["settings", "common"]);
  const [name, setName] = reactExports.useState(server.name);
  const [url, setUrl] = reactExports.useState(server.url);
  const [username, setUsername] = reactExports.useState(server.auth?.username || "");
  const [password, setPassword] = reactExports.useState(server.auth?.password || "");
  const [showAuth, setShowAuth] = reactExports.useState(!!server.auth?.password);
  const [error, setError] = reactExports.useState("");
  const showHttpsIpWarning = isHttpsIpUrl(url);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("servers.nameRequired"));
      return;
    }
    if (!url.trim()) {
      setError(t("servers.urlRequired"));
      return;
    }
    try {
      new URL(url);
    } catch {
      setError(t("servers.invalidUrl"));
      return;
    }
    onSave({
      name: name.trim(),
      url: url.trim(),
      username: password.trim() ? username.trim() || "opencode" : void 0,
      password: password.trim() || void 0
    });
  };
  const inputCls = "w-full h-8 px-3 text-[length:var(--fs-md)] bg-bg-000 border border-border-200 rounded-md focus:outline-none focus:border-accent-main-100/50 text-text-100 placeholder:text-text-400";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "form",
    {
      onSubmit: handleSubmit,
      className: "p-3 rounded-lg border border-accent-main-100/30 bg-accent-main-100/[0.02] space-y-2.5",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1", children: t("servers.name") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: name,
              onChange: (e) => {
                setName(e.target.value);
                setError("");
              },
              placeholder: t("servers.namePlaceholder"),
              className: inputCls,
              autoFocus: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1", children: t("servers.url") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: url,
              onChange: (e) => {
                setUrl(e.target.value);
                setError("");
              },
              placeholder: t("servers.urlPlaceholder"),
              className: `${inputCls} font-mono`
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setShowAuth(!showAuth),
            className: "flex items-center gap-1.5 text-[length:var(--fs-xs)] text-accent-main-100 hover:text-accent-main-200 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(KeyIcon, { size: 10 }),
              showAuth ? t("servers.hideAuth") : t("servers.addAuth")
            ]
          }
        ),
        showAuth && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1", children: t("servers.username") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: username,
                onChange: (e) => {
                  setUsername(e.target.value);
                  setError("");
                },
                placeholder: t("servers.usernamePlaceholder"),
                className: inputCls
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1", children: t("servers.password") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "password",
                value: password,
                onChange: (e) => {
                  setPassword(e.target.value);
                  setError("");
                },
                placeholder: t("servers.passwordPlaceholder"),
                className: inputCls
              }
            )
          ] })
        ] }),
        showHttpsIpWarning && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-warning-100 bg-warning-bg border border-warning-100/20 rounded-md px-2.5 py-2 leading-relaxed", children: t("servers.httpsIpWarning") }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-xs)] text-danger-100", children: error }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: onCancel, children: t("common:cancel") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", size: "sm", children: t("common:save") })
        ] })
      ]
    }
  );
}
function AddServerForm({
  onAdd,
  onCancel
}) {
  const { t } = useTranslation(["settings", "common"]);
  const [name, setName] = reactExports.useState("");
  const [url, setUrl] = reactExports.useState("");
  const [username, setUsername] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [showAuth, setShowAuth] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("servers.nameRequired"));
      return;
    }
    if (!url.trim()) {
      setError(t("servers.urlRequired"));
      return;
    }
    try {
      new URL(url);
    } catch {
      setError(t("servers.invalidUrl"));
      return;
    }
    onAdd(
      name.trim(),
      url.trim(),
      password.trim() ? username.trim() || "opencode" : void 0,
      password.trim() || void 0
    );
  };
  const isCrossOrigin = (() => {
    if (!url.trim()) return false;
    try {
      const serverUrl = new URL(url);
      return serverUrl.origin !== window.location.origin;
    } catch {
      return false;
    }
  })();
  const showHttpsIpWarning = isHttpsIpUrl(url);
  const inputCls = "w-full h-8 px-3 text-[length:var(--fs-md)] bg-bg-000 border border-border-200 rounded-md focus:outline-none focus:border-accent-main-100/50 text-text-100 placeholder:text-text-400";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "p-3 rounded-lg border border-border-200 bg-bg-050 space-y-2.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1", children: t("servers.name") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: name,
          onChange: (e) => {
            setName(e.target.value);
            setError("");
          },
          placeholder: t("servers.namePlaceholder"),
          className: inputCls,
          autoFocus: true
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1", children: t("servers.url") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: url,
          onChange: (e) => {
            setUrl(e.target.value);
            setError("");
          },
          placeholder: t("servers.urlPlaceholder"),
          className: `${inputCls} font-mono`
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setShowAuth(!showAuth),
        className: "flex items-center gap-1.5 text-[length:var(--fs-xs)] text-accent-main-100 hover:text-accent-main-200 transition-colors",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(KeyIcon, { size: 10 }),
          showAuth ? t("servers.hideAuth") : t("servers.addAuth")
        ]
      }
    ),
    showAuth && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1", children: t("servers.username") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: username,
            onChange: (e) => {
              setUsername(e.target.value);
              setError("");
            },
            placeholder: t("servers.usernamePlaceholder"),
            className: inputCls
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[length:var(--fs-xs)] font-medium text-text-300 mb-1", children: t("servers.password") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "password",
            value: password,
            onChange: (e) => {
              setPassword(e.target.value);
              setError("");
            },
            placeholder: t("servers.passwordPlaceholder"),
            className: inputCls
          }
        )
      ] }),
      isCrossOrigin && password.trim() && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[length:var(--fs-xs)] text-warning-100 bg-warning-bg border border-warning-100/20 rounded-md px-2.5 py-2 leading-relaxed", children: [
        t("servers.crossOriginWarning"),
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: "https://github.com/anomalyco/opencode/issues/10047",
            target: "_blank",
            rel: "noopener",
            className: "underline hover:no-underline",
            children: "#10047"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 leading-relaxed", children: t("servers.credentialsStorage") })
    ] }),
    showHttpsIpWarning && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-warning-100 bg-warning-bg border border-warning-100/20 rounded-md px-2.5 py-2 leading-relaxed", children: t("servers.httpsIpWarning") }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-xs)] text-danger-100", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: onCancel, children: t("common:cancel") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", size: "sm", children: t("common:add") })
    ] })
  ] });
}
function ServersSettings() {
  const { t } = useTranslation(["settings", "common"]);
  const [addingServer, setAddingServer] = reactExports.useState(false);
  const {
    servers,
    activeServer,
    addServer,
    removeServer,
    updateServer,
    setActiveServer,
    checkHealth,
    checkAllHealth,
    getHealth
  } = useServerStore();
  const { navigateHome, sessionId: routeSessionId } = useRouter();
  const orderedServers = reactExports.useMemo(() => {
    if (!activeServer) return servers;
    const active = servers.find((s) => s.id === activeServer.id);
    if (!active) return servers;
    return [active, ...servers.filter((s) => s.id !== active.id)];
  }, [servers, activeServer]);
  reactExports.useEffect(() => {
    checkAllHealth();
  }, [checkAllHealth]);
  const handleSelectServer = reactExports.useCallback(
    (id) => {
      if (activeServer?.id === id) return;
      if (routeSessionId) {
        messageStore.clearSession(routeSessionId);
      }
      setActiveServer(id);
      navigateHome();
      void checkHealth(id);
    },
    [activeServer?.id, checkHealth, routeSessionId, setActiveServer, navigateHome]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    SettingsCard,
    {
      title: t("servers.connections"),
      description: t("servers.connectionsDesc"),
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: checkAllHealth,
            className: "text-[length:var(--fs-xs)] px-2 py-1 rounded-md border border-border-200/60 text-text-300 hover:text-text-100 hover:border-border-300/70 hover:bg-bg-100/60 transition-colors",
            children: t("common:refresh")
          }
        ),
        !addingServer && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setAddingServer(true),
            className: "flex items-center gap-1 text-[length:var(--fs-xs)] px-2 py-1 rounded-md border border-accent-main-100/40 text-accent-main-100 hover:text-accent-main-200 hover:border-accent-main-100/60 hover:bg-accent-main-100/5 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 10 }),
              " ",
              t("common:add")
            ]
          }
        )
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        orderedServers.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          ServerItem,
          {
            server: s,
            health: getHealth(s.id),
            isActive: activeServer?.id === s.id,
            onSelect: () => handleSelectServer(s.id),
            onDelete: () => removeServer(s.id),
            onEdit: (updates) => {
              const auth = updates.password ? { username: updates.username || "opencode", password: updates.password } : void 0;
              updateServer(s.id, { name: updates.name, url: updates.url, auth });
              void checkHealth(s.id);
            },
            onCheckHealth: () => void checkHealth(s.id)
          },
          s.id
        )),
        addingServer && /* @__PURE__ */ jsxRuntimeExports.jsx(
          AddServerForm,
          {
            onAdd: (n, u, user, pass) => {
              const auth = pass ? { username: user || "opencode", password: pass } : void 0;
              const s = addServer({ name: n, url: u, auth });
              setAddingServer(false);
              void checkHealth(s.id);
            },
            onCancel: () => setAddingServer(false)
          }
        ),
        servers.length === 0 && !addingServer && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-md)] text-text-400 text-center py-8", children: t("servers.noServersConfigured") })
      ] })
    }
  ) });
}
function WorkspaceSettings() {
  const { t } = useTranslation(["settings"]);
  const {
    isWideMode,
    toggleWideMode,
    diffStyle,
    setDiffStyle,
    codeWordWrap,
    setCodeWordWrap,
    manualTerminalTitles,
    setManualTerminalTitles
  } = useTheme();
  const {
    sidebarFolderRecents,
    sidebarFolderRecentsShowDiff,
    sidebarShowChildSessions,
    terminalCopyOnSelect,
    terminalRightClickPaste,
    wakeLock
  } = useLayoutStore();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("workspace.layout"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("workspace.layoutDesc") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("appearance.wideMode"),
          description: t("appearance.wideModeDesc"),
          onClick: toggleWideMode,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: isWideMode, onChange: toggleWideMode })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("appearance.wakeLock"),
          description: t("appearance.wakeLockDesc"),
          onClick: () => layoutStore.setWakeLock(!wakeLock),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: wakeLock, onChange: () => layoutStore.setWakeLock(!wakeLock) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("appearance.codeWordWrap"),
          description: t("appearance.codeWordWrapDesc"),
          onClick: () => setCodeWordWrap(!codeWordWrap),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: codeWordWrap, onChange: () => setCodeWordWrap(!codeWordWrap) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("workspace.manualTerminalTitles"),
          description: t("workspace.manualTerminalTitlesDesc"),
          onClick: () => {
            const next = !manualTerminalTitles;
            setManualTerminalTitles(next);
            layoutStore.syncTerminalTitleMode(next);
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Toggle,
            {
              enabled: manualTerminalTitles,
              onChange: () => {
                const next = !manualTerminalTitles;
                setManualTerminalTitles(next);
                layoutStore.syncTerminalTitleMode(next);
              }
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-100 mb-1.5", children: t("appearance.diffStyle") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400 mb-3", children: t("appearance.diffStyleDesc") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedControl,
          {
            value: diffStyle,
            options: [
              { value: "markers", label: t("appearance.diffStyleMarkers") },
              { value: "changeBars", label: t("appearance.diffStyleChangeBars") }
            ],
            onChange: (v) => setDiffStyle(v)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("workspace.terminal"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("workspace.terminalDesc") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("workspace.terminalCopyOnSelect"),
          description: t("workspace.terminalCopyOnSelectDesc"),
          onClick: () => layoutStore.setTerminalCopyOnSelect(!terminalCopyOnSelect),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Toggle,
            {
              enabled: terminalCopyOnSelect,
              onChange: () => layoutStore.setTerminalCopyOnSelect(!terminalCopyOnSelect)
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("workspace.terminalRightClickPaste"),
          description: t("workspace.terminalRightClickPasteDesc"),
          onClick: () => layoutStore.setTerminalRightClickPaste(!terminalRightClickPaste),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Toggle,
            {
              enabled: terminalRightClickPaste,
              onChange: () => layoutStore.setTerminalRightClickPaste(!terminalRightClickPaste)
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsSection, { title: t("workspace.sidebar"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-sm)] text-text-400", children: t("workspace.sidebarDesc") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("appearance.folderStyleRecents"),
          description: t("appearance.folderStyleRecentsDesc"),
          onClick: () => layoutStore.setSidebarFolderRecents(!sidebarFolderRecents),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Toggle,
            {
              enabled: sidebarFolderRecents,
              onChange: () => layoutStore.setSidebarFolderRecents(!sidebarFolderRecents)
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("appearance.folderStyleRecentsShowDiff"),
          description: t("appearance.folderStyleRecentsShowDiffDesc"),
          onClick: () => layoutStore.setSidebarFolderRecentsShowDiff(!sidebarFolderRecentsShowDiff),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Toggle,
            {
              enabled: sidebarFolderRecentsShowDiff,
              onChange: () => layoutStore.setSidebarFolderRecentsShowDiff(!sidebarFolderRecentsShowDiff)
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingRow,
        {
          label: t("appearance.showChildSessions"),
          description: t("appearance.showChildSessionsDesc"),
          onClick: () => layoutStore.setSidebarShowChildSessions(!sidebarShowChildSessions),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Toggle,
            {
              enabled: sidebarShowChildSessions,
              onChange: () => layoutStore.setSidebarShowChildSessions(!sidebarShowChildSessions)
            }
          )
        }
      )
    ] })
  ] });
}
const SECTION_META = {
  general: {
    en: "General",
    zh: "通用",
    descEn: "Core settings: default model, agent, shell, sharing and updates.",
    descZh: "核心设置：默认模型、默认 agent、shell、分享与自动更新。"
  },
  server: {
    en: "Server",
    zh: "服务",
    descEn: "Options for the opencode serve and web commands.",
    descZh: "opencode serve 和 web 命令的服务端选项。"
  },
  commands: {
    en: "Commands",
    zh: "自定义命令",
    descEn: "Custom slash commands. Each command has a prompt template.",
    descZh: "自定义斜杠命令，每条命令带一个 prompt 模板。"
  },
  skills: {
    en: "Skills & References",
    zh: "技能与引用",
    descEn: "Extra skill folders/URLs and named @ references.",
    descZh: "额外的技能目录/URL，以及可用 @ 提及的命名引用。"
  },
  plugins: {
    en: "Plugins",
    zh: "插件",
    descEn: "Plugin package specs or local plugin files, with optional options.",
    descZh: "插件包名或本地插件文件，可附带配置项。"
  },
  providers: {
    en: "Providers & Models",
    zh: "渠道与模型",
    descEn: "Custom provider configuration and per-model overrides.",
    descZh: "自定义渠道（provider）配置以及单个模型的覆盖项。"
  },
  agents: {
    en: "Agents",
    zh: "Agent",
    descEn: "Built-in and custom agent overrides (model, prompt, permissions).",
    descZh: "内置与自定义 agent 的覆盖（模型、提示词、权限等）。"
  },
  mcp: {
    en: "MCP Servers",
    zh: "MCP 服务",
    descEn: "Model Context Protocol servers, local (command) or remote (url).",
    descZh: "Model Context Protocol 服务，本地（命令）或远程（URL）。"
  },
  permissions: {
    en: "Permissions",
    zh: "权限",
    descEn: "Default action (ask/allow/deny) per tool, with optional pattern rules.",
    descZh: "每个工具的默认动作（询问/允许/拒绝），可按 pattern 细分。"
  },
  formatters: {
    en: "Formatters",
    zh: "格式化器",
    descEn: "Enable built-in formatters or override individual formatter entries.",
    descZh: "启用内置格式化器，或覆盖单个格式化器配置。"
  },
  lsp: {
    en: "LSP Servers",
    zh: "LSP 服务",
    descEn: "Enable built-in language servers or define custom ones.",
    descZh: "启用内置语言服务器，或定义自定义 LSP。"
  },
  attachments: {
    en: "Attachments",
    zh: "附件",
    descEn: "Image attachment limits and auto-resize behavior.",
    descZh: "图片附件的尺寸限制与自动缩放行为。"
  },
  runtime: {
    en: "Runtime",
    zh: "运行时",
    descEn: "Tool output limits, context compaction, watcher and enterprise.",
    descZh: "工具输出限制、上下文压缩、文件监听和企业设置。"
  },
  experimental: {
    en: "Experimental",
    zh: "实验性",
    descEn: "Experimental flags that may change or be removed in future versions.",
    descZh: "实验性开关，未来版本可能变化或移除。"
  },
  compatibility: {
    en: "Compatibility",
    zh: "兼容",
    descEn: "Deprecated or compatibility fields that still exist in opencode.json.",
    descZh: "仍存在于 opencode.json 中的废弃字段或兼容字段。"
  },
  advanced: {
    en: "Unknown / Future",
    zh: "未知/未来字段",
    descEn: "Top-level fields not recognized by the current schema. They may be invalid or from a newer opencode version.",
    descZh: "当前 schema 不认识的顶层字段，可能无效，也可能来自更新版本的 opencode。"
  }
};
const SECTION_IDS = [
  "general",
  "server",
  "commands",
  "skills",
  "plugins",
  "providers",
  "agents",
  "mcp",
  "permissions",
  "formatters",
  "lsp",
  "attachments",
  "runtime",
  "experimental",
  "compatibility",
  "advanced"
];
const KNOWN_ROOT_KEYS = /* @__PURE__ */ new Set([
  "$schema",
  "shell",
  "logLevel",
  "server",
  "command",
  "skills",
  "reference",
  "watcher",
  "snapshot",
  "plugin",
  "share",
  "autoshare",
  "autoupdate",
  "disabled_providers",
  "enabled_providers",
  "model",
  "small_model",
  "default_agent",
  "username",
  "mode",
  "agent",
  "provider",
  "mcp",
  "formatter",
  "lsp",
  "instructions",
  "layout",
  "permission",
  "tools",
  "attachment",
  "enterprise",
  "tool_output",
  "compaction",
  "experimental"
]);
const PERMISSION_TOOLS = [
  { tool: "read", pattern: true, en: "Read files", zh: "读取文件" },
  { tool: "edit", pattern: true, en: "Edit / write files", zh: "编辑/写入文件" },
  { tool: "glob", pattern: true, en: "Find files by glob", zh: "按通配符查找文件" },
  { tool: "grep", pattern: true, en: "Search file contents", zh: "搜索文件内容" },
  { tool: "list", pattern: true, en: "List directories", zh: "列出目录" },
  { tool: "bash", pattern: true, en: "Run shell commands", zh: "执行 shell 命令" },
  { tool: "task", pattern: true, en: "Spawn sub-agents", zh: "启动子 agent" },
  { tool: "external_directory", pattern: true, en: "Access dirs outside workspace", zh: "访问工作区外目录" },
  { tool: "lsp", pattern: true, en: "Language server actions", zh: "语言服务器操作" },
  { tool: "skill", pattern: true, en: "Load skills", zh: "加载技能" },
  { tool: "todowrite", pattern: false, en: "Write todo list", zh: "写入待办列表" },
  { tool: "question", pattern: false, en: "Ask the user questions", zh: "向用户提问" },
  { tool: "webfetch", pattern: false, en: "Fetch web pages", zh: "抓取网页" },
  { tool: "websearch", pattern: false, en: "Search the web", zh: "联网搜索" },
  { tool: "doom_loop", pattern: false, en: "Doom loop guard", zh: "死循环保护" }
];
const PERMISSION_ACTIONS = ["ask", "allow", "deny"];
const MODEL_STATUS = ["active", "alpha", "beta", "deprecated"];
const MODALITIES = ["text", "audio", "image", "video", "pdf"];
const BUILTIN_LSP_SERVERS = /* @__PURE__ */ new Set([
  "deno",
  "typescript",
  "vue",
  "eslint",
  "oxlint",
  "biome",
  "gopls",
  "ruby-lsp",
  "ty",
  "pyright",
  "elixir-ls",
  "zls",
  "csharp",
  "razor",
  "fsharp",
  "sourcekit-lsp",
  "rust",
  "clangd",
  "svelte",
  "astro",
  "jdtls",
  "kotlin-ls",
  "yaml-ls",
  "lua-ls",
  "php intelephense",
  "prisma",
  "dart",
  "ocaml-lsp",
  "bash",
  "terraform",
  "texlab",
  "dockerfile",
  "gleam",
  "clojure-lsp",
  "nixd",
  "tinymist",
  "haskell-language-server",
  "julials"
]);
function validateConfig(config, lang, original) {
  const errors = [];
  const root = config;
  const originalRoot = original ?? {};
  const add = (path, en, zh) => errors.push({ path, message: tx$1(en, zh, lang) });
  const requireString = (path, value) => {
    if (typeof value !== "string") add(path, "must be a string", "必须是字符串");
  };
  const requireStringArray = (path, value) => {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) add(path, "must be an array of strings", "必须是字符串数组");
  };
  const requireStringMap = (path, value) => {
    if (!isRecord$1(value) || Object.values(value).some((item) => typeof item !== "string")) add(path, "must be an object with string values", "必须是字符串值对象");
  };
  const requireBooleanMap = (path, value) => {
    if (!isRecord$1(value) || Object.values(value).some((item) => typeof item !== "boolean")) add(path, "must be an object with boolean values", "必须是布尔值对象");
  };
  const requireAction = (path, value) => {
    if (!PERMISSION_ACTIONS.includes(String(value))) add(path, "must be ask, allow, or deny", "必须是 ask、allow 或 deny");
  };
  if (root.logLevel !== void 0 && !["DEBUG", "INFO", "WARN", "ERROR"].includes(String(root.logLevel))) add("logLevel", "must be DEBUG, INFO, WARN, or ERROR", "必须是 DEBUG、INFO、WARN 或 ERROR");
  if (root.share !== void 0 && !["manual", "auto", "disabled"].includes(String(root.share))) add("share", "must be manual, auto, or disabled", "必须是 manual、auto 或 disabled");
  if (root.autoupdate !== void 0 && typeof root.autoupdate !== "boolean" && root.autoupdate !== "notify") add("autoupdate", "must be true, false, or notify", "必须是 true、false 或 notify");
  for (const key of ["instructions", "disabled_providers", "enabled_providers"]) if (root[key] !== void 0) requireStringArray(key, root[key]);
  if (root.tools !== void 0) requireBooleanMap("tools", root.tools);
  const server = getObject$1(config, "server");
  if (server.port !== void 0 && (!isPositiveInteger(server.port) || Number(server.port) > 65535)) add("server.port", "must be an integer from 1 to 65535", "必须是 1 到 65535 的整数");
  if (server.cors !== void 0) requireStringArray("server.cors", server.cors);
  const skills = getObject$1(config, "skills");
  if (skills.paths !== void 0) requireStringArray("skills.paths", skills.paths);
  if (skills.urls !== void 0) requireStringArray("skills.urls", skills.urls);
  const watcher = getObject$1(config, "watcher");
  if (watcher.ignore !== void 0) requireStringArray("watcher.ignore", watcher.ignore);
  const positiveIntegerPaths = [
    ["tool_output.max_lines", getObject$1(root, "tool_output").max_lines],
    ["tool_output.max_bytes", getObject$1(root, "tool_output").max_bytes],
    ["attachment.image.max_width", getObject$1(getObject$1(root, "attachment"), "image").max_width],
    ["attachment.image.max_height", getObject$1(getObject$1(root, "attachment"), "image").max_height],
    ["attachment.image.max_base64_bytes", getObject$1(getObject$1(root, "attachment"), "image").max_base64_bytes],
    ["experimental.mcp_timeout", getObject$1(root, "experimental").mcp_timeout]
  ];
  for (const [path, value] of positiveIntegerPaths) if (value !== void 0 && !isPositiveInteger(value)) add(path, "must be a positive integer", "必须是正整数");
  const compaction = getObject$1(root, "compaction");
  for (const key of ["tail_turns", "preserve_recent_tokens", "reserved"]) {
    if (compaction[key] !== void 0 && !isNonNegativeInteger(compaction[key])) add(`compaction.${key}`, "must be a non-negative integer", "必须是非负整数");
  }
  const commands = getObject$1(config, "command");
  for (const [commandID, commandValue] of Object.entries(commands)) {
    const command = isRecord$1(commandValue) ? commandValue : {};
    requireString(`command.${commandID}.template`, command.template);
  }
  const permission = root.permission;
  if (typeof permission === "string") requireAction("permission", permission);
  else if (isRecord$1(permission)) {
    for (const [tool, value] of Object.entries(permission)) {
      if (typeof value === "string") requireAction(`permission.${tool}`, value);
      else if (isRecord$1(value)) for (const [pattern, action] of Object.entries(value)) requireAction(`permission.${tool}.${pattern}`, action);
      else add(`permission.${tool}`, "must be an action or pattern map", "必须是动作或 pattern map");
    }
  }
  const providers = getObject$1(config, "provider");
  for (const [providerID, providerValue] of Object.entries(providers)) {
    const provider = isRecord$1(providerValue) ? providerValue : {};
    for (const key of ["env", "whitelist", "blacklist"]) if (provider[key] !== void 0) requireStringArray(`provider.${providerID}.${key}`, provider[key]);
    const options = getObject$1(provider, "options");
    if (options.headers !== void 0) requireStringMap(`provider.${providerID}.options.headers`, options.headers);
    for (const key of ["timeout", "headerTimeout"]) {
      const value = options[key];
      if (value !== void 0 && value !== false && !isPositiveInteger(value)) add(`provider.${providerID}.options.${key}`, "must be a positive integer or false", "必须是正整数或 false");
    }
    if (options.chunkTimeout !== void 0 && !isPositiveInteger(options.chunkTimeout)) add(`provider.${providerID}.options.chunkTimeout`, "must be a positive integer", "必须是正整数");
    const models = getObject$1(provider, "models");
    for (const [modelID, modelValue] of Object.entries(models)) {
      const model = isRecord$1(modelValue) ? modelValue : {};
      if (model.status !== void 0 && !MODEL_STATUS.includes(String(model.status))) add(`provider.${providerID}.models.${modelID}.status`, "must be active, alpha, beta, or deprecated", "必须是 active、alpha、beta 或 deprecated");
      const cost = getObject$1(model, "cost");
      if ("cost" in model) {
        for (const key of ["input", "output"]) if (cost[key] === void 0) add(`provider.${providerID}.models.${modelID}.cost.${key}`, "is required", "必填");
        for (const key of ["input", "output", "cache_read", "cache_write"]) if (cost[key] !== void 0 && !isFiniteNumber(cost[key])) add(`provider.${providerID}.models.${modelID}.cost.${key}`, "must be a number", "必须是数字");
        const over = getObject$1(cost, "context_over_200k");
        if ("context_over_200k" in cost) {
          for (const key of ["input", "output"]) if (over[key] === void 0) add(`provider.${providerID}.models.${modelID}.cost.context_over_200k.${key}`, "is required", "必填");
          for (const key of ["input", "output", "cache_read", "cache_write"]) if (over[key] !== void 0 && !isFiniteNumber(over[key])) add(`provider.${providerID}.models.${modelID}.cost.context_over_200k.${key}`, "must be a number", "必须是数字");
        }
      }
      const limit = getObject$1(model, "limit");
      if ("limit" in model) {
        for (const key of ["context", "output"]) if (limit[key] === void 0) add(`provider.${providerID}.models.${modelID}.limit.${key}`, "is required", "必填");
        for (const key of ["context", "input", "output"]) if (limit[key] !== void 0 && !isFiniteNumber(limit[key])) add(`provider.${providerID}.models.${modelID}.limit.${key}`, "must be a number", "必须是数字");
      }
      if (model.headers !== void 0) requireStringMap(`provider.${providerID}.models.${modelID}.headers`, model.headers);
    }
  }
  const mcps = getObject$1(config, "mcp");
  const originalMcps = getObject$1(originalRoot, "mcp");
  for (const [name, value] of Object.entries(mcps)) {
    const mcp = isRecord$1(value) ? value : {};
    const originalMcp = isRecord$1(originalMcps[name]) ? originalMcps[name] : {};
    const originalType = typeof originalMcp.type === "string" ? originalMcp.type : "enabled-only";
    const nextType = typeof mcp.type === "string" ? mcp.type : "enabled-only";
    if (name in originalMcps && originalType !== nextType) add(`mcp.${name}.type`, "cannot switch saved MCP entry shape through the merge API; add a new entry or reset before saving", "不能通过 merge API 切换已保存 MCP 条目形态；请新增条目或保存前 Reset");
    if (mcp.enabled !== void 0 && typeof mcp.enabled !== "boolean") add(`mcp.${name}.enabled`, "must be a boolean", "必须是布尔值");
    if ("enabled" in mcp && !("type" in mcp)) continue;
    if (mcp.type === "local") requireStringArray(`mcp.${name}.command`, mcp.command);
    else if (mcp.type === "remote") requireString(`mcp.${name}.url`, mcp.url);
    else add(`mcp.${name}.type`, "must be local or remote, or use enabled-only shape", "必须是 local 或 remote，或使用 enabled-only 形态");
    if (mcp.environment !== void 0) requireStringMap(`mcp.${name}.environment`, mcp.environment);
    if (mcp.headers !== void 0) requireStringMap(`mcp.${name}.headers`, mcp.headers);
    if (mcp.timeout !== void 0 && !isPositiveInteger(mcp.timeout)) add(`mcp.${name}.timeout`, "must be a positive integer", "必须是正整数");
  }
  const formatter = root.formatter;
  if (isRecord$1(formatter)) {
    for (const [name, value] of Object.entries(formatter)) {
      const entry = isRecord$1(value) ? value : {};
      if (entry.command !== void 0) requireStringArray(`formatter.${name}.command`, entry.command);
      if (entry.extensions !== void 0) requireStringArray(`formatter.${name}.extensions`, entry.extensions);
      if (entry.environment !== void 0) requireStringMap(`formatter.${name}.environment`, entry.environment);
      if (entry.disabled !== void 0 && typeof entry.disabled !== "boolean") add(`formatter.${name}.disabled`, "must be a boolean", "必须是布尔值");
    }
  }
  const lsp = root.lsp;
  const originalLsp = getObject$1(originalRoot, "lsp");
  if (isRecord$1(lsp)) {
    for (const [name, value] of Object.entries(lsp)) {
      const entry = isRecord$1(value) ? value : {};
      const originalEntry = isRecord$1(originalLsp[name]) ? originalLsp[name] : {};
      if ("command" in originalEntry && entry.disabled === true && !("command" in entry)) add(`lsp.${name}.mode`, "cannot switch a saved custom LSP entry to disabled-only through the merge API; set disabled=true in custom mode instead", "不能通过 merge API 把已保存 custom LSP 切成 disabled-only；请在 custom 模式下设置 disabled=true");
      if (originalEntry.disabled === true && "command" in entry && entry.disabled !== false) add(`lsp.${name}.disabled`, "must be false when switching a saved disabled-only LSP entry to custom command", "已保存 disabled-only LSP 切到 custom command 时必须显式为 false");
      if (entry.disabled === true) continue;
      requireStringArray(`lsp.${name}.command`, entry.command);
      if (entry.extensions !== void 0) requireStringArray(`lsp.${name}.extensions`, entry.extensions);
      if (entry.env !== void 0) requireStringMap(`lsp.${name}.env`, entry.env);
      if (!BUILTIN_LSP_SERVERS.has(name) && entry.disabled !== true && !Array.isArray(entry.extensions)) add(`lsp.${name}.extensions`, "is required for custom LSP servers", "自定义 LSP 服务必填");
    }
  }
  return errors;
}
function validationDrillTargetForError(error) {
  const segments = error.segments?.length ? error.segments : error.path === "$" ? [] : error.path.split(".");
  const section = sectionForValidationPath(error.path);
  const stack = [];
  const push = (id, title) => {
    if (!id) return;
    stack.push({ id, title: title ?? id });
  };
  if (segments[0] === "command") push(segments[1] ? `command:${segments[1]}` : void 0, segments[1]);
  else if (segments[0] === "reference") push(segments[1] ? `reference:${segments[1]}` : void 0, segments[1] ? `@${segments[1]}` : void 0);
  else if (segments[0] === "plugin" && segments[1]) push(`plugin:${segments[1]}`, "plugin");
  else if (segments[0] === "provider" && segments[1]) {
    push(`provider:${segments[1]}`, segments[1]);
    const modelIndex = segments.indexOf("models");
    if (modelIndex >= 0) {
      push("models", "models");
      const modelID = segments[modelIndex + 1];
      push(modelID ? `model:${modelID}` : void 0, modelID);
      const variantIndex = segments.indexOf("variants");
      if (variantIndex >= 0) {
        push("variants", "variants");
        const variantID = segments[variantIndex + 1];
        push(variantID ? `variant:${variantID}` : void 0, variantID);
      }
    } else if (segments[2]) push(segments[2], segments[2]);
  } else if (segments[0] === "agent") {
    push(segments[1] ? `agent:${segments[1]}` : void 0, segments[1]);
    if (segments[2]) push(segments[2], segments[2]);
  } else if (segments[0] === "mcp") push(segments[1] ? `mcp:${segments[1]}` : void 0, segments[1]);
  else if (segments[0] === "permission" && segments[1] && segments.length > 2) push(`permission-patterns:${segments[1]}`, `${segments[1]}.patterns`);
  else if (segments[0] === "formatter") push(segments[1] ? `formatter:${segments[1]}` : void 0, segments[1]);
  else if (segments[0] === "lsp") push(segments[1] ? `lsp:${segments[1]}` : void 0, segments[1]);
  else if (segments[0] === "mode") push(segments[1] ? `mode-agent:${segments[1]}` : void 0, segments[1]);
  return { section, stack };
}
function sectionForValidationPath(path) {
  if (path.startsWith("server.")) return "server";
  if (path.startsWith("command.")) return "commands";
  if (path.startsWith("provider.")) return "providers";
  if (path.startsWith("agent.")) return "agents";
  if (path.startsWith("mcp.")) return "mcp";
  if (path.startsWith("permission.")) return "permissions";
  if (path.startsWith("formatter.")) return "formatters";
  if (path.startsWith("lsp.")) return "lsp";
  if (path.startsWith("attachment.")) return "attachments";
  if (path.startsWith("tool_output.") || path.startsWith("compaction.") || path.startsWith("watcher.") || path.startsWith("enterprise.")) return "runtime";
  if (path.startsWith("experimental.")) return "experimental";
  if (path === "$schema" || path === "autoshare" || path === "layout" || path.startsWith("mode.")) return "compatibility";
  return "general";
}
function isRecord$1(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function getObject$1(record, key) {
  if (!isRecord$1(record)) return {};
  const value = record[key];
  return isRecord$1(value) ? value : {};
}
function isPositiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
function isNonNegativeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function tx$1(en, zh, lang) {
  return lang.startsWith("zh") ? zh : en;
}
const DrillContext = reactExports.createContext(null);
const ValidationDrillTargetContext = reactExports.createContext(null);
const DrillDepthContext = reactExports.createContext(0);
function useDrillState() {
  const api = reactExports.useContext(DrillContext);
  if (!api) throw new Error("useDrill must be used inside <Drill>");
  return api;
}
function useDrillContainer() {
  const state = useDrillState();
  const depth = reactExports.useContext(DrillDepthContext);
  const activeChild = state.stack[depth] ?? null;
  const enter = (entry) => {
    state.back(depth);
    state.push(entry);
  };
  return { activeChildId: activeChild?.id ?? null, enter, depth };
}
const JsonDraftErrorContext = reactExports.createContext(() => {
});
function tx(en, zh, lang) {
  return lang.startsWith("zh") ? zh : en;
}
function useLang() {
  const { i18n } = useTranslation("settings");
  return i18n.language;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}
function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
function getObject(source, key) {
  const value = isRecord(source) ? source[key] : void 0;
  return isRecord(value) ? value : {};
}
function hasRoot(config, key) {
  return key in config;
}
function hasNested(config, path) {
  let current = config;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) return false;
    current = current[key];
  }
  return true;
}
function setRoot(config, key, value) {
  return { ...config, [key]: value };
}
function setNested(config, path, value) {
  const next = clone(config);
  let current = next;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!isRecord(current[key])) current[key] = {};
    current = current[key];
  }
  current[path[path.length - 1]] = value;
  return next;
}
function asStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}
function previewValue(value, lang) {
  if (value === void 0 || value === null) return tx("not set", "未设置", lang);
  if (typeof value === "string") return value || tx("(empty)", "（空）", lang);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return tx(`${value.length} item(s)`, `${value.length} 项`, lang);
  if (isRecord(value)) {
    const n = Object.keys(value).length;
    return tx(`${n} field(s)`, `${n} 个字段`, lang);
  }
  return String(value);
}
function suggestCopyId(id, existing) {
  const base = `${id}-copy`;
  if (!(base in existing)) return base;
  for (let i = 2; i < 1e3; i++) {
    const next = `${base}-${i}`;
    if (!(next in existing)) return next;
  }
  return `${base}-${Date.now()}`;
}
let jsonDraftIDSeed = 0;
const fieldClass = "min-w-0 w-full rounded-lg border border-border-200/60 bg-bg-000 px-3 py-2 text-[length:var(--fs-sm)] text-text-100 outline-none transition-colors focus:border-accent-main-100 placeholder:text-text-500";
function enumChoices$1(values) {
  return values.map((value) => ({ value, label: value }));
}
function TextField({
  value,
  onChange,
  placeholder,
  mono
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      value: value === void 0 || value === null ? "" : String(value),
      onChange: (event) => onChange(event.target.value),
      placeholder,
      className: `${fieldClass} ${mono ? "font-mono" : ""}`
    }
  );
}
function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "textarea",
    {
      value: value === void 0 || value === null ? "" : String(value),
      onChange: (event) => onChange(event.target.value),
      placeholder,
      rows,
      className: `${fieldClass} resize-y leading-relaxed`
    }
  );
}
function NumberField({
  value,
  onChange,
  placeholder
}) {
  const lang = useLang();
  const external = typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  const [prevExternal, setPrevExternal] = reactExports.useState(external);
  const [draft, setDraft] = reactExports.useState(external);
  const [invalid, setInvalid] = reactExports.useState(false);
  if (prevExternal !== external) {
    setPrevExternal(external);
    setDraft(external);
    setInvalid(false);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "number",
        value: draft,
        placeholder,
        onChange: (event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (raw === "") {
            setInvalid(false);
            return;
          }
          const next = Number(raw);
          if (Number.isFinite(next)) {
            setInvalid(false);
            onChange(next);
          } else {
            setInvalid(true);
          }
        },
        onBlur: () => {
          if (draft === "") setDraft(external);
        },
        className: `${fieldClass} ${invalid ? "border-error-100" : ""}`
      }
    ),
    draft === "" && external !== "" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-500", children: tx("Empty input will not remove a saved value; enter a new number or Reset before saving.", "留空不会删除已保存值；请输入新数字，或保存前 Reset。", lang) }),
    invalid && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-error-100", children: tx("Must be a valid number.", "必须是有效数字。", lang) })
  ] });
}
function IntegerField({
  value,
  onChange,
  min,
  max,
  positive
}) {
  const lang = useLang();
  const numberValue = typeof value === "number" ? value : void 0;
  const external = numberValue !== void 0 && Number.isFinite(numberValue) ? String(numberValue) : "";
  const [prevExternal, setPrevExternal] = reactExports.useState(external);
  const [draft, setDraft] = reactExports.useState(external);
  if (prevExternal !== external) {
    setPrevExternal(external);
    setDraft(external);
  }
  const parsed = draft === "" ? void 0 : Number(draft);
  const invalid = parsed !== void 0 && (!Number.isFinite(parsed) || !Number.isInteger(parsed) || positive && parsed <= 0 || min !== void 0 && parsed < min || max !== void 0 && parsed > max);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "number",
        step: 1,
        min: min ?? (positive ? 1 : void 0),
        max,
        value: draft,
        onChange: (event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (raw === "") return;
          const next = Number(raw);
          if (Number.isFinite(next)) onChange(next);
        },
        onBlur: () => {
          if (draft === "") setDraft(external);
        },
        className: `${fieldClass} ${invalid ? "border-error-100" : ""}`
      }
    ),
    draft === "" && external !== "" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-500", children: tx("Empty input will not remove a saved value; enter a new integer or Reset before saving.", "留空不会删除已保存值；请输入新整数，或保存前 Reset。", lang) }),
    invalid && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-error-100", children: tx("Must be an integer in the allowed range.", "必须是允许范围内的整数。", lang) })
  ] });
}
function PositiveIntegerField(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(IntegerField, { ...props, positive: true });
}
function PortField(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(IntegerField, { ...props, min: 1, max: 65535 });
}
function BoolField({ value, onChange }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: Boolean(value), onChange: () => onChange(!value) }) });
}
function NumberOrFalseField({ value, onChange }) {
  const mode = value === false ? "false" : "number";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Select,
      {
        value: mode,
        options: [
          { value: "number", label: "number" },
          { value: "false", label: "false" }
        ],
        onChange: (next) => onChange(next === "false" ? false : typeof value === "number" ? value : void 0)
      }
    ),
    mode === "number" && /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value, onChange })
  ] });
}
function Select({
  value,
  options,
  onChange,
  placeholder,
  editable
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState("");
  const triggerRef = reactExports.useRef(null);
  const menuRef = reactExports.useRef(null);
  const [pos, setPos] = reactExports.useState({});
  const current = value === void 0 || value === null ? "" : String(value);
  const selected = options.find((option) => option.value === current);
  const display = selected ? selected.label : current;
  const query = open && editable ? draft : "";
  const filtered = options.filter((option) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q);
  });
  const place = reactExports.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const openUp = below < 280 && rect.top > below;
    const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 16);
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8);
    setPos({
      left,
      width,
      maxWidth: "calc(100vw - 16px)",
      ...openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }
    });
  }, []);
  reactExports.useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(place);
    const onDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onScroll = () => place();
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
      cancelAnimationFrame(raf);
    };
  }, [open, place]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: triggerRef, className: "relative min-w-0 flex-1", children: [
    editable && open ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        autoFocus: true,
        value: draft,
        placeholder: display || placeholder,
        onChange: (event) => {
          setDraft(event.target.value);
          onChange(event.target.value);
        },
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === "Escape") setOpen(false);
        },
        className: `${fieldClass} pr-9`
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => {
          setDraft(current);
          setOpen((o) => !o);
        },
        className: `${fieldClass} flex items-center justify-between gap-2 text-left ${display ? "" : "text-text-500"}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: display || placeholder || tx("Select…", "选择…", "") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDownIcon, { size: 14, className: "shrink-0 text-text-400" })
        ]
      }
    ),
    editable && open && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        tabIndex: -1,
        onClick: () => setOpen(false),
        className: "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-500 hover:bg-bg-100",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDownIcon, { size: 14 })
      }
    ),
    open && reactDomExports.createPortal(
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          ref: menuRef,
          className: "fixed z-[400] max-h-64 overflow-y-auto rounded-xl border border-border-200/60 bg-bg-000 p-1 shadow-lg custom-scrollbar",
          style: pos,
          children: [
            filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 text-[length:var(--fs-xs)] text-text-500", children: tx("No matches", "无匹配项", "") }),
            filtered.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                disabled: option.disabled,
                onClick: () => {
                  onChange(option.value);
                  setOpen(false);
                },
                className: `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[length:var(--fs-sm)] transition-colors disabled:opacity-40 ${option.value === current ? "bg-accent-main-100/12 text-accent-main-100" : "text-text-200 hover:bg-bg-100"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate", children: option.label }),
                    option.hint && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-[length:var(--fs-xs)] text-text-500", children: option.hint })
                  ] }),
                  option.value === current && /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { size: 14, className: "shrink-0" })
                ]
              },
              `${option.value}|${option.label}`
            ))
          ]
        }
      ),
      document.body
    )
  ] });
}
function StringListField({
  value,
  onChange,
  placeholder,
  mono
}) {
  const list = asStringArray(value);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    list.map((item, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: item,
          onChange: (event) => {
            const next = [...list];
            next[index] = event.target.value;
            onChange(next);
          },
          placeholder,
          className: `${fieldClass} ${mono ? "font-mono" : ""}`
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onChange(list.filter((_, i) => i !== index)),
          className: "shrink-0 rounded-lg border border-border-200/60 px-2 text-text-500 hover:bg-bg-100 hover:text-error-100",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrashIcon, { size: 14 })
        }
      )
    ] }, index)),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => onChange([...list, ""]),
        className: "inline-flex items-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-1.5 text-[length:var(--fs-xs)] text-text-300 transition-colors hover:bg-bg-100",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13 }),
          tx("Add", "添加", "")
        ]
      }
    )
  ] });
}
function jsonValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (isRecord(value)) return "object";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}
function emptyJsonValue(type) {
  switch (type) {
    case "number":
      return 0;
    case "boolean":
      return true;
    case "object":
      return {};
    case "array":
      return [];
    case "null":
      return null;
    case "string":
      return "";
  }
}
function JsonStructuredEditor({ value, type, onChange }) {
  const lang = useLang();
  const reportDraftError = reactExports.useContext(JsonDraftErrorContext);
  const draftID = reactExports.useRef(void 0);
  if (!draftID.current) draftID.current = `json-draft-${++jsonDraftIDSeed}`;
  const currentDraftID = draftID.current;
  const [error, setError] = reactExports.useState(null);
  const text = JSON.stringify(value ?? emptyJsonValue(type), null, 2);
  const [draft, setDraft] = reactExports.useState(text);
  const focused = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!focused.current) setDraft(text);
    setError(null);
    reportDraftError(currentDraftID, false);
  }, [text, currentDraftID, reportDraftError]);
  reactExports.useEffect(() => () => reportDraftError(currentDraftID, false), [currentDraftID, reportDraftError]);
  const parseDraft = (nextDraft) => {
    try {
      const next = JSON.parse(nextDraft);
      if (type === "object" && !isRecord(next)) {
        const message = tx("Expected a JSON object.", "需要 JSON object。", lang);
        setError(message);
        reportDraftError(currentDraftID, true);
        return;
      }
      if (type === "array" && !Array.isArray(next)) {
        const message = tx("Expected a JSON array.", "需要 JSON array。", lang);
        setError(message);
        reportDraftError(currentDraftID, true);
        return;
      }
      setError(null);
      reportDraftError(currentDraftID, false);
      return next;
    } catch {
      setError(tx("Invalid JSON.", "JSON 无效。", lang));
      reportDraftError(currentDraftID, true);
    }
    return void 0;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        value: draft,
        rows: Math.min(10, Math.max(4, draft.split("\n").length)),
        onFocus: () => {
          focused.current = true;
        },
        onChange: (event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          const next = parseDraft(nextDraft);
          if (next !== void 0) onChange(next);
        },
        onBlur: () => {
          focused.current = false;
          const next = parseDraft(draft);
          if (next !== void 0) {
            onChange(next);
            setDraft(JSON.stringify(next, null, 2));
          }
        },
        className: `${fieldClass} resize-y font-mono leading-relaxed`
      }
    ),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-error-100", children: error })
  ] });
}
function JsonValueEditor({ value, onChange, placeholder }) {
  const type = jsonValueType(value);
  switch (type) {
    case "number":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(NumberField, { value, onChange: (next) => onChange(next ?? 0) });
    case "boolean":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value, onChange });
    case "object":
    case "array":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(JsonStructuredEditor, { value, type, onChange });
    case "null":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: "null", disabled: true, className: `${fieldClass} text-text-500` });
    case "string":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value, onChange, placeholder, mono: true });
  }
}
function KeyValueField({
  value,
  onChange,
  keyPlaceholder,
  valuePlaceholder
}) {
  const lang = useLang();
  const record = isRecord(value) ? value : {};
  const [newKey, setNewKey] = reactExports.useState("");
  const [newType, setNewType] = reactExports.useState("string");
  const entries = Object.entries(record);
  const typeOptions = enumChoices$1(["string", "number", "boolean", "object", "array", "null"]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    entries.map(([key, item]) => {
      const type = jsonValueType(item);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 p-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-col gap-2 sm:flex-row sm:items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1 truncate rounded-lg border border-border-200/40 bg-bg-100/50 px-3 py-2 font-mono text-[length:var(--fs-xs)] text-text-300", children: key }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-w-0 items-center gap-2 sm:w-44", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: type, options: typeOptions, onChange: (next) => onChange({ ...record, [key]: emptyJsonValue(next) }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(JsonValueEditor, { value: item, onChange: (next) => onChange({ ...record, [key]: next }), placeholder: valuePlaceholder })
      ] }, key);
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-dashed border-border-200/55 bg-bg-000/15 p-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: newKey,
          onChange: (event) => setNewKey(event.target.value),
          placeholder: keyPlaceholder ?? tx("new key", "新键名", lang),
          className: `${fieldClass} min-w-0 flex-1 font-mono`
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2 sm:w-56", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: newType, options: typeOptions, onChange: (next) => setNewType(next) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            disabled: !newKey.trim() || newKey in record,
            onClick: () => {
              onChange({ ...record, [newKey.trim()]: emptyJsonValue(newType) });
              setNewKey("");
            },
            className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-2 text-[length:var(--fs-xs)] text-text-300 transition-colors hover:bg-bg-100 disabled:opacity-40",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13 }),
              tx("Add", "添加", lang)
            ]
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] leading-relaxed text-text-500", children: tx("Existing object keys cannot be reliably deleted through the official merge API; change values instead, or reset before saving newly added keys.", "官方 merge API 不能可靠删除已保存的 object key；请改值，刚新增但不想保存的键可以在保存前 Reset。", lang) })
  ] });
}
function StringMapField({
  value,
  onChange,
  keyPlaceholder,
  valuePlaceholder
}) {
  const lang = useLang();
  const record = isRecord(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "string" ? item : String(item ?? "")])) : {};
  const [newKey, setNewKey] = reactExports.useState("");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    Object.entries(record).map(([key, item]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 p-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 truncate rounded-lg border border-border-200/40 bg-bg-100/50 px-3 py-2 font-mono text-[length:var(--fs-xs)] text-text-300", children: key }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: item, onChange: (next) => onChange({ ...record, [key]: next }), placeholder: valuePlaceholder, mono: true })
    ] }, key)),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-dashed border-border-200/55 bg-bg-000/15 p-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: newKey,
          onChange: (event) => setNewKey(event.target.value),
          placeholder: keyPlaceholder ?? tx("new key", "新键名", lang),
          className: `${fieldClass} min-w-0 flex-1 font-mono`
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: !newKey.trim() || newKey in record,
          onClick: () => {
            onChange({ ...record, [newKey.trim()]: "" });
            setNewKey("");
          },
          className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-2 text-[length:var(--fs-xs)] text-text-300 transition-colors hover:bg-bg-100 disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13 }),
            tx("Add", "添加", lang)
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] leading-relaxed text-text-500", children: tx("This map only accepts string values. Existing keys cannot be reliably deleted through the official merge API.", "这个 map 只接受字符串值。官方 merge API 不能可靠删除已保存的 key。", lang) })
  ] });
}
function Drill({ rootTitle, rootKey, targetKey, targetStack, children }) {
  const [stack, setStack] = reactExports.useState(targetStack ?? []);
  const [prevRootKey, setPrevRootKey] = reactExports.useState(rootKey);
  const [prevTargetKey, setPrevTargetKey] = reactExports.useState(targetKey);
  const lang = useLang();
  if (prevRootKey !== rootKey || prevTargetKey !== targetKey) {
    setPrevRootKey(rootKey);
    setPrevTargetKey(targetKey);
    setStack(targetStack ?? []);
  }
  const liveStack = prevRootKey !== rootKey || prevTargetKey !== targetKey ? targetStack ?? [] : stack;
  const api = {
    stack: liveStack,
    push: (entry) => setStack((prev) => [...prev, entry]),
    back: (toIndex) => setStack((prev) => prev.slice(0, toIndex)),
    replace: (index, entry) => setStack((prev) => [...prev.slice(0, index), entry])
  };
  const trail = [{ id: "__root__", title: rootTitle }, ...liveStack];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillContext.Provider, { value: api, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillDepthContext.Provider, { value: 0, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
    liveStack.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-start gap-2 border-b border-border-200/40 pb-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => api.back(liveStack.length - 1),
          className: "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-border-200/60 px-2 py-1 text-[length:var(--fs-xs)] text-text-300 transition-colors hover:bg-bg-100",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeftIcon, { size: 13 }),
            tx("Back", "返回", lang)
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[length:var(--fs-xs)]", children: trail.map((frame, index) => {
        const isLast = index === trail.length - 1;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 max-w-full items-center gap-1", children: [
          index > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 11, className: "text-text-500" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              disabled: isLast,
              onClick: () => api.back(index),
              className: `min-w-0 max-w-[180px] truncate rounded px-1 font-mono ${isLast ? "text-text-200" : "text-accent-main-100 hover:underline"}`,
              children: frame.title
            }
          )
        ] }, frame.id);
      }) })
    ] }),
    children
  ] }) }) });
}
function DrillChild({ depth, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillDepthContext.Provider, { value: depth + 1, children });
}
function DrillRow({
  label,
  desc,
  preview,
  badge,
  onClick,
  onFocus,
  onBlur
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      onFocus,
      onBlur,
      className: "group flex w-full items-center gap-3 border-b border-border-200/35 py-3.5 text-left last:border-b-0",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 break-all font-mono text-[length:var(--fs-sm)] font-medium text-text-100", children: label }),
            badge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-warning-100/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning-100", children: badge })
          ] }),
          desc && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[length:var(--fs-xs)] leading-relaxed text-text-400", children: desc })
        ] }),
        preview && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 max-w-[40%] truncate text-[length:var(--fs-xs)] text-text-500", children: preview }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 15, className: "shrink-0 text-text-500 transition-transform group-hover:translate-x-0.5" })
      ]
    }
  );
}
function FieldRow({
  label,
  desc,
  badge,
  block,
  control,
  onFocus,
  onBlur
}) {
  if (block) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border-200/35 py-3.5 last:border-b-0", onFocus, onBlur, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 break-all font-mono text-[length:var(--fs-sm)] font-medium text-text-100", children: label }),
          badge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-warning-100/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning-100", children: badge })
        ] }),
        desc && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[length:var(--fs-xs)] leading-relaxed text-text-400", children: desc })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0", children: control })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 border-b border-border-200/35 py-3.5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(240px,340px)] md:items-start md:gap-5", onFocus, onBlur, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 break-all font-mono text-[length:var(--fs-sm)] font-medium text-text-100", children: label }),
        badge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-warning-100/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning-100", children: badge })
      ] }),
      desc && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[length:var(--fs-xs)] leading-relaxed text-text-400", children: desc })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0", children: control })
  ] });
}
function EmptyHint({ text }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-dashed border-border-200/50 bg-bg-000/30 px-3 py-5 text-center text-[length:var(--fs-sm)] text-text-500", children: text });
}
function FieldRenderer({
  field,
  onEnter,
  onFieldFocus,
  onFieldBlur
}) {
  const handleFocus = () => onFieldFocus?.(field);
  const handleBlur = (event) => onFieldBlur?.(field.key, event.currentTarget, event.relatedTarget);
  if (field.drill) {
    const d = field.drill;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillRow, { label: field.label, desc: field.desc, badge: field.badge, preview: d.preview, onClick: () => onEnter(field), onFocus: handleFocus, onBlur: handleBlur });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FieldRow, { label: field.label, desc: field.desc, badge: field.badge, block: field.block, control: field.control, onFocus: handleFocus, onBlur: handleBlur });
}
function GroupedFields({
  fields,
  isConfigured,
  lang,
  onEnter
}) {
  const handleEnter = onEnter ?? (() => {
  });
  const [focusedField, setFocusedField] = reactExports.useState(null);
  const focusedAvailableKey = focusedField?.group === "available" ? focusedField.key : null;
  const configured = fields.filter((field) => isConfigured(field.key) && field.key !== focusedAvailableKey);
  const available = fields.filter((field) => !isConfigured(field.key) || field.key === focusedAvailableKey);
  const handleFieldFocus = (field) => {
    const group = isConfigured(field.key) ? "configured" : "available";
    setFocusedField((prev) => prev?.key === field.key && prev.group === group ? prev : { key: field.key, group });
  };
  const handleFieldBlur = (fieldKey, currentTarget, relatedTarget) => {
    if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;
    setFocusedField((prev) => prev?.key === fieldKey ? null : prev);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GroupHeader, { text: tx("Configured", "已配置", lang), count: configured.length, accent: true }),
      configured.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: tx("No fields configured yet.", "还没有配置任何字段。", lang) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 px-3.5", children: configured.map((field) => /* @__PURE__ */ jsxRuntimeExports.jsx(FieldRenderer, { field, onEnter: handleEnter, onFieldFocus: handleFieldFocus, onFieldBlur: handleFieldBlur }, field.key)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GroupHeader, { text: tx("Available", "可配置", lang), count: available.length }),
      available.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: tx("All fields are configured.", "全部字段都已配置。", lang) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/15 px-3.5", children: available.map((field) => /* @__PURE__ */ jsxRuntimeExports.jsx(FieldRenderer, { field, onEnter: handleEnter, onFieldFocus: handleFieldFocus, onFieldBlur: handleFieldBlur }, field.key)) })
    ] })
  ] });
}
function GroupHeader({ text, count, accent }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[length:var(--fs-xs)] font-semibold uppercase tracking-wide ${accent ? "text-accent-main-100" : "text-text-500"}`, children: text }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-bg-100 px-1.5 text-[10px] text-text-500", children: count })
  ] });
}
function DrillFields({ fields, isConfigured, lang }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  if (activeChildId) {
    const active = fields.find((field) => field.drill && field.key === activeChildId);
    if (active?.drill) return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: active.drill.render() });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    GroupedFields,
    {
      fields,
      isConfigured,
      lang,
      onEnter: (field) => field.drill && enter({ id: field.key, title: field.drill.title })
    }
  );
}
function SectionShell({ id, lang, drillKey, children }) {
  const meta = SECTION_META[id];
  const target = reactExports.useContext(ValidationDrillTargetContext);
  const activeTarget = target?.section === id ? target : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[length:var(--fs-heading-2)] font-semibold text-text-100", children: tx(meta.en, meta.zh, lang) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[length:var(--fs-sm)] leading-relaxed text-text-400", children: tx(meta.descEn, meta.descZh, lang) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Drill, { rootTitle: tx(meta.en, meta.zh, lang), rootKey: drillKey ?? id, targetKey: activeTarget?.key, targetStack: activeTarget?.stack, children })
  ] });
}
function NamedDrillList({
  lang,
  items,
  addPlaceholder,
  onOpen,
  onAdd,
  builtins,
  renderPreview,
  emptyText
}) {
  const [newName, setNewName] = reactExports.useState("");
  const add = () => {
    const name = newName.trim();
    if (!name) return;
    onAdd(name);
    onOpen(name);
    setNewName("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: emptyText ?? tx("No items yet.", "还没有条目。", lang) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 px-3.5", children: items.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "group flex items-center gap-2 border-b border-border-200/35 last:border-b-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => onOpen(name), className: "flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "truncate font-mono text-[length:var(--fs-sm)] font-medium text-text-100", children: [
          name,
          builtins?.includes(name) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 text-[10px] uppercase text-text-500", children: tx("built-in", "内置", lang) })
        ] }),
        renderPreview && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[length:var(--fs-xs)] text-text-500", children: renderPreview(name) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 15, className: "shrink-0 text-text-500 transition-transform group-hover:translate-x-0.5" })
    ] }) }, name)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: newName,
          onChange: (event) => setNewName(event.target.value),
          placeholder: addPlaceholder,
          onKeyDown: (event) => {
            if (event.key === "Enter") add();
          },
          className: `${fieldClass} min-w-0 flex-1 font-mono`
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: !newName.trim(),
          onClick: add,
          className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100 disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 14 }),
            tx("Add", "添加", lang)
          ]
        }
      )
    ] })
  ] });
}
function enumChoices(values) {
  return values.map((value) => ({ value, label: value }));
}
function PermissionEditor({ value, onChange, lang }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const [newTool, setNewTool] = reactExports.useState("");
  const globalMode = typeof value === "string";
  const record = isRecord(value) ? value : {};
  const knownTools = new Set(PERMISSION_TOOLS.map((item) => item.tool));
  const customTools = Object.keys(record).filter((tool) => !knownTools.has(tool)).sort();
  if (activeChildId?.startsWith("permission-patterns:")) {
    const tool = activeChildId.slice("permission-patterns:".length);
    const current = record[tool];
    if (isRecord(current)) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(PatternRules, { value: current, onChange: (next) => onChange({ ...record, [tool]: next }), lang }) });
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2 rounded-lg border border-border-200/40 bg-bg-000/30 p-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 text-[length:var(--fs-xs)] text-text-400", children: tx("Apply one action to everything", "对所有工具应用同一动作", lang) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Select,
        {
          value: globalMode ? String(value) : "",
          options: [{ value: "", label: tx("per-tool", "按工具", lang) }, ...enumChoices(PERMISSION_ACTIONS)],
          onChange: (next) => onChange(next === "" ? {} : next)
        }
      )
    ] }),
    !globalMode && PERMISSION_TOOLS.map(({ tool, pattern, en, zh }) => {
      const current = record[tool];
      const isPatternMap = isRecord(current);
      const simple = typeof current === "string" ? current : "";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border-200/40 bg-bg-000/30 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-mono text-[length:var(--fs-sm)] text-text-200", children: tool }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-500", children: tx(en, zh, lang) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-32 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: isPatternMap ? "__pattern__" : simple,
              options: [
                ...!(tool in record) ? [{ value: "", label: tx("inherit", "继承", lang) }] : [],
                ...enumChoices(PERMISSION_ACTIONS),
                ...pattern ? [{ value: "__pattern__", label: tx("by pattern…", "按 pattern…", lang) }] : []
              ],
              onChange: (next) => {
                if (next === "__pattern__") {
                  onChange({ ...record, [tool]: isPatternMap ? current : { "*": "ask" } });
                } else if (next !== "") {
                  onChange({ ...record, [tool]: next });
                }
              }
            }
          ) })
        ] }),
        isPatternMap && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 border-t border-border-200/40 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DrillRow,
          {
            label: "patterns",
            desc: tx("Pattern-specific permission rules for this tool.", "该工具按 pattern 细分的权限规则。", lang),
            preview: previewValue(current, lang),
            onClick: () => enter({ id: `permission-patterns:${tool}`, title: `${tool}.patterns` })
          }
        ) })
      ] }, tool);
    }),
    !globalMode && customTools.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GroupHeader, { text: tx("Custom tools", "自定义工具", lang), count: customTools.length }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: customTools.map((tool) => {
        const current = record[tool];
        const isPatternMap = isRecord(current);
        const simple = typeof current === "string" ? current : "";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border-200/40 bg-bg-000/30 p-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-mono text-[length:var(--fs-sm)] text-text-200", children: tool }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-500", children: tx("Custom tool permission key.", "自定义工具权限 key。", lang) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-32 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Select,
              {
                value: isPatternMap ? "__pattern__" : simple,
                options: [...enumChoices(PERMISSION_ACTIONS), { value: "__pattern__", label: tx("by pattern…", "按 pattern…", lang) }],
                onChange: (next) => {
                  if (next === "__pattern__") onChange({ ...record, [tool]: isPatternMap ? current : { "*": "ask" } });
                  else onChange({ ...record, [tool]: next });
                }
              }
            ) })
          ] }),
          isPatternMap && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 border-t border-border-200/40 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            DrillRow,
            {
              label: "patterns",
              desc: tx("Pattern-specific permission rules for this custom tool.", "该自定义工具按 pattern 细分的权限规则。", lang),
              preview: previewValue(current, lang),
              onClick: () => enter({ id: `permission-patterns:${tool}`, title: `${tool}.patterns` })
            }
          ) })
        ] }, tool);
      }) })
    ] }),
    !globalMode && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 pt-2 sm:flex-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: newTool, onChange: (event) => setNewTool(event.target.value), placeholder: tx("custom tool key", "自定义工具 key", lang), className: `${fieldClass} min-w-0 flex-1 font-mono` }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: !newTool.trim() || newTool in record,
          onClick: () => {
            onChange({ ...record, [newTool.trim()]: "ask" });
            setNewTool("");
          },
          className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-2 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100 disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13 }),
            tx("Add", "添加", lang)
          ]
        }
      )
    ] })
  ] });
}
function PatternRules({ value, onChange, lang }) {
  const [newPattern, setNewPattern] = reactExports.useState("");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    Object.entries(value).map(([pattern, action]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `${fieldClass} min-w-0 flex-1 truncate font-mono text-text-300`, children: pattern }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-28 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: action, options: enumChoices(PERMISSION_ACTIONS), onChange: (next) => onChange({ ...value, [pattern]: next }) }) })
    ] }, pattern)),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: newPattern, onChange: (event) => setNewPattern(event.target.value), placeholder: tx("pattern, e.g. git push *", "pattern，如 git push *", lang), className: `${fieldClass} min-w-0 flex-1 font-mono` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled: !newPattern.trim(), onClick: () => {
        onChange({ ...value, [newPattern.trim()]: "ask" });
        setNewPattern("");
      }, className: "rounded-lg border border-border-200/60 px-2.5 text-text-300 hover:bg-bg-100 disabled:opacity-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 14 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] leading-relaxed text-text-500", children: tx("Existing pattern keys cannot be reliably deleted or renamed through the official merge API. Change the action instead.", "官方 merge API 不能可靠删除或重命名已保存的 pattern key。请修改动作。", lang) })
  ] });
}
function PermissionsSection({ config, setConfig, lang }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionShell, { id: "permissions", lang, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-[length:var(--fs-xs)] leading-relaxed text-text-400", children: tx(
      'ask = prompt every time, allow = run without asking, deny = block. Pattern rules let you match specific commands or paths (e.g. "git push *").',
      'ask = 每次询问，allow = 直接放行，deny = 拒绝。pattern 规则可匹配具体命令或路径（如 "git push *"）。',
      lang
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PermissionEditor, { value: config.permission, onChange: (v) => setConfig(setRoot(config, "permission", v)), lang })
  ] });
}
function ToolToggleMap({ value, onChange }) {
  const lang = useLang();
  const record = isRecord(value) ? value : {};
  const [newKey, setNewKey] = reactExports.useState("");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    Object.entries(record).map(([tool, enabled]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate font-mono text-[length:var(--fs-sm)] text-text-200", children: tool }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { enabled: Boolean(enabled), onChange: () => onChange({ ...record, [tool]: !enabled }) })
    ] }, tool)),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: newKey, onChange: (event) => setNewKey(event.target.value), placeholder: "tool name", className: `${fieldClass} min-w-0 flex-1 font-mono` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled: !newKey.trim(), onClick: () => {
        onChange({ ...record, [newKey.trim()]: true });
        setNewKey("");
      }, className: "rounded-lg border border-border-200/60 px-2.5 text-text-300 hover:bg-bg-100 disabled:opacity-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 14 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] leading-relaxed text-text-500", children: tx("Existing tool keys cannot be reliably deleted through the official merge API. Toggle them instead.", "官方 merge API 不能可靠删除已保存的 tool key。请改为切换启用状态。", lang) })
  ] });
}
function buildAgentConfigFields({
  value,
  setField,
  lang,
  models
}) {
  return [
    { key: "description", label: "description", desc: tx("Description of when to use the agent.", "何时使用该 agent 的说明。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: value.description, onChange: (v) => setField("description", v) }) },
    { key: "mode", label: "mode", desc: tx("Agent mode: 'primary', 'subagent' or 'all'.", "agent 模式：primary、subagent 或 all。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: value.mode, options: enumChoices(["primary", "subagent", "all"]), onChange: (v) => setField("mode", v) }) },
    { key: "model", label: "model", desc: tx("Model used by this agent.", "该 agent 使用的模型。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { editable: true, value: value.model, options: models, onChange: (v) => setField("model", v) }) },
    { key: "variant", label: "variant", desc: tx("Default model variant (only with the agent's configured model).", "默认模型 variant（仅对该 agent 配置的模型生效）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: value.variant, onChange: (v) => setField("variant", v) }) },
    { key: "prompt", label: "prompt", block: true, desc: tx("System prompt override for this agent.", "该 agent 的系统提示词覆盖。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextArea, { value: value.prompt, onChange: (v) => setField("prompt", v) }) },
    { key: "temperature", label: "temperature", desc: tx("Sampling temperature.", "采样温度。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(NumberField, { value: value.temperature, onChange: (v) => setField("temperature", v) }) },
    { key: "top_p", label: "top_p", desc: tx("Nucleus sampling top_p.", "top_p 核采样。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(NumberField, { value: value.top_p, onChange: (v) => setField("top_p", v) }) },
    { key: "steps", label: "steps", desc: tx("Max agentic iterations before forcing a text-only response.", "强制结束前的最大迭代步数。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: value.steps, onChange: (v) => setField("steps", v) }) },
    { key: "maxSteps", label: "maxSteps", badge: tx("deprecated", "已废弃", lang), desc: tx("Deprecated. Use 'steps' instead.", "已废弃，请改用 'steps'。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: value.maxSteps, onChange: (v) => setField("maxSteps", v) }) },
    { key: "color", label: "color", desc: tx("Hex color (#RRGGBB) or a theme color name.", "十六进制颜色（#RRGGBB）或主题色名。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { editable: true, value: value.color, options: enumChoices(["primary", "secondary", "accent", "success", "warning", "error", "info"]), onChange: (v) => setField("color", v) }) },
    { key: "hidden", label: "hidden", desc: tx("Hide this subagent from the @ autocomplete menu.", "在 @ 自动补全菜单中隐藏该子 agent。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: value.hidden, onChange: (v) => setField("hidden", v) }) },
    { key: "disable", label: "disable", desc: tx("Disable this agent entirely.", "完全禁用该 agent。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: value.disable, onChange: (v) => setField("disable", v) }) },
    { key: "permission", label: "permission", desc: tx("Per-agent tool permissions (overrides global).", "该 agent 的工具权限（覆盖全局）。", lang), drill: { title: "permission", preview: previewValue(value.permission, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(PermissionEditor, { value: value.permission, onChange: (v) => setField("permission", v), lang }) } },
    { key: "tools", label: "tools", badge: tx("deprecated", "已废弃", lang), desc: tx("Deprecated. Use 'permission' instead.", "已废弃，请改用 'permission'。", lang), drill: { title: "tools", preview: previewValue(value.tools, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(ToolToggleMap, { value: value.tools, onChange: (v) => setField("tools", v) }) } },
    { key: "options", label: "options", desc: tx("Provider-specific agent options.", "渠道相关的 agent 选项。", lang), drill: { title: "options", preview: previewValue(value.options, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueField, { value: value.options, onChange: (v) => setField("options", v) }) } }
  ];
}
function AgentsSection(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "agents", lang: props.lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(AgentsHome, { ...props }) });
}
function AgentsHome({ config, setConfig, lang, models }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const builtins = ["build", "plan", "general", "explore", "title", "summary", "compaction"];
  const map = getObject(config, "agent");
  const names = Array.from(/* @__PURE__ */ new Set([...Object.keys(map)])).sort();
  const selected = activeChildId?.startsWith("agent:") ? activeChildId.slice("agent:".length) : "";
  const item = getObject(config, "agent")[selected];
  const value = isRecord(item) ? item : {};
  const set = (next) => setConfig(setNested(config, ["agent", selected], next));
  const setField = (key, v) => set({ ...value, [key]: v });
  const fields = selected ? buildAgentConfigFields({ value, setField, lang, models }) : [];
  if (selected) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in value, lang }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    NamedDrillList,
    {
      lang,
      items: names,
      addPlaceholder: tx("agent name", "agent 名称", lang),
      onOpen: (name) => enter({ id: `agent:${name}`, title: name }),
      onAdd: (name) => setConfig(setNested(config, ["agent", name], {})),
      builtins,
      renderPreview: (name) => isRecord(map[name]) ? String(map[name].description ?? "") : "",
      emptyText: tx("Add an agent name (e.g. build) to override it.", "添加一个 agent 名称（如 build）即可覆盖。", lang)
    }
  );
}
function McpSection(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "mcp", lang: props.lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(McpHome, { ...props }) });
}
function McpHome({ config, setConfig, lang }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const map = getObject(config, "mcp");
  const names = Object.keys(map).sort();
  const selected = activeChildId?.startsWith("mcp:") ? activeChildId.slice("mcp:".length) : "";
  if (selected) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(McpDetail, { config, setConfig, lang, name: selected }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    NamedDrillList,
    {
      lang,
      items: names,
      addPlaceholder: tx("server name", "服务名", lang),
      onOpen: (name) => enter({ id: `mcp:${name}`, title: name }),
      onAdd: (name) => setConfig(setNested(config, ["mcp", name], { type: "local", command: [] })),
      renderPreview: (name) => {
        const entry = isRecord(map[name]) ? map[name] : {};
        return String(entry.type ?? ("enabled" in entry ? "enabled-only" : "local"));
      },
      emptyText: tx("Add an MCP server to configure it.", "添加一个 MCP 服务进行配置。", lang)
    }
  );
}
function McpDetail({ config, setConfig, lang, name }) {
  const item = getObject(config, "mcp")[name];
  const value = isRecord(item) ? item : {};
  const set = (next) => setConfig(setNested(config, ["mcp", name], next));
  const type = value.type === "remote" ? "remote" : value.type === "local" ? "local" : "enabled-only";
  const oauth = isRecord(value.oauth) ? value.oauth : {};
  const fields = [
    {
      key: "type",
      label: "type",
      desc: tx("Local runs a command; remote connects to a URL; enabled-only only toggles a built-in/default server.", "local 运行命令；remote 连接 URL；enabled-only 只切换内置/默认服务启用状态。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Select,
        {
          value: type,
          options: [
            { value: "local", label: tx("local (command)", "local（命令）", lang) },
            { value: "remote", label: tx("remote (url)", "remote（URL）", lang) },
            { value: "enabled-only", label: tx("enabled-only", "仅启用状态", lang) }
          ],
          onChange: (next) => {
            if (next === "remote") set({ type: "remote", url: "" });
            else if (next === "local") set({ type: "local", command: [] });
            else set({ enabled: true });
          }
        }
      )
    },
    ...type === "enabled-only" ? [] : type === "local" ? [
      { key: "command", label: "command", badge: tx("required", "必填", lang), block: true, desc: tx("Command and arguments, one per line.", "命令和参数，每行一个。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: value.command, onChange: (v) => set({ ...value, command: v }), mono: true, placeholder: "npx" }) },
      { key: "environment", label: "environment", desc: tx("Environment variables for the server process.", "服务进程的环境变量。", lang), drill: { title: "environment", preview: previewValue(value.environment, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(StringMapField, { value: value.environment, onChange: (v) => set({ ...value, environment: v }) }) } }
    ] : [
      { key: "url", label: "url", badge: tx("required", "必填", lang), desc: tx("URL of the remote MCP server.", "远程 MCP 服务的 URL。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: value.url, onChange: (v) => set({ ...value, url: v }), mono: true }) },
      { key: "headers", label: "headers", desc: tx("Headers sent with the request.", "请求携带的 headers。", lang), drill: { title: "headers", preview: previewValue(value.headers, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(StringMapField, { value: value.headers, onChange: (v) => set({ ...value, headers: v }) }) } },
      {
        key: "oauth",
        label: "oauth",
        desc: tx("OAuth config, or disable auto-detection.", "OAuth 配置，或关闭自动检测。", lang),
        drill: {
          title: "oauth",
          preview: value.oauth === false ? "false" : previewValue(value.oauth, lang),
          render: () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Select,
              {
                value: value.oauth === false ? "false" : "object",
                options: [
                  { value: "object", label: tx("configure OAuth", "配置 OAuth", lang) },
                  { value: "false", label: tx("disable (false)", "禁用（false）", lang) }
                ],
                onChange: (next) => set({ ...value, oauth: next === "false" ? false : {} })
              }
            ),
            value.oauth !== false && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 rounded-lg border border-border-200/40 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: oauth.clientId, onChange: (v) => set({ ...value, oauth: { ...oauth, clientId: v } }), placeholder: "clientId", mono: true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: oauth.clientSecret, onChange: (v) => set({ ...value, oauth: { ...oauth, clientSecret: v } }), placeholder: "clientSecret", mono: true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: oauth.scope, onChange: (v) => set({ ...value, oauth: { ...oauth, scope: v } }), placeholder: "scope" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(PortField, { value: oauth.callbackPort, onChange: (v) => set({ ...value, oauth: { ...oauth, callbackPort: v } }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: oauth.redirectUri, onChange: (v) => set({ ...value, oauth: { ...oauth, redirectUri: v } }), placeholder: "redirectUri", mono: true })
            ] })
          ] })
        }
      }
    ],
    { key: "enabled", label: "enabled", desc: tx("Enable or disable this server on startup.", "启动时启用或禁用该服务。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: value.enabled !== false, onChange: (v) => set({ ...value, enabled: v }) }) },
    ...type === "enabled-only" ? [] : [{ key: "timeout", label: "timeout", desc: tx("Request timeout in ms (default 5000).", "请求超时（毫秒，默认 5000）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: value.timeout, onChange: (v) => set({ ...value, timeout: v }) }) }]
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in value, lang });
}
function FormatterSection(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "formatters", lang: props.lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(FormatterHome, { ...props }) });
}
function FormatterHome({ config, setConfig, lang }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const value = config.formatter;
  const mode = typeof value === "boolean" ? value ? "on" : "off" : isRecord(value) ? "custom" : "unset";
  const record = isRecord(value) ? value : {};
  const names = Object.keys(record);
  const selected = activeChildId?.startsWith("formatter:") ? activeChildId.slice("formatter:".length) : "";
  if (selected) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(FormatterEntry, { config, setConfig, lang, name: selected }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FieldRow,
      {
        label: "formatter",
        desc: tx("Off disables all; On enables built-ins; Custom overrides entries.", "Off 全部禁用；On 启用内置；Custom 覆盖单个配置。", lang),
        control: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            value: mode,
            options: [
              ...mode === "unset" ? [{ value: "unset", label: tx("not set", "未设置", lang) }] : [],
              { value: "on", label: tx("on (built-ins)", "on（启用内置）", lang) },
              { value: "off", label: tx("off (disabled)", "off（禁用）", lang) },
              { value: "custom", label: tx("custom entries", "自定义条目", lang) }
            ],
            onChange: (next) => {
              if (next === "on") setConfig(setRoot(config, "formatter", true));
              else if (next === "off") setConfig(setRoot(config, "formatter", false));
              else if (next === "custom") setConfig(setRoot(config, "formatter", isRecord(value) ? value : {}));
            }
          }
        )
      }
    ),
    mode === "custom" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      NamedDrillList,
      {
        lang,
        items: names,
        addPlaceholder: tx("formatter name", "格式化器名", lang),
        onOpen: (name) => enter({ id: `formatter:${name}`, title: name }),
        onAdd: (name) => setConfig(setNested(config, ["formatter", name], {})),
        emptyText: tx("Add a formatter entry.", "添加一个格式化器配置。", lang)
      }
    )
  ] });
}
function FormatterEntry({ config, setConfig, lang, name }) {
  const record = getObject(config, "formatter");
  const entry = isRecord(record[name]) ? record[name] : {};
  const setEntry = (next) => setConfig(setNested(config, ["formatter", name], next));
  const fields = [
    { key: "command", label: "command", block: true, desc: tx("Command and args to run the formatter.", "运行格式化器的命令和参数。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: entry.command, onChange: (v) => setEntry({ ...entry, command: v }), mono: true }) },
    { key: "extensions", label: "extensions", block: true, desc: tx("File extensions this formatter handles.", "该格式化器处理的文件扩展名。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: entry.extensions, onChange: (v) => setEntry({ ...entry, extensions: v }), mono: true, placeholder: ".ts" }) },
    { key: "environment", label: "environment", desc: tx("Environment variables for the formatter.", "格式化器的环境变量。", lang), drill: { title: "environment", preview: previewValue(entry.environment, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(StringMapField, { value: entry.environment, onChange: (v) => setEntry({ ...entry, environment: v }) }) } },
    { key: "disabled", label: "disabled", desc: tx("Disable this formatter.", "禁用该格式化器。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: entry.disabled, onChange: (v) => setEntry({ ...entry, disabled: v }) }) }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in entry, lang });
}
function LspSection(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "lsp", lang: props.lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(LspHome, { ...props }) });
}
function LspHome({ config, setConfig, lang }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const value = config.lsp;
  const mode = typeof value === "boolean" ? value ? "on" : "off" : isRecord(value) ? "custom" : "unset";
  const record = isRecord(value) ? value : {};
  const names = Object.keys(record);
  const selected = activeChildId?.startsWith("lsp:") ? activeChildId.slice("lsp:".length) : "";
  if (selected) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(LspEntry, { config, setConfig, lang, name: selected }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FieldRow,
      {
        label: "lsp",
        desc: tx("Off disables all; On enables built-ins; Custom defines servers.", "Off 全部禁用；On 启用内置；Custom 自定义服务器。", lang),
        control: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            value: mode,
            options: [
              ...mode === "unset" ? [{ value: "unset", label: tx("not set", "未设置", lang) }] : [],
              { value: "on", label: tx("on (built-ins)", "on（启用内置）", lang) },
              { value: "off", label: tx("off (disabled)", "off（禁用）", lang) },
              { value: "custom", label: tx("custom servers", "自定义服务器", lang) }
            ],
            onChange: (next) => {
              if (next === "on") setConfig(setRoot(config, "lsp", true));
              else if (next === "off") setConfig(setRoot(config, "lsp", false));
              else if (next === "custom") setConfig(setRoot(config, "lsp", isRecord(value) ? value : {}));
            }
          }
        )
      }
    ),
    mode === "custom" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      NamedDrillList,
      {
        lang,
        items: names,
        addPlaceholder: tx("lsp name", "LSP 名", lang),
        onOpen: (name) => enter({ id: `lsp:${name}`, title: name }),
        onAdd: (name) => setConfig(setNested(config, ["lsp", name], { command: [] })),
        emptyText: tx("Add an LSP server.", "添加一个 LSP 服务器。", lang)
      }
    )
  ] });
}
function LspEntry({ config, setConfig, lang, name }) {
  const record = getObject(config, "lsp");
  const entry = isRecord(record[name]) ? record[name] : {};
  const setEntry = (next) => setConfig(setNested(config, ["lsp", name], next));
  const entryMode = entry.disabled === true && !("command" in entry) ? "disabled-only" : "custom";
  if (entryMode === "disabled-only") {
    const fields2 = [
      {
        key: "mode",
        label: "mode",
        desc: tx("LSP entry shape. disabled-only writes exactly { disabled: true }.", "LSP 条目形态。disabled-only 只写 { disabled: true }。", lang),
        control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: "disabled-only", options: [{ value: "disabled-only", label: tx("disabled-only", "仅禁用", lang) }, { value: "custom", label: tx("custom command", "自定义命令", lang) }], onChange: (v) => setEntry(v === "disabled-only" ? { disabled: true } : { disabled: false, command: [] }) })
      }
    ];
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields: fields2, isConfigured: () => true, lang });
  }
  const fields = [
    {
      key: "mode",
      label: "mode",
      desc: tx("LSP entry shape. custom command requires command.", "LSP 条目形态。custom command 必须配置 command。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: "custom", options: [{ value: "disabled-only", label: tx("disabled-only", "仅禁用", lang) }, { value: "custom", label: tx("custom command", "自定义命令", lang) }], onChange: (v) => setEntry(v === "disabled-only" ? { disabled: true } : { disabled: false, command: [] }) })
    },
    { key: "command", label: "command", badge: tx("required", "必填", lang), block: true, desc: tx("Command and args to start the LSP.", "启动 LSP 的命令和参数。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: entry.command, onChange: (v) => setEntry({ ...entry, command: v }), mono: true }) },
    { key: "extensions", label: "extensions", block: true, desc: tx("File extensions handled by this LSP.", "该 LSP 处理的文件扩展名。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: entry.extensions, onChange: (v) => setEntry({ ...entry, extensions: v }), mono: true, placeholder: ".ts" }) },
    { key: "env", label: "env", desc: tx("Environment variables for the LSP.", "LSP 的环境变量。", lang), drill: { title: "env", preview: previewValue(entry.env, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(StringMapField, { value: entry.env, onChange: (v) => setEntry({ ...entry, env: v }) }) } },
    { key: "initialization", label: "initialization", desc: tx("LSP initialization options object.", "LSP 初始化选项对象。", lang), drill: { title: "initialization", preview: previewValue(entry.initialization, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueField, { value: entry.initialization, onChange: (v) => setEntry({ ...entry, initialization: v }) }) } },
    { key: "disabled", label: "disabled", desc: tx("Disable this LSP server.", "禁用该 LSP 服务器。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: entry.disabled, onChange: (v) => setEntry({ ...entry, disabled: v }) }) }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in entry, lang });
}
function ProvidersSection({ config, setConfig, lang, providerCatalog }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "providers", lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ProvidersHome, { config, setConfig, lang, providerCatalog }) });
}
function ProvidersHome({ config, setConfig, lang, providerCatalog }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const providerMap = getObject(config, "provider");
  const configured = Object.keys(providerMap).sort();
  const available = Object.keys(providerCatalog).filter((id) => !(id in providerMap)).sort();
  const [newProvider, setNewProvider] = reactExports.useState("");
  const [availQuery, setAvailQuery] = reactExports.useState("");
  const openProvider = (id) => enter({ id: `provider:${id}`, title: id });
  const addProvider = (id) => {
    if (!id || id in providerMap) return;
    setConfig(setNested(config, ["provider", id], {}));
    openProvider(id);
  };
  if (activeChildId?.startsWith("provider:")) {
    const id = activeChildId.slice("provider:".length);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ProviderDetail, { config, setConfig, lang, providerCatalog, providerId: id }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GroupHeader, { text: tx("Configured", "已配置", lang), count: configured.length, accent: true }),
      configured.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: tx("No custom providers. Add one below or pick from Available.", "没有自定义渠道。可在下方添加，或从可配置里选。", lang) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 px-3.5", children: configured.map((id) => {
        const pv = getObject(providerMap, id);
        const modelCount = Object.keys(getObject(pv, "models")).length;
        return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "group flex items-center gap-2 border-b border-border-200/35 last:border-b-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => openProvider(id), className: "flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate font-mono text-[length:var(--fs-sm)] font-medium text-text-100", children: id }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "max-w-[45%] shrink-0 truncate text-[length:var(--fs-xs)] text-text-500", children: modelCount > 0 ? tx(`${modelCount} model override(s)`, `${modelCount} 个模型覆盖`, lang) : tx("provider config", "渠道配置", lang) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 15, className: "shrink-0 text-text-500 transition-transform group-hover:translate-x-0.5" })
        ] }) }, id);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex min-w-0 gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: newProvider,
            onChange: (event) => setNewProvider(event.target.value),
            placeholder: tx("custom provider id", "自定义渠道 id", lang),
            onKeyDown: (event) => {
              if (event.key === "Enter") {
                addProvider(newProvider.trim());
                setNewProvider("");
              }
            },
            className: `${fieldClass} min-w-0 flex-1 font-mono`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            disabled: !newProvider.trim() || newProvider.trim() in providerMap,
            onClick: () => {
              addProvider(newProvider.trim());
              setNewProvider("");
            },
            className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100 disabled:opacity-40",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 14 }),
              tx("Add", "添加", lang)
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-[length:var(--fs-xs)] leading-relaxed text-text-500", children: tx("Provider keys cannot be reliably deleted through the official merge API. Use enabled_providers/disabled_providers when you need to control availability.", "官方 merge API 不能可靠删除已保存的 provider key。需要控制可用性时请使用 enabled_providers/disabled_providers。", lang) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GroupHeader, { text: tx("Available", "可配置", lang), count: available.length }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: availQuery,
          onChange: (event) => setAvailQuery(event.target.value),
          placeholder: tx("search providers…", "搜索渠道…", lang),
          className: `${fieldClass} mb-2`
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-72 space-y-1 overflow-y-auto custom-scrollbar rounded-xl border border-border-200/45 bg-bg-000/15 p-1.5", children: available.filter((id) => !availQuery || id.toLowerCase().includes(availQuery.toLowerCase())).slice(0, 80).map((id) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => addProvider(id), className: "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-bg-100", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate font-mono text-[length:var(--fs-sm)] text-text-300", children: id }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13, className: "shrink-0 text-text-500" })
      ] }, id)) })
    ] })
  ] });
}
function ProviderDetail({
  config,
  setConfig,
  lang,
  providerCatalog,
  providerId
}) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const drill = useDrillState();
  const providerMap = getObject(config, "provider");
  const providerValue = getObject(providerMap, providerId);
  const catalog = getObject(providerCatalog, providerId);
  const configuredModels = getObject(providerValue, "models");
  const catalogModelCount = Object.keys(getObject(catalog, "models")).length;
  const copySuggestion = suggestCopyId(providerId, providerMap);
  const [copySourceId, setCopySourceId] = reactExports.useState(providerId);
  const [copyId, setCopyId] = reactExports.useState(copySuggestion);
  if (copySourceId !== providerId) {
    setCopySourceId(providerId);
    setCopyId(copySuggestion);
  }
  const targetCopyId = copyId.trim();
  const copyIdExists = targetCopyId in providerMap;
  const setProvider = (next) => setConfig(setNested(config, ["provider", providerId], next));
  const duplicateProvider = () => {
    if (!targetCopyId || copyIdExists) return;
    setConfig(setNested(config, ["provider", targetCopyId], clone(providerValue)));
    drill.replace(0, { id: `provider:${targetCopyId}`, title: targetCopyId });
  };
  const fields = [
    { key: "name", label: "name", desc: tx("Display name for this provider.", "此渠道的显示名称。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: providerValue.name, onChange: (v) => setProvider({ ...providerValue, name: v }) }) },
    { key: "npm", label: "npm", desc: tx("npm package implementing the AI SDK provider.", "实现该 AI SDK provider 的 npm 包。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: providerValue.npm, onChange: (v) => setProvider({ ...providerValue, npm: v }), mono: true }) },
    { key: "api", label: "api", desc: tx("API base identifier for this provider.", "该渠道的 API 标识。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: providerValue.api, onChange: (v) => setProvider({ ...providerValue, api: v }), mono: true }) },
    { key: "id", label: "id", desc: tx("Provider id override.", "渠道 id 覆盖。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: providerValue.id, onChange: (v) => setProvider({ ...providerValue, id: v }), mono: true }) },
    { key: "env", label: "env", desc: tx("Environment variables that hold the API key.", "存放 API key 的环境变量名。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: providerValue.env, onChange: (v) => setProvider({ ...providerValue, env: v }), mono: true }) },
    { key: "whitelist", label: "whitelist", desc: tx("Only expose these models from this provider.", "只暴露该渠道的这些模型。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: providerValue.whitelist, onChange: (v) => setProvider({ ...providerValue, whitelist: v }), mono: true }) },
    { key: "blacklist", label: "blacklist", desc: tx("Hide these models from this provider.", "隐藏该渠道的这些模型。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: providerValue.blacklist, onChange: (v) => setProvider({ ...providerValue, blacklist: v }), mono: true }) },
    { key: "options", label: "options", desc: tx("Connection options (API key, base URL, timeouts, headers).", "连接选项（API key、base URL、超时、请求头）。", lang), drill: { title: "options", preview: previewValue(providerValue.options, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(ProviderOptionsEditor, { value: providerValue.options, onChange: (v) => setProvider({ ...providerValue, options: v }), lang }) } }
  ];
  if (activeChildId === "models") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ProviderModels, { config, setConfig, lang, providerCatalog, providerId }) });
  }
  if (activeChildId) {
    const active = fields.find((field) => field.drill && field.key === activeChildId);
    if (active?.drill) return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: active.drill.render() });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => enter({ id: "models", title: tx("models", "模型", lang) }),
        className: "group flex w-full items-center gap-3 rounded-xl border border-border-200/55 bg-bg-050/55 px-3.5 py-3 text-left transition-colors hover:bg-bg-100/50",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[length:var(--fs-sm)] font-medium text-text-100", children: "models" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[length:var(--fs-xs)] text-text-400", children: tx(
              `${Object.keys(configuredModels).length} configured / ${catalogModelCount} available`,
              `已配置 ${Object.keys(configuredModels).length} 个 / 可选 ${catalogModelCount} 个`,
              lang
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 16, className: "shrink-0 text-text-500 transition-transform group-hover:translate-x-0.5" })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/20 p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex min-w-0 items-start gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CopyIcon, { size: 14, className: "mt-0.5 shrink-0 text-text-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] font-medium text-text-100", children: tx("Copy provider", "复制渠道", lang) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[length:var(--fs-xs)] leading-relaxed text-text-500", children: tx("Create a provider copy under a new id, then edit it independently before saving.", "用新的 id 创建当前渠道副本，然后独立修改并保存。", lang) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: copyId,
            onChange: (event) => setCopyId(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Enter") duplicateProvider();
            },
            placeholder: tx("new provider id", "新渠道 id", lang),
            className: `${fieldClass} min-w-0 flex-1 font-mono`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            disabled: !targetCopyId || copyIdExists,
            onClick: duplicateProvider,
            className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100 disabled:opacity-40",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CopyIcon, { size: 13 }),
              tx("Copy", "复制", lang)
            ]
          }
        )
      ] }),
      copyIdExists && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[length:var(--fs-xs)] text-warning-100", children: tx("This provider id already exists.", "这个渠道 id 已存在。", lang) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GroupedFields,
      {
        fields,
        isConfigured: (key) => key in providerValue,
        lang,
        onEnter: (field) => field.drill && enter({ id: field.key, title: field.drill.title })
      }
    )
  ] });
}
function ProviderModels({
  config,
  setConfig,
  lang,
  providerCatalog,
  providerId
}) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const providerMap = getObject(config, "provider");
  const providerValue = getObject(providerMap, providerId);
  const catalog = getObject(providerCatalog, providerId);
  const configuredModels = getObject(providerValue, "models");
  const catalogModels = getObject(catalog, "models");
  const modelIDs = Array.from(/* @__PURE__ */ new Set([...Object.keys(configuredModels), ...Object.keys(catalogModels)])).sort();
  const [newModel, setNewModel] = reactExports.useState("");
  const [query, setQuery] = reactExports.useState("");
  const openModel = (id) => enter({ id: `model:${id}`, title: id });
  const addModel = (id) => {
    if (!id) return;
    setConfig(setNested(config, ["provider", providerId, "models", id], {}));
    openModel(id);
  };
  if (activeChildId?.startsWith("model:")) {
    const id = activeChildId.slice("model:".length);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      ModelEditor,
      {
        value: isRecord(configuredModels[id]) ? configuredModels[id] : {},
        onChange: (next) => setConfig(setNested(config, ["provider", providerId, "models", id], next)),
        lang
      }
    ) });
  }
  const filtered = modelIDs.filter((id) => !query || id.toLowerCase().includes(query.toLowerCase()));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: tx("search models…", "搜索模型…", lang), className: fieldClass }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-[440px] space-y-1 overflow-y-auto custom-scrollbar rounded-xl border border-border-200/45 bg-bg-000/20 p-1.5", children: [
      filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: tx("No models. Add one below.", "没有模型，可在下方添加。", lang) }),
      filtered.map((id) => {
        const isConfigured = id in configuredModels;
        return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "group flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => openModel(id), className: "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-bg-100", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate font-mono text-[length:var(--fs-sm)] text-text-200", children: id }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase ${isConfigured ? "bg-accent-main-100/12 text-accent-main-100" : "text-text-500"}`, children: isConfigured ? tx("configured", "已配置", lang) : tx("available", "可配置", lang) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 14, className: "shrink-0 text-text-500 transition-transform group-hover:translate-x-0.5" })
        ] }) }, id);
      })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: newModel,
          onChange: (event) => setNewModel(event.target.value),
          placeholder: tx("new model id", "新模型 id", lang),
          onKeyDown: (event) => {
            if (event.key === "Enter") {
              addModel(newModel.trim());
              setNewModel("");
            }
          },
          className: `${fieldClass} min-w-0 flex-1 font-mono`
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !newModel.trim(), onClick: () => {
        addModel(newModel.trim());
        setNewModel("");
      }, className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100 disabled:opacity-40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 14 }),
        tx("Add", "添加", lang)
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] leading-relaxed text-text-500", children: tx("Model override keys cannot be reliably deleted through the official merge API. Edit fields instead, or Reset before saving newly added model ids.", "官方 merge API 不能可靠删除已保存的模型覆盖 key。请改字段，刚新增的模型 id 可在保存前 Reset。", lang) })
  ] });
}
function ProviderOptionsEditor({ value, onChange, lang }) {
  const rec = isRecord(value) ? value : {};
  const known = ["apiKey", "baseURL", "enterpriseUrl", "setCacheKey", "timeout", "headerTimeout", "chunkTimeout", "headers"];
  const fields = [
    { key: "apiKey", label: "apiKey", desc: tx("API key for this provider.", "该渠道的 API key。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: rec.apiKey, onChange: (v) => onChange({ ...rec, apiKey: v }), mono: true }) },
    { key: "baseURL", label: "baseURL", desc: tx("Custom API base URL.", "自定义 API base URL。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: rec.baseURL, onChange: (v) => onChange({ ...rec, baseURL: v }), mono: true }) },
    { key: "enterpriseUrl", label: "enterpriseUrl", desc: tx("GitHub Enterprise URL for copilot auth.", "用于 copilot 认证的 GitHub Enterprise URL。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: rec.enterpriseUrl, onChange: (v) => onChange({ ...rec, enterpriseUrl: v }), mono: true }) },
    { key: "setCacheKey", label: "setCacheKey", desc: tx("Enable promptCacheKey for this provider (default false).", "为该渠道启用 promptCacheKey（默认 false）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: rec.setCacheKey, onChange: (v) => onChange({ ...rec, setCacheKey: v }) }) },
    { key: "timeout", label: "timeout", desc: tx("Request timeout in ms. Set false to disable timeout.", "整个请求的超时（毫秒）。设为 false 可禁用超时。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(NumberOrFalseField, { value: rec.timeout, onChange: (v) => onChange({ ...rec, timeout: v }) }) },
    { key: "headerTimeout", label: "headerTimeout", desc: tx("Timeout in ms waiting for response headers. Set false to disable timeout.", "等待响应头的超时（毫秒）。设为 false 可禁用超时。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(NumberOrFalseField, { value: rec.headerTimeout, onChange: (v) => onChange({ ...rec, headerTimeout: v }) }) },
    { key: "chunkTimeout", label: "chunkTimeout", desc: tx("Timeout in ms between streamed SSE chunks.", "SSE 流式分块之间的超时（毫秒）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: rec.chunkTimeout, onChange: (v) => onChange({ ...rec, chunkTimeout: v }) }) },
    { key: "headers", label: "headers", desc: tx("Extra HTTP headers sent to the provider.", "发送给渠道的额外 HTTP 请求头。", lang), drill: { title: "headers", preview: previewValue(rec.headers, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(StringMapField, { value: rec.headers, onChange: (v) => onChange({ ...rec, headers: v }) }) } }
  ];
  const extra = Object.keys(rec).filter((key) => !known.includes(key));
  const knownPart = Object.fromEntries(Object.entries(rec).filter(([key]) => known.includes(key)));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in rec, lang }),
    extra.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      FieldRow,
      {
        label: tx("other options", "其他选项", lang),
        block: true,
        control: /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueField, { value: Object.fromEntries(extra.map((k) => [k, rec[k]])), onChange: (next) => onChange({ ...knownPart, ...next }) })
      }
    )
  ] });
}
function ModelEditor({ value, onChange, lang }) {
  const cost = getObject(value, "cost");
  const contextOver200k = getObject(cost, "context_over_200k");
  const limit = getObject(value, "limit");
  const modalities = getObject(value, "modalities");
  const costMissing = ["input", "output"].filter((key) => cost[key] === void 0);
  const contextOverMissing = Object.keys(contextOver200k).length > 0 ? ["input", "output"].filter((key) => contextOver200k[key] === void 0) : [];
  const limitMissing = ["context", "output"].filter((key) => limit[key] === void 0);
  const set = (key, v) => onChange({ ...value, [key]: v });
  const fields = [
    { key: "id", label: "id", desc: tx("Provider-native model id override.", "渠道原生模型 id 覆盖。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: value.id, onChange: (v) => set("id", v), mono: true }) },
    { key: "name", label: "name", desc: tx("Display name for the model.", "模型显示名。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: value.name, onChange: (v) => set("name", v) }) },
    { key: "family", label: "family", desc: tx("Model family/series.", "模型系列。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: value.family, onChange: (v) => set("family", v) }) },
    { key: "release_date", label: "release_date", desc: tx("Release date (YYYY-MM-DD).", "发布日期（YYYY-MM-DD）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: value.release_date, onChange: (v) => set("release_date", v), placeholder: "2025-01-01" }) },
    { key: "attachment", label: "attachment", desc: tx("Model supports file attachments.", "模型支持文件附件。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: value.attachment, onChange: (v) => set("attachment", v) }) },
    { key: "reasoning", label: "reasoning", desc: tx("Model supports reasoning / thinking.", "模型支持推理/思考。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: value.reasoning, onChange: (v) => set("reasoning", v) }) },
    { key: "temperature", label: "temperature", desc: tx("Model supports a temperature parameter.", "模型支持 temperature 参数。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: value.temperature, onChange: (v) => set("temperature", v) }) },
    { key: "tool_call", label: "tool_call", desc: tx("Model supports tool/function calling.", "模型支持工具/函数调用。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: value.tool_call, onChange: (v) => set("tool_call", v) }) },
    { key: "experimental", label: "experimental", desc: tx("Mark this model as experimental.", "标记为实验性模型。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: value.experimental, onChange: (v) => set("experimental", v) }) },
    { key: "status", label: "status", desc: tx("Lifecycle status.", "生命周期状态。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: value.status, options: enumChoices(MODEL_STATUS), onChange: (v) => set("status", v) }) },
    {
      key: "cost",
      label: "cost",
      block: true,
      desc: tx("Token costs (per 1M tokens).", "token 费用（每百万 token）。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        costMissing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-warning-100/30 bg-warning-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-warning-100", children: tx(`Required: ${costMissing.join(", ")}`, `必填：${costMissing.join(", ")}`, lang) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", children: ["input", "output", "cache_read", "cache_write"].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-[length:var(--fs-xs)] text-text-500", children: [
          k,
          /* @__PURE__ */ jsxRuntimeExports.jsx(NumberField, { value: cost[k], onChange: (v) => onChange({ ...value, cost: { ...cost, [k]: v } }) })
        ] }, k)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border-200/40 p-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 text-[length:var(--fs-xs)] font-medium text-text-400", children: "context_over_200k" }),
          contextOverMissing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 rounded-lg border border-warning-100/30 bg-warning-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-warning-100", children: tx(`Required when used: ${contextOverMissing.join(", ")}`, `使用时必填：${contextOverMissing.join(", ")}`, lang) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", children: ["input", "output", "cache_read", "cache_write"].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-[length:var(--fs-xs)] text-text-500", children: [
            k,
            /* @__PURE__ */ jsxRuntimeExports.jsx(NumberField, { value: contextOver200k[k], onChange: (v) => onChange({ ...value, cost: { ...cost, context_over_200k: { ...contextOver200k, [k]: v } } }) })
          ] }, k)) })
        ] })
      ] })
    },
    {
      key: "limit",
      label: "limit",
      block: true,
      desc: tx("Context / input / output token limits.", "上下文/输入/输出 token 限制。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-3", children: [
        limitMissing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:col-span-3 rounded-lg border border-warning-100/30 bg-warning-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-warning-100", children: tx(`Required: ${limitMissing.join(", ")}`, `必填：${limitMissing.join(", ")}`, lang) }),
        ["context", "input", "output"].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-[length:var(--fs-xs)] text-text-500", children: [
          k,
          /* @__PURE__ */ jsxRuntimeExports.jsx(NumberField, { value: limit[k], onChange: (v) => onChange({ ...value, limit: { ...limit, [k]: v } }) })
        ] }, k))
      ] })
    },
    {
      key: "modalities",
      label: "modalities",
      block: true,
      desc: tx("Supported input/output modalities.", "支持的输入/输出模态。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-500", children: "input" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(MultiToggle, { options: MODALITIES, value: asStringArray(modalities.input), onChange: (v) => onChange({ ...value, modalities: { ...modalities, input: v } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-500", children: "output" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(MultiToggle, { options: MODALITIES, value: asStringArray(modalities.output), onChange: (v) => onChange({ ...value, modalities: { ...modalities, output: v } }) })
      ] })
    },
    {
      key: "interleaved",
      label: "interleaved",
      desc: tx("Interleaved reasoning: true, or pick a reasoning field.", "交错推理：true，或选择 reasoning 字段。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Select,
        {
          value: value.interleaved === true ? "true" : isRecord(value.interleaved) ? String(value.interleaved.field) : "",
          options: [
            { value: "true", label: "true" },
            { value: "reasoning_content", label: "field: reasoning_content" },
            { value: "reasoning_details", label: "field: reasoning_details" }
          ],
          onChange: (v) => set("interleaved", v === "true" ? true : { field: v })
        }
      )
    },
    { key: "provider", label: "provider", desc: tx("Provider implementation override for this model (npm/api).", "该模型的渠道实现覆盖（npm/api）。", lang), drill: { title: "provider", preview: previewValue(value.provider, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(ModelProviderOverride, { value: value.provider, onChange: (v) => set("provider", v), lang }) } },
    { key: "headers", label: "headers", desc: tx("Per-model HTTP headers.", "该模型的 HTTP 请求头。", lang), drill: { title: "headers", preview: previewValue(value.headers, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(StringMapField, { value: value.headers, onChange: (v) => set("headers", v) }) } },
    { key: "options", label: "options", desc: tx("Provider-specific model options.", "渠道相关的模型选项。", lang), drill: { title: "options", preview: previewValue(value.options, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueField, { value: value.options, onChange: (v) => set("options", v) }) } },
    { key: "variants", label: "variants", desc: tx("Variant-specific configuration (for example disabled=true).", "模型 variant 级别配置（例如 disabled=true）。", lang), drill: { title: "variants", preview: previewValue(value.variants, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(ModelVariantsEditor, { value: value.variants, onChange: (v) => set("variants", v), lang }) } }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in value, lang });
}
function ModelProviderOverride({ value, onChange, lang }) {
  const rec = isRecord(value) ? value : {};
  const fields = [
    { key: "npm", label: "npm", desc: tx("Provider npm package override.", "渠道 npm 包覆盖。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: rec.npm, onChange: (v) => onChange({ ...rec, npm: v }), mono: true }) },
    { key: "api", label: "api", desc: tx("Provider API name override.", "渠道 API 名称覆盖。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: rec.api, onChange: (v) => onChange({ ...rec, api: v }), mono: true }) }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in rec, lang });
}
function ModelVariantsEditor({ value, onChange, lang }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const rec = isRecord(value) ? value : {};
  const [newName, setNewName] = reactExports.useState("");
  if (activeChildId?.startsWith("variant:")) {
    const name = activeChildId.slice("variant:".length);
    const variant = getObject(rec, name);
    const fields = [
      { key: "disabled", label: "disabled", desc: tx("Disable this variant for the model.", "禁用该模型的这个 variant。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: variant.disabled, onChange: (v) => onChange({ ...rec, [name]: { ...variant, disabled: v } }) }) }
    ];
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in variant, lang }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    Object.keys(rec).length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: tx("No variants configured.", "还没有配置 variant。", lang) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 px-3.5", children: Object.keys(rec).sort().map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(DrillRow, { label: name, preview: previewValue(rec[name], lang), onClick: () => enter({ id: `variant:${name}`, title: name }) }, name)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: newName, onChange: (event) => setNewName(event.target.value), placeholder: tx("variant name", "variant 名称", lang), className: `${fieldClass} min-w-0 flex-1 font-mono` }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !newName.trim() || newName in rec, onClick: () => {
        onChange({ ...rec, [newName.trim()]: { disabled: false } });
        setNewName("");
      }, className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-2 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100 disabled:opacity-40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13 }),
        tx("Add", "添加", lang)
      ] })
    ] })
  ] });
}
function MultiToggle({ options, value, onChange }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: options.map((option) => {
    const active = value.includes(option);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => onChange(active ? value.filter((v) => v !== option) : [...value, option]),
        className: `rounded-lg border px-2.5 py-1 text-[length:var(--fs-xs)] transition-colors ${active ? "border-accent-main-100/50 bg-accent-main-100/12 text-accent-main-100" : "border-border-200/60 text-text-400 hover:bg-bg-100"}`,
        children: option
      },
      option
    );
  }) });
}
function GeneralSection({ config, setConfig, lang, shells, models, agents }) {
  const root = config;
  const set = (key, value) => setConfig(setRoot(config, key, value));
  const fields = [
    {
      key: "model",
      label: "model",
      desc: tx("Default model, in provider/model format (e.g. anthropic/claude-sonnet-4).", "默认模型，格式 provider/model（如 anthropic/claude-sonnet-4）。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { editable: true, value: root.model, options: models, onChange: (v) => set("model", v), placeholder: "provider/model" })
    },
    {
      key: "small_model",
      label: "small_model",
      desc: tx("Small model for light tasks like title generation.", "用于标题生成等轻量任务的小模型。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { editable: true, value: root.small_model, options: models, onChange: (v) => set("small_model", v), placeholder: "provider/model" })
    },
    {
      key: "default_agent",
      label: "default_agent",
      desc: tx("Primary agent used when none is specified. Falls back to 'build'.", "未指定时使用的主 agent，默认回退到 'build'。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { editable: true, value: root.default_agent, options: agents, onChange: (v) => set("default_agent", v) })
    },
    {
      key: "shell",
      label: "shell",
      desc: tx("Default shell for the terminal and bash tool.", "终端和 bash 工具默认使用的 shell。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { editable: true, value: root.shell, options: shells, onChange: (v) => set("shell", v) })
    },
    {
      key: "username",
      label: "username",
      desc: tx("Custom username shown in conversations instead of the system username.", "对话中显示的自定义用户名，替代系统用户名。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: root.username, onChange: (v) => set("username", v) })
    },
    {
      key: "logLevel",
      label: "logLevel",
      desc: tx("Logging verbosity.", "日志详细程度。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: root.logLevel, options: enumChoices(["DEBUG", "INFO", "WARN", "ERROR"]), onChange: (v) => set("logLevel", v) })
    },
    {
      key: "share",
      label: "share",
      desc: tx("Sharing behavior: 'manual', 'auto', or 'disabled'.", "分享行为：手动 manual、自动 auto 或禁用 disabled。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: root.share, options: enumChoices(["manual", "auto", "disabled"]), onChange: (v) => set("share", v) })
    },
    {
      key: "autoupdate",
      label: "autoupdate",
      desc: tx("Auto-update: true to update, false to disable, 'notify' to only notify.", "自动更新：true 自动更新，false 关闭，'notify' 仅提示。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Select,
        {
          value: typeof root.autoupdate === "boolean" ? String(root.autoupdate) : root.autoupdate,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
            { value: "notify", label: "notify" }
          ],
          onChange: (v) => set("autoupdate", v === "true" ? true : v === "false" ? false : v)
        }
      )
    },
    {
      key: "snapshot",
      label: "snapshot",
      desc: tx("Record filesystem snapshots so changes can be undone/reverted (default: true).", "记录文件系统快照以支持撤销/回退（默认 true）。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: root.snapshot, onChange: (v) => set("snapshot", v) })
    },
    {
      key: "instructions",
      label: "instructions",
      block: true,
      desc: tx("Extra instruction files or glob patterns to include.", "额外要加载的 instruction 文件或通配符。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: root.instructions, onChange: (v) => set("instructions", v), mono: true, placeholder: "AGENTS.md" })
    },
    {
      key: "disabled_providers",
      label: "disabled_providers",
      block: true,
      desc: tx("Providers that are loaded automatically but should be disabled.", "禁用那些会被自动加载的渠道。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: root.disabled_providers, onChange: (v) => set("disabled_providers", v), mono: true })
    },
    {
      key: "enabled_providers",
      label: "enabled_providers",
      block: true,
      desc: tx("When set, ONLY these providers are enabled; all others are ignored.", "设置后只有这些渠道启用，其余全部忽略。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: root.enabled_providers, onChange: (v) => set("enabled_providers", v), mono: true })
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "general", lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => hasRoot(config, key), lang }) });
}
function ServerSection({ config, setConfig, lang }) {
  const server = getObject(config, "server");
  const set = (key, value) => setConfig(setNested(config, ["server", key], value));
  const fields = [
    { key: "port", label: "port", desc: tx("Port to listen on.", "监听端口。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PortField, { value: server.port, onChange: (v) => set("port", v) }) },
    { key: "hostname", label: "hostname", desc: tx("Hostname to listen on.", "监听主机名。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: server.hostname, onChange: (v) => set("hostname", v), placeholder: "127.0.0.1" }) },
    { key: "mdns", label: "mdns", desc: tx("Enable mDNS service discovery.", "启用 mDNS 服务发现。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: server.mdns, onChange: (v) => set("mdns", v) }) },
    { key: "mdnsDomain", label: "mdnsDomain", desc: tx("Custom mDNS domain (default: opencode.local).", "自定义 mDNS 域名（默认 opencode.local）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: server.mdnsDomain, onChange: (v) => set("mdnsDomain", v) }) },
    { key: "cors", label: "cors", desc: tx("Additional domains allowed for CORS.", "额外允许跨域（CORS）的域名。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: server.cors, onChange: (v) => set("cors", v), mono: true }) }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "server", lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => hasNested(config, ["server", key]), lang }) });
}
function CommandsSection(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "commands", lang: props.lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CommandHome, { ...props }) });
}
function CommandHome({ config, setConfig, lang, models, agents }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const map = getObject(config, "command");
  const names = Object.keys(map).sort();
  const selected = activeChildId?.startsWith("command:") ? activeChildId.slice("command:".length) : "";
  const value = getObject(config, "command")[selected];
  const item = isRecord(value) ? value : {};
  const setItem = (next) => setConfig(setNested(config, ["command", selected], next));
  const fields = selected ? [
    { key: "template", label: "template", badge: tx("required", "必填", lang), block: true, desc: tx("Prompt template sent when the command runs. Use $ARGUMENTS for input.", "命令运行时发送的 prompt 模板，可用 $ARGUMENTS 接收输入。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextArea, { value: item.template, onChange: (v) => setItem({ ...item, template: v }) }) },
    { key: "description", label: "description", desc: tx("Short description shown in the command menu.", "命令菜单中显示的简短描述。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: item.description, onChange: (v) => setItem({ ...item, description: v }) }) },
    { key: "agent", label: "agent", desc: tx("Agent to run this command with.", "运行此命令使用的 agent。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { editable: true, value: item.agent, options: agents, onChange: (v) => setItem({ ...item, agent: v }) }) },
    { key: "model", label: "model", desc: tx("Model override for this command.", "此命令使用的模型覆盖。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { editable: true, value: item.model, options: models, onChange: (v) => setItem({ ...item, model: v }) }) },
    { key: "variant", label: "variant", desc: tx("Model variant for this command.", "此命令使用的模型 variant。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: item.variant, onChange: (v) => setItem({ ...item, variant: v }) }) },
    { key: "subtask", label: "subtask", desc: tx("Run the command as a subtask.", "以子任务方式运行命令。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: item.subtask, onChange: (v) => setItem({ ...item, subtask: v }) }) }
  ] : [];
  if (selected) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in item, lang }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    NamedDrillList,
    {
      lang,
      items: names,
      addPlaceholder: tx("command name", "命令名", lang),
      onOpen: (name) => enter({ id: `command:${name}`, title: name }),
      onAdd: (name) => setConfig(setNested(config, ["command", name], { template: "" })),
      renderPreview: (name) => isRecord(map[name]) ? String(map[name].description ?? "") : "",
      emptyText: tx("Add a command, then configure its template.", "先添加命令，再配置它的 template。", lang)
    }
  );
}
function SkillsSection({ config, setConfig, lang }) {
  const skills = getObject(config, "skills");
  const reference = getObject(config, "reference");
  const skillFields = [
    { key: "skills.paths", label: "skills.paths", desc: tx("Additional paths to skill folders.", "额外的技能文件夹路径。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: skills.paths, onChange: (v) => setConfig(setNested(config, ["skills", "paths"], v)), mono: true }) },
    { key: "skills.urls", label: "skills.urls", desc: tx("URLs to fetch skills from (e.g. /.well-known/skills/).", "从这些 URL 获取技能（如 /.well-known/skills/）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: skills.urls, onChange: (v) => setConfig(setNested(config, ["skills", "urls"], v)), mono: true }) }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "skills", lang, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields: skillFields, isConfigured: (key) => hasNested(config, key.split(".")), lang }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GroupHeader, { text: tx("References (@alias)", "引用（@alias）", lang), count: Object.keys(reference).length }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-[length:var(--fs-xs)] leading-relaxed text-text-400", children: tx("Named git or local directory references mentioned as @alias or @alias/path.", "命名的 git 或本地目录引用，可用 @alias 或 @alias/path 提及。", lang) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ReferenceEditor, { value: reference, onChange: (v) => setConfig(setRoot(config, "reference", v)), lang })
    ] })
  ] }) });
}
function ReferenceEditor({ value, onChange, lang }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const [newAlias, setNewAlias] = reactExports.useState("");
  const entries = Object.entries(value);
  const setEntry = (alias, entry) => onChange({ ...value, [alias]: entry });
  const typeOf = (entry) => {
    if (typeof entry === "string") return "string";
    if (isRecord(entry) && "path" in entry) return "local";
    return "git";
  };
  if (activeChildId?.startsWith("reference:")) {
    const alias = activeChildId.slice("reference:".length);
    if (alias in value) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ReferenceEntry, { alias, entry: value[alias], setEntry, lang }) });
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    entries.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: tx("No references configured.", "还没有配置引用。", lang) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 px-3.5", children: entries.map(([alias, entry]) => {
      const type = typeOf(entry);
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "group flex items-center gap-2 border-b border-border-200/35 last:border-b-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => enter({ id: `reference:${alias}`, title: `@${alias}` }), className: "flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "truncate font-mono text-[length:var(--fs-sm)] font-medium text-text-100", children: [
            "@",
            alias
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "truncate text-[length:var(--fs-xs)] text-text-500", children: [
            type,
            " · ",
            previewValue(entry, lang)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 15, className: "shrink-0 text-text-500 transition-transform group-hover:translate-x-0.5" })
      ] }) }, alias);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: newAlias, onChange: (event) => setNewAlias(event.target.value), placeholder: tx("alias", "别名", lang), className: `${fieldClass} min-w-0 flex-1 font-mono` }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: !newAlias.trim() || newAlias in value,
          onClick: () => {
            setEntry(newAlias.trim(), "");
            setNewAlias("");
          },
          className: "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-2 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100 disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13 }),
            tx("Add reference", "添加引用", lang)
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] leading-relaxed text-text-500", children: tx("Deleting saved reference keys is not supported by the official merge API. Edit the value instead, or Reset before saving newly added references.", "官方 merge API 不支持可靠删除已保存的 reference key。请改值，刚新增的引用可在保存前 Reset。", lang) })
  ] });
}
function ReferenceEntry({ alias, entry, setEntry, lang }) {
  const type = typeof entry === "string" ? "string" : isRecord(entry) && "path" in entry ? "local" : "git";
  const rec = isRecord(entry) ? entry : {};
  const fields = [
    {
      key: "type",
      label: "type",
      desc: tx("Reference source type.", "引用来源类型。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Select,
        {
          value: type,
          options: [
            { value: "string", label: tx("string (path/url)", "string（路径/URL）", lang) },
            { value: "git", label: tx("git repository", "git 仓库", lang) },
            { value: "local", label: tx("local path", "本地路径", lang) }
          ],
          onChange: (next) => {
            if (next === "string") setEntry(alias, "");
            else if (next === "git") setEntry(alias, { repository: "" });
            else setEntry(alias, { path: "" });
          }
        }
      )
    },
    ...type === "string" ? [{ key: "value", label: "value", desc: tx("Path, URL, or owner/repo shorthand.", "路径、URL 或 owner/repo 简写。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: typeof entry === "string" ? entry : "", onChange: (v) => setEntry(alias, v), mono: true, placeholder: "owner/repo or path" }) }] : type === "git" ? [
      { key: "repository", label: "repository", desc: tx("Repository URL or owner/repo shorthand.", "仓库 URL 或 owner/repo 简写。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: rec.repository, onChange: (v) => setEntry(alias, { ...rec, repository: v }), mono: true, placeholder: tx("repository URL or owner/repo", "仓库 URL 或 owner/repo", lang) }) },
      { key: "branch", label: "branch", desc: tx("Branch to use (optional).", "使用的分支（可选）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: rec.branch, onChange: (v) => setEntry(alias, { ...rec, branch: v }) }) }
    ] : [{ key: "path", label: "path", desc: tx("Local path to reference.", "本地引用路径。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: rec.path, onChange: (v) => setEntry(alias, { ...rec, path: v }), mono: true, placeholder: tx("absolute, ~/ or workspace-relative path", "绝对路径、~/ 或相对工作区路径", lang) }) }]
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key === "type" || (isRecord(entry) ? key in entry : key === "value"), lang });
}
function PluginsSection(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "plugins", lang: props.lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(PluginsHome, { ...props }) });
}
function PluginsHome({ config, setConfig, lang }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const list = Array.isArray(config.plugin) ? config.plugin : [];
  const set = (next) => setConfig(setRoot(config, "plugin", next));
  if (activeChildId?.startsWith("plugin:")) {
    const index = Number(activeChildId.slice("plugin:".length));
    if (Number.isInteger(index) && index >= 0 && index < list.length) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(PluginEntry, { list, set, index, lang }) });
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    list.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: tx("No plugins configured.", "还没有配置插件。", lang) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 px-3.5", children: list.map((entry, index) => {
      const isTuple = Array.isArray(entry);
      const name = isTuple ? String(entry[0] ?? "") : String(entry ?? "");
      const options = isTuple && isRecord(entry[1]) ? entry[1] : {};
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group flex items-center gap-2 border-b border-border-200/35 last:border-b-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => enter({ id: `plugin:${index}`, title: name || tx("plugin", "插件", lang) }), className: "flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-mono text-[length:var(--fs-sm)] font-medium text-text-100", children: name || tx("(empty)", "（空）", lang) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[length:var(--fs-xs)] text-text-500", children: isTuple ? previewValue(options, lang) : tx("no options", "无配置项", lang) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 15, className: "shrink-0 text-text-500 transition-transform group-hover:translate-x-0.5" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => set(list.filter((_, i) => i !== index)), className: "shrink-0 rounded-md p-1.5 text-text-500 opacity-0 transition-opacity hover:text-error-100 group-hover:opacity-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrashIcon, { size: 13 }) })
      ] }, index);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => set([...list, ""]), className: "inline-flex items-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-1.5 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13 }),
      tx("Add plugin", "添加插件", lang)
    ] })
  ] });
}
function PluginEntry({ list, set, index, lang }) {
  const entry = list[index];
  const isTuple = Array.isArray(entry);
  const name = isTuple ? String(entry[0] ?? "") : String(entry ?? "");
  const options = isTuple && isRecord(entry[1]) ? entry[1] : {};
  const fields = [
    {
      key: "name",
      label: "name",
      desc: tx("Plugin package spec or local plugin file.", "插件包名或本地插件文件。", lang),
      control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: name, onChange: (value) => {
        const next = [...list];
        next[index] = isTuple ? [value, options] : value;
        set(next);
      }, mono: true, placeholder: tx("package name or ./local-plugin.js", "包名或 ./local-plugin.js", lang) })
    },
    {
      key: "options",
      label: "options",
      desc: tx("Optional plugin options object.", "可选的插件配置对象。", lang),
      drill: {
        title: "options",
        preview: isTuple ? previewValue(options, lang) : tx("disabled", "未启用", lang),
        render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(
          KeyValueField,
          {
            value: options,
            onChange: (value) => {
              const next = [...list];
              next[index] = [name, value];
              set(next);
            }
          }
        )
      }
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key === "name" || key === "options" && isTuple, lang });
}
function AttachmentsSection({ config, setConfig, lang }) {
  const image = getObject(getObject(config, "attachment"), "image");
  const set = (key, v) => setConfig(setNested(config, ["attachment", "image", key], v));
  const fields = [
    { key: "auto_resize", label: "image.auto_resize", desc: tx("Resize oversized images before sending (default: true).", "发送前缩放超限图片（默认 true）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: image.auto_resize, onChange: (v) => set("auto_resize", v) }) },
    { key: "max_width", label: "image.max_width", desc: tx("Max image width before resize/reject (default: 2000).", "缩放/拒绝前的最大宽度（默认 2000）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: image.max_width, onChange: (v) => set("max_width", v) }) },
    { key: "max_height", label: "image.max_height", desc: tx("Max image height before resize/reject (default: 2000).", "缩放/拒绝前的最大高度（默认 2000）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: image.max_height, onChange: (v) => set("max_height", v) }) },
    { key: "max_base64_bytes", label: "image.max_base64_bytes", desc: tx("Max base64 payload bytes (default: 5242880).", "base64 最大字节数（默认 5242880）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: image.max_base64_bytes, onChange: (v) => set("max_base64_bytes", v) }) }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "attachments", lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => hasNested(config, ["attachment", "image", key]), lang }) });
}
function RuntimeSection({ config, setConfig, lang }) {
  const toolOutput = getObject(config, "tool_output");
  const compaction = getObject(config, "compaction");
  const watcher = getObject(config, "watcher");
  const enterprise = getObject(config, "enterprise");
  const fields = [
    { key: "tool_output.max_lines", label: "tool_output.max_lines", desc: tx("Max lines of tool output before truncation (default: 2000).", "工具输出截断前的最大行数（默认 2000）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: toolOutput.max_lines, onChange: (v) => setConfig(setNested(config, ["tool_output", "max_lines"], v)) }) },
    { key: "tool_output.max_bytes", label: "tool_output.max_bytes", desc: tx("Max bytes of tool output before truncation (default: 51200).", "工具输出截断前的最大字节（默认 51200）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: toolOutput.max_bytes, onChange: (v) => setConfig(setNested(config, ["tool_output", "max_bytes"], v)) }) },
    { key: "compaction.auto", label: "compaction.auto", desc: tx("Auto-compact context when full (default: true).", "上下文满时自动压缩（默认 true）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: compaction.auto, onChange: (v) => setConfig(setNested(config, ["compaction", "auto"], v)) }) },
    { key: "compaction.prune", label: "compaction.prune", desc: tx("Prune old tool outputs (default: false).", "修剪旧的工具输出（默认 false）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: compaction.prune, onChange: (v) => setConfig(setNested(config, ["compaction", "prune"], v)) }) },
    { key: "compaction.tail_turns", label: "compaction.tail_turns", desc: tx("Recent user turns kept verbatim during compaction (default: 2).", "压缩时原样保留的最近用户轮次数（默认 2）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(IntegerField, { value: compaction.tail_turns, min: 0, onChange: (v) => setConfig(setNested(config, ["compaction", "tail_turns"], v)) }) },
    { key: "compaction.preserve_recent_tokens", label: "compaction.preserve_recent_tokens", desc: tx("Max tokens from recent turns to preserve verbatim.", "原样保留的最近轮次最大 token 数。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(IntegerField, { value: compaction.preserve_recent_tokens, min: 0, onChange: (v) => setConfig(setNested(config, ["compaction", "preserve_recent_tokens"], v)) }) },
    { key: "compaction.reserved", label: "compaction.reserved", desc: tx("Token buffer reserved to avoid overflow during compaction.", "压缩时预留的 token 缓冲，避免溢出。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(IntegerField, { value: compaction.reserved, min: 0, onChange: (v) => setConfig(setNested(config, ["compaction", "reserved"], v)) }) },
    { key: "watcher.ignore", label: "watcher.ignore", block: true, desc: tx("Glob patterns the file watcher should ignore.", "文件监听忽略的通配符。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: watcher.ignore, onChange: (v) => setConfig(setNested(config, ["watcher", "ignore"], v)), mono: true }) },
    { key: "enterprise.url", label: "enterprise.url", desc: tx("Enterprise server URL.", "企业服务器 URL。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: enterprise.url, onChange: (v) => setConfig(setNested(config, ["enterprise", "url"], v)), mono: true }) },
    { key: "tools", label: "tools", desc: tx("Globally enable/disable individual tools.", "全局启用/禁用单个工具。", lang), drill: { title: "tools", preview: previewValue(config.tools, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(ToolToggleMap, { value: config.tools, onChange: (v) => setConfig(setRoot(config, "tools", v)) }) } }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "runtime", lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key === "tools" ? hasRoot(config, "tools") : hasNested(config, key.split(".")), lang }) });
}
function ExperimentalSection({ config, setConfig, lang }) {
  const exp = getObject(config, "experimental");
  const set = (key, v) => setConfig(setNested(config, ["experimental", key], v));
  const fields = [
    { key: "batch_tool", label: "batch_tool", desc: tx("Enable the batch tool.", "启用批处理工具。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: exp.batch_tool, onChange: (v) => set("batch_tool", v) }) },
    { key: "openTelemetry", label: "openTelemetry", desc: tx("Emit OpenTelemetry spans for AI SDK calls.", "为 AI SDK 调用发送 OpenTelemetry 链路。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: exp.openTelemetry, onChange: (v) => set("openTelemetry", v) }) },
    { key: "disable_paste_summary", label: "disable_paste_summary", desc: tx("Disable the pasted-content summary.", "关闭粘贴内容摘要。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: exp.disable_paste_summary, onChange: (v) => set("disable_paste_summary", v) }) },
    { key: "continue_loop_on_deny", label: "continue_loop_on_deny", desc: tx("Continue the agent loop when a tool call is denied.", "工具调用被拒绝时继续 agent 循环。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: exp.continue_loop_on_deny, onChange: (v) => set("continue_loop_on_deny", v) }) },
    { key: "mcp_timeout", label: "mcp_timeout", desc: tx("Timeout in ms for MCP requests.", "MCP 请求超时（毫秒）。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(PositiveIntegerField, { value: exp.mcp_timeout, onChange: (v) => set("mcp_timeout", v) }) },
    { key: "primary_tools", label: "primary_tools", block: true, desc: tx("Tools available only to primary agents.", "仅对主 agent 可用的工具。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(StringListField, { value: exp.primary_tools, onChange: (v) => set("primary_tools", v), mono: true }) },
    {
      key: "policies",
      label: "policies",
      desc: tx("Policy statements applied to resources like provider access.", "应用于资源（如 provider 访问）的策略声明。", lang),
      drill: { title: "policies", preview: previewValue(exp.policies, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(PolicyEditor, { value: exp.policies, onChange: (v) => set("policies", v), lang }) }
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "experimental", lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in exp, lang }) });
}
function PolicyEditor({ value, onChange, lang }) {
  const list = Array.isArray(value) ? value : [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    list.map((entry, index) => {
      const rec = isRecord(entry) ? entry : {};
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 rounded-lg border border-border-200/40 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: rec.action, options: [{ value: "provider.use", label: "provider.use" }], onChange: (v) => {
            const next = [...list];
            next[index] = { ...rec, action: v };
            onChange(next);
          } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: rec.effect, options: enumChoices(["allow", "deny"]), onChange: (v) => {
            const next = [...list];
            next[index] = { ...rec, effect: v };
            onChange(next);
          } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => onChange(list.filter((_, i) => i !== index)), className: "rounded-md p-1.5 text-text-500 hover:text-error-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrashIcon, { size: 13 }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: rec.resource, onChange: (v) => {
          const next = [...list];
          next[index] = { ...rec, resource: v };
          onChange(next);
        }, placeholder: "resource", mono: true })
      ] }, index);
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => onChange([...list, { action: "provider.use", effect: "allow", resource: "" }]), className: "inline-flex items-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-1.5 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13 }),
      tx("Add policy", "添加策略", lang)
    ] })
  ] });
}
function CompatibilitySection({ config, setConfig, lang, models }) {
  const root = config;
  const mode = getObject(config, "mode");
  const fields = [
    { key: "$schema", label: "$schema", desc: tx("JSON schema reference for editor/validator tooling.", "供编辑器/验证工具使用的 JSON schema 引用。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value: root.$schema, onChange: (v) => setConfig(setRoot(config, "$schema", v)), mono: true }) },
    { key: "autoshare", label: "autoshare", badge: tx("deprecated", "已废弃", lang), desc: tx("Deprecated. Use 'share' instead.", "已废弃，请改用 'share'。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value: root.autoshare, onChange: (v) => setConfig(setRoot(config, "autoshare", v)) }) },
    { key: "layout", label: "layout", badge: tx("deprecated", "已废弃", lang), desc: tx("Deprecated. opencode always uses stretch layout.", "已废弃，opencode 始终使用 stretch layout。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: root.layout, options: enumChoices(["auto", "stretch"]), onChange: (v) => setConfig(setRoot(config, "layout", v)) }) },
    {
      key: "mode",
      label: "mode",
      badge: tx("deprecated", "已废弃", lang),
      desc: tx("Deprecated. Use 'agent' instead. Kept here for old configs.", "已废弃，请改用 'agent'。这里仅用于旧配置兼容。", lang),
      drill: { title: "mode", preview: previewValue(mode, lang), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(ModeCompatEditor, { value: mode, onChange: (v) => setConfig(setRoot(config, "mode", v)), lang, models }) }
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionShell, { id: "compatibility", lang, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => hasRoot(config, key), lang }) });
}
function ModeCompatEditor({ value, onChange, lang, models }) {
  const { activeChildId, enter, depth } = useDrillContainer();
  const rec = isRecord(value) ? value : {};
  const names = Object.keys(rec).sort();
  const [newName, setNewName] = reactExports.useState("");
  if (activeChildId?.startsWith("mode-agent:")) {
    const name = activeChildId.slice("mode-agent:".length);
    const agent = getObject(rec, name);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillChild, { depth, children: /* @__PURE__ */ jsxRuntimeExports.jsx(AgentCompatEditor, { value: agent, onChange: (next) => onChange({ ...rec, [name]: next }), lang, models }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    names.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: tx("No deprecated mode entries.", "没有旧 mode 条目。", lang) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 px-3.5", children: names.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(DrillRow, { label: name, preview: previewValue(rec[name], lang), onClick: () => enter({ id: `mode-agent:${name}`, title: name }) }, name)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: newName, onChange: (event) => setNewName(event.target.value), placeholder: tx("mode name", "mode 名称", lang), className: `${fieldClass} min-w-0 flex-1 font-mono` }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !newName.trim() || newName in rec, onClick: () => {
        onChange({ ...rec, [newName.trim()]: {} });
        setNewName("");
      }, className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-2 text-[length:var(--fs-xs)] text-text-300 hover:bg-bg-100 disabled:opacity-40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { size: 13 }),
        tx("Add", "添加", lang)
      ] })
    ] })
  ] });
}
function AgentCompatEditor({ value, onChange, lang, models }) {
  const fields = buildAgentConfigFields({ value, setField: (key, v) => onChange({ ...value, [key]: v }), lang, models });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrillFields, { fields, isConfigured: (key) => key in value, lang });
}
function AdvancedSection({ config, setConfig, lang }) {
  const [editingUnknown, setEditingUnknown] = reactExports.useState(false);
  const rest = Object.entries(config).filter(([key]) => !KNOWN_ROOT_KEYS.has(key));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionShell, { id: "advanced", lang, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 space-y-2 rounded-lg border border-warning-100/25 bg-warning-100/10 px-3 py-2 text-[length:var(--fs-xs)] leading-relaxed text-warning-100", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: tx("The official schema has additionalProperties=false. These fields are read-only by default.", "官方 schema 设置了 additionalProperties=false。这些字段默认只读。", lang) }),
      rest.length > 0 && !editingUnknown && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setEditingUnknown(true), className: "rounded-md border border-warning-100/40 px-2 py-1 text-warning-100 transition-colors hover:bg-warning-100/10", children: tx("Edit anyway", "仍然编辑", lang) })
    ] }),
    rest.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyHint, { text: tx("No unrecognized fields. Everything is editable in the sections above.", "没有未识别字段，全部都能在上面的分区里编辑。", lang) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border-200/45 bg-bg-000/25 px-3.5", children: rest.map(([key, value]) => editingUnknown ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      FieldRow,
      {
        label: key,
        desc: previewValue(value, lang),
        control: typeof value === "boolean" ? /* @__PURE__ */ jsxRuntimeExports.jsx(BoolField, { value, onChange: (v) => setConfig(setRoot(config, key, v)) }) : typeof value === "number" ? /* @__PURE__ */ jsxRuntimeExports.jsx(NumberField, { value, onChange: (v) => setConfig(setRoot(config, key, v)) }) : Array.isArray(value) ? /* @__PURE__ */ jsxRuntimeExports.jsx(JsonStructuredEditor, { value, type: "array", onChange: (v) => setConfig(setRoot(config, key, v)) }) : isRecord(value) ? /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValueField, { value, onChange: (v) => setConfig(setRoot(config, key, v)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { value, onChange: (v) => setConfig(setRoot(config, key, v)) })
      },
      key
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(FieldRow, { label: key, desc: tx("Read-only unknown field.", "只读未知字段。", lang), control: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate rounded-lg border border-border-200/40 bg-bg-100/40 px-3 py-2 font-mono text-[length:var(--fs-xs)] text-text-400", children: previewValue(value, lang) }) }, key)) })
  ] });
}
function SectionRouter(props) {
  switch (props.section) {
    case "general":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(GeneralSection, { ...props });
    case "server":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ServerSection, { ...props });
    case "commands":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CommandsSection, { ...props });
    case "skills":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SkillsSection, { ...props });
    case "plugins":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(PluginsSection, { ...props });
    case "providers":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ProvidersSection, { ...props });
    case "agents":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(AgentsSection, { ...props });
    case "mcp":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(McpSection, { ...props });
    case "permissions":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(PermissionsSection, { ...props });
    case "formatters":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(FormatterSection, { ...props });
    case "lsp":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(LspSection, { ...props });
    case "attachments":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(AttachmentsSection, { ...props });
    case "runtime":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeSection, { ...props });
    case "experimental":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ExperimentalSection, { ...props });
    case "compatibility":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CompatibilitySection, { ...props });
    case "advanced":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(AdvancedSection, { ...props });
  }
}
function ConfigEditorDialog({ isOpen, onClose }) {
  const { t, i18n } = useTranslation("settings");
  const lang = i18n.language;
  const directory = useCurrentDirectory();
  const isMobile = useIsMobile();
  const [section, setSection] = reactExports.useState("general");
  const [config, setConfig] = reactExports.useState({});
  const [original, setOriginal] = reactExports.useState({});
  const [effective, setEffective] = reactExports.useState({});
  const [shells, setShells] = reactExports.useState([]);
  const [models, setModels] = reactExports.useState([]);
  const [providerCatalog, setProviderCatalog] = reactExports.useState({});
  const [loading, setLoading] = reactExports.useState(false);
  const [validating, setValidating] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [schemaWarning, setSchemaWarning] = reactExports.useState(null);
  const [validationErrors, setValidationErrors] = reactExports.useState([]);
  const [validationDrillTarget, setValidationDrillTarget] = reactExports.useState(null);
  const [jsonDraftErrors, setJsonDraftErrors] = reactExports.useState(() => /* @__PURE__ */ new Set());
  const dirty = !sameValue(config, original);
  const reportJsonDraftError = reactExports.useCallback((id, invalid) => {
    setJsonDraftErrors((prev) => {
      const next = new Set(prev);
      if (invalid) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const updateConfig = reactExports.useCallback((next) => {
    setConfig(next);
    setValidationErrors([]);
    setValidationDrillTarget(null);
  }, []);
  const load = reactExports.useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSchemaWarning(null);
    setValidationErrors([]);
    setValidationDrillTarget(null);
    try {
      const [global, nextEffective, shellList, providers] = await Promise.all([
        getGlobalConfig(),
        getConfig(directory),
        listAvailableShells(directory).catch(() => []),
        getProviderConfigs(directory).catch(() => void 0)
      ]);
      const modelChoices = [];
      if (isRecord(providers)) {
        for (const [providerID, provider] of Object.entries(providers)) {
          if (!isRecord(provider) || !isRecord(provider.models)) continue;
          for (const modelID of Object.keys(provider.models)) {
            modelChoices.push({ value: `${providerID}/${modelID}`, label: `${providerID}/${modelID}` });
          }
        }
      }
      setOriginal(clone(global));
      setConfig(clone(global));
      setJsonDraftErrors(/* @__PURE__ */ new Set());
      setEffective(nextEffective);
      setProviderCatalog(isRecord(providers) ? providers : {});
      setShells([
        { value: "", label: t("config.shellAuto") },
        ...shellList.map((shell) => ({
          value: shell.name === shell.path ? shell.path : shell.name,
          label: shell.name,
          hint: shell.path,
          disabled: !shell.acceptable
        }))
      ]);
      setModels(modelChoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("config.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [directory, isOpen, t]);
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    setError(null);
    setSchemaWarning(null);
    setValidationErrors([]);
    setValidationDrillTarget(null);
    if (jsonDraftErrors.size > 0) {
      setError(tx("Fix invalid JSON editors before saving.", "保存前请先修复无效 JSON 编辑框。", lang));
      return;
    }
    setValidating(true);
    let officialResult;
    try {
      const { validateAgainstOfficialConfigSchema } = await __vitePreload(async () => {
        const { validateAgainstOfficialConfigSchema: validateAgainstOfficialConfigSchema2 } = await import("./configOfficialValidator-TABM96Q5.js");
        return { validateAgainstOfficialConfigSchema: validateAgainstOfficialConfigSchema2 };
      }, true ? __vite__mapDeps([3,1,2]) : void 0, import.meta.url);
      officialResult = await validateAgainstOfficialConfigSchema(config);
    } catch (error2) {
      officialResult = { errors: [], unavailable: error2 instanceof Error ? error2.message : String(error2) };
    } finally {
      setValidating(false);
    }
    const schemaUnavailableMessage = officialResult.unavailable ? tx("Official schema could not be loaded; this save relies on OpenCode server validation.", "无法加载官方 schema；本次保存将依赖 OpenCode 服务端校验。", lang) : null;
    const nextValidationErrors = [...officialResult.errors, ...validateConfig(config, lang, original)];
    if (nextValidationErrors.length > 0) {
      if (schemaUnavailableMessage) setSchemaWarning(schemaUnavailableMessage);
      setValidationErrors(nextValidationErrors);
      return;
    }
    setSaving(true);
    try {
      const saved = await updateGlobalConfig(config);
      setOriginal(clone(saved));
      setConfig(clone(saved));
      setEffective(await getConfig(directory));
      setSchemaWarning(null);
    } catch (err) {
      if (schemaUnavailableMessage) setSchemaWarning(schemaUnavailableMessage);
      setError(err instanceof Error ? err.message : t("config.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  const agents = reactExports.useMemo(() => {
    const names = /* @__PURE__ */ new Set([
      "build",
      "plan",
      "general",
      "explore",
      ...Object.keys(getObject(config, "agent")),
      ...Object.keys(getObject(effective, "agent"))
    ]);
    return Array.from(names).sort().map((value) => ({ value, label: value }));
  }, [config, effective]);
  const openValidationError = (error2) => {
    const target = validationDrillTargetForError(error2);
    setSection(target.section);
    setValidationDrillTarget({ ...target, key: `${error2.path}:${Date.now()}` });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      isOpen,
      onClose,
      rawContent: true,
      width: isMobile ? "100%" : "min(97vw, 1040px)",
      className: isMobile ? "h-full" : void 0,
      showCloseButton: false,
      ariaLabel: t("config.editorTitle"),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(JsonDraftErrorContext.Provider, { value: reportJsonDraftError, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ValidationDrillTargetContext.Provider, { value: validationDrillTarget, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `flex min-h-0 flex-col ${isMobile ? "flex-1" : ""}`,
          style: isMobile ? void 0 : { height: "min(90vh, 820px)" },
          children: [
            isMobile ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center px-4 pt-3 pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[length:var(--fs-heading-3)] font-semibold text-text-100", children: t("config.editorTitle") }),
                dirty && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[length:var(--fs-xs)] text-warning-100", children: t("config.unsaved") })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    role: "tablist",
                    "aria-label": t("config.editorTitle"),
                    className: "flex items-center gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-none",
                    children: SECTION_IDS.map((id) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        role: "tab",
                        "aria-selected": section === id,
                        onClick: () => setSection(id),
                        className: `shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[length:var(--fs-md)] font-medium transition-colors ${section === id ? "border-accent-main-100/30 bg-accent-main-100/10 text-accent-main-100" : "border-transparent text-text-400 active:bg-bg-100/60"}`,
                        children: tx(SECTION_META[id].en, SECTION_META[id].zh, lang)
                      },
                      id
                    ))
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-0 left-0 right-0 border-b border-border-100/40" })
              ] })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 border-b border-border-200/50 px-5 xl:px-6 py-3.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-heading-3)] font-semibold text-text-100", children: t("config.editorTitle") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 truncate text-[length:var(--fs-xs)] leading-relaxed text-text-400", children: t("config.noDeleteHint") })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
                dirty && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden text-[length:var(--fs-xs)] text-warning-100 sm:inline", children: t("config.unsaved") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    disabled: !dirty || saving || validating,
                    onClick: () => updateConfig(clone(original)),
                    className: "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-1.5 text-[length:var(--fs-xs)] text-text-300 transition-colors hover:bg-bg-100 disabled:opacity-40",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(UndoIcon, { size: 13 }),
                      t("config.reset")
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    disabled: !dirty || saving || validating,
                    onClick: save,
                    className: "inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-main-100 px-3 py-1.5 text-[length:var(--fs-xs)] font-medium text-white transition-opacity disabled:opacity-40",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { size: 13 }),
                      saving ? t("config.saving") : validating ? tx("Validating…", "校验中…", lang) : t("config.saveAll")
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, "aria-label": t("closeSettings"), className: "-mr-1 shrink-0 rounded-md p-2 text-text-400 transition-colors hover:bg-bg-100 hover:text-text-200", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { size: 18 }) })
              ] })
            ] }),
            error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "break-words border-b border-error-100/20 bg-error-100/10 px-4 py-2 text-[length:var(--fs-xs)] text-error-100", children: error }),
            schemaWarning && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "break-words border-b border-warning-100/20 bg-warning-100/10 px-4 py-2 text-[length:var(--fs-xs)] text-warning-100", children: schemaWarning }),
            validationErrors.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-32 overflow-y-auto border-b border-error-100/20 bg-error-100/10 px-4 py-2 text-[length:var(--fs-xs)] text-error-100 custom-scrollbar", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 font-medium", children: t("config.validationFailed", { defaultValue: "Config validation failed" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                validationErrors.slice(0, 12).map((error2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => openValidationError(error2),
                    className: "block min-w-0 text-left break-words hover:underline",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "break-all font-mono", children: error2.path }),
                      ": ",
                      error2.message
                    ]
                  },
                  `${error2.path}:${error2.message}`
                )),
                validationErrors.length > 12 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: tx(`${validationErrors.length - 12} more issue(s)…`, `还有 ${validationErrors.length - 12} 个问题…`, lang) })
              ] })
            ] }),
            loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-border-200/50 px-4 py-2 text-[length:var(--fs-xs)] text-text-400", children: t("config.loading") }),
            isMobile ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar overscroll-contain", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SectionRouter, { section, config, setConfig: updateConfig, lang, shells, models, agents, providerCatalog }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative shrink-0 px-4 py-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-4 top-0 h-px bg-border-200/30" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      disabled: !dirty || saving || validating,
                      onClick: () => updateConfig(clone(original)),
                      className: "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-200/60 px-3 py-2 text-[length:var(--fs-sm)] font-medium text-text-300 transition-colors hover:bg-bg-100 disabled:opacity-40",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(UndoIcon, { size: 14 }),
                        t("config.reset")
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      disabled: !dirty || saving || validating,
                      onClick: save,
                      className: "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-main-100 px-3 py-2 text-[length:var(--fs-sm)] font-medium text-white transition-opacity disabled:opacity-40",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { size: 14 }),
                        saving ? t("config.saving") : validating ? tx("Validating…", "校验中…", lang) : t("config.saveAll")
                      ]
                    }
                  )
                ] })
              ] })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "min-w-0 border-r border-border-200/50 p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: SECTION_IDS.map((id) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setSection(id),
                  className: `w-full rounded-lg px-3 py-2 text-left text-[length:var(--fs-sm)] transition-colors ${section === id ? "bg-accent-main-100/12 font-medium text-accent-main-100" : "text-text-300 hover:bg-bg-100 hover:text-text-100"}`,
                  children: tx(SECTION_META[id].en, SECTION_META[id].zh, lang)
                },
                id
              )) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "min-h-0 min-w-0 overflow-y-auto p-5 custom-scrollbar xl:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SectionRouter, { section, config, setConfig: updateConfig, lang, shells, models, agents, providerCatalog }) })
            ] })
          ]
        }
      ) }) })
    }
  );
}
function ConfigSettings() {
  const { t } = useTranslation("settings");
  const [open, setOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsSection, { title: t("config.title"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      SettingsCard,
      {
        title: t("config.sourceTitle"),
        description: t("config.sourceDesc"),
        actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setOpen(true),
            className: "inline-flex items-center gap-1.5 rounded-lg bg-accent-main-100 px-3 py-2 text-[length:var(--fs-sm)] font-medium text-white transition-colors hover:bg-accent-main-100/90",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsIcon, { size: 14 }),
              t("config.openEditor")
            ]
          }
        ),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 rounded-lg border border-warning-200/30 bg-warning-100/10 px-3 py-2 text-[length:var(--fs-xs)] text-text-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { size: 14, className: "mt-0.5 shrink-0 text-warning-100" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("config.sdkOnlyWarning") })
        ] })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ConfigEditorDialog, { isOpen: open, onClose: () => setOpen(false) })
  ] });
}
const TAB_ICONS = {
  servers: /* @__PURE__ */ jsxRuntimeExports.jsx(GlobeIcon, { size: 15 }),
  agent: /* @__PURE__ */ jsxRuntimeExports.jsx(AgentIcon, { size: 15 }),
  chat: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquareIcon, { size: 15 }),
  models: /* @__PURE__ */ jsxRuntimeExports.jsx(CpuIcon, { size: 15 }),
  appearance: /* @__PURE__ */ jsxRuntimeExports.jsx(SunIcon, { size: 15 }),
  workspace: /* @__PURE__ */ jsxRuntimeExports.jsx(LayersIcon, { size: 15 }),
  notifications: /* @__PURE__ */ jsxRuntimeExports.jsx(BellIcon, { size: 15 }),
  service: /* @__PURE__ */ jsxRuntimeExports.jsx(PlugIcon, { size: 15 }),
  config: /* @__PURE__ */ jsxRuntimeExports.jsx(CogIcon, { size: 15 }),
  keybindings: /* @__PURE__ */ jsxRuntimeExports.jsx(KeyboardIcon, { size: 15 }),
  about: /* @__PURE__ */ jsxRuntimeExports.jsx(QuestionIcon, { size: 15 })
};
const TAB_IDS = [
  "servers",
  "models",
  "agent",
  "chat",
  "workspace",
  "appearance",
  "notifications",
  "service",
  "config",
  "keybindings",
  "about"
];
const TAB_LABEL_KEYS = {
  servers: "tabs.servers",
  agent: "tabs.agent",
  chat: "tabs.chat",
  models: "tabs.models",
  appearance: "tabs.appearance",
  workspace: "tabs.workspace",
  notifications: "tabs.notifications",
  service: "tabs.service",
  config: "tabs.config",
  keybindings: "tabs.shortcuts",
  about: "tabs.about"
};
const TAB_DESC_KEYS = {
  servers: "tabs.serversDesc",
  agent: "tabs.agentDesc",
  chat: "tabs.chatDesc",
  models: "tabs.modelsDesc",
  appearance: "tabs.appearanceDesc",
  workspace: "tabs.workspaceDesc",
  notifications: "tabs.notificationsDesc",
  service: "tabs.serviceDesc",
  config: "tabs.configDesc",
  keybindings: "tabs.shortcutsDesc",
  about: "tabs.aboutDesc"
};
const GROUP_DEFS = [
  { labelKey: "groups.core", tabs: ["servers", "models", "agent", "chat", "workspace", "appearance", "notifications"] },
  { labelKey: "groups.advanced", tabs: ["service", "config", "keybindings", "about"] }
];
function TabContent({ tab }) {
  switch (tab) {
    case "agent":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(AgentSettings, {});
    case "appearance":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(AppearanceSettings, {});
    case "chat":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ChatSettings, {});
    case "models":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ModelsSettings, {});
    case "notifications":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(NotificationSettings, {});
    case "service":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ServiceSettings, {});
    case "config":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ConfigSettings, {});
    case "servers":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ServersSettings, {});
    case "keybindings":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(KeybindingsSection, {});
    case "workspace":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceSettings, {});
    case "about":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(AboutSettings, {});
    default:
      return null;
  }
}
function SettingsDialog({ isOpen, onClose, initialTab = "servers" }) {
  const { t } = useTranslation(["settings"]);
  const isMobile = useIsMobile();
  const isTauriDesktop = isTauri() && !isMobile;
  const scrollRef = reactExports.useRef(null);
  const normalizeTab = reactExports.useCallback((next) => {
    if (!next || next === "general") return "chat";
    return next;
  }, []);
  const [tab, setTab] = reactExports.useState(normalizeTab(initialTab));
  const visibleTabIds = reactExports.useMemo(
    () => isTauriDesktop ? TAB_IDS : TAB_IDS.filter((id) => id !== "service"),
    [isTauriDesktop]
  );
  const visibleTabs = reactExports.useMemo(
    () => visibleTabIds.map((id) => ({
      id,
      label: t(TAB_LABEL_KEYS[id]),
      description: t(TAB_DESC_KEYS[id]),
      icon: TAB_ICONS[id]
    })),
    [visibleTabIds, t]
  );
  const groupedTabs = reactExports.useMemo(
    () => GROUP_DEFS.map((group) => ({
      label: t(group.labelKey),
      tabs: group.tabs.map((id) => visibleTabs.find((vt) => vt.id === id)).filter((vt) => !!vt)
    })).filter((group) => group.tabs.length > 0),
    [visibleTabs, t]
  );
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const frameId = requestAnimationFrame(() => {
      setTab(normalizeTab(initialTab));
    });
    return () => cancelAnimationFrame(frameId);
  }, [isOpen, initialTab, normalizeTab]);
  reactExports.useEffect(() => {
    if (visibleTabs.some((t2) => t2.id === tab)) return;
    const frameId = requestAnimationFrame(() => {
      setTab(visibleTabs[0]?.id || "appearance");
    });
    return () => cancelAnimationFrame(frameId);
  }, [tab, visibleTabs]);
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const frameId = requestAnimationFrame(() => {
      document.getElementById(`settings-tab-${tab}`)?.focus();
    });
    return () => cancelAnimationFrame(frameId);
  }, [isOpen, tab]);
  const switchTab = reactExports.useCallback((nextTab) => {
    setTab(nextTab);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0 });
    });
  }, []);
  const handleTabKeyDown = reactExports.useCallback(
    (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
        const ids = visibleTabs.map((t2) => t2.id);
        if (ids.length === 0) return;
        const next = (ids.indexOf(tab) + dir + ids.length) % ids.length;
        switchTab(ids[next]);
        requestAnimationFrame(() => {
          document.getElementById(`settings-tab-${ids[next]}`)?.focus();
        });
      }
    },
    [tab, visibleTabs, switchTab]
  );
  const activeTabMeta = visibleTabs.find((vt) => vt.id === tab) || visibleTabs[0];
  const activePanelId = `settings-panel-${tab}`;
  if (isMobile) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Dialog,
      {
        isOpen,
        onClose,
        title: "",
        ariaLabel: t("title"),
        width: "100%",
        className: "h-full",
        showCloseButton: false,
        rawContent: true,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center px-4 pt-3 pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-heading-3)] font-semibold text-text-100", children: t("title") }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  role: "tablist",
                  "aria-label": t("title"),
                  onKeyDown: handleTabKeyDown,
                  className: "flex items-center gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none",
                  children: visibleTabs.map((vt) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      id: `settings-tab-${vt.id}`,
                      type: "button",
                      role: "tab",
                      "aria-selected": vt.id === tab,
                      "aria-controls": `settings-panel-${vt.id}`,
                      tabIndex: vt.id === tab ? 0 : -1,
                      onClick: () => switchTab(vt.id),
                      className: `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[length:var(--fs-md)] font-medium transition-colors whitespace-nowrap shrink-0 border
                      ${vt.id === tab ? "bg-accent-main-100/10 text-accent-main-100 border-accent-main-100/30" : "text-text-400 border-transparent active:bg-bg-100/60"}`,
                      children: [
                        vt.icon,
                        vt.label
                      ]
                    },
                    vt.id
                  ))
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-0 left-0 right-0 border-b border-border-100/40" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              id: activePanelId,
              role: "tabpanel",
              "aria-labelledby": `settings-tab-${tab}`,
              ref: scrollRef,
              className: "flex-1 min-h-0 py-4 px-4 overflow-y-auto custom-scrollbar overscroll-contain",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(TabContent, { tab })
            }
          )
        ] })
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      isOpen,
      onClose,
      title: "",
      ariaLabel: t("title"),
      width: "min(97vw, 1040px)",
      showCloseButton: false,
      rawContent: true,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-[min(90vh,820px)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "nav",
          {
            role: "tablist",
            "aria-orientation": "vertical",
            "aria-label": t("title"),
            className: "w-[200px] xl:w-[236px] shrink-0 border-r border-border-100/60 py-4 px-2 xl:px-2.5 flex flex-col overflow-y-auto scrollbar-none",
            onKeyDown: handleTabKeyDown,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-2.5 xl:px-3 mb-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-base)] font-semibold text-text-100", children: t("title") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mt-0.5 leading-relaxed hidden xl:block", children: t("subtitle") })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: groupedTabs.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2.5 xl:px-3 mb-1.5 text-[length:var(--fs-xxs)] font-semibold uppercase tracking-wider text-text-400/90", children: group.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: group.tabs.map((vt) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    id: `settings-tab-${vt.id}`,
                    type: "button",
                    role: "tab",
                    "aria-selected": vt.id === tab,
                    "aria-controls": `settings-panel-${vt.id}`,
                    onClick: () => switchTab(vt.id),
                    tabIndex: vt.id === tab ? 0 : -1,
                    className: `w-full flex items-center gap-2.5 px-2.5 xl:px-3 py-2 xl:py-2.5 rounded-lg text-[length:var(--fs-md)] font-medium transition-colors
                        ${vt.id === tab ? "bg-bg-100 text-text-100 ring-1 ring-border-200/60" : "text-text-400 hover:text-text-200 hover:bg-bg-100/50"}`,
                    children: [
                      vt.icon,
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: vt.label })
                    ]
                  },
                  vt.id
                )) })
              ] }, group.label)) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-auto pt-3 px-2.5 xl:px-3 text-[length:var(--fs-xxs)] text-text-400", children: t("version", { version: "0.0.0-electron" }) })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0 flex flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 border-b border-border-100/60 px-5 xl:px-6 py-3.5 flex items-center justify-between gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-heading-3)] font-semibold text-text-100", children: activeTabMeta.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-xs)] text-text-400 mt-0.5 leading-relaxed truncate", children: activeTabMeta.description })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: onClose,
                className: "p-2 text-text-400 hover:text-text-200 hover:bg-bg-100 rounded-md transition-colors -mr-1 shrink-0",
                "aria-label": t("closeSettings"),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { size: 18 })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              id: activePanelId,
              role: "tabpanel",
              "aria-labelledby": `settings-tab-${tab}`,
              ref: scrollRef,
              className: "flex-1 min-h-0 py-5 px-5 xl:px-6 overflow-y-auto custom-scrollbar",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(TabContent, { tab })
            }
          )
        ] })
      ] })
    }
  );
}
export {
  SettingsDialog
};
