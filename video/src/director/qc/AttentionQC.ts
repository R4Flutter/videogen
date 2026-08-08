// AttentionQC: does the attention system actually hold the film together?
// Looks for stretches where nothing changes, where the same module repeats,
// where no question is open, and where resets are missing. Every check is a
// counting rule — no taste, just thresholds.
import type { DirectorPlan, QcFinding } from "../types.ts";
import { moduleRuns } from "../visual/VisualContinuity.ts";
import { clamp } from "../util.ts";

const TIER_RESET_SECONDS = 60;

export const runAttentionQC = (plan: DirectorPlan): { findings: QcFinding[]; score: number } => {
  const findings: QcFinding[] = [];
  let score = 10;

  const flag = (f: QcFinding) => {
    findings.push(f);
    score -= f.level === "warn" ? 1.2 : 0.4;
  };

  // 1. Long low-information stretches: low density + low curiosity, 25s+.
  const beats = plan.beats;
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    const dur = b.end - b.start;
    if (dur >= 25 && b.attention.informationDensity < 0.45 && b.attention.curiosity < 0.55 && !b.visual.rest) {
      flag({
        at: b.start,
        beat: b.n,
        level: "warn",
        rule: "low-info-stretch",
        message: `${Math.round(dur)}s at ${fmt(b.start)} with low information and curiosity`,
      });
    }
    if (b.visual.rest && dur > 20) {
      flag({ at: b.start, beat: b.n, level: "info", rule: "long-rest", message: "a rest beat running 20s+ risks reading as a stall" });
    }
  }

  // 2. Repetitive visuals: three identical modules in a row.
  for (const run of moduleRuns(beats)) {
    if (run.beats.length >= 3) {
      flag({
        at: beats.find((b) => b.n === run.beats[0])?.start ?? 0,
        beat: run.beats[0],
        level: "warn",
        rule: "module-run",
        message: `${run.beats.length}× "${run.module}" in a row (beats ${run.beats.join(", ")})`,
      });
    }
  }

  // 3. Module domination.
  const counts: Record<string, number> = {};
  for (const b of beats) counts[b.visual.module] = (counts[b.visual.module] ?? 0) + 1;
  for (const [m, n] of Object.entries(counts)) {
    if (n / beats.length > 0.34) {
      flag({ at: -1, level: "warn", rule: "module-dominance", message: `"${m}" carries ${Math.round((n / beats.length) * 100)}% of beats` });
    }
  }

  // 4. Attention resets: none in the first 60s or long gaps between them.
  const resets = plan.attentionEvents.filter(
    (e) =>
      e.type === "PERSPECTIVE_CHANGE" ||
      e.type === "PATTERN_INTERRUPT" ||
      e.type === "MAP_REVEAL" ||
      e.strength >= 0.85,
  );
  const resetTimes = resets.map((e) => e.at);
  if (!resetTimes.length) {
    flag({ at: -1, level: "warn", rule: "no-reset", message: "no attention reset in the whole film" });
  } else {
    if (resetTimes[0] > TIER_RESET_SECONDS) {
      flag({ at: resetTimes[0], level: "info", rule: "late-first-reset", message: `first reset at ${fmt(resetTimes[0])}` });
    }
    for (let i = 1; i < resetTimes.length; i++) {
      if (resetTimes[i] - resetTimes[i - 1] > TIER_RESET_SECONDS * 1.8) {
        flag({
          at: resetTimes[i],
          level: "info",
          rule: "reset-gap",
          message: `${Math.round(resetTimes[i] - resetTimes[i - 1])}s without an attention reset`,
        });
      }
    }
  }

  // 5. Empty stretches: no attention event at all for 20s.
  let lastEvent = 0;
  for (const e of plan.attentionEvents) {
    if (e.at - lastEvent > 20) {
      flag({ at: lastEvent, level: "info", rule: "quiet-stretch", message: `${Math.round(e.at - lastEvent)}s with no attention event` });
    }
    lastEvent = e.at;
  }

  // 6. Fatigue: kinetic typography dominance.
  const kinetic = counts["kinetic"] ?? 0;
  if (kinetic / beats.length > 0.3) {
    flag({ at: -1, level: "warn", rule: "kinetic-overuse", message: `kinetic typography carries ${Math.round((kinetic / beats.length) * 100)}% of the film` });
  }

  return { findings, score: Number(clamp(score, 0, 10).toFixed(1)) };
};

export const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};
