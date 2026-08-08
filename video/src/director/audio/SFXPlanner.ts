// SFXPlanner: sound effects punctuate, they don't score. Each accent is
// earned by an attention event — an object entering, a number revealing, a
// reveal landing, a payoff hitting — and mapped to the pack that exists on
// disk (tools/parse-script.mjs already names these files). No accent may be
// scheduled where the narration is carrying the moment.
import type { AttentionEvent, AudioEvent, ScriptBeat } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";

/** The sfx pack present in video/public/audio. */
export const SFX_PACK = [
  "boom.wav", "shimmer.wav", "whoosh-up.wav", "whoosh.wav", "pop.wav",
  "chime.wav", "chime-warm.wav", "riser.wav", "stamp.wav", "tick.wav",
];

/** Event type → accent. Money gets the coin-ish chime, reveals get the boom. */
const STING: [string, string[]][] = [
  ["REVEAL", ["boom.wav", "shimmer.wav"]],
  ["PAYOFF", ["boom.wav"]],
  ["CONTRADICTION", ["whoosh.wav"]],
  ["QUESTION", ["whoosh-up.wav"]],
  ["NUMBER_REVEAL", ["chime.wav"]],
  ["OBJECT_ENTRY", ["pop.wav"]],
  ["PATTERN_INTERRUPT", ["riser.wav"]],
  ["DIAGRAM_BUILD", ["tick.wav"]],
  ["SFX_ACCENT", ["stamp.wav"]],
];

export const sfxFor = (
  b: ScriptBeat,
  facts: BeatFacts,
  events: AttentionEvent[],
): AudioEvent[] => {
  const mine = events.filter((e) => e.beat === b.n);
  const out: AudioEvent[] = [];
  const seen = new Set<string>();

  for (const e of mine) {
    // Only strong events carry sound, and only where the voice isn't landing
    // the line itself.
    if (e.strength < 0.6) continue;
    const sting = STING.find(([type]) => type === e.type);
    if (!sting) continue;
    const key = `${e.type}-${Math.round(e.at * 2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // One accent per event type per beat — a beat with three NUMBER_REVEAL
    // events gets one chime, not a carousel.
    if (out.some((o) => o.label === sting[1][0])) continue;
    out.push({ at: Number(e.at.toFixed(2)), kind: "sfx", label: sting[1][0] });
  }

  // Author's `Sfx:` row adds named accents on top.
  if (b.sfx) {
    for (const part of b.sfx.split(/[+,]/)) {
      const file = part.trim().toLowerCase();
      const hit = SFX_PACK.find((f) => f.includes(file) || file.includes(f.replace(".wav", "")));
      if (hit && !out.some((o) => o.label === hit)) {
        out.push({ at: b.start, kind: "sfx", label: hit });
      }
    }
  }
  return out;
};

export const planSfx = (beats: ScriptBeat[], facts: BeatFacts[], events: AttentionEvent[]): AudioEvent[] =>
  beats.flatMap((b, i) => sfxFor(b, facts[i], events));
