// The DirectorPlan schema: everything the editorial director decides about a
// story, as data. Remotion never improvises — it renders this.
//
// Backwards compatibility is a hard rule: every field a beat gains here is
// optional, and the renderer falls back to existing script.json behaviour when
// the plan (or a field in it) is absent. A script that predates the director
// renders exactly as it always did.
//
// Erasable-syntax-only file: no enums, no namespaces — Node's type stripping
// runs this directly (tools/direct.mjs) and Remotion bundles it.

// ---------------------------------------------------------------- script
/** The beat rows the director reads. A superset of what parse-script.mjs
 *  writes today; the new rows are the author's hand-written editorial notes
 *  and every one of them is optional. */
export type ScriptBeat = {
  n: number;
  name: string;
  start: number;
  end: number;
  vo: string;
  visual: string;
  motion?: string;
  module?: string;
  text?: string;
  shape?: string;
  source?: string;
  footage?: string;
  image_prompt?: string;
  icons?: { icon: string; label: string }[];
  data?: { label: string; value: number; raw?: string }[];
  places?: { name: string; lat?: number; lon?: number }[];
  turn?: string;
  // Hand-written editorial rows (new). The heuristic engine fills what is
  // missing; an author's note always beats a guess.
  purpose?: string;
  chapter?: string;
  sequence?: string;
  question?: string;
  reveal?: string;
  emotion?: string;
  rest?: boolean | string;
  captionMode?: string;
  revealMode?: string;
  camera?: string;
  music?: string;
  silence?: string;
  jcut?: number;
  lcut?: number;
  sfx?: string;
  callback?: string;
};

export type Script = {
  title: string;
  engine: string;
  fps: number;
  width: number;
  height: number;
  durationInSeconds: number;
  caption?: string;
  beats: ScriptBeat[];
};

// ---------------------------------------------------------------- vocab
export type NarrativePurpose =
  | "hook"
  | "orient"
  | "explain"
  | "complicate"
  | "escalate"
  | "reveal"
  | "consequence"
  | "payoff"
  | "reflect"
  | "rest";

export type VisualPurpose =
  | "EXPLAIN"
  | "PROVE"
  | "LOCATE"
  | "HUMANIZE"
  | "INTENSIFY"
  | "COMPARE"
  | "REVEAL"
  | "ORIENT"
  | "TRANSITION"
  | "EMOTIONAL_PAUSE";

export type Emotion =
  | "curiosity"
  | "comfort"
  | "surprise"
  | "tension"
  | "confusion"
  | "clarity"
  | "shock"
  | "empathy"
  | "anger"
  | "anticipation"
  | "relief"
  | "satisfaction";

export type Density = "low" | "medium" | "high";

export type AttentionStrategy =
  | "standard"
  | "progressive_reveal"
  | "delayed_reveal"
  | "rest"
  | "impact";

export type RhythmTier =
  | "MICRO_CHANGE" //  1.5–4s    : light change before attention decays
  | "VISUAL_IDEA" //  4–10s     : one idea per visual
  | "PROGRESSION" //  10–30s    : meaningful progression on one visual
  | "ATTENTION_RESET" // 30–60s : the frame re-language entirely
  | "SEQUENCE_TRANSFORM"; // 45–120s : a sequence turns

export type CaptionMode = "NONE" | "EMPHASIS" | "SUBTITLE" | "LOWER_THIRD" | "FULL";

export type RevealMode =
  | "SEQUENTIAL" // staggered children — modules do this natively
  | "PROGRESSIVE" // one element advances continuously (trace token, chart pen)
  | "MASK" // the whole stage wipes in as a block
  | "DRAW_ON" // hand-drawn marks draw across the beat
  | "FOCUS" // camera frames the subject and stays
  | "HIDDEN_THEN_REVEAL" // content held back, then lands
  | "COUNTER_REVEAL" // a number counts to its value
  | "ZOOM_REVEAL" // camera settles from a wider frame
  | "LAYERED"; // background → subject → annotation

export type CameraIntent =
  | "establish"
  | "focus"
  | "push"
  | "pull"
  | "pan"
  | "compare"
  | "reveal"
  | "settle";

export type AttentionEventType =
  | "WORD_EMPHASIS"
  | "OBJECT_ENTRY"
  | "OBJECT_EXIT"
  | "CAMERA_PUSH"
  | "CAMERA_PULL"
  | "CAMERA_SHIFT"
  | "ANNOTATION_APPEAR"
  | "ANNOTATION_DRAW"
  | "DATA_CHANGE"
  | "NUMBER_REVEAL"
  | "IMAGE_CHANGE"
  | "FOOTAGE_CHANGE"
  | "DIAGRAM_BUILD"
  | "MAP_REVEAL"
  | "PERSPECTIVE_CHANGE"
  | "AUDIO_DROP"
  | "SILENCE"
  | "MUSIC_SHIFT"
  | "SFX_ACCENT"
  | "QUESTION"
  | "REVEAL"
  | "CONTRADICTION"
  | "PAYOFF"
  | "PATTERN_INTERRUPT";

export type TransitionType =
  | "cut"
  | "page" // the existing vox page turn
  | "crossfade"
  | "hold" // the outgoing frame holds into the incoming beat
  | "chapter"; // the chapter card IS the transition

