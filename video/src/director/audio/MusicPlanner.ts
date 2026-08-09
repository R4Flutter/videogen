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

/** How long a level change takes, by the kind of change it is.
 *
 *  The old planner emitted two events per beat at the *same* value, which is a
 *  staircase: the bed teleports between four levels on beat boundaries. A bed
 *  that steps is a bed the viewer hears as an edit. Real music-to-picture has
 *  ramps, and the ramp length is itself editorial — a swell that arrives over
 *  two seconds is anticipation, the same swell over eight is dread. */
const RAMP: Record<string, number> = {
  swell: 2.4,
  drop: 0.35, // a drop is nearly a cut. Slowly getting quieter is not a drop
  quiet: 1.6,
  hold: 1.2,
};

/** Music level events for one beat: ramp *into* the level, hold it, and leave
 *  the exit to the next beat's ramp. */
export const musicEventsFor = (
  b: ScriptBeat,
  mood: "hold" | "swell" | "drop" | "quiet",
): AudioEvent[] => {
  const level = levelOf(mood);
  const ramp = Math.min(RAMP[mood] ?? 1.2, Math.max(0.2, (b.end - b.start) * 0.5));
  return [
    // The ramp *starts before the beat does*, so the level has arrived by the
    // time the beat's first word lands. A swell that begins on the reveal is a
    // swell the viewer hears after the reveal, which is the wrong order and is
    // the single most common music-to-picture mistake.
    { at: Number(Math.max(0, b.start - ramp).toFixed(2)), kind: "music_level", value: levelOf("hold") },
    { at: Number(b.start.toFixed(2)), kind: "music_level", value: level },
    { at: Number(b.end.toFixed(2)), kind: "music_level", value: level },
  ];
};

/**
 * Align a swell so it *arrives on* the moment rather than near it.
 *
 * The cue points are the reveal beats. Word timings from voice.json are not
 * available at plan time, so the beat boundary is the best cue available —
 * but the direction of the error matters: early is musical, late is a mistake.
 */
const cueAlign = (events: AudioEvent[], beats: ScriptBeat[], facts: BeatFacts[]): AudioEvent[] => {
  const cues = beats.filter((b, i) => Boolean(facts[i].reveal)).map((b) => b.start);
  return events.map((e) => {
    if (e.kind !== "music_level") return e;
    const near = cues.find((c) => Math.abs(c - e.at) < 0.8 && e.at > c);
    return near === undefined ? e : { ...e, at: Number((near - 0.05).toFixed(2)) };
  });
};

export const planMusic = (
  beats: ScriptBeat[],
  facts: BeatFacts[],
  emotions: Emotion[],
  restFlags: boolean[],
): AudioEvent[] => {
  const raw = beats.flatMap((b, i) =>
    musicEventsFor(b, musicMoodFor(b, facts[i], emotions[i], restFlags[i])),
  );
  // Dedupe consecutive identical levels: a bed that is told to stay at 0.4
  // eleven times in a row is eleven events the renderer has to interpolate
  // between, and every one of them is a chance to introduce a step.
  const sorted = cueAlign(raw, beats, facts).sort((a, z) => a.at - z.at);
  const out: AudioEvent[] = [];
  for (const e of sorted) {
    const last = out[out.length - 1];
    if (last && last.kind === "music_level" && e.kind === "music_level" && last.value === e.value) {
      // Keep the later one only if it is more than a bar away, so the bed
      // still has anchor points across a long flat passage.
      if (e.at - last.at < 6) continue;
    }
    out.push(e);
  }
  return out;
};
