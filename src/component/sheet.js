/* global window */
import { h } from "./element";
import { bind, mouseMoveUp, bindTouch, createEventEmitter } from "./event";
import Resizer from "./resizer";
import Scrollbar from "./scrollbar";
import Selector from "./selector";
import Editor from "./editor";
import Print from "./print";
import ContextMenu from "./contextmenu";
import Table from "./table";
import Toolbar from "./toolbar/index";
import ModalValidation from "./modal_validation";
import SortFilter from "./sort_filter";
import { xtoast } from "./message";
import { cssPrefix } from "../config";
import { formulas } from "../core/formula";
import { constructFormula, getCellName } from "../algorithm/cellInjection";
import Comment from "./comment";
import { CELL_REF_REGEX, SHEET_TO_CELL_REF_REGEX } from "../constants";
import { expr2xy } from "../core/alphabet";

/**
 * @desc throttle fn
 * @param func function
 * @param wait Delay in milliseconds
 */
function throttle(func, wait) {
  let timeout;
  return (...arg) => {
    const that = this;
    const args = arg;
    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        func.apply(that, args);
      }, wait);
    }
  };
}

function scrollbarMove() {
  const { data, verticalScrollbar, horizontalScrollbar } = this;
  const { l, t, left, top, width, height } = data.getSelectedRect();
  const tableOffset = this.getTableOffset();
  // console.log(',l:', l, ', left:', left, ', tOffset.left:', tableOffset.width);
  if (Math.abs(left) + width > tableOffset.width) {
    horizontalScrollbar.move({ left: l + width - tableOffset.width });
  } else {
    const fsw = data.freezeTotalWidth();
    if (left < fsw) {
      horizontalScrollbar.move({ left: l - 1 - fsw });
    }
  }
  // console.log('top:', top, ', height:', height, ', tof.height:', tableOffset.height);
  if (Math.abs(top) + height > tableOffset.height) {
    verticalScrollbar.move({ top: t + height - tableOffset.height - 1 });
  } else {
    const fsh = data.freezeTotalHeight();
    if (top < fsh) {
      verticalScrollbar.move({ top: t - 1 - fsh });
    }
  }
}

function formulaProgress() {
  if (!this.editor.formulaCell) return;
  const single = this.data.isSingleSelected();
  const text = this.editor.inputText;
  if (single) {
    const { ri, ci } = this.data.selector;
    const cellName = getCellName(ri, ci);
    const updatedText = constructFormula(text, cellName, false);
    this.editor.setText(updatedText);
  } else {
    const { sri, eri, sci, eci } = this.selector.range;
    const startCell = getCellName(sri, sci);
    const endCell = getCellName(eri, eci);
    const range = `${startCell}:${endCell}`;
    const updatedText = constructFormula(text, range, true);
    this.editor.setText(updatedText);
  }
}

function selectorSet(multiple, ri, ci, indexesUpdated = true, moving = false) {
  const { table, selector, toolbar, data, contextMenu, editor } = this;
  const cell = data.getCell(ri, ci);
  if (multiple) {
    selector.setEnd(ri, ci, moving);
    if (!moving) {
      if (!editor.formulaCell) {
        this.trigger("cells-selected", cell, selector.range);
      }
      formulaProgress.call(this);
    }
  } else {
    selector.set(ri, ci, indexesUpdated);
    if (!moving && ri !== -1 && ci !== -1) {
      if (!editor.formulaCell) {
        this.trigger("cell-selected", cell, ri, ci);
      }
      formulaProgress.call(this);
    }
  }
  contextMenu.setMode(ri === -1 || ci === -1 ? "row-col" : "range");
  toolbar.reset();
  table.render();
}

// multiple: boolean
// direction: left | right | up | down | row-first | row-last | col-first | col-last
function selectorMove(multiple, direction, isMoving = true) {
  const { selector, data } = this;
  const { rows, cols } = data;
  let [ri, ci] = selector.indexes;
  const { eri, eci } = selector.range;
  let isLastOrFirst = false;
  if (multiple) {
    [ri, ci] = selector.moveIndexes;
  }
  // console.log('selector.move:', ri, ci);
  if (direction === "left") {
    if (ci > 0) ci -= 1;
  } else if (direction === "right") {
    if (eci !== ci) ci = eci;
    if (ci < cols.len - 1) ci += 1;
  } else if (direction === "up") {
    if (ri > 0) ri -= 1;
  } else if (direction === "down") {
    if (eri !== ri) ri = eri;
    if (ri < rows.len - 1) ri += 1;
  } else if (direction === "row-first") {
    ci = 0;
    isLastOrFirst = true;
  } else if (direction === "row-last") {
    ci = cols.len - 1;
    isLastOrFirst = true;
  } else if (direction === "col-first") {
    ri = 0;
    isLastOrFirst = true;
  } else if (direction === "col-last") {
    ri = rows.len - 1;
    isLastOrFirst = true;
  }
  if (multiple) {
    selector.moveIndexes = [ri, ci];
  }
  selectorSet.call(this, multiple, ri, ci, true, !isLastOrFirst && isMoving);
  scrollbarMove.call(this);
}

