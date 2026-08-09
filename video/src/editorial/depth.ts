// The scene-depth model. Every complex scene defines its own depth plan
// — a map of plane name to depth value — and the depth renderer scales
// each plane by its share of the camera move.
//
// The old system had one number per layer ("depth=0.6"), hand-tuned per
// module, and parallax was a free-running sine on top. The new model makes
// the depth a *plan* the director can read and write, in the same shape as
// a composition plan, and the depth response is derived from the camera
// move rather than running alongside it. That is the difference between
// "three layers wobbling" and "three planes obeying one dolly".
import { MAX_PUSH, type CameraState } from "./camera-math.ts";

/** The five depth roles a scene can name. Background, midground, subject and
 *  foreground are the physical planes; annotation is a near-camera overlay
 *  that travels with the rig rather than with the world. */
export type DepthRole = "background" | "midground" | "subject" | "foreground" | "annotation";

/** A scene's depth plan. Each value is the *distance from the lens*, with
 *  1.0 being the subject plane (the type, the thing the beat is about).
 *  Below 1 is behind, above 1 is in front. The depth renderer clamps to
 *  a sensible range and saturates the response to MAX_PUSH so a focus
 *  camera never blows a background past the canvas edge.
 *
 *  Defaults are the "Vox page" depth: a paper background at 0.25, a mid
 *  element at 0.6, the type at 1.0, no foreground, and the annotation
 *  plane at 1.15. A new module that wants a different stack only has to
 *  override what differs from this — depth plans merge on top of defaults. */
export type DepthPlan = {
  background?: number;
  midground?: number;
  subject?: number;
  foreground?: number;
  annotation?: number;
};

export const DEFAULT_DEPTH: Required<DepthPlan> = {
  background: 0.25,
  midground: 0.6,
  subject: 1.0,
  foreground: 1,
  annotation: 1.15,
};

/** Merge a partial depth plan on top of the defaults. A plan that names only
 *  `foreground` keeps the rest of the stack where it was. */
export const resolveDepth = (plan: DepthPlan | undefined): Required<DepthPlan> => ({
  ...DEFAULT_DEPTH,
  ...(plan ?? {}),
});

/** A layer's transform relative to the base camera its parent applied, for
 *  a plane at the given depth. Same arithmetic as the old `depthTransform`
 *  in camera-math.ts, lifted out so a layer can be at any depth the plan
 *  names, not just the few the old code enumerated. */
export const depthFor = (cam: CameraState, depth: number) => {
  const k = Math.min(1, MAX_PUSH / Math.max(cam.scale - 1, 1e-9));
  const d = (depth - 1) * k;
  // Standing overscan: the reciprocal of how much the layer falls away under
  // the strongest expected push, so a background layer sits exactly at 1.0
  // when the push is at its peak. Past that point the depth response is
  // damped by the same `k` that the base scale uses.
  const overscan = depth >= 1 ? 1 : 1 / (1 - MAX_PUSH * (1 - depth));
  return {
    scale: (1 + (cam.scale - 1) * d) * overscan,
    x: cam.tx * d,
    y: cam.ty * d,
  };
};

/** A named plane's depth, looked up on a resolved depth plan. */
export const planeDepth = (plan: Required<DepthPlan>, role: DepthRole): number =>
  plan[role];

/**
 * Pick a depth plan for a beat. The director can name one explicitly via the
 * script (`**Depth:** { "foreground": 1.3 }`); the planner then merges on top
 * of the per-module default. The defaults are small and meaningful: a stat
 * beat has no foreground because nothing should sit in front of the number,
 * a callout beat lifts the annotation plane because the ring should travel
 * with the rig, and a hero beat widens the gap between subject and background
 * because that gap is what depth looks like.
 */
export const DEPTH_DEFAULTS: Record<string, DepthPlan> = {
  kinetic: {},
  stat: { foreground: 1 },
  chart: {},
  compare: {},
  timeline: {},
  icon: { foreground: 1 },
  quote: { foreground: 1.18 },
  doodle: { background: 0.4, midground: 0.7 },
  footage: { background: 0.45, midground: 0.75 },
  callout: { annotation: 1.25, foreground: 1.1 },
  trace: { background: 0.35, midground: 0.65, foreground: 1.2 },
  trust: { background: 0.3, midground: 0.6 },
  funnel: { background: 0.3, midground: 0.6 },
  map: { background: 0.4, midground: 0.7, foreground: 1.1 },
  collage: { background: 0.4, midground: 0.7, foreground: 1.2 },
};

/** Resolve the depth plan for a beat: defaults first, then any director
 *  override, with the standard page depth filling anything that was not named.
 *  The result is always a fully-populated plan. */
export const depthPlanFor = (
  module: string,
  override: DepthPlan | undefined,
): Required<DepthPlan> =>
  resolveDepth({ ...(DEPTH_DEFAULTS[module] ?? {}), ...(override ?? {}) });
