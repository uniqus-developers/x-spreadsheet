import { cssPrefix } from "../config";
import { h } from "./element";
import { bindClickoutside, unbindClickoutside } from "./event";

export default class Comment {
  constructor(sheet = {}, viewFn, isHide = false) {
    this.sheet = sheet;
    this.viewFn = viewFn;
    this.data = [];
    this.isHide = isHide;
    this.el = h("div", `${cssPrefix}-comment-box`).hide();
  }

  hide() {
    const { el } = this;
    el.hide();
    unbindClickoutside(el);
  }

  show() {
    console.log("show");
    if (typeof this?.sheet?.options?.comment !== "object") return;
    if (this.isHide) return;
    const { el, sheet = {} } = this;
    const { data } = sheet;
    const { ri, ci } = data.selector;
    const cellRect = data.cellRect(ri, ci);
    const { width: elWidth, height: elHeight } = el.show().offset();
    const view = this.viewFn();
    const vhf = view.height / 2;
    const { left: x, top: y, width: cellWidth, height: cellHeight } = cellRect;
    let left = x + cellWidth;
    let top = y;

    if (view.width - left < elWidth) {
      left = x - elWidth;
    }

    if (left < 0) {
      left = 0;
    }

    if (y < elHeight) {
      top = y + cellHeight;
    }
    if (view.height - y < elHeight) {
      top = view.height - elHeight;
    }

    el.css({
      left: `${left}px`,
      top: `${top}px`,
      "max-height": `${view.height - top}px`,
    });
    setTimeout(() => {
      bindClickoutside(el);
    }, 1000);
  }
}
