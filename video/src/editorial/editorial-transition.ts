// Editorial transitions. A higher-level concept than the vox Turn/page model.
//
// A Turn is a *page* transition: outgoing page leaves, incoming page enters,
// the two are stacked and offset. It is the right model for cut-between-cards
// and it is what every Vox beat used to use. It is the *wrong* model for
// editorial transitions, which is most of them.
//
// An EditorialTransition is a continuous event that spans the boundary
// between two beats. The outgoing beat and the incoming beat share the
// same camera, the same subject, the same motion. The page model fails
// at this because a page that exits at 100% of the outgoing beat starts
// at 0% of the incoming beat, with the two stacked on top of each other
// for the overlap — the eye sees one beat clearing and the next arriving,
// which is exactly the "two cameras on one frame" defect the brief calls
// out. The editorial model runs the two beats as one shot: the camera does
// not stop, the subject does not move between two positions, the type on
// the outgoing page dissolves and the type on the incoming page arrives
// in the same place.
//
// The transition types here are the editorial vocabulary a director can
// name. They are derived from the existing Turn kinds so a beat whose
// author wrote nothing still gets a reasonable transition, but they are
// their own type so the planner can pick one based on the story and the
// director can override per beat.
import type { TransitionType, TransitionReason } from "../director/types.ts";
import type { TurnKind } from "../vox/transitions.tsx";

/** The editorial transition vocabulary. */
export type EditorialTransitionKind =
  | "CONTINUOUS_PUSH"   // camera pushes through boundary; same target either side
  | "CAMERA_MATCH"      // outgoing ends where incoming begins; cut with the cut invisible
  | "OBJECT_REVEAL"     // incoming subject is what the camera is already looking at
  | "WHIP_PAN"          // fast lateral move to a new subject (photographs, maps)
  | "CROP_INTO_NEXT"    // outgoing frame crops tighter and tighter; incoming is what fills the crop
  | "DEPTH_PASS"        // camera moves through foreground plane to a new subject behind
  | "MORPH_BY_POSITION" // same place on page; the subject changes, the position does not
  | "VISUAL_HANDOFF"    // one subject leaves the frame as another enters
  | "CUT"               // a real cut: page transition, the two beats share no event
  | "TURN";             // the legacy page turn; chosen only when nothing else fits

export type EditorialTransition = {
  kind: EditorialTransitionKind;
  /** A short reason the planner chose this. Stored on the plan for QC. */
  reason: TransitionReason;
  /** Frames the transition takes, 0..18. Most are 0 (a cut) or 9 (a turn). */
  frames: number;
  /** The shared subject across the boundary, if any. */
  sharedSubject?: string;
};

/** Pick an editorial transition for a boundary. The director's script can
 *  name one with `**Transition:** CONTINUOUS_PUSH`; otherwise the planner
 *  infers it from the two beats. */
export const editorialTransitionFor = (
  prev: { module?: string; purpose?: string; importance?: number } | undefined,
  next: { module?: string; purpose?: string; importance?: number } | undefined,
  sharedSubject: string | undefined,
  emotionContinuity: boolean,
): EditorialTransition => {
  if (!prev || !next) {
    return { kind: "TURN", reason: "SPATIAL_CONTINUITY", frames: 9 };
  }
  // Same subject, same beat family → one continuous event. The classic
  // CONTINUOUS_PUSH: scene A pushes into a phone, scene B is what the
  // push landed on.
  if (sharedSubject && prev.module !== next.module) {
    if (next.importance && next.importance > 0.7) {
      return { kind: "OBJECT_REVEAL", reason: "OBJECT_MATCH", frames: 6, sharedSubject };
    }
    return { kind: "CONTINUOUS_PUSH", reason: "MOTION_CONTINUITY", frames: 6, sharedSubject };
  }
  // Same module, same purpose → the camera continues, the page changes.
  if (prev.module === next.module) {
    return { kind: "CAMERA_MATCH", reason: "SPATIAL_CONTINUITY", frames: 0 };
  }
  // Photograph → photograph, or map → map → a whip is the right transition.
  if (
    (prev.module === "footage" || prev.module === "doodle") &&
    (next.module === "footage" || next.module === "doodle")
  ) {
    return { kind: "WHIP_PAN", reason: "MOTION_CONTINUITY", frames: 6 };
  }
  // Diagram → another diagram of the same kind → the camera hands off.
  if (
    (prev.module === "trace" || prev.module === "funnel" || prev.module === "trust") &&
    (next.module === "trace" || next.module === "funnel" || next.module === "trust")
  ) {
    return { kind: "VISUAL_HANDOFF", reason: "MOTION_CONTINUITY", frames: 6 };
  }
  // Emotional continuity: a quiet beat follows a loud one (or reverse) →
  // a soft crossfade, the page model would feel like a jolt.
  if (emotionContinuity) {
    return { kind: "MORPH_BY_POSITION", reason: "EMOTIONAL_RESET", frames: 9 };
  }
  // Default: page turn, the legacy default, the model's only legacy turn.
  return { kind: "TURN", reason: "SPATIAL_CONTINUITY", frames: 9 };
};

/** Map an editorial transition to a TurnKind, so the legacy Turn component
 *  can still render it. Editorial kinds that share no event with the legacy
 *  model are rendered as "lift" (the most neutral Turn). */
export const editorialToTurn = (k: EditorialTransitionKind): TurnKind => {
  switch (k) {
    case "CONTINUOUS_PUSH":
    case "CAMERA_MATCH":
    case "OBJECT_REVEAL":
      return "lift";
    case "WHIP_PAN":
      return "whip";
    case "CROP_INTO_NEXT":
    case "DEPTH_PASS":
      return "push";
    case "MORPH_BY_POSITION":
    case "VISUAL_HANDOFF":
      return "screen";
    case "CUT":
      return "lift";
    case "TURN":
    default:
      return "lift";
  }
};

/** Map an editorial transition to the legacy TransitionType the plan
 *  publishes. The two are equivalent for the renderer's sake, but the
 *  editorial kind carries the shared-subject metadata the new layer reads. */
export const editorialToLegacyType = (k: EditorialTransitionKind): TransitionType => {
  switch (k) {
    case "CUT":
      return "cut";
    case "TURN":
    case "CONTINUOUS_PUSH":
    case "CAMERA_MATCH":
    case "OBJECT_REVEAL":
    case "WHIP_PAN":
    case "CROP_INTO_NEXT":
    case "DEPTH_PASS":
    case "MORPH_BY_POSITION":
    case "VISUAL_HANDOFF":
    default:
      return "page";
  }
};
