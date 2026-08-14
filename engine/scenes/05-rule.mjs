// engine/scenes/05-rule.mjs — scenes 46–50 (Act IV: The rule that got cancelled).

import {
  W, H, C, TYPE, TRACK, STROKE, FONT, weight, SAFE,
  rect, circle, line, path, g, text, row, bg, polyline, polygon,
  Kicker, CaptionBar, Card, Arrow, NumberHero, Donut, Figure,
  SectionHeader, ChartFrame, LineChart, BarChart, TextBlock, DocumentPage,
  BrowserWindow, Button, Screen, Stamp, MonoLine,
} from "./helpers.mjs";
import { NightBeat, MachineRow } from "./helpers.mjs";

// calendar grid with optional circled day
const Calendar = (x, y, cellW, cellH, o = {}) => {
  const parts = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const cx = x + c * cellW, cy = y + r * cellH;
      parts.push(rect(cx, cy, cellW, cellH, {
        fill: o.day === (r * 6 + c + 1) ? "none" : C.paper,
        stroke: o.day === (r * 6 + c + 1) ? C.gold : C.rule,
        sw: o.day === (r * 6 + c + 1) ? 8 : 3,
        rx: 8,
      }));
      if (o.day === r * 6 + c + 1) {
        parts.push(text(String(o.day), cx + cellW / 2, cy + cellH / 2 + 18, {
          font: FONT.display, size: o.daySize ?? 46, weight: weight.black,
          fill: C.gold, anchor: "middle",
        }));
      }
    }
  }
  return parts.join("");
};

export const rule = [
  // 46 — Symmetry.
  {
    num: 46, title: "Symmetry",
    cap: "Three steps in, three steps out. The rule was not radical; it was symmetry.",
    build: () => [
      bg(C.cream),
      text("Click-to-cancel", W / 2, 140, { font: FONT.body, size: 52, weight: weight.bold, fill: C.ink, anchor: "middle" }),
      text("whatever effort to begin, no more to end", W / 2, 210, {
        font: FONT.body, size: 36, fill: C.gray400, anchor: "middle",
      }),
      // sign up
      text("SIGN UP", 480, 340, { font: FONT.body, size: 40, weight: weight.bold, fill: C.green }),
      g([
        circle(300, 480, 80, { fill: C.green }),
        circle(540, 480, 80, { fill: C.green }),
        circle(780, 480, 80, { fill: C.green }),
      ]),
      text("1", 300, 500, { font: FONT.display, size: 60, weight: weight.black, fill: C.paper, anchor: "middle" }),
      text("2", 540, 500, { font: FONT.display, size: 60, weight: weight.black, fill: C.paper, anchor: "middle" }),
      text("3", 780, 500, { font: FONT.display, size: 60, weight: weight.black, fill: C.paper, anchor: "middle" }),
      // cancel
      text("CANCEL", 1440, 340, { font: FONT.body, size: 40, weight: weight.bold, fill: C.gray400 }),
      g([
        circle(1140, 480, 80, { fill: C.gray300 }),
        circle(1380, 480, 80, { fill: C.gray300 }),
        circle(1620, 480, 80, { fill: C.gray300 }),
      ]),
      text("1", 1140, 500, { font: FONT.display, size: 60, weight: weight.black, fill: C.paper, anchor: "middle" }),
      text("2", 1380, 500, { font: FONT.display, size: 60, weight: weight.black, fill: C.paper, anchor: "middle" }),
      text("3", 1620, 500, { font: FONT.display, size: 60, weight: weight.black, fill: C.paper, anchor: "middle" }),
      line(960, 480, 880, 480, { stroke: C.gold, sw: 12, markerEnd: "url(#sym)" }),
      `<defs><marker id="sym" markerWidth="16" markerHeight="16" refX="12" refY="6" orient="auto"><path d="M0 0 L14 6 L0 12 z" fill="${C.gold}"/></marker></defs>`,
      text("A symmetry rule.", W / 2, 680, { font: FONT.display, size: 56, weight: weight.black, fill: C.ink, anchor: "middle" }),
      text("No phone call. No retention maze. No Iliad.", W / 2, 790, {
        font: FONT.body, size: 36, fill: C.gray400, anchor: "middle",
      }),
      CaptionBar("The rule was not radical; it was symmetry."),
    ].join(""),
  },

  // 47 — July 8, 2025 calendar.
  {
    num: 47, title: "July 8, 2025",
    cap: "Calendar. Circled. Days before the deadline.",
    build: () => [
      bg(C.cream),
      text("July 2025", W / 2, 150, { font: FONT.body, size: 40, fill: C.gray400, anchor: "middle" }),
      Calendar(220, 220, 240, 140, { day: 8 }),
      text("July 8, 2025 — days before the rule was due to take effect.", W / 2, 800, {
        font: FONT.body, size: 46, weight: weight.bold, fill: C.ink, anchor: "middle",
      }),
      text("The Eighth Circuit struck it down. Entirely.", W / 2, 880, {
        font: FONT.body, size: 44, weight: weight.bold, fill: C.gold, anchor: "middle",
      }),
      CaptionBar("Days before the deadline."),
    ].join(""),
  },

  // 48 — The opinion.
  {
    num: 48, title: "The opinion",
    cap: "First page of the opinion. Scroll slowly.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE OPINION"),
      DocumentPage(560, 140, 800, 820),
      rect(620, 200, 680, 50, { fill: C.ink, rx: 6 }),
      TextBlock(620, 280, 680, 14, { rh: 30, fill: C.gray300, pattern: [1, 0.9, 0.85, 0.7, 1, 0.8, 0.95, 0.75, 1, 0.85, 0.9, 0.7, 0.95, 0.8] }),
      // highlight
      rect(620, 790, 680, 16, { fill: C.gray200 }),
      rect(620, 790, 330, 16, { fill: C.gold, op: 0.55 }),
      text("court opinion · scroll slowly", 960, 950, {
        font: FONT.body, size: 30, fill: C.gray400, anchor: "middle",
      }),
      CaptionBar("First page of the opinion."),
    ].join(""),
  },

  // 49 — PROCEDURE.
  {
    num: 49, title: "PROCEDURE",
    cap: "Black. The word dissolves. Vacated on a missing analysis.",
    build: () => NightBeat("PROCEDURE", "A paperwork failure.", { y: 540, size: 170, tracking: 12 }),
  },

  // 50 — 2026: no rule.
  {
    num: 50, title: "2026: no rule",
    cap: "Present day. The general rule does not exist.",
    build: () => [
      bg(C.cream),
      text("2026", W / 2, 200, { font: FONT.body, size: 52, weight: weight.bold, fill: C.ink, anchor: "middle" }),
      Calendar(220, 280, 240, 130, { day: 0 }),
      Stamp("NO FEDERAL RULE", 960, 460, { rot: -12, size: 80 }),
      text("the FTC has begun again — a new version, one company at a time", W / 2, 700, {
        font: FONT.body, size: 38, fill: C.gray400, anchor: "middle",
      }),
      text("The friction is still legal.", W / 2, 800, {
        font: FONT.body, size: 52, weight: weight.bold, fill: C.green, anchor: "middle",
      }),
      CaptionBar("Present day. The general rule does not exist."),
    ].join(""),
  },
];