// private methods
function overlayerMousemove(evt) {
  // console.log('x:', evt.offsetX, ', y:', evt.offsetY);
  if (evt.buttons !== 0) return;
  if (evt.target.className === `${cssPrefix}-resizer-hover`) return;
  const { offsetX, offsetY } = evt;
  const { rowResizer, colResizer, tableEl, data } = this;
  const { rows, cols } = data;
  if (offsetX > cols.indexWidth && offsetY > rows.height) {
    rowResizer.hide();
    colResizer.hide();
    return;
  }
  const tRect = tableEl.box();
  const cRect = data.getCellRectByXY(evt.offsetX, evt.offsetY);
  if (cRect.ri >= 0 && cRect.ci === -1) {
    cRect.width = cols.indexWidth;
    rowResizer.show(cRect, {
      width: tRect.width,
    });
    if (rows.isHide(cRect.ri - 1)) {
      rowResizer.showUnhide(cRect.ri);
    } else {
      rowResizer.hideUnhide();
    }
  } else {
    rowResizer.hide();
  }
  if (cRect.ri === -1 && cRect.ci >= 0) {
    cRect.height = rows.height;
    colResizer.show(cRect, {
      height: tRect.height,
    });
    if (cols.isHide(cRect.ci - 1)) {
      colResizer.showUnhide(cRect.ci);
    } else {
      colResizer.hideUnhide();
    }
  } else {
    colResizer.hide();
  }
}

// let scrollThreshold = 15;
function overlayerMousescroll(evt) {
  // scrollThreshold -= 1;
  // if (scrollThreshold > 0) return;
  // scrollThreshold = 15;

  const { verticalScrollbar, horizontalScrollbar, data } = this;
  const { top } = verticalScrollbar.scroll();
  const { left } = horizontalScrollbar.scroll();
  // console.log('evt:::', evt.wheelDelta, evt.detail * 40);

  const { rows, cols } = data;

  // deltaY for vertical delta
  const { deltaY, deltaX } = evt;
  const loopValue = (ii, vFunc) => {
    let i = ii;
    let v = 0;
    do {
      v = vFunc(i);
      i += 1;
    } while (v <= 0);
    return v;
  };
  // console.log('deltaX', deltaX, 'evt.detail', evt.detail);
  // if (evt.detail) deltaY = evt.detail * 40;
  const moveY = (vertical) => {
    if (vertical > 0) {
      // up
      const ri = data.scroll.ri + 1;
      if (ri < rows.len) {
        const rh = loopValue(ri, (i) => rows.getHeight(i));
        verticalScrollbar.move({ top: top + rh - 1 });
      }
    } else {
      // down
      const ri = data.scroll.ri - 1;
      if (ri >= 0) {
        const rh = loopValue(ri, (i) => rows.getHeight(i));
        verticalScrollbar.move({ top: ri === 0 ? 0 : top - rh });
      }
    }
  };

  // deltaX for Mac horizontal scroll
  const moveX = (horizontal) => {
    if (horizontal > 0) {
      // left
      const ci = data.scroll.ci + 1;
      if (ci < cols.len) {
        const cw = loopValue(ci, (i) => cols.getWidth(i));
        horizontalScrollbar.move({ left: left + cw - 1 });
      }
    } else {
      // right
      const ci = data.scroll.ci - 1;
      if (ci >= 0) {
        const cw = loopValue(ci, (i) => cols.getWidth(i));
        horizontalScrollbar.move({ left: ci === 0 ? 0 : left - cw });
      }
    }
  };
  const absDeltaY = Math.abs(deltaY);
  const absDeltaX = Math.abs(deltaX);

  // detail for windows/mac firefox vertical scroll
  if (/Firefox/i.test(window.navigator.userAgent))
    throttle(moveY(evt.detail), 50);
  if (absDeltaY > absDeltaX && absDeltaX == 0) throttle(moveY(deltaY), 50);
  if (absDeltaX > absDeltaY && absDeltaY == 0) throttle(moveX(deltaX), 50);
}

