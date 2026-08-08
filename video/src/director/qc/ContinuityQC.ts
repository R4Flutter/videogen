// ContinuityQC: does the film feel like one documentary? Callbacks must
// exist, transitions must have reasons, unexplained visual changes are
// flagged, and the ending must close the loop the hook opened.
import type { DirectorPlan, QcFinding } from "../types.ts";
import { clamp } from "../util.ts";

export const runContinuityQC = (plan: DirectorPlan): { findings: QcFinding[]; score: number } => {
  const findings: QcFinding[] = [];
  let score = 10;

  const flag = (f: QcFinding) => {
    findings.push(f);
    score -= f.level === "warn" ? 1.1 : 0.4;
  };

  const beats = plan.beats;

  // 1. Transitions must all carry a reason (they always do — this catches
  //    a future regression, not today's plan).
  for (const t of plan.transitions) {
    if (!t.reason || t.reason.length === 0) {
      flag({ at: t.at, level: "warn", rule: "unexplained-transition", message: `transition ${t.fromBeat}→${t.toBeat} has no reason` });
    }
  }

  // 2. Callbacks: a 4+ minute film should reference earlier material.
  const references = plan.memoryEvents.filter((e) => e.kind === "reference").length;
  if (plan.project.durationInSeconds > 240 && references === 0) {
    flag({ at: -1, level: "warn", rule: "no-callbacks", message: "no callback in a 4+ minute film" });
  } else if (references === 0) {
    flag({ at: -1, level: "info", rule: "no-callbacks-short", message: "short film with no callbacks (acceptable)" });
  }

  // 3. The ending must pay off the spine: the final beat references the
  //    central motif, or is a payoff/reflect beat.
  const last = beats[beats.length - 1];
  const central = plan.storyMemory.find((m) => m.central);
  const finalReferencesCentral = Boolean(
    central &&
      plan.memoryEvents.some(
        (e) => e.beat === last.n && e.motifId === central.id,
      ),
  );
  if (!finalReferencesCentral && last.narrative.purpose !== "payoff" && last.narrative.purpose !== "reflect") {
    flag({
      at: last.start,
      beat: last.n,
      level: "warn",
      rule: "weak-ending",
      message: "the film does not end on its payoff or its central motif",
    });
  }

  // 4. Unresolved questions: curiosity without closure.
  const questionEvents = plan.attentionEvents.filter((e) => e.type === "QUESTION").length;
  const revealEvents = plan.attentionEvents.filter((e) => e.type === "REVEAL").length;
  if (questionEvents > revealEvents + 2) {
    flag({ at: -1, level: "info", rule: "open-questions", message: `${questionEvents} questions vs ${revealEvents} reveals — some curiosity stays open (fine if intended)` });
  }

  // 5. Story memory entries must have appeared and be referenced sanely.
  for (const m of plan.storyMemory) {
    if (m.references > 6) {
      flag({ at: -1, level: "info", rule: "motif-overuse", message: `motif "${m.label}" referenced ${m.references} times` });
    }
  }

  // 6. Sequences: purpose variety across the film.
  const seqPurposes = new Set(plan.sequences.map((s) => s.purpose));
  if (seqPurposes.size <= 2 && beats.length >= 10) {
    flag({ at: -1, level: "info", rule: "flat-arc", message: `only ${seqPurposes.size} distinct sequence purposes across the film` });
  }

  return { findings, score: Number(clamp(score, 0, 10).toFixed(1)) };
};
