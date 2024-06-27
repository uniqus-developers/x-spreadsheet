export const getStylingForClass = (styleTag, className) => {
  const cssRules = styleTag?.sheet?.cssRules || styleTag?.sheet?.rules;
  for (let i = 0; i < cssRules?.length; i++) {
    const cssRule = cssRules[i];
    if (cssRule.selectorText === `.${className}`) {
      return cssRule.style.cssText
    }
  }
  return '';
}

export const parseCssToXDataStyles = (styleString) => {
  if (styleString) {
    const parsedStyles = {};
    const fontStyles = {};
    let borderStyles = {};

    const styles = styleString.split(";");
    const stylesObject = {};
    styles.forEach((style) => {
      const [property, value] = style.split(":");
      if (property && value) stylesObject[property.trim()] = value.trim();
    });

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
          parsedStyles["align"] = value;
          break;
        case "vertical-align":
          parsedStyles["valign"] = value;
          break;
        case "font-weight":
          const parsedIntValue = parseInt(value)
          fontStyles["bold"] = ((parsedIntValue !== NaN && parsedIntValue > 400) || value === "bold");
          break;
        case "font-size":
          fontStyles["size"] = value.split("px")?.[0] ?? "";
          break;
        case "font-style":
          fontStyles["italic"] = value === "italic";
          break;
        case "font-family":
          fontStyles["name"] = value;
          break;
        case "border":
        case "border-top":
        case "border-bottom":
        case "border-left":
        case "border-right":
          const regexp = /[^\s\(]+(\(.+\))?/g;
          const values = String(value).match(regexp) ?? [];
          let parsedValues = [];
          if (values.length > 2) {
            const intValue = Number(values[0]?.split("px")?.[0]);
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
          }
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
          break;
      }
    });
    parsedStyles["font"] = fontStyles;
    if (Object.keys(borderStyles).length) parsedStyles["border"] = borderStyles;
    return parsedStyles;
  }
  return {};
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