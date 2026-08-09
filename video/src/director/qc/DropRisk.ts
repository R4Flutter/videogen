// DropRisk: a predicted retention graph, before a frame is rendered.
//
// The QC scores answer "is this film good" with a number, which is the one
// question that doesn't help. An editor doesn't want a grade, they want a
// finger pointing at 4:38. This produces that: a per-second risk curve, and
// the three worst windows named and diagnosed.
//
// It is not calibrated. It cannot be — nothing has been published, so there is
// no retention CSV to fit against, and every weight below is a stated guess
// carrying its own reasoning. That is fine, because the *shape* is the useful
// part: the ranking of moments is far more robust than their absolute values,
// and the ranking is what tells you where to work. `WEIGHTS` is deliberately
// one exported object so that the day real data exists, calibration is a fit
// over eight numbers and nothing else in this file changes.
//
// Terms, and why each one is a reason a person leaves:
//
//   loopStarvation   nothing is unresolved, so there is no reason to stay
//   habituation      the film has been doing this for a while now
//   postPayoff       the release just happened; arousal is falling
//   infoVoid         no new fact for long enough to notice
//   visualStasis     the frame has stopped changing
//   audioStasis      the bed has stopped moving
//   opening          everything above, but weighted for the first 15 seconds
//   momentum         credit: a strong payoff just landed and is still buying time
import type { DirectorPlan, DirectedBeat } from "../types.ts";
import type { LoopState } from "../attention/LoopStack.ts";
import { debtScore } from "../attention/LoopStack.ts";
import { clamp, hasQuantity } from "../util.ts";

export type RiskWeights = {
  loopStarvation: number;
  habituation: number;
  postPayoff: number;
  infoVoid: number;
  visualStasis: number;
  audioStasis: number;
  opening: number;
  momentum: number;
};

/** Guessed, and labelled as guessed. The reasoning for the ordering:
 *
 *  Loop starvation is first because it is the only term that describes the
 *  viewer's *motive* rather than the film's surface — a frame can be beautiful
 *  and still have no reason to be watched. Habituation is second because it is
 *  the failure mode that grows with runtime, which is exactly where a
 *  ten-minute film dies. Post-payoff is third and is the one most editors get
 *  wrong: the eight seconds after your best moment are the most dangerous in
 *  the film, and they feel like the safest. */
export const WEIGHTS: RiskWeights = {
  loopStarvation: 0.26,
  habituation: 0.20,
  postPayoff: 0.16,
  infoVoid: 0.14,
  visualStasis: 0.12,
  audioStasis: 0.08,
  opening: 0.60, // a multiplier applied inside the first 15s, not a summand
  momentum: 0.18, // subtracted
};

export type RiskWindow = {
  from: number;
  to: number;
  peak: number;
  at: number;
  beat?: number;
  causes: string[];
};

export type RiskCurve = {
  /** One sample per second, 0..1. */
  risk: number[];
  /** Per-term contribution at each second, for diagnosis. */
  terms: Record<keyof Omit<RiskWeights, "opening" | "momentum">, number[]>;
  /** The worst contiguous windows, ranked. */
  windows: RiskWindow[];
  mean: number;
  /** Area under the curve for the first 30s — the number that matters most. */
  opening30: number;
  weights: RiskWeights;
};

/** Seconds after a strong reveal during which arousal is falling. */
const PAYOFF_HAZARD = 8;
/** Seconds without a new fact before the viewer notices the film is idling. */
const INFO_VOID_AFTER = 12;
/** Habituation half-life. A stimulus type stops being an event on roughly
 *  this timescale, which is why minute four feels like minute two. */
const TAU = 90;

const beatAt = (beats: DirectedBeat[], t: number): DirectedBeat | undefined =>
  beats.find((b) => t >= b.start && t < b.end) ?? (t >= (beats[beats.length - 1]?.end ?? 0) ? beats[beats.length - 1] : undefined);

/** Whether a beat introduces a fact a viewer could repeat afterwards.
 *
 *  `hasQuantity` rather than a digit regex: a narration script spells its
 *  numbers out for the TTS, so a digit test reports a film about money as
 *  containing no facts at all. */
const carriesFact = (b: DirectedBeat): boolean =>
  Boolean(
    b.narrative.reveal ||
      b.narrative.consequence ||
      hasQuantity(`${b.typography.text ?? ""} ${b.name}`) ||
      b.visual.module === "stat" ||
      b.visual.module === "chart" ||
      b.visual.module === "compare" ||
      b.visual.module === "timeline" ||
      b.visual.module === "funnel",
  );

