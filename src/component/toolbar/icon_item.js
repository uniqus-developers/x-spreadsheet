import Item from "./item";
import Icon from "../icon";

export default class IconItem extends Item {
  element() {
    return super
      .element()
      .child(new Icon(this.tag))
      .on("click", () => this.click());
  }

  setState(disabled) {
    this.el.disabled(disabled);
  }

  click(fireChange = true) {
    if (fireChange) this.change(this.tag);
  }
}
