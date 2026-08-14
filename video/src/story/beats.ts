// The beat engine. Narration-word timestamps (e.g. from Whisper) become a
// BeatMap; the planner references beats by name ("beat:450") and the engine
// resolves them to scene-local frames. Timestamps may come from any source —
// Whisper, a word-level transcript, or (for the deterministic prototype) the
// planner's own fractions. This abstraction is the whole point: nothing in
// the engine depends on Whisper itself.

export type Beat = {
  name: string;
  word: string;
  // Scene-local start/end as fractions (0..1) of the scene duration.
  start: number;
  end: number;
  // How much this beat matters (0..1) — scale, emphasis, camera response.
  importance: number;
};

export type BeatMap = {
  beats: Beat[];
  totalSeconds: number;
};

// Resolve "beat:name" trigger syntax → the beat or null.
export const parseTrigger = (trigger: string | undefined): { kind: "beat"; name: string } | null => {
  if (!trigger) return null;
  const m = /^beat:(\S+)$/.exec(trigger);
  if (!m) return null;
  return { kind: "beat", name: m[1] };
};

// The beat a trigger references, or null.
export const beatOf = (map: BeatMap, trigger: string | undefined): Beat | null => {
  const t = parseTrigger(trigger);
  if (!t) return null;
  return map.beats.find((b) => b.name === t.name) ?? null;
};

// Frame at which a trigger fires. `at(p)` maps a scene fraction to a
// scene-local frame. Falls back to a default fraction when the trigger is
// absent or the beat is missing (loudly via console.warn).
export const triggerFrame = (
  map: BeatMap,
  trigger: string | undefined,
  at: (p: number) => number,
  fallback: number,
): number => {
  const beat = beatOf(map, trigger);
  if (!trigger) return at(fallback);
  if (!beat) {
    console.warn(`[story] beat "${parseTrigger(trigger)?.name}" not found in beat map`);
    return at(fallback);
  }
  return at(beat.start);
};

// Highest-importance beat at or before a scene-local frame (0 = none).
export const activeBeat = (map: BeatMap, sceneFrame: number, durationInFrames: number): Beat | null => {
  const f = sceneFrame / Math.max(1, durationInFrames);
  let best: Beat | null = null;
  for (const b of map.beats) {
    if (f >= b.start && f <= b.end + 0.02) {
      if (!best || b.importance > best.importance) best = b;
    }
  }
  return best;
};

// Build a beat map from {name, at, importance} fractions (the deterministic
// prototype's format) — the planner can later emit Whisper-style seconds.
export const fromFractions = (
  beats: Array<{ name: string; word?: string; at: number; importance?: number }>,
  totalSeconds: number,
): BeatMap => ({
  totalSeconds,
  beats: beats.map((b) => ({
    name: b.name,
    word: b.word ?? b.name,
    start: b.at,
    end: Math.min(1, b.at + 0.06),
    importance: b.importance ?? 0.5,
  })),
});