function overlayerTouch(direction, distance) {
  const { verticalScrollbar, horizontalScrollbar } = this;
  const { top } = verticalScrollbar.scroll();
  const { left } = horizontalScrollbar.scroll();

  if (direction === "left" || direction === "right") {
    horizontalScrollbar.move({ left: left - distance });
  } else if (direction === "up" || direction === "down") {
    verticalScrollbar.move({ top: top - distance });
  }
}

function verticalScrollbarSet() {
  const { data, verticalScrollbar } = this;
  const { height } = this.getTableOffset();
  const erth = data.exceptRowTotalHeight(0, -1);
  // console.log('erth:', erth);
  verticalScrollbar.set(height, data.rows.totalHeight() - erth);
}

function horizontalScrollbarSet() {
  const { data, horizontalScrollbar } = this;
  const { width } = this.getTableOffset();
  if (data) {
    horizontalScrollbar.set(width, data.cols.totalWidth());
  }
}

function sheetFreeze() {
  const { selector, data, editor } = this;
  const [ri, ci] = data.freeze;
  if (ri > 0 || ci > 0) {
    const fwidth = data.freezeTotalWidth();
    const fheight = data.freezeTotalHeight();
    editor.setFreezeLengths(fwidth, fheight);
  }
  selector.resetAreaOffset();
}

function sheetReset() {
  const { tableEl, overlayerEl, overlayerCEl, table, toolbar, selector, el } =
    this;
  const tOffset = this.getTableOffset();
  const vRect = this.getRect();
  tableEl.attr(vRect);
  overlayerEl.offset(vRect);
  overlayerCEl.offset(tOffset);
  el.css("width", `${vRect.width}px`);
  verticalScrollbarSet.call(this);
  horizontalScrollbarSet.call(this);
  sheetFreeze.call(this);
  table.render();
  toolbar.reset();
  selector.reset();
}

function clearClipboard() {
  const { data, selector } = this;
  data.clearClipboard();
  selector.hideClipboard();
}

function copy(evt) {
  const { data, selector } = this;
  if (data.settings.mode === "read") return;
  data.copy();
  data.copyToSystemClipboard(evt);
  const copiedCellRange = selector.range;
  this.trigger("copied-clipboard", copiedCellRange);
  selector.showClipboard();
}

function cut() {
  const { data, selector } = this;
  if (data.settings.mode === "read") return;
  data.cut();
  const cutCellRange = selector.range;
  this.trigger("cut-clipboard", cutCellRange);
  selector.showClipboard();
}

function paste(what, evt) {
  const { data } = this;
  const eventTrigger = (type = "system") => {
    this.trigger("pasted-clipboard", { type, data });
  };
  if (data.settings.mode === "read") return;
  if (data.clipboard.isClear()) {
    const resetSheet = () => sheetReset.call(this);
    // pastFromSystemClipboard is async operation, need to tell it how to reset sheet and trigger event after it finishes
    // pasting content from system clipboard
    data.pasteFromSystemClipboard(evt, resetSheet);
    eventTrigger("system");
    resetSheet();
  } else if (data.paste(what, (msg) => xtoast("Tip", msg))) {
    eventTrigger("internal");
    sheetReset.call(this);
  } else if (evt) {
    const cdata = evt.clipboardData.getData("text/plain");
    this.data.pasteFromText(cdata);
    eventTrigger("system");
    sheetReset.call(this);
  }
}

function hideRowsOrCols() {
  this.data.hideRowsOrCols();
  sheetReset.call(this);
}

function unhideRowsOrCols(type, index) {
  this.data.unhideRowsOrCols(type, index);
  sheetReset.call(this);
}

function autofilter() {
  const { data } = this;
  data.autofilter();
  sheetReset.call(this);
}

function toolbarChangePaintformatPaste() {
  const { toolbar } = this;
  if (toolbar.paintformatActive()) {
    paste.call(this, "format");
    clearClipboard.call(this);
    toolbar.paintformatToggle();
  }
}

