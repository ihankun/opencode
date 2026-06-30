import { s as styles_default, a as classRenderer_v3_unified_default, c as classDiagram_default, C as ClassDB } from "./chunk-V7JOEXUC-BG7wOqNA.js";
import { b as __name } from "./mermaid.core-fCdjP7EW.js";
import "./chunk-5VM5RSS4-C_mzLG6R.js";
import "./chunk-XXDRQBXY-qMrN7Bt1.js";
import "./chunk-VR4S4FIN-BtFTasRM.js";
import "./chunk-32BRIVSS-DOs_0-iO.js";
import "./main-CxRsPsI8.js";
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
