import ExcelJs from "exceljs";
import * as XLSX from "xlsx";
import {
  PX_TO_PT,
  CELL_REF_REPLACE_REGEX,
  SHEET_TO_CELL_REF_REGEX,
  INDEXED_COLORS,
  EXTRACT_MSO_NUMBER_FORMAT_REGEX,
} from "./constants";
import { fonts } from "./core/font";
import { npx } from "./canvas/draw";

const avialableFonts = Object.keys(fonts());

const getStylingForClass = (styleTag, className) => {
  const cssRules = styleTag?.sheet?.cssRules || styleTag?.sheet?.rules;
  for (let i = 0; i < cssRules?.length; i++) {
    const cssRule = cssRules[i];
    if (cssRule.selectorText === `.${className}`) {
      return cssRule.style.cssText;
    }
  }
  return "";
};

const parseCssToXDataStyles = (styleString, cellType) => {
  const parsedStyles = {};
  // By default numbers are right aligned.
  if (cellType === "n") parsedStyles.align = "right";
  if (styleString) {
    const fontStyles = {};
    let borderStyles = {};
    const dimensions = {};
    const styles = styleString.split(";");
    const stylesObject = {};
    styles.forEach((style) => {
      const [property, value] = style.split(":");
      if (property && value) stylesObject[property.trim()] = value.trim();
    });

    let gridStatus = false;
    const parsedStylesObject = parseBorderProperties(stylesObject);
    Object.entries(parsedStylesObject).forEach(([property, value]) => {
      switch (property) {
        case "background":
        case "background-color":
          parsedStyles["bgcolor"] = value;
          break;
        case "color":
          parsedStyles["color"] = value;
          break;
        case "text-decoration":
          if (value === "underline") parsedStyles["underline"] = true;
          else if (value === "line-through") parsedStyles["strike"] = true;
          break;
        case "text-align":
          parsedStyles["align"] = value === "justify" ? "center" : value;
          break;
        case "vertical-align":
          parsedStyles["valign"] = ["justify", "center"].includes(value)
            ? "middle"
            : value;
          break;
        case "font-weight":
          const parsedIntValue = parseInt(value);
          fontStyles["bold"] =
            (parsedIntValue !== NaN && parsedIntValue > 400) ||
            value === "bold";
          break;
        case "font-size":
          fontStyles["size"] = parsePtOrPxValue(value, property);
          break;
        case "font-style":
          fontStyles["italic"] = value === "italic";
          break;
        case "font-family":
          const appliedFont =
            avialableFonts.find((font) => value.includes(font)) ?? "Arial";
          fontStyles["name"] = appliedFont;
          break;
        case "border":
        case "border-top":
        case "border-bottom":
        case "border-left":
        case "border-right":
          if (property === "border" && !gridStatus && value === "0px") {
            gridStatus = true;
          }
          const regexp = /[^\s\(]+(\(.+\))?/g;
          const values = String(value).match(regexp) ?? [];
          let parsedValues = [];
          if (values.length > 2) {
            const intValue = parsePtOrPxValue(values[0]);
            const lineStyle =
              values[1] === "solid"
                ? intValue <= 1
                  ? "thin"
                  : intValue <= 2
                    ? "medium"
                    : "thick"
                : values[1];
            const color = ["black", "initial"].includes(values[2])
              ? "#000000"
              : values[2];
            parsedValues = [lineStyle, color];
            if (property === "border") {
              borderStyles = {
                top: parsedValues,
                bottom: parsedValues,
                left: parsedValues,
                right: parsedValues,
              };
            } else {
              const side = property.split("-")[1];
              borderStyles[side] = parsedValues;
            }
          }
          break;
        case "width":
          const widthValue = parsePtOrPxValue(value);
          if (widthValue) dimensions.width = widthValue;
          break;
        case "height":
          const heightValue = parsePtOrPxValue(value);
          if (heightValue) dimensions.height = heightValue;
          break;
        case "text-wrap":
          parsedStyles["textwrap"] = value === "wrap";
          break;
      }
    });
    parsedStyles["dimensions"] = dimensions;
    parsedStyles["font"] = fontStyles;
    if (Object.keys(borderStyles).length) parsedStyles["border"] = borderStyles;
    return { parsedStyles, sheetConfig: { gridLine: gridStatus } };
  }
  return { parsedStyles, sheetConfig: { gridLine: false } };
};

const parseBorderProperties = (styles) => {
  const border = {
    "border-top": {},
    "border-right": {},
    "border-bottom": {},
    "border-left": {},
  };
  const others = {};
  const parsedBorders = {};
  for (const key in styles) {
    if (styles.hasOwnProperty(key)) {
      const parts = key.split("-");
      if (
        parts.length === 3 &&
        parts[0] === "border" &&
        ["style", "width", "color"].includes(parts[2])
      ) {
        const side = parts[1];
        const propertyName = "border-" + side;
        if (!border[propertyName]) {
          border[propertyName] = {};
        }
        border[propertyName][parts[2]] = styles[key];
      } else if (
        parts.length === 2 &&
        parts[0] === "border" &&
        ["style", "width", "color"].includes(parts[1])
      ) {
        let value = [];
        if (parts[1] === "color" && styles[key]?.includes("rgb")) {
          value = styles[key].replaceAll(" ", "").split(")");
          value.pop();
          value = value.map((val) => `${val})`);
        } else {
          value = styles[key]?.split(" ");
        }
        if (value.length === 1) {
          border[`border-top`][parts[1]] = value[0];
          border[`border-bottom`][parts[1]] = value[0];
          border[`border-left`][parts[1]] = value[0];
          border[`border-right`][parts[1]] = value[0];
        } else if (value.length === 2) {
          border[`border-top`][parts[1]] = value[0];
          border[`border-bottom`][parts[1]] = value[0];
          border[`border-left`][parts[1]] = value[1];
          border[`border-right`][parts[1]] = value[1];
        } else if (value.length === 3) {
          border[`border-top`][parts[1]] = value[0];
          border[`border-right`][parts[1]] = value[1];
          border[`border-left`][parts[1]] = value[1];
          border[`border-bottom`][parts[1]] = value[2];
        } else if (value.length === 4) {
          border[`border-top`][parts[1]] = value[0];
          border[`border-right`][parts[1]] = value[1];
          border[`border-bottom`][parts[1]] = value[2];
          border[`border-left`][parts[1]] = value[3];
        }
      } else {
        others[key] = styles[key];
      }
    }
  }

  Object.keys(border).forEach((key) => {
    const value = border[key];
    if (Object.keys(value).length === 3) {
      const parsedValue =
        value["width"] === "0px"
          ? "none"
          : `${value["width"]} ${value["style"]} ${value["color"]}`;
      parsedBorders[key] = parsedValue;
    }
  });

  return { ...parsedBorders, ...others };
};

const parsePtOrPxValue = (value, property = null) => {
  let parsedValue = value;
  if (value) {
    if (value.includes("px")) {
      parsedValue = Math.ceil(Number(value.split("px")[0]));
    } else if (value.includes("pt")) {
      if (property === "font-size")
        parsedValue = Math.ceil(Number(value.split("pt")[0]));
      else parsedValue = Math.ceil(Number(value.split("pt")[0]) / PX_TO_PT);
    }
  }
  return parsedValue;
};

const parseHtmlToText = (function () {
  const entities = [
    ["nbsp", ""],
    ["middot", "·"],
    ["quot", '"'],
    ["apos", "'"],
    ["gt", ">"],
    ["lt", "<"],
    ["amp", "&"],
  ].map(function (x) {
    return [new RegExp("&" + x[0] + ";", "ig"), x[1]];
  });
  return function parseHtmlToText(str) {
    let o = str
      // Remove new lines and spaces from start of content
      .replace(/^[\t\n\r ]+/, "")
      // Remove new lines and spaces from end of content
      .replace(/[\t\n\r ]+$/, "")
      // Added line which removes any white space characters after and before html tags
      .replace(/>\s+/g, ">")
      .replace(/\s+</g, "<")
      // Replace remaining new lines and spaces with space
      .replace(/[\t\n\r ]+/g, " ")
      // Replace <br> tags with new lines
      .replace(/<\s*[bB][rR]\s*\/?>/g, "\n")
      // Strip HTML elements
      .replace(/<[^>]*>/g, "");
    for (let i = 0; i < entities.length; ++i)
      o = o.replace(entities[i][0], entities[i][1]);
    return o;
  };
})();

const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36);
  return timestamp + random;
};

