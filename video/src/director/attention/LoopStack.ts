// LoopStack: the machine that actually holds a viewer.
//
// The Zeigarnik effect says an interrupted task is held in mind better than a
// completed one. That is the whole engine of retention: an unresolved question
// is a low-grade discomfort the viewer wants closed, and that discomfort is the
// only thing that survives the impulse to leave.
//
// `CuriosityEngine` modelled this with a single open slot, which meant a second
// question silently erased the first and any reveal closed any question. This
// replaces it with what editors actually do — a stack, three depths deep:
//
//   MACRO   the film's spine.  Opened in the cold open, closed at the payoff.
//   ACT     one chapter's job. Opened at a chapter head, closed at its turn.
//   BEAT    a local pull.      Opened and closed inside ~45s.
//
// Two rules that fall out of the depths and drive everything downstream:
//
//   1. At least two loops open at all times. One is a thin thread; zero is a
//      viewer with no reason to still be here.
//   2. Never more than three. Four open questions is not tension, it is
//      confusion, and confusion reads as effort.
//
// Closure requires *overlap*, not merely the existence of a reveal somewhere.
// A reveal about the fee structure does not close a question about the founder.
// Reveals that close nothing are reported as `unmatched` — those are the beats
// that feel like they should land and don't, and they were invisible before.
import type { Chapter, Script, ScriptBeat, Sequence } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import { looksLikeQuestion } from "../util.ts";

export type LoopDepth = "MACRO" | "ACT" | "BEAT";

export type Loop = {
  id: string;
  depth: LoopDepth;
  question: string;
  /** Content words the closure has to hit to count. */
  terms: string[];
  openedAtBeat: number;
  openedAt: number; // seconds
  closedAtBeat?: number;
  closedAt?: number;
  /** True when the loop came from a chapter card rather than an author's
   *  `Question:` row. Kept visible so a report can distinguish "you promised
   *  this" from "the structure implies it". */
  inferred?: boolean;
  /** The last beat this loop may still be closed on. A chapter's promise is
   *  answered inside that chapter or not at all — carrying it further would
   *  let a later chapter's reveal silently "pay off" a question the viewer
   *  stopped holding two chapters ago. */
  scopeEndBeat?: number;
  /** How the loop ended. `decayed` means it was still open past its shelf life. */
  outcome: "closed" | "open" | "decayed";
};

export type LoopState = {
  loops: Loop[];
  /** Loop debt sampled once per second: how many loops are open at t. */
  debt: number[];
  /** Per beat: what the beat did to the stack. */
  perBeat: Record<number, { opened: Loop[]; closed: Loop[]; depthOpen: number }>;
  /** Reveals that closed nothing — the beats that should land and don't. */
  unmatched: { beat: number; at: number; reveal: string }[];
  /** Windows where fewer than MIN_OPEN loops were open. */
  starved: { from: number; to: number }[];
  /** Windows where more than MAX_OPEN were open. */
  crowded: { from: number; to: number }[];
};

/** The band. Below MIN the viewer is free to leave; above MAX they are lost. */
export const MIN_OPEN = 2;
export const MAX_OPEN = 3;

/** How long each depth may stay open before the tension has decayed into
 *  forgetting. A beat question held for a minute is not suspense — the viewer
 *  stopped holding it forty seconds ago. */
export const SHELF_LIFE: Record<LoopDepth, number> = {
  MACRO: Infinity, // the spine may run the whole film
  ACT: 240,
  BEAT: 45,
};

/** Words that carry no identity, so they can't be what a closure matches on. */
const STOP = new Set([
  "the", "a", "an", "and", "but", "or", "so", "if", "then", "than", "that", "this",
  "these", "those", "it", "its", "is", "was", "are", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "for", "with", "from", "by", "as", "into", "about",
  "you", "your", "they", "their", "them", "he", "she", "his", "her", "we", "our",
  "i", "me", "my", "who", "what", "where", "when", "why", "how", "which", "whose",
  "do", "does", "did", "done", "can", "could", "will", "would", "should", "may",
  "not", "no", "nothing", "any", "all", "one", "two", "some", "more", "most",
  "there", "here", "up", "out", "off", "over", "just", "only", "even", "still",
  "get", "got", "make", "made", "go", "goes", "went", "say", "says", "said",
]);

/** The content words of a line, lowercased and de-duplicated. Numbers keep
 *  their punctuation — "$15" and "15" should not be the same term, because in
 *  a money story the currency is the fact. */