function overlayerMousedown(evt) {
  // console.log(':::::overlayer.mousedown:', evt.detail, evt.button, evt.buttons, evt.shiftKey);
  // console.log('evt.target.className:', evt.target.className);
  const { selector, data, table, sortFilter } = this;
  const { offsetX, offsetY } = evt;
  const isAutofillEl = evt.target.className === `${cssPrefix}-selector-corner`;
  const cellRect = data.getCellRectByXY(offsetX, offsetY);
  const { left, top, width, height } = cellRect;
  let { ri, ci } = cellRect;
  // sort or filter
  const { autoFilter } = data;
  if (autoFilter.includes(ri, ci)) {
    if (left + width - 20 < offsetX && top + height - 20 < offsetY) {
      const items = autoFilter.items(ci, (r, c) => data.rows.getCell(r, c));
      sortFilter.hide();
      sortFilter.set(
        ci,
        items,
        autoFilter.getFilter(ci),
        autoFilter.getSort(ci)
      );
      sortFilter.setOffset({ left, top: top + height + 2 });
      return;
    }
  }

  // console.log('ri:', ri, ', ci:', ci);
  if (!evt.shiftKey) {
    // console.log('selectorSetStart:::');
    if (isAutofillEl) {
      selector.showAutofill(ri, ci);
    } else {
      selectorSet.call(this, false, ri, ci, true, true);
    }

    // mouse move up
    mouseMoveUp(
      window,
      (e) => {
        // console.log('mouseMoveUp::::');
        ({ ri, ci } = data.getCellRectByXY(e.offsetX, e.offsetY));
        if (isAutofillEl) {
          selector.showAutofill(ri, ci);
        } else if (e.buttons === 1 && !e.shiftKey) {
          selectorSet.call(this, true, ri, ci, true, true);
        }
      },
      (e) => {
        if (isAutofillEl && selector.arange && data.settings.mode !== "read") {
          if (
            data.autofill(selector.arange, "all", (msg) => xtoast("Tip", msg))
          ) {
            table.render();
          }
        } else if (!e.shiftKey) {
          const range = this.selector.range;
          const isSingleSelect =
            range.sri === range.eri && range.sci === range.eci;
          selectorSet.call(this, !isSingleSelect, ri, ci, true, false);
        }
        selector.hideAutofill();
        toolbarChangePaintformatPaste.call(this);
      }
    );
  }

  if (!isAutofillEl && evt.buttons === 1) {
    if (evt.shiftKey) {
      // console.log('shiftKey::::');
      selectorSet.call(this, true, ri, ci);
    }
  }
}

function editorSetOffset() {
  const { editor, data } = this;
  const sOffset = data.getSelectedRect();
  const tOffset = this.getTableOffset();
  let sPosition = "top";
  // console.log('sOffset:', sOffset, ':', tOffset);
  if (sOffset.top > tOffset.height / 2) {
    sPosition = "bottom";
  }
  editor.setOffset(sOffset, sPosition);
}

function editorSet() {
  const { editor, data } = this;
  if (editor.formulaCell) return;
  if (data.settings.mode === "read") return;
  editorSetOffset.call(this);
  editor.setCell(data.getSelectedCell(), data.getSelectedValidator());
  clearClipboard.call(this);
}

function verticalScrollbarMove(distance) {
  const { data, table, selector } = this;
  data.scrolly(distance, () => {
    selector.resetBRLAreaOffset();
    editorSetOffset.call(this);
    table.render();
  });
}

function horizontalScrollbarMove(distance) {
  const { data, table, selector } = this;
  data.scrollx(distance, () => {
    selector.resetBRTAreaOffset();
    editorSetOffset.call(this);
    table.render();
  });
}

function rowResizerFinished(cRect, distance) {
  const { ri } = cRect;
  const { table, selector, data } = this;
  const { sri, eri } = selector.range;
  if (ri >= sri && ri <= eri) {
    for (let row = sri; row <= eri; row += 1) {
      data.rows.setHeight(row, distance);
    }
  } else {
    data.rows.setHeight(ri, distance);
  }

  table.render();
  selector.resetAreaOffset();
  verticalScrollbarSet.call(this);
  editorSetOffset.call(this);
}

function colResizerFinished(cRect, distance) {
  const { ci } = cRect;
  const { table, selector, data } = this;
  const { sci, eci } = selector.range;
  if (ci >= sci && ci <= eci) {
    for (let col = sci; col <= eci; col += 1) {
      data.cols.setWidth(col, distance);
    }
  } else {
    data.cols.setWidth(ci, distance);
  }

  table.render();
  selector.resetAreaOffset();
  horizontalScrollbarSet.call(this);
  editorSetOffset.call(this);
}

function dataSetCellText(text, state = "finished") {
  const { data, table, editor } = this;
  const trigger = data?.settings?.mentionProgress?.trigger;
  if (data.settings.mode === "read") return;
  const inputText = editor.inputText;
  const trimmedText = text?.trim?.();
  if (editor.formulaCell && state === "finished") {
    const { ri, ci } = editor.formulaCell;
    data.setFormulaCellText(inputText, ri, ci, state);
    this.trigger("cell-edited", inputText, ri, ci);
    this.trigger("cell-edit-finished", text, ri, ci);
    editor.setFormulaCell(null);
    //The below condition is ro inject variable inside formula when there is only one formula and above case will handle for = sign, if there is more variable or ant this ese then it will go to text
  } else if (
    state === "finished" &&
    trimmedText?.startsWith(trigger) &&
    trimmedText?.split(" ").length === 1
  ) {
    const { ri, ci } = data.selector;
    data.setFormulaCellText(inputText, ri, ci, state);
    this.trigger("cell-edited", inputText, ri, ci);
    this.trigger("cell-edit-finished", text, ri, ci);
  } else if (!editor.formulaCell) {
    data.setSelectedCellText(text, state);
    const { ri, ci } = data.selector;
    if (state === "finished") {
      this.trigger("cell-edit-finished", text, ri, ci);
      table.render();
    } else {
      this.trigger("cell-edited", text, ri, ci);
    }
  }
}

