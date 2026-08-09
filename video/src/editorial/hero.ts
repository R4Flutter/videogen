// Beat importance and visual energy. The two scalars that decide what
// kind of beat this is.
//
// Importance is *within* a beat: how big a moment this is for the viewer.
// A utility beat (importance 0.2) is information delivery; the camera is
// quiet, the type is the subject, the annotation is minimal. A hero beat
// (importance 0.85..1) is a turn: the camera commits, the depth widens,
// the type recedes, the annotation takes the page.
//
// Visual energy is *across* a film: where we are in the curve. Early beats
// are calm (0..0.3): establish, orient, breathe. Middle beats (0.4..0.7):
// build, complicate, escalate. Climax beats (0.8..1.0): reveal, payoff.
// Energy feeds back into the per-beat decision through `effectiveStrength`,
// which multiplies importance and energy so a hero beat at the climax is the
// strongest frame in the film, and a hero beat in the calm opening is a
// quieter kind of hero.
//
// The model is small on purpose. One number per axis, two numbers for the
// whole beat. The director writes them; the planner derives them when the
// author did not.
import type { NarrativePurpose, RevealMode } from "../director/types.ts";

/** A beat's importance, 0..1. */
export type Importance = number;

/** A film's visual energy at a point, 0..1. */
export type VisualEnergy = number;

/** Per-purpose importance hints. The director can override any of these,
 *  but most beats get a reasonable value by mapping their purpose to one
 *  of five importance tiers. The tiers are calibrated against the beats
 *  in the existing essay: `payoff` should be a hero shot, `rest` should
 *  not. */
export const PURPOSE_IMPORTANCE: Record<NarrativePurpose, Importance> = {
  hook: 0.85,
  orient: 0.45,
  explain: 0.45,
  complicate: 0.55,
  escalate: 0.7,
  reveal: 0.9,
  consequence: 0.7,
  payoff: 1.0,
  reflect: 0.6,
  rest: 0.15,
};

/** A beat's effective strength: how hard the camera and depth should move.
 *  Combines importance (this beat's role) with the visual energy at the
 *  beat's position in the film (where we are in the curve). The product
 *  is what the rig reads. */
export const effectiveStrength = (importance: Importance, energy: VisualEnergy): number => {
  // Energy multiplies importance up to 1.2x at the climax, down to 0.6x at
  // the calm opening. Importance is the floor: a hero beat is never quiet.
  const env = 0.6 + 0.6 * energy;
  return Math.max(0, Math.min(1, importance * env));
});

/** A beat's recommended depth, weighted by importance. A hero beat widens
 *  the gap between subject and background; a utility beat keeps the page
 *  relatively flat. The planner passes a per-plane scale factor; the depth
 *  renderer applies it. */
export const importanceDepthScale = (importance: Importance): number => {
  if (importance >= 0.85) return 1.35; // hero: maximum separation
  if (importance >= 0.65) return 1.15; // important: noticeable separation
  if (importance >= 0.4) return 1.0; // ordinary: page depth
  if (importance >= 0.2) return 0.85; // utility: shallow
  return 0.7; // rest: minimal
};

/** Per-purpose reveal hints. A reveal beat earns a layered reveal; a
 *  rest beat is held. The director can override per beat. */
export const PURPOSE_REVEAL: Record<NarrativePurpose, RevealMode> = {
  hook: "ZOOM_REVEAL",
  orient: "FOCUS",
  explain: "SEQUENTIAL",
  complicate: "PROGRESSIVE",
  escalate: "PROGRESSIVE",
  reveal: "HIDDEN_THEN_REVEAL",
  consequence: "LAYERED",
  payoff: "FOCUS",
  reflect: "FOCUS",
  rest: "FOCUS",
};

/** Compute the visual energy at a beat's position in a beat list, 0..1.
 *  The curve rises slowly from a low opening, accelerates through the
 *  middle, plateaus at a high climax, and resolves at the end. The
 *  exact shape is a sigmoid with the inflection at the midpoint, but
 *  what the renderer reads is just the number. */
export const energyFor = (i: number, total: number, beats: { rest?: boolean; importance?: number }[]): VisualEnergy => {
  if (total <= 1) return 0.5;
  // Position 0..1 across the film, with a small back-off at the start so
  // the hook doesn't get a "0" energy reading.
  const t = Math.max(0, Math.min(1, i / (total - 1)));
  // Sigmoid: t^1.6 / (t^1.6 + (1-t)^1.6) — slow start, fast middle, slow end.
  const a = Math.pow(t, 1.6);
  const b = Math.pow(1 - t, 1.6);
  const sig = a / (a + b);
  // Pull down by 0.15 and lift to 0..1 so the opening is calm and the
  // closing is high without hitting the absolute extremes.
  const env = 0.15 + 0.7 * sig;
  // Rest beats pull the local energy down for one beat — a film with no
  // breath reads as a single uninterrupted scream, even when the energy
  // curve is correct.
  return beats[i]?.rest ? env * 0.55 : env;
};

/** Compute the importance for a beat when the script did not set one. The
 *  purpose is the dominant signal, but the beat's position in the curve
 *  also matters: a `complicate` beat at the climax is more important than
 *  a `complicate` beat in the opening. */
export const importanceFor = (b: {
  purpose?: NarrativePurpose;
  reveal?: string;
  question?: string;
  rest?: boolean;
  module?: string;
}, energy: VisualEnergy): Importance => {
  const base = PURPOSE_IMPORTANCE[(b.purpose as NarrativePurpose) ?? "explain"] ?? 0.45;
  // A reveal or a question in the script is worth more than its purpose
  // alone — the beat is asking the viewer to do something.
  const asked = (b.question ? 0.1 : 0) + (b.reveal ? 0.1 : 0);
  // Energy widens importance slightly — a high-energy film makes more of
  // every beat, including the utility ones.
  const env = 0.85 + 0.25 * energy;
  const v = (base + asked) * env;
  if (b.rest) return Math.min(v, 0.2);
  return Math.max(0, Math.min(1, v));
};

/** Is this beat a hero beat? Heroes earn stronger composition, deeper
 *  depth, larger type, and a heavier camera. The threshold matters: a
 *  hero on every beat is a hero on no beat. */
export const isHero = (importance: Importance): boolean => importance >= 0.8;

/** Is this beat a rest beat? Rest beats earn the quietest camera, the
 *  shallowest depth, and a captionMode of NONE. The planner already sets
 *  rest via StoryAnalyzer, but the renderer can ask. */
export const isRest = (b: { rest?: boolean | string }): boolean =>
  b.rest === true || b.rest === "true";
