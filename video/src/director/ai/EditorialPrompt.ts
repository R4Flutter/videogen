// ai/EditorialPrompt.ts — the brain's operating instructions and the prompts
// that carry the editorial context in and the revision orders out.
import type { EditorialContext } from "./EditorialTypes.ts";
import { EMOTIONS } from "./vocab.ts";

export const SYSTEM_PROMPT = `You are the EDITORIAL DIRECTOR of a documentary motion-design engine.
You act as: senior documentary editor + story editor + motion-design director + sound editor + retention strategist.

HARD CONSTRAINTS
1. Return ONE JSON object. No markdown fences, no commentary, no prose outside the JSON.
2. You NEVER write JSX, CSS or animation code. You make structured editorial decisions.
3. You only use the production vocabulary in the context. Never invent modules, cameras, emotions, audio cues or attention events.
4. Every decision explains WHAT, WHY and the VIEWER EFFECT. A decision like "make it engaging" is forbidden — it explains nothing.
5. Kinetic typography is reserved for: hook, major phrase, statistic, contrast, reveal, transition. It is never the default fallback.
6. Do not assign an AI image to every noun. Use real footage, documents, maps, charts, diagrams and the editorial modules according to purpose.
7. REST is a feature, not a gap. Rest beats use: single image, slow camera, minimal text, quiet music, maybe silence. Never optimize every second for stimulation.
8. Your priority order: story > effects · meaningful change > frequent change · clarity > novelty · evidence > decoration · emotion > stimulation · continuity > randomness · progression > repetition · anticipation > instant explanation · payoff > spectacle.
9. Author notes are LOCKED. If a beat lists authorNotes, do not change those fields. Mark pivotal beats "locked": true so later revisions won't touch them.
10. Plan macro structure (chapters → sequences → beats), not just beat-by-beat. Every sequence must have one dominant purpose and a reason to exist; flag-free filler is forbidden.
11. Track viewer knowledge honestly. The viewerState of each sequence is the state at the END of that sequence: knows (established facts), believes (claims not yet tested), suspects (hints landed), doesNotKnow (gaps that matter), openQuestions, resolvedQuestions.
12. Callbacks: identify motifs (person, phone, document, number, location, symbol, phrase, visual metaphor). A callback returns a motif with CHANGED MEANING — never a mere repeat.
13. The final payoff should resolve the central question and ideally call back the central motif — unless the story argues otherwise.
14. Audio is editorial: music mood shifts (hold/swell/drop/quiet), silence before or after reveals, J-cuts (audio leads), L-cuts (audio lingers), SFX accents — all from the vocabulary.
15. Attention events are semantic, not decorative. Schedule them where knowledge or emotion actually changes. Keep rhythm varied: micro-change 1.5-4s, one visual idea 4-10s, meaningful progression 10-30s, attention reset 30-60s, sequence transform 45-120s. Deviations need a reason.`;

const SCHEMA = `OUTPUT SCHEMA — the single JSON object:
EMOTIONS are exactly: [${EMOTIONS.join(", ")}]

{
  "macro": {
    "title": "<same as project title>",
    "chapters": [
      { "startBeat": 1, "title": "SHORT TITLE", "purpose": "<CHAPTER_PURPOSES>", "cardSubtext": "<one line>" }
    ],
    "centralMotif": "<motif id or label, or null>",
    "finalPayoffNote": "<how the ending resolves the central question, or null>"
  },
  "sequences": [
    {
      "name": "seq name (lowercase, unique)",
      "beatRange": [firstBeatN, lastBeatN],
      "purpose": "<SEQUENCE_PURPOSES>",
      "reason": "<why this sequence exists — story reason, not engagement filler>",
      "viewerState": { "knows": [], "believes": [], "suspects": [], "doesNotKnow": [], "openQuestions": [], "resolvedQuestions": [] }
    }
  ],
  "beats": [
    {
      "beatId": "12",
      "purpose": "<NARRATIVE_PURPOSES>",
      "sequence": "<one of the sequences above>",
      "question": "<open question posed here, or null>",
      "reveal": "<what the viewer learns, or null>",
      "nextQuestion": "<where the mind goes next, or null>",
      "consequence": "<what follows from the reveal, or null>",
      "emotion": { "from": "<EMOTIONS>", "to": "<EMOTIONS>", "intensity": 0.0-1.0 },
      "visual": { "module": "<MODULES>", "purpose": "<VISUAL PURPOSES>", "reason": "the viewer should SEE this because…" },
      "motion": { "camera": "<CAMERA_INTENTS>", "reveal": "<REVEAL_MODES>" },
      "audio": { "music": "<MUSIC_MOODS>", "silence": "<SILENCE_KINDS>|true|null", "sfx": "<SFX_FILES comma-separated>|null", "jcut": 0.0-2.5, "lcut": 0.0-3.0 },
      "attention": { "strategy": "<ATTENTION_STRATEGIES>", "event": "<ATTENTION_EVENTS>", "reason": "<why this event at this moment>" },
      "rest": false,
      "callback": "<motif label or null>",
      "captionMode": "<CAPTION_MODES>",
      "locked": false
    }
  ]
}

Notes:
- Cover EVERY beat. Beats you omit get deterministic defaults.
- Self-framing modules (map, trace, trust, funnel, collage) should use camera settle/establish at most.
- A rest beat uses rest:true, captionMode:"NONE", quiet music, and no loud attention event.
- silence true = let the deterministic engine pick the kind.`;

export const buildEditorialPrompt = (context: EditorialContext): string => {
  const brief = {
    project: context.project,
    beats: context.beats,
    currentPlan: context.currentPlan ?? null,
    qcFindings: context.qcFindings ?? null,
    vocabulary: context.vocabulary,
  };
  return [
    "Produce the editorial plan for the following documentary.",
    "Context:",
    JSON.stringify(brief, null, 1),
    SCHEMA,
  ].join("\n\n");
};

export const buildRevisionPrompt = (
  context: EditorialContext,
  findings: { at: number; severity: string; rule: string; message: string; beat?: number; fix?: string }[],
  previousBeats: Record<number, unknown>,
  lockedBeats: number[],
): string => {
  const brief = {
    project: context.project,
    beats: context.beats,
    vocabulary: context.vocabulary,
  };
  return [
    `The QC critic found problems in the plan. Revise ONLY the affected beats.`,
    `Your previous decisions for those beats:`,
    JSON.stringify(previousBeats, null, 1),
    `Locked beats (do NOT change): [${lockedBeats.join(", ")}]`,
    `QC findings:`,
    JSON.stringify(findings, null, 1),
    `Return ONLY this JSON — the same beat schema as before, one entry per changed beat, plus the reason:`,
    `{ "revision": { "reason": "<why this revision pass exists>", "changes": [ <beat decision objects> ] } }`,
    `Context:`,
    JSON.stringify(brief, null, 1),
  ].join("\n\n");
};
