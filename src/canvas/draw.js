import html2canvas from "html2canvas";
import { DEFAULT_ROW_HEIGHT } from "../constants";
/* global window */
function dpr() {
  return window.devicePixelRatio || 1;
}

function thinLineWidth() {
  return dpr() - 0.5;
}

function npx(px) {
  return parseInt(px * dpr(), 10);
}

function npxLine(px) {
  const n = npx(px);
  return n > 0 ? n - 0.5 : 0.5;
}

class DrawBox {
  constructor(x, y, w, h, padding = 0) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.padding = padding;
    this.bgcolor = "#ffffff";
    // border: [width, style, color]
    this.borderTop = null;
    this.borderRight = null;
    this.borderBottom = null;
    this.borderLeft = null;
    this.iconCount = 0;
  }

  getIconCount() {
    return this.iconCount;
  }

  setIconCount(count) {
    this.iconCount = count;
  }

  setBorders({ top, bottom, left, right }) {
    if (top) this.borderTop = top;
    if (right) this.borderRight = right;
    if (bottom) this.borderBottom = bottom;
    if (left) this.borderLeft = left;
  }

  innerWidth() {
    return this.width - this.padding * 2 - 2;
  }

  innerHeight() {
    return this.height - this.padding * 2 - 2;
  }

  textx(align) {
    const { width, padding } = this;
    let { x } = this;
    if (align === "left" || align === "start") {
      x += padding;
    } else if (align === "center") {
      x += width / 2;
    } else if (align === "right" || align === "end") {
      x += width - padding;
    }
    return x;
  }

  texty(align, h, textStart) {
    const { height, padding } = this;
    let { y } = this;
    if (align === "top") {
      y += padding + textStart;
    } else if (align === "middle") {
      y += height / 2 - h / 2 + textStart;
    } else if (align === "bottom") {
      y += height - padding - h + textStart;
    }
    return y;
  }

  topxys() {
    const { x, y, width } = this;
    return [
      [x, y],
      [x + width, y],
    ];
  }

  rightxys() {
    const { x, y, width, height } = this;
    return [
      [x + width, y],
      [x + width, y + height],
    ];
  }

  bottomxys() {
    const { x, y, width, height } = this;
    return [
      [x, y + height],
      [x + width, y + height],
    ];
  }

  leftxys() {
    const { x, y, height } = this;
    return [
      [x, y],
      [x, y + height],
    ];
  }
}

function drawFontLine(type, tx, ty, align, valign, blheight, blwidth) {
  const floffset = { x: 0, y: 0 };
  if (type === "underline") {
    if (valign === "bottom") {
      floffset.y = 0;
    } else if (valign === "top") {
      floffset.y = -(blheight + 2);
    } else {
      floffset.y = -blheight / 2;
    }
  } else if (type === "strike") {
    if (valign === "bottom") {
      floffset.y = blheight / 2;
    } else if (valign === "top") {
      floffset.y = -(blheight / 2 + 2);
    }
  }

  if (align === "center") {
    floffset.x = blwidth / 2;
  } else if (align === "right") {
    floffset.x = blwidth;
  }
  this.line(
    [tx - floffset.x, ty - floffset.y],
    [tx - floffset.x + blwidth, ty - floffset.y]
  );
}

