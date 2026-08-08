// MetaphorPlanner: when the story is abstract — trust, power, deception,
// pressure — a literal screenshot doesn't exist and a generic clip is
// decoration. The planner maps abstract beats onto editorial metaphors from
// the Vox vocabulary. Metaphors stay editorially honest: they are only chosen
// for genuinely abstract beats, and the plan records *which* metaphor was
// chosen so the renderer (and QC) can see it.
import type { ScriptBeat } from "../types.ts";

export type Metaphor = {
  id: string;
  label: string; // what appears on screen
  module: string; // the vox module that stages it
  data?: { label: string; value: number; raw?: string }[];
};

const METAPHORS: [RegExp, Metaphor][] = [
  [
    /\b(deception|lie|deceive|mislead|disguise)\b/i,
    { id: "clean-surface", label: "A CLEAN SURFACE", module: "trust" },
  ],
  [
    /\b(trust|believed|faith|confided)\b/i,
    { id: "constructed-trust", label: "TRUST, BUILT ON PURPOSE", module: "trust" },
  ],
  [
    /\b(growth|expand|scale|spread|explode)\b/i,
    { id: "expanding-structure", label: "EXPANSION", module: "funnel" },
  ],
  [
    /\b(pressure|squeeze|compress|close in)\b/i,
    { id: "compression", label: "PRESSURE", module: "funnel" },
  ],
  [
    /\b(connection|network|linked|web|system)\b/i,
    { id: "interconnected-nodes", label: "THE SYSTEM", module: "trace" },
  ],
  [
    /\b(isolation|alone|cut off|no one)\b/i,
    { id: "alone-object", label: "ALONE", module: "stat" },
  ],
  [
    /\b(volume|mass|flood|wave|thousands?|millions?)\b/i,
    { id: "volume-as-geometry", label: "THE VOLUME", module: "funnel" },
  ],
];

/** Is this beat abstract enough to warrant a metaphor at all? */
export const isAbstract = (b: ScriptBeat): boolean => {
  const text = `${b.vo} ${b.visual}`;
  // Concrete beats name things that can be photographed or diagrammed.
  return METAPHORS.some(([re]) => re.test(text));
};

export const metaphorFor = (b: ScriptBeat): Metaphor | undefined => {
  const text = `${b.vo} ${b.visual} ${b.text ?? ""}`;
  const hit = METAPHORS.find(([re]) => re.test(text));
  return hit?.[1];
};
