// TimelineValidator: the pre-render gate. A timeline that reaches Remotion
// must be provably renderable — no overlapping beats, no negative durations,
// no cues outside the film, no dangling callbacks. Every rule maps to the
// test list in tools/direct-check.mjs; the renderer is allowed to trust this
// pass.
import type { DirectorPlan } from "../types.ts";

export type ValidationIssue = { at?: number; beat?: number; rule: string; message: string };

export const validateTimeline = (plan: DirectorPlan): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const total = plan.project.durationInSeconds;

  // --- timings
  let prevEnd = -1;
  for (const b of plan.beats) {
    if (!Number.isFinite(b.start) || !Number.isFinite(b.end)) {
      issues.push({ beat: b.n, rule: "invalid-timing", message: `beat ${b.n} has non-finite timing` });
      continue;
    }
    if (b.end <= b.start) {
      issues.push({ beat: b.n, rule: "negative-duration", message: `beat ${b.n} ends before it starts` });
    }
    if (b.start < prevEnd - 0.01) {
      issues.push({ beat: b.n, rule: "overlap", message: `beat ${b.n} overlaps the previous beat` });
    }
    if (b.audioStart + 8 < b.start - 2.5 || b.audioStart > b.start + 1) {
      issues.push({ beat: b.n, rule: "jcut-range", message: `beat ${b.n} audio start ${b.audioStart} is out of range` });
    }
    prevEnd = b.end;
  }

  // --- event ranges
  const inRange = (t: number, what: string, beat?: number) => {
    if (!Number.isFinite(t) || t < 0 || t > total + 0.5) {
      issues.push({ at: t, beat, rule: "event-out-of-range", message: `${what} at ${t}s is outside the film` });
      return false;
    }
    return true;
  };
  for (const e of plan.attentionEvents) inRange(e.at, `attention ${e.type}`, e.beat);
  for (const e of plan.audioEvents) inRange(e.at, `audio ${e.kind} ${e.label ?? ""}`);
  for (const e of plan.memoryEvents) inRange(e.at, `memory ${e.kind} ${e.motifId}`, e.beat);

  // --- silence may not cover a beat's whole speech
  const beatOf = (n: number) => plan.beats.find((b) => b.n === n);
  for (const b of plan.beats) {
    for (const s of b.audio.silence) {
      if (s.dur <= 0) issues.push({ beat: b.n, rule: "silence-duration", message: `beat ${b.n} has a non-positive silence window` });
      if (s.at + s.dur > b.end + 0.5 || s.at < b.start - 0.5) {
        issues.push({ beat: b.n, rule: "silence-range", message: `beat ${b.n} silence ${s.kind} leaves the beat` });
      }
      if (s.kind === "FULL_SILENCE" && s.dur > b.end - b.start - 1.5) {
        issues.push({ beat: b.n, rule: "silence-coverage", message: `beat ${b.n} FULL_SILENCE covers almost the whole beat` });
      }
    }
  }

  // --- callback references
  const motifIds = new Set(plan.storyMemory.map((m) => m.id));
  for (const e of plan.memoryEvents) {
    if (!motifIds.has(e.motifId)) {
      issues.push({ beat: e.beat, rule: "callback-ref", message: `memory event references unknown motif ${e.motifId}` });
    }
    const b = beatOf(e.beat);
    if (b && e.kind === "reference" && e.beat === b.n && e.at < b.start - 1) {
      issues.push({ beat: e.beat, rule: "callback-timing", message: `callback ${e.motifId} fires before its beat starts` });
    }
  }

  // --- transitions reference real beats
  for (const t of plan.transitions) {
    if (!plan.beats.some((b) => b.n === t.fromBeat) || !plan.beats.some((b) => b.n === t.toBeat)) {
      issues.push({ rule: "transition-ref", message: `transition ${t.fromBeat}→${t.toBeat} references a missing beat` });
    }
  }

  // --- chapter coverage
  if (!plan.chapters.length) issues.push({ rule: "chapters", message: "plan has no chapters" });
  let covered = -1;
  for (const c of plan.chapters) {
    if (c.start >= c.end) issues.push({ rule: "chapter-range", message: `chapter ${c.id} has no duration` });
    if (c.start < covered) issues.push({ rule: "chapter-overlap", message: `chapter ${c.id} overlaps the previous one` });
    covered = c.end;
  }
  if (covered < total - 0.5) {
    issues.push({ rule: "chapter-coverage", message: `chapters cover only ${covered}s of ${total}s` });
  }

  return issues;
};
