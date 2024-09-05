import { h } from "./element";
import { bindClickoutside, unbindClickoutside } from "./event";
import { cssPrefix } from "../config";
import { tf } from "../locale/locale";

const menuItems = [
  { key: "copy", title: tf("contextmenu.copy"), label: "Ctrl+C" },
  { key: "cut", title: tf("contextmenu.cut"), label: "Ctrl+X" },
  { key: "paste", title: tf("contextmenu.paste"), label: "Ctrl+V" },
  {
    key: "paste-value",
    title: tf("contextmenu.pasteValue"),
    label: "Ctrl+Shift+V",
  },
  {
    key: "paste-format",
    title: tf("contextmenu.pasteFormat"),
    label: "Ctrl+Alt+V",
  },
  { key: "divider" },
  { key: "insert-row", title: tf("contextmenu.insertRow") },
  { key: "insert-column", title: tf("contextmenu.insertColumn") },
  { key: "divider" },
  { key: "delete-row", title: tf("contextmenu.deleteRow") },
  { key: "delete-column", title: tf("contextmenu.deleteColumn") },
  { key: "delete-cell-text", title: tf("contextmenu.deleteCellText") },
  { key: "hide", title: tf("contextmenu.hide") },
  { key: "divider" },
  { key: "validation", title: tf("contextmenu.validation") },
  { key: "divider" },
  // { key: "cell-printable", title: tf("contextmenu.cellprintable") },
  // { key: "cell-non-printable", title: tf("contextmenu.cellnonprintable") },
  // { key: "divider" },
  { key: "cell-editable", title: tf("contextmenu.celleditable") },
  { key: "cell-non-editable", title: tf("contextmenu.cellnoneditable") },
];

function buildSubMenuItems(items) {
  const subMenus = items.map((it) => buildMenuItem.call(this, it));
  return subMenus;
}

function buildMenuItem(item) {
  if (item.key === "divider") {
    return h("div", `${cssPrefix}-item divider`);
  }
  const ele = h("div", `${cssPrefix}-item`)
    .on("click", () => {
      const range = this.sheet.selector.range;
      this.sheet?.trigger?.("context-menu-action", {
        action: [item.key],
        range,
      });
      this.itemClick(item.key);
      this.hide();
    })
    .children(
      typeof item.title === "function" ? item.title() : item.title ?? "",
      h("div", "label").child(item.label || "")
    );

  if (item.subMenus) {
    const arrowIcon = h("div", `${cssPrefix}-icon label `).child(
      h("div", `${cssPrefix}-icon-img arrow-right`)
    );
    ele.child(arrowIcon);
    const subMenus = buildSubMenuItems.call(this, item.subMenus);
    const subMenuEl = h("div", `${cssPrefix}-context-sub-menu`)
      .children(...subMenus)
      .hide();
    ele
      .child(subMenuEl)
      .on("mouseover", () => {
        const rect = ele.box();
        const subMenuElBox = subMenuEl.box();
        const view = this.viewFn();
        const totalWidth = subMenuElBox.width + rect.x + rect.width;
        let left = rect.left;
        let top = rect.top;
        if (totalWidth + rect.width > view.width) {
          left = left - 200;
        } else {
          left = left + 200;
        }
        const subMenuHeight = item.subMenus.length * 50;
        const totalHeight = subMenuHeight + rect.y + rect.height;
        if (totalHeight + subMenuHeight > view.height) {
          top = rect.top - subMenuHeight / 2;
        }
        subMenuEl.css("left", `${left}px`);
        subMenuEl.css("top", `${top}px`);
        subMenuEl.show();
      })
      .on("mouseout", () => {
        subMenuEl.hide();
      });
  }

  return ele;
}

function buildMenu() {
  const extendedContextMenu = this.extendedContextMenu;
  const buildInMenus = menuItems.map((it) => buildMenuItem.call(this, it));
  let additionalMenus = [];
  if (extendedContextMenu?.length) {
    const extMenu = Array.from(extendedContextMenu)
    extMenu.push({ key: "divider" });
    additionalMenus = extMenu.map((it) => buildMenuItem.call(this, it));
  }
  return [...(additionalMenus ?? []), ...buildInMenus];
}

export default class ContextMenu {
  constructor(sheetContext, viewFn, isHide = false, extendedContextMenu = []) {
    this.extendedContextMenu = extendedContextMenu;
    this.menuItems = buildMenu.call(this);
    this.el = h("div", `${cssPrefix}-contextmenu`)
      .children(...this.menuItems)
      .hide();
    this.viewFn = viewFn;
    this.itemClick = () => {};
    this.isHide = isHide;
    this.setMode("range");
    this.sheet = sheetContext;
  }

  // row-col: the whole rows or the whole cols
  // range: select range
  setMode(mode) {
    const hideEl = this.menuItems[12];
    if (mode === "row-col") {
      hideEl.show();
    } else {
      hideEl.hide();
    }
  }

  hide() {
    const { el } = this;
    el.hide();
    unbindClickoutside(el);
  }

  setPosition(x, y) {
    if (this.isHide) return;
    const { el } = this;
    const { width } = el.show().offset();
    const view = this.viewFn();
    const vhf = view.height / 2;
    let left = x;
    if (view.width - x <= width) {
      left -= width;
    }
    el.css("left", `${left}px`);
    if (y > vhf) {
      el.css("bottom", `${view.height - y}px`)
        .css("max-height", `${y}px`)
        .css("top", "auto");
    } else {
      el.css("top", `${y}px`)
        .css("max-height", `${view.height - y}px`)
        .css("bottom", "auto");
    }
    bindClickoutside(el);
  }
}
