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
};

export const budgetFor = (
  b: ScriptBeat,
  module: string,
  cameraIntent: string,
  captionMode: CaptionMode,
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

  if (load > 1.15) {
    // Highest-motion caption first, then the camera: the type is the loudest
    // thing on a page, and a moving camera under flying type is how frames
    // get noisy.
    if (outCaption !== "NONE") {
      outCaption = outCaption === "FULL" ? "SUBTITLE" : "NONE";
      load = m + c + CAPTION_MOTION[outCaption];
      trimmed = true;
    }
  }
  if (load > 1.15) {
    if (CAMERA_MOTION[outCamera] > 0.2) {
      outCamera = "settle";
      load = m + CAMERA_MOTION.settle + CAPTION_MOTION[outCaption];
      trimmed = true;
    }
  }

  return { load: Number(load.toFixed(2)), camera: outCamera, captionMode: outCaption, trimmed };
};
