// CuriosityEngine: the viewer should rarely reach the end of a sequence
// without either a satisfying answer or a new question. This models the
// setup → anticipation → delay → reveal → payoff → new question machine over
// the beat facts, and reports what is left unresolved so RetentionQC can
// judge the whole film.
import type { Script, Sequence } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import { looksLikeQuestion } from "../util.ts";

export type CuriosityState = {
  /** The question currently held open, if any. */
  open: { question: string; sinceBeat: number } | null;
  /** Questions that were opened and never answered by the end. */
  unresolved: { question: string; atBeat: number }[];
  /** How often a question was posed (curiosity density). */
  questionCount: number;
  /** How often a beat answered what was open (payoff density). */
  answerCount: number;
  /** A per-beat map: did this beat open, answer, or both? */
  perBeat: Record<number, "open" | "answer" | "both" | "none">;
};

export const runCuriosity = (
  script: Script,
  facts: BeatFacts[],
  seqs: Sequence[],
): CuriosityState => {
  const state: CuriosityState = {
    open: null,
    unresolved: [],
    questionCount: 0,
    answerCount: 0,
    perBeat: {},
  };

  const seqPurpose = (n: number) => {
    const s = seqs.find((x) => n >= x.beatRange[0] && n <= x.beatRange[1]);
    return s?.purpose;
  };

  for (let i = 0; i < facts.length; i++) {
    const f = facts[i];
    const b = script.beats[i];
    const opened = f.question && looksLikeQuestion(f.question);
    // A beat answers the open question when it carries a reveal, or when its
    // purpose is payoff/reflect (the ending resolves by nature), or when it
    // explicitly names the consequence.
    const answers = Boolean(
      f.reveal ||
        f.consequence ||
        seqPurpose(f.n) === "payoff" ||
        seqPurpose(f.n) === "reflect",
    );

    if (opened) {
      state.questionCount += 1;
      state.open = { question: f.question!, sinceBeat: b.n };
    }
    if (answers && state.open) {
      state.answerCount += 1;
      state.open = null;
    } else if (answers && !state.open) {
      state.answerCount += 1;
    }

    state.perBeat[b.n] = opened && answers ? "both" : opened ? "open" : answers ? "answer" : "none";
  }

  if (state.open) state.unresolved.push({ question: state.open.question, atBeat: state.open.sinceBeat });

  return state;
};
