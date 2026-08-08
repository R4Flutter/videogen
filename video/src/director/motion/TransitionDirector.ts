// TransitionDirector: every transition earns its reason. A cut is the default
// — it is also the best transition more often than any effect is. Motivated
// transitions exist only where the story justifies them:
//   same subject continues        → match (page turn carries the eye)
//   chapter boundary              → chapter card (the card IS the transition)
//   emotional reset / rest beat   → hold
//   time or location change       → page turn
//   loud → quiet (or reverse)     → crossfade
// Random wipes, zooms and page turns "because a beat ended" are forbidden.
import type {
  Emotion,
  ScriptBeat,
  TransitionReason,
  TransitionType,
} from "../types.ts";

const EMOTIONAL_CONTRAST = new Set<Emotion>([
  "shock", "anger", "relief", "satisfaction", "comfort",
]);

export type TransitionDecision = {
  type: TransitionType;
  reason: TransitionReason;
  frames: number;
};

const TURN_FRAMES = 9; // the existing vox page turn length
const HOLD_FRAMES = 12; // a rest beat hands over slowly

export const transitionInto = (
  b: ScriptBeat,
  prev: ScriptBeat | undefined,
  chapterBoundary: boolean,
  emotion: Emotion,
  restBeat: boolean,
  sameModule: boolean,
): TransitionDecision => {
  if (!prev) return { type: "cut", reason: "SPATIAL_CONTINUITY", frames: 0 };
  if (chapterBoundary) return { type: "chapter", reason: "CHAPTER_CHANGE", frames: TURN_FRAMES };
  if (restBeat || b.rest === true || b.rest === "true")
    return { type: "hold", reason: "REST", frames: HOLD_FRAMES };
  if (EMOTIONAL_CONTRAST.has(emotion))
    return { type: "crossfade", reason: "EMOTIONAL_RESET", frames: TURN_FRAMES };
  if (sameModule)
    return { type: "page", reason: "MOTION_CONTINUITY", frames: TURN_FRAMES };
  return { type: "cut", reason: "SPATIAL_CONTINUITY", frames: 0 };
};
