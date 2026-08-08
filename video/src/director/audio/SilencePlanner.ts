// SilencePlanner: silence is a deliberate tool, not a gap. The plan names
// where the music steps aside — before a reveal, after a payoff, across a
// rest beat — so the renderer can cut the bed (or drop it) at those moments.
// The voice is never silenced: silence windows sit where the beat isn't
// talking, or they are PRE/POST-reveal by design.
import type { AudioEvent, SilenceKind, ScriptBeat } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import { clamp } from "../util.ts";

/** The silence a beat earns. Author's `Silence:` row wins. */
export const silenceFor = (
  b: ScriptBeat,
  facts: BeatFacts,
  restBeat: boolean,
): { at: number; dur: number; kind: SilenceKind }[] => {
  const out: { at: number; dur: number; kind: SilenceKind }[] = [];
  const dur = b.end - b.start;

  if (b.silence) {
    const s = b.silence.toLowerCase();
    if (s.includes("full")) {
      out.push({ at: b.start, dur, kind: "FULL_SILENCE" });
      return out;
    }
    if (s.includes("pre")) {
      out.push({ at: b.start, dur: clamp(1.2, 0.4, dur * 0.4), kind: "PRE_REVEAL_SILENCE" });
      return out;
    }
    if (s.includes("post")) {
      out.push({ at: b.end - 1.0, dur: 1.0, kind: "POST_REVEAL_SILENCE" });
      return out;
    }
    if (s.includes("drop")) {
      out.push({ at: b.start, dur: Math.min(2.5, dur * 0.35), kind: "MUSIC_DROP" });
      return out;
    }
  }

  // A beat that carries a reveal gets the classic pre-reveal drop: the music
  // steps aside so the line lands in the open.
  if (facts.reveal && dur >= 6) {
    out.push({
      at: Number((b.start + dur * 0.6).toFixed(2)),
      dur: Math.min(1.6, dur * 0.2),
      kind: "PRE_REVEAL_SILENCE",
    });
  }
  // Payoffs land and then hang — a post-reveal hold is the audience's air.
  if ((facts.purpose === "payoff" || facts.purpose === "reflect") && dur >= 5) {
    out.push({
      at: Number((b.end - 1.2).toFixed(2)),
      dur: 1.2,
      kind: "POST_REVEAL_SILENCE",
    });
  }
  // A rest beat is VOICE_ONLY by definition.
  if (restBeat && dur >= 6) {
    out.push({ at: Number((b.start + 0.4).toFixed(2)), dur: Math.max(2, dur - 1.5), kind: "VOICE_ONLY" });
  }
  return out;
};

/** Music-level events that implement the silence windows. */
export const silenceAsLevelEvents = (
  b: ScriptBeat,
  facts: BeatFacts,
  restBeat: boolean,
): AudioEvent[] =>
  silenceFor(b, facts, restBeat).flatMap((s) => [
    { at: s.at, kind: "silence_start", label: s.kind },
    { at: Number((s.at + s.dur).toFixed(2)), kind: "silence_end", label: s.kind },
  ]);

export const planSilence = (
  beats: ScriptBeat[],
  facts: BeatFacts[],
  restFlags: boolean[],
): AudioEvent[] =>
  beats.flatMap((b, i) => silenceAsLevelEvents(b, facts[i], restFlags[i]));
