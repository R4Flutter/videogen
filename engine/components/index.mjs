// engine/components/index.mjs — reusable editorial vector components.
// All pure functions returning SVG strings. Deterministic, token-driven.

import {
  W, H, PALETTE, TYPE, TRACK, STROKE, FONT, weight, GRID, SAFE,
} from "../tokens.mjs";
import {
  rect, circle, line, path, polyline, polygon, g, text, esc,
  plateShadow, arrowMarker, estimateWidth, fitSize, row, bg,
} from "../svg.mjs";

const C = PALETTE;

// ---------------------------------------------------------------- primitives

// Kicker — the small tracked overline with a leading rule.
export const Kicker = (label, x, y, o = {}) => g([
  rect(x, y - 8, o.rule ?? 40, o.thick ?? 4, { fill: o.color ?? C.green, rx: 2 }),
  text(label, x + (o.rule ?? 40) + 16, y, {
    font: FONT.body, size: o.size ?? TYPE.label, weight: weight.bold,
    fill: o.fill ?? C.muted, tracking: o.tracking ?? TRACK.label,
  }),
], { t: o.t });

// SectionHeader — top-left frame label used in every content scene.
export const SectionHeader = (label, o = {}) => Kicker(label, o.x ?? SAFE.x, o.y ?? 104, o);

// NumberHero — the dominant number object.
export const NumberHero = (value, x, y, o = {}) => text(value, x, y, {
  font: FONT.display, size: o.size ?? TYPE.display, weight: weight.black,
  fill: o.fill ?? C.ink, anchor: o.anchor ?? "middle",
  tracking: o.tracking ?? 0, op: o.op,
});

// Card — white panel + plate shadow + optional stroke.
export const Card = (x, y, w, h, o = {}) => [
  plateShadow(x, y, w, h, { rx: o.rx ?? 16, dx: o.dx, dy: o.dy, fill: o.shadow ?? C.paperDeep, op: o.shadowOp }),
  rect(x, y, w, h, { fill: o.fill ?? C.paper, stroke: o.stroke, "stroke-width": o.sw, rx: o.rx ?? 16 }),
].join("");

// CaptionBar — bottom caption line, safe-margin aligned.
export const CaptionBar = (label, o = {}) => text(label, SAFE.x, SAFE.bottom - 8, {
  font: FONT.body, size: TYPE.small, weight: weight.regular,
  fill: o.fill ?? C.gray400, tracking: TRACK.caption,
  anchor: o.anchor ?? "start",
});

// ---------------------------------------------------------------- arrows

export const Arrow = (x1, y1, x2, y2, o = {}) => {
  const m = arrowMarker(o.color ?? C.green, o.size ?? 14);
  return [
    m.def,
    line(x1, y1, x2, y2, {
      stroke: o.color ?? C.green, "stroke-width": o.sw ?? STROKE.primary,
      markerEnd: m.end, op: o.op,
    }),
  ].join("");
};

export const ArcArrow = (d, o = {}) => {
  const m = arrowMarker(o.color ?? C.green, o.size ?? 14);
  return [m.def, path(d, {
    stroke: o.color ?? C.green, sw: o.sw ?? STROKE.primary,
    markerEnd: m.end, op: o.op,
  })].join("");
};

// ---------------------------------------------------------------- charts

// ChartFrame — axes + dashed gridlines + axis labels.
export const ChartFrame = (plot, o = {}) => {
  const { left, right, top, bottom } = plot;
  const parts = [];
  for (const f of [0.25, 0.5, 0.75]) {
    const y = bottom - (bottom - top) * f;
    parts.push(line(left, y, right, y, {
      stroke: C.gray100, sw: STROKE.fine, dash: "4 10", op: 1,
    }));
  }
  parts.push(
    line(left, bottom, right, bottom, { stroke: C.gray400, sw: STROKE.secondary }),
    line(left, bottom, left, top, { stroke: C.gray400, sw: STROKE.secondary }),
  );
  if (o.xLabel) parts.push(text(o.xLabel, right, bottom + 48, {
    font: FONT.body, size: TYPE.caption, fill: C.gray400,
    anchor: "end", tracking: TRACK.caption,
  }));
  if (o.yLabel) parts.push(text(o.yLabel, left, top - 24, {
    font: FONT.body, size: TYPE.caption, fill: C.gray400,
    tracking: TRACK.caption,
  }));
  return parts.join("");
};

