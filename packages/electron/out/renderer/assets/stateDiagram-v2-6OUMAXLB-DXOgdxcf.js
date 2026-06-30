import { b as styles_default, a as stateRenderer_v3_unified_default, s as stateDiagram_default, S as StateDB } from "./chunk-EX3LRPZG-tlOaUXPs.js";
import { b as __name } from "./mermaid.core-fCdjP7EW.js";
import "./chunk-XXDRQBXY-qMrN7Bt1.js";
import "./chunk-VR4S4FIN-BtFTasRM.js";
import "./chunk-32BRIVSS-DOs_0-iO.js";
import "./main-CxRsPsI8.js";
var diagram = {
  parser: stateDiagram_default,
  get db() {
    return new StateDB(2);
  },
  renderer: stateRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.state) {
      cnf.state = {};
    }
    cnf.state.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
