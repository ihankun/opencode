import { cf as useTranslation, bC as reactExports, bk as jsxRuntimeExports, D as Dialog, T as PlugIcon, a4 as SpinnerIcon, e as Button } from "./main-CxRsPsI8.js";
function CloseServiceDialog({ isOpen, onConfirm, onCancel }) {
  const { t } = useTranslation(["components", "common"]);
  const [closing, setClosing] = reactExports.useState(false);
  const handleConfirm = (stopService) => {
    setClosing(true);
    onConfirm(stopService);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { isOpen, onClose: onCancel, title: "", width: 420, showCloseButton: false, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center text-center py-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 rounded-full bg-accent-main-100/10 flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PlugIcon, { size: 24, className: "text-accent-main-100" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[length:var(--fs-heading-3)] font-semibold text-text-100 mb-2", children: t("closeService.title") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[length:var(--fs-md)] text-text-300 leading-relaxed mb-6 max-w-[320px]", children: t("closeService.description") }),
    closing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[length:var(--fs-md)] text-text-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, { size: 14, className: "animate-spin" }),
      t("common:closing")
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col w-full gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => handleConfirm(true), className: "w-full justify-center", children: t("closeService.closeAndStop") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => handleConfirm(false), className: "w-full justify-center", children: t("closeService.closeKeepRunning") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: onCancel, className: "w-full justify-center text-text-400", children: t("common:cancel") })
    ] })
  ] }) });
}
export {
  CloseServiceDialog
};
