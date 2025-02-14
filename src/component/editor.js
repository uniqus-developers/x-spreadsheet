//* global window */
import { h } from "./element";
import Suggest from "./suggest";
import Datepicker from "./datepicker";
import { cssPrefix } from "../config";
import MentionMenu from "./mentionmenu";
import { DEFAULT_ROW_HEIGHT } from "../constants";

function resetTextareaSize() {
  const { inputText } = this;
  if (!/^\s*$/.test(inputText)) {
    const { textlineEl, textEl, areaOffset } = this;
    const txts = inputText?.toString?.()?.split?.("\n");
    const maxTxtSize = Math.max(...txts.map((it) => it.length));
    const tlOffset = textlineEl.offset();
    const fontWidth = tlOffset.width / inputText.length;
    const tlineWidth = (maxTxtSize + 1) * fontWidth + 5;
    const maxWidth = this.viewFn().width - areaOffset.left - fontWidth;
    let h1 = txts.length;
    if (tlineWidth > areaOffset.width) {
      let twidth = tlineWidth;
      if (tlineWidth > maxWidth) {
        twidth = maxWidth;
        h1 += parseInt(tlineWidth / maxWidth, 10);
        h1 += tlineWidth % maxWidth > 0 ? 1 : 0;
      }
      textEl.css("width", `${twidth}px`);
    }
    h1 *= this.rowHeight;
    if (h1 > areaOffset.height) {
      textEl.css("height", `${h1}px`);
    }
  }
}

function insertText({ target }, itxt) {
  const { value, selectionEnd } = target;
  const ntxt = `${value.slice(0, selectionEnd)}${itxt}${value.slice(selectionEnd)}`;
  target.value = ntxt;

  const range = document.createRange();
  const sel = window.getSelection();
  range.setStart(target, selectionEnd + 1);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);

  this.inputText = ntxt;
  this.textlineEl.html(ntxt);
  resetTextareaSize.call(this);
}

function keydownEventHandler(evt) {
  const { keyCode, altKey } = evt;
  if (keyCode !== 13 && keyCode !== 9) evt.stopPropagation();
  if (keyCode === 13 && altKey) {
    insertText.call(this, evt, "\n");
    const { ri } = this.data?.selector ?? {};
    this.data.setRowHeight(ri, this.data.getRowHeight(ri) + DEFAULT_ROW_HEIGHT);
    evt.stopPropagation();
  }
  if (keyCode === 13 && !altKey) evt.preventDefault();
}

function mentionMenuSearch(text) {
  const { trigger, mention } = this;
  let { currentWord } = getCurrentWord.call(this, text);
  if (currentWord?.startsWith(trigger)) {
    mention.search(currentWord);
  } else {
    mention.hide();
  }
}

function inputEventHandler(evt) {
  const textValue = evt.target.innerText ?? evt.target.value ?? "";
  const htmlValue =
    evt.target.innerHTML !== "<br>" ? evt.target.innerHTML : undefined;
  const { suggest, textlineEl, validator, mention, trigger } = this;
  const { cell } = this;
  if (cell !== null) {
    if (
      ("editable" in cell && cell.editable === true) ||
      cell.editable === undefined
    ) {
      this.inputText = textValue;
      this.inputHtml = htmlValue;
      if (validator) {
        if (validator.type === "list") {
          suggest.search(textValue);
        } else {
          suggest.hide();
        }
      } else {
        const start = textValue.lastIndexOf("=");
        if (start !== -1) {
          suggest.search(textValue.substring(start + 1));
        } else {
          suggest.hide();
        }
      }
      if (trigger) {
        if (textValue?.includes(trigger)) {
          suggest.hide();
          mentionMenuSearch.call(this, textValue);
        } else {
          mention.hide();
        }
      }
      textlineEl.html(textValue);
      resetTextareaSize.call(this);
      this.change("input", textValue);
    } else {
      evt.target.value = cell.text ?? "";
      evt.target.innerText = cell.text ?? "";
    }
  } else {
    this.inputText = textValue;
    this.inputHtml = htmlValue;
    if (validator) {
      if (validator.type === "list") {
        suggest.search(textValue);
      } else {
        suggest.hide();
      }
    } else {
      const start = textValue.lastIndexOf("=");
      if (start !== -1) {
        suggest.search(textValue.substring(start + 1));
      } else {
        suggest.hide();
      }
      if (trigger) {
        if (textValue?.includes(trigger)) {
          suggest.hide();
          mentionMenuSearch.call(this, textValue);
        } else {
          mention.hide();
        }
      }
    }
    textlineEl.html(textValue);
    resetTextareaSize.call(this);
    this.change("input", textValue, htmlValue);
  }
}