function insertDeleteRowColumn(type) {
  const { data } = this;
  if (data.settings.mode === "read") return;
  if (type === "insert-row") {
    data.insert("row");
  } else if (type === "delete-row") {
    data.delete("row");
  } else if (type === "insert-column") {
    data.insert("column");
  } else if (type === "delete-column") {
    data.delete("column");
  } else if (type === "delete-cell") {
    data.deleteCell();
  } else if (type === "delete-cell-format") {
    data.deleteCell("format");
  } else if (type === "delete-cell-text") {
    data.deleteCell("text");
  } else if (type === "cell-printable") {
    data.setSelectedCellAttr("printable", true);
  } else if (type === "cell-non-printable") {
    data.setSelectedCellAttr("printable", false);
  } else if (type === "cell-editable") {
    data.setSelectedCellAttr("editable", true);
  } else if (type === "cell-non-editable") {
    data.setSelectedCellAttr("editable", false);
  }
  clearClipboard.call(this);
  sheetReset.call(this);
}

function toolbarChange(type, value) {
  const { data, options } = this;
  const { cellConfigButtons = [] } = options;
  if (type === "undo") {
    this.undo();
  } else if (type === "redo") {
    this.redo();
  } else if (type === "print") {
    this.print.preview();
  } else if (type === "paintformat") {
    if (value === true) copy.call(this);
    else clearClipboard.call(this);
  } else if (type === "clearformat") {
    insertDeleteRowColumn.call(this, "delete-cell-format");
  } else if (type === "link") {
    // link
  } else if (type === "chart") {
    // chart
  } else if (type === "autofilter") {
    // filter
    autofilter.call(this);
  } else if (type === "freeze") {
    if (value) {
      const { ri, ci } = data.selector;
      this.freeze(ri, ci);
    } else {
      this.freeze(0, 0);
    }
  } else if (cellConfigButtons?.find((config) => config.tag === type)) {
    data.setSelectedCellAttr(type, value);
    sheetReset.call(this);
  } else if (type === "import") {
    this.data?.rootContext?.importWorkbook(value);
  } else {
    data.setSelectedCellAttr(type, value);
    if (type === "formula" && !data.selector.multiple()) {
      editorSet.call(this);
    }
    sheetReset.call(this);
  }
}

function sortFilterChange(ci, order, operator, value) {
  // console.log('sort:', sortDesc, operator, value);
  this.data.setAutoFilter(ci, order, operator, value);
  sheetReset.call(this);
}

function navigateToCell() {
  const cell = this.data.getSelectedCell();
  const { f } = cell ?? {};
  if (f) {
    const sheetToCellRef = f.match(SHEET_TO_CELL_REF_REGEX);
    if (sheetToCellRef?.length) {
      const [linkSheetName, cellRef] = sheetToCellRef[0]
        .replaceAll("'", "")
        .split("!");
      const [x, y] = expr2xy(cellRef);
      const sheetNames = this.data?.rootContext?.bottombar?.dataNames ?? [];
      const sheetIndex = sheetNames.indexOf(linkSheetName);
      if (sheetIndex !== -1) {
        this.data.rootContext.selectSheet(sheetIndex);
        this.selectCellAndFocus.call(this, y, x);
      }
    } else {
      const cellRef = f.match(CELL_REF_REGEX);
      if (cellRef?.length) {
        const [x, y] = expr2xy(cellRef[0]);
        this.selectCellAndFocus.call(this, y, x);
      }
    }
  }
}

