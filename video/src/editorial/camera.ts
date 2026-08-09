// The semantic camera director. A module says what it wants to look at and
// why; the director turns that into framing. No module hand-computes a
// translate, because a translate computed by hand is a magic number that
// breaks the day the layout changes.
//
// Deterministic and frame-based like every primitive in this repo: the same
// intent on the same beat renders the same move every time.
//
// The 2.5D part lives in two halves that have to agree. `CameraRig` applies the
// beat's framing to the whole stage *and publishes it*; anything inside asks
// `useDepth(d)` for its own share of that same move. The camera is the motion,
// depth is the rate at which each plane obeys it. Two layers at different
// depths under one push separate; two layers wobbling on their own sines under
// a shared scale do not, which is what this used to do.
//
// The unified plan layer: `CameraRig` and `useSemanticCamera` now accept a
// `CameraPlan` (intent, target, strength, importance, depth, seed). The plan
// is data, the rig is the only thing that turns it into a transform, and the
// map/trace/trust/funnel/collage modules that used to bypass the rig now
// participate in it. The two halves (intent + target → state, plan → rig)
// are the same call: a module hands a plan, the rig composes the framing.
// Backwards compatible: any existing caller that passes a CameraIntent
// continues to work — the rig reads the missing fields from defaults.
import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  cameraState,
  depthTransform,
  handheld,
  IDENTITY,
  type Bounds,
  type CameraIntent,
  type CameraState,
} from "./camera-math.ts";
import {
  type CameraPlan,
  type ResolvedCamera,
  mergePlan,
  motionPhase,
} from "./camera-plan.ts";
import {
  DEFAULT_DEPTH,
  type DepthPlan,
  type DepthRole,
  planeDepth,
  resolveDepth,
} from "./depth.ts";
import { targetBounds, type SubjectRegistry } from "./target.ts";
import { importanceDepthScale, type Importance } from "./hero.ts";

export type { Bounds, CameraIntent, CameraState };
export type { CameraPlan, ResolvedCamera };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The house easing curve, same as every module uses. */
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

/** The default strength when the plan doesn't set one. */
const DEFAULT_STRENGTH = 0.65;

/** Identity when nothing above provides a camera — a module rendered outside a
 *  rig then degrades to its own drift, exactly as it behaved before. */
export const CameraContext = React.createContext<CameraState>(IDENTITY);

/** A parallel context for the *plan* the rig is running, so children can
 *  read the resolved bounds, the importance, the depth plan, the seed and
 *  the motion phase without having to recompute them. */
export const CameraPlanContext = React.createContext<ResolvedCamera>({
  plan: {
    intent: "settle",
    bounds: undefined,
    strength: 0,
    importance: 0.5,
    seed: 0,
    depth: DEFAULT_DEPTH,
    target: undefined,
  },
  state: IDENTITY,
  phase: "rest",
  progress: 0,
});

/** The framing the enclosing rig is applying this frame. */
export const useCameraState = () => React.useContext(CameraContext);

/** The full resolved camera — state, plan and motion phase. Use this from
 *  inside a rig to read what the rig is doing this frame. */
export const useCamera = (): ResolvedCamera => React.useContext(CameraPlanContext);

/** A subject registry, parallel to the camera context. Modules register the
 *  subjects they own into the registry through `useSubjectRegistry`; the
 *  rig provides the registry to the camera plan so target lookups resolve. */
export const SubjectRegistryContext = React.createContext<SubjectRegistry>(new Map());

/** Read the live subject registry from the enclosing rig. Modules register
 *  their subjects on mount and unregister on unmount; the rig hands this
 *  context to its children so depth, camera, and annotation can resolve
 *  the same subject. */
export const useSubjectRegistry = (): SubjectRegistry => React.useContext(SubjectRegistryContext);

/** Register a subject in the live registry for the duration of this component's
 *  life. Returns the registry so the caller can remove a registration on
 *  unmount. A subject whose bounds change every frame should call
 *  `setSubject` with the new bounds on every render; a subject with static
 *  bounds can register once. */
