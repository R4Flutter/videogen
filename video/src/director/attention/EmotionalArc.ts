// EmotionalArc: an arc, not an alternation.
//
// `EmotionalCurve` has the right instinct — a film that sits in one register
// for ten minutes is flat no matter how good the visuals are — and the wrong
// implementation. Its anti-flatness pass is:
//
//     if (curve[i] === curve[i-1]) curve[i] = first alternative in a fixed list
//
// which emits "clarity" almost every time, and produces A-B-A-B. That is
// variety for its own sake. Two adjacent beats that merely carry *different
// labels* are not a contrast; "clarity" next to "comfort" reads as one flat
// stretch to a viewer, because the two feel nearly identical.
//
// What matters is *distance*. Emotion is modelled here on the two dimensions
// the affect literature keeps returning to — valence (unpleasant→pleasant) and
// arousal (calm→activated) — so the engine can ask how far apart two beats
// actually feel, and an act can be given a target region to move through
// rather than a label to wear.
//
// The shape a documentary essay wants:
//
//   cold open   high arousal, ambiguous valence     "something is wrong here"
//   orient      arousal drops, valence rises        "here is the ordinary world"
//   explain     low arousal, mildly positive        "here is how it works"
//   complicate  arousal climbs, valence falls       "but"
//   escalate    high arousal, low valence           "and it gets worse"
//   reveal      arousal peaks                        the turn
//   consequence arousal high, valence lowest         the cost
//   payoff      arousal falls, valence rises         understanding
//   reflect     low arousal, positive valence        "now you know"
import type { Emotion, Script, ScriptBeat } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import { clamp, progress } from "../util.ts";

export type VA = { valence: number; arousal: number };

/** Valence −1..1, arousal 0..1. These are ordinal, not measured: what they
 *  encode is which registers feel far apart, and that ordering is what every
 *  consumer of this module actually uses. */
export const VALENCE_AROUSAL: Record<Emotion, VA> = {
  comfort: { valence: 0.6, arousal: 0.15 },
  clarity: { valence: 0.45, arousal: 0.3 },
  satisfaction: { valence: 0.8, arousal: 0.35 },
  relief: { valence: 0.7, arousal: 0.25 },
  curiosity: { valence: 0.2, arousal: 0.5 },
  anticipation: { valence: -0.05, arousal: 0.7 },
  surprise: { valence: 0.0, arousal: 0.85 },
  confusion: { valence: -0.3, arousal: 0.45 },
  empathy: { valence: -0.35, arousal: 0.4 },
  tension: { valence: -0.5, arousal: 0.75 },
  anger: { valence: -0.75, arousal: 0.85 },
  shock: { valence: -0.6, arousal: 1.0 },
};

const EMOTIONS = Object.keys(VALENCE_AROUSAL) as Emotion[];

/** How far apart two registers feel, 0..1. Arousal is weighted slightly
 *  higher than valence because a change in activation is what a viewer
 *  notices; a change in pleasantness at the same activation is a nuance. */
export const arcDistance = (a: Emotion, b: Emotion): number => {
  const x = VALENCE_AROUSAL[a];
  const y = VALENCE_AROUSAL[b];
  if (!x || !y) return 0;
  const dv = (x.valence - y.valence) / 2; // normalise −1..1 → −0.5..0.5
  const da = x.arousal - y.arousal;
  return Number(clamp(Math.sqrt(dv * dv * 0.8 + da * da * 1.2) / 1.35, 0, 1).toFixed(3));
};