// LineChart — polyline over a plot, optional area fill under it.
export const LineChart = (plot, pts, o = {}) => {
  const { left, right, top, bottom } = plot;
  const x = (i) => left + (i / (pts.length - 1)) * (right - left);
  const y = (v) => bottom - (v - o.min) * ((bottom - top) / (o.max - o.min));
  const data = pts.map((v, i) => [x(i), y(v)]);
  const parts = [];
  if (o.area) {
    parts.push(polygon([[left, bottom], ...data, [right, bottom]], {
      fill: o.area, op: o.areaOp ?? 0.18,
    }));
  }
  parts.push(polyline(data, { stroke: o.color ?? C.green, sw: o.sw ?? 10, op: o.op }));
  if (o.endLabel) {
    const [lx, ly] = data[data.length - 1];
    parts.push(text(o.endLabel, lx - (o.labelAnchor === "left" ? 12 : 0), ly - 24, {
      font: FONT.body, size: TYPE.subhead, weight: weight.bold,
      fill: o.color ?? C.green, anchor: o.labelAnchor ?? "end",
    }));
  }
  return parts.join("");
};

// BarChart — bars with value labels + year labels.
export const BarChart = (plot, items, o = {}) => {
  const { left, right, top, bottom } = plot;
  const n = items.length;
  const gap = o.gap ?? 46;
  const bw = (right - left - gap * (n + 1)) / n;
  const maxV = o.max ?? Math.max(...items.map((d) => d.value)) * 1.18;
  const parts = [];
  items.forEach((d, i) => {
    const x = left + gap + i * (bw + gap);
    const h = ((d.value / maxV) * (bottom - top)) * (d.p ?? 1);
    const color = d.accent ? (o.accentColor ?? C.gold) : (d.fade ? C.gray200 : C.gray400);
    parts.push(rect(x, bottom - h, bw, h, {
      fill: color, rx: o.rx ?? 14, op: d.fade ? 0.85 : 1,
    }));
    if (d.accent && o.accentStroke) {
      parts.push(rect(x - 5, bottom - h - 5, bw + 10, h + 10, {
        fill: "none", stroke: C.gold, sw: STROKE.primary, rx: o.rx + 4, op: 0.6,
      }));
    }
    if (o.values) parts.push(text(d.labelText ?? `${d.value}${o.suffix ?? ""}`, x + bw / 2, bottom - h - 20, {
      font: FONT.display, size: o.valueSize ?? 32, weight: weight.black,
      fill: d.accent ? C.gold : C.ink, anchor: "middle",
    }));
    if (o.xLabels) parts.push(text(d.label, x + bw / 2, bottom + 42, {
      font: FONT.body, size: o.xSize ?? 24, weight: weight.medium,
      fill: d.accent ? C.ink : C.gray400, anchor: "middle", tracking: 1,
    }));
  });
  return parts.join("");
};

// Donut — partial ring.
export const Donut = (cx, cy, r, frac, o = {}) => {
  const R = r, SW = o.sw ?? 44;
  const circ = 2 * Math.PI * R;
  const len = circ * frac;
  return [
    circle(cx, cy, R, { fill: "none", stroke: o.track ?? C.gray100, sw: SW }),
    circle(cx, cy, R, {
      fill: "none", stroke: o.color ?? C.green, sw: SW,
      dash: `${len} ${circ}`, t: `rotate(-90 ${cx} ${cy})`, cap: "round",
    }),
  ].join("");
};

// ---------------------------------------------------------------- documents

// DocumentPage — a paper page with title rule, optional letterhead.
export const DocumentPage = (x, y, w, h, o = {}) => [
  plateShadow(x, y, w, h, { rx: o.rx ?? 10, dy: 12 }),
  rect(x, y, w, h, { fill: o.fill ?? C.paper, stroke: o.stroke ?? C.gray200, sw: STROKE.fine, rx: o.rx ?? 10 }),
].join("");

// TextBlock — gray rule rows (document body texture). count rows of height rh.
export const TextBlock = (x, y, w, count, o = {}) => {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const rw = o.pattern ? o.pattern[i % o.pattern.length] : 1;
    parts.push(row(x, y + i * (o.rh ?? 18), w * rw, o.rh ?? 12, o.fill ?? C.gray300, { rx: 2 }));
  }
  return parts.join("");
};

// MonoDataLine — a machine-like data line (mono font).
export const MonoLine = (label, value, x, y, o = {}) => g([
  text(label, x, y, { font: FONT.mono, size: o.size ?? 22, fill: o.labelFill ?? C.gray400 }),
  text(value, o.right ?? x + o.w, y, {
    font: FONT.mono, size: o.size ?? 22, weight: weight.bold,
    fill: o.valueFill ?? C.ink, anchor: "end",
  }),
]);

// ---------------------------------------------------------------- UI

// BrowserWindow — a chrome frame with dots.
export const BrowserWindow = (x, y, w, h, o = {}) => [
  rect(x, y, w, h, { fill: o.fill ?? C.paper, stroke: o.stroke ?? C.gray200, sw: STROKE.fine, rx: o.rx ?? 12 }),
  rect(x, y, 42, h, { fill: o.rail ?? C.gray100, rx: o.rx ?? 12 }),
  circle(x + 21, y + 21, 6, { fill: C.gray300 }),
  circle(x + 21, y + 45, 6, { fill: C.gray300 }),
].join("");

