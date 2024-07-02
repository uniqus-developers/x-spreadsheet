/* global window, document */
import { h } from "./component/element";
import DataProxy from "./core/data_proxy";
import Sheet from "./component/sheet";
import Bottombar from "./component/bottombar";
import { cssPrefix } from "./config";
import { locale } from "./locale/locale";
import "./index.less";

class Spreadsheet {
  constructor(selectors, options = {}) {
    let targetEl = selectors;
    this.options = { showBottomBar: true, ...options };
    this.sheetIndex = 1;
    this.datas = [];
    if (typeof selectors === "string") {
      targetEl = document.querySelector(selectors);
    }
    this.bottombar = this.options.showBottomBar
      ? new Bottombar(
          () => {
            if (this.options.mode === "read") return;
            const d = this.addSheet();
            this.sheet.resetData(d);
          },
          (index) => {
            this.selectSheet(index);
          },
          () => {
            this.deleteSheet();
          },
          (index, value) => {
            this.renameSheet(index, value);
          }
        )
      : null;
    this.data = this.addSheet();
    const rootEl = h("div", `${cssPrefix}`).on("contextmenu", (evt) =>
      evt.preventDefault()
    );
    // create canvas element
    targetEl.appendChild(rootEl.el);
    this.sheet = new Sheet(rootEl, this.data, this.options);
    if (this.bottombar !== null) {
      rootEl.child(this.bottombar.el);
    }
  }

  addSheet(name, active = true) {
    const n = name || `sheet${this.sheetIndex}`;
    const d = new DataProxy(this, n, this.options);
    d.change = (...args) => {
      this.sheet.trigger("change", ...args);
    };
    this.datas.push(d);
    // console.log('d:', n, d, this.datas);
    if (this.bottombar !== null) {
      this.bottombar.addItem(n, active, this.options);
    }
    if (this.sheetIndex !== 1) {
      this.sheet.trigger("sheet-change", {
        action: "ADD",
        sheet: d,
      });
    }
    this.sheetIndex += 1;
    return d;
  }

  deleteSheet(fireEvent = true) {
    if (this.bottombar === null) return;

    const [oldIndex, nindex] = this.bottombar.deleteItem();
    if (oldIndex >= 0) {
      const deletedSheet = this.datas[oldIndex];
      this.datas.splice(oldIndex, 1);
      if (nindex >= 0) this.sheet.resetData(this.datas[nindex]);
      if (fireEvent) {
        this.sheet.trigger("change");
        this.sheet.trigger("sheet-change", {
          action: "DELETE",
          sheet: deletedSheet,
        });
      }
    }
    this.reRender();
  }

  selectSheet(index) {
    const currentSheet = this.sheet.data;
    const newSheet = this.datas[index];
    if (currentSheet.name !== newSheet.name) {
      this.sheet.resetData(newSheet);
      this.sheet.trigger("sheet-change", {
        action: "SELECT",
        sheet: newSheet,
      });
    }
  }

  renameSheet(index, newSheetName) {
    const oldSheetName = this.datas[index].name;
    this.updateSheetRef(oldSheetName, newSheetName);
    this.datas[index].name = newSheetName;
    this.sheet.trigger("change");
    this.sheet.trigger("sheet-change", {
      action: "RENAME",
      sheet: this.datas[index],
    });
  }

  updateSheetRef(oldSheetName, newSheetName) {
    const sheetToCellRefRegex =
      /(?:'([^']*)'|\b[A-Za-z0-9]+)\![A-Za-z]+[1-9][0-9]*/g;
    this.datas.forEach((d) => {
      d.rows.each((ri, row) => {
        Object.entries(row.cells).forEach(([ci, cell]) => {
          const text = cell?.text ?? "";
          const updatedText = text.replace(sheetToCellRefRegex, (match) => {
            const [sheetName] = match.replaceAll("'", "").split("!");
            if (sheetName === oldSheetName) {
              return match.replace(oldSheetName, newSheetName);
            }
            return match;
          });
          if (updatedText !== text) d.rows.setCellText(ri, ci, updatedText);
        });
      });
    });
  }

  loadData(data) {
    this.reset();
    const ds = Array.isArray(data) ? data : [data];
    if (this.bottombar !== null) {
      this.bottombar.clear();
    }
    this.datas = [];
    if (ds.length > 0) {
      for (let i = 0; i < ds.length; i += 1) {
        const it = ds[i];
        const nd = this.addSheet(it.name, i === 0);
        nd.setData(it);
        if (i === 0) {
          this.sheet.resetData(nd);
        }
      }
    }
    return this;
  }

  getData() {
    return this.datas.map((it) => it.getData());
  }

  cellText(ri, ci, text, sheetIndex = 0) {
    this.datas[sheetIndex].setCellText(ri, ci, text, "finished");
    return this;
  }

  cell(ri, ci, sheetIndex = 0) {
    return this.datas[sheetIndex].getCell(ri, ci);
  }

  cellStyle(ri, ci, sheetIndex = 0) {
    return this.datas[sheetIndex].getCellStyle(ri, ci);
  }

  reRender() {
    this.sheet.table.render();
    return this;
  }

  on(eventName, func) {
    this.sheet.on(eventName, func);
    return this;
  }

  validate() {
    const { validations } = this.data;
    return validations.errors.size <= 0;
  }

  change(cb) {
    this.sheet.on("change", cb);
    return this;
  }

  reset() {
    this.sheetIndex = 1;
    this.deleteSheet(false);
  }

  static locale(lang, message) {
    locale(lang, message);
  }
}

const spreadsheet = (el, options = {}) => new Spreadsheet(el, options);

if (window) {
  window.x_spreadsheet = spreadsheet;
  window.x_spreadsheet.locale = (lang, message) => locale(lang, message);
}

export default Spreadsheet;
export { spreadsheet };
