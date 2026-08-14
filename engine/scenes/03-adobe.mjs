// engine/scenes/03-adobe.mjs — scenes 22–35 (Act II: The day Adobe deleted ownership).

import {
  W, H, C, TYPE, TRACK, STROKE, FONT, weight, SAFE,
  rect, circle, line, path, g, text, row, bg, polyline, polygon,
  Kicker, CaptionBar, Card, Arrow, NumberHero, Donut, Figure,
  SectionHeader, ChartFrame, LineChart, BarChart, TextBlock, DocumentPage,
  BrowserWindow, Button, Screen, Stamp, MonoLine,
} from "./helpers.mjs";
import { NightBeat, MachineRow } from "./helpers.mjs";
import { StageScene, Courthouse, BrandWordmark, StandingFigure } from "./illustrations.mjs";

export const adobe = [
  // 22 — Boxed CS6.
  {
    num: 22, title: "Boxed CS6",
    cap: "Shrink-wrapped, rotating. A disc and a licence key that was yours.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE PRODUCT"),
      g([
        rect(660, 260, 600, 580, { fill: C.gold, stroke: C.ink, sw: 5, rx: 12, t: "rotate(-6 960 540)" }),
        rect(720, 330, 480, 200, { fill: C.ink, rx: 10, t: "rotate(-6 960 540)" }),
        text("PS", 960, 440, { font: FONT.display, size: 110, weight: weight.black, fill: C.paper, anchor: "middle", t: "rotate(-6 960 540)" }),
        text("Photoshop CS6", 960, 620, { font: FONT.body, size: 56, weight: weight.bold, fill: C.ink, anchor: "middle", t: "rotate(-6 960 540)" }),
        rect(720, 700, 480, 8, { fill: C.ink, op: 0.4, t: "rotate(-6 960 540)" }),
        rect(720, 722, 480, 8, { fill: C.ink, op: 0.4, t: "rotate(-6 960 540)" }),
        // shrink-wrap sheen
        polygon([[700, 300], [900, 300], [820, 380], [700, 380]], { fill: C.paper, op: 0.28, t: "rotate(-6 960 540)" }),
        polygon([[980, 480], [1180, 480], [1100, 560], [980, 560]], { fill: C.paper, op: 0.18, t: "rotate(-6 960 540)" }),
        // license key strip
        rect(720, 740, 480, 54, { fill: C.paper, stroke: C.gray300, sw: 2, rx: 6, t: "rotate(-6 960 540)" }),
        text("XXXX-XXXX-XXXX-XXXX", 960, 776, { font: FONT.mono, size: 26, weight: weight.bold, fill: C.ink, anchor: "middle", t: "rotate(-6 960 540)" }),
      ]),
      text("~$700", 300, 320, { font: FONT.display, size: 56, weight: weight.black, fill: C.green }),
      text("A disc and a licence key.", 300, 380, { font: FONT.body, size: 36, fill: C.ink }),
      text("That key was yours.", 300, 440, { font: FONT.body, size: 36, fill: C.ink }),
      text("Not rented. Yours.", 300, 500, { font: FONT.body, size: 36, fill: C.ink }),
      CaptionBar("Shrink-wrapped · rotating slowly"),
    ].join(""),
  },

  // 23 — Revenue sawtooth.
  {
    num: 23, title: "Revenue sawtooth",
    cap: "Spike at each major release, then decay — the chart Adobe wanted to flatten.",
    build: () => {
      const plot = { left: 220, right: 1700, top: 260, bottom: 780 };
      const spikes = [];
      const xs = [240, 330, 420, 560, 650, 740, 880, 970, 1060, 1200, 1290, 1380, 1520, 1610, 1700];
      const ys = [700, 700, 700, 640, 640, 640, 560, 560, 560, 480, 480, 480, 400, 400, 400];
      const peakYs = [620, 620, 620, 540, 540, 540, 440, 440, 440, 360, 360, 360, 290, 290, 290];
      xs.forEach((x, i) => {
        spikes.push(polygon([[x - 18, ys[i]], [x, peakYs[i]], [x + 18, ys[i]]], { fill: C.ink }));
      });
      return [
        bg(C.cream),
        SectionHeader("ADOBE REVENUE · 1998–2012"),
        Card(140, 180, 1640, 700),
        ChartFrame(plot, { xLabel: "1998 → 2012", yLabel: "$" }),
        g(spikes),
        LineChart(plot, [700, 700, 700, 640, 640, 640, 560, 560, 560, 480, 480, 480, 400, 400, 350], {
          min: 200, max: 800, color: C.green, sw: 10,
          endLabel: "sawtooth — spike at each release",
        }),
        text("…then a long flat stretch.", 220, 240, { font: FONT.body, size: 30, fill: C.ink }),
        CaptionBar("The chart Adobe wanted to flatten."),
      ].join("");
    },
  },

  // 24 — Adobe MAX 2013.
  {
    num: 24, title: "Adobe MAX 2013",
    cap: "Stage lighting. There would be no CS7.",
    build: () => [
      bg(C.cream),
      // stage + light cones + audience (original illustration)
      StageScene(),
      text("Adobe MAX — May 6, 2013", 960, 480, { font: FONT.body, size: 60, weight: weight.bold, fill: C.paper, anchor: "middle" }),
      text("\u201CCreative Suite is finished.\u201D", 960, 920, { font: FONT.body, size: 36, fill: C.ink, anchor: "middle" }),
    ].join(""),
  },

  // 25 — The reaction: forum / petition / tech press.
  {
    num: 25, title: "The reaction",
    cap: "Forum threads, petition screenshots, tech press. Fast.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE REACTION"),
      // forum
      BrowserWindow(140, 200, 400, 640),
      text("FORUM", 200, 300, { font: FONT.body, size: 34, weight: weight.bold, fill: C.gold }),
      text("\u201Chostage-taking\u201D", 200, 370, { font: FONT.body, size: 30, fill: C.ink }),
      TextBlock(200, 440, 280, 4, { rh: 26, fill: C.gray300, pattern: [1, 0.8, 0.9, 0.7] }),
      // petition
      BrowserWindow(600, 240, 400, 560),
      text("PETITION", 660, 340, { font: FONT.body, size: 34, weight: weight.bold, fill: C.gold }),
      text("tens of thousands", 660, 410, { font: FONT.body, size: 30, fill: C.ink }),
      TextBlock(660, 480, 280, 4, { rh: 26, fill: C.gray300, pattern: [1, 0.8, 0.9, 0.7] }),
      // tech press
      BrowserWindow(1060, 220, 400, 600),
      text("TECH PRESS", 1120, 320, { font: FONT.body, size: 34, weight: weight.bold, fill: C.gold }),
      text("\u201Ctwenty years of work\u201D", 1120, 390, { font: FONT.body, size: 30, fill: C.ink }),
      text("\u201Cfiles you can no longer open\u201D", 1120, 450, { font: FONT.body, size: 30, fill: C.ink }),
      TextBlock(1120, 520, 280, 4, { rh: 26, fill: C.gray300, pattern: [1, 0.8, 0.9, 0.7] }),
      CaptionBar("Three screens, one verdict."),
    ].join(""),
  },

  // 26 — Adobe did it anyway.
  {
    num: 26, title: "Beat of black",
    cap: "Then the revenue chart resumes.",
    build: () => NightBeat("Adobe did it anyway.", undefined, { y: 560, size: 120 }),
  },

  // 27 — Sawtooth → exponential.
  {
    num: 27, title: "Sawtooth → exponential",
    cap: "Let it run all the way to the right edge of the frame.",
    build: () => {
      const plot = { left: 220, right: 1700, top: 260, bottom: 780 };
      return [
        bg(C.cream),
        SectionHeader("THE SAWTOOTH FLATTENS INTO A CURVE"),
        Card(140, 180, 1640, 700),
        ChartFrame(plot, { xLabel: "2012 → 2023", yLabel: "$" }),
        g([[240, 700], [330, 700], [420, 700]].map(([x, y]) =>
          polygon([[x - 14, y], [x, y - 34], [x + 14, y]], { fill: C.ink, op: 0.4 })
        )),
        LineChart(plot, [740, 720, 700, 650, 580, 500, 420, 340, 280, 230, 200, 180], {
          min: 100, max: 800, color: C.green, sw: 12,
          endLabel: "smooth exponential — runs off the edge",
        }),
        CaptionBar("Let it run all the way to the right edge of the frame."),
      ].join("");
    },
  },

  // 28 — $1.23B → $18.28B.
  {
    num: 28, title: "$1.23B → $18.28B",
    cap: "The two figures side by side. What changed was ownership.",
    build: () => [
      bg(C.cream),
      rect(160, 240, 740, 600, { fill: C.gray100, stroke: C.gray300, sw: 3, rx: 14 }),
      text("2013", 240, 360, { font: FONT.body, size: 56, fill: C.gray400 }),
      text("$1.23B", 240, 560, { font: FONT.display, size: 96, weight: weight.black, fill: C.gray500 }),
      text("subscription revenue", 240, 660, { font: FONT.body, size: 34, fill: C.gray400 }),
      rect(1020, 240, 740, 600, { fill: C.gray100, stroke: C.gray300, sw: 3, rx: 14 }),
      text("2023", 1100, 360, { font: FONT.body, size: 56, fill: C.green }),
      text("$18.28B", 1100, 560, { font: FONT.display, size: 96, weight: weight.black, fill: C.green }),
      text("subscription revenue", 1100, 660, { font: FONT.body, size: 34, fill: C.gray400 }),
      text("15×", 960, 500, { font: FONT.display, size: 64, weight: weight.black, fill: C.gold, anchor: "middle" }),
      line(940, 560, 1000, 560, { stroke: C.gold, sw: 8 }),
      text("Adobe did not fifteen-times its revenue by being fifteen times better.", 960, 900, {
        font: FONT.body, size: 40, fill: C.ink, anchor: "middle",
      }),
    ].join(""),
  },

  // 29 — Boardroom chart.
  {
    num: 29, title: "Boardroom chart",
    cap: "Deliberately anonymous. A chart on a screen going up.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE BOARDROOM"),
      Card(460, 260, 1000, 560),
      // screen
      rect(560, 360, 800, 300, { fill: C.gray100, rx: 8 }),
      LineChart({ left: 640, right: 1300, top: 420, bottom: 600 }, [600, 560, 520, 460, 380, 300, 220], {
        min: 100, max: 700, color: C.green, sw: 8, area: C.green, areaOp: 0.1,
      }),
      // people silhouettes — standing, facing the chart
      StandingFigure(1330, 400, 34, { fill: C.gray400 }),
      StandingFigure(1380, 430, 34, { fill: C.gray400 }),
      StandingFigure(1330, 540, 34, { fill: C.gray400 }),
      StandingFigure(1380, 570, 34, { fill: C.gray400 }),
      text("boardroom stock footage — deliberately generic", 960, 180, {
        font: FONT.body, size: 36, fill: C.gray400, anchor: "middle",
      }),
      CaptionBar("A chart on a screen going up."),
    ].join(""),
  },

  // 30 — Cable → Netflix.
  {
    num: 30, title: "Cable → Netflix",
    cap: "Archival cable bill, the red envelope, the early streaming interface.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE ESCAPE"),
      // cable bill
      DocumentPage(140, 220, 480, 620),
      text("CABLE · 2007", 200, 310, { font: FONT.body, size: 36, weight: weight.bold, fill: C.ink }),
      TextBlock(200, 370, 380, 4, { rh: 28, fill: C.gray300, pattern: [1, 0.8, 0.9, 0.7] }),
      text("$106.20", 200, 680, { font: FONT.display, size: 64, weight: weight.black, fill: C.ink }),
      // red envelope
      rect(700, 300, 400, 280, { fill: C.brand.netflix, rx: 12, t: "translate(0 10)" }),
      BrandWordmark("netflix", 900, 430, 30, C.brand.netflix, { letterFill: C.paper }),
      // streaming UI
      rect(1240, 220, 540, 620, { fill: C.night, rx: 8 }),
      rect(1300, 280, 420, 60, { fill: C.green, rx: 6 }),
      rect(1300, 370, 420, 60, { fill: C.nightRule, rx: 6 }),
      rect(1300, 460, 300, 60, { fill: C.nightRule, rx: 6 }),
      rect(1300, 550, 420, 60, { fill: C.green, rx: 6 }),
      rect(1300, 640, 230, 60, { fill: C.nightRule, rx: 6 }),
      text("the escape was the point", 1510, 780, { font: FONT.body, size: 30, fill: C.nightDim, anchor: "middle" }),
      CaptionBar("cable bill → red envelope → streaming UI"),
    ].join(""),
  },

  // 31 — Streaming launches (montage of brand tiles).
  {
    num: 31, title: "Streaming launches",
    cap: "Montage in order, launch price on each. The catalogue split.",
    build: () => {
      const brands = [
        { name: "netflix", price: "$7.99", fill: C.brand.netflix, letter: C.paper },
        { name: "hulu", price: "$5.99", fill: C.brand.hulu, letter: C.ink },
        { name: "prime", price: "$8.99", fill: C.brand.prime, letter: C.paper },
        { name: "disney", price: "$6.99", fill: C.brand.disney, letter: C.paper },
        { name: "hbomax", price: "$14.99", fill: C.brand.hbomax, letter: C.paper },
        { name: "paramount", price: "$4.99", fill: C.brand.paramount, letter: C.paper },
        { name: "peacock", price: "$4.99", fill: C.brand.peacock, letter: C.paper },
        { name: "apple", price: "$4.99", fill: C.ink, letter: C.paper },
      ];
      const parts = [bg(C.cream), SectionHeader("THE CATALOGUE SPLITS")];
      const bw = 400, bh = 180, gx = 40, gy = 40;
      const startX = (W - (bw * 4 + gx * 3)) / 2;
      brands.forEach((b, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = startX + col * (bw + gx);
        const y = 240 + row * (bh + gy);
        parts.push(
          rect(x, y, bw, bh, { fill: b.fill, rx: 14, stroke: b.fill === C.paper ? C.gray200 : undefined, sw: 2 }),
          BrandWordmark(b.name, x + bw / 2, y + 54, 34, b.fill, { letterFill: b.letter }),
          text(b.price, x + bw / 2, y + 140, { font: FONT.mono, size: 26, weight: weight.medium, fill: b.letter, op: 0.85, anchor: "middle" }),
        );
      });
      parts.push(CaptionBar("The catalogue split."));
      return parts.join("");
    },
  },

  // 32 — The household stack.
  {
    num: 32, title: "The household stack",
    cap: "One household's logos, growing one at a time.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE HOUSEHOLD STACK"),
      rect(600, 200, 720, 440, { fill: C.night, rx: 14 }),
      g([
        BrandWordmark("netflix", 800, 282, 26, C.brand.netflix, { letterFill: C.paper }),
        BrandWordmark("hulu", 1040, 282, 26, C.brand.hulu, { letterFill: C.ink }),
        BrandWordmark("prime", 800, 366, 26, C.brand.prime, { letterFill: C.paper }),
        BrandWordmark("disney", 1040, 366, 26, C.brand.disney, { letterFill: C.paper }),
        BrandWordmark("hbomax", 1220, 366, 26, C.brand.hbomax, { letterFill: C.paper }),
      ]),
      text("4.7 services", 960, 780, { font: FONT.display, size: 64, weight: weight.black, fill: C.ink, anchor: "middle" }),
      text("$61/month — up from $48", 960, 850, { font: FONT.body, size: 36, fill: C.gray400, anchor: "middle" }),
      text("+ live TV → past $120", 960, 920, { font: FONT.body, size: 36, weight: weight.bold, fill: C.green, anchor: "middle" }),
      CaptionBar("Logos, growing one at a time."),
    ].join(""),
  },

  // 33 — Two bills, one total.
  {
    num: 33, title: "Two bills, one total",
    cap: "CABLE 2007 vs STREAMING 2026. The industry rebuilt the bundle.",
    build: () => [
      bg(C.cream),
      rect(120, 180, 760, 720, { fill: C.gray100, stroke: C.gray300, sw: 3, rx: 14 }),
      text("CABLE · 2007", 500, 280, { font: FONT.body, size: 48, weight: weight.bold, fill: C.ink, anchor: "middle" }),
      TextBlock(200, 340, 600, 5, { rh: 34, fill: C.gray300, pattern: [1, 0.8, 0.9, 0.7, 0.95] }),
      text("$108.40", 500, 700, { font: FONT.display, size: 76, weight: weight.black, fill: C.ink, anchor: "middle" }),
      rect(1040, 180, 760, 720, { fill: C.gray100, stroke: C.gray300, sw: 3, rx: 14 }),
      text("STREAMING · 2026", 1420, 280, { font: FONT.body, size: 48, weight: weight.bold, fill: C.green, anchor: "middle" }),
      TextBlock(1120, 340, 600, 6, { rh: 34, fill: C.green, pattern: [1, 0.8, 0.9, 0.7, 0.95, 0.6], op: 0.7 }),
      text("$121.60", 1420, 700, { font: FONT.display, size: 76, weight: weight.black, fill: C.ink, anchor: "middle" }),
      text("The totals are close. Hold on it.", 960, 950, {
        font: FONT.body, size: 40, fill: C.ink, anchor: "middle",
      }),
    ].join(""),
  },

  // 34 — Streamflation.
  {
    num: 34, title: "Streamflation",
    cap: "Six small, independent, individually petty increases.",
    build: () => [
      bg(C.cream),
      text("streamflation", W / 2, 300, { font: FONT.display, size: 110, weight: weight.black, fill: C.ink, anchor: "middle", tracking: 2 }),
      // six ticks with +$ labels
      g([[400, "+$1"], [680, "+$2"], [960, "+$1"], [1240, "+$3"], [1520, "+$2"]].map(([x, label], i) =>
        `<g stroke="${C.gold}" stroke-width="8" fill="none">${path(`M${x} 700 l60 -50 M${x} 700 l90 0`)}</g>${text(label, x + 45, 660, { font: FONT.body, size: 34, weight: weight.bold, fill: C.gold, anchor: "middle" })}`
      )),
      text("None of the increases is worth acting on alone.", W / 2, 880, {
        font: FONT.body, size: 40, fill: C.gray400, anchor: "middle",
      }),
      text("Together they rebuilt the bill you left.", W / 2, 950, {
        font: FONT.body, size: 40, weight: weight.bold, fill: C.green, anchor: "middle",
      }),
    ].join(""),
  },

  // 35 — $/mo everywhere.
  {
    num: 35, title: "$/mo everywhere",
    cap: "Car dashboard, printer, doorbell, thermostat — each with a small \"$/mo\" badge.",
    build: () => {
      // four device panels
      const devices = [
        // car dashboard
        g([
          rect(140, 220, 380, 260, { fill: C.paper, stroke: C.gray200, sw: 2, rx: 14 }),
          rect(180, 280, 300, 140, { fill: C.night, rx: 8 }),
          line(200, 350, 460, 350, { stroke: C.green, sw: 6 }),
          circle(330, 330, 14, { fill: C.paper }),
          circle(370, 330, 14, { fill: C.paper }),
          circle(410, 330, 14, { fill: C.paper }),
        ]),
        // printer
        g([
          rect(580, 220, 380, 260, { fill: C.paper, stroke: C.gray200, sw: 2, rx: 14 }),
          rect(620, 280, 300, 120, { fill: C.gray200, rx: 8 }),
          rect(640, 330, 260, 16, { fill: C.gray400 }),
          rect(640, 370, 200, 16, { fill: C.gray400 }),
        ]),
        // doorbell
        g([
          rect(1020, 220, 380, 260, { fill: C.paper, stroke: C.gray200, sw: 2, rx: 14 }),
          circle(1210, 330, 60, { fill: C.gold }),
          circle(1210, 330, 12, { fill: C.ink }),
        ]),
        // thermostat
        g([
          rect(1460, 220, 380, 260, { fill: C.paper, stroke: C.gray200, sw: 2, rx: 14 }),
          rect(1500, 280, 300, 140, { fill: C.brand.planetPurple, rx: 8 }),
          text("72°", 1650, 380, { font: FONT.display, size: 64, weight: weight.black, fill: C.paper, anchor: "middle" }),
        ]),
      ];
      const parts = [bg(C.cream), SectionHeader("$/mo EVERYWHERE")];
      devices.forEach((d, i) => {
        parts.push(d);
        const bx = 140 + i * 440 + 260;
        parts.push(
          rect(bx, 520, 130, 46, { fill: C.green, rx: 10 }),
          text("$/mo", bx + 65, 552, { font: FONT.body, size: 26, weight: weight.bold, fill: C.paper, anchor: "middle" }),
        );
      });
      parts.push(
        text("Car. Printer. Doorbell. Thermostat.", W / 2, 680, {
          font: FONT.body, size: 40, weight: weight.bold, fill: C.ink, anchor: "middle",
        }),
        text("Everything you own, slowly renting itself back to you.", W / 2, 760, {
          font: FONT.body, size: 34, fill: C.gray400, anchor: "middle",
        }),
        CaptionBar("Each with a small \"$/mo\" badge."),
      );
      return parts.join("");
    },
  },
];