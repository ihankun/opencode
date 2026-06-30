import { b as styles_default, a as stateRenderer_v3_unified_default, s as stateDiagram_default, S as StateDB } from "./chunk-EX3LRPZG-BLGtomXh.js";
import { b as __name } from "./mermaid.core-D9mdAS1t.js";
import "./chunk-XXDRQBXY-D2XTTUeE.js";
import "./chunk-VR4S4FIN-BK5NlBoD.js";
import "./chunk-32BRIVSS-CWeqnOYZ.js";
import "./main-CbDQK4WE.js";
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
