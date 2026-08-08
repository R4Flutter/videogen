// StoryAnalyzer: what the viewer knows, what they don't, what's open, what
// changes. The director's first pass — every later layer reads these facts.
// Without an LLM in the loop this is a heuristic engine: it reads the rows an
// author writes (Question / Reveal / Purpose / Emotion) and infers the rest
// from structure and language. An author's row always wins.
import type { NarrativePurpose, Script, ScriptBeat } from "../types.ts";
import { looksLikeQuestion, progress } from "../util.ts";

export type BeatFacts = {
  n: number;
  purpose: NarrativePurpose;
  question?: string;
  reveal?: string;
  nextQuestion?: string;
  consequence?: string;
  viewerKnows: string[]; // claims this beat established
  viewerDoesNotKnow: string[]; // claims left unresolved
  emotionHint?: string;
};

const PURPOSE_WORDS: [RegExp, NarrativePurpose][] = [
  [/\bhook\b|\bcold open\b/i, "hook"],
  [/\bpayoff\b|\bending\b|\btherefore\b|\bconclusion\b/i, "payoff"],
  [/\breflect\b|\blook back\b|\blegacy\b|\blesson\b/i, "reflect"],
  [/\breveal\b|\bthe truth\b|\bturns out\b|\bactually\b|\bnot real\b|\bwas fake\b/i, "reveal"],
  [/\bconsequence\b|\bresult\b|\bthe cost\b|\bthe damage\b|\bthe fallout\b/i, "consequence"],
  [/\bescalat|\bworse\b|\bthen it gets\b|\bdanger\b|\bpressure\b/i, "escalate"],
  [/\bcomplicat|\bbut\b|\bhowever\b|\bproblem\b|\bexcept\b/i, "complicate"],
  [/\borient\b|\bcontext\b|\bbackground\b|\bmeet\b|\bwho is\b/i, "orient"],
  [/\brest\b|\bquiet\b|\bhold\b|\bbreathe\b/i, "rest"],
];

/** First beat hooks, last beats pay off — position is a fact, not a guess. */
const positionPurpose = (i: number, beats: ScriptBeat[]): NarrativePurpose => {
  if (i === 0) return "hook";
  if (i === beats.length - 1) return "payoff";
  return "explain";
};

export const analyzeBeat = (b: ScriptBeat, i: number, beats: ScriptBeat[]): BeatFacts => {
  const text = `${b.name} ${b.visual} ${b.vo} ${b.motion ?? ""} ${b.text ?? ""}`;

  let purpose: NarrativePurpose = "explain";
  if (b.purpose) {
    const matched = PURPOSE_WORDS.find(([re]) => re.test(b.purpose));
    if (matched) purpose = matched[1];
  }
  if (purpose === "explain") purpose = positionPurpose(i, beats);

  const question = b.question?.trim() || (looksLikeQuestion(b.vo) ? b.vo.trim() : undefined);

  // The reveal row, or the beat's own language that reads like a reversal.
  const reveal = b.reveal?.trim() || undefined;

  // A beat that names a number states a fact; a beat with "but"/"not real"
  // inverts one. Both are things the viewer knows after this beat.
  const viewerKnows: string[] = [];
  if (b.text?.trim()) viewerKnows.push(b.text.trim());
  if (reveal) viewerKnows.push(reveal);

  const nextQuestion = looksLikeQuestion(b.vo) && !question ? undefined : undefined;

  const consequence = b.vo.match(/\b(gone|lost|locked|vanished|stopped|arrested|fined|broke)\b/i)?.[1];

  return {
    n: b.n,
    purpose,
    question,
    reveal,
    nextQuestion,
    consequence,
    viewerKnows,
    viewerDoesNotKnow: [],
    emotionHint: b.emotion,
  };
};

/** The whole story, in facts. */
export const analyzeStory = (script: Script): BeatFacts[] =>
  script.beats.map((b, i) => analyzeBeat(b, i, script.beats));
