// RetentionQC: the editorial pre-render gate. Runs the story, attention,
// visual, continuity and audio checks, plus the emotion curve, and reports
// findings and scores. The score is an internal heuristic — it exists to find
// weak sections before rendering, not to predict YouTube retention.
import type { DirectorPlan, QcFinding, QcReport } from "../types.ts";
import { runAttentionQC } from "./AttentionQC.ts";
import { runVisualQC } from "./VisualQC.ts";
import { runContinuityQC } from "./ContinuityQC.ts";
import { clamp } from "../util.ts";

export const runRetentionQC = (plan: DirectorPlan): QcReport => {
  const attention = runAttentionQC(plan);
  const visual = runVisualQC(plan);
  const continuity = runContinuityQC(plan);
  const audio = runAudioQC(plan);
  const emotion = runEmotionQC(plan);
  const story = runStoryQC(plan);

  const findings = [
    ...story.findings,
    ...attention.findings,
    ...visual.findings,
    ...audio.findings,
    ...emotion.findings,
    ...continuity.findings,
  ].sort((a, z) => (a.at === -1 ? 1 : z.at === -1 ? -1 : a.at - z.at));

  const scores = {
    story: story.score,
    attention: attention.score,
    visualVariety: visual.score,
    continuity: continuity.score,
    audio: audio.score,
    emotion: emotion.score,
  };
  const retention = Number(
    clamp(
      (story.score * 0.2 +
        attention.score * 0.2 +
        visual.score * 0.15 +
        continuity.score * 0.15 +
        audio.score * 0.15 +
        emotion.score * 0.15) /
        1,
      0,
      10,
    ).toFixed(1),
  );

  return {
    video: {
      title: plan.project.title,
      duration: plan.project.durationInSeconds,
      beats: plan.beats.length,
      mode: plan.project.mode,
    },
    findings,
    scores,
    retention,
  };
};

const runAudioQC = (plan: DirectorPlan): { findings: QcFinding[]; score: number } => {
  const findings: QcFinding[] = [];
  let score = 10;
  const flag = (f: QcFinding) => {
    findings.push(f);
    score -= f.level === "warn" ? 1.1 : 0.4;
  };
  const dur = plan.project.durationInSeconds;

  // 1. Flat music: the level curve must actually move.
  const levels = plan.audioEvents.filter((e) => e.kind === "music_level");
  const distinctLevels = new Set(levels.map((l) => l.value)).size;
  if (distinctLevels < 2) {
    flag({ at: -1, level: "warn", rule: "flat-music", message: "the music level never changes" });
  }

  // 2. Silence: pre/post-reveal windows should exist at least every ~90s.
  const silences = plan.audioEvents.filter((e) => e.kind === "silence_start");
  if (dur > 180 && silences.length === 0) {
    flag({ at: -1, level: "warn", rule: "no-silence", message: "no silence window in a 3+ minute film" });
  }

  // 3. Sound variation: accents at least once per ~40s on average.
  const accents = plan.audioEvents.filter((e) => e.kind === "sfx").length;
  if (accents === 0 && dur > 60) {
    flag({ at: -1, level: "info", rule: "no-sfx", message: "no sfx accents at all" });
  } else if (accents / Math.max(1, dur / 40) < 0.6 && dur > 120) {
    flag({ at: -1, level: "info", rule: "sparse-sfx", message: `only ${accents} accents in ${Math.round(dur)}s` });
  }

  // 4. Voice/music conflict: a FULL_SILENCE window covering a beat's whole
  //    speech is the renderer's job to respect — flag if one does.
  for (const b of plan.beats) {
    const full = b.audio.silence.find((s) => s.kind === "FULL_SILENCE");
    if (full && full.dur >= b.end - b.start - 1) {
      flag({ at: b.start, beat: b.n, level: "warn", rule: "voice-muted", message: "FULL_SILENCE would mute the narration of this beat" });
    }
  }

  // 5. J/L cuts: a long film should use them somewhere.
  const cuts = plan.beats.filter((b) => b.jCut || b.lCut).length;
  if (dur > 180 && cuts === 0) {
    flag({ at: -1, level: "info", rule: "no-jlcuts", message: "no J/L cuts scheduled in a 3+ minute film" });
  }

  return { findings, score: Number(clamp(score, 0, 10).toFixed(1)) };
};

const runEmotionQC = (plan: DirectorPlan): { findings: QcFinding[]; score: number } => {
  const findings: QcFinding[] = [];
  let score = 10;
  const flag = (f: QcFinding) => {
    findings.push(f);
    score -= f.level === "warn" ? 1.1 : 0.4;
  };

  // The emotional curve lives on the sequences; beats inherit it.
  const emotions = plan.sequences.map((s) => s.emotion);
  const distinct = new Set(emotions).size;
  if (distinct <= 1 && plan.beats.length >= 8) {
    flag({ at: -1, level: "warn", rule: "flat-emotion", message: `the whole film sits in one emotional register (${emotions[0]})` });
  }
  // Intensity should rise and fall, not plateau.
  const intensities = plan.sequences.map((s) => s.attentionTarget.emotionalIntensity);
  const swings = intensities.reduce((n, v, i) => (i > 0 && Math.abs(v - intensities[i - 1]) > 0.25 ? n + 1 : n), 0);
  if (swings === 0 && intensities.length >= 4) {
    flag({ at: -1, level: "info", rule: "flat-intensity", message: "emotional intensity never swings by more than 0.25" });
  }

  return { findings, score: Number(clamp(score, 0, 10).toFixed(1)) };
};

const runStoryQC = (plan: DirectorPlan): { findings: QcFinding[]; score: number } => {
  const findings: QcFinding[] = [];
  let score = 10;
  const flag = (f: QcFinding) => {
    findings.push(f);
    score -= f.level === "warn" ? 1.1 : 0.4;
  };

  // 1. Progression: purposes should move through the arc, not shuffle.
  const purposes = plan.beats.map((b) => b.narrative.purpose);
  const first = purposes[0];
  const last = purposes[purposes.length - 1];
  if (first !== "hook") flag({ at: -1, level: "info", rule: "no-hook", message: "the film does not open on a hook" });
  if (last !== "payoff" && last !== "reflect") {
    flag({ at: -1, level: "warn", rule: "no-payoff", message: `the film ends on "${last}" — nothing pays it off` });
  }

  // 2. Curiosity density: questions should appear regularly.
  const questions = plan.beats.filter((b) => b.narrative.question).length;
  if (questions === 0 && plan.beats.length >= 8) {
    flag({ at: -1, level: "info", rule: "no-questions", message: "no beat poses a question — nothing to pull the viewer forward" });
  }

  // 3. Reveals: the story should deliver at least a few.
  const reveals = plan.beats.filter((b) => b.narrative.reveal).length;
  if (reveals === 0 && plan.beats.length >= 8) {
    flag({ at: -1, level: "warn", rule: "no-reveal", message: "no reveal in the whole story" });
  }

  return { findings, score: Number(clamp(score, 0, 10).toFixed(1)) };
};
