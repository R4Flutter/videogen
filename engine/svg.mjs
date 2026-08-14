// engine/svg.mjs — small SVG string builders + helpers.
// Everything returns a string; deterministic; no DOM.

export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const attr = (name, value) => {
  if (value === undefined || value === null || value === false) return "";
  if (value === true) return ` ${name}`;
  return ` ${name}="${esc(value)}"`;
};

// element builders -----------------------------------------------------------

export const rect = (x, y, w, h, o = {}) =>
  `<rect${attr("x", r(x))}${attr("y", r(y))}${attr("width", r(w))}${attr("height", r(h))}${attr("rx", o.rx)}${attr("ry", o.ry)}${attr("fill", o.fill)}${attr("stroke", o.stroke)}${attr("stroke-width", o.sw)}${attr("opacity", o.op)}${attr("transform", o.t)}${attr("stroke-dasharray", o.dash)}${attr("stroke-linecap", o.cap)}/>`;

export const circle = (cx, cy, rad, o = {}) =>
  `<circle${attr("cx", r(cx))}${attr("cy", r(cy))}${attr("r", r(rad))}${attr("fill", o.fill)}${attr("stroke", o.stroke)}${attr("stroke-width", o.sw)}${attr("opacity", o.op)}${attr("transform", o.t)}/>`;

export const line = (x1, y1, x2, y2, o = {}) =>
  `<line${attr("x1", r(x1))}${attr("y1", r(y1))}${attr("x2", r(x2))}${attr("y2", r(y2))}${attr("stroke", o.stroke)}${attr("stroke-width", o.sw)}${attr("opacity", o.op)}${attr("stroke-dasharray", o.dash)}${attr("stroke-linecap", o.cap ?? "round")}${attr("stroke-linejoin", o.join ?? "round")}${attr("marker-end", o.markerEnd)}/>`;

export const path = (d, o = {}) =>
  `<path${attr("d", d)}${attr("fill", o.fill ?? "none")}${attr("stroke", o.stroke)}${attr("stroke-width", o.sw)}${attr("opacity", o.op)}${attr("stroke-linecap", o.cap ?? "round")}${attr("stroke-linejoin", o.join ?? "round")}${attr("stroke-dasharray", o.dash)}${attr("marker-end", o.markerEnd)}${attr("transform", o.t)}/>`;

export const polyline = (pts, o = {}) =>
  `<polyline${attr("points", pts.map(([x, y]) => `${r(x)},${r(y)}`).join(" "))}${attr("fill", o.fill ?? "none")}${attr("stroke", o.stroke)}${attr("stroke-width", o.sw)}${attr("opacity", o.op)}${attr("stroke-linecap", o.cap ?? "round")}${attr("stroke-linejoin", o.join ?? "round")}${attr("transform", o.t)}/>`;

export const polygon = (pts, o = {}) =>
  `<polygon${attr("points", pts.map(([x, y]) => `${r(x)},${r(y)}`).join(" "))}${attr("fill", o.fill)}${attr("stroke", o.stroke)}${attr("stroke-width", o.sw)}${attr("opacity", o.op)}${attr("stroke-linejoin", "round")}${attr("transform", o.t)}/>`;

export const g = (children, o = {}) =>
  `<g${attr("transform", o.t)}${attr("opacity", o.op)}${attr("fill", o.fill)}${attr("stroke", o.stroke)}${attr("font-family", o.font)}>${(Array.isArray(children) ? children : [children]).join("")}</g>`;

export const group = (...children) => children.join("");

// text builder — the only place text is emitted -----------------------------

export const text = (str, x, y, o = {}) =>
  `<text${attr("x", r(x))}${attr("y", r(y))}${attr("font-family", o.font ?? FONT_BODY)}${attr("font-size", o.size)}${attr("font-weight", o.weight ?? 400)}${attr("fill", o.fill ?? INK)}${attr("text-anchor", o.anchor ?? "start")}${attr("letter-spacing", o.tracking)}${attr("opacity", o.op)}${attr("transform", o.t)}${attr("text-decoration", o.decoration)}>${esc(str)}</text>`;

// numbers as fixed decimals
export const r = (n) => (typeof n === "number" ? (Math.round(n * 100) / 100).toString() : n);

// the print-plate offset shadow: flat, solid, no gradients -------------------
export const plateShadow = (x, y, w, h, o = {}) =>
  rect(x + (o.dx ?? 10), y + (o.dy ?? 10), w, h, {
    fill: o.fill ?? "#E4DED1",
    rx: o.rx ?? 16,
    op: o.op ?? 1,
  });

// unique arrow marker (fixes V1's duplicate id="a" bug) ----------------------
let markerCounter = 0;
export const arrowMarker = (color, size = 14) => {
  const id = `arrow-${++markerCounter}`;
  return {
    id,
    def: `<marker id="${id}" markerWidth="${size}" markerHeight="${size}" refX="${size - 2}" refY="${size / 2}" orient="auto"><path d="M0 0 L${size - 2} ${size / 2} L0 ${size} z" fill="${color}"/></marker>`,
    end: `url(#${id})`,
  };
};

// text width estimate — Archivo-ish advance, used for fitting -----------------
export const estimateWidth = (str, size, tracking = 0) => {
  let w = 0;
  for (const ch of String(str)) {
    if (ch === " " || ch === "." || ch === ",") w += 0.3;
    else if (ch === "i" || ch === "l" || ch === "I" || ch === "1" || ch === "|") w += 0.36;
    else if (ch === "m" || ch === "w" || ch === "M" || ch === "W" || ch === "@") w += 0.92;
    else if (ch === "0" || ch === "8" || ch === "9" || ch === "6" || ch === "5" || ch === "3") w += 0.62;
    else w += 0.6;
  }
  return w * size + (String(str).length - 1) * tracking;
};

// shrink-to-fit: returns size so text fits maxWidth --------------------------
export const fitSize = (str, maxWidth, startSize, minSize = 12, tracking = 0) => {
  let size = startSize;
  while (size > minSize && estimateWidth(str, size, tracking) > maxWidth) size -= 2;
  return size;
};

// dashed row texture for documents -------------------------------------------
export const row = (x, y, w, h, fill, o = {}) => rect(x, y, w, h, { fill, rx: o.rx ?? 2, op: o.op });

// background
export const bg = (color) => rect(0, 0, W, H, { fill: color });

import { W, H, PALETTE, FONT } from "./tokens.mjs";
const FONT_BODY = FONT.body;
const INK = PALETTE.ink;