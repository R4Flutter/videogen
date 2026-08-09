// RhythmEngine: the semantic attention rhythm. Not a "cut every 3 seconds"
// rule — a beat earns its length by what it carries. The tiers are the
// targets from the design brief:
//
//   MICRO_CHANGE        1.5–4s     light change before attention decays
//   VISUAL_IDEA         4–10s      one idea per visual
//   PROGRESSION         10–30s     meaningful progression on one visual
//   ATTENTION_RESET     30–60s     the frame re-languages entirely
//   SEQUENCE_TRANSFORM  45–120s    a sequence turns
//
// Long beats are allowed (and encouraged) when density, emotion or footage
// justify them; short beats are allowed when the idea is exhausted. What the
// rhythm engine does is decide which tier a beat *is*, and schedule the
// attention events that make long beats hold.
import type {
  AttentionEvent,
  AttentionEventType,
  Emotion,
  Script,
  ScriptBeat,
} from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import { rng, quantityCount, type Rng } from "../util.ts";

export type RhythmDecision = {
  tier: "MICRO_CHANGE" | "VISUAL_IDEA" | "PROGRESSION" | "ATTENTION_RESET" | "SEQUENCE_TRANSFORM";
  /** Seconds between internal attention events on this beat. */
  cadence: number;
  /** Whether the beat warrants an internal attention reset. */
  reset: boolean;
};

const tierOf = (dur: number): RhythmDecision => {
  if (dur < 4) return { tier: "MICRO_CHANGE", cadence: 2, reset: false };
  if (dur < 8) return { tier: "VISUAL_IDEA", cadence: 3.2, reset: false };
  if (dur < 20) return { tier: "PROGRESSION", cadence: 5, reset: false };
  if (dur < 45) return { tier: "ATTENTION_RESET", cadence: 8, reset: true };
  return { tier: "SEQUENCE_TRANSFORM", cadence: 12, reset: true };
};

/** The tier a beat's *content* earns, and the duration that tier implies.
 *
 *  The header of this file has always said "a beat earns its length by what it
 *  carries", and `tierOf` derives the tier from the length — the same sentence
 *  with the causality inverted. It means the engine can never disagree with
 *  the script: a beat that takes fourteen seconds to say one thing is simply
 *  relabelled PROGRESSION and given a slower cadence, which is exactly how
 *  padding survives to the render.
 *
 *  Density is counted in things a viewer has to *take in*: quantities, proper
 *  nouns, contradictions, and the beat's own structured payload. That count,
 *  against the read time, is what a tier actually describes. */
export const contentTier = (
  b: ScriptBeat,
  facts: BeatFacts,
): { tier: RhythmDecision["tier"]; ideas: number; target: [number, number] } => {
  const text = `${b.vo} ${b.text ?? ""}`;
  const ideas =
    quantityCount(text) * 1.0 +
    (text.match(/\b[A-Z][a-z]{2,}\b/g) ?? []).length * 0.5 +
    (text.match(/\b(but|however|except|actually|turns out|instead)\b/gi) ?? []).length * 1.5 +
    (facts.reveal ? 2 : 0) +
    (facts.question ? 1 : 0) +
    (b.data?.length ?? 0) * 0.7 +
    (b.icons?.length ?? 0) * 0.5 +
    (b.places?.length ?? 0) * 0.5;

  if (ideas <= 1.5) return { tier: "MICRO_CHANGE", ideas, target: [1.5, 4] };
  if (ideas <= 4) return { tier: "VISUAL_IDEA", ideas, target: [4, 10] };
  if (ideas <= 8) return { tier: "PROGRESSION", ideas, target: [10, 30] };
  if (ideas <= 14) return { tier: "ATTENTION_RESET", ideas, target: [30, 60] };
  return { tier: "SEQUENCE_TRANSFORM", ideas, target: [45, 120] };
};

/** Where the read and the content disagree — the padding detector.
 *
 *  A beat whose narration runs 14s while its content earns a 4–10s frame is a
 *  beat saying one thing slowly. That shows on a retention graph as the exact
 *  second the viewer leaves, and it is invisible to every other check the
 *  engine runs. The reverse — a dense beat read too fast — is rarer and more
 *  forgivable, so it is reported separately rather than lumped in.
 *
 *  The 40% margin exists because the tiers are bands, not points, and an
 *  author who lands just outside one is not making a mistake. */
export const rhythmMismatch = (
  b: ScriptBeat,
  facts: BeatFacts,
): { kind: "padded" | "rushed"; ideas: number; dur: number; target: [number, number] } | null => {
  const dur = b.end - b.start;
  const { ideas, target } = contentTier(b, facts);
  if (dur > target[1] * 1.4) return { kind: "padded", ideas, dur, target };
  if (dur < target[0] * 0.6) return { kind: "rushed", ideas, dur, target };
  return null;
};