// Function to match the pattern and replace it
const replaceCellRefWithNew = (str, getNewCell, opts) => {
  const { isSameSheet, sheetName } = opts;
  const newStr = str.replace(
    isSameSheet ? CELL_REF_REPLACE_REGEX : SHEET_TO_CELL_REF_REGEX,
    (word) => {
      const parts = word.split("!");
      if (parts.length > 1) {
        if (parts[0].replaceAll("'", "") === sheetName) {
          const newCell = getNewCell(parts[1]);
          return `${parts[0]}!${newCell}`;
        } else {
          return word;
        }
      } else if (isSameSheet) {
        const newCell = getNewCell(parts[0]);
        return newCell;
      }
    }
  );
  return newStr;
};

const readExcelFile = (file) => {
  const ExcelWorkbook = new ExcelJs.Workbook();
  const styles = {};
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      ExcelWorkbook.xlsx.load(reader.result).then((workbookIns) => {
        workbookIns.eachSheet((sheet) => {
          const sheetName = sheet?.name;
          styles[sheetName] = {};
          sheet.eachRow({ includeEmpty: true }, (row) => {
            row?.eachCell({ includeEmpty: true }, (cell) => {
              const style = cell.style;
              const address = cell.address;
              styles[sheetName][address] = style;
            });
          });
        });

        const data = new Uint8Array(e.target?.result);
        const wb = XLSX?.read(data, {
          type: "array",
          cellStyles: true,
          sheetStubs: true,
        });

        const workbook = addStylesToWorkbook(styles, wb);
        resolve(workbook);
      });
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};