export const terms = (s: string): string[] => {
  const raw = s.toLowerCase().match(/\$?\d[\d,.]*%?|[a-z][a-z'-]{2,}/g) ?? [];
  const out: string[] = [];
  for (const t of raw) {
    const w = t.replace(/^['-]+|['-]+$/g, "");
    if (!w || STOP.has(w)) continue;
    // Crude stem: regular plurals only. "-ies" → "-y", then a trailing "s"
    // that isn't part of "ss"/"us". Anything cleverer needs a lexicon and
    // would be wrong more often than it is right.
    const stem = w.replace(/ies$/, "y").replace(/([^su])s$/, "$1");
    if (!out.includes(stem)) out.push(stem);
  }
  return out;
};

/** How much a closure line overlaps a question, 0..1. Asymmetric on purpose:
 *  it is scored against the *question's* terms, because a long reveal that
 *  happens to contain the question's subject is still an answer. */
export const overlap = (questionTerms: string[], closure: string): number => {
  if (!questionTerms.length) return 0;
  const c = new Set(terms(closure));
  let hit = 0;
  for (const t of questionTerms) if (c.has(t)) hit += 1;
  return hit / questionTerms.length;
};

/** Overlap at or above this counts as an answer. Two terms out of five is a
 *  real echo; one out of eight is a coincidence. */
export const MATCH_THRESHOLD = 0.34;

/** The depth a question is opened at.
 *
 *  Author intent first (a `Question:` row on a chapter's first beat is an act
 *  question by construction), then position: the first ~8% of the film opens
 *  the spine, a chapter head opens an act, everything else is local. */
const depthFor = (
  b: ScriptBeat,
  i: number,
  script: Script,
  chapters: Chapter[],
): LoopDepth => {
  const p = script.beats.length <= 1 ? 0 : i / (script.beats.length - 1);
  if (p <= 0.12) {
    // Everything asked in the cold open is the spine.
    //
    // A cold open legitimately sets two or three questions — "Here's who was
    // paying you. And how they got caught." is two promises in one breath —
    // and the film answers all of them at the payoff, eight minutes later.
    // Filing the second one below MACRO gives it a shelf life it was never
    // meant to have, and the engine then reports the film's own thesis as a
    // forgotten loop. If a cold-open question really does go unanswered,
    // LOOP_UNRESOLVED catches it at the credits, which is the honest place.
    return "MACRO";
  }
  if (chapters.some((c) => c.startBeat === b.n)) return "ACT";
  return "BEAT";
};

/** Everything a beat could be using to close a loop, as one line. */
const closureText = (b: ScriptBeat, f: BeatFacts): string =>
  [f.reveal ?? "", f.consequence ?? "", b.text ?? "", b.vo].join(" ");

/** A chapter card is a promise.
 *
 *  "THE LADDER" is not a label, it is a question the viewer now holds — what
 *  is the ladder, and why does it matter? Editors rely on this: it is why
 *  chapter cards buy attention rather than spend it. So a chapter head opens
 *  an ACT loop even when the author wrote no `Question:` row, and the chapter
 *  is expected to answer it.
 *
 *  Inferred loops are marked, and a chapter that contains no reveal at all
 *  will show up as decayed — which is the true finding: the chapter promised
 *  a turn and never took one. */
const inferredChapterLoop = (c: Chapter, script: Script, chapters: Chapter[]): Loop | null => {
  const head = script.beats.find((b) => b.n === c.startBeat);
  if (!head) return null;
  const title = c.card.text || c.title;
  const next = chapters.find((x) => x.ordinal === c.ordinal + 1);
  const lastBeat = next
    ? (script.beats.find((b) => b.n === next.startBeat - 1)?.n ?? next.startBeat - 1)
    : script.beats[script.beats.length - 1].n;
  return {
    id: `loop_ch_${c.ordinal}`,
    depth: "ACT",
    question: `${title}?`,
    terms: terms(`${title} ${c.card.subtext ?? ""}`),
    openedAtBeat: c.startBeat,
    openedAt: head.start,
    inferred: true,
    scopeEndBeat: lastBeat,
    outcome: "open",
  };
};

export const runLoopStack = (
  script: Script,
  facts: BeatFacts[],
  chapters: Chapter[],
  _sequences: Sequence[],
): LoopState => {
  const loops: Loop[] = [];
  const perBeat: LoopState["perBeat"] = {};
  const unmatched: LoopState["unmatched"] = [];

  // Chapter promises, indexed by the beat that opens them.
  const chapterLoops = new Map<number, Loop>();
  const lastOrdinal = Math.max(...chapters.map((c) => c.ordinal), 0);
  for (const c of chapters) {
    // The first chapter *is* the cold open, and its own written question beats
    // a title inferred from it. The last chapter is the payoff — it closes
    // questions, it does not open one, and a one-beat final chapter can never
    // satisfy an inferred promise because there is no later beat to do it.
    if (c.ordinal === 1 || c.ordinal === lastOrdinal) continue;
    const l = inferredChapterLoop(c, script, chapters);
    if (l && l.scopeEndBeat !== undefined && l.scopeEndBeat > c.startBeat) chapterLoops.set(c.startBeat, l);
  }

  for (let i = 0; i < script.beats.length; i++) {
    const b = script.beats[i];
    const f = facts[i];
    const opened: Loop[] = [];
    const closed: Loop[] = [];

    // --- 1. close before opening. A beat that answers and then asks is doing
    //     the right thing; scoring it the other way round would let its own
    //     new question absorb its own answer.
    const closure = closureText(b, f);
    const carriesClosure = Boolean(f.reveal || f.consequence || f.purpose === "payoff" || f.purpose === "reflect");
    if (carriesClosure) {
      const open = loops.filter((l) => l.outcome === "open");
      // Score every open loop; close the best match, and close *only* one, so
      // a single reveal can't silently retire the whole stack.
      let best: { loop: Loop; score: number } | null = null;
      for (const l of open) {
        // Out of scope: a chapter's promise cannot be paid by a later chapter.
        if (l.scopeEndBeat !== undefined && b.n > l.scopeEndBeat) continue;
        const score = overlap(l.terms, closure);
        // Positional closure, for the two cases where structure outranks
        // wording:
        //   · the film's last beat resolves the spine whether or not it
        //     echoes the cold open's phrasing;
        //   · a chapter's own reveal answers that chapter's promise. That is
        //     what a chapter *is*. Requiring "THE COMPOUND" to be said aloud
        //     inside the compound chapter is a lexical test standing in for a
        //     structural fact, and it fails on every well-written chapter
        //     that doesn't repeat its own title.
        const isLastBeat = i === script.beats.length - 1;
        const inOwnChapter =
          l.inferred === true && l.scopeEndBeat !== undefined && b.n <= l.scopeEndBeat && b.n > l.openedAtBeat;
        const positional = (l.depth === "MACRO" && isLastBeat) || (inOwnChapter && Boolean(f.reveal)) ? 1 : 0;
        const s = Math.max(score, positional);
        if (s >= MATCH_THRESHOLD && (!best || s > best.score)) best = { loop: l, score: s };
      }
      if (best) {
        best.loop.outcome = "closed";
        best.loop.closedAtBeat = b.n;
        best.loop.closedAt = b.end;
        closed.push(best.loop);
      } else if (f.reveal) {
        unmatched.push({ beat: b.n, at: b.start, reveal: f.reveal.slice(0, 70) });
      }
    }

    // --- 2. expire anything past its shelf life. Not "closed" — decayed. The
    //     distinction matters: a closed loop paid off, a decayed one was
    //     forgotten, and only one of those is a story.
    for (const l of loops) {
      if (l.outcome !== "open") continue;
      const pastScope = l.scopeEndBeat !== undefined && b.n > l.scopeEndBeat;
      if (pastScope || b.start - l.openedAt > SHELF_LIFE[l.depth]) {
        l.outcome = "decayed";
        l.closedAtBeat = b.n;
        l.closedAt = b.start;
      }
    }

    // --- 3. open. The author's `Question:` row, or narration that reads like
    //     a question, or a `nextQuestion` handed forward by the brain.
    const q = (f.question ?? "").trim() || (looksLikeQuestion(b.vo) ? b.vo.trim() : "");
    const nq = (f.nextQuestion ?? "").trim();
    for (const text of [q, nq].filter(Boolean)) {
      const depth = depthFor(b, i, script, chapters);
      const loop: Loop = {
        id: `loop_${b.n}_${loops.length + 1}`,
        depth,
        question: text,
        terms: terms(text),
        openedAtBeat: b.n,
        openedAt: b.start,
        outcome: "open",
      };
      loops.push(loop);
      opened.push(loop);
    }

    // The chapter's own promise, if this beat heads one and the author didn't
    // already write a better question here.
    const chapterLoop = chapterLoops.get(b.n);
    if (chapterLoop && !opened.length) {
      loops.push(chapterLoop);
      opened.push(chapterLoop);
    }

    perBeat[b.n] = {
      opened,
      closed,
      depthOpen: loops.filter((l) => l.outcome === "open").length,
    };
  }

  // --- debt curve, one sample per second
  const duration = Math.max(1, Math.ceil(script.durationInSeconds));
  const debt: number[] = new Array(duration).fill(0);
  for (let t = 0; t < duration; t++) {
    debt[t] = loops.filter(
      (l) => l.openedAt <= t && (l.outcome === "open" || (l.closedAt ?? Infinity) > t),
    ).length;
  }

  return {
    loops,
    debt,
    perBeat,
    unmatched,
    starved: windows(debt, (n) => n < MIN_OPEN),
    crowded: windows(debt, (n) => n > MAX_OPEN),
  };
};

/** Contiguous second-ranges where the predicate holds. */
const windows = (debt: number[], hit: (n: number) => boolean): { from: number; to: number }[] => {
  const out: { from: number; to: number }[] = [];
  let start = -1;
  for (let t = 0; t < debt.length; t++) {
    if (hit(debt[t])) {
      if (start < 0) start = t;
    } else if (start >= 0) {
      out.push({ from: start, to: t });
      start = -1;
    }
  }
  if (start >= 0) out.push({ from: start, to: debt.length });
  return out;
};

/** Loop debt as a 0..1 health score at time t: 1 inside the band, falling off
 *  sharply below it and gently above it. Starvation is worse than crowding —
 *  a confused viewer is still watching. */
export const debtScore = (open: number): number => {
  if (open >= MIN_OPEN && open <= MAX_OPEN) return 1;
  if (open === 0) return 0;
  if (open === 1) return 0.45;
  return Math.max(0.35, 1 - (open - MAX_OPEN) * 0.22);
};
