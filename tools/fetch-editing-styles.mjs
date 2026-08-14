// Fetches the editing intelligence mined by yt_scrapper (pacing rules,
// retention position curve, per-sentence emphasis coefficients) into a
// committed rules file the Remotion director consumes. Run from repo root:
//
//   node tools/fetch-editing-styles.mjs [--source C:\Users\naikr\yt_scrapper]
//
// Output: video/src/mcd/data/director-rules.json — the single source of
// editing style. Re-run whenever yt_scrapper's reports change.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_SOURCE = "C:\\Users\\naikr\\yt_scrapper";
const OUT = join(ROOT, "video", "src", "mcd", "data", "director-rules.json");

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const source = resolve(arg("--source") ?? DEFAULT_SOURCE);

const readJson = (rel, fallback) => {
  try {
    return JSON.parse(readFileSync(join(source, rel), "utf8"));
  } catch {
    return fallback;
  }
};

// --- retention position curve (50 bins, heat_z residualized on position) --
const retention = readJson("reports/retention_coefficients.json", null);
const curve = retention?.position_curve ?? [];
const position = curve.map((v, i) => ({
  bin: i / 50,
  peak: v,
  // normalized 0..1 "watch this moment" intensity
  intensity: Math.min(1, Math.max(0, (v + 0.9813) / (0.4191 + 0.9813))),
}));

// --- sentence-level emphasis signals (effect on heat) ----------------------
const coeff = (retention?.coefficients ?? []).reduce((m, c) => {
  m[c.feature] = { effect: c.effect, label: c.label, robust: c.robust };
  return m;
}, {});
const signals = {
  // positive signals → beat/hit on the narration chunk carrying them
  number_specific: coeff.number_specific?.effect ?? 0.031,
  new_entity: coeff.new_entity?.effect ?? 0.027,
  is_contrast: coeff.is_contrast?.effect ?? 0.0215,
  names_org: coeff.names_org?.effect ?? 0.0196,
  has_dollar: coeff.has_dollar?.effect ?? 0.0178,
  has_number: coeff.has_number?.effect ?? -0.0203,
  has_percent: coeff.has_percent?.effect ?? -0.0132,
  wpm: coeff.wpm?.effect ?? -0.0782,
};

// --- pacing benchmarks (video-feature outliers) ----------------------------
const benchmarks = readJson("reports/benchmarks.json", {});
const pacing = {
  maxStaticShotSec: 8,
  minStaticShotSec: 1.5,
  cutBand: [10, 24],
  // long-form story docs run 840-2721 s (p25-p90); shorts 481-1739 s
  targetSec: {
    short: benchmarks.explainer?.long?.duration_sec?.p50 ?? 895,
    long: benchmarks.story_doc?.long?.duration_sec?.p50 ?? 1682,
  },
};

// --- canonical arc labels (mcd_scenes.json) --------------------------------
const arc = readJson("reports/mcd_scenes.json", { scenes: [] }).scenes ?? [];

const rules = {
  source: "yt_scrapper reports (retention_coefficients.json, benchmarks.json, mcd_scenes.json)",
  fetchedAt: new Date().toISOString(),
  pacing,
  signals,
  position,
  arc,
  motion: {
    // camera vocabulary; each variant: base entry scale, travel, settle point
    pushIn: { entry: 0.92, settle: 1.0, settleAt: 0.55 },
    pullOut: { entry: 1.06, settle: 0.94, settleAt: 0.65 },
    panLeft: { entry: 0.98, settle: 1.02, settleAt: 0.6, dx: -340 },
    panRight: { entry: 0.98, settle: 1.02, settleAt: 0.6, dx: 340 },
    panUp: { entry: 1.0, settle: 1.05, settleAt: 0.62, dy: -300 },
    panDown: { entry: 1.02, settle: 1.02, settleAt: 0.62, dy: 300 },
    drift: { entry: 1.0, settle: 1.02, settleAt: 0.7, dx: 80, dy: 40 },
    static: { entry: 1.0, settle: 1.0, settleAt: 0.5 },
    punch: { entry: 1.02, settle: 1.06, settleAt: 0.6 },
    orbit: { entry: 1.0, settle: 1.0, settleAt: 0.7, dx: 240, dy: -160 },
  },
  // preferred move per scene type; "auto" lets the planner vary within a pool
  typeBias: {
    hook: ["pushIn", "drift", "panRight"],
    global: ["drift", "panUp", "pushIn"],
    map: ["orbit", "panRight", "drift"],
    money: ["pullOut", "punch", "drift"],
    model: ["orbit", "panLeft", "drift"],
    chart: ["panRight", "pushIn", "drift"],
    finale: ["pullOut", "static", "drift"],
    title: ["static", "pushIn", "pullOut"],
    reveal: ["punch", "pushIn", "static"],
  },
  // word signals → which narration chunks earn a hit (impact beat)
  beatSignals: {
    hitWords: ["but", "however", "yet", "instead", "no", "never", "actually", "worse", "only", "even"],
    moneyRe: String.raw`(\$|\b\d[\d,]*\b)`,
    percentRe: String.raw`percent|%|\d+\s*%?`,
    entityRe: String.raw`[A-Z][a-z]+`,
  },
};

mkdirSync(join(OUT, ".."), { recursive: true });
writeFileSync(OUT, JSON.stringify(rules, null, 2) + "\n", "utf8");
console.log(`[fetch-editing-styles] ${Object.keys(rules.position).length} bins, ` +
  `${Object.keys(rules.signals).length} signals, ${rules.motion ? Object.keys(rules.motion).length : 0} motions`);
console.log(`[fetch-editing-styles] wrote ${OUT}`);