const parseExcelStyleToHTML = (styling, theme) => {
  let styleString = "";
  const parsedStyles = {};
  Object.keys(styling)?.forEach((styleOn) => {
    const style = styling[styleOn];
    switch (styleOn) {
      case "alignment":
        Object.keys(style).forEach((property) => {
          const value = style[property];
          switch (property) {
            case "vertical":
              parsedStyles["display"] = "table-cell";
              parsedStyles["vertical-align"] = value;
              break;
            case "horizontal":
              parsedStyles["text-align"] = value;
              break;
            case "wrapText":
              parsedStyles["text-wrap"] = value ? "wrap" : "nowrap";
              break;
          }
        });
        break;
      case "border":
        Object.keys(style).forEach((side) => {
          const value = style[side];
          switch (side) {
            case "top":
            case "bottom":
            case "right":
            case "left":
              if (value?.style && value.rgb)
                parsedStyles[`border-${side}`] =
                  `1px ${value.style} ${value.rgb};`;
              else if (value?.color?.indexed) {
                const color = INDEXED_COLORS[value.color.indexed] ?? "#000000";
                parsedStyles[`border-${side}`] =
                  `1px ${value.style ?? "solid"} ${color}`;
              }
              break;
          }
        });
        break;
      case "fill":
        Object.keys(style)?.forEach((property) => {
          const value = style[property];
          switch (property) {
            case "bgColor":
            case "fgColor":
              if (value?.rgb) {
                parsedStyles["background-color"] = value.rgb.startsWith("#")
                  ? value.rgb
                  : `#${value.rgb}`;
              } else if (value?.argb) {
                parsedStyles["background-color"] = value.argb.startsWith("#")
                  ? `#${value.argb.slice(3)}`
                  : `#${value.argb.slice(2)}`;
              } else if (value?.theme && Object.hasOwn(theme, value.theme))
                parsedStyles["background-color"] =
                  `#${theme[value.theme].rgb}` ?? "#ffffff";
              else if (value?.color?.indexed) {
                const color = INDEXED_COLORS[value.color.indexed] ?? "#ffffff";
                parsedStyles[`background-color`] = color;
              }
              break;
          }
        });
        break;
      case "font":
        Object.keys(style)?.forEach((property) => {
          const value = style[property];
          switch (property) {
            case "bold":
              parsedStyles["font-weight"] = value ? "bold" : "normal";
              break;
            case "color":
              if (value?.rgb) {
                parsedStyles["color"] = value.rgb.startsWith("#")
                  ? value.rgb
                  : `#${value.rgb}`;
              } else if (value?.argb) {
                parsedStyles["color"] = value.argb.startsWith("#")
                  ? `#${value.argb.slice(3)}`
                  : `#${value.argb.slice(2)}`;
              } else if (value?.theme && Object.hasOwn(theme, value.theme)) {
                parsedStyles["color"] =
                  `#${theme[value.theme].rgb}` ?? "#000000";
              } else if (value?.color?.indexed) {
                const color = INDEXED_COLORS[value.color.indexed] ?? "#000000";
                parsedStyles[`color`] = color;
              }
              break;
            case "sz":
            case "size":
              const convertedValue = Number(value) ?? 11;
              parsedStyles["font-size"] = `${convertedValue}px`;
              break;
            case "italic":
              parsedStyles["font-style"] = value ? "italic" : "normal";
              break;
            case "name":
              parsedStyles["font-family"] = value;
              break;
            case "underline":
            case "strike":
              parsedStyles["text-decoration"] = value
                ? property === "underline"
                  ? "underline"
                  : "line-through"
                : "none";
              break;
          }
        });
        break;
      case "dimensions":
        Object.keys(style)?.forEach((property) => {
          const value = style[property];
          switch (property) {
            case "height":
            case "width":
              parsedStyles[property] = value;
              break;
          }
        });
    }
  });

  Object.entries(parsedStyles).forEach(([property, value]) => {
    styleString = `${styleString}${property}:${value};`;
  });

  return styleString;
};

