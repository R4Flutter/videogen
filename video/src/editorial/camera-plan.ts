// The unified CameraPlan. One shape every module reads, including the ones
// the old architecture excluded (map, trace, trust, funnel, collage). The plan
// is data, not behaviour: the rig is the only thing that turns a plan into a
// transform, and the rig is the only thing that knows about Remotion.
//
// A beat's director output is a CameraPlan. A beat's module can *extend* the
// plan — a map beat picks a target by computing the subject's centroid, a
// callout beat picks a target by reading the labelled element's bounds — and
// the rig merges the module's plan with the director's. The two plans are
// the same type, so the merge is just a field-wise override.
//
// The point of the new layer is that the rig and the depth renderer and the
// annotation renderer all read from the same plan. They used to each take
// their own arguments, and the map module ran its own camera because none of
// those arguments could say "the subject is the country in the centre of
// frame, not the page". The plan carries that fact in one place.
import type { Bounds, CameraIntent, CameraState } from "./camera-math.ts";
import type { DepthPlan } from "./depth.ts";
import type { TargetRef } from "./target.ts";

/** The camera's full intent for one beat. Every field is optional — a module
 *  inherits what it does not set. This is what makes one CameraPlan
 *  composable: the director's plan for the beat is the base, and a module
 *  writes an extended plan on top. */
export type CameraPlan = {
  /** The semantic intent. If absent, the rig falls back to "settle". */
  intent?: CameraIntent;
  /** A semantic subject the camera should look at. Resolved through the
   *  scene's subject registry to a Bounds before it reaches the camera
   *  math. Falls back to `target` for the old "I know the box" callers. */
  target?: TargetRef;
  /** A direct box in canvas coordinates. Modules that have a hand-measured
   *  bounds (a chart's longest bar, a stat's measured string) still get to
   *  pass it; the rig prefers this over resolving a target. */
  bounds?: Bounds;
  /** How hard the camera moves, 0..1. 0 = the camera is silent; 1 = the
   *  strongest push the rig can produce. Hero beats lift this; rest beats
   *  zero it. */
  strength?: number;
  /** Per-plane depth overrides for this beat. */
  depth?: DepthPlan;
  /** How important this beat is, 0..1. Hero beats sit at 0.8..1.0; ordinary
   *  utility beats at 0.2..0.5; rest beats at 0..0.2. Importance widens the
   *  rig's anchor reach and the depth plan's separation. */
  importance?: number;
  /** A seed for the operator's wander. Two neighbouring beats with the same
   *  seed and the same intent are framed identically, which is the failure
   *  the old "seed = beat.n" produced in run-on monologues. */
  seed?: number;
};

/** Merge a module's plan on top of the director's. A module plan never
 *  has to repeat a field the director already set; it only writes what it
 *  knows and what the director could not have. */
export const mergePlan = (base: CameraPlan, override: CameraPlan | undefined): CameraPlan => {
  if (!override) return base;
  return {
    intent: override.intent ?? base.intent,
    target: override.target ?? base.target,
    bounds: override.bounds ?? base.bounds,
    strength: override.strength ?? base.strength,
    depth: base.depth || override.depth
      ? { ...(base.depth ?? {}), ...(override.depth ?? {}) }
      : undefined,
    importance: override.importance ?? base.importance,
    seed: override.seed ?? base.seed,
  };
};

/** A motion lifecycle the camera runs through during a beat. Replaces the
 *  old "handheld is a per-frame sine" with a deliberate arc: rest at the
 *  opening, accelerate, peak, decelerate, settle. The rig keys every move
 *  to a fraction of the beat's eased progress, not to the current frame, so
 *  the same plan renders the same way at 24, 30, or 60 fps. */
export type MotionPhase = "rest" | "move" | "accelerate" | "peak" | "decelerate" | "settle";

/** Where in the lifecycle `t` (0..1) lands, given the camera's strength.
 *  A still beat (strength 0) is always in `rest`. A loud beat gets a full
 *  arc; a quiet beat skips straight to `settle` and holds there. */
export const motionPhase = (t: number, strength: number): MotionPhase => {
  if (strength <= 0.05) return "rest";
  if (t < 0.05) return "rest";
  if (t < 0.25) return "move";
  if (t < 0.4) return "accelerate";
  if (t < 0.6) return "peak";
  if (t < 0.8) return "decelerate";
  return "settle";
};

/** The combined CameraPlan + applied CameraState. The rig hands this to its
 *  children so depth, annotations and compositions can read the same rig
 *  the camera is running. The fields on this type are the ones every
 *  consumer in the engine should use. */
export type ResolvedCamera = {
  plan: Required<Omit<CameraPlan, "target" | "depth" | "bounds">> & {
    target?: TargetRef;
    /** Absent when the rig could not resolve a box — a module rendered
     *  outside a rig, or a plan with no target and no hand-placed bounds. */
    bounds?: Bounds;
    depth: ReturnType<typeof import("./depth.ts").resolveDepth>;
  };
  state: CameraState;
  phase: MotionPhase;
  /** Eased 0..1 progress through the beat. */
  progress: number;
};