/** The nearest named register to a point in VA space. */
export const nearest = (target: VA, exclude: Emotion[] = []): Emotion => {
  let best: Emotion = "curiosity";
  let bestD = Infinity;
  for (const e of EMOTIONS) {
    if (exclude.includes(e)) continue;
    const v = VALENCE_AROUSAL[e];
    const d = ((v.valence - target.valence) / 2) ** 2 + (v.arousal - target.arousal) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
};

/** The arc a documentary essay should trace, as VA waypoints over runtime.
 *  Interpolated, so a film of any length gets the same *shape*. */
const WAYPOINTS: [number, VA][] = [
  [0.0, { valence: -0.1, arousal: 0.8 }], // cold open: something is wrong
  [0.08, { valence: 0.35, arousal: 0.3 }], // orient: the ordinary world
  [0.25, { valence: 0.3, arousal: 0.4 }], // explain: how it works
  [0.45, { valence: -0.2, arousal: 0.6 }], // complicate: but
  [0.62, { valence: -0.5, arousal: 0.8 }], // escalate: worse
  [0.75, { valence: -0.4, arousal: 0.95 }], // the turn
  [0.85, { valence: -0.6, arousal: 0.8 }], // the cost
  [0.94, { valence: 0.4, arousal: 0.45 }], // payoff: understanding
  [1.0, { valence: 0.7, arousal: 0.25 }], // reflect: now you know
];

export const arcTargetAt = (p: number): VA => {
  const t = clamp(p, 0, 1);
  for (let i = 1; i < WAYPOINTS.length; i++) {
    const [p0, v0] = WAYPOINTS[i - 1];
    const [p1, v1] = WAYPOINTS[i];
    if (t <= p1) {
      const k = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
      return {
        valence: v0.valence + (v1.valence - v0.valence) * k,
        arousal: v0.arousal + (v1.arousal - v0.arousal) * k,
      };
    }
  }
  return WAYPOINTS[WAYPOINTS.length - 1][1];
};

const EMOTION_WORDS: [RegExp, Emotion][] = [
  [/\b(shock|horror|terrified|brutal|violent|murder)\b/i, "shock"],
  [/\b(angry|anger|outrage|furious|stole|scammed)\b/i, "anger"],
  [/\b(fear|afraid|scared|threaten|danger|pressure|trapped)\b/i, "tension"],
  [/\b(sad|sorrow|grief|loss|family|victim|suffered|struggled)\b/i, "empathy"],
  [/\b(relief|safe|rescued|saved|free)\b/i, "relief"],
  [/\b(surprise|unexpected|strange|odd|weird)\b/i, "surprise"],
  [/\b(confus|unclear|mystery|unknown|no one knows)\b/i, "confusion"],
  [/\b(clear|simple|obvious|actually is|the truth|understood)\b/i, "clarity"],
  [/\b(anticipat|wait|coming|next|about to)\b/i, "anticipation"],
  [/\b(satisfied|satisfaction|justice|payoff|lesson|learned)\b/i, "satisfaction"],
  [/\b(comfort|calm|peaceful|quiet|home)\b/i, "comfort"],
];

const hinted = (b: ScriptBeat): Emotion | undefined =>
  EMOTION_WORDS.find(([re]) => re.test(`${b.vo} ${b.visual} ${b.text ?? ""}`))?.[1];

const pinned = (b: ScriptBeat): Emotion | undefined => {
  if (!b.emotion) return undefined;
  return EMOTION_WORDS.find(([re]) => re.test(b.emotion as string))?.[1];
};

/** Purposes that own their register regardless of where they sit on the arc.
 *  A reveal is a reveal at 20% or 80% of runtime. */
const PURPOSE_EMOTION: Partial<Record<string, Emotion>> = {
  hook: "curiosity",
  reveal: "surprise",
  escalate: "tension",
  consequence: "empathy",
  payoff: "satisfaction",
  reflect: "satisfaction",
  rest: "comfort",
};

/** The minimum distance a *deliberate* contrast must cover. Below this the
 *  two beats read as one stretch, whatever they are labelled. */
export const MIN_CONTRAST = 0.22;

/** How many beats may share a register before it reads as a plateau. Runs are
 *  correct — an act *should* sit somewhere — but four identical beats in a row
 *  is where the viewer stops feeling the film move. */
const MAX_RUN = 3;

/**
 * The arc.
 *
 * Three passes, in order:
 *   1. every beat gets the register its author, language, purpose or position
 *      on the arc gives it — in that priority;
 *   2. plateaus longer than MAX_RUN are broken, but only by moving *along the
 *      arc* (toward the next waypoint), never by picking an arbitrary
 *      alternative — so the break still feels like the film progressing;
 *   3. beats flanking a reveal are pushed apart to at least MIN_CONTRAST, so
 *      the turn actually lands against something.
 */
export const buildEmotionalArc = (script: Script, facts: BeatFacts[]): Emotion[] => {
  const beats = script.beats;
  const arc: Emotion[] = beats.map((b, i) => {
    const p = pinned(b);
    if (p) return p;
    const h = hinted(b);
    if (h) return h;
    const byPurpose = PURPOSE_EMOTION[facts[i].purpose];
    if (byPurpose) return byPurpose;
    return nearest(arcTargetAt(progress(b, beats)));
  });

  // --- pass 2: break plateaus by moving along the arc
  let run = 1;
  for (let i = 1; i < arc.length; i++) {
    if (arc[i] === arc[i - 1]) run += 1;
    else {
      run = 1;
      continue;
    }
    if (run <= MAX_RUN) continue;
    if (beats[i].emotion || pinned(beats[i])) continue; // the author is directing
    // Look ahead on the arc and take the nearest register that isn't this one.
    const ahead = arcTargetAt(clamp(progress(beats[i], beats) + 0.06, 0, 1));
    const alt = nearest(ahead, [arc[i]]);
    if (arcDistance(alt, arc[i]) >= MIN_CONTRAST * 0.6) {
      arc[i] = alt;
      run = 1;
    }
  }

  // --- pass 3: give every reveal something to land against
  for (let i = 1; i < arc.length; i++) {
    const isTurn = facts[i].reveal || facts[i].purpose === "reveal";
    if (!isTurn) continue;
    if (arcDistance(arc[i - 1], arc[i]) >= MIN_CONTRAST) continue;
    if (beats[i - 1].emotion) continue;
    // Lower the *approach*, not the turn: a reveal is loud because what came
    // before it was quiet. Raising the reveal instead would just make the
    // whole passage loud, which is the mistake this module exists to prevent.
    const calmer = nearest(
      { valence: VALENCE_AROUSAL[arc[i]].valence * 0.4, arousal: Math.max(0.15, VALENCE_AROUSAL[arc[i]].arousal - 0.45) },
      [arc[i]],
    );
    if (arcDistance(calmer, arc[i]) >= MIN_CONTRAST) arc[i - 1] = calmer;
  }

  return arc;
};

/** Diagnosis: where the film sits still for too long, in VA terms rather than
 *  by label. Feeds the QC report. */
export const flatStretches = (arc: Emotion[], beats: ScriptBeat[], minSeconds = 45) => {
  const out: { from: number; to: number; emotion: Emotion; seconds: number }[] = [];
  let start = 0;
  for (let i = 1; i <= arc.length; i++) {
    const same = i < arc.length && arcDistance(arc[i], arc[start]) < 0.12;
    if (!same) {
      const seconds = (beats[i - 1]?.end ?? 0) - (beats[start]?.start ?? 0);
      if (seconds >= minSeconds && i - start >= 3) {
        out.push({ from: beats[start].n, to: beats[i - 1].n, emotion: arc[start], seconds: Number(seconds.toFixed(1)) });
      }
      start = i;
    }
  }
  return out;
};
