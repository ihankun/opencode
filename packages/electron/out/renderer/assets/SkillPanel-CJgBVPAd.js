import { aY as getSDKClient, bV as unwrap, aI as formatPathForApi, bC as reactExports, cf as useTranslation, b$ as useDirectory, bk as jsxRuntimeExports, Z as RetryIcon, a1 as SearchIcon, a4 as SpinnerIcon, b as AlertCircleIcon, a8 as TeachIcon, g as ChevronDownIcon, i as ChevronRightIcon, ak as apiErrorHandler } from "./main-CbDQK4WE.js";
async function getSkills(directory) {
  const sdk = getSDKClient();
  return unwrap(await sdk.app.skills({ directory: formatPathForApi(directory) }));
}
const SkillPanel = reactExports.memo(function SkillPanel2({ isResizing: _isResizing }) {
  const { t } = useTranslation(["components", "common"]);
  const { currentDirectory } = useDirectory();
  const [skills, setSkills] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [filter, setFilter] = reactExports.useState("");
  const loadSkills = reactExports.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSkills(currentDirectory);
      setSkills(data);
    } catch (err) {
      apiErrorHandler("load skills", err);
      setError(t("skillPanel.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [currentDirectory, t]);
  reactExports.useEffect(() => {
    loadSkills();
  }, [loadSkills]);
  const normalizedFilter = filter.toLowerCase();
  const filteredSkills = skills.filter(
    (skill) => skill.name.toLowerCase().includes(normalizedFilter) || (skill.description ?? "").toLowerCase().includes(normalizedFilter)
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full bg-bg-100", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-10 items-center justify-between px-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-6 min-w-0 items-center gap-1.5 text-text-100 text-[length:var(--fs-xs)] font-medium", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skillPanel.title") }),
        !loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex h-4 items-center text-[length:var(--fs-xs)] leading-none text-text-400", children: [
          "(",
          skills.length,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: loadSkills,
          disabled: loading,
          "aria-label": t("common:refresh"),
          className: "inline-flex h-6 w-6 items-center justify-center hover:bg-bg-200/50 rounded-md text-text-300 hover:text-text-100 transition-colors disabled:opacity-50",
          title: t("common:refresh"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 12, className: loading ? "animate-spin" : "" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            name: "skill-filter",
            value: filter,
            onChange: (e) => setFilter(e.target.value),
            placeholder: t("skillPanel.filterPlaceholder"),
            "aria-label": t("skillPanel.filterPlaceholder"),
            autoComplete: "off",
            className: "w-full bg-bg-200/40 hover:bg-bg-200/60 focus:bg-bg-000 border border-transparent focus:border-border-200 rounded-md py-1.5 pl-[30px] pr-2 text-[length:var(--fs-sm)] text-text-100 placeholder:text-text-400/70 focus-visible:ring-1 focus-visible:ring-border-200 focus-visible:ring-inset transition-all"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SearchIcon, { size: 13, className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-text-400 group-focus-within:text-accent-main-100 transition-colors" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-3 bottom-0 h-px bg-border-200/30" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto", children: loading && skills.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 20, className: "animate-spin opacity-50" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skillPanel.loadingSkills") })
    ] }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { size: 20, className: "text-danger-100" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: loadSkills,
          className: "px-3 py-1.5 text-[length:var(--fs-sm)] bg-bg-200/50 hover:bg-bg-200 text-text-200 rounded-md transition-colors",
          children: t("common:retry")
        }
      )
    ] }) : filteredSkills.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-400 text-[length:var(--fs-base)] gap-2 px-4 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TeachIcon, { size: 24, className: "opacity-30" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skillPanel.noSkills") })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-1", children: filteredSkills.map((skill) => /* @__PURE__ */ jsxRuntimeExports.jsx(SkillItem, { skill }, skill.name)) }) })
  ] });
});
const SkillItem = reactExports.memo(function SkillItem2({ skill }) {
  const [expanded, setExpanded] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        "aria-expanded": expanded,
        className: "flex w-full items-start gap-2 rounded-md px-2 py-2 hover:bg-bg-200/50 transition-colors bg-transparent border-none text-left",
        onClick: () => setExpanded(!expanded),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-400 shrink-0 mt-0.5", children: expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { size: 12 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-base)] text-text-100 font-medium", children: skill.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-text-400 truncate", children: skill.description ?? "" })
          ] })
        ]
      }
    ),
    expanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-2 mb-2 ml-7 rounded-md border border-border-200/40 bg-bg-100/50 px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[length:var(--fs-sm)] text-text-500 mb-2 font-mono break-all", children: skill.location }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-bg-200/50 rounded-md p-2 overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-[length:var(--fs-sm)] text-text-200 font-mono whitespace-pre-wrap break-words", children: skill.content }) })
    ] })
  ] });
});
export {
  SkillPanel
};
