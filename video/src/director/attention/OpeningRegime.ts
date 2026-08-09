// OpeningRegime: the first fifteen seconds are a different film.
//
// Nothing in the engine treated them differently. `AttentionQC`'s earliest
// temporal check fires at sixty seconds, by which point the audience that was
// going to leave has left. This is the separate set of rules that window gets,
// because the viewer has not yet decided to watch — every weakness costs more
// here than anywhere else in the runtime.
//
// The spec, and what each line is buying:
//
//   0:00–0:03  the claim on screen, voice inside 400ms. No title card, no
//              logo, no "in this video". A viewer who sees branding before
//              content has been told the video is about the channel.
//   0:00–0:08  hook delivered, ≤15 words, containing a number. A number is
//              a fact you can't argue with, and it is the fastest way to make
//              a gap feel *shaped* rather than merely absent.
//   0:03–0:06  the macro loop opens — but only after a concrete fact has
//              landed. Loewenstein: curiosity is an inverted U in knowledge.
//              A question with nothing in front of it produces no curiosity
//              at all, because there is no gap yet, only ignorance.
//   0:06–0:10  first modality switch. Whatever channel carried the hook,
//              a different one carries this.
//   0:10–0:15  stakes / self-relevance — the "this could be you" turn, which
//              is the whole reason scam content outperforms crime.
//   by 0:15    the film's shape is visible.
import type { DirectorPlan, QcGate, Script, ScriptBeat } from "../types.ts";
import { hasQuantity, quantityCount } from "../util.ts";

export type HookType =
  | "SPECIFICITY_SLAM" // a number so precise it must be real
  | "CONTRADICTION" // two facts that cannot both be true
  | "MECHANISM_GAP" // the how is missing and you want it
  | "STAKES_COLD_OPEN" // someone is about to lose something
  | "SELF_RELEVANCE"; // this is about your bank app, not a stranger's

export const HOOK_TYPES: HookType[] = [
  "SPECIFICITY_SLAM",
  "CONTRADICTION",
  "MECHANISM_GAP",
  "STAKES_COLD_OPEN",
  "SELF_RELEVANCE",
];

/** The banned patterns from vox_style_engine.md, promoted from prose to a
 *  gate. Each one is a way of *sounding* like a hook without being one: they
 *  announce that a hook is coming instead of delivering it. */
