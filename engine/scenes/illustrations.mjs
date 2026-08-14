// engine/scenes/illustrations.mjs — original editorial vector illustrations.
// Hand-built house-palette art: real objects drawn as flat shapes (machines,
// stage, courthouse, brand wordmarks, audience) instead of generic gray
// rects. Deterministic, token-driven, structural-QA clean.

import {
  W, H, C, FONT, weight,
  rect, circle, line, path, g, text, polygon,
} from "./helpers.mjs";

// ---------------------------------------------------------------- gym machines

// Treadmill: deck + belt + upright console. cx = deck centre, y = deck top.
export const Treadmill = (cx, y, s, o = {}) => {
  const ink = o.ink ?? C.ink;
  const metal = o.metal ?? C.gray300;
  return g([
    // deck
    rect(cx - 2.3 * s, y + 0.2 * s, 4.6 * s, 0.8 * s, { fill: metal, stroke: ink, sw: 3, rx: 0.3 * s }),
    rect(cx - 1.9 * s, y + 0.5 * s, 3.8 * s, 0.3 * s, { fill: ink, op: 0.85 }),
    // upright console
    rect(cx + 1.3 * s, y - 1.5 * s, 0.5 * s, 1.7 * s, { fill: metal, stroke: ink, sw: 3 }),
    rect(cx + 0.7 * s, y - 2.2 * s, 1.9 * s, 0.8 * s, { fill: metal, stroke: ink, sw: 3, rx: 0.2 * s }),
    circle(cx + 1.0 * s, y - 1.8 * s, 0.14 * s, { fill: ink }),
    circle(cx + 1.4 * s, y - 1.8 * s, 0.14 * s, { fill: ink }),
    circle(cx + 1.8 * s, y - 1.8 * s, 0.14 * s, { fill: ink }),
    // base rails
    rect(cx - 2.3 * s, y + 1.0 * s, 4.6 * s, 0.16 * s, { fill: ink, op: 0.5 }),
    rect(cx - 2.1 * s, y + 1.2 * s, 0.4 * s, 0.5 * s, { fill: ink, op: 0.5 }),
    rect(cx + 1.7 * s, y + 1.2 * s, 0.4 * s, 0.5 * s, { fill: ink, op: 0.5 }),
  ], { t: o.t });
};

// Elliptical: loop frame + arms + console.
export const Elliptical = (cx, y, s, o = {}) => {
  const ink = o.ink ?? C.ink;
  const metal = o.metal ?? C.gray300;
  return g([
    path(`M${cx - 1.7 * s} ${y + 1.2 * s} a${1.7 * s} ${1.3 * s} 0 0 1 ${3.4 * s} 0`, {
      stroke: ink, sw: 0.26 * s, fill: "none",
    }),
    rect(cx - 0.8 * s, y + 0.55 * s, 1.6 * s, 0.14 * s, { fill: ink }),
    // handle arms
    path(`M${cx - 0.9 * s} ${y + 0.3 * s} q${-0.9 * s} ${-0.4 * s} ${-0.3 * s} ${-1.4 * s}`, {
      stroke: ink, sw: 0.22 * s, fill: "none", cap: "round",
    }),
    path(`M${cx + 0.9 * s} ${y + 0.3 * s} q${0.9 * s} ${-0.4 * s} ${0.3 * s} ${-1.4 * s}`, {
      stroke: ink, sw: 0.22 * s, fill: "none", cap: "round",
    }),
    // console
    rect(cx - 0.9 * s, y - 1.6 * s, 1.8 * s, 0.7 * s, { fill: metal, stroke: ink, sw: 3, rx: 0.2 * s }),
    rect(cx - 0.55 * s, y - 1.35 * s, 1.1 * s, 0.2 * s, { fill: ink, op: 0.7 }),
    // pedals
    circle(cx - 1.4 * s, y + 0.35 * s, 0.16 * s, { fill: ink }),
    circle(cx + 1.4 * s, y + 0.35 * s, 0.16 * s, { fill: ink }),
  ], { t: o.t });
};

