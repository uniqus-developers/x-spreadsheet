export default class CellConfig {
  constructor(name, settings) {
    this.name = name;
    this.cellButtons = settings.cellConfigButtons;
  }

  setData(data) {
    this.setting = data;
  }

  getData(data) {
    return this;
  }
}
