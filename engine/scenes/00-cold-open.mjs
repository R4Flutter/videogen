// engine/scenes/00-cold-open.mjs — scenes 1–5 (cold open).

import {
  W, H, C, TYPE, TRACK, STROKE, FONT, weight, SAFE,
  rect, circle, line, path, g, text, row, bg,
  Kicker, CaptionBar, Card, Arrow, NumberHero, Donut, Figure, SectionHeader,
} from "./helpers.mjs";
import { NightBeat, MachineRow } from "./helpers.mjs";
import { GymRow } from "./illustrations.mjs";

export const coldOpen = [
  // 1 — Empty gym. Dark environment: machine rows, one figure, caption line.
  {
    num: 1, title: "Empty gym",
    cap: "Rows of machines, nobody on them. Fluorescent hum. One figure far away. Hold 6 s — no narration.",
    build: () => [
      bg(C.cream),
      // back wall + floor
      rect(0, 0, W, 620, { fill: C.gray100 }),
      rect(0, 620, W, H - 620, { fill: C.gray200 }),
      // fluorescent bars
      g([
        rect(240, 110, 440, 10, { fill: C.green, op: 0.55, rx: 5 }),
        rect(820, 110, 440, 10, { fill: C.green, op: 0.55, rx: 5 }),
        rect(1400, 110, 320, 10, { fill: C.green, op: 0.55, rx: 5 }),
      ]),
      // mirror band — reflection hint + frame
      rect(180, 240, 1560, 260, { fill: C.paper, stroke: C.gray300, sw: 3, rx: 8 }),
      g([
        line(500, 270, 500, 480, { stroke: C.gray200, sw: 3, dash: "2 10" }),
        line(960, 270, 960, 480, { stroke: C.gray200, sw: 3, dash: "2 10" }),
        line(1420, 270, 1420, 480, { stroke: C.gray200, sw: 3, dash: "2 10" }),
        line(300, 375, 1660, 375, { stroke: C.gray200, sw: 2, dash: "2 10" }),
      ]),
      // machines — far row (drawn equipment, smaller + dimmer)
      g(GymRow(430, 7, { s: 24, metal: C.gray300, op: 1 })),
      // near row — drawn machines with ink linework
      g(GymRow(700, 5, { s: 34, metal: C.gray300 })),
      // one lone figure on a treadmill
      g([Figure(960, 590, 38, { color: C.ink })]),
      text("PLANET FITNESS · 4:00 AM", W / 2, 1010, {
        font: FONT.body, size: TYPE.label, fill: C.gray400, anchor: "middle", tracking: TRACK.label,
      }),
    ].join(""),
  },

  // 2 — The arithmetic. Night beat with stacked data lines.
  {
    num: 2, title: "The arithmetic",
    cap: "Lines appear one at a time.",
    build: () => {
      const rows = [
        ["18.7 million", "members", C.green],
        ["~2,500", "gyms", C.green],
        ["7,200", "members per location", C.green],
        ["20,000 sq ft", "typical gym", C.gold],
        ["200–350", "fire code occupancy", C.gold],
      ];
      const parts = [bg(C.cream)];
      rows.forEach(([v, l, col], i) => {
        const y = 300 + i * 140;
        parts.push(
          circle(320, y - 18, 14, { fill: col }),
          text(v, 380, y, { font: FONT.display, size: 64, weight: weight.black, fill: C.ink }),
          text(l, 380 + 12 + estimate(v), y - 8, { font: FONT.body, size: 24, fill: C.gray400 }),
        );
      });
      return parts.join("");
    },
  },

  // 3 — The gap. Two cards, THE GAP between them.
  {
    num: 3, title: "The gap sits there",
    cap: "Membership vs. what the room can hold. Let it breathe.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE GAP"),
      Card(160, 280, 640, 520),
      NumberHero("7,200", 480, 480, { size: 120 }),
      text("members / location", 480, 560, { font: FONT.body, size: 34, fill: C.gray400, anchor: "middle" }),
      Card(1120, 280, 640, 520),
      NumberHero("200–350", 1440, 480, { size: 104 }),
      text("occupancy / night", 1440, 560, { font: FONT.body, size: 34, fill: C.gray400, anchor: "middle" }),
      Arrow(820, 540, 1100, 540, { color: C.green, sw: 8, size: 22 }),
      text("THE GAP", 960, 640, { font: FONT.display, size: 56, weight: weight.black, fill: C.green, anchor: "middle", tracking: 6 }),
      CaptionBar("7,200 members could never fit the room at once."),
    ].join(""),
  },

  // 4 — 4% / 10%. Two number heroes on dark cards.
  {
    num: 4, title: "4% / 10%",
    cap: "The numbers land on the empty room.",
    build: () => [
      bg(C.cream),
      Card(140, 240, 780, 600),
      NumberHero("4%", 530, 480, { size: 200, fill: C.green }),
      text("show up together", 530, 580, { font: FONT.body, size: 40, anchor: "middle", fill: C.ink }),
      text("the fire marshal closes it", 530, 640, { font: FONT.body, size: 40, anchor: "middle", fill: C.gray400 }),
      Card(1000, 240, 780, 600),
      NumberHero("10%", 1390, 480, { size: 200, fill: C.gold }),
      text("show up", 1390, 580, { font: FONT.body, size: 40, anchor: "middle", fill: C.ink }),
      text("the business ends in a month", 1390, 640, { font: FONT.body, size: 40, anchor: "middle", fill: C.gray400 }),
      CaptionBar("The difference between fine and finished is 6 percentage points."),
    ].join(""),
  },

  // 5 — It's the product. Restrained black beat.
  {
    num: 5, title: "It's the product",
    cap: "Beat. Cut back to the empty gym.",
    build: () => [
      bg(C.cream),
      text("This is not a risk the company manages.", W / 2, 470, {
        font: FONT.body, size: 66, fill: C.gray400, anchor: "middle",
      }),
      text("It's the product.", W / 2, 620, {
        font: FONT.display, size: 120, weight: weight.black, fill: C.ink, anchor: "middle", tracking: 2,
      }),
    ].join(""),
  },
];

const estimate = (s) => {
  let w = 0;
  for (const ch of s) w += ch === " " ? 0.3 : 0.6;
  return w * 24;
};