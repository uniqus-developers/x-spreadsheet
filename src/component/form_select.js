import { h } from "./element";
import Suggest from "./suggest";
import { cssPrefix } from "../config";

export default class FormSelect {
  constructor(
    isMultiSelect,
    key,
    items,
    width,
    getTitle = (it) => it,
    change = () => {}
  ) {
    this.key = key;
    this.getTitle = getTitle;
    this.isMultiSelect = isMultiSelect;
    this.selectedItems = [key];
    this.vchange = () => {};
    this.el = h("div", `${cssPrefix}-form-select`).css("width", width);
    this.suggest = new Suggest(
      items.map((it) => ({
        key: it,
        title: this.getTitle(it),
      })),
      (it) => {
        if (this.isMultiSelect) {
          const index = this.selectedItems?.indexOf(it.key);
          if (index !== -1) {
            this.selectedItems.splice(index, 1);
          } else {
            this.selectedItems?.push?.(it.key);
          }
          this.itemClick(this.selectedItems);
          change(this.selectedItems);
          this.vchange(this.selectedItems);
        } else {
          this.itemClick(it.key);
          change(it.key);
          this.vchange(it.key);
        }
      },
      this.isMultiSelect,
      this.selectedItems,
      width
    );
    this.el
      .children(
        (this.itemEl = h("div", "input-text").html(this.getTitle(key))),
        this.suggest.el
      )
      .on("click", () => this.show());
  }

  show() {
    this.suggest.search("");
  }

  itemClick(it) {
    if (this.isMultiSelect) {
      this.key = this.selectedItems?.join(",");
      this.itemEl.html(this.key);
    } else {
      this.key = it;
      this.itemEl.html(this.getTitle(it));
    }
  }

  val(v) {
    if (v !== undefined) {
      this.key = v;
      this.itemEl.html(this.getTitle(v));
      return this;
    }
    return this.key;
  }
}
