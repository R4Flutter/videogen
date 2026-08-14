// engine/scenes/02-breakage.mjs — scenes 9–21 (Act I: Breakage).

import {
  W, H, C, TYPE, TRACK, STROKE, FONT, weight, SAFE,
  rect, circle, line, path, g, text, row, bg, polyline,
  Kicker, CaptionBar, Card, Arrow, NumberHero, Donut, Figure,
  SectionHeader, ChartFrame, LineChart, BarChart, TextBlock, DocumentPage,
  BrowserWindow, Button, Screen, Stamp, MonoLine,
} from "./helpers.mjs";
import { NightBeat, MachineRow } from "./helpers.mjs";
import { estimateWidth } from "../svg.mjs";

export const breakage = [
  // 9 — Cost structure: flat cost line, revenue climbs.
  {
    num: 9, title: "Cost structure",
    cap: "Flat cost line; revenue climbs with each new member.",
    build: () => {
      const plot = { left: 220, right: 1700, top: 260, bottom: 760 };
      return [
        bg(C.cream),
        SectionHeader("COST STRUCTURE"),
        Card(140, 180, 1640, 700),
        ChartFrame(plot, { xLabel: "MEMBERS", yLabel: "$" }),
        line(plot.left, 660, plot.right, 660, { stroke: C.gray400, sw: 4 }),
        text("costs — fixed, flat", 470, 625, { font: FONT.body, size: 26, fill: C.gray400 }),
        LineChart(plot, [150, 170, 190, 240, 330, 460, 620, 800], {
          min: 0, max: 850, color: C.green, sw: 10,
          endLabel: "revenue per member", labelAnchor: "left",
        }),
        text("Every additional member is almost pure profit…", 220, 170, {
          font: FONT.body, size: 28, fill: C.gray400,
        }),
        CaptionBar("Fixed costs, climbing revenue — the machine's happy place."),
      ].join("");
    },
  },

  // 10 — Cost-to-serve spike.
  {
    num: 10, title: "Cost-to-serve spike",
    cap: "Revenue keeps climbing; cost to serve stays flat, then spikes.",
    build: () => {
      const plot = { left: 220, right: 1700, top: 260, bottom: 760 };
      return [
        bg(C.cream),
        SectionHeader("COST TO SERVE"),
        Card(140, 180, 1640, 700),
        ChartFrame(plot, { xLabel: "MEMBERS", yLabel: "$" }),
        LineChart(plot, [150, 170, 190, 240, 330, 460, 620, 800], {
          min: 0, max: 850, color: C.green, sw: 10,
          endLabel: "revenue", labelAnchor: "left",
        }),
        // cost line flat then spikes
        path("M220 680 H1150 L1150 680 L1220 680 L1300 340 L1700 160", {
          stroke: C.gold, sw: 8,
        }),
        text("cost to serve", 1700, 130, { font: FONT.body, size: 28, weight: weight.bold, fill: C.gold, anchor: "end" }),
        text("…right up until they actually turn up.", 220, 170, {
          font: FONT.body, size: 28, fill: C.gray400,
        }),
        CaptionBar("The moment the room fills, the math breaks."),
      ].join("");
    },
  },

  // 11 — The ideal customer: donut 2/3 unused.
  {
    num: 11, title: "The ideal customer",
    cap: "Two-thirds never come — the one who pays and doesn't turn up.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE IDEAL CUSTOMER"),
      Card(140, 220, 720, 640),
      Donut(500, 540, 250, 0.66, { color: C.green, sw: 48, track: C.gray100 }),
      text("2/3", 500, 565, { font: FONT.display, size: 84, weight: weight.black, fill: C.ink, anchor: "middle" }),
      text("unused", 500, 640, { font: FONT.body, size: 32, fill: C.gray400, anchor: "middle" }),
      text("up to two-thirds of memberships", 1000, 420, { font: FONT.body, size: 48, weight: weight.bold, fill: C.ink }),
      text("essentially never used", 1000, 500, { font: FONT.body, size: 48, weight: weight.bold, fill: C.ink }),
      text("Some intended to go.", 1000, 640, { font: FONT.body, size: 32, fill: C.gray400 }),
      text("Most intended to go in January.", 1000, 700, { font: FONT.body, size: 32, fill: C.gray400 }),
      CaptionBar("The customer who pays and never comes is the product."),
    ].join(""),
  },

  // 12 — Google Trends: January spike, February collapse.
  {
    num: 12, title: "Google Trends",
    cap: "January spike, February collapse — looped across years until the pattern is undeniable.",
    build: () => {
      const items = [];
      const years = 4;
      for (let y = 0; y < years; y++) {
        items.push({ label: "JAN", value: 90, accent: true });
        items.push({ label: "FEB", value: 25, accent: false, fade: true });
        items.push({ label: "MAR", value: 20, accent: false, fade: true });
        items.push({ label: "JUL", value: 15, accent: false, fade: true });
        items.push({ label: "DEC", value: 12, accent: false, fade: true });
        items.push({ label: "JAN", value: 95, accent: true });
        items.push({ label: "FEB", value: 28, accent: false, fade: true });
        items.push({ label: "MAR", value: 22, accent: false, fade: true });
        items.push({ label: "JUL", value: 16, accent: false, fade: true });
        items.push({ label: "DEC", value: 14, accent: false, fade: true });
      }
      return [
        bg(C.cream),
        SectionHeader("GOOGLE TRENDS · “GYM NEAR ME”"),
        Card(140, 180, 1640, 700),
        text("gym near me", 960, 150, { font: FONT.body, size: 40, weight: weight.bold, fill: C.ink, anchor: "middle" }),
        BarChart({ left: 200, right: 1720, top: 320, bottom: 780 }, items, {
          gap: 30, values: false, xLabels: true, xSize: 20, accentColor: C.gold, rx: 8,
        }),
        text("the January spike · the February collapse · every year", 960, 840, {
          font: FONT.body, size: 26, fill: C.gray400, anchor: "middle",
        }),
        CaptionBar("Same search. Same season. Every single year."),
      ].join("");
    },
  },

  // 13 — BREAKAGE.
  {
    num: 13, title: "Breakage",
    cap: "BLACK. Single word, centre frame, held.",
    build: () => NightBeat("BREAKAGE.", undefined, {
      y: 580, size: 170, tracking: 14,
    }) + text("1.5 seconds of silence.", W / 2, 710, {
      font: FONT.body, size: 36, fill: C.gray400, anchor: "middle",
    }),
  },

  // 14 — Gift card → subscription.
  {
    num: 14, title: "Gift card → subscription",
    cap: "The card breaks once; a subscription breaks every single month, forever.",
    build: () => [
      bg(C.cream),
      SectionHeader("BREAKAGE"),
      // gift card
      rect(240, 240, 620, 420, { fill: C.paper, stroke: C.ink, sw: 4, rx: 12, t: "rotate(-3 550 450)" }),
      rect(320, 300, 460, 60, { fill: C.gray300, rx: 4, t: "rotate(-3 550 450)" }),
      text("GIFT CARD", 550, 520, { font: FONT.body, size: 64, weight: weight.bold, fill: C.ink, anchor: "middle", t: "rotate(-3 550 450)" }),
      text("breaks ONCE", 1380, 380, { font: FONT.display, size: 64, weight: weight.black, fill: C.green, anchor: "middle" }),
      Arrow(940, 500, 1160, 430, { color: C.green, sw: 6 }),
      text("subscriptions", 1380, 640, { font: FONT.display, size: 64, weight: weight.black, fill: C.ink, anchor: "middle" }),
      text("break every month", 1380, 730, { font: FONT.display, size: 64, weight: weight.black, fill: C.green, anchor: "middle" }),
      CaptionBar("One gift. One lifetime of charges."),
    ].join(""),
  },

  // 15 — Calendar of charges.
  {
    num: 15, title: "Calendar of charges",
    cap: "Single charge repeating month after month, off the bottom of the frame.",
    build: () => {
      const parts = [bg(C.cream), SectionHeader("RECURRING")];
      for (let i = 0; i < 9; i++) {
        const y = 210 + i * 86;
        parts.push(
          rect(850, y, 220, 60, { fill: C.green, rx: 10, op: 0.92 }),
          text("$10.00", 1160, y + 40, { font: FONT.mono, size: 28, weight: weight.bold, fill: C.green }),
          text(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP"][i], 800, y + 40, {
            font: FONT.mono, size: 22, fill: C.gray400, anchor: "end",
          }),
        );
      }
      parts.push(
        path("M960 990 v60", { stroke: C.gray400, sw: 6, markerEnd: "url(#cont)" }),
        `<defs><marker id="cont" markerWidth="16" markerHeight="16" refX="12" refY="6" orient="auto"><path d="M0 0 L14 6 L0 12 z" fill="${C.gray400}"/></marker></defs>`,
        text("…off the bottom", 1160, 990, { font: FONT.body, size: 28, weight: weight.bold, fill: C.green }),
        text("until somebody", 300, 440, { font: FONT.body, size: 44, weight: weight.bold, fill: C.ink }),
        text("actively stops it.", 300, 510, { font: FONT.body, size: 44, weight: weight.bold, fill: C.ink }),
        CaptionBar("A decision you made once, repeating forever."),
      );
      return parts.join("");
    },
  },

  // 16 — Bally contract with small print zoom.
  {
    num: 16, title: "Bally contract",
    cap: "Camera moves down past the signature to the small print underneath.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE CONTRACT"),
      DocumentPage(240, 200, 700, 700),
      rect(300, 260, 580, 40, { fill: C.gray100, rx: 4 }),
      TextBlock(300, 340, 580, 4, { rh: 22, fill: C.gray300, pattern: [1, 0.8, 0.9, 0.7] }),
      line(300, 470, 880, 470, { stroke: C.ink, sw: 6 }),
      path("M560 470 q-60 60 -120 70", { stroke: C.ink, sw: 8 }),
      text("MEMBERSHIP AGREEMENT", 300, 620, { font: FONT.body, size: 34, weight: weight.bold, fill: C.ink }),
      text("Term: THREE YEARS", 300, 680, { font: FONT.mono, size: 26, fill: C.gray400 }),
      text("Cancellation: by mail only", 300, 720, { font: FONT.mono, size: 26, fill: C.gray400 }),
      // zoom: small print
      Card(1080, 320, 600, 480, { rx: 14 }),
      text("SMALL PRINT", 1140, 390, { font: FONT.body, size: 40, weight: weight.bold, fill: C.ink }),
      TextBlock(1140, 440, 500, 5, { rh: 30, fill: C.gray300, pattern: [1, 0.85, 0.9, 0.7, 0.95] }),
      text("\u201C3-year term, no exceptions\u201D", 1140, 690, {
        font: FONT.body, size: 30, weight: weight.bold, fill: C.green,
      }),
      text("camera moves past the signature line", 1380, 250, {
        font: FONT.body, size: 24, fill: C.gray400, anchor: "middle",
      }),
      CaptionBar("The promise is in the small print."),
    ].join(""),
  },

  // 17 — Clippings / complaints.
  {
    num: 17, title: "Clippings / complaints",
    cap: "Newspaper clippings, consumer-affairs segments, complaint forms. Dry.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE RECORD"),
      // three clippings
      g([
        DocumentPage(160, 220, 460, 620, { rx: 6, t: "rotate(-2 390 530)" }),
        rect(210, 280, 360, 30, { fill: C.gray400, rx: 4, t: "rotate(-2 390 530)" }),
        TextBlock(210, 340, 360, 6, { rh: 24, fill: C.gray300, pattern: [1, 0.8, 0.9, 0.7, 1, 0.75], t: "rotate(-2 390 530)" }),
      ]),
      g([
        DocumentPage(680, 260, 460, 580, { rx: 6, t: "rotate(2 910 550)" }),
        rect(730, 320, 360, 30, { fill: C.gray400, rx: 4, t: "rotate(2 910 550)" }),
        TextBlock(730, 380, 360, 5, { rh: 24, fill: C.gray300, pattern: [1, 0.8, 0.9, 0.7, 1], t: "rotate(2 910 550)" }),
      ]),
      // complaint form — highlighted
      Card(1200, 300, 560, 520, { rx: 12, sw: 8, shadowOp: 0 }),
      rect(1200, 300, 560, 520, { fill: "none", stroke: C.gold, sw: 8, rx: 12 }),
      text("600+ complaints", 1240, 400, { font: FONT.display, size: 44, weight: weight.black, fill: C.gold }),
      text("cancellations \u201Cnot honoured\u201D", 1240, 460, { font: FONT.body, size: 28, fill: C.ink }),
      TextBlock(1240, 540, 480, 4, { rh: 22, fill: C.gray300, pattern: [1, 0.85, 0.9, 0.7] }),
      CaptionBar("Keep it dry — no dramatic music."),
    ].join(""),
  },

  // 18 — Wrong tool.
  {
    num: 18, title: "Wrong tool",
    cap: "BLACK. The next generation removed the contract.",
    build: () => NightBeat("The contract was the wrong tool.", undefined, { y: 560, size: 100 }),
  },

  // 19 — Planet Fitness storefront.
  {
    num: 19, title: "Planet Fitness storefront",
    cap: "Purple and yellow. Bright, cheap, unthreatening.",
    build: () => {
      // striped awning
      const stripes = [];
      const awY = 320, awW = 1560, awH = 130, awX = 180, n = 12;
      const sw = awW / n;
      for (let i = 0; i < n; i++) {
        stripes.push(rect(awX + i * sw, awY, sw, awH, {
          fill: i % 2 === 0 ? C.brand.planetPurple : C.brand.planetGold,
        }));
      }
      return [
        bg(C.cream),
        SectionHeader("THE STOREFRONT"),
        // building facade
        rect(140, 450, 1640, 420, { fill: C.gray100, stroke: C.ink, sw: 4, rx: 12 }),
        // awning
        g(stripes),
        rect(awX, awY, awW, 14, { fill: C.ink, op: 0.9 }),
        // window + door
        rect(220, 500, 640, 320, { fill: C.night, rx: 8 }),
        rect(900, 500, 400, 320, { fill: C.night, rx: 8 }),
        rect(1340, 500, 380, 320, { fill: C.paper, stroke: C.ink, sw: 4, rx: 8 }),
        // sign
        rect(260, 540, 560, 90, { fill: C.paper, rx: 6 }),
        text("PLANET FITNESS", 540, 606, { font: FONT.body, size: 52, weight: weight.black, fill: C.ink, anchor: "middle", tracking: 4 }),
        text("You can cancel. No term.", W / 2, 480, { font: FONT.body, size: 56, weight: weight.bold, fill: C.ink, anchor: "middle" }),
        text("On paper, the most consumer-friendly gym in America.", W / 2, 600, {
          font: FONT.body, size: 40, fill: C.gray400, anchor: "middle",
        }),
        text("Leaving is just not worth the afternoon.", W / 2, 960, {
          font: FONT.body, size: 40, weight: weight.bold, fill: C.green, anchor: "middle",
        }),
        CaptionBar("Bright, cheap, unthreatening — by design."),
      ].join("");
    },
  },

  // 20 — $10 among the noise.
  {
    num: 20, title: "$10 among the noise",
    cap: "A line item among dozens. Below the threshold where cancelling feels worth it.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE STATEMENT"),
      DocumentPage(200, 200, 660, 700),
      TextBlock(260, 270, 560, 12, { rh: 34, fill: C.gray300, pattern: [1, 0.85, 0.9, 0.7, 0.95, 0.8, 1, 0.75, 0.9, 0.85, 0.7, 0.95] }),
      // highlighted row
      rect(246, 442, 586, 36, { fill: C.green, op: 0.1, rx: 6 }),
      rect(260, 448, 420, 24, { fill: C.gray200, stroke: C.green, sw: 3, rx: 3 }),
      text("…dozens of others.", 260, 860, { font: FONT.body, size: 30, fill: C.gray400 }),
      // right column
      text("$10.00", 1120, 400, { font: FONT.display, size: 84, weight: weight.black, fill: C.green }),
      text("visually indistinguishable", 1120, 480, { font: FONT.body, size: 38, fill: C.ink }),
      text("from noise.", 1120, 540, { font: FONT.body, size: 38, fill: C.ink }),
      text("20 minutes of irritation", 1120, 700, { font: FONT.body, size: 36, fill: C.gray400 }),
      text("to recover ten dollars.", 1120, 760, { font: FONT.body, size: 36, fill: C.gray400 }),
      CaptionBar("Below the threshold where cancelling feels worth it."),
    ].join(""),
  },

  // 21 — $10/mo vs $120/yr.
  {
    num: 21, title: "$10/mo vs $120/yr",
    cap: "Split screen. The right side fades up slowly.",
    build: () => [
      bg(C.cream),
      rect(160, 180, 760, 720, { fill: C.gray100, stroke: C.gray300, sw: 3, rx: 14 }),
      text("$10/month", 540, 380, { font: FONT.display, size: 96, weight: weight.black, fill: C.ink, anchor: "middle" }),
      text("feels like nothing", 540, 470, { font: FONT.body, size: 34, fill: C.gray400, anchor: "middle" }),
      rect(1000, 180, 760, 720, { fill: C.gray100, stroke: C.gray300, sw: 3, rx: 14 }),
      text("$120/year", 1380, 380, { font: FONT.display, size: 96, weight: weight.black, fill: C.gold, anchor: "middle" }),
      text("fades up slowly,", 1380, 470, { font: FONT.body, size: 34, fill: C.gray400, anchor: "middle" }),
      text("as if it had always been there", 1380, 520, { font: FONT.body, size: 34, fill: C.gray400, anchor: "middle" }),
      text("stopping costs more", 1380, 700, { font: FONT.body, size: 42, weight: weight.bold, fill: C.green, anchor: "middle" }),
      text("than continuing", 1380, 760, { font: FONT.body, size: 42, weight: weight.bold, fill: C.green, anchor: "middle" }),
    ].join(""),
  },
];