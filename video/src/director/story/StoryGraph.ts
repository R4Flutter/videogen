// StoryGraph: the entities that persist across the story — numbers, places,
// people, claims. This is the raw material StoryMemory and CallbackPlanner
// work from, and the reason two beats that mention the same amount can be
// connected at all without an LLM in the loop.
import type { Script, ScriptBeat } from "../types.ts";
import { numberTokens, slug } from "../util.ts";

export type Entity = {
  id: string;
  label: string;
  kind: "number" | "place" | "phrase" | "object";
  firstBeat: number;
  lastBeat: number;
  count: number;
  values: string[];
};

/** Tokenise a beat into candidate entities. Numbers with their unit; named
 *  places; repeated capitalised phrases; on-screen text. */
const tokensOf = (b: ScriptBeat): Entity[] => {
  const out: Entity[] = [];

  for (const tok of numberTokens(b.vo)) {
    const label = tok;
    const id = `n_${slug(label)}`;
    out.push({ id, label, kind: "number", firstBeat: b.n, lastBeat: b.n, count: 1, values: [label] });
  }
  for (const p of b.places ?? []) {
    const label = p.name;
    const id = `p_${slug(label)}`;
    out.push({ id, label, kind: "place", firstBeat: b.n, lastBeat: b.n, count: 1, values: [label] });
  }
  // Repeated ALL-CAPS phrases on screen ("PAID TO WATCH VIDEOS") are motifs.
  for (const m of (b.text ?? "").matchAll(/\b([A-Z][A-Z\s&']{5,})\b/g)) {
    const label = m[1].trim();
    const id = `ph_${slug(label)}`;
    out.push({ id, label, kind: "phrase", firstBeat: b.n, lastBeat: b.n, count: 1, values: [label] });
  }
  return out;
};

/** Merge entities across beats: same id, closer together in time. */
export const buildStoryGraph = (script: Script): Entity[] => {
  const merged = new Map<string, Entity>();
  for (const b of script.beats) {
    for (const e of tokensOf(b)) {
      const hit = merged.get(e.id);
      if (!hit) {
        merged.set(e.id, e);
        continue;
      }
      hit.count += 1;
      hit.lastBeat = b.n;
      if (!hit.values.includes(e.values[0])) hit.values.push(e.values[0]);
    }
  }
  return [...merged.values()].sort((a, b) => b.count - a.count);
};

/** The motifs a long form *should* care about: things that recur. */
export const recurringEntities = (graph: Entity[], minCount = 2) =>
  graph.filter((e) => e.count >= minCount).sort((a, b) => a.firstBeat - b.firstBeat);