// ScreenFill — rounded screen inside a device frame.
export const Screen = (x, y, w, h, o = {}) => rect(x, y, w, h, {
  fill: o.fill ?? C.night, rx: o.rx ?? 8, stroke: o.stroke, sw: o.sw,
});

// Button
export const Button = (x, y, w, h, label, o = {}) => g([
  rect(x, y, w, h, { fill: o.fill ?? C.green, rx: o.rx ?? 12, stroke: o.stroke, sw: o.sw }),
  text(label, x + w / 2, y + h / 2 + (o.textSize ?? 28) * 0.35, {
    font: FONT.body, size: o.textSize ?? 28, weight: weight.bold,
    fill: o.textFill ?? C.paper, anchor: "middle",
  }),
]);

// ---------------------------------------------------------------- misc

// Figure — flat editorial vector person, running on a treadmill.
// cy = centre of the figure; deck sits at the feet. House palette only.
export const Figure = (cx, cy, s, o = {}) => {
  const c = o.color ?? C.ink;
  const limb = o.sw ?? Math.max(3, s * 0.3);
  return g([
    // treadmill deck + console
    rect(cx - 2.3 * s, cy + 1.5 * s, 4.6 * s, 0.7 * s, { fill: C.gray300, stroke: C.gray400, sw: 2, rx: 0.35 * s }),
    rect(cx + 1.9 * s, cy - 1.15 * s, 0.55 * s, 2.65 * s, { fill: C.gray300, rx: 0.2 * s }),
    rect(cx + 1.55 * s, cy - 1.85 * s, 1.25 * s, 0.75 * s, { fill: C.gray200, stroke: C.gray400, sw: 2, rx: 0.15 * s }),
    // head
    circle(cx + 0.1 * s, cy - 2.25 * s, 0.85 * s, { fill: c }),
    // torso
    path(`M${cx - 0.1 * s} ${cy - 1.85 * s} C ${cx + 0.55 * s} ${cy - 1.85 * s} ${cx + 0.6 * s} ${cy - 0.7 * s} ${cx + 0.35 * s} ${cy + 0.5 * s} L ${cx - 0.35 * s} ${cy + 0.5 * s} C ${cx - 0.6 * s} ${cy - 0.6 * s} ${cx - 0.55 * s} ${cy - 1.85 * s} ${cx - 0.1 * s} ${cy - 1.85 * s} Z`, { fill: c }),
    // back arm, trailing
    path(`M${cx + 0.1 * s} ${cy - 1.6 * s} Q ${cx - 0.7 * s} ${cy - 1.3 * s} ${cx - 0.95 * s} ${cy - 0.5 * s}`, { stroke: c, sw: limb, cap: "round" }),
    // front arm, bent
    path(`M${cx + 0.3 * s} ${cy - 1.6 * s} Q ${cx + 1.05 * s} ${cy - 1.5 * s} ${cx + 1.25 * s} ${cy - 0.7 * s}`, { stroke: c, sw: limb, cap: "round" }),
    // back leg, trailing
    path(`M${cx + 0.1 * s} ${cy + 0.4 * s} Q ${cx - 0.6 * s} ${cy + 0.9 * s} ${cx - 0.85 * s} ${cy + 1.4 * s}`, { stroke: c, sw: limb, cap: "round" }),
    // front leg, knee up
    path(`M${cx + 0.3 * s} ${cy + 0.4 * s} Q ${cx + 1.0 * s} ${cy + 0.55 * s} ${cx + 1.15 * s} ${cy + 1.35 * s}`, { stroke: c, sw: limb, cap: "round" }),
  ], { t: o.t });
};

// Stamp — rotated outlined stamp (e.g. "NO FEDERAL RULE").
export const Stamp = (label, cx, cy, o = {}) => {
  const size = o.size ?? 90;
  const w = estimateWidth(label, size, 8) + 90;
  return g([
    rect(cx - w / 2, cy - size * 0.75, w, size * 1.5, {
      fill: "none", stroke: o.color ?? C.gold, sw: o.sw ?? 12, rx: 18, cap: "round",
    }),
    text(label, cx, cy + size * 0.3, {
      font: FONT.display, size, weight: weight.black,
      fill: o.color ?? C.gold, anchor: "middle", tracking: 8,
    }),
  ], { t: `rotate(${o.rot ?? -12} ${cx} ${cy})` });
};

export { W, H, TYPE, TRACK, STROKE, FONT, weight, GRID, SAFE, C, esc, rect, circle, line, path, polyline, polygon, g, text, plateShadow, arrowMarker, estimateWidth, fitSize, row, bg };