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
import { rng, type Rng } from "../util.ts";

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
