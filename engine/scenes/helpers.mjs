// engine/scenes/helpers.mjs — shared sub-compositions used across scenes.

import {
  W, H, C, TYPE, TRACK, STROKE, FONT, weight, SAFE,
  rect, circle, line, path, g, text, plateShadow, row, bg,
  Kicker, CaptionBar, SectionHeader, Card, Arrow, NumberHero, MonoLine,
  Donut, Figure, ChartFrame, LineChart, BarChart, TextBlock, DocumentPage,
  BrowserWindow, Button, Screen, Stamp, Stamp as _Stamp, polyline, polygon, estimateWidth,
} from "../components/index.mjs";

export { W, H, C, TYPE, TRACK, STROKE, FONT, weight, SAFE,
  rect, circle, line, path, g, text, plateShadow, row, bg,
  Kicker, CaptionBar, SectionHeader, Card, Arrow, NumberHero, MonoLine,
  Donut, Figure, ChartFrame, LineChart, BarChart, TextBlock, DocumentPage,
  BrowserWindow, Button, Screen, Stamp, polyline, polygon, estimateWidth };

// night (black) beat — restrained typographic hero on cream ground
export const NightBeat = (line1, sub, o = {}) => [
  bg(C.cream),
  text(line1, W / 2, o.y ?? 520, {
    font: FONT.display, size: o.size ?? TYPE.hero, weight: weight.black,
    fill: o.fill ?? C.ink, anchor: "middle", tracking: o.tracking ?? TRACK.hero,
  }),
  sub ? text(sub, W / 2, (o.y ?? 520) + 120, {
    font: FONT.body, size: TYPE.subhead, fill: C.gray400, anchor: "middle",
    tracking: TRACK.subhead,
  }) : "",
].join("");

// figure row — machines/labels along a baseline
export const MachineRow = (y, count, o = {}) => {
  const parts = [];
  const total = o.totalW ?? 1600;
  const start = (W - total) / 2;
  const bw = total / count;
  for (let i = 0; i < count; i++) {
    const x = start + i * bw;
    parts.push(rect(x + 30, y, bw - 60, o.h ?? 130, { fill: o.fill ?? C.nightRule, rx: 12 }));
  }
  return parts.join("");
};

// statement row group (bank statement / bill)
export const StatementRows = (x, y, w, rows, o = {}) => {
  const parts = [];
  rows.forEach((r, i) => {
    const ry = y + i * (o.rowH ?? 64);
    if (r.highlight) {
      parts.push(rect(x - 14, ry - 26, w + 28, o.rowH ?? 64, {
        fill: C.green, op: 0.08, rx: 10,
      }));
    }
    parts.push(
      text(r.date ?? "", x, ry, { font: FONT.mono, size: o.size ?? 22, fill: C.gray400 }),
      text(r.name ?? "", x + (o.dateW ?? 260), ry, { font: FONT.body, size: o.size ?? 22, fill: C.inkSoft }),
      text(r.amount ?? "", x + w, ry, {
        font: FONT.mono, size: o.size ?? 22, weight: weight.bold,
        fill: r.highlight ? C.green : C.ink, anchor: "end",
      }),
      r.tag ? text(r.tag, x + (o.dateW ?? 260) + 420, ry, {
        font: FONT.body, size: 18, weight: weight.bold, fill: C.green, tracking: 2,
      }) : "",
    );
    if (i < rows.length - 1) {
      parts.push(line(x, ry + (o.rowH ?? 64) / 2 - 4, x + w, ry + (o.rowH ?? 64) / 2 - 4, {
        stroke: C.gray100, sw: STROKE.fine,
      }));
    }
  });
  return parts.join("");
};