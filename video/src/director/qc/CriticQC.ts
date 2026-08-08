// qc/CriticQC.ts — turns bare QC findings into a critic's notes: severity,
// why it matters, what to do about it. Pure enrichment: every finding keeps
// its identity, gains severity/reason/fix. Rule-specific glosses first, then
// generic ones keyed off the finding itself.
import type { QcFinding, QcReport, QcSeverity } from "../types.ts";

type Gloss = { severity: QcSeverity; reason: string; fix: string };

const RULES: Record<string, Gloss> = {
  "flat-music": {
    severity: "MED",
    reason: "The bed never moving means the viewer gets no audio cue that anything changed.",
    fix: "Schedule music swells before reveals and drops after them (music mood: swell/drop).",
  },
  "no-silence": {
    severity: "HIGH",
    reason: "A 3+ minute film with no silence window exhausts the ear; reveals land without a frame around them.",
    fix: "Place a pre- or post-reveal silence (PRE_REVEAL_SILENCE / POST_REVEAL_SILENCE) at least once per minute.",
  },
  "no-sfx": {
    severity: "LOW",
    reason: "No accent anywhere: the audio never punctuates a moment.",
    fix: "Accent key reveals and payoffs (boom/stamp/shimmer from the sfx vocabulary).",
  },
  "sparse-sfx": {
    severity: "LOW",
    reason: "Accents are rare enough that they will read as noise rather than punctuation.",
    fix: "Accent one attention event per sequence at most; reserve the loud ones for the biggest beats.",
  },
  "voice-muted": {
    severity: "HIGH",
    reason: "A FULL_SILENCE window covering the beat's whole narration would mute the voice track.",
    fix: "Shorten the silence window or switch to MUSIC_DROP so the voice stays audible.",
  },
  "no-jlcuts": {
    severity: "LOW",
    reason: "Every beat starts and ends with the visual: the audio never pulls the edit forward.",
    fix: "J-cut a question beat's voice under the previous beat's ending; L-cut a reveal's tail into the next beat.",
  },
  "flat-emotion": {
    severity: "HIGH",
    reason: "One emotional register across the film means nothing feels different when it should.",
    fix: "Re-assign sequence emotions so the arc moves (e.g. curiosity → tension → shock → clarity → payoff).",
  },
  "flat-intensity": {
    severity: "LOW",
    reason: "Intensity never swings: no peaks, no valleys, no rest.",
    fix: "Drop intensity on rest beats and spike it on reveals and payoffs.",
  },
  "no-hook": {
    severity: "MED",
    reason: "The film does not open on a hook: the first 30 seconds decide whether anyone stays.",
    fix: "Open on a question or a contradiction, with an attention reset at ~20-40s.",
  },
  "no-payoff": {
    severity: "HIGH",
    reason: "The story ends without resolving what it set up.",
    fix: "Give the final beat a payoff purpose and, if a central motif exists, call it back with changed meaning.",
  },
  "no-questions": {
    severity: "MED",
    reason: "Nothing pulls the viewer forward between reveals.",
    fix: "Pose a question on roughly every third beat; each sequence should end on one.",
  },
  "no-reveal": {
    severity: "HIGH",
    reason: "A documentary that reveals nothing is a slideshow of claims.",
    fix: "Plant a reveal at each sequence turn: something the viewer now knows that they did not before.",
  },
};

const generic = (f: QcFinding): Gloss => {
  switch (f.rule) {
    case "low-info-stretch":
      return {
        severity: "MED",
        reason: "A long stretch without an information change or attention event loses the viewer.",
        fix: "Split the run: add an annotation, a data change or an attention reset inside the stretch.",
      };
    case "module-run":
      return {
        severity: "MED",
        reason: "Consecutive beats repeat one visual language; the frame transforms without meaning.",
        fix: "Swap the middle beats' modules toward the purpose that serves them; reserve kinetic for the actual reveal.",
      };
    case "module-dominance":
      return {
        severity: "MED",
        reason: "The same module carries most of the film; variety becomes noise.",
        fix: "Pull beats from the dominant module into modules that match their visual purposes.",
      };
    case "no-reset":
      return {
        severity: "HIGH",
        reason: "No attention reset in the whole film: the frame never re-languages itself, so the viewer stops noticing change.",
        fix: "Plan an attention reset every 30-60s — a full visual re-stage at a sequence turn.",
      };
    case "kinetic-overuse":
      return {
        severity: "MED",
        reason: "Kinetic typography became the default visual instead of a reserved instrument.",
        fix: "Replace kinetic beats with footage/diagram/document modules; keep kinetic for hook, stat, contrast, reveal, transition.",
      };
    case "no-callbacks":
      return {
        severity: "HIGH",
        reason: "A 4+ minute film with no callback leaves its motifs dangling; the payoff has nothing to answer to.",
        fix: "Identify 1-2 central motifs early, reference them mid-film, and bring one back with changed meaning at the end.",
      };
    case "weak-ending":
      return {
        severity: "HIGH",
        reason: "The ending does not resolve the central question or call back the central motif.",
        fix: "Give the final sequence a payoff purpose that answers the film's central question.",
      };
    case "no-rest":
      return {
        severity: "LOW",
        reason: "Every beat is loud: nothing tells the viewer to breathe, so the loud moments stop landing.",
        fix: "Insert 1-2 deliberate rest beats: single image, slow camera, minimal text, quiet music.",
      };
    case "low-variety":
      return {
        severity: "MED",
        reason: "Too few distinct modules across the film; the visual language is repetitive.",
        fix: "Route beats to modules that match their visual purposes; aim for 8+ distinct modules in a long film.",
      };
    default:
      return {
        severity: f.level === "warn" ? "MED" : "LOW",
        reason: f.message,
        fix: "Review the flagged section against its sequence purpose; if the purpose does not demand it, change it.",
      };
  }
};

export const criticize = (report: QcReport): QcReport => {
  return {
    ...report,
    findings: report.findings.map((f) => {
      const gloss = RULES[f.rule] ?? generic(f);
      return {
        ...f,
        severity: f.severity ?? gloss.severity,
        reason: f.reason ?? gloss.reason,
        fix: f.fix ?? gloss.fix,
      };
    }),
  };
};