function setTextareaRange(position) {
  const { el } = this.textEl;
  setTimeout(() => {
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    if (this.inputHtml) range.setStart(el, el.childNodes.length);
    else range.setStart(el.childNodes?.[0] ?? el, position);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }, 0);
}

function setText(values, position) {
  const { textValue, htmlValue } = values;
  const { textEl, textlineEl } = this;
  // firefox bug
  textEl.el.blur();

  textEl.html(htmlValue ? htmlValue : textValue);
  textlineEl.html(htmlValue ? htmlValue : textValue);
  setTextareaRange.call(this, position);
}

function suggestItemClick(it) {
  const { inputText, validator } = this;
  let position = 0;
  if (validator && validator.type === "list") {
    this.inputText = it;
    position = this.inputText.length;
  } else {
    const start = inputText.lastIndexOf("=");
    const sit = inputText.substring(0, start + 1);
    let eit = inputText.substring(start + 1);
    if (eit.indexOf(")") !== -1) {
      eit = eit.substring(eit.indexOf(")"));
    } else {
      eit = "";
    }
    this.inputText = `${sit + it.key}(`;
    // console.log('inputText:', this.inputText);
    position = this.inputText.length;
    this.inputText += `)${eit}`;
  }
  setText.call(this, { textValue: this.inputText }, position);
}

function resetSuggestItems() {
  this.suggest.setItems(this.formulas);
}

function dateFormat(d) {
  let month = d.getMonth() + 1;
  let date = d.getDate();
  if (month < 10) month = `0${month}`;
  if (date < 10) date = `0${date}`;
  return `${d.getFullYear()}-${month}-${date}`;
}

function getCurrentWord(text) {
  const { textEl, trigger } = this;
  const caretPos = textEl.el.selectionStart;
  let start = caretPos - 1;
  while (start >= 0 && /\S/.test(text[start]) && text[start + 1] !== trigger) {
    start--;
  }
  start++;
  let end = caretPos;
  while (end < text.length && /\S/.test(text[end])) {
    end++;
  }
  return { currentWord: text.slice(start, end), start, end };
}

function mentionInputHandler(item) {
  const { value } = item;
  let text = this.inputText;
  let { currentWord, start, end } = getCurrentWord.call(this, text);
  let word = "";
  if (currentWord?.includes(this.trigger) && !currentWord?.includes(".")) {
    word = `#${value}`;
  } else if (
    currentWord?.includes(this.trigger) &&
    currentWord?.includes(".")
  ) {
    const index = currentWord.lastIndexOf(".");
    const lastText = currentWord.substring(0, index + 1);
    word = `${lastText}${value}`;
  }

  let newText =
    text.slice(0, start) + `${word?.replaceAll(" ", "_")}` + text.slice(end);

  this.inputText = newText;
  const position = start + word?.length ?? this.inputText?.length;
  setText.call(this, { textValue: this.inputText }, position);
  resetTextareaSize.call(this);
}

