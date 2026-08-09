// NoveltyBudget: not everything may move at once. Each beat gets a budget of
// visual motion, and every element that moves costs against it — the module,
// the camera, the captions, the typography. When the budget is exceeded the
// director *removes* something rather than letting the frame compete with
// itself. The rule of thumb: if the type is flying, the camera stands still;
// if the camera is pushing, the page stays calm.
import type { CaptionMode, ScriptBeat } from "../types.ts";

/** How much motion a module brings to the frame, 0..1. */
export const MODULE_MOTION: Record<string, number> = {
  kinetic: 0.9, // words fly in one at a time
  collage: 0.8, // cards land and drift
  trace: 0.7, // token rides the line
  trust: 0.7, // signals check in, then flip
  doodle: 0.6, // footage + a hand-drawn mark
  compare: 0.6, // two bars race
  icon: 0.55, // cards wipe in
  chart: 0.55, // the pen draws
  timeline: 0.5, // markers land one by one
  funnel: 0.5, // bars narrow
  map: 0.5, // the globe turns, pins drop
  stat: 0.5, // one number rolls
  callout: 0.45, // ring, then leader line
  footage: 0.35, // a clip breathes under a headline
  quote: 0.3, // a clipping lands, then holds
};

/** Motion cost of a camera move, 0..1. */
export const CAMERA_MOTION: Record<string, number> = {
  establish: 0.1,
  settle: 0.1,
  reveal: 0.35,
  pull: 0.35,
  push: 0.4,
  pan: 0.4,
  compare: 0.45,
  focus: 0.5,
};

export const CAPTION_MOTION: Record<CaptionMode, number> = {
  NONE: 0,
  LOWER_THIRD: 0.05,
  SUBTITLE: 0.15,
  EMPHASIS: 0.25,
  FULL: 0.3,
};

export type BudgetDecision = {
  /** 0..1: how loaded the frame is. 1 = everything at once. */
  load: number;
  /** The camera intent after budget trimming (settle = no motion). */
  camera: string;
  /** The caption mode after budget trimming. */
  captionMode: CaptionMode;
  /** Whether the frame is over budget and something had to go. */
  trimmed: boolean;
  /** Whether this beat was exempted as a hero moment. */
  hero?: boolean;
};

/**
 * Hero moments: the budget exists to be broken, a few times, on purpose.
 *
 * Everything above this point only ever *subtracts* — which produces a film
 * with no frame louder than any other, and peak–end says a film with no peak
 * is remembered as its average. So a small number of beats are exempted and
 * allowed to spend everything at once: the module, the camera and the type all
 * moving together, which is the frame someone screenshots.
 *
 * Scarcity is the whole mechanism. Four or five in a ten-minute film; more
 * than that and the exemption stops meaning anything, which is precisely the
 * "everything louder than everything else" failure MrBeast publicly walked
 * back in 2024.
 */
export const HERO_PER_MINUTE = 0.5;
export const HERO_CEILING = 1.55;

/** Which beats get to be heroes.
 *
 *  Ranked by what the story says is important — the biggest reveals, then the
 *  payoff — not by what looks good. A hero moment on a beat the story doesn't
 *  care about is just noise with a bigger budget. Deterministic: same script,
 *  same heroes. */
export const pickHeroBeats = (
  beats: ScriptBeat[],
  score: (b: ScriptBeat, i: number) => number,
  durationInSeconds: number,
): Set<number> => {
  const max = Math.max(1, Math.round((durationInSeconds / 60) * HERO_PER_MINUTE));
  const ranked = beats
    .map((b, i) => ({ n: b.n, i, s: score(b, i) }))
    .filter((x) => x.s > 0)
    .sort((a, z) => z.s - a.s || a.i - z.i);

  // Heroes must not cluster: two adjacent peaks are one peak, and the second
  // one is wasted. Minimum spacing is a twelfth of the runtime.
  const minGap = Math.max(3, Math.floor(beats.length / 12));
  const chosen: number[] = [];
  for (const cand of ranked) {
    if (chosen.length >= max) break;
    if (chosen.some((i) => Math.abs(i - cand.i) < minGap)) continue;
    chosen.push(cand.i);
  }
  return new Set(chosen.map((i) => beats[i].n));
};

export const budgetFor = (
  b: ScriptBeat,
  module: string,
  cameraIntent: string,
  captionMode: CaptionMode,
  hero = false,
): BudgetDecision => {
  const m = MODULE_MOTION[module] ?? 0.5;
  const c = CAMERA_MOTION[cameraIntent] ?? 0.3;
  const t = CAPTION_MOTION[captionMode];
  let load = m + c + t;

  // Nothing may be fully still unless it is meant to be: a rest beat's load
  // floor is its module's own motion.
  let outCamera = cameraIntent;
  let outCaption = captionMode;
  let trimmed = false;

  // Quieting captions is a ladder, not a switch. Dropping SUBTITLE straight to
  // NONE strips every word off the frame in one step; stepping down through
  // EMPHASIS keeps the stressed words — the ones the viewer is scanning for —
  // and only goes fully silent when nothing cheaper is left.
  const QUIETER: Record<CaptionMode, CaptionMode> = {
    FULL: "SUBTITLE",
    SUBTITLE: "EMPHASIS",
    EMPHASIS: "LOWER_THIRD",
    LOWER_THIRD: "NONE",
    NONE: "NONE",
  };

  // A hero beat is allowed to spend up to HERO_CEILING. Nothing is trimmed;
  // the frame is *supposed* to be doing too much, because that is what makes
  // it the frame the viewer remembers.
  const ceiling = hero ? HERO_CEILING : 1.15;
  if (hero && load <= ceiling) {
    return { load: Number(load.toFixed(2)), camera: outCamera, captionMode: outCaption, trimmed: false, hero: true };
  }

  while (load > ceiling && outCaption !== "NONE") {
    outCaption = QUIETER[outCaption];
    load = m + c + CAPTION_MOTION[outCaption];
    trimmed = true;
  }
  if (load > ceiling) {
    if (CAMERA_MOTION[outCamera] > 0.2) {
      outCamera = "settle";
      load = m + CAMERA_MOTION.settle + CAPTION_MOTION[outCaption];
      trimmed = true;
    }
  }

  return { load: Number(load.toFixed(2)), camera: outCamera, captionMode: outCaption, trimmed, hero };
};