function sheetInitEvents() {
  const {
    selector,
    overlayerEl,
    rowResizer,
    colResizer,
    verticalScrollbar,
    horizontalScrollbar,
    editor,
    contextMenu,
    toolbar,
    modalValidation,
    sortFilter,
    comment,
  } = this;
  // overlayer
  overlayerEl
    .on("mousemove", (evt) => {
      overlayerMousemove.call(this, evt);
    })
    .on("mousedown", (evt) => {
      if (!editor.formulaCell) {
        editor.clear();
      }
      contextMenu.hide();
      // the left mouse button: mousedown → mouseup → click
      // the right mouse button: mousedown → contenxtmenu → mouseup
      if (evt.buttons === 2) {
        if (this.data.xyInSelectedRect(evt.offsetX, evt.offsetY)) {
          contextMenu.setPosition(evt.offsetX, evt.offsetY);
        } else {
          overlayerMousedown.call(this, evt);
          contextMenu.setPosition(evt.offsetX, evt.offsetY);
        }
        evt.stopPropagation();
      } else if (evt.detail === 2) {
        editorSet.call(this);
      } else {
        overlayerMousedown.call(this, evt);
      }
    })
    .on("mousewheel.stop", (evt) => {
      const { className } = evt.target;
      if (className === `${cssPrefix}-overlayer`)
        overlayerMousescroll.call(this, evt);
    })
    .on("mouseout", (evt) => {
      const { offsetX, offsetY } = evt;
      if (offsetY <= 0) colResizer.hide();
      if (offsetX <= 0) rowResizer.hide();
    });

  selector.inputChange = (v) => {
    dataSetCellText.call(this, v, "input");
    editorSet.call(this);
  };

  // slide on mobile
  bindTouch(overlayerEl.el, {
    move: (direction, d) => {
      overlayerTouch.call(this, direction, d);
    },
  });

  // toolbar change
  toolbar.change = (type, value) => toolbarChange.call(this, type, value);

  // sort filter ok
  sortFilter.ok = (ci, order, o, v) =>
    sortFilterChange.call(this, ci, order, o, v);

  // resizer finished callback
  rowResizer.finishedFn = (cRect, distance) => {
    rowResizerFinished.call(this, cRect, distance);
  };
  colResizer.finishedFn = (cRect, distance) => {
    colResizerFinished.call(this, cRect, distance);
  };
  // resizer unhide callback
  rowResizer.unhideFn = (index) => {
    unhideRowsOrCols.call(this, "row", index);
  };
  colResizer.unhideFn = (index) => {
    unhideRowsOrCols.call(this, "col", index);
  };
  // scrollbar move callback
  verticalScrollbar.moveFn = (distance, evt) => {
    verticalScrollbarMove.call(this, distance, evt);
  };
  horizontalScrollbar.moveFn = (distance, evt) => {
    horizontalScrollbarMove.call(this, distance, evt);
  };
  // editor
  editor.change = (state, itext) => {
    if (itext?.trim?.()?.startsWith("=")) {
      const { ri, ci } = this.data.selector;
      if (!editor.formulaCell) {
        editor.setFormulaCell({ ri, ci });
      }
    } else {
      editor.setFormulaCell(null);
    }
    dataSetCellText.call(this, itext, state);
  };
  // modal validation
  modalValidation.change = (action, ...args) => {
    if (action === "save") {
      this.data.addValidation(...args);
    } else {
      this.data.removeValidation();
    }
  };
  // contextmenu
  contextMenu.itemClick = (type) => {
    const extendedContextMenus = this.options.extendedContextMenu;
    if (extendedContextMenus?.length) {
      const flattenedMenu = extendedContextMenus.reduce((acc, item) => {
        acc.push({ key: item.key, title: item.title, callback: item.callback });
        if (item.subMenus) {
          acc = acc.concat(item.subMenus);
        }
        return acc;
      }, []);
      const match = flattenedMenu?.find((menu) => menu.key === type);
      if (match) {
        const { ri, ci, range } = this.data.selector;
        const cell = this.data.getSelectedCell();
        match.callback?.call?.(this, ri, ci, range, cell, match);
      }
    }
    if (type === "validation") {
      modalValidation.setValue(this.data.getSelectedValidation());
    } else if (type === "copy") {
      copy.call(this);
    } else if (type === "cut") {
      cut.call(this);
    } else if (type === "paste") {
      paste.call(this, "all");
    } else if (type === "paste-value") {
      paste.call(this, "text");
    } else if (type === "paste-format") {
      paste.call(this, "format");
    } else if (type === "hide") {
      hideRowsOrCols.call(this);
    } else if (type === "add-comment" || type === "show-comment") {
      comment.show();
      contextMenu.hide();
    } else if (type === "navigate") {
      navigateToCell.call(this);
    } else {
      insertDeleteRowColumn.call(this, type);
    }
  };

  bind(window, "resize", () => {
    this.reload();
  });

  bind(window, "click", (evt) => {
    this.focusing = overlayerEl.contains(evt.target);
  });

  bind(window, "paste", (evt) => {
    if (!this.focusing) return;
    paste.call(this, "all", evt);
    evt.preventDefault();
  });

  bind(window, "copy", (evt) => {
    if (!this.focusing) return;
    copy.call(this, evt);
    evt.preventDefault();
  });

  // for selector
  bind(window, "keydown", (evt) => {
    if (!this.focusing) return;
    const keyCode = evt.keyCode || evt.which;
    const { key, ctrlKey, shiftKey, metaKey } = evt;
    // console.log('keydown.evt: ', keyCode);
    if (ctrlKey || metaKey) {
      // const { sIndexes, eIndexes } = selector;
      // let what = 'all';
      // if (shiftKey) what = 'text';
      // if (altKey) what = 'format';
      switch (keyCode) {
        case 90:
          // undo: ctrl + z
          this.undo();
          evt.preventDefault();
          break;
        case 89:
          // redo: ctrl + y
          this.redo();
          evt.preventDefault();
          break;
        case 67:
          // ctrl + c
          // => copy
          // copy.call(this);
          // evt.preventDefault();
          break;
        case 88:
          // ctrl + x
          cut.call(this);
          evt.preventDefault();
          break;
        case 85:
          // ctrl + u
          toolbar.trigger("underline");
          evt.preventDefault();
          break;
        case 86:
          // ctrl + v
          // => paste
          // evt.preventDefault();
          break;
        case 37:
          // ctrl + left
          selectorMove.call(this, shiftKey, "row-first");
          evt.preventDefault();
          break;
        case 38:
          // ctrl + up
          selectorMove.call(this, shiftKey, "col-first");
          evt.preventDefault();
          break;
        case 39:
          // ctrl + right
          selectorMove.call(this, shiftKey, "row-last");
          evt.preventDefault();
          break;
        case 40:
          // ctrl + down
          selectorMove.call(this, shiftKey, "col-last");
          evt.preventDefault();
          break;
        case 32:
          // ctrl + space, all cells in col
          selectorSet.call(this, false, -1, this.data.selector.ci, false);
          evt.preventDefault();
          break;
        case 66:
          // ctrl + B
          toolbar.trigger("bold");
          break;
        case 73:
          // ctrl + I
          toolbar.trigger("italic");
          break;
        case 65:
          // ctrl + A
          selector.set(-1, -1, true);
          break;
        case 219:
          // Ctrl + [
          navigateToCell.call(this);
        default:
          break;
      }
    } else {
      // console.log('evt.keyCode:', evt.keyCode);
      switch (keyCode) {
        case 32:
          if (shiftKey) {
            // shift + space, all cells in row
            selectorSet.call(this, false, this.data.selector.ri, -1, false);
          }
          break;
        case 27: // esc
          contextMenu.hide();
          clearClipboard.call(this);
          break;
        case 37: // left
          selectorMove.call(this, shiftKey, "left");
          evt.preventDefault();
          break;
        case 38: // up
          selectorMove.call(this, shiftKey, "up");
          evt.preventDefault();
          break;
        case 39: // right
          selectorMove.call(this, shiftKey, "right");
          evt.preventDefault();
          break;
        case 40: // down
          selectorMove.call(this, shiftKey, "down");
          evt.preventDefault();
          break;
        case 9: // tab
          editor.clear();
          // shift + tab => move left
          // tab => move right
          selectorMove.call(this, false, shiftKey ? "left" : "right");
          evt.preventDefault();
          break;
        case 13: // enter
          editor.clear();
          // shift + enter => move up
          // enter => move down
          selectorMove.call(this, false, shiftKey ? "up" : "down");
          evt.preventDefault();
          break;
        case 8: // backspace
          insertDeleteRowColumn.call(this, "delete-cell-text");
          evt.preventDefault();
          break;
        default:
          break;
      }

      if (key === "Delete") {
        insertDeleteRowColumn.call(this, "delete-cell-text");
        evt.preventDefault();
      } else if (
        (keyCode >= 65 && keyCode <= 90) ||
        (keyCode >= 48 && keyCode <= 57) ||
        (keyCode >= 96 && keyCode <= 105) ||
        evt.key === "="
      ) {
        dataSetCellText.call(this, evt.key, "input");
        editorSet.call(this);
      } else if (keyCode === 113) {
        // F2
        editorSet.call(this);
      }
    }
  });

  bind(window, "keyup", (evt) => {
    const keyCode = evt.keyCode || evt.which;
    if (keyCode === 16 || keyCode === 17) {
      const range = this.selector.range;
      if (range.sri === range.eri && range.sci === range.eci) return;
      else {
        const cell = this.data.getCell(range.sri, range.sci);
        this.trigger("cells-selected", cell, range);
      }
    }
  });
  bind(document, "visibilitychange", (evt) => {
    if (document.visibilityState === "hidden") {
      this.data?.clipboard?.clear();
    }
  });
}

