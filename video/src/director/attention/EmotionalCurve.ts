// EmotionalCurve: the film's emotional register from beat to beat. Emotion
// drives shot length, camera speed, music, silence and visual density — and
// crucially it must *vary*. A documentary that sits in one register for ten
// minutes is flat no matter how good the visuals are.
import type { Emotion, Script, ScriptBeat } from "../types.ts";
import type { BeatFacts } from "../story/StoryAnalyzer.ts";
import { progress } from "../util.ts";

const EMOTION_WORDS: [RegExp, Emotion][] = [
  [/\b(shock|horror|terrified|brutal|violent|murder)\b/i, "shock"],
  [/\b(angry|anger|outrage|furious)\b/i, "anger"],
  [/\b(fear|afraid|scared|threaten|danger|pressure)\b/i, "tension"],
  [/\b(sad|sorrow|grief|loss|family|victim|suffered|struggled)\b/i, "empathy"],
  [/\b(relief|safe|rescued|saved|free)\b/i, "relief"],
  [/\b(surprise|unexpected|strange|odd|weird)\b/i, "surprise"],
  [/\b(confus|unclear|mystery|unknown|no one knows)\b/i, "confusion"],
  [/\b(clear|simple|obvious|actually is|the truth|understood)\b/i, "clarity"],
  [/\b(anticipat|wait|coming|next|about to)\b/i, "anticipation"],
  [/\b(satisfied|satisfaction|justice|payoff|lesson|learned)\b/i, "satisfaction"],
  [/\b(comfort|calm|peaceful|quiet|home)\b/i, "comfort"],
];

/** The register a beat's own language suggests. */
const hinted = (b: ScriptBeat): Emotion | undefined => {
  const text = `${b.vo} ${b.visual} ${b.text ?? ""}`;
  const hit = EMOTION_WORDS.find(([re]) => re.test(text));
  return hit?.[1];
};

const POSITIONAL: [number, Emotion][] = [
  [0.0, "curiosity"],
  [0.12, "comfort"],
  [0.3, "clarity"],
  [0.5, "anticipation"],
  [0.7, "tension"],
  [0.85, "surprise"],
  [1.0, "satisfaction"],
];

/** The beat's emotion: author's row wins, then language, then the story arc. */
export const emotionFor = (b: ScriptBeat, facts: BeatFacts, all: ScriptBeat[]): Emotion => {
  const pinned = b.emotion;
  if (pinned) {
    const m = EMOTION_WORDS.find(([re]) => re.test(pinned));
    if (m) return m[1];
  }
  const h = hinted(b);
  if (h) return h;
  const p = progress(b, all);
  return POSITIONAL.reduce(
    (acc, [t, e]) => (p >= t ? e : acc),
    "curiosity" as Emotion,
  );
};

/** The curve, with an anti-flatness pass: no two adjacent beats may share a
 *  register unless the author pinned it. */
export const buildEmotionalCurve = (script: Script, facts: BeatFacts[]): Emotion[] => {
  const beats = script.beats;
  const curve = beats.map((b, i) => emotionFor(b, facts[i], beats));  for (let i = 1; i < curve.length; i++) {
    if (curve[i] === curve[i - 1] && !beats[i].emotion) {
      const alt = ["clarity", "anticipation", "tension", "curiosity"].find((e) => e !== curve[i]);
      curve[i] = (alt ?? "curiosity") as Emotion;
    }
  }
  return curve;
};