// Stationary bike: wheel + fork + handlebars + seat.
export const Bike = (cx, y, s, o = {}) => {
  const ink = o.ink ?? C.ink;
  return g([
    circle(cx, y + 1.1 * s, 1.1 * s, { fill: "none", stroke: ink, sw: 0.22 * s }),
    circle(cx, y + 1.1 * s, 0.18 * s, { fill: ink }),
    path(`M${cx} ${y + 1.1 * s} L${cx} ${y - 0.3 * s}`, { stroke: ink, sw: 0.24 * s }),
    path(`M${cx} ${y - 0.3 * s} L${cx - 0.9 * s} ${y - 1.5 * s}`, { stroke: ink, sw: 0.24 * s }),
    path(`M${cx} ${y - 0.3 * s} L${cx + 1.0 * s} ${y - 0.9 * s}`, { stroke: ink, sw: 0.24 * s }),
    // seat
    rect(cx - 0.7 * s, y - 1.8 * s, 1.4 * s, 0.3 * s, { fill: ink, rx: 0.15 * s }),
    // pedals
    path(`M${cx - 0.5 * s} ${y + 0.7 * s} L${cx + 0.5 * s} ${y + 0.7 * s}`, { stroke: ink, sw: 0.2 * s }),
  ], { t: o.t });
};

// Cable machine: tall frame, weight stack, pulley arm.
export const CableMachine = (cx, y, s, o = {}) => {
  const ink = o.ink ?? C.ink;
  const metal = o.metal ?? C.gray300;
  return g([
    rect(cx - 0.7 * s, y, 1.4 * s, 2.6 * s, { fill: metal, stroke: ink, sw: 3, rx: 0.2 * s }),
    // weight stack plates
    g([0, 1, 2, 3].map((i) =>
      rect(cx - 0.5 * s, y + 0.3 * s + i * 0.42 * s, 1.0 * s, 0.34 * s, {
        fill: C.paper, stroke: ink, sw: 3, rx: 0.1 * s,
      })
    )),
    // pulley arm
    path(`M${cx + 0.7 * s} ${y + 0.4 * s} q${1.6 * s} ${0.2 * s} ${1.3 * s} ${1.6 * s}`, {
      stroke: ink, sw: 0.24 * s, fill: "none", cap: "round",
    }),
    circle(cx + 1.9 * s, y + 2.1 * s, 0.3 * s, { fill: ink }),
    // cable
    path(`M${cx + 1.55 * s} ${y + 2.2 * s} L${cx + 0.5 * s} ${y + 2.6 * s}`, {
      stroke: ink, sw: 0.12 * s, fill: "none",
    }),
    // base
    rect(cx - 1.0 * s, y + 2.55 * s, 2.0 * s, 0.22 * s, { fill: ink, op: 0.6 }),
  ], { t: o.t });
};

// A mixed row of gym equipment — each machine drawn, not a gray rect.
export const GymRow = (y, count, o = {}) => {
  const types = [Treadmill, Elliptical, Bike, CableMachine];
  const total = o.totalW ?? 1600;
  const start = (W - total) / 2;
  const bw = total / count;
  const s = o.s ?? 34;
  const parts = [];
  for (let i = 0; i < count; i++) {
    const cx = start + i * bw + bw / 2;
    const T = types[i % types.length];
    const jitter = ((i * 37) % 7) - 3;
    parts.push(T(cx + jitter, y, s, o));
  }
  return parts.join("");
};

// ---------------------------------------------------------------- audience