/** The event vocabulary a beat's content earns, in the order a viewer should
 *  receive them. All module-side: the renderer realises them through the
 *  module's own progressive behaviour (chart pen, trace token, trust flip...)
 *  and the QC layer verifies they were scheduled at all. */
const EVENT_POOL: [RegExp, AttentionEventType][] = [
  [/\?|why|who|what|where|how\b/i, "QUESTION"],
  [/\b(balance|pay|paid|deposit|withdraw|earn|money|profit)\b/i, "NUMBER_REVEAL"],
  [/\b(but|however|except|turns out|actually|not real|fake|flip|collapse|trap)\b/i, "CONTRADICTION"],
  [/\b(map|route|location|country|bangkok|dubai|here|there)\b/i, "MAP_REVEAL"],
  [/\b(moves|travels|flows|goes|passes)\b/i, "DATA_CHANGE"],
  [/\b(phone|screen|app|notification|message)\b/i, "OBJECT_ENTRY"],
  [/\b(photo|clip|footage|archival|cctv|image)\b/i, "IMAGE_CHANGE"],
  [/\b(diagram|chart|graph|timeline|funnel|trace|line)\b/i, "DIAGRAM_BUILD"],
  [/\b(gone|lost|locked|vanished|dead|broke|arrested|stopped)\b/i, "REVEAL"],
];

/** One beat of rhythm: the tier, plus the internal event schedule. */
export const rhythmFor = (b: ScriptBeat): RhythmDecision => {
  const dur = b.end - b.start;
  return tierOf(dur);
};

/** The internal attention events for one beat — absolute times, seeded. */
export const scheduleBeatEvents = (
  b: ScriptBeat,
  facts: BeatFacts,
  decision: RhythmDecision,
  emotion: Emotion,
): AttentionEvent[] => {
  const events: AttentionEvent[] = [];
  const r: Rng = rng(b.n * 7919 + 17);
  const dur = b.end - b.start;
  const t0 = b.start;

  // What this beat is *about*, mapped to an event vocabulary.
  const pooled = EVENT_POOL.filter(([re]) => re.test(`${b.vo} ${b.visual} ${b.text ?? ""}`)).map(
    (x) => x[1],
  );
  if (facts.question && !pooled.includes("QUESTION")) pooled.unshift("QUESTION");
  if (facts.reveal && !pooled.includes("REVEAL")) pooled.push("REVEAL");

  // The events are laid along the cadence, not at random offsets: a viewer
  // senses a pattern before they sense randomness, and pattern is calmer.
  let t = t0 + decision.cadence * 0.5;
  let i = 0;
  while (t < b.end - 0.8) {
    const type = pooled[i % pooled.length] ?? "WORD_EMPHASIS";
    const strength = type === "REVEAL" || type === "QUESTION" ? 0.85 : 0.5 + r() * 0.3;
    events.push({
      at: Number(t.toFixed(2)),
      type,
      beat: b.n,
      strength: Number(strength.toFixed(2)),
      label: b.text?.slice(0, 24),
    });
    t += decision.cadence * (0.8 + r() * 0.4);
    i += 1;
  }

  // The opening of a long beat is itself a reset: give it a strong event at
  // its own head so the viewer re-enters with a reason.
  if (decision.reset && events.length && events[0].at - t0 > decision.cadence) {
    events.unshift({ at: t0 + 1.2, type: "PERSPECTIVE_CHANGE", beat: b.n, strength: 0.7 });
  }

  // Emotion overrides: tension delays reveals, curiosity front-loads questions.
  if (emotion === "tension" || emotion === "anticipation") {
    const reveal = events.find((e) => e.type === "REVEAL");
    if (reveal) reveal.at = Math.min(b.end - 1.0, b.start + dur * 0.78);
  }
  if (emotion === "curiosity") {
    const q = events.find((e) => e.type === "QUESTION");
    if (q) q.at = Math.min(b.start + 1.6, q.at);
  }

  return events.sort((a, z) => a.at - z.at);
};

/** Every beat's events, flattened into the global attention schedule. */
export const scheduleAllEvents = (
  script: Script,
  facts: BeatFacts[],
  emotions: Emotion[],
  decisions: RhythmDecision[],
): AttentionEvent[] =>
  script.beats
    .flatMap((b, i) => scheduleBeatEvents(b, facts[i], decisions[i], emotions[i]))
    .sort((a, z) => a.at - z.at);
