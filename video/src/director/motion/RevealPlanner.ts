// RevealPlanner: the progressive-disclosure system. Every complex visual
// should stage in layers — background → subject → relationship → annotation →
// consequence — instead of arriving complete. The planner turns a beat's
// reveal mode into an explicit trigger schedule the renderer can obey:
//   hold        nothing moves (a held beat is a choice, not a pause)
//   accent      a hand-drawn mark or sfx accent lands
//   question    a question stamp appears (curiosity device)
//   reveal      the thing is revealed: stamp + camera settle + music sting
// The triggers are deterministic and beat-relative.
import type { RevealMode, RevealTrigger, ScriptBeat } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import { rng, type Rng } from "../util.ts";

export type RevealDecision = { mode: RevealMode; holdUntil: number; triggers: RevealTrigger[] };

/** Fraction of the beat the reveal holds back before it starts. Long beats
 *  with high information density earn the most delay. */
const holdFraction = (dur: number, infoDensity: number, strategy: string) => {
  if (strategy === "delayed_reveal") return Math.min(0.45, 0.12 + dur * 0.01);
  if (infoDensity > 0.6) return 0.1;
  return 0.05;
};

export const revealFor = (
  b: ScriptBeat,
  facts: BeatFacts,
  mode: RevealMode,
  infoDensity: number,
  strategy: string,
): RevealDecision => {
  const dur = b.end - b.start;
  const r: Rng = rng(b.n * 104729 + 3);
  const holdUntil = Number((b.start + dur * holdFraction(dur, infoDensity, strategy)).toFixed(2));

  const triggers: RevealTrigger[] = [];
  // A question opens early — the viewer needs it before the answer.
  if (facts.question && strategy !== "impact") {
    triggers.push({
      at: Number((b.start + dur * (0.15 + r() * 0.1)).toFixed(2)),
      kind: "question",
      label: facts.question.slice(0, 40),
    });
  }
  // The reveal lands late and holds the frame — the payoff needs the beat's
  // remaining air.
  if (facts.reveal) {
    triggers.push({
      at: Number((b.start + dur * (0.62 + r() * 0.18)).toFixed(2)),
      kind: "reveal",
      label: facts.reveal.slice(0, 40),
    });
  }
  // Mid-length beats earn one accent to keep the eye moving.
  if (dur >= 8 && !facts.reveal && !facts.question) {
    triggers.push({
      at: Number((b.start + dur * (0.45 + r() * 0.2)).toFixed(2)),
      kind: "accent",
    });
  }

  return { mode, holdUntil, triggers: triggers.sort((a, z) => a.at - z.at) };
};