export default class Sheet {
  constructor(targetEl, data, options = {}) {
    this.options = options;
    this.eventMap = createEventEmitter();
    const { view, showToolbar, showContextmenu } = data.settings;
    this.el = h("div", `${cssPrefix}-sheet`);
    this.toolbar = new Toolbar(this, data, view.width, !showToolbar);
    this.print = new Print(data);
    targetEl.children(this.toolbar.el, this.el, this.print.el);
    this.data = data;
    // table
    this.tableEl = h("canvas", `${cssPrefix}-table`);
    // resizer
    this.rowResizer = new Resizer(false, data.rows.minHeight);
    this.colResizer = new Resizer(true, data.cols.minWidth);
    // scrollbar
    this.verticalScrollbar = new Scrollbar(true);
    this.horizontalScrollbar = new Scrollbar(false);
    // editor
    this.editor = new Editor(
      this.data,
      formulas,
      () => this.getTableOffset(),
      data.rows.height,
      this.options
    );
    // data validation
    this.modalValidation = new ModalValidation();
    // contextMenu
    this.contextMenu = new ContextMenu(
      this,
      () => this.getRect(),
      !showContextmenu,
      options.extendedContextMenu
    );
    // selector
    this.selector = new Selector(data);
    this.overlayerCEl = h("div", `${cssPrefix}-overlayer-content`).children(
      this.editor.el,
      this.selector.el
    );
    this.overlayerEl = h("div", `${cssPrefix}-overlayer`).child(
      this.overlayerCEl
    );
    // sortFilter
    this.sortFilter = new SortFilter();
    this.comment = new Comment(this, () => this.getRect());
    this.hoverTimer = null;
    // root element
    this.el.children(
      this.tableEl,
      this.overlayerEl.el,
      this.rowResizer.el,
      this.colResizer.el,
      this.verticalScrollbar.el,
      this.horizontalScrollbar.el,
      this.contextMenu.el,
      this.modalValidation.el,
      this.sortFilter.el,
      this.comment.el
    );
    // table
    this.table = new Table(this.tableEl.el, data, this.options);
    sheetInitEvents.call(this);
    sheetReset.call(this);
    // init selector [0, 0]
    selectorSet.call(this, false, 0, 0);
    if (this.options.mode === "read") this.selector.hide();
  }