// Standing person silhouette (boardroom, crowd).
export const StandingFigure = (cx, y, s, o = {}) => {
  const c = o.fill ?? C.ink;
  const limb = Math.max(3, s * 0.24);
  return g([
    circle(cx, y - 1.9 * s, 0.62 * s, { fill: c }),
    path(`M${cx - 0.45 * s} ${y - 1.2 * s} Q${cx} ${y - 0.3 * s} ${cx + 0.45 * s} ${y - 1.2 * s}`, {
      stroke: c, sw: limb, fill: "none", cap: "round",
    }),
    path(`M${cx} ${y - 0.9 * s} L${cx} ${y + 0.7 * s}`, { stroke: c, sw: limb, cap: "round" }),
    path(`M${cx} ${y + 0.7 * s} L${cx - 0.55 * s} ${y + 1.9 * s}`, { stroke: c, sw: limb, cap: "round" }),
    path(`M${cx} ${y + 0.7 * s} L${cx + 0.55 * s} ${y + 1.9 * s}`, { stroke: c, sw: limb, cap: "round" }),
    path(`M${cx} ${y - 0.2 * s} L${cx + 0.6 * s} ${y + 0.4 * s}`, { stroke: c, sw: limb, cap: "round" }),
  ], { t: o.t });
};

// Seated audience member (from the back): head + shoulders.
export const AudienceSeat = (cx, y, s, o = {}) => g([
  rect(cx - 0.9 * s, y, 1.8 * s, 1.4 * s, { fill: C.gray300, rx: 0.3 * s }),
  circle(cx, y - 0.9 * s, 0.5 * s, { fill: o.fill ?? C.ink }),
  path(`M${cx - 0.8 * s} ${y} Q${cx} ${y + 0.4 * s} ${cx + 0.8 * s} ${y}`, {
    stroke: o.fill ?? C.ink, sw: 0.45 * s, fill: "none", cap: "round",
  }),
], { t: o.t });

export const AudienceRow = (y, xs, o = {}) =>
  xs.map((x, i) => AudienceSeat(x, y, o.s ?? 30, { fill: i % 5 === 0 ? C.gray400 : C.ink })).join("");

// ---------------------------------------------------------------- stage

// Conference stage: platform, screen, light cones, audience rows.
export const StageScene = (o = {}) => {
  const platformY = o.platformY ?? 470;
  return [
    // platform
    rect(520, platformY, 880, 60, { fill: C.ink, rx: 8 }),
    rect(520, platformY + 60, 880, 24, { fill: C.ink, op: 0.4 }),
    // screen
    rect(760, 300, 400, 170, { fill: C.paper, stroke: C.ink, sw: 4, rx: 6 }),
    // light cones
    polygon([[820, 300], [520, 150], [620, 150]], { fill: C.gold, op: 0.14 }),
    polygon([[1100, 300], [1300, 150], [1400, 150]], { fill: C.gold, op: 0.14 }),
    // audience
    AudienceRow(platformY + 150, [300, 480, 660, 840, 1020, 1200, 1380, 1560], { s: 26 }),
    AudienceRow(platformY + 300, [360, 540, 720, 900, 1080, 1260, 1440, 1620], { s: 30 }),
    AudienceRow(platformY + 460, [300, 480, 660, 840, 1020, 1200, 1380, 1560], { s: 34 }),
  ].join("");
};

// ---------------------------------------------------------------- courthouse

