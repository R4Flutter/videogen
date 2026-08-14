// engine/scenes/01-stake.mjs — scenes 6–8 (The stake).

import {
  W, H, C, TYPE, TRACK, STROKE, FONT, weight, SAFE,
  rect, circle, line, path, g, text, row, bg,
  Kicker, CaptionBar, Card, Arrow, NumberHero, StatementRows, SectionHeader,
} from "./helpers.mjs";
import { NightBeat } from "./helpers.mjs";

export const stake = [
  // 6 — Bank statement with recurring rows.
  {
    num: 6, title: "Bank statement",
    cap: "Small recurring charges highlight one by one as they pass.",
    build: () => [
      bg(C.cream),
      SectionHeader("STATEMENT · MARCH"),
      Card(420, 150, 1080, 780),
      text("MONTHLY STATEMENT", 560, 240, { font: FONT.body, size: 30, weight: weight.bold, fill: C.ink }),
      text("MARCH 2025", 560, 290, { font: FONT.mono, size: 24, fill: C.gray400 }),
      line(560, 330, 1400, 330, { stroke: C.gray100, sw: STROKE.secondary }),
      StatementRows(560, 400, 840, [
        { date: "MAR 02", name: "ACME FITNESS", amount: "−$10.00", highlight: true, tag: "RECURRING" },
        { date: "MAR 05", name: "STREAM SERVICE", amount: "−$15.99", highlight: true, tag: "RECURRING" },
        { date: "MAR 09", name: "COFFEE HOUSE", amount: "−$4.50" },
        { date: "MAR 12", name: "CLOUD STORAGE", amount: "−$2.99", highlight: true, tag: "RECURRING" },
        { date: "MAR 15", name: "GROCERY", amount: "−$63.20" },
        { date: "MAR 19", name: "MUSIC APP", amount: "−$10.99", highlight: true, tag: "RECURRING" },
        { date: "MAR 24", name: "PHARMACY", amount: "−$12.40" },
      ], { rowH: 72 }),
      line(560, 870, 1400, 870, { stroke: C.ink, sw: STROKE.primary }),
      text("RECURRING TOTAL", 560, 930, { font: FONT.mono, size: 26, fill: C.gray400 }),
      text("$219", 1400, 930, { font: FONT.display, size: 56, weight: weight.black, fill: C.green, anchor: "end" }),
      CaptionBar("Small charges, regular as clockwork."),
    ].join(""),
  },

  // 7 — $86 → $219 on night.
  {
    num: 7, title: "$86 → $219",
    cap: "The guess is replaced by the reality. Hold the beat.",
    build: () => [
      bg(C.cream),
      text("86", 420, 560, {
        font: FONT.display, size: 260, weight: weight.black, fill: "#C9C2B4", anchor: "middle",
        decoration: "line-through",
      }),
      text("the average guess", 420, 700, { font: FONT.body, size: 40, fill: C.gray400, anchor: "middle" }),
      Arrow(760, 560, 1120, 560, { color: C.gold, sw: 14, size: 26 }),
      NumberHero("219", 1360, 560, { size: 260, fill: C.green }),
      text("the real figure. Beat.", 1360, 700, { font: FONT.body, size: 40, fill: C.gray400, anchor: "middle" }),
    ].join(""),
  },

  // 8 — Free trial checkout.
  {
    num: 8, title: "Free trial checkout",
    cap: "Slow push in. \"Start your free trial.\"",
    build: () => [
      bg(C.cream),
      // browser chrome
      rect(360, 200, 1200, 700, { fill: C.paper, stroke: C.gray200, sw: STROKE.fine, rx: 18 }),
      rect(360, 200, 1200, 90, { fill: C.gray100, rx: 18 }),
      circle(420, 245, 10, { fill: C.gray300 }),
      circle(450, 245, 10, { fill: C.gray300 }),
      circle(480, 245, 10, { fill: C.gray300 }),
      text("checkout.example.com", 960, 250, { font: FONT.mono, size: 22, fill: C.gray400, anchor: "middle" }),
      text("Step 3 of 3 · Review", 420, 380, { font: FONT.body, size: 28, fill: C.gray400 }),
      text("Monthly plan", 420, 470, { font: FONT.body, size: 40, weight: weight.bold, fill: C.ink }),
      text("$10 / month after 30 days", 420, 530, { font: FONT.body, size: 30, fill: C.gray400 }),
      // glowing button
      rect(420, 620, 1080, 160, { fill: C.green, rx: 40 }),
      circle(1300, 700, 130, { fill: C.gold, op: 0.25 }),
      text("Start your free trial", 960, 715, { font: FONT.body, size: 64, weight: weight.bold, fill: C.paper, anchor: "middle" }),
      text("No commitment. Cancel anytime.", 960, 830, { font: FONT.body, size: 26, fill: C.gray400, anchor: "middle" }),
      CaptionBar("The button glows."),
    ].join(""),
  },
];