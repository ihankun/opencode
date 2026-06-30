import { s as styles_default, a as classRenderer_v3_unified_default, c as classDiagram_default, C as ClassDB } from "./chunk-V7JOEXUC-CZlmrVJy.js";
import { b as __name } from "./mermaid.core-D9mdAS1t.js";
import "./chunk-5VM5RSS4-CPLad_83.js";
import "./chunk-XXDRQBXY-D2XTTUeE.js";
import "./chunk-VR4S4FIN-BK5NlBoD.js";
import "./chunk-32BRIVSS-CWeqnOYZ.js";
import "./main-CbDQK4WE.js";
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