class Draw {
  constructor(el, width, height, options = {}, data = {}) {
    this.options = options;
    this.el = el;
    this.ctx = el.getContext("2d", { willReadFrequently: true });
    this.resize(width, height);
    this.ctx.scale(dpr(), dpr());
    this.numberRegexObject = {
      ",": /^[+-]?[0-9,]*(\.[0-9,]*)?$/,
      ".": /^[+-]?[0-9.]*(\,[0-9.]*)?$/,
      "'": /^[+-]?[0-9']*(\.[0-9']*)?$/,
    };
    this.data = data;
  }

  resetData(data) {
    this.data = data;
  }

  resize(width, height) {
    // console.log('dpr:', dpr);
    this.el.style.width = `${width}px`;
    this.el.style.height = `${height}px`;
    this.el.width = npx(width);
    this.el.height = npx(height);
  }

  clear() {
    const { width, height } = this.el;
    this.ctx.clearRect(0, 0, width, height);
    return this;
  }

  attr(options) {
    Object.assign(this.ctx, options);
    return this;
  }

  save() {
    this.ctx.save();
    this.ctx.beginPath();
    return this;
  }

  restore() {
    this.ctx.restore();
    return this;
  }

  beginPath() {
    this.ctx.beginPath();
    return this;
  }

  translate(x, y) {
    this.ctx.translate(npx(x), npx(y));
    return this;
  }

  scale(x, y) {
    this.ctx.scale(x, y);
    return this;
  }

  clearRect(x, y, w, h) {
    this.ctx.clearRect(x, y, w, h);
    return this;
  }

  fillRect(x, y, w, h) {
    this.ctx.fillRect(npx(x) - 0.5, npx(y) - 0.5, npx(w), npx(h));
    return this;
  }

  fillText(text, x, y) {
    this.ctx.fillText(text, npx(x), npx(y));
    return this;
  }

  fillHtml(html, { x, y, w, h, fontSize }) {
    const parser = new DOMParser();
    const parsedHtml = parser
      .parseFromString(html, "text/html")
      .getElementsByTagName("body")[0];
    const element = document.createElement("span");
    element.style.display = "inline-block";
    element.style.width = `${w}px`;
    element.style.height = `${h}px`;
    element.style.fontSize = `${fontSize}px`;
    element.style.paddingLeft = "2px";
    element.innerHTML = parsedHtml.innerHTML;
    document.body.appendChild(element);
    html2canvas(element).then((canvas) => {
      this.ctx.drawImage(canvas, npx(x), npx(y));
      document.body.removeChild(element);
    });
    return this;
  }

  /*
    txt: render text
    box: DrawBox
    attr: {
      align: left | center | right
      valign: top | middle | bottom
      color: '#333333',
      strike: false,
      font: {
        name: 'Arial',
        size: 14,
        bold: false,
        italic: false,
      }
    }
    textWrap: text wrapping
  */
  textConfigOperation(text, cellMeta) {
    if (text === 0 || text) {
      const valueFormatter = this.options.valueFormatter;
      const numberConfig = this.options.numberConfig ?? {};
      if (valueFormatter) {
        text = valueFormatter({ ...this, value: text, cell: cellMeta }) ?? text;
      }
      const { zeroReplacer, groupingSymbol } = numberConfig;
      if (zeroReplacer) {
        const regEx = this.numberRegexObject[groupingSymbol ?? ","];
        if (regEx.test(text)) {
          const izZero = !parseFloat(text);
          if (izZero) {
            text = zeroReplacer;
          }
        }
      }
    }
    return text;
  }

  text(values, box, attr = {}, textWrap = true, cellMeta = {}) {
    const { textValue, htmlValue } = values;
    let mtxt = textValue;
    mtxt = this.data.resolveDynamicVariable.call(this.data, mtxt)?.text ?? mtxt;
    mtxt = this.textConfigOperation(mtxt, cellMeta);
    const { ctx } = this;
    attr = this.options.cellStyleProvider?.(attr, cellMeta) ?? attr;
    const { align, valign, font, color, strike, underline } = attr;
    const tx = box.textx(align);
    ctx.save();
    ctx.beginPath();
    this.attr({
      textAlign: align,
      textBaseline: valign,
      font: `${font.italic ? "italic" : ""} ${font.bold ? "bold" : ""} ${npx(font.size)}px ${font.name}`,
      fillStyle: color,
      strokeStyle: color,
    });
    const txts = `${mtxt}`.split("\n");
    const biw = box.innerWidth();
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
    const lineHeight = Number(font.size) + 2;
    const txtHeight = (ntxts.length - 1) * lineHeight;
    if (htmlValue) {
      this.fillHtml(htmlValue, {
        x: box.x + this.data.settings.col.indexWidth,
        y: box.y + DEFAULT_ROW_HEIGHT,
        w: box.width - 3,
        h: box.height,
        fontSize: font.size,
      });
    } else {
      ntxts.forEach((txt, index) => {
        let textStart = lineHeight * index;
        let ty = box.texty(valign, txtHeight, textStart);
        const txtWidth = ctx.measureText(txt).width;
        this.fillText(txt, tx, ty);
        if (strike) {
          drawFontLine.call(
            this,
            "strike",
            tx,
            ty,
            align,
            valign,
            font.size,
            txtWidth
          );
        }
        if (underline) {
          drawFontLine.call(
            this,
            "underline",
            tx,
            ty,
            align,
            valign,
            font.size,
            txtWidth
          );
        }
        ty += font.size + 2;
      });
    }
    ctx.restore();
    return this;
  }

  border(style, color) {
    const { ctx, data } = this;
    ctx.lineWidth = thinLineWidth();
    ctx.strokeStyle =
      !!data.sheetConfig?.gridLine === false ? (color ?? "#ffffff") : color;
    // console.log('style:', style);
    if (style === "medium") {
      ctx.lineWidth = npx(2) - 0.5;
    } else if (style === "thick") {
      ctx.lineWidth = npx(3);
    } else if (style === "dashed") {
      ctx.setLineDash([npx(3), npx(2)]);
    } else if (style === "dotted") {
      ctx.setLineDash([npx(1), npx(1)]);
    } else if (style === "double") {
      ctx.setLineDash([npx(2), 0]);
    }
    return this;
  }

  line(...xys) {
    const { ctx } = this;
    if (xys.length > 1) {
      ctx.beginPath();
      const [x, y] = xys[0];
      ctx.moveTo(npxLine(x), npxLine(y));
      for (let i = 1; i < xys.length; i += 1) {
        const [x1, y1] = xys[i];
        ctx.lineTo(npxLine(x1), npxLine(y1));
      }
      ctx.stroke();
    }
    return this;
  }

  borderLine(isDouble, side, ...xys) {
    const { ctx } = this;
    if (xys.length > 1) {
      ctx.beginPath();
      const [x, y] = xys[0];
      ctx.moveTo(npxLine(x), npxLine(y));
      for (let i = 1; i < xys.length; i += 1) {
        const [x1, y1] = xys[i];
        ctx.lineTo(npxLine(x1), npxLine(y1));
      }
      ctx.stroke();
      if (isDouble) {
        const [x1, y1] = xys[1];
        let xGap = 0;
        let yGap = 0;
        let gapUnit = 3;
        switch (side) {
          case "top":
            yGap = gapUnit;
            break;
          case "bottom":
            yGap = -1 * gapUnit;
            break;
          case "left":
            xGap = gapUnit;
            break;
          case "right":
            xGap = -1 * gapUnit;
            break;
        }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(npx(x + xGap), npx(y + yGap));
        ctx.lineTo(npx(x1 + xGap), npx(y1 + yGap));
        ctx.stroke();
        ctx.restore();
      }
    }
    return this;
  }

  strokeBorders(box) {
    const { ctx } = this;
    ctx.save();
    // border
    const { borderTop, borderRight, borderBottom, borderLeft } = box;
    if (borderTop) {
      this.border(...borderTop);
      const isDouble = borderTop[0] === "double";
      // console.log('box.topxys:', box.topxys());

      this.borderLine(isDouble, "top", ...box.topxys());
    }
    if (borderRight) {
      this.border(...borderRight);
      const isDouble = borderRight[0] === "double";
      this.borderLine(isDouble, "right", ...box.rightxys());
    }
    if (borderBottom) {
      this.border(...borderBottom);
      const isDouble = borderBottom[0] === "double";
      this.borderLine(isDouble, "bottom", ...box.bottomxys());
    }
    if (borderLeft) {
      this.border(...borderLeft);
      const isDouble = borderLeft[0] === "double";
      this.borderLine(isDouble, "left", ...box.leftxys());
    }
    ctx.restore();
  }

  dropdown(box) {
    const { ctx } = this;
    const { x, y, width, height } = box;
    const sx = x + width - 15;
    const sy = y + height - 15;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(npx(sx), npx(sy));
    ctx.lineTo(npx(sx + 8), npx(sy));
    ctx.lineTo(npx(sx + 4), npx(sy + 6));
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 0, 0, .45)";
    ctx.fill();
    ctx.restore();
  }

  error(box) {
    const { ctx } = this;
    const { x, y, width } = box;
    const sx = x + width - 1;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(npx(sx - 8), npx(y - 1));
    ctx.lineTo(npx(sx), npx(y - 1));
    ctx.lineTo(npx(sx), npx(y + 8));
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 0, 0, .65)";
    ctx.fill();
    ctx.restore();
  }

  //Frozen
  comment(box, color) {
    if (color) {
      const { ctx } = this;
      const { x, y, width } = box;
      const sx = x + width - 1;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(npx(sx - 8), npx(y - 1));
      ctx.lineTo(npx(sx), npx(y - 1));
      ctx.lineTo(npx(sx), npx(y + 8));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
  }

  //Frozen
  frozen(box) {
    const { ctx } = this;
    const { x, y } = box;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(npx(x), npx(y - 1));        
    ctx.lineTo(npx(x + 8), npx(y - 1));    
    ctx.lineTo(npx(x), npx(y + 8));    
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 255, 0, .85)";
    ctx.fill();
    ctx.restore();
  }

  drawIcon(box, cellMeta) {
    const { cellConfigButtons = [] } = this.options;
    if (cellMeta && Object.keys(cellMeta).length && cellConfigButtons?.length) {
      const { x, y, width } = box;
      const { ctx } = this;
      let radius = 5;
      let gap = radius * 2.2;
      cellConfigButtons.forEach((button) => {
        if (cellMeta[button.tag]) {
          const indicator = button.indicator;
          const iconCount = box.getIconCount();
          ctx.beginPath();
          const xPos = npx(
            x +
              width -
              Math.max(iconCount + 1 * radius, radius) -
              Math.max(iconCount * gap)
          );
          const yPos = npx(y + radius);
          ctx.arc(xPos, yPos, radius, 0, 2 * Math.PI);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 1;
          ctx.stroke();
          box.setIconCount(iconCount + 1);
          ctx.fillStyle = "#ff0000";
          ctx.font = `${radius * 1.5}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(indicator, xPos, yPos);
        }
      });
    }
  }

  rect(box, dtextcb) {
    const { ctx } = this;
    const { x, y, width, height, bgcolor } = box;
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = bgcolor || "#fff";
    ctx.rect(npxLine(x + 1), npxLine(y + 1), npx(width - 2), npx(height - 2));
    ctx.clip();
    ctx.fill();
    dtextcb();
    ctx.restore();
  }
}

export default {};
export { Draw, DrawBox, thinLineWidth, npx };
