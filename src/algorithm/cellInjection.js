const constructFormula = (string, cell, isRange, append) => {
  const lastChar = string?.slice(-1);
  if (lastChar) {
    const operationArray = ["+", "-", "*", "/", "=", ",", "("];
    let maxIndex = -1;
    let indexObj = {};
    operationArray.forEach((operator) => {
      const lastIndex = string.lastIndexOf(operator);
      indexObj[operator] = lastIndex;
      maxIndex = Math.max(maxIndex, lastIndex);
    });
    if (string?.endsWith(")") && isRange) {
      const subString = string.substring(0, maxIndex);
      return `${subString}(${cell})`;
    } else if (string?.endsWith(")")) {
      return string;
    } else if (append) {
      return `${string}${operationArray?.includes(lastChar) ? "" : ","}${cell}`;
    } else if (isRange) {
      return string?.endsWith("(") ? `${string}${cell})` : `${string}(${cell})`;
    } else if (string?.length - 1 === maxIndex) {
      return `${string}${cell}`;
    } else if (maxIndex >= 0) {
      return `${string?.substring(0, maxIndex + 1)}${cell}`;
    } else {
      return string;
    }
  } else {
    return string;
  }
};

const getColumnName = (columnIndex) => {
  let columnName = "";
  while (columnIndex >= 0) {
    columnName = String.fromCharCode((columnIndex % 26) + 65) + columnName;
    columnIndex = Math.floor(columnIndex / 26) - 1;
  }
  return columnName;
};

const getCellName = (rowIndex, columnIndex) => {
  const columnName = getColumnName(columnIndex);
  const rowName = rowIndex + 1;
  return columnName + rowName;
};

export { constructFormula, getCellName };