const addStylesToWorkbook = (styles, workbook) => {
  const wb = { ...workbook };
  wb.SheetNames.forEach((sheetName) => {
    const worksheet = wb.Sheets[sheetName];
    if (Object.hasOwn(styles, sheetName)) {
      Object.entries(styles[sheetName]).forEach(([cellAddress, cellStyle]) => {
        if (Object.hasOwn(worksheet, cellAddress)) {
          const { r, c } = XLSX.utils.decode_cell(cellAddress);
          const dimensions = {};

          const height = worksheet?.["!rows"]?.[r]?.hpt;
          const width = worksheet?.["!cols"]?.[c]?.wpx;

          if (height) dimensions.height = `${height / 0.75}px`;
          if (width) dimensions.width = `${width}px`;

          const cellStylesWithDimensions = {
            ...(cellStyle ?? {}),
            dimensions,
          };

          worksheet[cellAddress] = {
            ...worksheet[cellAddress],
            s: parseExcelStyleToHTML(
              cellStylesWithDimensions,
              wb.Themes?.themeElements?.clrScheme ?? {}
            ),
          };
        }
      });
    }
  });
  return wb;
};

const stox = (wb) => {
  const out = [];
  wb.SheetNames.forEach(function (name) {
    const o = { name: name, rows: {}, cols: {}, styles: [] };
    const ws = wb.Sheets[name];
    let gridStatus = false;
    if (!ws || !ws["!ref"]) return;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    // sheet_to_json will lost empty row and col at begin as default

    // Populating 100 rows and a-z columns by default.
    if (range?.e) {
      if (range.e.r < 99) range.e.r = 99;
      if (range.e.c < 25) range.e.c = 25;
    } else {
      range.e = {
        r: 99,
        c: 25,
      };
    }

    range.s = { r: 0, c: 0 };
    const aoa = XLSX.utils.sheet_to_json(ws, {
      raw: false,
      header: 1,
      range: range,
    });

    aoa.forEach(function (r, i) {
      const cells = {};
      let rowHeight = null;
      r.forEach(function (c, j) {
        cells[j] = { text: c || String(c) };
        const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
        const formattedText = ws[cellRef].w ?? "";
        cells[j].formattedText = formattedText;
        const cellStyle = ws[cellRef].s ?? "";
        const cellMeta = ws[cellRef].metadata;
        const cellType = ws[cellRef].t;
        const parsedData = parseCssToXDataStyles(cellStyle, cellType);
        const parsedCellStyles = parsedData.parsedStyles;
        const sheetConfig = parsedData.sheetConfig;
        if (!gridStatus && sheetConfig?.gridLine) {
          gridStatus = true;
        }
        const dimensions = parsedCellStyles.dimensions;
        delete parsedCellStyles.dimensions;
        if (Object.keys(parsedCellStyles).length) {
          const length = o.styles.push(parsedCellStyles);
          cells[j].style = length - 1;
        }

        if (ws[cellRef]?.f && ws[cellRef].f !== "") {
          cells[j].text = "=" + ws[cellRef].f;
        }

        if (dimensions?.height) rowHeight = dimensions.height;
        if (dimensions?.width) {
          o.cols[j] = { width: dimensions.width };
        }
        if (cellMeta) {
          cells[j].cellMeta = cellMeta;
        }
      });
      if (rowHeight) o.rows[i] = { cells: cells, height: rowHeight };
      else o.rows[i] = { cells: cells };
    });
    o.rows.len = aoa.length;

    o.merges = [];
    (ws["!merges"] || []).forEach(function (merge, i) {
      //Needed to support merged cells with empty content
      if (o.rows[merge.s.r] == null) {
        o.rows[merge.s.r] = { cells: {} };
      }
      if (o.rows[merge.s.r].cells[merge.s.c] == null) {
        o.rows[merge.s.r].cells[merge.s.c] = {};
      }

      o.rows[merge.s.r].cells[merge.s.c].merge = [
        merge.e.r - merge.s.r,
        merge.e.c - merge.s.c,
      ];

      o.merges[i] = XLSX.utils.encode_range(merge);
    });
    o.sheetConfig = { gridLine: !gridStatus };
    out.push(o);
  });

  return out;
};