export const buildRiskCurve = (plan: DirectorPlan, loops: LoopState): RiskCurve => {
  const duration = Math.max(1, Math.ceil(plan.project.durationInSeconds));
  const beats = plan.beats;

  const zero = () => new Array(duration).fill(0) as number[];
  const terms = {
    loopStarvation: zero(),
    habituation: zero(),
    postPayoff: zero(),
    infoVoid: zero(),
    visualStasis: zero(),
    audioStasis: zero(),
  };

  // --- precompute event timelines -------------------------------------
  const strongReveals = plan.attentionEvents
    .filter((e) => (e.type === "REVEAL" || e.type === "PAYOFF") && e.strength >= 0.7)
    .map((e) => e.at)
    .sort((a, b) => a - b);

  const factTimes = beats.filter(carriesFact).map((b) => b.start).sort((a, b) => a - b);

  const accents = plan.audioEvents.filter((e) => e.kind === "sfx").map((e) => e.at);
  const musicMoves: { at: number; value: number }[] = plan.audioEvents
    .filter((e) => e.kind === "music_level" && typeof e.value === "number")
    .map((e) => ({ at: e.at, value: e.value as number }));
  const silences = plan.audioEvents.filter((e) => e.kind === "silence_start").map((e) => e.at);

  // Visual change: a cut, a camera that moves, a reveal trigger, an attention
  // event with any real strength. Anything that would make an eye re-fixate.
  const visualChanges: number[] = [
    ...plan.transitions.map((t) => t.at),
    ...plan.attentionEvents.filter((e) => e.strength >= 0.4).map((e) => e.at),
    ...beats.flatMap((b) => b.motion.reveal.triggers.map((t) => b.start + t.at)),
  ].sort((a, b) => a - b);

  // Habituation: each event type carries its own decaying familiarity, so the
  // fifth NUMBER_REVEAL in two minutes is worth a fraction of the first.
  const familiarity = new Map<string, { at: number; strength: number }[]>();
  for (const e of plan.attentionEvents) {
    const list = familiarity.get(e.type) ?? [];
    list.push({ at: e.at, strength: e.strength });
    familiarity.set(e.type, list);
  }

  const lastBefore = (times: number[], t: number): number => {
    let out = -Infinity;
    for (const x of times) {
      if (x <= t) out = x;
      else break;
    }
    return out;
  };

  // --- the curve --------------------------------------------------------
  const risk = zero();
  for (let t = 0; t < duration; t++) {
    const b = beatAt(beats, t);

    // 1. loop starvation
    const open = loops.debt[t] ?? 0;
    terms.loopStarvation[t] = 1 - debtScore(open);

    // 2. habituation — the mean decayed familiarity across every event type
    //    that has fired at all. A film that keeps reaching for the same three
    //    devices scores high here even while it is technically "busy".
    let fam = 0;
    let kinds = 0;
    for (const [, list] of familiarity) {
      let acc = 0;
      for (const e of list) {
        if (e.at > t) break;
        acc += e.strength * Math.exp(-(t - e.at) / TAU);
      }
      if (acc > 0) {
        // Saturating: the first repeat costs a lot, the ninth costs little more.
        fam += 1 - Math.exp(-acc / 2.2);
        kinds += 1;
      }
    }
    terms.habituation[t] = kinds ? clamp(fam / kinds, 0, 1) : 0;

    // 3. post-payoff hazard — a triangular window after each strong reveal
    const lastReveal = lastBefore(strongReveals, t);
    const since = t - lastReveal;
    terms.postPayoff[t] =
      since >= 0 && since < PAYOFF_HAZARD ? 1 - Math.abs(since - PAYOFF_HAZARD / 2) / (PAYOFF_HAZARD / 2) : 0;

    // 4. information void
    const lastFact = lastBefore(factTimes, t);
    const dry = t - lastFact;
    terms.infoVoid[t] = Number.isFinite(dry) ? clamp((dry - INFO_VOID_AFTER) / 18, 0, 1) : 0.5;

    // 5. visual stasis. A rest beat is *supposed* to be still, so it is
    //    forgiven — but only for as long as a rest beat should last.
    const lastVisual = lastBefore(visualChanges, t);
    const stillFor = t - lastVisual;
    const resting = b?.visual.rest === true;
    const allowance = resting ? 9 : 5;
    terms.visualStasis[t] = clamp((stillFor - allowance) / 12, 0, 1);

    // 6. audio stasis — no accent, no silence window, and a bed that hasn't
    //    changed level. Three ways to be moving; failing all three is flat.
    const lastAccent = lastBefore(accents, t);
    const lastSilence = lastBefore(silences, t);
    const recentLevels = musicMoves.filter((m) => m.at <= t && m.at > t - 30).map((m) => m.value);
    const levelMoved = new Set(recentLevels.map((v) => v.toFixed(2))).size > 1;
    const audioStill = Math.min(t - lastAccent, t - lastSilence);
    terms.audioStasis[t] = levelMoved ? clamp((audioStill - 25) / 25, 0, 1) : clamp((audioStill - 12) / 20, 0, 1);

    // --- sum
    let r =
      WEIGHTS.loopStarvation * terms.loopStarvation[t] +
      WEIGHTS.habituation * terms.habituation[t] +
      WEIGHTS.postPayoff * terms.postPayoff[t] +
      WEIGHTS.infoVoid * terms.infoVoid[t] +
      WEIGHTS.visualStasis * terms.visualStasis[t] +
      WEIGHTS.audioStasis * terms.audioStasis[t];

    // 7. momentum credit — a strong payoff that just landed is still buying
    //    goodwill. This is why the hazard term is a *triangle*: the second
    //    after a reveal is safe, the sixth is not.
    if (since >= 0 && since < 3) r -= WEIGHTS.momentum * (1 - since / 3);

    // 8. the opening multiplier. The first fifteen seconds are not a normal
    //    part of the film — the viewer has not yet decided to watch it, so
    //    every weakness costs more. Decays to 1.0 by 0:20.
    if (t < 20) r *= 1 + WEIGHTS.opening * (1 - t / 20);

    risk[t] = Number(clamp(r, 0, 1).toFixed(3));
  }

  const mean = risk.reduce((a, b) => a + b, 0) / risk.length;
  const opening30 = risk.slice(0, Math.min(30, risk.length)).reduce((a, b) => a + b, 0) / Math.min(30, risk.length);

  return {
    risk,
    terms,
    windows: rankWindows(risk, terms, beats),
    mean: Number(mean.toFixed(3)),
    opening30: Number(opening30.toFixed(3)),
    weights: WEIGHTS,
  };
};

