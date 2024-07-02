import { h } from "../element";
import ToggleItem from "./toggle_item";

export default class CellConfigButtons extends ToggleItem {
  constructor(config) {
    const { tag } = config;
    super(tag, null, false, config);
    this.config = config;
  }

  element() {
    const icon = this.config.icon;
    const element = super.element();
    element.children().forEach((child) => element.removeChild(child));
    if (icon) {
      const child = h("img")
        .attr("src", icon)
        .css("max-width", "25px")
        .css("max-height", "25px").css('overflow', 'hidden')
      element.child(child);
    }

    return element;
  }
}
