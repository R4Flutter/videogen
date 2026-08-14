// engine/scenes/04-iliad.mjs — scenes 36–45 (Act III: The Iliad).

import {
  W, H, C, TYPE, TRACK, STROKE, FONT, weight, SAFE,
  rect, circle, line, path, g, text, row, bg, polyline, polygon,
  Kicker, CaptionBar, Card, Arrow, NumberHero, Donut, Figure,
  SectionHeader, ChartFrame, LineChart, BarChart, TextBlock, DocumentPage,
  BrowserWindow, Button, Screen, Stamp, MonoLine,
} from "./helpers.mjs";
import { NightBeat, MachineRow } from "./helpers.mjs";
import { Courthouse } from "./illustrations.mjs";

export const iliad = [
  // 36 — Prime signup.
  {
    num: 36, title: "Prime signup",
    cap: "The large yellow button. The small grey \"No thanks\" beside it.",
    build: () => [
      bg(C.cream),
      SectionHeader("CHECKOUT · STEP 3 OF 3"),
      Card(340, 160, 1240, 780),
      text("Add Prime — free shipping,", 420, 300, { font: FONT.body, size: 52, weight: weight.bold, fill: C.ink }),
      text("video, music & more", 420, 380, { font: FONT.body, size: 52, weight: weight.bold, fill: C.ink }),
      rect(420, 500, 900, 140, { fill: C.gold, rx: 20 }),
      text("Continue with Prime", 870, 600, { font: FONT.body, size: 52, weight: weight.bold, fill: C.ink, anchor: "middle" }),
      text("No thanks — continue without Prime benefits", 870, 770, {
        font: FONT.body, size: 34, fill: C.gray300, anchor: "middle",
      }),
      CaptionBar("The large yellow button. The small grey line."),
    ].join(""),
  },

  // 37 — The dark pattern.
  {
    num: 37, title: "The dark pattern",
    cap: "The expensive choice is the easy one; the free choice is a small grey line.",
    build: () => [
      bg(C.cream),
      SectionHeader("TWO PATHS FROM THE SAME CHECKOUT"),
      // buy with prime
      rect(140, 220, 1640, 260, { fill: C.green, op: 0.12, stroke: C.green, sw: 4, rx: 14 }),
      text("BUY WITH PRIME", 220, 300, { font: FONT.body, size: 44, weight: weight.bold, fill: C.green }),
      g([
        rect(220, 360, 380, 70, { fill: C.green, rx: 12 }),
        rect(660, 360, 380, 70, { fill: C.green, rx: 12 }),
        rect(1100, 360, 380, 70, { fill: C.green, rx: 12 }),
      ]),
      text("1 · bright", 410, 404, { font: FONT.body, size: 30, weight: weight.bold, fill: C.paper, anchor: "middle" }),
      text("2 · obvious", 850, 404, { font: FONT.body, size: 30, weight: weight.bold, fill: C.paper, anchor: "middle" }),
      text("3 · done", 1290, 404, { font: FONT.body, size: 30, weight: weight.bold, fill: C.paper, anchor: "middle" }),
      // without prime
      rect(140, 540, 1640, 300, { fill: C.gray100, stroke: C.gray400, sw: 3, rx: 14 }),
      text("BUY WITHOUT PRIME", 220, 620, { font: FONT.body, size: 44, weight: weight.bold, fill: C.gray400 }),
      g([
        rect(220, 680, 300, 56, { fill: C.gray300, rx: 10 }),
        rect(560, 680, 360, 56, { fill: C.gray300, rx: 10 }),
        rect(960, 680, 300, 56, { fill: C.gray300, rx: 10 }),
      ]),
      text("small", 370, 716, { font: FONT.body, size: 26, weight: weight.bold, fill: C.paper, anchor: "middle" }),
      text("grey", 740, 716, { font: FONT.body, size: 26, weight: weight.bold, fill: C.paper, anchor: "middle" }),
      text("ambiguous", 1110, 716, { font: FONT.body, size: 26, weight: weight.bold, fill: C.paper, anchor: "middle" }),
      text("Dark patterns. Not lies. Design.", 220, 810, { font: FONT.body, size: 32, fill: C.gray400 }),
      CaptionBar("The expensive choice is the easy one."),
    ].join(""),
  },

  // 38 — "Iliad".
  {
    num: 38, title: "\"Iliad\"",
    cap: "Single word, centre frame. Internally, Amazon employees had a name for it. 2-second beat.",
    build: () => [
      bg(C.cream),
      text("Iliad", W / 2, 520, { font: FONT.display, size: 200, weight: weight.black, fill: C.ink, anchor: "middle", tracking: 10 }),
      text("a war that lasted ten years", W / 2, 680, { font: FONT.body, size: 44, fill: C.gray400, anchor: "middle" }),
    ].join(""),
  },

  // 39 — Homer, worn pages.
  {
    num: 39, title: "Homer, worn pages",
    cap: "An old edition. Named after an epic that wouldn't end. They named it, and they kept it.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE NAME"),
      rect(440, 140, 1040, 800, { fill: C.brand.fitzgerald, stroke: "#8A7B4D", sw: 4, rx: 14 }),
      // worn pages texture
      TextBlock(520, 260, 400, 10, { rh: 34, fill: "#6B5D38", pattern: [1, 0.85, 0.9, 0.7, 0.95, 0.8, 1, 0.75, 0.9, 0.7], op: 0.9 }),
      TextBlock(840, 260, 400, 10, { rh: 34, fill: "#6B5D38", pattern: [1, 0.85, 0.9, 0.7, 0.95, 0.8, 1, 0.75, 0.9, 0.7], op: 0.9 }),
      line(760, 200, 760, 880, { stroke: "#8A7B4D", sw: 5 }),
      path("M560 660 q40 -80 120 -40", { stroke: C.green, sw: 6 }),
      text("pages, worn", 600, 760, { font: FONT.body, size: 30, fill: "#6B5D38" }),
      text("the story it reminded them of famously would not end", 960, 950, {
        font: FONT.body, size: 32, fill: C.gray400, anchor: "middle",
      }),
      CaptionBar("Named after an epic that wouldn't end."),
    ].join(""),
  },

  // 40 — FTC release.
  {
    num: 40, title: "FTC release",
    cap: "September 25, 2025. The settlement that ended the month-long jury trial.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE RECORD"),
      DocumentPage(360, 160, 1200, 760),
      circle(500, 290, 46, { fill: C.ink }),
      text("FTC", 500, 306, { font: FONT.body, size: 40, weight: weight.black, fill: C.paper, anchor: "middle" }),
      text("Federal Trade Commission", 620, 330, { font: FONT.body, size: 44, weight: weight.bold, fill: C.ink }),
      text("Press release · September 25, 2025", 620, 390, { font: FONT.body, size: 36, fill: C.gray400 }),
      line(440, 440, 1480, 440, { stroke: C.ink, sw: 3 }),
      text("Amazon to pay $2.5 billion", 440, 540, { font: FONT.body, size: 60, weight: weight.bold, fill: C.ink }),
      text("in landmark FTC settlement", 440, 620, { font: FONT.body, size: 46, fill: C.ink }),
      TextBlock(440, 700, 900, 3, { rh: 30, fill: C.gray300, pattern: [1, 0.8, 0.9] }),
      text("Official seal. Let it sit.", 960, 880, { font: FONT.body, size: 32, fill: C.gray400, anchor: "middle" }),
      CaptionBar("September 25, 2025."),
    ].join(""),
  },

  // 41 — $2.5B, split in two.
  {
    num: 41, title: "$2.5B, split in two",
    cap: "The figure broken into its two parts.",
    build: () => [
      bg(C.cream),
      NumberHero("$2.5B", W / 2, 300, { size: 180, fill: C.ink }),
      rect(240, 440, 620, 220, { fill: C.gray100, stroke: C.gray300, sw: 3, rx: 14 }),
      text("$1.0B", 550, 530, { font: FONT.display, size: 60, weight: weight.black, fill: C.ink, anchor: "middle" }),
      text("civil penalty — the largest", 550, 600, { font: FONT.body, size: 36, fill: C.gray400, anchor: "middle" }),
      text("ever for an FTC rule", 550, 650, { font: FONT.body, size: 36, fill: C.gray400, anchor: "middle" }),
      rect(1060, 440, 620, 220, { fill: C.gray100, stroke: C.gray300, sw: 3, rx: 14 }),
      text("$1.5B", 1370, 530, { font: FONT.display, size: 60, weight: weight.black, fill: C.green, anchor: "middle" }),
      text("refunds to customers", 1370, 600, { font: FONT.body, size: 36, fill: C.gray400, anchor: "middle" }),
      text("enrolled without meaningfully agreeing", 1370, 650, { font: FONT.body, size: 36, fill: C.gray400, anchor: "middle" }),
    ].join(""),
  },

  // 42 — The Adobe filing.
  {
    num: 42, title: "The Adobe filing",
    cap: "June 2024. Same story, second company.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE RECORD"),
      DocumentPage(360, 160, 1200, 760),
      rect(440, 240, 1040, 90, { fill: C.gold, rx: 8 }),
      text("ADOBE", 960, 305, { font: FONT.body, size: 52, weight: weight.bold, fill: C.ink, anchor: "middle" }),
      text("United States v. Adobe", 440, 420, { font: FONT.body, size: 52, weight: weight.bold, fill: C.ink }),
      text("Court filing · June 2024", 440, 500, { font: FONT.body, size: 40, fill: C.gray400 }),
      TextBlock(440, 580, 900, 4, { rh: 30, fill: C.gray300, pattern: [1, 0.8, 0.9, 0.7] }),
      text("the same Adobe — over how hard it was to leave", 960, 800, {
        font: FONT.body, size: 34, weight: weight.bold, fill: C.green, anchor: "middle",
      }),
      CaptionBar("Same story, second company."),
    ].join(""),
  },

  // 43 — The 50% fee.
  {
    num: 43, title: "The 50% fee",
    cap: "The fee appears at the final step. Highlight it.",
    build: () => [
      bg(C.cream),
      text("Cancel my plan", W / 2, 140, { font: FONT.body, size: 42, fill: C.gray400, anchor: "middle" }),
      g([
        rect(340, 220, 1240, 90, { fill: C.paper, stroke: C.gray300, sw: 2, rx: 12 }),
        rect(340, 340, 1240, 90, { fill: C.paper, stroke: C.gray300, sw: 2, rx: 12 }),
        rect(340, 460, 1240, 90, { fill: C.paper, stroke: C.gray300, sw: 2, rx: 12 }),
      ]),
      text("Are you sure you want to cancel?", 420, 278, { font: FONT.body, size: 34, fill: C.ink }),
      text("Here's what you'll lose…", 420, 398, { font: FONT.body, size: 34, fill: C.ink }),
      text("Here's an offer — pause instead?", 420, 518, { font: FONT.body, size: 34, fill: C.ink }),
      // the final step — highlighted
      rect(340, 580, 1240, 130, { fill: C.gold, op: 0.12, stroke: C.gold, sw: 6, rx: 12 }),
      text("Early termination fee", 420, 640, { font: FONT.body, size: 38, weight: weight.bold, fill: C.gold }),
      text("50% of remaining contract", 420, 690, { font: FONT.display, size: 58, weight: weight.black, fill: C.gold }),
      text("discovered at the final step, buried behind optional text boxes", 960, 820, {
        font: FONT.body, size: 34, fill: C.gray400, anchor: "middle",
      }),
    ].join(""),
  },

  // 44 — $2.5B vs $75M.
  {
    num: 44, title: "$2.5B vs $75M",
    cap: "The two settlements side by side.",
    build: () => [
      bg(C.cream),
      text("Two of the largest companies in America,", W / 2, 220, {
        font: FONT.body, size: 48, weight: weight.bold, fill: C.ink, anchor: "middle",
      }),
      text("under two years, one underlying thing.", W / 2, 290, {
        font: FONT.body, size: 48, weight: weight.bold, fill: C.ink, anchor: "middle",
      }),
      Card(240, 400, 620, 480),
      NumberHero("$2.5B", 550, 580, { size: 110 }),
      text("Amazon · Sept 2025", 550, 680, { font: FONT.body, size: 36, fill: C.gray400, anchor: "middle" }),
      line(240, 880, 860, 880, { stroke: C.gray400, sw: 4 }),
      Card(1060, 600, 620, 280),
      NumberHero("$75M", 1370, 730, { size: 90 }),
      text("Adobe · June 2024", 1370, 800, { font: FONT.body, size: 36, fill: C.gray400, anchor: "middle" }),
      CaptionBar("The same underlying thing, two different price tags."),
    ].join(""),
  },

  // 45 — Courthouse.
  {
    num: 45, title: "Courthouse",
    cap: "Slow push toward the courthouse. The obvious question.",
    build: () => [
      bg(C.cream),
      SectionHeader("THE QUESTION"),
      Courthouse(960, 250, 175),
      text("federal courthouse", 960, 870, { font: FONT.body, size: 30, fill: C.gray400, anchor: "middle" }),
      text("If the penalties are this large… surely somebody wrote a rule.", 960, 940, {
        font: FONT.body, size: 34, fill: C.gray400, anchor: "middle",
      }),
      CaptionBar("The obvious question."),
    ].join(""),
  },
];