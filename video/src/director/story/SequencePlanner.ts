// SequencePlanner: the middle layer between chapter and beat. A sequence is
// a unit of narrative work — one open question, one answer, one turn. The
// viewer should rarely end a sequence without either an answer or a new
// question (CuriosityEngine enforces that).
import type { Density, NarrativePurpose, Script, Sequence } from "../types.ts";
import type { BeatFacts } from "./StoryAnalyzer.ts";
import { chapterId } from "./ChapterPlanner.ts";
import type { Chapter } from "../types.ts";

const PURPOSE_RUN = new Set<NarrativePurpose>(["explain", "complicate", "escalate"]);
const MAX_SEQUENCE_BEATS = 5;
const MIN_SEQUENCE_BEATS = 2;

export const planSequences = (
  script: Script,
  facts: BeatFacts[],
  chapters: Chapter[],
): Sequence[] => {
  const beats = script.beats;
  const seqs: Sequence[] = [];
  let run: BeatFacts[] = [];
  let runPurpose: NarrativePurpose | null = null;

  const flush = (): Sequence | null => {
    if (!run.length) return null;
    const first = run[0];
    const last = run[run.length - 1];
    const b0 = beats.find((b) => b.n === first.n)!;
    const b1 = beats.find((b) => b.n === last.n)!;
    const emotions = new Set(run.map((f) => f.emotionHint).filter(Boolean));
    const purpose = runPurpose ?? first.purpose;

    // Information density: chapters of pure mechanism run dense; human and
    // rest beats run light.
    const infoDensity: Density = run.some((f) => f.purpose === "rest")
      ? "low"
      : run.every((f) => f.purpose === "explain")
        ? "high"
        : "medium";

    const seq: Sequence = {
      id: `seq_${String(seqs.length + 1).padStart(2, "0")}`,
      purpose,
      chapterId: chapterId(chapters, first.n),
      beatRange: [first.n, last.n],
      start: b0.start,
      end: b1.end,
      openQuestion: run.find((f) => f.question)?.question,
      answer: run.find((f) => f.reveal)?.reveal,
      emotion: (emotions.values().next().value as Sequence["emotion"]) ?? "curiosity",
      infoDensity,
      attentionTarget: {
        novelty: purpose === "rest" ? 0.25 : 0.6,
        curiosity: 0.6,
        tension: purpose === "escalate" || purpose === "reveal" ? 0.75 : 0.4,
        informationDensity: infoDensity === "high" ? 0.75 : infoDensity === "medium" ? 0.55 : 0.3,
        emotionalIntensity: purpose === "payoff" || purpose === "reflect" ? 0.8 : 0.5,
      },
    };
    seqs.push(seq);
    run = [];
    runPurpose = null;
    return seq;
  };

  for (const f of facts) {
    // A hook, payoff, reflect or rest beat is its own sequence.
    if (!PURPOSE_RUN.has(f.purpose)) {
      flush();
      run = [f];
      runPurpose = f.purpose;
      flush();
      continue;
    }
    // Same purpose extends the run; a shift or an overlong run flushes it.
    if (runPurpose && f.purpose !== runPurpose) flush();
    run.push(f);
    runPurpose = f.purpose;
    if (run.length >= MAX_SEQUENCE_BEATS) flush();
  }
  if (run.length >= MIN_SEQUENCE_BEATS) flush();

  return seqs;
};

export const sequenceOfBeat = (seqs: Sequence[], n: number) =>
  seqs.find((s) => n >= s.beatRange[0] && n <= s.beatRange[1]) ?? seqs[seqs.length - 1];
