export default class Variable {
  constructor(rootContext) {
    this.rootContext = rootContext;
    this.map = {};
  }

  setVariableMap(map) {
    this.map = map;
    this.rootContext.sheet.table.render();
  }

  getVariableMap() {
    return this.map;
  }

  storeVariable(text, initialValue) {
    this.map[text] = initialValue;
  }

  removeVariable(text) {
    delete this.map[text];
  }
}
