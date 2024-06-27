import ToggleItem from "./toggle_item";

export default class Grid extends ToggleItem {
  constructor(value) {
    super("grid", null, value);
  }

  setClickCallback(callBack) {
    this.callBack = callBack;
  }

  click() {
    super.click();
    this.callBack?.(this.active());
  }
  
  active() {
    return this.el.hasClass("active");
  }
}
