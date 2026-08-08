// ai/EditorialTypes.ts — the structured decisions the editorial brain returns.
// Claude never writes JSX; it returns this JSON. The deterministic director
// converts it into the existing DirectorPlan. Erasable-syntax-only.
import type {
  AttentionStrategy,
  CameraIntent,
  CaptionMode,
  Emotion,
  NarrativePurpose,
  RevealMode,
  VisualPurpose,
} from "../types.ts";

/** What the viewer knows (and doesn't) at a point in the story. The most
 *  important thing the brain maintains: reasoning about knowledge, not just
 *  swapping visuals. */
export type ViewerState = {
  knows: string[];
  believes: string[];
  suspects: string[];
  doesNotKnow: string[];
  openQuestions: string[];
  resolvedQuestions: string[];
};

/** Macro-structure decisions: acts → chapters → sequences. */
export type MacroDecision = {
  title?: string;
  chapters: {
    startBeat: number;
    title: string;
    purpose: string; // CHAPTER_PURPOSES
    cardSubtext?: string;
  }[];
  centralMotif?: string | null; // the motif the ending should pay off
  finalPayoffNote?: string | null;
};

export type SequenceDecision = {
  name: string; // matches the beats' sequence field
  beatRange: [number, number]; // inclusive [first, last]
  purpose: string; // SEQUENCE_PURPOSES
  reason: string; // why this sequence exists — never "to keep it engaging"
  viewerState: ViewerState; // state at the END of this sequence
};

/** One beat's editorial decision. Every field optional except beatId —
 *  the deterministic director fills whatever the brain leaves empty. */
export type BeatDecision = {
  beatId: string; // "beat_12" or "12"
  purpose?: NarrativePurpose;
  sequence?: string;
  question?: string | null; // the open question this beat poses
  reveal?: string | null; // what the viewer learns here
  nextQuestion?: string | null; // where the viewer's mind goes after
  consequence?: string | null;
  emotion?: { from: Emotion; to: Emotion; intensity: number }; // 0..1
  visual?: {
    module: string; // MODULES
    purpose: VisualPurpose;
    reason: string; // what the viewer should SEE and WHY — never decoration
  };
  motion?: {
    camera?: CameraIntent;
    reveal?: RevealMode;
  };
  audio?: {
    music?: string; // MUSIC_MOODS
    silence?: string | boolean; // SILENCE_KINDS or true (auto)
    sfx?: string; // SFX_FILES (comma/plus-separated) or null
    jcut?: number; // 0..2.5 seconds
    lcut?: number; // 0..3 seconds
  };
  attention?: {
    strategy?: AttentionStrategy;
    event?: string; // ATTENTION_EVENTS — what should grab the eye
    reason?: string; // why this event here
  };
  rest?: boolean;
  callback?: string | null; // motif this beat calls back to
  captionMode?: CaptionMode;
  locked?: boolean; // pivotal beats: later revisions must not casually change
};

export type EditorialResponse = {
  macro: MacroDecision;
  sequences: SequenceDecision[];
  beats: BeatDecision[];
};

/** A targeted revision from the QC loop: only the affected beats, with the
 *  editorial reason. */
export type RevisionResponse = {
  revision: {
    reason: string;
    changes: BeatDecision[]; // only beats being changed
  };
};

export type EditorialContext = {
  project: {
    title: string;
    durationInSeconds: number;
    mode: string;
    fps: number;
    width: number;
    height: number;
  };
  beats: {
    n: number;
    start: number;
    end: number;
    text: string; // truncated narration
    authorNotes: string[]; // which editorial fields a human already wrote
    module?: string;
    camera?: string;
    emotion?: string;
    purpose?: string;
  }[];
  currentPlan?: {
    chapters: { title: string; startBeat: number; ordinal: number }[];
    sequences: { id: string; purpose: string; beatRange: [number, number]; emotion: string }[];
    storyMemory: { id: string; label: string; states: string[]; central: boolean }[];
    openQuestions: string[];
  };
  qcFindings?: {
    at: number;
    severity: string;
    rule: string;
    message: string;
    beat?: number;
    fix?: string;
  }[];
  vocabulary: {
    modules: string[];
    cameras: string[];
    revealModes: string[];
    captionModes: string[];
    attentionStrategies: string[];
    attentionEvents: string[];
    transitions: string[];
    purposes: string[];
    chapterPurposes: string[];
    sequencePurposes: string[];
    emotions: string[];
    musicMoods: string[];
    silenceKinds: string[];
    sfx: string[];
  };
};