export const FORBIDDEN: { id: string; re: RegExp; why: string }[] = [
  {
    id: "meta-commentary",
    re: /\b(in this video|let'?s dive in|let'?s get into|stick around|but here'?s the twist|before we (start|begin)|make sure to)\b/i,
    why: "meta-commentary — talks about the video instead of being it",
  },
  {
    id: "hype-adjective",
    re: /\b(mind-?blowing|insane|game-?chang(er|ing)|crazy|unbelievable|shocking|jaw-?dropping|epic)\b/i,
    why: "hype adjective — the claim should carry the weight, not the adjective",
  },
  {
    id: "fake-scenario",
    re: /\b(imagine (you|that|a)|picture this|let'?s say you|suppose you)\b/i,
    why: "fake scenario — invented stakes read as invented",
  },
  {
    id: "rhetorical-list",
    re: /\b\w+\?\s+\w+\.\s+\w+\?\s+\w+\./,
    why: "rhetorical list — 'Price? High. Quality? Low.' is a tic, not a rhythm",
  },
  {
    id: "you-wont-believe",
    re: /\b(you wo?n'?t believe|wait (for it|until you see)|watch what happens)\b/i,
    why: "curiosity without a gap — nothing concrete has been offered to be curious about",
  },
];

/** Split into sentences without cutting decimals in half. "$1.2 billion" is
 *  one token, not two sentences, and a naive /[.!?]+/ turns every money figure
 *  in a finance script into a sentence boundary. */
const DOT = "\u0001"; // a sentinel that cannot occur in a script

export const sentences = (s: string): string[] =>
  s
    .replace(/(\d)\.(\d)/g, `$1${DOT}$2`) // park the decimal out of the way
    .split(/[.!?]+/)
    .map((x) => x.split(DOT).join(".").trim())
    .filter(Boolean);

/** The banned "three-word loop": three consecutive short sentences that open
 *  on the same word. "It's fast. It's easy. It's effective."
 *
 *  The distinction matters and the first version of this check got it wrong.
 *  Three short sentences in a row is not a tic — "Watch ten videos. Screenshot
 *  the proof. Send it in." is good, deliberate writing, and flagging it taught
 *  the author to distrust the gate. What makes it a tic is the *anaphora*: the
 *  same opening word three times, which is a rhythm the ear recognises as
 *  filler because it carries no new information in the repeated part. */
export const threeWordLoop = (s: string): string | null => {
  const list = sentences(s);
  for (let i = 0; i + 2 < list.length; i++) {
    const three = list.slice(i, i + 3);
    if (!three.every((x) => x.split(/\s+/).length <= 4)) continue;
    const heads = three.map((x) => x.split(/\s+/)[0].toLowerCase().replace(/[^a-z']/g, ""));
    if (heads[0] && heads.every((h) => h === heads[0])) return three.join(". ") + ".";
  }
  return null;
};

/** Words in the hook. The hook is the first beat's narration up to its first
 *  sentence end, or the whole thing if it is one sentence. */
export const hookText = (b: ScriptBeat): string => {
  const m = b.vo.match(/^[^.!?]+[.!?]?/);
  return (m?.[0] ?? b.vo).trim();
};

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Classify what kind of hook the opening is, so the right things get checked.
 *  The author may pin it with a `Hook:` row; otherwise it is inferred. */
export const classifyHook = (b: ScriptBeat): HookType => {
  const pinned = (b as ScriptBeat & { hook?: string }).hook;
  if (pinned) {
    const up = pinned.trim().toUpperCase().replace(/[\s-]+/g, "_");
    const hit = HOOK_TYPES.find((h) => h === up);
    if (hit) return hit;
  }
  const t = `${b.vo} ${b.text ?? ""}`;
  if (/\b(you|your)\b/i.test(t)) return "SELF_RELEVANCE";
  if (/\b(but|however|except|yet|still)\b/i.test(t) && quantityCount(t) >= 2) return "CONTRADICTION";
  if (/\b(how|why|mechanism|works|actually)\b/i.test(t)) return "MECHANISM_GAP";
  if (/\b(lost|lose|gone|stole|took|cost|owed)\b/i.test(t)) return "STAKES_COLD_OPEN";
  return "SPECIFICITY_SLAM";
};

/** Which channel a beat's opening interrupt arrives on. Used for the 0:06–0:10
 *  modality-switch rule and, more generally, by ModalityRotation. */
export type Channel = "PICTURE" | "SOUND" | "TYPE" | "SILENCE" | "COLOUR";

export const channelOfModule = (module: string): Channel => {
  if (module === "kinetic" || module === "quote" || module === "stat") return "TYPE";
  if (module === "footage" || module === "doodle" || module === "collage" || module === "map") return "PICTURE";
  return "PICTURE";
};

export type OpeningReport = {
  hook: string;
  hookWords: number;
  hookType: HookType;
  hasNumber: boolean;
  hookEndsAt: number;
  firstFactAt: number | null;
  firstLoopAt: number | null;
  firstModalitySwitchAt: number | null;
  selfRelevanceAt: number | null;
  gates: QcGate[];
};

const gate = (id: string, passed: boolean, at: number, message: string, fix?: string, beat?: number): QcGate => ({
  id,
  passed,
  at,
  beat,
  message,
  fix,
});

/** Everything the opening window is judged on. Runs off the script *and* the
 *  finished plan: the script decides the words, the plan decides whether the
 *  modality actually changed. */
export const inspectOpening = (script: Script, plan: DirectorPlan): OpeningReport => {
  const first = script.beats[0];
  const hook = hookText(first);
  const words = wordCount(hook);
  const hookType = classifyHook(first);
  const hasNumber = hasQuantity(`${hook} ${first.text ?? ""}`);

  // Where the hook lands: proportional through the first beat by word count,
  // which is the best estimate available before alignment has run.
  const beatWords = Math.max(1, wordCount(first.vo));
  const dur = first.end - first.start;
  const hookEndsAt = Number((first.start + dur * Math.min(1, words / beatWords)).toFixed(2));

  const opening = plan.beats.filter((b) => b.start < 20);

  // The first concrete fact — a number, a name, a date on screen or in the read.
  // A fact is a quantity, a named entity or a reveal — and it has to be looked
  // for in the *narration*, not only in the on-screen text. A beat can state
  // "thirty million dollars a day" out loud with nothing but a headline on the
  // page, and that is still the fact the viewer now holds.
  const factBeat = script.beats.find(
    (b) => b.start < 20 && (hasQuantity(`${b.vo} ${b.text ?? ""} ${b.name}`) || Boolean(b.reveal)),
  );
  const firstFactAt = factBeat ? factBeat.start : null;

  const loopBeat = opening.find((b) => Boolean(b.narrative.question));
  const firstLoopAt = loopBeat ? loopBeat.start : null;

  // A modality switch inside the opening: the module family changes, or an
  // audio event carries the moment instead of the picture.
  let firstModalitySwitchAt: number | null = null;
  for (let i = 1; i < opening.length; i++) {
    const a = channelOfModule(opening[i - 1].visual.module);
    const b = channelOfModule(opening[i].visual.module);
    const audioCarries = plan.audioEvents.some(
      (e) => e.at >= opening[i].start && e.at < opening[i].end && (e.kind === "sfx" || e.kind === "silence_start"),
    );
    if (a !== b || audioCarries) {
      firstModalitySwitchAt = opening[i].start;
      break;
    }
  }

  const selfBeat = script.beats.find(
    (b) => b.start < 20 && /\b(you|your|yours)\b/i.test(`${b.vo} ${b.text ?? ""}`),
  );
  const selfRelevanceAt = selfBeat ? selfBeat.start : null;

  const gates: QcGate[] = [
    gate(
      "HOOK_LATE",
      hookEndsAt <= 8,
      hookEndsAt,
      `the hook finishes at ${hookEndsAt.toFixed(1)}s`,
      "cut the opening sentence until it lands inside 0:08 — the claim first, the context after",
      first.n,
    ),
    gate(
      "HOOK_WORDY",
      words <= 15,
      first.start,
      `the hook is ${words} words`,
      "if the idea needs more than 15 words it isn't hooked yet — find the one sentence that is the claim",
      first.n,
    ),
    gate(
      "HOOK_NO_NUMBER",
      hasNumber,
      first.start,
      "no number, date or amount in the hook",
      "a number beats a claim: it is the fastest way to make the gap feel shaped rather than merely absent",
      first.n,
    ),
    gate(
      "FACT_BEFORE_QUESTION",
      firstLoopAt === null || firstFactAt === null || firstFactAt <= firstLoopAt,
      firstLoopAt ?? 0,
      firstFactAt === null
        ? "no concrete fact in the opening at all"
        : `the first question opens at ${(firstLoopAt ?? 0).toFixed(1)}s, before any fact has landed`,
      "curiosity is an inverted U in knowledge — give one hard fact first so the gap has a shape",
      loopBeat?.n,
    ),
    gate(
      "OPENING_MODALITY",
      firstModalitySwitchAt !== null && firstModalitySwitchAt <= 12,
      firstModalitySwitchAt ?? 0,
      firstModalitySwitchAt === null
        ? "one channel carries the whole opening"
        : `first modality switch at ${firstModalitySwitchAt.toFixed(1)}s`,
      "change the channel by 0:10 — if type carried the hook, let picture or sound carry the next beat",
    ),
    gate(
      "OPENING_STAKES",
      selfRelevanceAt !== null && selfRelevanceAt <= 15,
      selfRelevanceAt ?? 0,
      "the opening never makes it the viewer's problem",
      "say 'you' or 'your' before 0:15 — self-relevance is the whole advantage this niche has",
    ),
  ];

  // Forbidden patterns, checked across the whole film but weighted here.
  for (const b of script.beats) {
    const text = `${b.vo} ${b.text ?? ""}`;
    for (const f of FORBIDDEN) {
      if (f.re.test(text)) {
        gates.push(
          gate("FORBIDDEN_PATTERN", false, b.start, `beat ${b.n}: ${f.why}`, `rewrite: "${text.slice(0, 60)}…"`, b.n),
        );
      }
    }
    const loop = threeWordLoop(b.vo);
    if (loop) {
      gates.push(
        gate(
          "FORBIDDEN_PATTERN",
          false,
          b.start,
          `beat ${b.n}: three-word loop — "${loop}"`,
          "three short sentences opening on the same word is a rhythm the ear hears as filler; change one of them",
          b.n,
        ),
      );
    }
  }

  return {
    hook,
    hookWords: words,
    hookType,
    hasNumber,
    hookEndsAt,
    firstFactAt,
    firstLoopAt,
    firstModalitySwitchAt,
    selfRelevanceAt,
    gates,
  };
};