// Federal courthouse: pediment, columns with capitals, steps, door.
export const Courthouse = (cx, y, s, o = {}) => {
  const ink = o.ink ?? C.ink;
  const stone = o.stone ?? C.gray100;
  const colW = 0.34 * s;
  return g([
    // pediment
    polygon([[cx - 1.6 * s, y], [cx, y - 1.15 * s], [cx + 1.6 * s, y]], {
      fill: stone, stroke: ink, sw: 4,
    }),
    rect(cx - 1.6 * s, y, 3.2 * s, 0.16 * s, { fill: ink }),
    // frieze text blocks
    rect(cx - 1.0 * s, y + 0.3 * s, 2.0 * s, 0.22 * s, { fill: C.gray300, rx: 2 }),
    rect(cx - 0.75 * s, y + 0.62 * s, 1.5 * s, 0.18 * s, { fill: C.gray300, rx: 2 }),
    // columns
    g([-1.35, -0.45, 0.45, 1.35].map((dx) =>
      g([
        rect(cx + dx * s - colW / 2, y + 0.9 * s, colW, 2.2 * s, {
          fill: stone, stroke: ink, sw: 3,
        }),
        // capital
        rect(cx + dx * s - colW * 0.75, y + 0.86 * s, colW * 1.5, 0.14 * s, { fill: ink }),
        // base
        rect(cx + dx * s - colW * 0.75, y + 3.06 * s, colW * 1.5, 0.12 * s, { fill: ink }),
      ])
    )),
    // entablature
    rect(cx - 1.6 * s, y + 0.9 * s, 3.2 * s, 0.18 * s, { fill: ink }),
    // steps
    rect(cx - 1.7 * s, y + 3.25 * s, 3.4 * s, 0.3 * s, { fill: stone, stroke: ink, sw: 3 }),
    rect(cx - 1.85 * s, y + 3.6 * s, 3.7 * s, 0.3 * s, { fill: stone, stroke: ink, sw: 3 }),
    // door
    rect(cx - 0.34 * s, y + 1.35 * s, 0.68 * s, 1.9 * s, { fill: C.ink, rx: 0.2 * s }),
  ], { t: o.t });
};

// ---------------------------------------------------------------- brand wordmarks

// Original flat wordmark treatments for the streaming tiles. Drawn, not text —
// each mark reads as its brand by colour + letterform family.
const letterBlocks = (str, x, y, s, fill, o = {}) => {
  const gap = 0.16 * s;
  const parts = [];
  let cursor = x;
  for (const ch of String(str)) {
    const w = ch === "i" ? 0.34 * s : ch === "l" || ch === "j" ? 0.38 * s : ch === "m" || ch === "w" ? 0.9 * s : 0.68 * s;
    parts.push(rect(cursor, y, w, 1.05 * s, { fill, rx: o.rx ?? 0.08 * s }));
    cursor += w + gap;
  }
  return { parts: parts.join(""), w: cursor - x - gap };
};

