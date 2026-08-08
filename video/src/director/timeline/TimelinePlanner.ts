// TimelinePlanner: the deterministic assembly. Every layer above has decided
// what should happen and why; this pass turns those decisions into the
// DirectorPlan's final data — beats with absolute audio/visual timing,
// attention events, audio events, memory events, transitions — in one place,
// in one order, so the output is reproducible byte for byte.
import type {
  AttentionEvent,
  AudioEvent,
  Chapter,
  DirectorPlan,
  DirectedBeat,
  MemoryEvent,
  Script,
  Sequence,
} from "../types.ts";
import type { BeatFacts } from "./story/StoryAnalyzer.ts";
import type { RhythmDecision } from "./attention/RhythmEngine.ts";
import type { AttentionProfile } from "./attention/AttentionDirector.ts";
import type { VisualDecision } from "./visual/VisualDirector.ts";
import type { RevealDecision } from "./motion/RevealPlanner.ts";
import type { TransitionDecision } from "./motion/TransitionDirector.ts";
import type { BeatAudio } from "./audio/AudioDirector.ts";
import type { Memory } from "./memory/StoryMemory.ts";
import type { CallbackPlan } from "./memory/CallbackPlanner.ts";
import type { CameraIntent } from "./types.ts";

export type TimelineInputs = {
  script: Script;
  facts: BeatFacts[];
  emotions: string[];
  rhythms: RhythmDecision[];
  profiles: AttentionProfile[];
  visuals: VisualDecision[];
  cameras: CameraIntent[];
  reveals: RevealDecision[];
  transitions: TransitionDecision[];
  audios: BeatAudio[];
  memory: Memory;
  callbacks: CallbackPlan;
  attentionEvents: AttentionEvent[];
  audioEvents: AudioEvent[];
  chapters: Chapter[];
  sequences: Sequence[];
  mode: "SHORT" | "ESSAY";
};

export const assembleTimeline = (i: TimelineInputs): DirectorPlan => {
  const { script, mode } = i;
  const beats = script.beats;

  const memoryBeats: Record<number, { introduce: string[]; reference: string[]; stateChanges: { id: string; state: string }[] }> = {};
  for (const e of i.callbacks.events) {
    memoryBeats[e.beat] ??= { introduce: [], reference: [], stateChanges: [] };
    if (e.kind === "introduce") memoryBeats[e.beat].introduce.push(e.motifId);
    else if (e.kind === "state_change") memoryBeats[e.beat].stateChanges.push({ id: e.motifId, state: e.state ?? "" });
    else memoryBeats[e.beat].reference.push(e.motifId);
  }

  const directed: DirectedBeat[] = beats.map((b, idx) => {
    const audio = i.audios[idx];
    const jCut = audio.jCut ?? 0;
    const start = b.start;
    // J-cut: the take begins before the visual. It must not collide with the
    // previous beat's take — cap at 1.2s and clamp to after the previous
    // beat's start.
    const prev = beats[idx - 1];
    const maxLead = prev ? Math.max(0, b.start - prev.start - 0.6) : 0;
    const effectiveJ = Math.min(jCut, maxLead);
    const audioStart = Number((start - effectiveJ).toFixed(2));

    const seq = i.sequences.find((s) => idx >= s.beatRange[0] && idx <= s.beatRange[1]);
    const chapter = i.chapters.find((c) => b.start >= c.start && b.start < c.end);

    return {
      n: b.n,
      name: b.name,
      start,
      end: b.end,
      audioStart,
      jCut: effectiveJ > 0 ? Number(effectiveJ.toFixed(2)) : undefined,
      lCut: audio.lCut,
      narrative: {
        purpose: i.facts[idx].purpose,
        question: i.facts[idx].question,
        reveal: i.facts[idx].reveal,
        nextQuestion: i.facts[idx].nextQuestion,
        consequence: i.facts[idx].consequence,
      },
      attention: {
        strategy: i.profiles[idx].strategy,
        novelty: i.profiles[idx].novelty,
        curiosity: i.profiles[idx].curiosity,
        tension: i.profiles[idx].tension,
        informationDensity: i.profiles[idx].informationDensity,
        emotionalIntensity: i.profiles[idx].emotionalIntensity,
        tier: i.rhythms[idx].tier,
      },
      visual: {
        purpose: i.visuals[idx].purpose,
        module: i.visuals[idx].module,
        composition: i.visuals[idx].composition,
        layers: i.visuals[idx].layers,
        reveal: i.visuals[idx].reveal,
        captionMode: i.visuals[idx].captionMode,
        rest: i.visuals[idx].rest,
        metaphor: i.visuals[idx].metaphor,
      },
      motion: {
        camera: { intent: i.cameras[idx] },
        reveal: { mode: i.reveals[idx].mode, holdUntil: i.reveals[idx].holdUntil, triggers: i.reveals[idx].triggers },
        transitionIn: i.transitions[idx],
      },
      typography: {
        text: b.text ?? "",
        emphasisWords: (i.profiles[idx].curiosity >= 0.75 ? (b.text ? [b.text.split(" ").slice(0, 3).join(" ")] : []) : []),
      },
      audio: {
        musicLevel: audio.musicLevel,
        musicMood: audio.musicMood,
        sfx: audio.sfx,
        silence: audio.silence,
      },
      memory: memoryBeats[b.n] ?? { introduce: [], reference: [], stateChanges: [] },
      chapterId: chapter?.id ?? "ch_1",
      sequenceId: seq?.id ?? "seq_01",
    };
  });

  // Memory events get absolute times from the beat map; the story memory
  // entries carry final reference counts.
  const storyMemory = i.memory.entries.map((e) => ({
    ...e,
    introducedAt: Number((beats.find((b) => b.n === e.introducedBeat)?.start ?? 0).toFixed(2)),
    references: i.callbacks.events.filter((ev) => ev.motifId === e.id && ev.kind === "reference").length,
  }));

  return {
    version: "2.0",
    project: {
      title: script.title,
      durationInSeconds: script.durationInSeconds,
      format: `${script.width}:${script.height}`,
      fps: script.fps,
      width: script.width,
      height: script.height,
      engine: script.engine,
      mode,
    },
    chapters: i.chapters,
    sequences: i.sequences,
    beats: directed,
    storyMemory,
    attentionEvents: i.attentionEvents,
    audioEvents: i.audioEvents,
    memoryEvents: i.callbacks.events,
    transitions: i.transitions
      .filter((t, idx) => idx > 0)
      .map((t, idx) => ({
        fromBeat: beats[idx].n,
        toBeat: beats[idx + 1].n,
        at: beats[idx].end,
        type: t.type,
        reason: t.reason,
        frames: t.frames,
      })),
  };
};
