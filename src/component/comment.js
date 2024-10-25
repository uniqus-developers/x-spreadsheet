import { cssPrefix } from "../config";
import { h } from "./element";
import { bindClickoutside, unbindClickoutside } from "./event";
import { tf } from "../locale/locale";

function insertComment() {
  const { textEl, config } = this;
  const {} = config;
  const value = textEl.el.value;
  if (value) {
  }
}

function keydownEventHandler(evt) {}

function handleCancelClick() {
  const { textEl } = this;
  textEl.val("");
}

function buildCommentBox() {
  const { sheet = {}, el, textEl } = this;
  const commentButton = h("button", `${cssPrefix}-comment-reply-button`)
    .child(tf("comment.reply")())
    .on("click", () => insertComment.call(this));

  const cancelButton = h("button", `${cssPrefix}-comment-cancel-button`)
    .child(tf("comment.cancel")())
    .on("click", () => handleCancelClick.call(this));

  const buttonContainer = h("div", `${cssPrefix}-comment-button-container`);
  const replyBox = h("div", `${cssPrefix}-comment-reply-box`);

  buttonContainer.child(cancelButton).child(commentButton);

  replyBox.child(textEl).child(buttonContainer);
  el.child(replyBox);
}

function buildCommentStack(comments) {
  const ele = comments.map((cmt) => {
    const { a, t } = cmt;
    const avatar = h("div", `${cssPrefix}-comment-avatar`).child(
      a?.toString?.()?.[0]
    );
    const name = h("div", `${cssPrefix}-comment-name`).child(a);
    const date = h("div", `${cssPrefix}-comment-data`).child(a ?? "");
    const box = h("div", `${cssPrefix}-title-box`).child(name).child(date);
    const header = h("div", `${cssPrefix}-comment-inner-box`)
      .child(avatar)
      .child(box);
    const contentBox = h("div", `${cssPrefix}-content-box`).child(t ?? "");
    const div = h("div", `${cssPrefix}-inner-box`)
      .child(header)
      .child(contentBox);
    return div;
  });
  return ele;
}

async function showAddedComment() {
  const { el, sheet = {}, config } = this;
  const { showComments } = config;
  const { data = {} } = sheet;
  const cell = data.getSelectedCell();
  if (cell) {
    let cmtArray;
    if (showComments) {
      cmtArray = await showComments?.(cell);
    } else {
      cmtArray = cell.c ?? [];
    }
    const elements = buildCommentStack.call(this, cmtArray);
    el.children(...elements);
  }
}

function removeAllChildren(el) {
  el.removeAllChild();
  el.hide();
  unbindClickoutside(el);
}

export default class Comment {
  constructor(sheet = {}, viewFn, isHide = false) {
    this.sheet = sheet;
    this.config = this.sheet.options?.comment ?? {};
    this.viewFn = viewFn;
    this.data = [];
    this.isHide = isHide;
    this.textEl = h("textarea", `${cssPrefix}-comment-textarea`).on(
      "keydown",
      (evt) => keydownEventHandler.call(this, evt)
    );
    this.el = h("div", `${cssPrefix}-comment-box`).hide();
  }

  hide() {
    const { el } = this;
    el.hide();
    unbindClickoutside(el);
  }

  show() {
    if (!this?.config.indicatorColor) return;
    if (this.isHide) return;
    const { el, sheet = {} } = this;
    const { contextMenu } = sheet;
    buildCommentBox.call(this);
    showAddedComment.call(this);
    const { x, y } = contextMenu.lastCoordinate;
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
    setTimeout(() => {
      bindClickoutside(el, removeAllChildren);
    }, 100);
  }
}
