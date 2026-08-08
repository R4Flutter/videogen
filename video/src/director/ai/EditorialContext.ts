// ai/EditorialContext.ts — builds the compact context handed to the editorial
// brain. Compact on purpose: the brain gets the story, the viewer state, the
// production vocabulary and the current QC verdict — never the repository.
import type { DirectorPlan, QcReport, Script } from "../types.ts";
import type { EditorialContext } from "./EditorialTypes.ts";
import {
  ATTENTION_EVENTS,
  ATTENTION_STRATEGIES,
  CAMERA_INTENTS,
  CAPTION_MODES,
  CHAPTER_PURPOSES,
  EMOTIONS,
  MODULES,
  MUSIC_MOODS,
  NARRATIVE_PURPOSES,
  REVEAL_MODES,
  SEQUENCE_PURPOSES,
  SFX_FILES,
  SILENCE_KINDS,
  TRANSITION_TYPES,
} from "./vocab.ts";

const AUTHOR_FIELDS = [
  "purpose", "chapter", "sequence", "question", "reveal", "emotion", "rest",
  "captionMode", "revealMode", "camera", "music", "silence", "jcut", "lcut",
  "sfx", "callback", "visualPurpose", "attentionStrategy",
] as const;

const truncate = (s: string, n: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
};

export const buildEditorialContext = (
  script: Script,
  plan?: DirectorPlan,
  qc?: QcReport,
): EditorialContext => {
  const beats = script.beats.map((b) => ({
    n: b.n,
    start: b.start,
    end: b.end,
    text: truncate(b.vo, 160),
    authorNotes: AUTHOR_FIELDS.filter((f) => {
      const v = b[f as keyof typeof b];
      return v !== undefined && v !== null && v !== "";
    }),
    module: b.module,
    camera: b.camera,
    emotion: b.emotion,
    purpose: b.purpose,
  }));

  const currentPlan = plan
    ? {
        chapters: plan.chapters.map((c) => ({ title: c.title, startBeat: c.startBeat, ordinal: c.ordinal })),
        sequences: plan.sequences.map((s) => ({
          id: s.id,
          purpose: s.purpose,
          beatRange: s.beatRange,
          emotion: s.emotion,
        })),
        storyMemory: plan.storyMemory.map((m) => ({
          id: m.id,
          label: m.label,
          states: m.states.map((s) => s.state),
          central: m.central,
        })),
        openQuestions: plan.beats
          .map((b) => b.narrative.question)
          .filter((q): q is string => !!q),
      }
    : undefined;

  const qcFindings = qc
    ? qc.findings
        .filter((f) => f.level === "warn")
        .map((f) => ({
          at: f.at,
          severity: f.severity ?? (f.level === "warn" ? "MED" : "LOW"),
          rule: f.rule,
          message: f.message,
          beat: f.beat,
          fix: f.fix,
        }))
    : undefined;

  return {
    project: {
      title: script.title,
      durationInSeconds: script.durationInSeconds,
      mode: script.engine,
      fps: script.fps,
      width: script.width,
      height: script.height,
    },
    beats,
    currentPlan,
    qcFindings,
    vocabulary: {
      modules: [...MODULES],
      cameras: [...CAMERA_INTENTS],
      revealModes: [...REVEAL_MODES],
      captionModes: [...CAPTION_MODES],
      attentionStrategies: [...ATTENTION_STRATEGIES],
      attentionEvents: [...ATTENTION_EVENTS],
      transitions: [...TRANSITION_TYPES],
      purposes: [...NARRATIVE_PURPOSES],
      chapterPurposes: [...CHAPTER_PURPOSES],
      sequencePurposes: [...SEQUENCE_PURPOSES],
      emotions: [...EMOTIONS],
      musicMoods: [...MUSIC_MOODS],
      silenceKinds: [...SILENCE_KINDS],
      sfx: [...SFX_FILES],
    },
  };
};