export const BrandWordmark = (name, cx, y, s, fill, o = {}) => {
  const letter = o.letterFill ?? C.paper;
  if (name === "netflix") {
    // stacked wordmark, red field
    const inner = 0.62 * s;
    const bx = letterBlocks("NETFLIX", cx - 3.6 * s, y, inner, letter, o);
    return g([
      rect(cx - 3.9 * s, y - 0.3 * s, 7.8 * s, 2.0 * s, { fill, rx: 0.3 * s }),
      bx.parts,
    ]);
  }
  if (name === "hulu") {
    const inner = 0.72 * s;
    const bx = letterBlocks("hulu", cx - 2.0 * s, y, inner, C.ink, o);
    return g([
      rect(cx - 2.4 * s, y - 0.4 * s, 4.8 * s, 2.1 * s, { fill, rx: 0.4 * s }),
      bx.parts,
    ]);
  }
  if (name === "prime") {
    // wordmark + smile arrow
    const inner = 0.5 * s;
    const bx = letterBlocks("PRIME VIDEO", cx - 3.4 * s, y + 0.1 * s, inner, letter, o);
    const aw = 2.6 * s;
    return g([
      rect(cx - 3.7 * s, y - 0.2 * s, 7.4 * s, 2.1 * s, { fill, rx: 0.3 * s }),
      bx.parts,
      path(`M${cx - 0.9 * s} ${y + 1.35 * s} q${0.45 * s} ${0.5 * s} ${0.9 * s} 0 l${0.34 * s} ${0.34 * s} l${0.34 * s} ${-0.34 * s} q${0.45 * s} ${0.5 * s} ${0.9 * s} 0`, {
        stroke: letter, sw: 0.09 * s, fill: "none",
      }),
      // smile under the arrow
      path(`M${cx - 0.5 * s} ${y + 1.75 * s} q${0.5 * s} ${0.25 * s} ${1.0 * s} 0`, {
        stroke: letter, sw: 0.08 * s, fill: "none",
      }),
    ]);
  }
  if (name === "disney") {
    // D+ mark
    const inner = 0.62 * s;
    const bx = letterBlocks("DISNEY", cx - 2.6 * s, y, inner, letter, o);
    return g([
      rect(cx - 2.9 * s, y - 0.3 * s, 5.8 * s, 2.0 * s, { fill, rx: 0.3 * s }),
      bx.parts,
      // plus
      path(`M${cx + 2.35 * s} ${y - 0.2 * s} v${1.1 * s} M${cx + 1.8 * s} ${y + 0.35 * s} h${1.1 * s}`, {
        stroke: letter, sw: 0.28 * s, cap: "round",
      }),
    ]);
  }
  if (name === "hbomax") {
    const inner = 0.5 * s;
    const b1 = letterBlocks("HBO", cx - 2.2 * s, y, inner, letter, o);
    const b2 = letterBlocks("MAX", cx - 1.1 * s, y + 0.85 * s, 0.62 * s, letter, o);
    return g([
      rect(cx - 2.6 * s, y - 0.35 * s, 5.2 * s, 2.4 * s, { fill, rx: 0.35 * s }),
      b1.parts,
      b2.parts,
    ]);
  }
  if (name === "paramount") {
    // mountain mark + wordmark
    const inner = 0.5 * s;
    const bx = letterBlocks("PARAMOUNT", cx - 2.9 * s, y + 0.4 * s, inner, letter, o);
    return g([
      rect(cx - 3.2 * s, y - 0.2 * s, 6.4 * s, 2.3 * s, { fill, rx: 0.3 * s }),
      path(`M${cx - 0.75 * s} ${y + 0.15 * s} L${cx} ${y + 0.9 * s} L${cx + 0.75 * s} ${y + 0.15 * s}`, {
        stroke: letter, sw: 0.14 * s, fill: "none",
      }),
      bx.parts,
    ]);
  }
  if (name === "peacock") {
    const inner = 0.5 * s;
    const bx = letterBlocks("PEACOCK", cx - 2.7 * s, y + 0.4 * s, inner, letter, o);
    return g([
      rect(cx - 3.0 * s, y - 0.2 * s, 6.0 * s, 2.3 * s, { fill, rx: 0.3 * s }),
      // eye fan
      g([-0.9, -0.45, 0, 0.45, 0.9].map((dx, i) =>
        path(`M${cx + dx * s} ${y + 0.5 * s} q${0.18 * s} ${(i % 2 === 0 ? -0.5 : 0.5) * s} ${0.3 * s} ${-0.8 * s}`, {
          stroke: letter, sw: 0.1 * s, fill: "none",
        })
      )),
      bx.parts,
    ]);
  }
  // apple tv+
  const inner = 0.5 * s;
  const bx = letterBlocks("apple tv+", cx - 2.6 * s, y, inner, letter, o);
  return g([
    rect(cx - 2.9 * s, y - 0.3 * s, 5.8 * s, 2.0 * s, { fill, rx: 0.3 * s }),
    bx.parts,
    // apple glyph: leaf + body
    path(`M${cx + 2.2 * s} ${y + 0.2 * s} q${-0.3 * s} ${0.35 * s} ${-0.6 * s} ${0.15 * s}`, {
      stroke: letter, sw: 0.1 * s, fill: "none", cap: "round",
    }),
    circle(cx + 1.9 * s, y + 0.35 * s, 0.22 * s, { fill: "none", stroke: letter, sw: 0.08 * s }),
    circle(cx + 2.35 * s, y + 0.35 * s, 0.22 * s, { fill: "none", stroke: letter, sw: 0.08 * s }),
  ]);
};