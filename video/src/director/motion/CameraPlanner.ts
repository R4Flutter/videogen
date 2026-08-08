// CameraPlanner: the 2.5D editorial camera. Every beat gets a semantic intent
// — not a scale value — and the renderer's useSemanticCamera turns intent
// into framing. The intent is earned from the beat's job: a diagram holds
// still while a reveal pushes in, and a rest beat's camera barely breathes.
// Author's `Camera:` row wins.
import type { CameraIntent, ScriptBeat } from "../types.ts";
import type { VisualDecision } from "../visual/VisualDirector.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import type { Emotion } from "../types.ts";

export const CAMERA_BY_PURPOSE: Record<string, CameraIntent[]> = {
  hook: ["reveal", "establish"],
  orient: ["establish", "pull"],
  explain: ["settle", "pan"],
  complicate: ["push", "settle"],
  escalate: ["push", "compare"],
  reveal: ["reveal", "push", "focus"],
  consequence: ["pull", "settle"],
  payoff: ["focus", "reveal"],
  reflect: ["pull", "settle"],
  rest: ["settle", "pull"],
};

export const CAMERA_BY_MODULE: Record<string, CameraIntent> = {
  map: "focus", // the module frames its own subject
  trace: "focus",
  trust: "settle",
  funnel: "settle",
  collage: "settle",
  kinetic: "push",
  stat: "push",
  compare: "compare",
  chart: "settle",
  timeline: "settle",
  icon: "settle",
  doodle: "focus",
  footage: "settle",
  callout: "focus",
  quote: "settle",
};


export const cameraFor = (
  b: ScriptBeat,
  facts: BeatFacts,
  visual: VisualDecision,
  emotion: Emotion,
): CameraIntent => {
  if (b.camera) {
    const named = b.camera.toLowerCase();
    const known: CameraIntent[] = ["establish", "focus", "push", "pull", "pan", "compare", "reveal", "settle"];
    const hit = known.find((k) => named.includes(k));
    if (hit) return hit;
  }
  // The editorial modules drive their own camera from inside the beat — a
  // page camera on top of a trace token is two cameras fighting.
  const selfFraming = ["map", "trace", "trust", "funnel", "collage"].includes(b.module);
  if (selfFraming) return "settle";
  const byPurpose = CAMERA_BY_PURPOSE[facts.purpose] ?? ["settle"];
  // Emotional override: high-tension beats lean in; relief and reflection
  // widen out.
  if (emotion === "tension" || emotion === "anticipation" || emotion === "surprise")
    return "push";
  if (emotion === "relief" || emotion === "satisfaction")
    return "pull";
  if (visual.rest) return "settle";
  return byPurpose[0];
};
