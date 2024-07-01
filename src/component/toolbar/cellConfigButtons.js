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
    if (icon) {
      const child = h("img").attr("src", icon);
      element.child(child);
    }

    return element;
  }
}
