function sheetContextEvents() {
  const { table, toolBar } = this;
  const gridCallBack = (status) => {
    table.setGridStatus(status);
  };
  toolBar.gridEl.setClickCallback(gridCallBack);
}

function setInitialSet() {
  const { table, toolBar, options } = this;
  const { initialGridStatus } = options;
  toolBar.gridEl.setState(initialGridStatus);
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
}