/** The label a term gets in a diagnosis line. */
const CAUSE: Record<string, string> = {
  loopStarvation: "nothing unresolved",
  habituation: "the film has been doing this a while",
  postPayoff: "post-payoff drift",
  infoVoid: "no new fact",
  visualStasis: "frame not changing",
  audioStasis: "bed not moving",
};

/** Contiguous stretches above the risk floor, ranked worst-first, each
 *  attributed to the terms that actually caused it. */
const rankWindows = (
  risk: number[],
  terms: RiskCurve["terms"],
  beats: DirectedBeat[],
): RiskWindow[] => {
  const mean = risk.reduce((a, b) => a + b, 0) / risk.length;
  // The floor is relative: a well-made film should still surface its own
  // three weakest moments, and an absolute threshold would report nothing.
  const floor = Math.max(0.22, mean * 1.25);
  const out: RiskWindow[] = [];
  let start = -1;
  for (let t = 0; t <= risk.length; t++) {
    const above = t < risk.length && risk[t] >= floor;
    if (above && start < 0) start = t;
    if (!above && start >= 0) {
      const slice = risk.slice(start, t);
      const peak = Math.max(...slice);
      const at = start + slice.indexOf(peak);
      const contrib = (Object.keys(CAUSE) as (keyof typeof terms)[])
        .map((k) => ({ k, v: (terms[k][at] ?? 0) * (WEIGHTS as Record<string, number>)[k] }))
        .sort((a, b) => b.v - a.v)
        .filter((x) => x.v > 0.02)
        .slice(0, 3)
        .map((x) => CAUSE[x.k]);
      out.push({
        from: start,
        to: t,
        peak: Number(peak.toFixed(3)),
        at,
        beat: beats.find((b) => at >= b.start && at < b.end)?.n,
        causes: contrib,
      });
      start = -1;
    }
  }
  return out.sort((a, b) => b.peak - a.peak);
};

const BLOCKS = " ▁▂▃▄▅▆▇█";

/** The curve as one line of text, at `cols` characters. Max-pooled rather
 *  than averaged: a one-second spike is exactly what you want to see, and
 *  averaging is how you lose it. */
export const sparkline = (risk: number[], cols = 60): string => {
  if (!risk.length) return "";
  const per = risk.length / cols;
  let out = "";
  for (let c = 0; c < cols; c++) {
    const from = Math.floor(c * per);
    const to = Math.max(from + 1, Math.floor((c + 1) * per));
    const peak = Math.max(...risk.slice(from, to));
    out += BLOCKS[clamp(Math.round(peak * (BLOCKS.length - 1)), 0, BLOCKS.length - 1)];
  }
  return out;
};

export const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;