  on(eventName, func) {
    this.eventMap.on(eventName, func);
    return this;
  }

  trigger(eventName, ...args) {
    const { eventMap } = this;
    eventMap.fire(eventName, args);
  }

  resetData(data) {
    // before
    this.editor.clear();
    // after
    this.data = data;
    verticalScrollbarSet.call(this);
    horizontalScrollbarSet.call(this);
    this.toolbar.resetData(data);
    this.print.resetData(data);
    this.selector.resetData(data);
    this.table.resetData(data);
    this.editor.resetData(data);
    setTimeout(() => {
      this.trigger("grid-load", data);
    });
  }

  loadData(data) {
    this.data.setData(data);
    sheetReset.call(this);
    return this;
  }

  // freeze rows or cols
  freeze(ri, ci) {
    const { data } = this;
    data.setFreeze(ri, ci);
    sheetReset.call(this);
    return this;
  }

  undo() {
    this.data.undo();
    sheetReset.call(this);
  }

  redo() {
    this.data.redo();
    sheetReset.call(this);
  }

  reload() {
    sheetReset.call(this);
    return this;
  }

  getRect() {
    const { data } = this;
    return { width: data.viewWidth(), height: data.viewHeight() };
  }

  getTableOffset() {
    const { rows, cols } = this.data;
    const { width, height } = this.getRect();
    return {
      width: width - cols.indexWidth,
      height: height - rows.height,
      left: cols.indexWidth,
      top: rows.height,
    };
  }

  selectCell(ri, ci) {
    selectorSet.call(this, false, ri, ci);
  }

  selectCellAndFocus(ri, ci) {
    selectorSet.call(this, false, ri, ci);
    scrollbarMove.call(this);
  }

  selectCellsAndFocus(range) {
    const { sri, eri, sci, eci } = range ?? {};
    if (
      isNaN(parseInt(sri)) ||
      isNaN(parseInt(eri)) ||
      isNaN(parseInt(sci)) ||
      isNaN(parseInt(eci))
    ) {
      return;
    }
    if (sri === eri && sci === eci) selectorSet.call(this, false, sri, sci);
    else {
      selectorSet.call(this, false, sri, sci);
      for (let ri = sri; ri <= eri; ri++) {
        for (let ci = sci; ci <= eci; ci++) {
          selectorSet.call(this, true, ri, ci, true, true);
        }
      }
      selectorSet.call(this, true, eri, eci, true, false);
    }
    scrollbarMove.call(this);
  }
}
