// Causality: Trey Parker's rule, as a gate.
//
// "Between every two beats you should be able to write BUT or THEREFORE. If
// the only word that fits is AND THEN, you have a list, not a story."
//
// It is the cheapest high-leverage writing check that exists, and it is the
// one thing no amount of motion design can compensate for: a viewer leaves a
// list at whatever point they stop caring, because nothing in a list makes the
// next item necessary.
//
// The detection is deliberately conservative. False positives here are
// expensive — an author who is told their good transition is broken stops
// trusting the tool — so a pair is only flagged when it shows *no* sign of
// causality by any of the four tests below. In practice that means the gate
// catches genuine run-ons and stays quiet on prose that connects implicitly.
import type { Script, ScriptBeat } from "../types.ts";
import { terms } from "../attention/LoopStack.ts";
import { quantityCount } from "../util.ts";

export type Connective = "BUT" | "THEREFORE" | "AND_THEN";

export type Link = {
  from: number;
  to: number;
  connective: Connective;
  /** Why it was classified this way — shown in the report so the author can
   *  disagree with the machine rather than obey it. */
  evidence: string;
};

/** Contrast markers: the beat reverses, qualifies or blocks what came before. */
const BUT_WORDS =
  /\b(but|however|except|yet|although|though|instead|meanwhile|despite|whereas|actually|in fact|turns out|the problem|the catch|none of|never|didn'?t|doesn'?t|wasn'?t|isn'?t|can'?t|couldn'?t|failed|refused|denied|no one)\b/i;

/** Consequence markers: the beat follows *from* what came before. */
const THEREFORE_WORDS =
  /\b(so|therefore|which means|that means|because|since|as a result|so that|then|now|leaving|leaves|left (them|him|her|you)|forcing|forced|causes?|caused|results? in|ends? up|that'?s (why|how)|hence|thus)\b/i;

/** The connective between two consecutive beats.
 *
 *  Four tests, in order of confidence:
 *    1. An explicit contrast marker at the head of the beat.
 *    2. An explicit consequence marker at the head of the beat.
 *    3. A numeric change: the beat restates a quantity the previous beat set.
 *       "It pays 0.4%" → "The basket costs 3% more" is a BUT with no "but".
 *    4. Referential overlap: the beat is *about* what the last beat introduced.
 *       Shared subject is weak causality, but it is not a list. */
export const linkBetween = (prev: ScriptBeat, next: ScriptBeat): Link => {
  const head = next.vo.trim().slice(0, 90);
  const whole = `${next.vo} ${next.text ?? ""}`;

  if (BUT_WORDS.test(head)) {
    return { from: prev.n, to: next.n, connective: "BUT", evidence: `contrast marker in "${head.slice(0, 40)}…"` };
  }
  if (THEREFORE_WORDS.test(head)) {
    return { from: prev.n, to: next.n, connective: "THEREFORE", evidence: `consequence marker in "${head.slice(0, 40)}…"` };
  }
  if (BUT_WORDS.test(whole)) {
    return { from: prev.n, to: next.n, connective: "BUT", evidence: "contrast marker later in the beat" };
  }
  if (THEREFORE_WORDS.test(whole)) {
    return { from: prev.n, to: next.n, connective: "THEREFORE", evidence: "consequence marker later in the beat" };
  }

  // A quantity restated is an argument, even with no connective word: "it
  // pays two dollars" → "the machine made thirty million a day" is a contrast
  // nobody had to write the word "but" for.
  if (quantityCount(`${prev.vo} ${prev.text ?? ""}`) > 0 && quantityCount(`${next.vo} ${next.text ?? ""}`) > 0) {
    return { from: prev.n, to: next.n, connective: "THEREFORE", evidence: "both beats carry quantities — the second moves the first" };
  }

  // Referential overlap: is this beat about what the last one introduced?
  // Scored against the *shorter* of the two term lists. Scoring against the
  // previous beat alone punished long setup beats: a 40-word paragraph
  // followed by a tight 8-word turn can never share 22% of forty terms, and
  // that pairing is one of the strongest seams in an essay, not the weakest.
  const a = terms(`${prev.vo} ${prev.text ?? ""}`);
  const bTerms = terms(`${next.vo} ${next.text ?? ""}`);
  const b = new Set(bTerms);
  const shared = a.filter((t) => b.has(t)).length;
  const denom = Math.max(1, Math.min(a.length, bTerms.length));
  if (shared >= 2 && shared / denom >= 0.2) {
    return { from: prev.n, to: next.n, connective: "THEREFORE", evidence: `${shared} shared subjects with the previous beat` };
  }

  return { from: prev.n, to: next.n, connective: "AND_THEN", evidence: "no contrast, no consequence, no shared subject" };
};

export const analyzeCausality = (script: Script): Link[] => {
  const out: Link[] = [];
  for (let i = 1; i < script.beats.length; i++) {
    out.push(linkBetween(script.beats[i - 1], script.beats[i]));
  }
  return out;
};

/** Runs of consecutive AND_THEN links. One weak seam is a moment; three in a
 *  row is a section the viewer has no reason to sit through, and that is what
 *  is worth blocking a render over. */
export const andThenRuns = (links: Link[], min = 2): { from: number; to: number; length: number }[] => {
  const out: { from: number; to: number; length: number }[] = [];
  let run: Link[] = [];
  const flush = () => {
    if (run.length >= min) out.push({ from: run[0].from, to: run[run.length - 1].to, length: run.length });
    run = [];
  };
  for (const l of links) {
    if (l.connective === "AND_THEN") run.push(l);
    else flush();
  }
  flush();
  return out;
};

/** The share of seams that carry real causality. A healthy essay sits well
 *  above 0.8; below 0.6 the script is a list of facts about a topic. */
export const causalityScore = (links: Link[]): number =>
  links.length ? links.filter((l) => l.connective !== "AND_THEN").length / links.length : 1;