export const useRegisterSubject = (
  id: string,
  type: import("./target.ts").SubjectKind,
  bounds: Bounds,
  importance: number,
  label?: string,
) => {
  const reg = useSubjectRegistry();
  React.useEffect(() => {
    reg.set(id, { id, type, bounds, importance, label });
    return () => {
      reg.delete(id);
    };
    // `bounds` is deliberately not a dep: a moving subject gets a fresh
    // object every render, which would churn delete/set every frame. Movers
    // push new boxes through `setSubjectBounds` instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reg, id, type, importance, label]);
  return reg;
};

/** Update a subject's live bounds. Call this every frame the subject moves
 *  so the camera, depth and annotation can read the up-to-date box. */
export const setSubjectBounds = (reg: SubjectRegistry, id: string, bounds: Bounds) => {
  const cur = reg.get(id);
  if (cur) reg.set(id, { ...cur, bounds });
};

/** Resolve a CameraPlan to a target Bounds. Tries the target ref first,
 *  then the plan's hand-placed bounds, then a degenerate box. */
const resolveTargetBounds = (
  plan: CameraPlan,
  registry: SubjectRegistry | undefined,
  width: number,
  height: number,
): Bounds | null => {
  if (plan.bounds) return plan.bounds;
  if (registry) {
    const b = targetBounds(registry, plan.target);
    if (b) return b;
  }
  // Default target for a focus without a subject: the middle of the page.
  return { x: width * 0.1, y: height * 0.3, w: width * 0.8, h: height * 0.4 };
};

/** Compute the camera state for a plan at eased progress p. Combines the
 *  intent-driven state from `cameraState` with the strength-weighted handheld
 *  and the importance-weighted anchor reach. */
const cameraStateForPlan = (
  plan: CameraPlan,
  p: number,
  frame: number,
  width: number,
  height: number,
  bounds: Bounds | null,
): CameraState => {
  const intent = plan.intent ?? "settle";
  const base = cameraState(intent, p, width, height, bounds, plan.seed ?? 0);
  // Strength scales the handheld. A rest beat (strength ~0) gets a near-silent
  // rig; a hero beat (strength ~1) gets the full operator.
  const strength = plan.strength ?? DEFAULT_STRENGTH;
  const rig = handheld(frame, plan.seed ?? 0, width, height);
  const k = clamp(strength, 0, 1);
  return {
    ...base,
    tx: base.tx + rig.x * k,
    ty: base.ty + rig.y * k,
    rotate: base.rotate + rig.rotate * k,
  };
};

/**
 * Camera transform for one beat. The original signature still works — pass an
 * intent and a Bounds the old way. The new signature accepts a CameraPlan,
 * which is what the director and the self-framing modules use.
 */
export const useSemanticCamera = (
  planOrIntent: CameraPlan | CameraIntent,
  dur: number,
  target?: Bounds | null,
  seed = 0,
): {
  transform: string;
  transformOrigin: string;
  progress: number;
  state: CameraState;
  plan: CameraPlan;
  phase: import("./camera-plan.ts").MotionPhase;
} => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const progress = clamp(
    interpolate(frame, [0, Math.max(1, dur)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    0,
    1,
  );
  // Normalise: intent-string callers become a plan. The two signatures
  // produce the same `useSemanticCamera` result for the same input.
  const plan: CameraPlan =
    typeof planOrIntent === "string"
      ? { intent: planOrIntent, bounds: target ?? undefined, seed }
      : planOrIntent;
  const p = SOFT(progress);
  const bounds = resolveTargetBounds(plan, undefined, width, height);
  const state = cameraStateForPlan(plan, p, frame, width, height, bounds);
  const strength = plan.strength ?? DEFAULT_STRENGTH;
  const phase = motionPhase(p, strength);

  return {
    transform: `translate(${state.tx}px, ${state.ty}px) rotate(${state.rotate}deg) scale(${state.scale})`,
    transformOrigin: `${state.ox}% ${state.oy}%`,
    progress: p,
    state,
    plan,
    phase,
  };
};

/**
 * A layer's extra transform for sitting `depth` planes forward of the page.
 * 1 is the page (nothing extra), 2 responds twice as hard as the page does.
 *
 * The origin comes back with it and has to be used: the rig scales about the
 * beat's anchor, so a child scaling about its own centre pulls towards a
 * different point and the planes shear apart instead of separating in depth.
 *
 * The function takes an optional depth plan; if one is provided, importance
 * scales the depth response so a hero beat widens the gap between subject
 * and background. Without a plan, the response is the original 1:1 mapping.
 */
export const useDepth = (
  depth: number,
  importance?: number,
): { transform: string; transformOrigin: string; anchor: { x: number; y: number } } => {
  const cam = useCameraState();
  const { width, height } = useVideoConfig();
  // Importance scales the depth the response reaches. A hero beat with
  // importance 0.9 widens the gap by ~1.35x; a rest beat narrows it to
  // ~0.7x. The depth response itself is unchanged — what changes is the
  // depth the caller asks for.
  const scale = importance ? importanceDepthScale(importance) : 1;
  // Distance from the subject plane: 0 = subject, 1 = full page-depth away.
  const distance = Math.abs(depth - 1) * scale;
  const effective = depth < 1 ? 1 - distance : 1 + distance;
  const t = depthTransform(cam, effective);
  return {
    transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
    // Correct for a full-canvas layer. A layer that is a sub-box of the canvas
    // has to convert: `anchor` is the same point in canvas pixels, so such a
    // layer sets `${anchor.x - left}px ${anchor.y - top}px` instead.
    transformOrigin: `${cam.ox}% ${cam.oy}%`,
    anchor: { x: (width * cam.ox) / 100, y: (height * cam.oy) / 100 },
  };
};

/** A layer's transform for sitting at a named depth role. Reads the depth
 *  plan from the enclosing rig, so the plan is shared between camera, depth
 *  and composition without each one having to pass it. */
export const usePlaneDepth = (
  role: DepthRole,
  importance?: number,
): { transform: string; transformOrigin: string; anchor: { x: number; y: number } } => {
  const plan = useCamera().plan.depth;
  const depth = planeDepth(plan, role);
  return useDepth(depth, importance);
};

/** Build the resolved camera that the rig publishes to its children. */
const buildResolved = (
  plan: CameraPlan,
  p: number,
  frame: number,
  width: number,
  height: number,
  bounds: Bounds | null,
): ResolvedCamera => {
  const state = cameraStateForPlan(plan, p, frame, width, height, bounds);
  const strength = plan.strength ?? DEFAULT_STRENGTH;
  const phase = motionPhase(p, strength);
  return {
    plan: {
      intent: plan.intent ?? "settle",
      bounds: bounds ?? undefined,
      strength,
      importance: plan.importance ?? 0.5,
      seed: plan.seed ?? 0,
      depth: resolveDepth(plan.depth),
      target: plan.target,
    },
    state,
    phase,
    progress: p,
  };
};

/**
 * The camera for one beat: applies the framing to everything inside it and
 * publishes it so those children can take their own share of it.
 *
 * It has to *wrap* the stage. A transform on an empty sibling moves nothing,
 * which is how 68 beats once rendered as 68 static cards.
 *
 * The rig accepts either a CameraPlan (the new path) or the old
 * `{ intent, target, seed, dur }` shape. The new path is what every module
 * in the renderer uses; the old shape is kept for backwards compatibility
 * with any caller that has not been migrated.
 */
export const CameraRig: React.FC<{
  intent?: CameraIntent;
  dur: number;
  target?: Bounds | null;
  seed?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
  /** A unified CameraPlan. If given, overrides intent/target/seed. */
  plan?: CameraPlan;
  /** Optional subject registry to publish to children. Modules register
   *  their subjects on mount and the rig hands the registry to its
   *  children so depth, camera and annotation can resolve the same
   *  subject. */
  registry?: SubjectRegistry;
  /** Optional depth plan override, merged on top of the per-module default. */
  depth?: DepthPlan;
  /** Beat importance 0..1. */
  importance?: Importance;
}> = ({ intent, dur, target, seed = 0, style, children, plan: planProp, registry, depth, importance }) => {
  const { width, height } = useVideoConfig();
  // Build a plan from the legacy props if a plan wasn't given. The two
  // signatures produce the same rig.
  const plan: CameraPlan = planProp ?? { intent, bounds: target ?? undefined, seed, depth, importance };
  const merged: CameraPlan = mergePlan(
    { intent: intent ?? plan.intent, bounds: target ?? plan.bounds, seed, depth, importance },
    planProp,
  );
  const frame = useCurrentFrame();
  const progress = clamp(
    interpolate(frame, [0, Math.max(1, dur)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    0,
    1,
  );
  const p = SOFT(progress);
  const inherited = useSubjectRegistry();
  const reg = registry ?? inherited;
  const bounds = resolveTargetBounds(merged, reg, width, height);
  const { transform, transformOrigin, state } = useSemanticCamera(merged, dur, bounds, merged.seed ?? 0);
  const resolved = buildResolved(merged, p, frame, width, height, bounds);
  return React.createElement(
    SubjectRegistryContext.Provider,
    { value: reg },
    React.createElement(
      CameraContext.Provider,
      { value: state },
      React.createElement(
        CameraPlanContext.Provider,
        { value: resolved },
        React.createElement(
          "div",
          {
            style: {
              position: "absolute",
              inset: 0,
              transform,
              transformOrigin,
              willChange: "transform",
              ...style,
            },
          },
          children,
        ),
      ),
    ),
  );
};
