// CallbackPlanner: the ending must feel like a payoff, not a sign-off. The
// central motif — the earliest, busiest thing the film established — returns
// in the final beats, and every motif that reappears mid-film gets its moment
// annotated so the renderer can stamp the return ("— the phone returns —").
import type { MemoryEvent, ScriptBeat, StoryMemoryEntry } from "../types.ts";
import type { Memory } from "./StoryMemory.ts";

export type CallbackPlan = {
  events: MemoryEvent[]; // absolute-timed memory events
  central: StoryMemoryEntry | null;
};

export const planCallbacks = (
  memory: Memory,
  beats: ScriptBeat[],
): CallbackPlan => {
  const central = [...memory.entries].sort(
    (a, b) => b.references - a.references || a.introducedBeat - b.introducedBeat,
  )[0] ?? null;

  const atOf = (n: number) => beats.find((b) => b.n === n)?.start ?? 0;
  // The final beat where a motif appeared — the payoff moment for the loop.
  const lastBeatOf = (id: string) =>
    Math.max(0, ...memory.events.filter((e) => e.motifId === id).map((e) => e.beat));

  const events: MemoryEvent[] = memory.events.map((e) => ({
    ...e,
    at: atOf(e.beat),
    // The final reference of the central motif is the payoff — name it.
    kind:
      central && e.motifId === central.id && e.beat === lastBeatOf(central.id)
        ? "reference"
        : e.kind,
  }));

  // The ending references the central motif even when the script didn't name
  // it again: the payoff should close the loop the hook opened. Only when the
  // film is long enough that a callback is earned.
  if (
    central &&
    beats.length >= 8 &&
    !events.some((e) => e.motifId === central.id && e.kind === "reference" && e.beat >= beats[Math.floor(beats.length * 0.7)].n)
  ) {
    const last = beats[beats.length - 1];
    events.push({ at: last.start, kind: "reference", motifId: central.id, beat: last.n });
  }

  return { events: events.sort((a, z) => a.at - z.at), central };
};
