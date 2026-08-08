// AttentionDirector: pulls the attention system together per beat. Each beat
// carries a target profile — novelty, curiosity, tension, information density,
// emotional intensity — plus a strategy and a rhythm tier. These are planning
// signals: they decide how the beat stages, how long it holds, how the camera
// moves, and what the QC layer judges the film against.
import type { AttentionStrategy, Emotion, ScriptBeat } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import type { RhythmDecision } from "./RhythmEngine.ts";
import { clamp } from "../util.ts";

export type AttentionProfile = {
  novelty: number;
  curiosity: number;
  tension: number;
  informationDensity: number;
  emotionalIntensity: number;
  strategy: AttentionStrategy;
};

export const profileFor = (
  b: ScriptBeat,
  facts: BeatFacts,
  emotion: Emotion,
  rhythm: RhythmDecision,
): AttentionProfile => {
  const dur = b.end - b.start;

  // Curiosity is earned by questions and reveals; both open the "what next?"
  // door that keeps a viewer from leaving.
  const curiosity = clamp(
    0.5 +
      (facts.question ? 0.3 : 0) +
      (facts.reveal ? 0.2 : 0) +
      (emotion === "anticipation" || emotion === "surprise" ? 0.15 : 0),
    0.1,
    1,
  );

  // Novelty is the module's freshness: first appearance of a module is
  // exciting, the third run in a row is wallpaper.
  const tension =
    emotion === "tension" || emotion === "shock" || emotion === "anger"
      ? 0.8
      : emotion === "anticipation"
        ? 0.65
        : facts.purpose === "escalate"
          ? 0.7
          : 0.35;

  const informationDensity = clamp(
    (facts.purpose === "explain" || facts.purpose === "consequence" ? 0.7 : 0.4) +
      (b.data && b.data.length > 2 ? 0.2 : 0) +
      (b.icons && b.icons.length > 2 ? 0.1 : 0) -
      (facts.purpose === "rest" || facts.purpose === "reflect" ? 0.25 : 0),
    0.05,
    1,
  );

  const emotionalIntensity =
    emotion === "shock" || emotion === "anger"
      ? 0.9
      : emotion === "tension" || emotion === "empathy"
        ? 0.75
        : emotion === "satisfaction" || emotion === "surprise"
          ? 0.6
          : 0.35;

  // Long beats need an explicit strategy or they read as filler.
  const strategy: AttentionStrategy =
    facts.purpose === "rest"
      ? "rest"
      : facts.purpose === "payoff" || facts.purpose === "hook"
        ? "impact"
        : facts.reveal || rhythm.reset
          ? "progressive_reveal"
          : dur > 12 && informationDensity < 0.5
            ? "delayed_reveal"
            : "standard";

  return {
    novelty: 0.6,
    curiosity: Number(curiosity.toFixed(2)),
    tension: Number(tension.toFixed(2)),
    informationDensity: Number(informationDensity.toFixed(2)),
    emotionalIntensity: Number(emotionalIntensity.toFixed(2)),
    strategy,
  };
};