export default class Editor {
  constructor(data, formulas, viewFn, rowHeight, options = {}) {
    this.options = options;
    this.viewFn = viewFn;
    this.rowHeight = rowHeight;
    this.formulas = formulas;
    this.data = data;
    this.suggest = new Suggest(formulas, (it) => {
      suggestItemClick.call(this, it);
    });
    this.trigger = options.mentionProgress?.trigger;
    this.mention = new MentionMenu(options.mentionProgress, (item) => {
      mentionInputHandler.call(this, item);
    });
    this.datepicker = new Datepicker();
    this.datepicker.change((d) => {
      // console.log('d:', d);
      this.setText({ textValue: dateFormat(d) });
      this.clear();
    });
    this.areaEl = h("div", `${cssPrefix}-editor-area`)
      .children(
        (this.textEl = h("div", "")
          .css({
            outline: "none",
            "line-height": 1.5,
            "background-color": "#fff",
          })
          .attr("contenteditable", true)
          .on("input", (evt) => inputEventHandler.call(this, evt))
          .on("paste.stop", () => {})
          .on("keydown", (evt) => keydownEventHandler.call(this, evt))),
        (this.textlineEl = h("div", "textline")),
        this.suggest.el,
        this.datepicker.el,
        this.mention.el
      )
      .on("mousemove.stop", () => {})
      .on("mousedown.stop", () => {});
    this.el = h("div", `${cssPrefix}-editor`).child(this.areaEl).hide();
    this.suggest.bindInputEvents(this.textEl);
    this.mention.bindInputEvents(this.textEl);

    this.areaOffset = null;
    this.freeze = { w: 0, h: 0 };
    this.cell = null;
    this.inputText = "";
    this.change = () => {};
    this.formulaCell = null;
  }

  setFreezeLengths(width, height) {
    this.freeze.w = width;
    this.freeze.h = height;
  }

  clear() {
    // const { cell } = this;
    // const cellText = (cell && cell.text) || '';
    if (this.inputText !== "") {
      this.change("finished", this.inputText);
    }
    this.cell = null;
    this.areaOffset = null;
    this.inputText = "";
    this.inputHtml = "";
    this.el.hide();
    this.textEl.html("");
    this.textlineEl.html("");
    resetSuggestItems.call(this);
    this.datepicker.hide();
  }

  setOffset(offset, suggestPosition = "top") {
    const { textEl, areaEl, suggest, freeze, el, mention } = this;
    if (offset) {
      this.areaOffset = offset;
      const { left, top, width, height, l, t } = offset;
      // console.log('left:', left, ',top:', top, ', freeze:', freeze);
      const elOffset = { left: 0, top: 0 };
      // top left
      if (freeze.w > l && freeze.h > t) {
        //
      } else if (freeze.w < l && freeze.h < t) {
        elOffset.left = freeze.w;
        elOffset.top = freeze.h;
      } else if (freeze.w > l) {
        elOffset.top = freeze.h;
      } else if (freeze.h > t) {
        elOffset.left = freeze.w;
      }
      el.offset(elOffset);
      areaEl.offset({
        left: left - elOffset.left - 0.8,
        top: top - elOffset.top - 0.8,
      });
      textEl.offset({ width: width - 3 + 0.8, height: height - 3 + 0.8 });
      const sOffset = { left: 0 };
      sOffset[suggestPosition] = height;
      suggest.setOffset(sOffset);
      suggest.hide();
      mention.setOffset(sOffset);
      mention.hide();
    }
  }

  setCell(cell, validator) {
    if (cell && cell.editable === false) return;
    const editValueFormatter = this.options.editValueFormatter;
    const { el, datepicker, suggest } = this;
    el.show();
    this.cell = cell ?? {};
    let text = "";
    if (editValueFormatter) {
      text = editValueFormatter({ ...this, cell }) ?? cell?.text ?? "";
    } else {
      text = cell?.f || (cell?.text ?? "");
    }
    this.setText({ textValue: text, htmlValue: cell?.h });
    this.validator = validator;
    if (validator) {
      const { type } = validator;
      if (type === "date") {
        datepicker.show();
        if (!/^\s*$/.test(text)) {
          datepicker.setValue(text);
        }
      }
      if (type === "list") {
        suggest.setItems(validator.values());
        suggest.search("");
      }
    }
    //Added this code to call input handle when we are manually setting value to editor input field
    if (cell?.text?.length === 1) {
      inputEventHandler.call(this, { target: { value: text } });
    }
  }

  setFormulaCell(cellRef) {
    this.formulaCell = cellRef;
  }

  setText(values) {
    const { textValue, htmlValue } = values;
    this.inputText = textValue;
    this.inputHtml = htmlValue;
    setText.call(this, values, textValue.length);
    resetTextareaSize.call(this);
  }

  resetData(d) {
    this.data = d;
  }
}