const rgbaToRgb = (hexColor) => {
  // Assuming a white background, so the background RGB is (255, 255, 255)
  const backgroundR = 255,
    backgroundG = 255,
    backgroundB = 255;

  // Extract RGBA from hex
  let r = parseInt(hexColor.slice(1, 3), 16);
  let g = parseInt(hexColor.slice(3, 5), 16);
  let b = parseInt(hexColor.slice(5, 7), 16);
  let a = parseInt(hexColor.slice(7, 9), 16) / 255.0; // Convert alpha to a scale of 0 to 1

  // Calculate new RGB by blending the original color with the background
  let newR = Math.round((1 - a) * backgroundR + a * r);
  let newG = Math.round((1 - a) * backgroundG + a * g);
  let newB = Math.round((1 - a) * backgroundB + a * b);

  // Convert RGB back to hex
  let newHexColor =
    "#" + ((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1);

  return newHexColor.toUpperCase(); // Convert to uppercase as per original Python function
};

const getNewSheetName = (name, existingNames) => {
  let numericPart = name.match(/\d+$/);
  let baseName = name.replace(/\d+$/, "");

  if (!numericPart) {
    numericPart = "1";
  } else {
    numericPart = String(parseInt(numericPart[0], 10) + 1);
  }

  let newName = baseName + numericPart;

  while (existingNames.includes(newName)) {
    numericPart = String(parseInt(numericPart, 10) + 1);
    newName = baseName + numericPart;
  }

  return newName;
};

const getRowHeightForTextWrap = (ctx, textWrap, biw, text, fontSize) => {
  const txts = `${text}`.split("\n");
  const ntxts = [];
  txts.forEach((it) => {
    const txtWidth = ctx.measureText(it).width;
    if (textWrap && txtWidth > npx(biw)) {
      let textLine = { w: 0, len: 0, start: 0 };
      for (let i = 0; i < it.length; i += 1) {
        if (textLine.w >= npx(biw)) {
          ntxts.push(it.substr(textLine.start, textLine.len));
          textLine = { w: 0, len: 0, start: i };
        }
        textLine.len += 1;
        textLine.w += ctx.measureText(it[i]).width + 1;
      }
      if (textLine.len > 0) {
        ntxts.push(it.substr(textLine.start, textLine.len));
      }
    } else {
      ntxts.push(it);
    }
  });
  const rowHeight = ntxts.length * (fontSize + 2);
  return rowHeight;
};

const deepClone = (data) => JSON.parse(JSON.stringify(data));

const getNumberFormatFromStyles = (styleTag) => {
  const styleContent = styleTag.innerHTML;
  let match;
  const results = {};

  while (
    (match = EXTRACT_MSO_NUMBER_FORMAT_REGEX.exec(styleContent)) !== null
  ) {
    const className = match[1].replace("\n\t", "");
    const msoNumberFormat = match[2]
      .trim()
      .replaceAll("\\", "")
      .replaceAll("0022", "")
      .replaceAll('"', "");
    results[className] = msoNumberFormat?.slice(0, -1)?.trim() ?? "";
  }
  return results;
};

function generateSSFFormat(
  groupingSymbol = ",",
  digitGrouping = "",
  decimalUpto = 2,
  customFormat = "normal"
) {
  let formatString = "";

  switch (customFormat.toLowerCase()) {
    case "text":
      formatString = "@"; // Text format
      break;
    case "number":
      formatString = generateNumberFormat(
        groupingSymbol,
        digitGrouping,
        decimalUpto
      );
      break;
    case "percent":
      formatString =
        generateNumberFormat(groupingSymbol, digitGrouping, decimalUpto) + "%";
      formatString = formatString.replace(/0/, "0%"); // Ensures proper percentage formatting
      break;
    case "rmb":
      formatString =
        '"¥"' +
        generateNumberFormat(groupingSymbol, digitGrouping, decimalUpto);
      break;
    case "usd":
      formatString =
        '"$"' +
        generateNumberFormat(groupingSymbol, digitGrouping, decimalUpto);
      break;
    case "eur":
      formatString =
        '"€"' +
        generateNumberFormat(groupingSymbol, digitGrouping, decimalUpto);
      break;
    case "date":
      formatString = "yyyy-mm-dd";
      break;
    case "time":
      formatString = "hh:mm:ss";
      break;
    case "datetime":
      formatString = "yyyy-mm-dd hh:mm:ss";
      break;
    case "duration":
      formatString = "[hh]:mm:ss";
      break;
    default:
      formatString = generateNumberFormat(
        groupingSymbol,
        digitGrouping,
        decimalUpto
      );
      break;
  }

  return formatString;
}

function generateNumberFormat(groupingSymbol, digitGrouping, decimalUpto) {
  const integerPart = digitGrouping?.split(".")[0] ?? "";
  const groupingPositions = integerPart.split(groupingSymbol);
  const primaryGroupingSize =
    groupingPositions?.length > 1 ? groupingPositions[1].length : 3;

  let groupingPart = "#";
  if (primaryGroupingSize === 3) {
    groupingPart = "#,##0";
  } else {
    groupingPart = "#".repeat(primaryGroupingSize - 1) + "##0";
  }

  if (groupingSymbol !== ",") {
    groupingPart = groupingPart.replace(/,/g, groupingSymbol);
  }

  let decimalPart = "";
  if (decimalUpto > 0) {
    decimalPart = "." + "0".repeat(decimalUpto);
  }

  const formatString = groupingPart + decimalPart;

  // Add handling for negative values and zero
  const negativePart = `(${groupingPart + decimalPart})`; // Enclose negative numbers in parentheses
  const zeroPart = "-"; // Show zero as a dash
  // Return the final format string, including positive, negative, and zero formats
  return `${formatString};${negativePart};${zeroPart}`;
}

export {
  getStylingForClass,
  parseCssToXDataStyles,
  parseHtmlToText,
  generateUniqueId,
  replaceCellRefWithNew,
  readExcelFile,
  stox,
  rgbaToRgb,
  getNewSheetName,
  getRowHeightForTextWrap,
  deepClone,
  getNumberFormatFromStyles,
  generateSSFFormat,
};
