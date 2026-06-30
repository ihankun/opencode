import { cf as useTranslation, bC as reactExports, bZ as useDelayedRender, bB as reactDomExports, bk as jsxRuntimeExports, a1 as SearchIcon, bz as parseKeybinding, aG as formatKeybinding } from "./main-CxRsPsI8.js";
function Kbd({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "kbd",
    {
      className: "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 \n                    text-[length:var(--fs-xs)] font-mono font-medium leading-none\n                    bg-bg-100 text-text-300 border border-border-200 rounded\n                    shadow-[0_1px_0_0_var(--border-200)]",
      children
    }
  );
}
function ShortcutDisplay({ shortcut }) {
  const parsed = parseKeybinding(shortcut);
  const formatted = formatKeybinding(parsed);
  const parts = formatted.split(" + ");
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-0.5", children: parts.map((part, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Kbd, { children: part }, i)) });
}
function CommandPalette({ isOpen, onClose, commands }) {
  const { t } = useTranslation(["components", "common"]);
  const [query, setQuery] = reactExports.useState("");
  const [selectedIndex, setSelectedIndex] = reactExports.useState(0);
  const inputRef = reactExports.useRef(null);
  const listRef = reactExports.useRef(null);
  const [isVisible, setIsVisible] = reactExports.useState(false);
  const shouldRender = useDelayedRender(isOpen, 150);
  reactExports.useEffect(() => {
    let frameId = null;
    if (isOpen) {
      frameId = requestAnimationFrame(() => {
        setQuery("");
        setSelectedIndex(0);
      });
    }
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isOpen]);
  reactExports.useEffect(() => {
    let frameId = null;
    if (shouldRender && isOpen) {
      frameId = requestAnimationFrame(() => {
        setIsVisible(true);
        inputRef.current?.focus();
      });
    } else {
      frameId = requestAnimationFrame(() => {
        setIsVisible(false);
      });
    }
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [shouldRender, isOpen]);
  const filteredCommands = reactExports.useMemo(() => {
    const visible = commands.filter((cmd) => !cmd.when || cmd.when());
    if (!query.trim()) return visible;
    const q = query.toLowerCase();
    return visible.filter(
      (cmd) => cmd.label.toLowerCase().includes(q) || cmd.description?.toLowerCase().includes(q) || cmd.category?.toLowerCase().includes(q) || cmd.id.toLowerCase().includes(q)
    ).sort((a, b) => {
      const aStart = a.label.toLowerCase().startsWith(q) ? 0 : 1;
      const bStart = b.label.toLowerCase().startsWith(q) ? 0 : 1;
      return aStart - bStart;
    });
  }, [commands, query]);
  const activeIndex = filteredCommands.length === 0 ? 0 : Math.min(selectedIndex, filteredCommands.length - 1);
  const executeCommand = reactExports.useCallback(
    (cmd) => {
      onClose();
      requestAnimationFrame(() => cmd.action());
    },
    [onClose]
  );
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => prev < filteredCommands.length - 1 ? prev + 1 : 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => prev > 0 ? prev - 1 : filteredCommands.length - 1);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[activeIndex]) {
            executeCommand(filteredCommands[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, filteredCommands, activeIndex, executeCommand, onClose]);
  reactExports.useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);
  if (!shouldRender) return null;
  return reactDomExports.createPortal(
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "command-palette-safe-top fixed inset-0 z-[300] flex items-start justify-center px-3",
        style: {
          backgroundColor: isVisible ? "hsl(var(--always-black) / 0.2)" : "hsl(var(--always-black) / 0)",
          transition: "background-color 150ms ease-out"
        },
        onPointerDown: (e) => {
          if (e.pointerType === "touch") return;
          if (e.target === e.currentTarget) {
            e.currentTarget.dataset.backdropDown = "1";
          }
        },
        onClick: (e) => {
          if (e.target === e.currentTarget && e.currentTarget.dataset.backdropDown === "1") {
            onClose();
          }
          delete e.currentTarget.dataset.backdropDown;
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "w-full max-w-[min(760px,calc(100vw-24px))] sm:max-w-[min(720px,calc(100vw-32px))] lg:max-w-[760px] glass-alt border border-border-200/60 rounded-lg shadow-lg overflow-hidden flex flex-col",
            style: {
              maxHeight: "60vh",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "scale(1) translateY(0)" : "scale(0.98) translateY(-8px)",
              transition: "all 150ms ease-out"
            },
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center gap-3 px-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SearchIcon, { size: 16, className: "text-text-400 shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    ref: inputRef,
                    type: "text",
                    value: query,
                    onChange: (e) => {
                      setQuery(e.target.value);
                      setSelectedIndex(0);
                    },
                    placeholder: t("commandPalette.placeholder"),
                    className: "flex-1 py-3.5 text-[length:var(--fs-base)] bg-transparent text-text-100 placeholder:text-text-400 \n                       outline-none border-none",
                    autoComplete: "off",
                    spellCheck: false
                  }
                ),
                query && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => {
                      setQuery("");
                      setSelectedIndex(0);
                    },
                    className: "text-text-400 hover:text-text-200 text-[length:var(--fs-sm)]",
                    children: t("common:clear")
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: listRef, className: "overflow-y-auto custom-scrollbar flex-1 p-1", children: filteredCommands.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-8 text-center text-text-400 text-[length:var(--fs-base)]", children: t("commandPalette.noCommandsFound") }) : filteredCommands.map((cmd, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  "data-index": index,
                  onClick: () => executeCommand(cmd),
                  onMouseEnter: () => setSelectedIndex(index),
                  className: `
                  w-full flex items-center justify-between rounded-md px-2 py-2 text-left
                  transition-colors duration-100
                  ${index === activeIndex ? "bg-bg-200/60 text-text-100" : "text-text-300 hover:bg-bg-200/50 hover:text-text-100"}
                `,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [
                      cmd.icon && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-400 shrink-0", children: cmd.icon }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-base)] truncate", children: cmd.label }),
                        cmd.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-text-400 truncate", children: cmd.description })
                      ] })
                    ] }),
                    cmd.shortcut && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 ml-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShortcutDisplay, { shortcut: cmd.shortcut }) })
                  ]
                },
                cmd.id
              )) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center gap-4 px-4 py-2 text-[length:var(--fs-xs)] text-text-400", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 top-0 h-px bg-border-200/30" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Kbd, { children: "↑" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Kbd, { children: "↓" }),
                  " ",
                  t("common:navigate")
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Kbd, { children: "↵" }),
                  " ",
                  t("common:run")
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Kbd, { children: "Esc" }),
                  " ",
                  t("common:close")
                ] })
              ] })
            ]
          }
        )
      }
    ),
    document.body
  );
}
export {
  CommandPalette
};
