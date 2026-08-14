// engine/scenes/06-landing.mjs — scenes 51–54 (Landing).

import {
  W, H, C, TYPE, TRACK, STROKE, FONT, weight, SAFE,
  rect, circle, line, path, g, text, row, bg, polyline, polygon,
  Kicker, CaptionBar, Card, Arrow, NumberHero, Donut, Figure,
  SectionHeader, ChartFrame, LineChart, BarChart, TextBlock, DocumentPage,
  BrowserWindow, Button, Screen, Stamp, MonoLine,
} from "./helpers.mjs";
import { NightBeat, MachineRow } from "./helpers.mjs";
import { StatementRows } from "./helpers.mjs";
import { GymRow } from "./illustrations.mjs";

export const landing = [
  // 51 — Back to the gym (echo of scene 1).
  {
    num: 51, title: "Back to the gym",
    cap: "Go back to where this started. Hold on the empty room.",
    build: () => [
      bg(C.cream),
      rect(0, 0, W, 620, { fill: C.gray100 }),
      rect(0, 620, W, H - 620, { fill: C.gray200 }),
      g([
        rect(240, 110, 440, 10, { fill: C.green, op: 0.55, rx: 5 }),
        rect(820, 110, 440, 10, { fill: C.green, op: 0.55, rx: 5 }),
        rect(1400, 110, 320, 10, { fill: C.green, op: 0.55, rx: 5 }),
      ]),
      rect(180, 240, 1560, 260, { fill: C.paper, stroke: C.gray300, sw: 3, rx: 8 }),
      g([
        line(500, 270, 500, 480, { stroke: C.gray200, sw: 3, dash: "2 10" }),
        line(960, 270, 960, 480, { stroke: C.gray200, sw: 3, dash: "2 10" }),
        line(1420, 270, 1420, 480, { stroke: C.gray200, sw: 3, dash: "2 10" }),
        line(300, 375, 1660, 375, { stroke: C.gray200, sw: 2, dash: "2 10" }),
      ]),
      g(GymRow(430, 7, { s: 24, metal: C.gray300 })),
      g(GymRow(700, 5, { s: 34, metal: C.gray300 })),
      g([Figure(960, 590, 38, { color: C.ink })]),
      text("Same shot. 4 AM. Same treadmill.", W / 2, 1010, {
        font: FONT.body, size: TYPE.label, fill: C.gray400, anchor: "middle", tracking: TRACK.label,
      }),
    ].join(""),
  },

  // 52 — $133 on black.
  {
    num: 52, title: "$133 on black",
    cap: "The gap returns. That's what it actually is.",
    build: () => [
      bg(C.cream),
      NumberHero("$133", W / 2, 480, { size: 240, fill: C.gold }),
      text("a month · $1,600 a year", W / 2, 620, {
        font: FONT.body, size: 64, fill: C.ink, anchor: "middle",
      }),
      text("going somewhere they couldn't name", W / 2, 760, {
        font: FONT.body, size: 40, fill: C.gray400, anchor: "middle",
      }),
    ].join(""),
  },

  // 53 — Scan the statement.
  {
    num: 53, title: "Scan the statement",
    cap: "Cursor moves down, line by line. Same amount, same date.",
    build: () => [
      bg(C.cream),
      SectionHeader("STATEMENT · LAST 12 MONTHS"),
      Card(380, 160, 760, 780),
      StatementRows(440, 280, 640, [
        { date: "JAN 03", name: "ACME FITNESS", amount: "$10.00", highlight: true },
        { date: "FEB 03", name: "ACME FITNESS", amount: "$10.00", highlight: true },
        { date: "MAR 03", name: "ACME FITNESS", amount: "$10.00", highlight: true },
        { date: "APR 03", name: "ACME FITNESS", amount: "$10.00", highlight: true },
        { date: "MAY 03", name: "ACME FITNESS", amount: "$10.00", highlight: true },
        { date: "JUN 03", name: "ACME FITNESS", amount: "$10.00", highlight: true },
        { date: "JUL 03", name: "ACME FITNESS", amount: "$10.00", highlight: true },
        { date: "AUG 03", name: "ACME FITNESS", amount: "$10.00", highlight: true },
      ], { rowH: 78, dateW: 220 }),
      // cursor
      rect(1360, 260, 8, 560, { fill: C.green }),
      g([[1410, 420], [1410, 520], [1410, 620], [1410, 320]].map(([x, y]) =>
        circle(x, y, 10, { fill: C.green })
      )),
      text("same amount,", 1470, 420, { font: FONT.body, size: 36, weight: weight.bold, fill: C.green }),
      text("same date,", 1470, 480, { font: FONT.body, size: 36, weight: weight.bold, fill: C.green }),
      text("twelve times", 1470, 540, { font: FONT.body, size: 36, weight: weight.bold, fill: C.green }),
      CaptionBar("A decision you made once, renewing silently ever since."),
    ].join(""),
  },

  // 54 — Final line.
  {
    num: 54, title: "Final line",
    cap: "Cursor stops. Cut to black. 1.5 s. End. Nothing after this.",
    build: () => [
      bg(C.cream),
      text("It should be a choice.", W / 2, 420, {
        font: FONT.display, size: 120, weight: weight.black, fill: C.ink, anchor: "middle",
      }),
      text("Some of them you'll want to keep.", W / 2, 580, {
        font: FONT.body, size: 52, weight: weight.bold, fill: C.green, anchor: "middle",
      }),
      text("Right now, for most people,", W / 2, 680, { font: FONT.body, size: 44, fill: C.gray400, anchor: "middle" }),
      text("it's just the last thing they happened to agree to, still running.", W / 2, 740, {
        font: FONT.body, size: 44, fill: C.gray400, anchor: "middle",
      }),
    ].join(""),
  },
];