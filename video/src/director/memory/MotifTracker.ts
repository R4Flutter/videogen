// MotifTracker: the recurring elements a long form leans on — the phone, the
// balance, the amount. A motif is a thing the viewer has seen before, so when
// it appears again the film can *reference* it instead of re-explaining it.
// Works off the story graph: numbers and places and phrases that recur across
// beats, plus the author's `Callback:` rows.
import type { Script } from "../types.ts";
import { buildStoryGraph, recurringEntities, type Entity } from "../story/StoryGraph.ts";
import { slug } from "../util.ts";

export type Motif = {
  id: string;
  label: string;
  kind: Entity["kind"];
  beats: number[]; // beat numbers it appears on
  firstBeat: number;
  lastBeat: number;
};

export const trackMotifs = (script: Script, max = 6): Motif[] => {
  const graph = buildStoryGraph(script);
  const recurring = recurringEntities(graph, 2);

  // Author callbacks pull their token in even if it only appears twice or
  // less — an author naming a callback is a fact, not a suggestion.
  const named = script.beats
    .map((b) => (b.callback ? { label: b.callback, n: b.n } : null))
    .filter((x): x is { label: string; n: number } => Boolean(x));
  const byId = new Map(recurring.map((e) => [e.id, e]));
  for (const n of named) {
    const e = graph.find((x) => x.label.toLowerCase() === n.label.toLowerCase() || x.id === slug(n.label));
    if (e && !byId.has(e.id)) byId.set(e.id, e);
  }

  const motifs = [...byId.values()].map((e) => ({
    id: e.id,
    label: e.label,
    kind: e.kind,
    beats: script.beats.filter((b) => {
      const text = `${b.vo} ${b.places?.map((p) => p.name).join(" ") ?? ""} ${b.text ?? ""}`;
      return (
        text.toLowerCase().includes(e.label.toLowerCase()) ||
        (b.callback ?? "").toLowerCase() === e.label.toLowerCase()
      );
    }).map((b) => b.n),
    firstBeat: e.firstBeat,
    lastBeat: e.lastBeat,
  }));

  return motifs.sort((a, b) => a.firstBeat - b.firstBeat).slice(0, max);
};
