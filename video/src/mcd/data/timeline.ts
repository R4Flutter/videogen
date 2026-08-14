// The timeline engine: derives every scene's duration from the story's own
// narration, then enforces the yt_scrapper pacing rules (max 8 s static
// shot, 3-frame flash gaps, 10-24 cuts/min) and QC-checks the retention
// devices the story promised. Pure — no React imports — so the same module
// runs in Remotion (bundle) and in node (tools/mcd-timeline.mjs).

import type { BusinessStory } from "./storyTypes";

// Flash-cut frames between scenes. A 3-frame solid accent frame registers as
// two scene changes in PySceneDetect, so N scenes become ~2N detected cuts
// per minute of runtime — inside the outlier 10-24 cuts/min band.
export const FLASH_FRAMES = 3;

// yt_scrapper analyzer gate: no static shot may exceed 8 s. Long-form pieces
// (story.longForm) widen the cap progressively: the first 3 minutes stay
// tight at 8 s (retention's front-loaded peak), then scenes may run up to
// LONG_FORM_MAX_SCENE_SEC so a multi-act script survives in one pass.
export const MAX_SCENE_SEC = 8;
export const LONG_FORM_MAX_SCENE_SEC = 25;
export const MIN_SCENE_SEC = 1.5;
export const LONG_FORM_TIGHT_SEC = 180; // progressive rhythm: tight for the first 3 min

// Finance-doc narration reads at 165-180 wpm (yt_scrapper outlier analysis).
export const DEFAULT_WPM = 170;
export const WPM_RANGE = [165, 180] as const;

// Extra seconds of hold a scene gets by default after its narration ends.
export const DEFAULT_HOLD_SEC = 0.5;

export type SceneTiming = {
  id: string;
  type: string;
  startFrame: number;
  durationInFrames: number;
  startSec: number;
  durationSec: number;
};

export type StoryTimeline = {
  fps: number;
  wpm: number;
  totalFrames: number;
  totalSeconds: number;
  cutsPerMinute: number;
  scenes: SceneTiming[];
  // QC failures — a story with warnings is broken and should not render.
  warnings: string[];
  // Informational notices (long-form overrides, target drift). Rendered and
  // reported, but not a failure gate.
  notices: string[];
};

const words = (text: string[]): number =>
  text.join(" ").split(/\s+/).filter(Boolean).length;

