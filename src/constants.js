const REF_ERROR = "#REF!";
const GENERAL_ERROR = "#ERROR";

const CELL_REF_REGEX = /\b[A-Za-z]+[1-9][0-9]*\b/g;
const CELL_RANGE_REGEX =
  /\$?[A-Za-z]+\$?[1-9][0-9]*:\$?[A-Za-z]+\$?[1-9][0-9]*/gi;
const SPACE_REMOVAL_REGEX = /\s+(?=(?:[^']*'[^']*')*[^']*$)/g;
const SHEET_TO_CELL_REF_REGEX =
  /(?:'([^']*)'|\b[A-Za-z0-9]+)\![A-Za-z]+[1-9][0-9]*/g;
const CELL_REF_REPLACE_REGEX = /(?:\b[A-Za-z0-9_]+\b!)?[A-Za-z]+\d+\b/g;

const PX_TO_PT = 0.75;

const AVAILABLE_FEATURES = [
  "import",
  "undo",
  "redo",
  "print",
  "paintFormat",
  "clearFormat",
  "format",
  "font",
  "fontSize",
  "bold",
  "italic",
  "underline",
  "strike",
  "textColor",
  "fillColor",
  "border",
  "merge",
  "grid",
  "align",
  "vAlign",
  "textWrap",
  "freeze",
  "autoFilter",
  "formula",
];

export {
  REF_ERROR,
  GENERAL_ERROR,
  CELL_REF_REGEX,
  CELL_RANGE_REGEX,
  SPACE_REMOVAL_REGEX,
  SHEET_TO_CELL_REF_REGEX,
  CELL_REF_REPLACE_REGEX,
  PX_TO_PT,
  AVAILABLE_FEATURES,
};
