import { c as createFlowDiagram, s as styles_default } from "./flowDiagram-23GEKE2U-OYzfU6J9.js";
import { b as __name } from "./mermaid.core-fCdjP7EW.js";
import "./chunk-5VM5RSS4-C_mzLG6R.js";
import "./chunk-XXDRQBXY-qMrN7Bt1.js";
import "./chunk-VR4S4FIN-BtFTasRM.js";
import "./chunk-32BRIVSS-DOs_0-iO.js";
import "./channel-J3pxh5WW.js";
import "./main-CxRsPsI8.js";
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
