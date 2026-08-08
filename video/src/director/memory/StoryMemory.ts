// StoryMemory: the registry of what the film has established. Every motif
// gets a state, and a state change is an event: the phone that showed $2 can
// later show $250, and the plan records *when* it changed so the renderer can
// annotate the return.
import type { MemoryEvent, StoryMemoryEntry } from "../types.ts";
import type { Motif } from "./MotifTracker.ts";
import { numberTokens } from "../util.ts";

export type Memory = {
  entries: StoryMemoryEntry[];
  events: MemoryEvent[];
};

/** The state of a number motif at a beat: its latest value ("$250"). */
const stateOf = (motif: Motif, beatN: number, scriptBeats: { n: number; vo: string }[]): string | undefined => {
  if (motif.kind !== "number") return undefined;
  const b = scriptBeats.find((x) => x.n === beatN);
  if (!b) return undefined;
  const toks = numberTokens(b.vo);
  const hit = toks.find((t) => t.replace(/[$%,]/g, "").includes(motif.label.replace(/[$%,]/g, "")));
  return hit;
};

export const buildMemory = (
  motifs: Motif[],
  scriptBeats: { n: number; vo: string }[],
): Memory => {
  const entries: StoryMemoryEntry[] = motifs.map((m, i) => ({
    id: m.id,
    label: m.label,
    introducedAt: 0,
    introducedBeat: m.firstBeat,
    states: [],
    references: Math.max(0, m.beats.length - 1),
    central: i === 0 || m.beats.length >= 3, // the earliest/busiest motif is the spine
  }));

  const events: MemoryEvent[] = [];
  for (const m of motifs) {
    let state: string | undefined;
    m.beats.forEach((n, i) => {
      const next = stateOf(m, n, scriptBeats);
      if (i === 0) {
        events.push({ at: 0, kind: "introduce", motifId: m.id, beat: n });
        state = next;
      } else if (next !== state) {
        state = next;
        events.push({ at: 0, kind: "state_change", motifId: m.id, beat: n, state: next });
      } else {
        events.push({ at: 0, kind: "reference", motifId: m.id, beat: n });
      }
    });
  }
  // Times are resolved by CallbackPlanner once beats have their final timing.
  return { entries, events: events.sort((a, z) => a.beat - z.beat) };
};

export const memoryOf = (memory: Memory, motifId: string) =>
  memory.entries.find((e) => e.id === motifId);
