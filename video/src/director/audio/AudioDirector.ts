// AudioDirector: the audio plan for one beat — music mood, silence windows,
// sfx accents, and the J/L cuts. J-cut = this beat's audio starts before its
// visual (audio leads, the viewer hears the next thing before they see it);
// L-cut = this beat's audio continues after its visual hands over. The
// renderer plays takes on the *global* timeline, so L-cuts are natural; a
// J-cut just moves the take's start earlier and the renderer staggers
// captions to match.
import type { Emotion, ScriptBeat, SilenceKind } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import { musicMoodFor } from "./MusicPlanner.ts";
import { silenceFor } from "./SilencePlanner.ts";
import { sfxFor } from "./SFXPlanner.ts";
import type { AttentionEvent } from "../types.ts";

export type BeatAudio = {
  musicLevel: number;
  musicMood: "hold" | "swell" | "drop" | "quiet";
  sfx: { at: number; files: string[] }[];
  silence: { at: number; dur: number; kind: SilenceKind }[];
  jCut?: number;
  lCut?: number;
};

const LEVELS: Record<string, number> = { hold: 0.4, swell: 0.58, drop: 0.3, quiet: 0.28 };

/** J/L cuts. Author rows win; else the director earns them — audio leads into
 *  a reveal (the viewer hears the turn before they see it) and hangs after a
 *  payoff (the line lands, the picture moves on). */
export const cutsFor = (b: ScriptBeat, facts: BeatFacts): { jCut?: number; lCut?: number } => {
  if (b.jcut !== undefined && Number.isFinite(b.jcut)) return { jCut: Math.max(0.2, Math.min(2.5, b.jcut)) };
  if (b.lcut !== undefined && Number.isFinite(b.lcut)) return { lCut: Math.max(0.2, Math.min(3, b.lcut)) };
  const cuts: { jCut?: number; lCut?: number } = {};
  const dur = b.end - b.start;
  if (facts.reveal && dur >= 7) cuts.jCut = 0.45; // audio leads into the reveal
  if (facts.purpose === "payoff" || facts.purpose === "reflect") cuts.lCut = 0.6;
  return cuts;
};

export const audioFor = (
  b: ScriptBeat,
  facts: BeatFacts,
  emotion: Emotion,
  restBeat: boolean,
  events: AttentionEvent[],
): BeatAudio => {
  const mood = musicMoodFor(b, facts, emotion, restBeat);
  const silences = silenceFor(b, facts, restBeat);
  const accents = sfxFor(b, facts, events);
  return {
    musicLevel: LEVELS[mood],
    musicMood: mood,
    sfx: accents.map((a) => ({ at: a.at, files: [a.label!] })),
    silence: silences,
    ...cutsFor(b, facts),
  };
};
