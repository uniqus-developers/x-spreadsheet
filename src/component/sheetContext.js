function sheetContextEvents() {
  const { table, toolBar, data } = this;
  const gridCallBack = (status) => {
    table.setGridStatus(status);
    data.sheetConfig.setGrid(status);
  };
  toolBar.gridEl.setClickCallback(gridCallBack);
}

function setInitialSet() {
  const { table, toolBar, data } = this;
  const { sheetConfig } = data;
  toolBar.gridEl.setState(!!sheetConfig?.gridLine);
  table.setGridStatus(!!sheetConfig?.gridLine);
}

export default class SheetContext {
  constructor(table, toolBar, data, options = {}) {
    this.table = table;
    this.toolBar = toolBar;
    this.data = data;
    this.options = options;
    setInitialSet.call(this);
    sheetContextEvents.call(this);
  }

  resetState(data) {
    this.data = data;
    setInitialSet.call(this);
    sheetContextEvents.call(this);
  }
}
