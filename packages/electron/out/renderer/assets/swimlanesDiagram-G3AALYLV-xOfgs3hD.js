import { c as createFlowDiagram, s as styles_default } from "./flowDiagram-23GEKE2U-C4KxC0ge.js";
import { b as __name } from "./mermaid.core-D9mdAS1t.js";
import "./chunk-5VM5RSS4-CPLad_83.js";
import "./chunk-XXDRQBXY-D2XTTUeE.js";
import "./chunk-VR4S4FIN-BK5NlBoD.js";
import "./chunk-32BRIVSS-CWeqnOYZ.js";
import "./channel-_uK4fL14.js";
import "./main-CbDQK4WE.js";
var getStyles = /* @__PURE__ */ __name((options) => `${styles_default(options)}
  .swimlane.cluster rect {
    stroke: ${options.clusterBorder} !important;
  }
  [data-look="neo"].cluster rect {
    filter: none;
  }
`, "getStyles");
var styles_default2 = getStyles;
var diagram = createFlowDiagram({ defaultLayout: "swimlane", styles: styles_default2 });
export {
  diagram
};
