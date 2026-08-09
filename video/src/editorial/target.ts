// Semantic visual subjects.
//
// A `Bounds` is a box in canvas coordinates. A `Target` is what that box is
// *of*: an "id" the rest of the engine can refer to, a "type" so the director
// knows what to do with it, an "importance" so a hero subject and a utility
// subject can sit on the same beat, and a "role" so a subject is not silently
// promoted to the subject plane just by being there.
//
// The whole editorial system reads from this layer. Camera, depth plan,
// composition, annotations and transitions all receive Targets; none of them
// hand-compute coordinates. Two beats that both have a Target with
// `{ id: "phone" }` resolve to the same subject — that is the seam that lets
// the camera move toward the story and the annotation follow the subject.
import type { Bounds } from "./camera-math.ts";

/** What a thing on the page *is*, in story terms. */
export type SubjectKind =
  | "object"   // a static thing: a phone, a document, a balance readout
  | "person"   // a face, a silhouette, a body — the camera treats it as a subject
  | "place"    // a location or a region: a country, a city, a building
  | "number"   // a value that the beat is about, the thing a stat module prints
  | "event"    // a thing that happens in time: a transaction, a call, a move
  | "diagram"  // a constructed visual: a chart, a trace, a route
  | "phrase";  // a span of text the camera frames (rare; used by callout)

/** A semantic subject. Box is the *current* bounds — what a target resolver
 *  hands back. The camera asks for it every frame; the resolver walks the
 *  scene's subject registry and returns the live one. */
export type Target = {
  id: string;
  type: SubjectKind;
  bounds: Bounds;
  /** 0..1. A hero subject (0.8..1.0) drives the camera; a utility subject
   *  (0.2..0.5) can be highlighted but does not pull the rig. */
  importance: number;
  /** A short, screen-readable label. The annotation renderer can show it
   *  when no script-supplied label exists. */
  label?: string;
  /** Optional, target-type specific. A number carries a unit; a place carries
   *  a region. The camera does not read this — the annotation does. */
  meta?: Record<string, string | number>;
};

/** A reference to a subject by id, with optional positional hints. The
 *  resolver matches `id` first; if it is missing, it falls back to the
 *  positional hint. The Director writes these into the plan; modules
 *  resolve them to live Targets at render time. */
export type TargetRef =
  | string
  | { id?: string; type?: SubjectKind; bounds?: Partial<Bounds> };

/** A scene's live subject registry. The director writes a *plan* of subjects;
 *  the module that owns the scene registers the live Targets under their
 *  ids, and the camera, depth, composition and annotation layers read them
 *  back. */
export type SubjectRegistry = Map<string, Target>;

/** Pull the subject out of a ref, falling back across id → type → bounds. */
export const resolveRef = (
  registry: SubjectRegistry | undefined,
  ref: TargetRef | null | undefined,
): Target | null => {
  if (!ref || !registry) return null;
  if (typeof ref === "string") {
    return registry.get(ref) ?? null;
  }
  if (ref.id) {
    const hit = registry.get(ref.id);
    if (hit) return hit;
  }
  if (ref.type) {
    for (const t of registry.values()) {
      if (t.type === ref.type) return t;
    }
  }
  if (ref.bounds) {
    for (const t of registry.values()) {
      if (
        t.bounds.x === ref.bounds.x &&
        t.bounds.y === ref.bounds.y &&
        t.bounds.w === ref.bounds.w &&
        t.bounds.h === ref.bounds.h
      ) {
        return t;
      }
    }
  }
  return null;
};

/** Convert a TargetRef in a plan into a Bounds in the camera's coordinate
 *  system, or null if no subject matches. The camera math is identical
 *  whether the bounds came from a resolver or from a hand-placed Box — the
 *  point of this layer is that the camera never has to care. */
export const targetBounds = (
  registry: SubjectRegistry | undefined,
  ref: TargetRef | null | undefined,
): Bounds | null => {
  const t = resolveRef(registry, ref);
  return t ? t.bounds : null;
};
