import { b as __name } from "./mermaid.core-D9mdAS1t.js";
var ImperativeState = class {
  /**
   * @param init - Function that creates the default state.
   */
  constructor(init) {
    this.init = init;
    this.records = this.init();
  }
  static {
    __name(this, "ImperativeState");
  }
  reset() {
    this.records = this.init();
  }
};
export {
  ImperativeState as I
};
