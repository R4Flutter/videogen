// VisualContinuity: the film must feel like one documentary, not a deck of
// randomly generated frames. Two jobs here — (1) fatigue detection: no module
// may run more than twice in a row or dominate the film; (2) replacement: a
// fatigued beat is re-staged with a purpose-compatible module that changes
// the visual language. It also enforces the variety rule — photo → diagram →
// document → human detail — rather than text → text → text.
import type { Script, ScriptBeat, VisualPurpose } from "../types.ts";
import { MODULE_BY_PURPOSE } from "./VisualPurpose.ts";

export const MODULES = new Set([
  "kinetic", "doodle", "icon", "chart", "compare", "stat", "footage", "callout",
  "timeline", "quote", "trace", "trust", "funnel", "map", "collage",
]);

/** Runs of the same module — the raw material fatigue detection reads.
 *
 *  Accepts either script beats (`module`) or directed beats (`visual.module`).
 *  It only claimed to accept both: a `DirectedBeat` keeps its module under
 *  `visual`, so every plan-side caller — AttentionQC included — was reading
 *  `undefined`, collapsing the whole film into one run of "" and reporting a
 *  68-beat module run on every episode. That finding was the only thing
 *  holding the attention score below 10, which is how it survived so long. */
export const moduleRuns = (beats: { n: number; module?: string; visual?: { module?: string } }[]) => {
  const runs: { module: string; beats: number[] }[] = [];
  for (const b of beats) {
    const module = b.module ?? b.visual?.module ?? "";
    const last = runs[runs.length - 1];
    if (last && last.module === module) last.beats.push(b.n);
    else runs.push({ module, beats: [b.n] });
  }
  return runs;
};

export const moduleCount = (beats: ScriptBeat[]) => {
  const counts: Record<string, number> = {};
  for (const b of beats) {
    const module = b.module ?? "";
    counts[module] = (counts[module] ?? 0) + 1;
  }
  return counts;
};

/** An alternative module with a different visual language, same purpose. */
const swapFor = (module: string, purpose: VisualPurpose, counts: Record<string, number>): string => {
  const preferred = MODULE_BY_PURPOSE[purpose] ?? [];
  // Same-family swaps keep the frame honest: a chart beat that is tired
  // becomes a stat or a compare, not a map.
  const family: Record<string, string[]> = {
    chart: ["stat", "compare", "chart"],
    compare: ["stat", "chart", "compare"],
    stat: ["compare", "chart", "stat"],
    kinetic: ["footage", "doodle", "quote", "kinetic"],
    icon: ["trace", "timeline", "icon"],
    doodle: ["footage", "callout", "doodle"],
    footage: ["doodle", "collage", "footage"],
    timeline: ["icon", "trace", "timeline"],
    quote: ["doodle", "callout", "quote"],
    funnel: ["trace", "stat", "funnel"],
    trace: ["timeline", "funnel", "trace"],
    trust: ["icon", "stat", "trust"],
    map: ["footage", "map"],
    collage: ["footage", "collage"],
    callout: ["doodle", "footage", "callout"],
  };
  const candidates = (family[module] ?? [module]).filter(
    (m) => m !== module && (preferred.length ? preferred.includes(m) || preferred.includes(module) : true),
  );
  // Pick the least-used candidate — the one that freshens the film most.
  return candidates.sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0))[0] ?? module;
};

/** The continuity pass. `purpose` per beat lets a swap keep the meaning. */
export const enforceVariety = (
  script: Script,
  purposeOf: (b: ScriptBeat) => VisualPurpose,
): { beats: ScriptBeat[]; warnings: string[] } => {
  const beats = script.beats.map((b) => ({ ...b }));
  const warnings: string[] = [];
  const counts = moduleCount(beats);

  // (1) Three in a row is a run; two in a row of the loudest modules is too.
  const LOUD = new Set(["kinetic", "collage", "stat"]);
  let runLen = 1;
  for (let i = 1; i < beats.length; i++) {
    const cur = beats[i].module ?? "";
    const prev = beats[i - 1].module ?? "";
    runLen = cur === prev ? runLen + 1 : 1;
    const shouldSwap =
      runLen >= 3 || (runLen >= 2 && LOUD.has(cur) && i > 0 && i < beats.length - 1);
    if (shouldSwap) {
      const old = cur;
      const next = swapFor(old, purposeOf(beats[i]), counts);
      if (next !== old) {
        beats[i] = { ...beats[i], module: next };
        counts[old] -= 1;
        counts[next] = (counts[next] ?? 0) + 1;
        runLen = 1;
        warnings.push(`beat ${beats[i].n}: "${old}" run broken — restaged as "${next}"`);
      }
    }
  }

  // (2) A module that owns the film is a genre problem, not a style.
  const total = Math.max(1, beats.length);
  for (const [module, n] of Object.entries(counts)) {
    if (n / total > 0.34) {
      warnings.push(`"${module}" carries ${Math.round((n / total) * 100)}% of the film`);
    }
  }

  return { beats, warnings };
};
