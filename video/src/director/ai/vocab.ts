// ai/vocab.ts — the production vocabulary the editorial brain may choose from.
// Single source of truth for both the prompt and the validator: if a decision
// names something outside these lists, the validator rejects it. Never invent
// renderer features here — this file mirrors what the vox engine can actually
// stage. Erasable-syntax-only (runs under node --experimental-strip-types).

export const MODULES = [
  "kinetic", "doodle", "icon", "chart", "compare", "stat", "footage", "callout",
  "timeline", "quote", "trace", "trust", "funnel", "map", "collage",
] as const;

export const SELF_FRAMING_MODULES = ["map", "trace", "trust", "funnel", "collage"] as const;

export const CAMERA_INTENTS = [
  "establish", "focus", "push", "pull", "pan", "compare", "reveal", "settle",
] as const;

export const REVEAL_MODES = [
  "SEQUENTIAL", "PROGRESSIVE", "MASK", "DRAW_ON", "FOCUS", "HIDDEN_THEN_REVEAL",
  "COUNTER_REVEAL", "ZOOM_REVEAL", "LAYERED",
] as const;

export const CAPTION_MODES = ["NONE", "EMPHASIS", "SUBTITLE", "LOWER_THIRD", "FULL"] as const;

export const ATTENTION_STRATEGIES = [
  "standard", "progressive_reveal", "delayed_reveal", "rest", "impact",
] as const;

export const ATTENTION_EVENTS = [
  "WORD_EMPHASIS", "OBJECT_ENTRY", "OBJECT_EXIT", "CAMERA_PUSH", "CAMERA_PULL",
  "CAMERA_SHIFT", "ANNOTATION_APPEAR", "ANNOTATION_DRAW", "DATA_CHANGE",
  "NUMBER_REVEAL", "IMAGE_CHANGE", "FOOTAGE_CHANGE", "DIAGRAM_BUILD", "MAP_REVEAL",
  "PERSPECTIVE_CHANGE", "AUDIO_DROP", "SILENCE", "MUSIC_SHIFT", "SFX_ACCENT",
  "QUESTION", "REVEAL", "CONTRADICTION", "PAYOFF", "PATTERN_INTERRUPT",
] as const;

export const TRANSITION_TYPES = ["cut", "page", "crossfade", "hold", "chapter"] as const;

export const TRANSITION_REASONS = [
  "SPATIAL_CONTINUITY", "MOTION_CONTINUITY", "CONCEPTUAL_CONTINUITY", "SHAPE_MATCH",
  "OBJECT_MATCH", "TIME_CHANGE", "LOCATION_CHANGE", "CHAPTER_CHANGE",
  "EMOTIONAL_RESET", "SEQUENCE_TRANSFORM", "REST",
] as const;

export const NARRATIVE_PURPOSES = [
  "hook", "orient", "explain", "complicate", "escalate", "reveal", "consequence",
  "payoff", "reflect", "rest",
] as const;

export const CHAPTER_PURPOSES = [
  "HOOK", "ORIENTATION", "SETUP", "MECHANISM", "INVESTIGATION", "ESCALATION",
  "CONTRADICTION", "REVELATION", "CONSEQUENCE", "HUMAN_COST", "AFTERMATH",
  "PAYOFF", "REFLECTION",
] as const;

export const SEQUENCE_PURPOSES = [
  "EXPLAIN", "PROVE", "REVEAL", "COMPARE", "HUMANIZE", "ESCALATE", "ORIENT",
  "COMPLICATE", "PAYOFF", "TRANSITION", "REST",
] as const;

export const EMOTIONS = [
  "curiosity", "comfort", "surprise", "tension", "confusion", "clarity", "shock",
  "empathy", "anger", "anticipation", "relief", "satisfaction",
] as const;

/** Natural-language variants the model reaches for — clamped to EMOTIONS. */
export const EMOTION_SYNONYMS: Readonly<Record<string, (typeof EMOTIONS)[number]>> = {
  reflect: "relief",
  reflection: "clarity",
  calm: "comfort",
  peace: "relief",
  dread: "tension",
  worry: "tension",
  awe: "surprise",
  wonder: "surprise",
  excitement: "anticipation",
  hope: "anticipation",
  joy: "satisfaction",
  sadness: "empathy",
  grief: "empathy",
  disgust: "anger",
  frustration: "anger",
  intrigue: "curiosity",
  skepticism: "confusion",
  doubt: "confusion",
};

export const MUSIC_MOODS = ["hold", "swell", "drop", "quiet"] as const;

export const SILENCE_KINDS = [
  "MUSIC_DROP", "VOICE_ONLY", "FULL_SILENCE", "ROOM_TONE_ONLY",
  "PRE_REVEAL_SILENCE", "POST_REVEAL_SILENCE",
] as const;

export const SFX_FILES = [
  "boom.wav", "shimmer.wav", "whoosh-up.wav", "whoosh.wav", "pop.wav",
  "chime.wav", "chime-warm.wav", "riser.wav", "stamp.wav", "tick.wav",
] as const;

/** Nearest supported module per visual purpose — the validator's fallback
 *  when Claude names an unsupported module. Mirrors the deterministic
 *  director's own purpose→module map. */
export const MODULE_BY_PURPOSE: Record<string, readonly string[]> = {
  EXPLAIN: ["trace", "chart", "funnel", "timeline", "kinetic", "icon", "doodle"],
  PROVE: ["quote", "footage", "doodle", "callout", "stat"],
  LOCATE: ["map", "footage"],
  HUMANIZE: ["footage", "collage", "doodle"],
  INTENSIFY: ["stat", "kinetic", "funnel", "callout"],
  COMPARE: ["compare", "chart", "footage"],
  REVEAL: ["trust", "stat", "doodle", "footage", "collage"],
  ORIENT: ["map", "footage", "timeline"],
  TRANSITION: ["kinetic", "footage"],
  EMOTIONAL_PAUSE: ["footage", "collage", "quote", "kinetic"],
};

export const SELF_FRAMING_REASON =
  "map/trace/trust/funnel/collage modules frame themselves — a self-staging module does not need (and should not get) an extra camera intent beyond settle/establish.";
