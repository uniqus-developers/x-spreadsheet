export default class SheetConfig {
  constructor(name, settings) {
    this.name = name;
    this.settings = settings;
    this.gridLine = settings.showGrid ?? true;
  }

  setData(data) {
    this.gridLine = data.gridLine;
  }

  getData(data) {
    return this;
  }

  setGrid(status) {
    this.gridLine = status;
  }

  getGrid() {
    return this.gridLine;
  }
}
