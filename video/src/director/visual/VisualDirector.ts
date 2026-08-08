// VisualDirector: chooses the visual for each beat — module, purpose, reveal
// mode, caption mode — and stages the beat for the renderer. The author's
// script rows win; the heuristics fill the rest. Module selection is semantic:
// the beat's *claim* picks the module, not a keyword ("money" → compare when
// the claim is a disparity, not stat whenever money is spoken).
import type { CaptionMode, RevealMode, Script, ScriptBeat, VisualPurpose } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import { visualPurposeFor } from "./VisualPurpose.ts";
import { metaphorFor } from "./MetaphorPlanner.ts";
import { enforceVariety, MODULES } from "./VisualContinuity.ts";

export type VisualDecision = {
  purpose: VisualPurpose;
  module: string;
  composition?: string;
  layers: string[];
  reveal: RevealMode;
  captionMode: CaptionMode;
  rest: boolean;
  metaphor?: string;
};

/** The reveal mode a module is built to do. */
export const NATIVE_REVEAL: Record<string, RevealMode> = {
  kinetic: "MASK", // words fill the frame as spoken
  doodle: "DRAW_ON", // the mark draws mid-beat
  icon: "SEQUENTIAL", // cards wipe in one at a time
  chart: "PROGRESSIVE", // the pen rides the line
  compare: "SEQUENTIAL", // bars race, the gap boxes
  stat: "COUNTER_REVEAL", // the number counts up
  footage: "HIDDEN_THEN_REVEAL", // clip breathes in under the headline
  callout: "DRAW_ON", // ring, then leader line
  timeline: "PROGRESSIVE", // markers land along the axis
  quote: "FOCUS", // the clipping lands and holds
  trace: "PROGRESSIVE", // the token travels the line
  trust: "SEQUENTIAL", // signals check in, then flip
  funnel: "PROGRESSIVE", // bars narrow in order
  map: "LAYERED", // region inks, pins drop
  collage: "SEQUENTIAL", // clippings land one at a time
};

/** The caption policy per module, from the design brief: never show the full
 *  narration over a frame that already says it. */
export const CAPTION_BY_MODULE: Record<string, CaptionMode> = {
  kinetic: "NONE", // the words ARE the frame
  stat: "EMPHASIS",
  chart: "EMPHASIS",
  compare: "EMPHASIS",
  doodle: "SUBTITLE", // archival behind: the card keeps it legible
  footage: "SUBTITLE",
  callout: "SUBTITLE",
  icon: "FULL",
  timeline: "FULL",
  quote: "EMPHASIS",
  trace: "FULL",
  trust: "FULL",
  funnel: "FULL",
  map: "FULL",
  collage: "FULL",
};

const REST_WORDS = /\b(rest|breathe|quiet|hold|silence|pause)\b/i;

export const visualFor = (
  b: ScriptBeat,
  facts: BeatFacts,
): VisualDecision => {
  const purpose = visualPurposeFor(b);
  const rest = b.rest === true || b.rest === "true" || REST_WORDS.test(`${b.name} ${b.visual}`);

  // Author's module row wins outright — the parser already wrote it.
  let module = b.module && MODULES.has(b.module) ? b.module : "";
  if (!module) {
    module = purpose === "LOCATE" && b.places?.length ? "map" : "kinetic";
  }

  // Abstract beats earn a metaphor when they have no concrete staging.
  let metaphor: string | undefined;
  if (!b.footage && !b.text && (facts.purpose === "explain" || facts.purpose === "escalate")) {
    metaphor = metaphorFor(b)?.id;
  }

  const reveal = (b.revealMode?.toUpperCase() as RevealMode) || NATIVE_REVEAL[module] || "SEQUENTIAL";
  const captionMode =
    (b.captionMode?.toUpperCase() as CaptionMode) || (rest ? "NONE" : CAPTION_BY_MODULE[module] ?? "FULL");

  return {
    purpose,
    module,
    composition: b.visual.length > 80 ? b.visual.slice(0, 120) : undefined,
    layers: module === "map" ? ["base", "subject", "annotation"] : [],
    reveal,
    captionMode,
    rest,
    metaphor,
  };
};

/** The whole film, with variety enforced and every beat staged. */
export const directVisuals = (
  script: Script,
  facts: BeatFacts[],
): { decisions: VisualDecision[]; warnings: string[] } => {
  const base = script.beats.map((b, i) => visualFor(b, facts[i]));
  const staged = script.beats.map((b, i) => ({ ...b, module: base[i].module }));
  const { beats, warnings } = enforceVariety({ ...script, beats: staged }, (b) => {
    const i = script.beats.findIndex((x) => x.n === b.n);
    return base[i]?.purpose ?? "EXPLAIN";
  });
  const decisions = beats.map((b) => {
    const i = script.beats.findIndex((x) => x.n === b.n);
    return { ...base[i], module: b.module ?? base[i].module };
  });
  return { decisions, warnings };
};
