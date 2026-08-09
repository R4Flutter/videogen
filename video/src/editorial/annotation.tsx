// Semantic annotations. An annotation is no longer "x=720, y=380, w=240,
// h=130" — it is a description of *what* the annotation is for, with the
// renderer resolving the target's live bounds at render time.
//
// Two halves:
//
//   1. AnnotationSpec — what the director writes. A target reference
//      (id, type, or hand-placed bounds), a kind (circle, box, arrow,
//      highlight, strike, underline), a priority, and an enter/exit
//      window relative to the beat.
//
//   2. AnnotationRenderer — what reads the spec and draws the annotation.
//      The renderer asks the subject registry for the target's bounds,
//      falls back to the spec's bounds if no target is registered, and
//      draws a shape whose position is recomputed every frame so the
//      annotation follows the subject under the camera.
//
// The old `DrawIn` and `Marker` are the workhorses of the annotation
// renderer — they take the same x/y/w/h and same draw progress, so the
// spec only has to feed them the right numbers. The benefit of the new
// layer is that an annotation declared as `{ kind: "circle", target: "money" }`
// follows the money when the camera reframes the beat, which a coordinate-
// based annotation could not do.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { DrawIn, Marker, type Shape } from "../vox/elements.tsx";
import { type Bounds } from "./camera-math.ts";
import { type SubjectRegistry, type Target, type TargetRef, resolveRef } from "./target.ts";

/** The kinds of annotation a beat can ask for. The names are descriptive:
 *  `highlight` paints a marker band, `underline` draws a stroke, `circle`
 *  encloses the target, `box` frames it as a panel, `arrow` connects two
 *  targets, `strike` cancels an earlier highlight, `leader` connects a
 *  label to a target with an elbow line. */
export type AnnotationKind =
  | "circle"
  | "box"
  | "underline"
  | "strike"
  | "arrow"
  | "highlight"
  | "leader";

/** When the annotation enters and exits the frame, as a fraction of the
 *  beat. enterAt 0.2 means the annotation starts drawing at 20% of the
 *  beat; exitAt 0.95 means it holds until 95% and fades. enterUntil is
 *  when the draw completes (a circle is fully closed by 0.4 of the beat). */
export type AnnotationTiming = {
  enterAt: number;
  enterUntil: number;
  exitAt?: number;
  /** A label printed near the annotation, in the script's voice. */
  label?: string;
  /** Where to place the label, in canvas fractions. */
  labelAt?: { x: number; y: number };
};

/** A full annotation spec. Targets are resolved at render time. */
export type AnnotationSpec = {
  kind: AnnotationKind;
  /** The primary subject the annotation is drawn around. */
  target: TargetRef;
  /** A second target, for arrows and leaders. */
  targetTo?: TargetRef;
  /** Direct bounds, in canvas px. Used when no subject is registered
   *  (legacy callers, hand-measured coordinates) or as an override. */
  bounds?: Bounds;
  /** Visual emphasis. "high" draws in the accent colour at full weight;
   *  "low" draws in muted ink at half weight. The director picks the
   *  emphasis per beat, so a callout under a hero shot can be the
   *  loudest thing on the page or just a quiet circle. */
  emphasis?: "low" | "normal" | "high";
  /** Drawing colour. Defaults to the accent. */
  color?: string;
  /** Pad around the target, in px. A circle around a phone wants 24px of
   *  air; a strike through a word wants 0. */
  padding?: number;
  /** The timing window. Default: enter at 0.3, fully drawn at 0.55, hold
   *  to end. */
  timing?: AnnotationTiming;
};

/** Resolve an annotation spec to a live draw on the page. The renderer
 *  walks the registry, looks up the spec's target, asks the camera for
 *  the subject plane's current bounds, and feeds those into `DrawIn` or
 *  `Marker`. Two annotations of the same id on two consecutive beats
 *  resolve to the same subject, so an annotation that "moves" is
 *  actually a single annotation that follows the subject across beats. */
export const useAnnotation = (
  spec: AnnotationSpec,
  registry: SubjectRegistry | undefined,
  frameOverride?: number,
): { bounds: Bounds; color: string; progress: number; subject: Target | null } => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const f = frameOverride ?? frame;
  const subject = resolveRef(registry, spec.target);
  // Subject bounds, spec bounds, or a degenerate box. The spec is the
  // fallback: legacy callers still work, the resolution layer is the
  // upgrade.
  const baseBounds: Bounds = subject?.bounds ?? spec.bounds ?? {
    x: width * 0.4,
    y: width * 0.4,
    w: width * 0.2,
    h: width * 0.2,
  };
  const pad = spec.padding ?? 0;
  const bounds: Bounds = {
    x: baseBounds.x - pad,
    y: baseBounds.y - pad,
    w: baseBounds.w + pad * 2,
    h: baseBounds.h + pad * 2,
  };
  const timing = spec.timing ?? { enterAt: 0.3, enterUntil: 0.55 };
  const t = f / fps;
  // Beat-relative progress is left to the caller — annotations live inside
  // a beat and the beat owns its own progress. Here we just translate the
  // timing window to a 0..1 draw progress.
  const enter = Math.max(0, Math.min(1, (t - timing.enterAt) / Math.max(0.001, timing.enterUntil - timing.enterAt)));
  const progress = enter;
  const color =
    spec.color ??
    (spec.emphasis === "high" ? "#D9491E" : spec.emphasis === "low" ? "#8A857C" : "#1A1A1A");
  return { bounds, color, progress, subject };
};

/** The annotation draw element. A pure component that takes a resolved
 *  spec + subject registry and renders. Use this from inside any module
 *  that wants semantic annotations. */
export const Annotation: React.FC<{
  spec: AnnotationSpec;
  registry: SubjectRegistry;
}> = ({ spec, registry }) => {
  const { bounds, color, progress } = useAnnotation(spec, registry);
  // Reject empty progress so an annotation that hasn't entered yet does
  // not flash on the frame its parent registered.
  if (progress <= 0) return null;
  if (spec.kind === "highlight") {
    return <Marker x={bounds.x} y={bounds.y} w={bounds.w} h={bounds.h} progress={progress} color={color} />;
  }
  return (
    <DrawIn
      shape={spec.kind as Shape}
      x={bounds.x}
      y={bounds.y}
      w={bounds.w}
      h={bounds.h}
      seed={spec.target && typeof spec.target === "string" ? hashSeed(spec.target) : 7}
      progress={progress}
      color={color}
    />
  );
};

/** A tiny FNV-1a hash for seeding deterministic jitter. */
const hashSeed = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** A "before/after" annotation set: the things to draw on this beat,
 *  resolved into live specs by the beat's owner. Modules pass the list
 *  to <AnnotationLayer /> and the layer renders them in order. */
export const AnnotationLayer: React.FC<{
  specs: AnnotationSpec[];
  registry: SubjectRegistry;
}> = ({ specs, registry }) => (
  <>
    {specs.map((spec, i) => (
      <Annotation key={i} spec={spec} registry={registry} />
    ))}
  </>
);
