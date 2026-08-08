// ai/ViewerState.ts — a deterministic viewer-state tracker. The brain returns
// a viewerState per sequence; this tracker is the fallback (and the test
// harness) that maintains knowledge accumulation, open questions and reveals
// when the brain skips a sequence. Pure functions, no state.
import type { BeatDecision } from "./EditorialTypes.ts";

export type ViewerState = {
  knows: string[];
  believes: string[];
  suspects: string[];
  doesNotKnow: string[];
  openQuestions: string[];
  resolvedQuestions: string[];
};

export const emptyState = (): ViewerState => ({
  knows: [],
  believes: [],
  suspects: [],
  doesNotKnow: [],
  openQuestions: [],
  resolvedQuestions: [],
});

const pushUnique = <T>(arr: T[], v: T): T[] => (arr.includes(v) ? arr : [...arr, v]);

/** Apply one beat's editorial decision to the running viewer state. */
export const applyDecision = (state: ViewerState, d: BeatDecision): ViewerState => {
  let next = state;
  if (d.question) {
    next = { ...next, openQuestions: pushUnique(next.openQuestions, d.question) };
    if (d.reveal) {
      // A reveal on the same beat partially answers it.
      next = { ...next, resolvedQuestions: pushUnique(next.resolvedQuestions, d.question) };
      next = { ...next, knows: pushUnique(next.knows, d.reveal) };
      next = { ...next, openQuestions: next.openQuestions.filter((q) => q !== d.question) };
    } else {
      next = { ...next, doesNotKnow: pushUnique(next.doesNotKnow, d.question) };
    }
  } else if (d.reveal) {
    // A reveal with no question on this beat: it answers the most recent
    // open question (a documentary reveal resolves the question it was
    // planted by), otherwise lands as new knowledge.
    const target = next.openQuestions.find((q) =>
      q.toLowerCase().includes(d.reveal!.slice(0, 24).toLowerCase()) ||
      d.reveal!.toLowerCase().includes(q.slice(0, 24).toLowerCase()),
    ) ?? next.openQuestions[next.openQuestions.length - 1];
    if (target) {
      next = { ...next, resolvedQuestions: pushUnique(next.resolvedQuestions, target) };
      next = { ...next, openQuestions: next.openQuestions.filter((q) => q !== target) };
    }
    next = { ...next, knows: pushUnique(next.knows, d.reveal) };
  }
  if (d.consequence) {
    next = { ...next, knows: pushUnique(next.knows, d.consequence) };
  }
  if (d.nextQuestion && !next.openQuestions.includes(d.nextQuestion)) {
    next = { ...next, openQuestions: pushUnique(next.openQuestions, d.nextQuestion) };
  }
  return next;
};

/** Run a decision list through the tracker, returning the end state. */
export const runDecisions = (decisions: BeatDecision[]): ViewerState =>
  decisions.reduce((s, d) => applyDecision(s, d), emptyState());
