// Optional sound-design layer.
//
// Scenes register named cues at absolute frame numbers. Nothing is played
// yet — `getAudioCues()` returns a deterministic, sorted list that a future
// soundtrack pass (Remotion <Audio> sequences, or an external mix) can
// consume. Keeps the visual build free of any audio dependency.

export const CUE = {
  whoosh: "whoosh",
  impact: "impact",
  click: "click",
  tick: "tick",
  chart: "chart",
  // Named cue keys, not animations — the rule above miscounts "transition".
  // eslint-disable-next-line @remotion/non-pure-animation
  transition: "transition",
  money: "money",
} as const;

export type AudioCueName = keyof typeof CUE;

export type AudioCue = { frame: number; cue: AudioCueName };

type Stored = { frame: number; cue: AudioCueName; key: string };

const registry = new Map<string, Stored>();

export const cueAt = (key: string, cue: AudioCueName, absoluteFrame: number): void => {
  const id = `${key}:${absoluteFrame}:${cue}`;
  if (!registry.has(id)) {
    registry.set(id, { frame: absoluteFrame, cue, key });
  }
};

export const getAudioCues = (): AudioCue[] =>
  [...registry.values()].sort((a, b) => a.frame - b.frame);

// Call once per build (e.g. in the composition) to keep the list stable
// across studio hot-reloads.
export const resetAudioCues = (): void => {
  registry.clear();
};