// MusicPlanner: the bed is an editorial instrument, not a constant drone.
// Its level curve carries the film: quiet under explanation, dropping out
// before reveals, swelling into payoffs and chapter cards. The renderer
// turns the plan's level events into a piecewise-linear bed(t).
import type { AudioEvent, Emotion, ScriptBeat } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";

const BASE = 0.4; // the existing vox bed level

/** The mood a beat gives the bed. Author's `Music:` row wins. */
export const musicMoodFor = (
  b: ScriptBeat,
  facts: BeatFacts,
  emotion: Emotion,
  restBeat: boolean,
): "hold" | "swell" | "drop" | "quiet" => {
  if (b.music) {
    const m = b.music.toLowerCase();
    if (m.includes("swell") || m.includes("rise")) return "swell";
    if (m.includes("drop") || m.includes("out")) return "drop";
    if (m.includes("quiet") || m.includes("low")) return "quiet";
    return "hold";
  }
  if (restBeat || facts.purpose === "rest" || facts.purpose === "reflect") return "quiet";
  if (facts.purpose === "hook" || facts.purpose === "payoff") return "swell";
  if (facts.reveal || emotion === "surprise" || emotion === "shock") return "drop";
  if (emotion === "tension" || emotion === "anticipation") return "quiet";
  return "hold";
};

const levelOf = (mood: "hold" | "swell" | "drop" | "quiet") =>
  mood === "swell" ? 0.58 : mood === "drop" ? 0.3 : mood === "quiet" ? 0.28 : BASE;

/** Music level events for one beat: an entrance, a mood level, an exit. */
export const musicEventsFor = (
  b: ScriptBeat,
  mood: "hold" | "swell" | "drop" | "quiet",
): AudioEvent[] => [
  { at: Number(b.start.toFixed(2)), kind: "music_level", value: levelOf(mood) },
  { at: Number(b.end.toFixed(2)), kind: "music_level", value: levelOf(mood) },
];

export const planMusic = (
  beats: ScriptBeat[],
  facts: BeatFacts[],
  emotions: Emotion[],
  restFlags: boolean[],
): AudioEvent[] =>
  beats.flatMap((b, i) =>
    musicEventsFor(b, musicMoodFor(b, facts[i], emotions[i], restFlags[i])),
  );