export type TransitionReason =
  | "SPATIAL_CONTINUITY"
  | "MOTION_CONTINUITY"
  | "CONCEPTUAL_CONTINUITY"
  | "SHAPE_MATCH"
  | "OBJECT_MATCH"
  | "TIME_CHANGE"
  | "LOCATION_CHANGE"
  | "CHAPTER_CHANGE"
  | "EMOTIONAL_RESET"
  | "SEQUENCE_TRANSFORM"
  | "REST";

export type SilenceKind =
  | "MUSIC_DROP"
  | "VOICE_ONLY"
  | "FULL_SILENCE"
  | "ROOM_TONE_ONLY"
  | "PRE_REVEAL_SILENCE"
  | "POST_REVEAL_SILENCE";

// ---------------------------------------------------------------- plan
export type Chapter = {
  id: string; // ch_1
  title: string;
  ordinal: number;
  startBeat: number;
  start: number;
  end: number;
  card: { text: string; subtext?: string };
};

export type Sequence = {
  id: string; // seq_01
  purpose: NarrativePurpose;
  chapterId: string;
  beatRange: [number, number];
  start: number;
  end: number;
  openQuestion?: string;
  answer?: string;
  emotion: Emotion;
  infoDensity: Density;
  attentionTarget: {
    novelty: number;
    curiosity: number;
    tension: number;
    informationDensity: number;
    emotionalIntensity: number;
  };
};

export type DirectedBeat = {
  n: number;
  name: string;
  start: number; // visual start, seconds (script timing, may be j/l adjusted)
  end: number; // visual end, seconds
  audioStart: number; // absolute start of this beat's take (j-cut shifts it earlier)
  jCut?: number; // audio leads visual by this many seconds
  lCut?: number; // audio continues past the visual by this many seconds
  narrative: {
    purpose: NarrativePurpose;
    question?: string;
    reveal?: string;
    nextQuestion?: string;
    consequence?: string;
  };
  attention: {
    strategy: AttentionStrategy;
    novelty: number;
    curiosity: number;
    tension: number;
    informationDensity: number;
    emotionalIntensity: number;
    tier: RhythmTier;
  };
  visual: {
    purpose: VisualPurpose;
    module: string;
    composition?: string;
    layers: string[];
    reveal: RevealMode;
    captionMode: CaptionMode;
    rest: boolean;
    metaphor?: string;
  };
  motion: {
    camera: { intent: CameraIntent; target?: { x: number; y: number; w: number; h: number } };
    reveal: { mode: RevealMode; holdUntil: number; triggers: RevealTrigger[] };
    transitionIn: { type: TransitionType; reason: TransitionReason; frames: number };
  };
  typography: { text: string; emphasisWords: string[] };
  audio: {
    musicLevel: number; // base bed level for this beat
    musicMood: "hold" | "swell" | "drop" | "quiet";
    sfx: { at: number; files: string[] }[];
    silence: { at: number; dur: number; kind: SilenceKind }[];
  };
  memory: {
    introduce: string[];
    reference: string[];
    stateChanges: { id: string; state: string }[];
  };
  chapterId: string;
  sequenceId: string;
};

export type RevealTrigger = {
  at: number; // seconds into the beat
  kind: "hold" | "accent" | "question" | "reveal";
  label?: string;
};

export type AttentionEvent = {
  at: number; // absolute seconds
  type: AttentionEventType;
  beat: number;
  strength: number; // 0..1
  label?: string;
};

export type AudioEvent = {
  at: number;
  kind: "music_level" | "silence_start" | "silence_end" | "sfx";
  value?: number; // music level 0..1 for music_level
  label?: string; // sfx filename, or silence kind
};

export type MemoryEvent = {
  at: number;
  kind: "introduce" | "reference" | "state_change";
  motifId: string;
  beat: number;
  state?: string;
};

export type StoryMemoryEntry = {
  id: string;
  label: string; // what the motif is, for stamps and callbacks
  introducedAt: number;
  introducedBeat: number;
  states: { state: string; at: number; beat: number }[];
  references: number;
  central: boolean; // the motif the ending should pay off
};

export type DirectorPlan = {
  version: "2.0";
  project: {
    title: string;
    durationInSeconds: number;
    format: string;
    fps: number;
    width: number;
    height: number;
    engine: string;
    mode: "SHORT" | "ESSAY";
  };
  chapters: Chapter[];
  sequences: Sequence[];
  beats: DirectedBeat[];
  storyMemory: StoryMemoryEntry[];
  attentionEvents: AttentionEvent[];
  audioEvents: AudioEvent[];
  memoryEvents: MemoryEvent[];
  transitions: {
    fromBeat: number;
    toBeat: number;
    at: number;
    type: TransitionType;
    reason: TransitionReason;
    frames: number;
  }[];
};

/** The overlay a human (or Claude) can write to steer the heuristic director.
 *  Hand-written notes win over every guess. */
export type DirectorOverlay = {
  version?: string;
  project?: { title?: string; mode?: "SHORT" | "ESSAY" };
  chapters?: { startBeat: number; title: string; subtext?: string }[];
  beats?: Record<number, Partial<ScriptBeat>>;
};

// ---------------------------------------------------------------- qc
export type QcFinding = {
  at: number; // seconds (beat start) or -1 for whole-video findings
  level: "warn" | "info" | "good";
  rule: string;
  message: string;
  beat?: number;
};

export type QcReport = {
  video: { title: string; duration: number; beats: number; mode: string };
  findings: QcFinding[];
  scores: {
    story: number;
    attention: number;
    visualVariety: number;
    continuity: number;
    audio: number;
    emotion: number;
  };
  retention: number; // 0..10 heuristic, internal only
};