export const buildTimeline = (story: BusinessStory, fps = 30): StoryTimeline => {
  const wpm = story.wpm ?? DEFAULT_WPM;
  const warnings: string[] = [];
  const notices: string[] = [];
  const longForm = story.longForm === true;
  const modeMax = longForm ? LONG_FORM_MAX_SCENE_SEC : MAX_SCENE_SEC;

  if (wpm < WPM_RANGE[0] || wpm > WPM_RANGE[1]) {
    warnings.push(`wpm ${wpm} outside the ${WPM_RANGE[0]}-${WPM_RANGE[1]} finance-doc range`);
  }

  let frame = 0;
  let lifted = 0;
  const scenes: SceneTiming[] = story.scenes.map((scene) => {
    const narrSec = (words(scene.narration) / wpm) * 60;
    const hold = scene.hold ?? scene.edit?.holdSec ?? DEFAULT_HOLD_SEC;
    let sec = narrSec + hold;

    // Per-scene cap: explicit edit.maxSec (clamped to the mode's ceiling) or
    // the progressive long-form rule — first 3 minutes stay tight, then the
    // cap widens so a full act can breathe in one pass.
    const elapsed = frame / fps;
    let cap = modeMax;
    if (longForm) {
      cap = elapsed < LONG_FORM_TIGHT_SEC ? MAX_SCENE_SEC : modeMax;
    }
    if (scene.edit?.maxSec !== undefined) {
      const explicit = Math.max(MIN_SCENE_SEC, Math.min(modeMax, scene.edit.maxSec));
      cap = Math.max(cap, explicit);
      if (scene.edit.maxSec > modeMax) {
        notices.push(
          `scene "${scene.id}" edit.maxSec ${scene.edit.maxSec}s exceeds the ${modeMax}s mode ceiling — capped to ${modeMax}s`,
        );
      }
    }

    if (sec > cap) {
      warnings.push(
        `scene "${scene.id}" (${scene.type}) wants ${sec.toFixed(2)}s of narration — ` +
          `clamped to the ${cap}s static-shot cap`,
      );
      sec = cap;
    } else if (sec > MAX_SCENE_SEC && longForm) {
      lifted++;
    }
    if (sec < MIN_SCENE_SEC) {
      warnings.push(
        `scene "${scene.id}" (${scene.type}) is only ${sec.toFixed(2)}s — ` +
          `padded to the ${MIN_SCENE_SEC}s floor`,
      );
      sec = MIN_SCENE_SEC;
    }

    const timing: SceneTiming = {
      id: scene.id,
      type: scene.type,
      startFrame: frame,
      durationInFrames: Math.round(sec * fps),
      startSec: frame / fps,
      durationSec: sec,
    };
    frame += timing.durationInFrames + FLASH_FRAMES;
    return timing;
  });

  if (lifted > 0) {
    notices.push(`long-form override ${lifted} scenes past the ${MAX_SCENE_SEC}s cap`);
  }

  const totalFrames = frame - FLASH_FRAMES; // no flash after the last scene
  const totalSeconds = totalFrames / fps;
  const cutsPerMinute = (story.scenes.length * 2) / (totalSeconds / 60);

  // Pacing gate: normal mode enforces the 10-24 cuts/min band; long-form
  // pieces run a slower, wider cut rhythm.
  const [loBand, hiBand] = longForm ? [4, 24] : [10, 24];
  if (cutsPerMinute < loBand || cutsPerMinute > hiBand) {
    warnings.push(
      `pacing ${cutsPerMinute.toFixed(1)} cuts/min is outside the ${loBand}-${hiBand} band ` +
        `(${story.scenes.length} scenes over ${totalSeconds.toFixed(1)}s)`,
    );
  }

  // The runtime must land near the script's declared target. A cut far under
  // target means scenes got clamped away (or an act is missing); a big
  // overshoot means the timing math drifted.
  if (typeof story.targetSec === "number" && story.targetSec > 0) {
    const under = totalSeconds / story.targetSec;
    if (under < 0.6) {
      notices.push(
        `runtime ${totalSeconds.toFixed(0)}s is ${(under * 100).toFixed(0)}% of the ` +
          `${story.targetSec}s target — the script's runtime is unreachable ` +
          `${longForm ? "" : "(enable story.longForm or add edit.maxSec to the over-long scenes) "}` +
          `without cutting an act`,
      );
    } else if (Math.abs(totalSeconds - story.targetSec) / story.targetSec > 0.12) {
      notices.push(
        `runtime ${totalSeconds.toFixed(0)}s drifts ${(Math.abs(totalSeconds - story.targetSec) / story.targetSec * 100).toFixed(0)}% ` +
          `from the ${story.targetSec}s target`,
      );
    }
  }

  // Retention devices: the story promised a curve peak at a fraction of the
  // runtime — there must be a scene boundary near it. The last scene's end is
  // the video's end, which is where the curve collapses, not a peak.
  if (story.retention) {
    const boundaries = scenes.slice(1).map((s) => s.startSec / totalSeconds);
    for (const r of story.retention) {
      if (r.at < 0 || r.at > 1) {
        warnings.push(`retention device "${r.device}" at ${r.at} is not a fraction`);
        continue;
      }
      const nearest = boundaries.reduce(
        (best, b) => (Math.abs(b - r.at) < Math.abs(best - r.at) ? b : best),
        Infinity,
      );
      if (!Number.isFinite(nearest) || Math.abs(nearest - r.at) > 0.04) {
        warnings.push(
          `retention device "${r.device}" at ${(r.at * 100).toFixed(0)}% has no scene ` +
            `boundary within 4% of it`,
        );
      }
    }
  }

  // No content may start after ~92% of the runtime — the curve collapses.
  // Short-form rule: a 15+ min long-form piece earns its ending as its own
  // beat, so the gate only applies to the 8 s-cut rhythm it replaces.
  const lastStart = scenes[scenes.length - 1].startSec / totalSeconds;
  if (!longForm && lastStart > 0.92) {
    warnings.push(
      `last scene starts at ${(lastStart * 100).toFixed(0)}% of the runtime — past the 92% collapse point`,
    );
  }

  return {
    fps,
    wpm,
    scenes,
    totalFrames,
    totalSeconds,
    cutsPerMinute,
    warnings,
    notices,
  };
};

export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
};

export const MAX_CAP_SEC = (longForm: boolean): number =>
  longForm ? LONG_FORM_MAX_SCENE_SEC : MAX_SCENE_SEC;

// Vertical cut — same story, same beats, re-laid-out per scene in
// 9:16 (1080×1920) for YouTube Shorts / Reels / TikTok.
export const VIDEO_CONFIG_PORTRAIT = {
  width: 1080,
  height: 1920,
  fps: 30,
};
