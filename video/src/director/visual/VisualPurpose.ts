// VisualPurpose: every visual must have a job. A beat whose visual has no
// meaningful purpose should be deleted, not decorated — so the director
// classifies first and only then picks a module.
import type { VisualPurpose } from "../types.ts";

const PURPOSE_OF: [RegExp, VisualPurpose][] = [
  [/\b(where|location|region|country|route|map|bangkok|dubai|border|here|there)\b/i, "LOCATE"],
  [/\b(human|person|family|victim|worker|woman|man|child|face|portrait)\b/i, "HUMANIZE"],
  [/\b(compare|versus|vs\.|against|difference|gap between|side by side)\b/i, "COMPARE"],
  [/\b(proof|evidence|document|record|report|source|screenshot|receipt)\b/i, "PROVE"],
  [/\b(reveal|turns out|actually|not real|fake|the truth|hidden|beneath)\b/i, "REVEAL"],
  [/\b(context|overview|setting|background|the bigger picture)\b/i, "ORIENT"],
  [/\b(how|mechanism|works|system|process|flow|steps?|pipeline)\b/i, "EXPLAIN"],
  [/\b(intensif|pressure|worse|danger|growing|escalat|volume)\b/i, "INTENSIFY"],
  [/\b(pause|quiet|breathe|silence|hold|remember|reflect)\b/i, "EMOTIONAL_PAUSE"],
];

export const visualPurposeFor = (b: {
  vo: string;
  visual: string;
  text?: string;
}): VisualPurpose => {
  const text = `${b.vo} ${b.visual} ${b.text ?? ""}`;
  const hit = PURPOSE_OF.find(([re]) => re.test(text));
  return (hit?.[1] ?? "EXPLAIN") as VisualPurpose;
};

/** The default module a purpose prefers, before continuity interferes. */
export const MODULE_BY_PURPOSE: Record<VisualPurpose, string[]> = {
  EXPLAIN: ["icon", "chart", "trace", "timeline", "funnel"],
  PROVE: ["quote", "footage", "doodle", "callout"],
  LOCATE: ["map", "footage"],
  HUMANIZE: ["footage", "collage", "doodle"],
  INTENSIFY: ["funnel", "stat", "compare", "trace"],
  COMPARE: ["compare", "chart"],
  REVEAL: ["trust", "stat", "doodle", "footage"],
  ORIENT: ["map", "footage", "timeline"],
  TRANSITION: ["kinetic", "footage"],
  EMOTIONAL_PAUSE: ["footage", "collage", "quote", "kinetic"],
};
